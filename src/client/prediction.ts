import { Player } from "../shared/entities";
import { stepPlayer } from "../shared/player-step";
import { serializePlayer } from "../shared/state";
import type { GameState, PlayerState } from "../shared/state";
import type { InputFrame, Snapshot } from "../shared/protocol";
import type { Side } from "../shared/types";
import { toIntent } from "./input";

export class Prediction {
  readonly player: Player;
  private history: InputFrame[] = [];
  private offset = { x: 0, y: 0 };
  private scoreKey = "";
  constructor(readonly side: Side) {
    this.player = new Player(side);
  }
  apply(input: InputFrame, remember = true): void {
    if (remember) {
      this.history.push(input);
      if (this.history.length > 120) this.history.shift();
    }
    const intent = toIntent(input);
    stepPlayer(this.player, intent, 1 / 120);
    stepPlayer(
      this.player,
      { ...intent, jumpPressed: false, hitPressed: false },
      1 / 120,
    );
  }
  reconcile(snapshot: Snapshot): void {
    const key = `${snapshot.state.score.left}:${snapshot.state.score.right}:${snapshot.state.phase}:${snapshot.status}`;
    const reset = key !== this.scoreKey;
    this.scoreKey = key;
    const before = this.drawState(0);
    this.history = reset
      ? []
      : this.history.filter((input) => input.seq > snapshot.ack);
    Object.assign(this.player, snapshot.state.players[this.side]);
    if (snapshot.state.phase === "playing" && snapshot.status === "playing")
      for (const input of this.history) this.apply(input, false);
    const dx = before.x - this.player.x;
    const dy = before.y - this.player.y;
    this.offset =
      !reset && Math.hypot(dx, dy) < 100 ? { x: dx, y: dy } : { x: 0, y: 0 };
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
    const target =
      last.snapshot.tick + (Math.max(0, now - last.at) * 120) / 1000 - 8;
    const next = this.frames.findIndex(
      (frame) => frame.snapshot.tick >= target,
    );
    if (next <= 0)
      return next === 0 ? this.frames[0].snapshot.state : last.snapshot.state;
    const a = this.frames[next - 1].snapshot;
    const b = this.frames[next].snapshot;
    if (
      a.state.phase !== b.state.phase ||
      a.state.score.left !== b.state.score.left ||
      a.state.score.right !== b.state.score.right
    )
      return b.state;
    const alpha = Math.max(
      0,
      Math.min(1, (target - a.tick) / (b.tick - a.tick)),
    );
    const mix = <T extends { x: number; y: number; vx: number; vy: number }>(
      from: T,
      to: T,
    ): T => ({
      ...from,
      x: from.x + (to.x - from.x) * alpha,
      y: from.y + (to.y - from.y) * alpha,
      vx: from.vx + (to.vx - from.vx) * alpha,
      vy: from.vy + (to.vy - from.vy) * alpha,
    });
    return {
      ...a.state,
      players: {
        left: mix(a.state.players.left, b.state.players.left),
        right: mix(a.state.players.right, b.state.players.right),
      },
      shuttle:
        a.state.shuttle.state === b.state.shuttle.state
          ? mix(a.state.shuttle, b.state.shuttle)
          : a.state.shuttle,
    };
  }
}
