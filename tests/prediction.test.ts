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
    seq,
    move: 0,
    jump: false,
    jumpPressed: false,
    hitHeld: false,
    hitPressed: false,
    ...patch,
  };
}
it("replays unacknowledged original movement, jumps and body frames at one 60-Hz step per input", () => {
  const game = new Simulation();
  const prediction = new Prediction("left", game.players.left);
  prediction.reconcile(snapshot(game));
  let acknowledged: Snapshot | undefined;
  for (let seq = 1; seq <= 20; seq++) {
    const input = command(seq, {
      move: -1,
      jump: seq === 2,
      jumpPressed: seq === 2,
    });
    prediction.apply(input);
    game.setIntents({ ...input, pausePressed: false }, emptyIntent());
    game.update(1 / SIM_HZ);
    if (seq === 7) acknowledged = snapshot(game, seq, seq);
  }
  prediction.reconcile(acknowledged!);
  expect(prediction.player).toEqual(game.snapshot().players.left);
  expect(prediction.player.x).toBe(75);
  expect(prediction.player.y).toBeLessThan(CLASSIC_WORLD.groundY);
});
it("predicts explicit original serve animation while leaving the authoritative shuttle and score intact", () => {
  const game = new Simulation();
  const authority = snapshot(game);
  const frozen = JSON.stringify(authority);
  const prediction = new Prediction("left", game.players.left);
  prediction.reconcile(authority);
  for (let seq = 1; seq <= 6; seq++) {
    const input = command(seq, { hitHeld: true, hitPressed: seq === 1 });
    prediction.apply(input);
    game.setIntents({ ...input, pausePressed: false }, emptyIntent());
    game.update(1 / SIM_HZ);
  }
  expect(prediction.player).toEqual(game.snapshot().players.left);
  expect(prediction.player.swingKind).toBe("serve");
  expect(prediction.player.swingFrame).toBeGreaterThan(1);
  expect(JSON.stringify(authority)).toBe(frozen);
  expect(authority.state.shuttle.state).toBe("attached");
  expect(game.snapshot().shuttle.state).toBe("flying");
});
it("drops old inputs on a score, room or reconnect transition and clones nested latches", () => {
  const game = new Simulation();
  const prediction = new Prediction("right", game.players.right);
  prediction.reconcile(snapshot(game));
  prediction.apply(
    command(1, {
      move: -1,
      jump: true,
      jumpPressed: true,
      hitHeld: true,
      hitPressed: true,
    }),
  );
  const authority = snapshot(game, 0, 2);
  authority.state.phase = "point";
  authority.state.pointActive = false;
  authority.state.score.left = 1;
  prediction.reconcile(authority);
  expect(prediction.player).toEqual(authority.state.players.right);
  prediction.player.swingClips.overhead.clock = 7;
  expect(authority.state.players.right.swingClips.overhead.clock).not.toBe(7);
  const nextRoom = snapshot(game, 0, 0);
  nextRoom.room = "new-room";
  prediction.reconcile(nextRoom);
  expect(prediction.player).toEqual(nextRoom.state.players.right);
  prediction.apply(command(2, { move: -1 }));
  const paused = snapshot(game, 0, 2);
  paused.room = "new-room";
  paused.status = "reconnecting";
  prediction.reconcile(paused);
  expect(prediction.player).toEqual(paused.state.players.right);
});
it("interpolates numeric motion at the new cadence, keeps integer animation frames and holds the last snapshot", () => {
  const game = new Simulation();
  const buffer = new Interpolation();
  for (const tick of [0, 2, 4]) {
    const value = snapshot(game, 0, tick);
    value.state.players.right.x = 500 + tick;
    value.state.players.right.swingFrame = tick + 1;
    buffer.push(value, (tick * 1000) / SIM_HZ);
  }
  expect(buffer.sample(100)!.players.right.x).toBeCloseTo(502);
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
