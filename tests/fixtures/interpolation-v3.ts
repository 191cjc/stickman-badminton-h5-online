// Frozen protocol3 presentation algorithm from a9a0a88 for behavioral A/B.
// Only import paths and exported class name differ; no production code uses it.
import { SIM_HZ, SNAPSHOT_HZ, type Snapshot } from "../../src/shared/protocol";
import type { GameState } from "../../src/shared/state";
/** Monotonic authority presentation time. All positional interpolation stays
 * inside real snapshots; no extrapolated shuttle contact/collision is invented. */
export class BaselineInterpolation {
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
