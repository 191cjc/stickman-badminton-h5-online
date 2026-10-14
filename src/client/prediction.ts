import {
  cloneClassicPlayer,
  stepClassicPlayer,
} from "../shared/classic/player";
import type { ClassicPlayerContext } from "../shared/classic/types";
import { serializePlayer } from "../shared/state";
import type { GameState, PlayerState } from "../shared/state";
import { INPUT_HZ, SIM_HZ, SNAPSHOT_HZ } from "../shared/protocol";
import type { InputFrame, Snapshot } from "../shared/protocol";
import type { Side } from "../shared/types";
import { toIntent } from "./input";

export class Prediction {
  readonly player: PlayerState;
  private history: { input: InputFrame; at: number }[] = [];
  private offset = { x: 0, y: 0 };
  private scoreKey = "";
  private context: ClassicPlayerContext = {};
  private correction = 0;
  private snapped = false;
  constructor(
    readonly side: Side,
    initial: PlayerState,
  ) {
    this.player = cloneClassicPlayer(initial);
  }
  apply(input: InputFrame, remember = true, at = 0): void {
    if (remember) {
      this.history.push({ input, at });
      if (this.history.length > INPUT_HZ * 2) this.history.shift();
    }
    // One input corresponds to one Flash 60-fps player step. The authority's
    // latest shuttle is read only to choose a swing; prediction never hits it.
    stepClassicPlayer(this.player, toIntent(input), 1 / INPUT_HZ, this.context);
  }
  reconcile(snapshot: Snapshot): void {
    const key = `${snapshot.room}:${snapshot.state.players[this.side].characterId}:${snapshot.state.score.left}:${snapshot.state.score.right}:${snapshot.state.phase}:${snapshot.status}`;
    const reset = key !== this.scoreKey;
    this.scoreKey = key;
    const before = this.drawState(0);
    this.history = reset
      ? []
      : this.history.filter(({ input }) => input.seq > snapshot.ack);
    Object.assign(
      this.player,
      cloneClassicPlayer(snapshot.state.players[this.side]),
    );
    this.context = {
      pointActive: snapshot.state.pointActive,
      shuttle: { ...snapshot.state.shuttle },
    };
    if (snapshot.state.phase === "playing" && snapshot.status === "playing")
      for (const { input } of this.history) this.apply(input, false);
    const dx = before.x - this.player.x;
    const dy = before.y - this.player.y;
    this.correction = Math.hypot(dx, dy);
    this.snapped = reset || this.correction >= 40;
    this.offset =
      !reset && Math.hypot(dx, dy) < 40 ? { x: dx, y: dy } : { x: 0, y: 0 };
  }
  clear(): void {
    this.history = [];
    this.offset = { x: 0, y: 0 };
  }
  diagnostics(now: number) {
    return {
      correction: this.correction,
      snapped: this.snapped,
      pendingInputs: this.history.length,
      ackAgeMs: this.history.length ? Math.max(0, now - this.history[0].at) : 0,
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

/** Monotonic authority presentation time. All positional interpolation stays
 * inside real snapshots; no extrapolated shuttle contact/collision is invented. */
export class Interpolation {
  private frames: { snapshot: Snapshot; at: number }[] = [];
  private key = "";
  private renderTick?: number;
  private lastSample?: number;
  private clockTick = 0;
  private clockAt = 0;
  private delay = (2 * SIM_HZ) / SNAPSHOT_HZ;
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
      this.delay = (2 * SIM_HZ) / SNAPSHOT_HZ;
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
      // Healthy data keeps the original two-snapshot delay. Adapt up to200ms;
      // a slow decrease avoids repeatedly exhausting the buffer after a burst.
      const wanted = Math.min(12, 4 + (p90 * SIM_HZ) / 1000);
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
