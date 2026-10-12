import { expect, it } from "vitest";
import { Prediction, Interpolation } from "../src/client/prediction";
import { Simulation } from "../src/shared/simulation";
import { emptyIntent } from "../src/shared/state";
import type { InputFrame, Snapshot } from "../src/shared/protocol";

function snapshot(game: Simulation, ack = 0, tick = 0): Snapshot {
  return {
    type: "snapshot",
    room: "test",
    ack,
    tick,
    state: game.snapshot(),
    status: "playing",
    reconnectRemainingMs: 0,
  };
}
it("replays unacknowledged motion and jumps against authoritative state", () => {
  const game = new Simulation();
  const prediction = new Prediction("left");
  prediction.reconcile(snapshot(game));
  let acknowledged: Snapshot | undefined;
  for (let seq = 1; seq <= 20; seq++) {
    const input: InputFrame = {
      type: "input",
      seq,
      move: 1,
      jump: seq === 2,
      jumpPressed: seq === 2,
      hitHeld: false,
      hitPressed: false,
    };
    prediction.apply(input);
    const intent = { ...input, pausePressed: false };
    game.setIntents(intent, emptyIntent());
    game.update(1 / 120);
    game.setIntents({ ...intent, jumpPressed: false }, emptyIntent());
    game.update(1 / 120);
    if (seq === 7) acknowledged = snapshot(game, seq, seq * 2);
  }
  prediction.reconcile(acknowledged!);
  expect({ ...prediction.player }).toEqual(game.snapshot().players.left);
});
it("clears stale prediction on rally reset and keeps authority for ball and score", () => {
  const game = new Simulation();
  const prediction = new Prediction("right");
  prediction.reconcile(snapshot(game));
  prediction.apply({
    type: "input",
    seq: 1,
    move: -1,
    jump: false,
    jumpPressed: false,
    hitHeld: true,
    hitPressed: true,
  });
  const authority = snapshot(game, 1, 4);
  authority.state.phase = "point";
  authority.state.score.left = 1;
  prediction.reconcile(authority);
  expect(prediction.player.x).toBe(authority.state.players.right.x);
  expect(authority.state.shuttle.state).toBe("attached");
  expect(authority.state.score.left).toBe(1);
});
it("buffers remote snapshots and holds the latest state when packets stop", () => {
  const game = new Simulation();
  const buffer = new Interpolation();
  for (const tick of [0, 4, 8]) {
    const value = snapshot(game, 0, tick);
    value.state.players.right.x = 1200 + tick;
    buffer.push(value, (tick * 1000) / 120);
  }
  expect(buffer.sample(100)!.players.right.x).toBeCloseTo(1204);
  expect(buffer.sample(1000)!.players.right.x).toBe(1208);
});
