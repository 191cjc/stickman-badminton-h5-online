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
  private history: InputFrame[] = [];
  private offset = { x: 0, y: 0 };
  private scoreKey = "";
  private context: ClassicPlayerContext = {};
  constructor(
    readonly side: Side,
    initial: PlayerState,
  ) {
    this.player = cloneClassicPlayer(initial);
  }
  apply(input: InputFrame, remember = true): void {
    if (remember) {
      this.history.push(input);
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
      : this.history.filter((input) => input.seq > snapshot.ack);
    Object.assign(
      this.player,
      cloneClassicPlayer(snapshot.state.players[this.side]),
    );
    this.context = {
      pointActive: snapshot.state.pointActive,
      shuttle: { ...snapshot.state.shuttle },
    };
    if (snapshot.state.phase === "playing" && snapshot.status === "playing")
      for (const input of this.history) this.apply(input, false);
    const dx = before.x - this.player.x;
    const dy = before.y - this.player.y;
    this.offset =
      !reset && Math.hypot(dx, dy) < 40 ? { x: dx, y: dy } : { x: 0, y: 0 };
  }
  clear(): void {
    this.history = [];
    this.offset = { x: 0, y: 0 };
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

export class Interpolation {
  private frames: { snapshot: Snapshot; at: number }[] = [];
  push(snapshot: Snapshot, at: number): void {
    const last = this.frames.at(-1);
    if (
      last?.snapshot.room !== snapshot.room ||
      last.snapshot.status !== snapshot.status ||
      last.snapshot.state.phase !== snapshot.state.phase ||
      last.snapshot.state.score.left !== snapshot.state.score.left ||
      last.snapshot.state.score.right !== snapshot.state.score.right ||
      last.snapshot.state.players.left.characterId !==
        snapshot.state.players.left.characterId ||
      last.snapshot.state.players.right.characterId !==
        snapshot.state.players.right.characterId ||
      snapshot.status !== "playing" ||
      snapshot.state.phase !== "playing"
    )
      this.frames = [];
    if (this.frames.at(-1)?.snapshot.tick === snapshot.tick) return;
    this.frames.push({ snapshot, at });
    if (this.frames.length > 12) this.frames.shift();
  }
  sample(now: number): GameState | undefined {
    const last = this.frames.at(-1);
    if (!last) return;
    // Buffer two 30-Hz snapshots. Never extrapolate collisions or points.
    const target =
      last.snapshot.tick +
      (Math.max(0, now - last.at) * SIM_HZ) / 1000 -
      (2 * SIM_HZ) / SNAPSHOT_HZ;
    const next = this.frames.findIndex(
      (frame) => frame.snapshot.tick >= target,
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
      // Discrete action/latch/score fields always come from a real snapshot.
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
}
