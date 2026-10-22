import { expect, it } from "vitest";
import { Prediction, Interpolation } from "../src/client/prediction";
import { Simulation } from "../src/shared/simulation";
import { emptyIntent } from "../src/shared/state";
import { CLASSIC_WORLD } from "../src/shared/classic/types";
import { SIM_HZ } from "../src/shared/protocol";
import type { InputFrame, Snapshot } from "../src/shared/protocol";

function snapshot(game: Simulation, ack = 0, tick = 0): Snapshot {
  return {
    type: "snapshot",
    room: "test",
    ack,
    ackTick: ack ? ack : null,
    tick,
    state: game.snapshot(),
    effects: game.presentation(),
    status: "playing",
    reconnectRemainingMs: 0,
  };
}
function command(seq: number, patch: Partial<InputFrame> = {}): InputFrame {
  return {
    type: "input",
    swing: "auto",
    seq,
    move: 0,
    jump: false,
    jumpPressed: false,
    hitHeld: false,
    hitPressed: false,
    ...patch,
  };
}
it("replays fixed elapsed steps after a delayed completed ack, including original jump clips", () => {
  const game = new Simulation();
  const prediction = new Prediction("left", game.players.left);
  prediction.reconcile(snapshot(game), 0);
  let acknowledged: Snapshot | undefined;
  for (let tick = 1; tick <= 20; tick++) {
    const input = command(tick, {
      move: -1,
      jump: tick === 2,
      jumpPressed: tick === 2,
    });
    prediction.accept(input, ((tick - 1) * 1000) / SIM_HZ);
    prediction.advance((tick * 1000) / SIM_HZ);
    game.setIntents({ ...input, pausePressed: false }, emptyIntent());
    game.update(1 / SIM_HZ);
    if (tick === 7) acknowledged = snapshot(game, tick, tick);
  }
  prediction.reconcile(acknowledged!, (20 * 1000) / SIM_HZ);
  expect(prediction.player).toEqual(game.snapshot().players.left);
  expect(prediction.player.x).toBe(75);
  expect(prediction.player.y).toBeLessThan(CLASSIC_WORLD.groundY);
  expect(prediction.diagnostics(340).aligned).toBe(1);
});
it("predicts original serve without mutating authoritative shuttle or score", () => {
  const game = new Simulation();
  const authority = snapshot(game);
  const frozen = JSON.stringify(authority);
  const prediction = new Prediction("left", game.players.left);
  prediction.reconcile(authority, 0);
  prediction.accept(command(1, { hitHeld: true, hitPressed: true }), 0);
  for (let tick = 1; tick <= 6; tick++) {
    prediction.advance((tick * 1000) / SIM_HZ);
    game.setIntents(
      { ...emptyIntent(), hitHeld: true, hitPressed: tick === 1 },
      emptyIntent(),
    );
    game.update(1 / SIM_HZ);
  }
  expect(prediction.player).toEqual(game.snapshot().players.left);
  expect(prediction.player.swingKind).toBe("serve");
  expect(prediction.player.swingFrame).toBeGreaterThan(1);
  expect(JSON.stringify(authority)).toBe(frozen);
  expect(authority.state.shuttle.state).toBe("attached");
  expect(game.snapshot().shuttle.state).toBe("flying");
});
it.each([
  "score",
  "room",
  "status",
  "role",
  "phase",
  "release",
  "speed",
  "version",
])(
  "%s boundaries clear outstanding operations and nested state stays detached",
  (boundary) => {
    const game = new Simulation();
    const prediction = new Prediction("right", game.players.right);
    prediction.reconcile(snapshot(game), 0);
    prediction.accept(
      command(1, {
        move: -1,
        jump: true,
        jumpPressed: true,
        hitHeld: true,
        hitPressed: true,
      }),
      0,
    );
    prediction.advance(20);
    const authority = snapshot(game, 0, 2);
    if (boundary === "score") authority.state.score.left++;
    if (boundary === "room") authority.room = "new-room";
    if (boundary === "status") authority.status = "reconnecting";
    if (boundary === "phase") authority.state.phase = "point";
    if (boundary === "role")
      authority.state.players.right.characterId = "toaster";
    if (boundary === "release") prediction.clear();
    if (boundary === "speed") authority.state.shuttleSpeed = 2;
    if (boundary === "version")
      Object.assign(authority.state, { version: "incompatible" });
    prediction.reconcile(authority, 20);
    expect(prediction.player).toEqual(authority.state.players.right);
    expect(prediction.diagnostics(20).pendingInputs).toBe(0);
    expect(prediction.diagnostics(20).steps).toBe(0);
    prediction.player.swingClips.overhead.clock = 7;
    expect(authority.state.players.right.swingClips.overhead.clock).not.toBe(7);
  },
);
it("interpolates numeric motion at the new cadence, keeps integer animation frames and holds the last snapshot", () => {
  const game = new Simulation();
  const buffer = new Interpolation();
  for (const tick of [0, 2, 4]) {
    const value = snapshot(game, 0, tick);
    value.state.players.right.x = 500 + tick;
    value.state.players.right.swingFrame = tick + 1;
    buffer.push(value, (tick * 1000) / SIM_HZ);
  }
  expect(buffer.sample(1000 / 15)!.players.right.x).toBeCloseTo(502);
  expect(Number.isInteger(buffer.sample(108)!.players.right.swingFrame)).toBe(
    true,
  );
  expect(buffer.sample(1000)!.players.right.x).toBe(504);
});
it("does not blend across a score, phase or shuttle contact transition", () => {
  const game = new Simulation();
  const buffer = new Interpolation();
  const a = snapshot(game, 0, 10);
  a.state.shuttle.state = "flying";
  a.state.shuttle.lastTouchedBy = "left";
  a.state.shuttle.x = 100;
  buffer.push(a, 0);
  const b = snapshot(game, 0, 12);
  b.state.shuttle.state = "flying";
  b.state.shuttle.lastTouchedBy = "right";
  b.state.shuttle.x = 500;
  buffer.push(b, 1000 / 30);
  // Halfway between the two states after the deliberate interpolation delay.
  const sampled = buffer.sample(1000 / 30 + 50)!;
  expect([100, 500]).toContain(sampled.shuttle.x);
  const point = snapshot(game, 0, 14);
  point.state.phase = "point";
  point.state.score.left = 1;
  point.state.players.right.x = 570;
  buffer.push(point, 2000 / 30);
  expect(buffer.sample(2000 / 30)).toEqual(point.state);
});
it("ordered jitter/bursts and a450ms stream pause never rewind presentation or extrapolate authoritative motion", () => {
  const game = new Simulation();
  const buffer = new Interpolation();
  let lastAt = 0;
  const packets = Array.from({ length: 180 }, (_, i) => {
    const tick = i * 2;
    const delay =
      70 +
      [0, 28, 2, 68, 8, 0, 14, 75][i % 8] +
      (tick >= 100 && tick <= 130 ? 450 : 0);
    lastAt = Math.max(lastAt, (tick * 1000) / SIM_HZ + delay);
    const value = snapshot(game, tick, tick);
    value.state.elapsed = tick / SIM_HZ;
    value.state.players.right.x = 400 + tick * 0.25;
    value.state.shuttle.state = "flying";
    value.state.shuttle.lastTouchedBy = "left";
    value.state.shuttle.x = 100 + tick;
    return { at: lastAt, value };
  });
  let delivered = 0,
    previous = -Infinity,
    holds = 0;
  for (let now = 0; now < packets.at(-1)!.at; now += 1000 / 60) {
    while (delivered < packets.length && packets[delivered].at <= now) {
      buffer.push(packets[delivered].value, packets[delivered].at);
      delivered++;
    }
    const state = buffer.sample(now);
    if (!state) continue;
    const tick = (state.players.right.x - 400) / 0.25;
    expect(tick).toBeGreaterThanOrEqual(previous - 1e-6);
    expect(tick).toBeLessThanOrEqual(packets[delivered - 1].value.tick + 1e-6);
    expect(state.shuttle.x).toBeCloseTo(100 + tick);
    if (Math.abs(tick - previous) < 1e-6) holds++;
    previous = tick;
  }
  // Frozen baseline arrival-anchor trace holds47frames and rewinds1.32ticks;
  // prove an observable reduction on that reproducible stream, not assignments.
  expect(holds).toBeLessThan(47);
  expect(buffer.diagnostics().rewinds).toBe(0);
  expect(buffer.diagnostics().delayMs).toBeGreaterThanOrEqual(1000 / 30);
  expect(buffer.diagnostics().delayMs).toBeLessThanOrEqual(200);
  expect(buffer.diagnostics().snapshots).toBeLessThanOrEqual(32);
});
it("stale/duplicate ticks cannot replace a newer rally but same-tick status and new-room resets apply immediately", () => {
  const game = new Simulation();
  const buffer = new Interpolation();
  const current = snapshot(game, 20, 20);
  current.state.players.right.x = 540;
  buffer.push(current, 100);
  buffer.sample(100);
  const stale = snapshot(game, 18, 18);
  stale.state.phase = "point";
  stale.state.score.left = 1;
  expect(buffer.push(stale, 110)).toBe(false);
  expect(buffer.push(current, 111)).toBe(false);
  expect(buffer.sample(120)!.score.left).toBe(0);
  const paused = { ...current, status: "reconnecting" as const };
  expect(buffer.push(paused, 120)).toBe(true);
  expect(buffer.sample(120)).toBe(paused.state);
  expect(buffer.push(current, 130)).toBe(true);
  expect(buffer.diagnostics().resets).toBe(3);
  const newRoom = snapshot(game, 0, 0);
  newRoom.room = "second-room";
  newRoom.state.players.right.x = 570;
  buffer.push(newRoom, 140);
  expect(buffer.sample(140)!.players.right.x).toBe(570);
});
it("diagnostics measure actual small corrections and large snaps and pending input age", () => {
  const game = new Simulation();
  const prediction = new Prediction("left", game.players.left);
  prediction.reconcile(snapshot(game));
  prediction.accept(command(1, { move: -1 }), 100);
  prediction.advance(117);
  expect(prediction.diagnostics(150).ackAgeMs).toBe(50);
  const authority = snapshot(game, 1, 2);
  authority.state.players.left.x -= 10;
  prediction.reconcile(authority);
  expect(prediction.diagnostics(150).correction).toBeGreaterThan(0);
  expect(prediction.diagnostics(150).snapped).toBe(false);
  prediction.accept(command(2), 117);
  authority.ack = 2;
  authority.ackTick = 2;
  authority.tick = 3;
  authority.state.players.left.x += 200;
  prediction.reconcile(authority);
  expect(prediction.diagnostics(150).correction).toBeGreaterThan(40);
  expect(prediction.diagnostics(150).snapped).toBe(true);
  expect(prediction.diagnostics(150).pendingInputs).toBe(0);
});

it.each([1, 1.25, 1.5, 2] as const)(
  "%sx prediction preserves the newest hit choice/jump payload through newer release packets",
  (shuttleSpeed) => {
    for (const newest of [false, true])
      for (const side of ["left", "right"] as const) {
        const game = new Simulation({
          shuttleSpeed,
          characters: { [side]: "toaster" },
        });
        game.players.left.serving = game.players.right.serving = false;
        game.players[side].jumpReady = true;
        const initial = snapshot(game);
        const frozen = JSON.stringify(initial);
        const prediction = new Prediction(side, game.players[side]);
        prediction.reconcile(initial, 0);
        prediction.accept(
          command(1, { hitPressed: true, swing: "underhand", jump: true }),
          0,
        );
        if (newest)
          prediction.accept(
            command(2, { hitPressed: true, swing: "overhead", jump: false }),
            1,
          );
        prediction.accept(command(newest ? 3 : 2, { move: 1 }), 2);
        prediction.advance(1000 / 60);
        const expected = {
          ...emptyIntent(),
          move: 1,
          hitPressed: true,
          swing: newest ? ("overhead" as const) : ("underhand" as const),
          hitJump: !newest,
        };
        game.setIntents(
          side === "left" ? expected : emptyIntent(),
          side === "right" ? expected : emptyIntent(),
        );
        game.update(1 / 60);
        expect(prediction.player).toEqual(game.snapshot().players[side]);
        expect(prediction.player.swingKind).toBe(
          newest ? "overhead" : "underhand",
        );
        expect(prediction.player.grounded).toBe(newest);
        expect(JSON.stringify(initial)).toBe(frozen);
        expect(game.rallyHits).toBe(0);
        prediction.advance((2 * 1000) / 60);
        const frame = prediction.player.swingFrame;
        expect(frame).toBeGreaterThan(1); // No second edge from the retained held intent.
      }
  },
);
it("speed/schema boundaries reset prediction and interpolation while same-side hits only choose actual shuttle endpoints", () => {
  const game = new Simulation();
  const a = snapshot(game, 0, 10);
  const b = snapshot(game, 0, 12);
  for (const value of [a, b]) {
    value.state.shuttle.state = "flying";
    value.state.shuttle.lastTouchedBy = "left";
  }
  a.state.shuttle.x = 100;
  b.state.shuttle.x = 500;
  b.state.rallyHits = 1;
  const buffer = new Interpolation();
  buffer.push(a, 0);
  buffer.push(b, 1000 / 30);
  buffer.sample(1000 / 30);
  const before = buffer.diagnostics();
  const actual = buffer.sample(1000 / 30 + 17)!;
  expect([100, 500]).toContain(actual.shuttle.x);
  expect(buffer.diagnostics().resets).toBe(before.resets);
  const prediction = new Prediction("left", a.state.players.left);
  prediction.reconcile(a, 0);
  prediction.accept(command(1, { move: -1 }), 0);
  prediction.advance(20);
  const changed = snapshot(game, 0, 12);
  changed.state.shuttleSpeed = 2;
  prediction.reconcile(changed, 20);
  expect(prediction.diagnostics(20).pendingInputs).toBe(0);
  expect(prediction.player).toEqual(changed.state.players.left);
  buffer.push(changed, 50);
  expect(buffer.sample(50)).toEqual(changed.state);
  expect(buffer.diagnostics().resets).toBe(before.resets + 1);
});
