import { expect, it } from "vitest";
import { Interpolation } from "../src/client/prediction";
import { Simulation } from "../src/shared/simulation";
import { SIM_HZ, type Snapshot } from "../src/shared/protocol";

const period = 1000 / SIM_HZ;
const initial = new Simulation().snapshot();
function snapshot(tick: number): Snapshot {
  const state = structuredClone(initial);
  state.phase = "playing";
  state.elapsed = tick / SIM_HZ;
  state.players.right.x = tick;
  state.shuttle.state = "flying";
  state.shuttle.lastTouchedBy = "left";
  state.shuttle.x = tick;
  return {
    type: "snapshot",
    room: "continuous-rally",
    ack: 0,
    ackTick: null,
    tick,
    state,
    effects: { cursor: 0, events: [] },
    status: "playing",
    reconnectRemainingMs: 0,
  };
}

it.each([18, 30, 60, 120])(
  "recovers recent actual presentation after %i blocked frames and same-time ordered receipts",
  (blockedFrames) => {
    const buffer = new Interpolation();
    const queued: Snapshot[] = [];
    let previous = 0;
    for (let frame = 0; frame <= 180 + blockedFrames + 120; frame++) {
      const now = frame * period;
      if (frame % 2 === 0) queued.push(snapshot(frame));
      // The main thread cannot run receipt callbacks OR sample while blocked.
      if (frame >= 180 && frame < 180 + blockedFrames) continue;
      for (const value of queued.splice(0)) buffer.push(value, now);
      const state = buffer.sample(now)!;
      expect(state.players.right.x).toBeGreaterThanOrEqual(previous - 1e-6);
      const d = buffer.diagnostics();
      expect(state.players.right.x).toBeLessThanOrEqual(d.latestTick);
      expect(state.shuttle.x).toBeCloseTo(state.players.right.x, 8);
      if (frame >= 180 + blockedFrames) {
        expect(d.availableMs).toBeLessThanOrEqual(d.delayMs + 1e-6);
        expect(d.recoveries).toBe(1);
      }
      previous = state.players.right.x;
    }
    expect(buffer.diagnostics().snapshots).toBeLessThanOrEqual(32);
    expect(buffer.diagnostics().rewinds).toBe(0);
  },
);

it.each([30, 60])(
  "repeated %i-frame blocks do not accumulate old authority presentation",
  (blockedFrames) => {
    const buffer = new Interpolation();
    const queued: Snapshot[] = [];
    let previous = 0;
    let resumptions = 0;
    for (let frame = 0; frame <= 1800; frame++) {
      const now = frame * period;
      if (frame % 2 === 0) queued.push(snapshot(frame));
      if (frame >= 180 && (frame - 180) % 120 < blockedFrames) continue;
      for (const value of queued.splice(0)) buffer.push(value, now);
      const state = buffer.sample(now)!;
      const d = buffer.diagnostics();
      expect(d.renderTick).toBeGreaterThanOrEqual(previous - 1e-6);
      expect(state.shuttle.x).toBeLessThanOrEqual(d.latestTick);
      if (frame >= 180 && (frame - 180) % 120 === blockedFrames) resumptions++;
      expect(d.recoveries).toBe(resumptions);
      expect(d.availableMs).toBeLessThanOrEqual(d.delayMs + 1e-6);
      previous = d.renderTick!;
    }
    expect(resumptions).toBeGreaterThan(10);
  },
);

it("ordinary sampling and stream-only starvation keep normal slew without recovery, and a blocked sample holds missing authority", () => {
  const buffer = new Interpolation();
  let previous = 0;
  for (let frame = 0; frame <= 120; frame++) {
    const now = frame * period;
    if (frame % 2 === 0 && (frame < 30 || frame > 90))
      buffer.push(snapshot(frame), now);
    const state = buffer.sample(now)!;
    expect(state.players.right.x).toBeGreaterThanOrEqual(previous);
    expect(state.players.right.x - previous).toBeLessThanOrEqual(1.15 + 1e-6);
    expect(state.players.right.x).toBeLessThanOrEqual(
      buffer.diagnostics().latestTick,
    );
    previous = state.players.right.x;
  }
  expect(buffer.diagnostics().recoveries).toBe(0);
  const frozen = buffer.sample(5000)!;
  expect(frozen).toEqual(snapshot(120).state);
  expect(buffer.diagnostics().availableMs).toBe(0);
  expect(buffer.sample(6000)).toEqual(frozen);
  const detached = buffer.diagnostics();
  detached.recoveries = -1;
  expect(buffer.diagnostics().recoveries).toBeGreaterThanOrEqual(1);
});

it("recovery selects a real discrete shuttle across contacts and resets authority boundaries immediately", () => {
  const buffer = new Interpolation();
  buffer.push(snapshot(0), 0);
  buffer.sample(0);
  const a = snapshot(58);
  a.state.shuttle.x = 100;
  const b = snapshot(60);
  b.state.shuttle.lastTouchedBy = "right";
  b.state.shuttle.x = 500;
  buffer.push(a, 1000);
  buffer.push(b, 1000);
  const recovered = buffer.sample(1017)!;
  expect([100, 500]).toContain(recovered.shuttle.x);
  expect(buffer.diagnostics().availableMs).toBeLessThanOrEqual(
    buffer.diagnostics().delayMs,
  );
  for (const boundary of [
    "score",
    "phase",
    "status",
    "left",
    "right",
    "room",
  ]) {
    const next = snapshot(62);
    if (boundary === "score") next.state.score.left++;
    if (boundary === "phase") next.state.phase = "point";
    if (boundary === "status") next.status = "reconnecting";
    if (boundary === "left" || boundary === "right")
      next.state.players[boundary].characterId = "toaster";
    if (boundary === "room") next.room = "new-room";
    buffer.push(next, 2000);
    expect(buffer.sample(2000)).toBe(next.state);
  }
});
