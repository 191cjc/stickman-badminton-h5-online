import {
  cloneClassicPlayer,
  stepClassicPlayer,
} from "../shared/classic/player";
import type { ClassicPlayerContext } from "../shared/classic/types";
import { emptyIntent, serializePlayer } from "../shared/state";
import type { GameState, PlayerState } from "../shared/state";
import { SIM_HZ, SNAPSHOT_HZ } from "../shared/protocol";
import type { InputFrame, Snapshot } from "../shared/protocol";
import type { PlayerIntent, Side } from "../shared/types";
import { toIntent } from "./input";

const stepMs = 1000 / SIM_HZ;
const historyMs = 2000;
interface Command {
  input: InputFrame;
  at: number;
  firstStep?: number;
}
interface Step {
  id: number;
  intent: PlayerIntent;
  owners: number[];
  context: ClassicPlayerContext;
}
interface Anchor {
  seq: number;
  localStep: number;
  authorityStep: number;
}

/** Command identity and elapsed simulation time have separate bounded ledgers.
 * Only the own actor is stepped; shuttle/context is read-only authority data. */
export class Prediction {
  readonly player: PlayerState;
  private commands: Command[] = [];
  private steps: Step[] = [];
  private held = emptyIntent();
  private heldSeq = 0;
  private localStep = 0;
  private lastAt?: number;
  private accumulator = 0;
  private anchor?: Anchor;
  private fallback?: { ack: number; suspended: boolean };
  private authority?: PlayerState;
  private ack = 0;
  private ackTick: number | null = null;
  private authorityTick = 0;
  private cleared = true;
  private offset = { x: 0, y: 0 };
  private scoreKey = "";
  private context: ClassicPlayerContext = {};
  private correction = 0;
  private snapped = false;
  private fixedSteps = 0;
  private aligned = 0;
  private fallbacks = { null: 0, missing: 0, overlap: 0 };
  private expirations = 0;
  private stalls = 0;
  constructor(
    readonly side: Side,
    initial: PlayerState,
  ) {
    this.player = cloneClassicPlayer(initial);
  }
  /** Called only after synchronous socket acceptance, never on a rejected send. */
  accept(input: InputFrame, at: number): void {
    if (!Number.isFinite(at)) return;
    this.advance(at); // Integrate the previous held state before changing it.
    this.commands.push({ input: { ...input }, at });
    if (this.commands.length > 240) this.expire();
  }
  advance(at: number): void {
    if (!Number.isFinite(at)) return;
    if (this.lastAt === undefined) {
      this.lastAt = at;
      return;
    }
    if (at < this.lastAt) return;
    const elapsed = at - this.lastAt;
    this.lastAt = at;
    if (this.commands.some((command) => at - command.at > historyMs))
      this.expire();
    if (this.fallback?.suspended) return;
    this.accumulator += Math.min(elapsed, 100);
    let count = 0;
    while (this.accumulator + 1e-7 >= stepMs && count < 6) {
      this.localStep++;
      const pending = this.commands.filter(
        (command) => command.firstStep === undefined,
      );
      const latest = pending.at(-1);
      let intent = { ...this.held };
      let owners = [this.heldSeq];
      if (latest) {
        intent = toIntent(latest.input);
        intent.jumpPressed = pending.some(
          (command) => command.input.jumpPressed,
        );
        const hit = pending
          .slice()
          .reverse()
          .find((command) => command.input.hitPressed);
        intent.hitPressed = !!hit;
        if (hit) intent.hitJump = hit.input.jump;
        owners = [
          latest.input.seq,
          ...pending
            .filter((command) => command.input.jumpPressed)
            .map((command) => command.input.seq),
        ];
        if (hit) owners.push(hit.input.seq);
        // Only the newest held command owns an independent first-use anchor.
        // Earlier coalesced edges remain owners of this step, never fake ticks.
        for (const command of pending) command.firstStep = this.localStep;
        latest.firstStep = this.localStep;
        this.heldSeq = latest.input.seq;
        this.held = {
          ...intent,
          jumpPressed: false,
          hitPressed: false,
          hitJump: undefined,
        };
      }
      const record: Step = {
        id: this.localStep,
        intent,
        owners,
        context: this.context,
      };
      stepClassicPlayer(this.player, intent, 1 / SIM_HZ, this.context);
      this.steps.push(record);
      if (this.steps.length > 120) this.steps.shift();
      this.fixedSteps++;
      this.accumulator = Math.max(0, this.accumulator - stepMs);
      count++;
    }
    if (elapsed > 100 + 1e-7) {
      this.stalls++;
      this.expire();
    }
  }
  private expire(): void {
    if (!this.fallback?.suspended) this.expirations++;
    this.fallback = { ack: this.ack, suspended: true };
    this.anchor = undefined;
    this.commands = [];
    this.steps = [];
    this.held = emptyIntent();
    this.heldSeq = this.ack;
    this.accumulator = 0;
    if (this.authority)
      Object.assign(this.player, cloneClassicPlayer(this.authority));
    this.offset = { x: 0, y: 0 };
  }
  reconcile(snapshot: Snapshot, at = this.lastAt ?? 0): void {
    this.advance(at);
    const key = `${snapshot.room}:${snapshot.state.players[this.side].characterId}:${snapshot.state.score.left}:${snapshot.state.score.right}:${snapshot.state.phase}:${snapshot.status}`;
    const reset = this.cleared || key !== this.scoreKey;
    const before = this.drawState(0);
    const previousAck = this.ack;
    const previousAckTick = this.ackTick;
    this.scoreKey = key;
    this.authority = cloneClassicPlayer(snapshot.state.players[this.side]);
    this.context = {
      pointActive: snapshot.state.pointActive,
      shuttle: { ...snapshot.state.shuttle },
    };
    this.ack = snapshot.ack;
    this.ackTick = snapshot.ackTick;
    this.authorityTick = snapshot.tick;
    this.correction = 0;
    this.snapped = false;
    if (
      reset ||
      snapshot.state.phase !== "playing" ||
      snapshot.status !== "playing"
    ) {
      this.clear();
      this.cleared = false;
      this.lastAt = at;
      Object.assign(this.player, cloneClassicPlayer(this.authority));
    } else {
      const command = this.commands.find(
        (command) => command.input.seq === snapshot.ack,
      );
      let anchor = this.anchor?.seq === snapshot.ack ? this.anchor : undefined;
      if (
        !anchor &&
        command?.firstStep !== undefined &&
        Number.isInteger(snapshot.ackTick) &&
        snapshot.ackTick! >= 1
      ) {
        // If a newer command shared its step, this ack was coalesced away locally.
        const step = this.steps.find((step) => step.id === command.firstStep);
        if (step?.owners[0] === snapshot.ack)
          anchor = {
            seq: snapshot.ack,
            localStep: command.firstStep,
            authorityStep: snapshot.ackTick!,
          };
      }
      this.commands = this.commands.filter(
        (command) => command.input.seq > snapshot.ack,
      );
      // One fallback generation per ack. Continued stale downlink snapshots may
      // refresh ball context but must not restart an old speculative swing.
      if (this.fallback?.ack === snapshot.ack) {
        const discarded = previousAckTick !== null && snapshot.ackTick === null;
        if (this.fallback.suspended || discarded) {
          Object.assign(this.player, cloneClassicPlayer(this.authority));
          this.steps = [];
          this.anchor = undefined;
          this.accumulator = 0;
          // Null invalidates the old anchor once. It cannot confirm seq>ack,
          // nor replay already-consumed fallback edges. New pending commands
          // still enter the ordinary next-step coalescer.
          if (this.heldSeq <= snapshot.ack) this.held = emptyIntent();
        }
        if (!discarded) return;
      } else {
        const numeric =
          Number.isInteger(snapshot.ackTick) &&
          snapshot.ackTick! >= 1 &&
          snapshot.ackTick! <= snapshot.tick;
        const boundary =
          anchor && numeric && anchor.authorityStep === snapshot.ackTick
            ? anchor.localStep + snapshot.tick - snapshot.ackTick!
            : undefined;
        const overlap =
          boundary !== undefined &&
          this.steps.some(
            (step) =>
              step.id <= boundary &&
              step.owners.some((seq) => seq > snapshot.ack),
          );
        const complete =
          boundary !== undefined &&
          boundary <= this.localStep &&
          boundary >= (this.steps[0]?.id ?? this.localStep + 1) - 1;
        Object.assign(this.player, cloneClassicPlayer(this.authority));
        if (complete && !overlap) {
          this.anchor = anchor;
          this.steps = this.steps.filter((step) => step.id > boundary!);
          for (const step of this.steps)
            stepClassicPlayer(
              this.player,
              step.intent,
              1 / SIM_HZ,
              step.context,
            );
          this.fallback = undefined;
          this.aligned++;
        } else {
          const reason = !numeric ? "null" : overlap ? "overlap" : "missing";
          this.fallbacks[reason]++;
          this.fallback = { ack: snapshot.ack, suspended: false };
          this.anchor = undefined;
          this.steps = [];
          // Rebase the outstanding operation batch once, without treating it as
          // acknowledged, resending it, or stepping once per command.
          for (const command of this.commands) command.firstStep = undefined;
          this.accumulator = 0;
          if (this.heldSeq > snapshot.ack || !numeric) {
            this.held = emptyIntent();
            this.heldSeq = snapshot.ack;
          }
        }
      }
      // An advancing acknowledgement ends a suspended generation. Expired
      // commands were deliberately removed and cannot resurrect their edges.
      if (
        snapshot.ack > previousAck &&
        !this.commands.length &&
        this.heldSeq < snapshot.ack
      )
        this.heldSeq = snapshot.ack;
    }
    const dx = before.x - this.player.x,
      dy = before.y - this.player.y;
    this.correction = Math.hypot(dx, dy);
    this.snapped = reset || this.correction >= 40;
    this.offset = !this.snapped ? { x: dx, y: dy } : { x: 0, y: 0 };
  }
  clear(): void {
    this.commands = [];
    this.steps = [];
    this.held = emptyIntent();
    this.heldSeq = 0;
    this.anchor = undefined;
    this.fallback = undefined;
    this.lastAt = undefined;
    this.accumulator = 0;
    this.offset = { x: 0, y: 0 };
    this.cleared = true;
  }
  diagnostics(now: number) {
    return {
      correction: this.correction,
      snapped: this.snapped,
      pendingInputs: this.commands.length,
      ackAgeMs: this.commands.length
        ? Math.max(0, now - this.commands[0].at)
        : 0,
      steps: this.steps.length,
      fixedSteps: this.fixedSteps,
      aligned: this.aligned,
      fallbacks: { ...this.fallbacks },
      suspended: this.fallback?.suspended ?? false,
      expirations: this.expirations,
      stalls: this.stalls,
      ackTick: this.ackTick,
      confirmedHeldTicks:
        this.ackTick === null
          ? 0
          : Math.max(0, this.authorityTick - this.ackTick),
    };
  }
  drawState(dt: number): PlayerState {
    const decay = Math.exp(-dt * 18);
    this.offset.x *= decay;
    this.offset.y *= decay;
    return {
      ...serializePlayer(this.player),
      x: this.player.x + this.offset.x,
      y: this.player.y + this.offset.y,
    };
  }
}

const minimumDelayTicks = SIM_HZ / SNAPSHOT_HZ;
/** Monotonic authority presentation time. All positional interpolation stays
 * inside real snapshots; no extrapolated shuttle contact/collision is invented. */
export class Interpolation {
  private frames: { snapshot: Snapshot; at: number }[] = [];
  private key = "";
  private renderTick?: number;
  private lastSample?: number;
  private clockTick = 0;
  private clockAt = 0;
  private delay = minimumDelayTicks;
  private jitter: number[] = [];
  private underruns = 0;
  private ignored = 0;
  private resets = 0;
  private starved = false;
  private rewinds = 0;
  private continuous = false;
  push(snapshot: Snapshot, at: number): boolean {
    if (!Number.isFinite(at)) return false;
    const last = this.frames.at(-1);
    // Tick is room-wide, including point/status changes. An old segment must
    // never overwrite a later score merely because its phase key differs.
    if (
      last?.snapshot.room === snapshot.room &&
      snapshot.tick < last.snapshot.tick
    ) {
      this.ignored++;
      return false;
    }
    const key = `${snapshot.room}:${snapshot.status}:${snapshot.state.phase}:${snapshot.state.score.left}:${snapshot.state.score.right}:${snapshot.state.players.left.characterId}:${snapshot.state.players.right.characterId}`;
    const continuous =
      snapshot.status === "playing" && snapshot.state.phase === "playing";
    if (key !== this.key) {
      this.frames = [];
      this.key = key;
      this.renderTick = undefined;
      this.lastSample = undefined;
      this.clockTick = snapshot.tick;
      this.clockAt = at;
      this.delay = minimumDelayTicks;
      this.jitter = [];
      this.starved = false;
      this.resets++;
    } else if (last && snapshot.tick <= last.snapshot.tick && continuous) {
      this.ignored++;
      return false;
    }
    this.continuous = continuous;
    const previous = this.frames.at(-1);
    if (previous && continuous) {
      const receiveGap = Math.max(0, at - previous.at);
      const serverGap =
        ((snapshot.tick - previous.snapshot.tick) * 1000) / SIM_HZ;
      this.jitter.push(Math.abs(receiveGap - serverGap));
      if (this.jitter.length > 60) this.jitter.shift();
      const sorted = [...this.jitter].sort((a, b) => a - b);
      const p90 = sorted[Math.floor((sorted.length - 1) * 0.9)];
      // Healthy data keeps one snapshot of delay. Adapt up to200ms;
      // a slow decrease avoids repeatedly exhausting the buffer after a burst.
      const wanted = Math.min(12, minimumDelayTicks + (p90 * SIM_HZ) / 1000);
      this.delay += (wanted - this.delay) * (wanted > this.delay ? 0.2 : 0.025);
      const estimate =
        this.clockTick + (Math.max(0, at - this.clockAt) * SIM_HZ) / 1000;
      // Late/batched receipts slew the server-clock estimate, never directly
      // reanchor the render cursor. Tick error correction remains bounded.
      this.clockTick =
        estimate + Math.max(-0.5, Math.min(2, snapshot.tick - estimate));
      this.clockAt = at;
    }
    if (!continuous) this.frames = [];
    this.frames.push({ snapshot, at });
    if (this.frames.length > 32) this.frames.shift();
    return true;
  }
  sample(now: number): GameState | undefined {
    const last = this.frames.at(-1);
    if (!last) return;
    if (!this.continuous) {
      this.renderTick = last.snapshot.tick;
      this.lastSample = now;
      return last.snapshot.state;
    }
    const desired =
      this.clockTick +
      (Math.max(0, now - this.clockAt) * SIM_HZ) / 1000 -
      this.delay;
    if (this.renderTick === undefined)
      this.renderTick = Math.max(
        this.frames[0].snapshot.tick,
        Math.min(last.snapshot.tick, desired),
      );
    else {
      const seconds = Math.min(
        0.25,
        Math.max(0, now - (this.lastSample ?? now)) / 1000,
      );
      const error = desired - this.renderTick;
      const rate = Math.max(0.85, Math.min(1.15, 1 + error * 0.025));
      const before = this.renderTick;
      this.renderTick = Math.max(
        before,
        Math.min(last.snapshot.tick, before + seconds * SIM_HZ * rate),
      );
      if (this.renderTick < before) this.rewinds++;
    }
    this.renderTick = Math.max(this.frames[0].snapshot.tick, this.renderTick);
    this.lastSample = Math.max(this.lastSample ?? now, now);
    const starved =
      this.renderTick >= last.snapshot.tick &&
      desired > last.snapshot.tick + 0.01;
    if (starved && !this.starved) this.underruns++;
    this.starved = starved;
    const target = this.renderTick;
    const next = this.frames.findIndex(
      ({ snapshot }) => snapshot.tick >= target,
    );
    if (next <= 0)
      return next === 0 ? this.frames[0].snapshot.state : last.snapshot.state;
    const a = this.frames[next - 1].snapshot;
    const b = this.frames[next].snapshot;
    const alpha = Math.max(
      0,
      Math.min(1, (target - a.tick) / (b.tick - a.tick)),
    );
    const mix = <T extends { x: number; y: number; vx: number; vy: number }>(
      from: T,
      to: T,
    ): T => ({
      ...(alpha < 0.5 ? from : to),
      x: from.x + (to.x - from.x) * alpha,
      y: from.y + (to.y - from.y) * alpha,
      vx: from.vx + (to.vx - from.vx) * alpha,
      vy: from.vy + (to.vy - from.vy) * alpha,
    });
    const discrete = alpha < 0.5 ? a.state : b.state;
    return {
      ...discrete,
      elapsed: a.state.elapsed + (b.state.elapsed - a.state.elapsed) * alpha,
      players: {
        left: mix(a.state.players.left, b.state.players.left),
        right: mix(a.state.players.right, b.state.players.right),
      },
      shuttle:
        a.state.shuttle.state === b.state.shuttle.state &&
        a.state.shuttle.lastTouchedBy === b.state.shuttle.lastTouchedBy
          ? mix(a.state.shuttle, b.state.shuttle)
          : discrete.shuttle,
    };
  }
  diagnostics() {
    const latestTick = this.frames.at(-1)?.snapshot.tick ?? 0;
    return {
      renderTick: this.renderTick ?? null,
      latestTick,
      snapshots: this.frames.length,
      delayMs: (this.delay * 1000) / SIM_HZ,
      availableMs:
        (Math.max(0, latestTick - (this.renderTick ?? latestTick)) * 1000) /
        SIM_HZ,
      starved: this.starved,
      underruns: this.underruns,
      ignored: this.ignored,
      resets: this.resets,
      rewinds: this.rewinds,
    };
  }
}
