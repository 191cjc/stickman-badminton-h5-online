import { expect, it } from "vitest";
import { Prediction } from "../src/client/prediction";
import { Simulation } from "../src/shared/simulation";
import {
  cloneClassicPlayer,
  stepClassicPlayer,
} from "../src/shared/classic/player";
import { emptyIntent } from "../src/shared/state";
import type { InputFrame, Snapshot } from "../src/shared/protocol";
const dt = 1000 / 60;
function command(seq: number, patch: Partial<InputFrame> = {}): InputFrame {
  return {
    type: "input",
    swing: "auto",
    seq,
    move: 1,
    jump: false,
    jumpPressed: false,
    hitHeld: false,
    hitPressed: false,
    ...patch,
  };
}
function snapshot(
  game: Simulation,
  tick = 0,
  ack = 0,
  ackTick: number | null = null,
): Snapshot {
  return {
    type: "snapshot",
    room: "clock",
    tick,
    ack,
    ackTick,
    state: game.snapshot(),
    effects: game.presentation(),
    status: "playing",
    reconnectRemainingMs: 0,
  };
}
it.each([1, 2, 4])(
  "400ms motion is equal at %i-tick command sampling, including delayed held acknowledgement",
  (cadence) => {
    const game = new Simulation({ cosmetics: false });
    game.players.left.serving = false;
    const prediction = new Prediction("left", game.players.left);
    prediction.reconcile(snapshot(game), 0);
    let seq = 0,
      ackTick = 0;
    let delayed: Snapshot | undefined;
    for (let tick = 1; tick <= 24; tick++) {
      if ((tick - 1) % cadence === 0) {
        prediction.accept(command(++seq), (tick - 1) * dt);
        ackTick = tick;
      }
      prediction.advance(tick * dt);
      game.setIntents({ ...emptyIntent(), move: 1 }, emptyIntent());
      game.update(1 / 60);
      if (tick === 20) delayed = snapshot(game, tick, seq, ackTick);
    }
    expect(prediction.player.x).toBe(240); // v3 reduced sender:195, correction45.
    expect(prediction.player).toEqual(game.snapshot().players.left);
    prediction.reconcile(delayed!, 400);
    expect(prediction.player).toEqual(game.snapshot().players.left);
    expect(prediction.diagnostics(400).correction).toBe(0);
    expect(prediction.diagnostics(400).aligned).toBe(1);
  },
);
it("retains the ack anchor after command pruning across many confirmed held steps", () => {
  const game = new Simulation();
  const prediction = new Prediction("left", game.players.left);
  prediction.reconcile(snapshot(game), 0);
  prediction.accept(command(1), 0);
  for (let tick = 1; tick <= 160; tick++) {
    prediction.advance(tick * dt);
    game.setIntents({ ...emptyIntent(), move: 1 }, emptyIntent());
    game.update(1 / 60);
    if (tick % 10 === 0)
      prediction.reconcile(snapshot(game, tick, 1, 1), tick * dt);
  }
  expect(prediction.player).toEqual(game.snapshot().players.left);
  expect(prediction.diagnostics(160 * dt)).toMatchObject({
    pendingInputs: 0,
    aligned: 16,
    confirmedHeldTicks: 159,
  });
});
it("120Hz command changes and a same-time command burst do not accelerate 60Hz physics", () => {
  for (const burst of [false, true]) {
    const game = new Simulation();
    game.players.left.serving = false;
    const prediction = new Prediction("left", game.players.left);
    prediction.reconcile(snapshot(game), 0);
    if (burst)
      for (let seq = 1; seq <= 100; seq++) prediction.accept(command(seq), 0);
    for (let tick = 0; tick < 24; tick++) {
      if (!burst) {
        prediction.accept(command(tick * 2 + 1), tick * dt);
        prediction.accept(command(tick * 2 + 2), tick * dt + dt / 2);
      }
      prediction.advance((tick + 1) * dt);
    }
    expect(prediction.player.x).toBe(240);
    expect(prediction.diagnostics(400).fixedSteps).toBe(24);
  }
});
it("coalesces press/release before one step, keeping jump OR and the most recent hit-time jump", () => {
  for (const newestJump of [true, false]) {
    const game = new Simulation();
    const initial = game.snapshot();
    const prediction = new Prediction("right", game.players.right);
    prediction.reconcile(snapshot(game), 0);
    prediction.accept(
      command(1, {
        move: 0,
        jumpPressed: true,
        jump: true,
        hitPressed: true,
        hitHeld: true,
      }),
      0,
    );
    prediction.accept(
      command(2, {
        move: 0,
        jump: newestJump,
        hitPressed: true,
        hitHeld: true,
      }),
      4,
    );
    prediction.accept(command(3, { move: -1 }), 8);
    prediction.advance(dt);
    const expected = cloneClassicPlayer(initial.players.right);
    stepClassicPlayer(
      expected,
      {
        ...emptyIntent(),
        move: -1,
        jumpPressed: true,
        hitPressed: true,
        hitJump: newestJump,
      },
      1 / 60,
      { pointActive: true, shuttle: initial.shuttle },
    );
    expect(prediction.player).toEqual(expected);
    prediction.advance(2 * dt);
    expect(prediction.player.hitLatched).toBe(false);
  }
});
it("asymmetric uplink stall preserves pending edges once per fallback and eventually reconciles advancing ack", () => {
  const game = new Simulation();
  const prediction = new Prediction("right", game.players.right);
  prediction.reconcile(snapshot(game), 0);
  prediction.accept(command(1, { move: 0 }), 0);
  prediction.advance(dt);
  prediction.reconcile(snapshot(game, 1, 1, 1), dt);
  prediction.accept(
    command(2, {
      move: -1,
      jump: true,
      jumpPressed: true,
      hitPressed: true,
      hitHeld: true,
    }),
    dt,
  );
  prediction.advance(2 * dt);
  // Authority has advanced the older held operation, overtaking pending seq2.
  prediction.reconcile(snapshot(game, 10, 1, 1), 2 * dt);
  expect(prediction.diagnostics(2 * dt)).toMatchObject({
    pendingInputs: 1,
    fallbacks: { overlap: 1 },
  });
  prediction.advance(3 * dt);
  const started = prediction.player.swingFrame;
  for (let tick = 4; tick <= 15; tick++) {
    prediction.advance(tick * dt);
    prediction.reconcile(snapshot(game, tick + 10, 1, 1), tick * dt);
  }
  expect(prediction.player.swingFrame).toBeGreaterThan(started);
  expect(prediction.diagnostics(250).fallbacks.overlap).toBe(1);
  // A new genuine edge is still consumed during the same generation; source
  // latch rejects restarting the active clip, while new movement takes effect.
  prediction.accept(command(3, { move: 1, hitPressed: true }), 15 * dt);
  const before = prediction.player.swingFrame;
  prediction.advance(16 * dt);
  expect(prediction.player.vx).toBeGreaterThan(0);
  expect(prediction.player.swingFrame).toBeGreaterThanOrEqual(before);
  const recovered = snapshot(game, 30, 3, 30);
  prediction.reconcile(recovered, 16 * dt);
  expect(prediction.diagnostics(16 * dt).pendingInputs).toBe(0);
  expect(prediction.player).toEqual(recovered.state.players.right);
});
it.each(["null", "missing", "coalesced"])(
  "%s anchor rebases outstanding batch once without acknowledging it",
  (kind) => {
    const game = new Simulation();
    const prediction = new Prediction("right", game.players.right);
    prediction.reconcile(snapshot(game), 0);
    prediction.accept(command(1, { move: 0 }), 0);
    prediction.accept(command(2, { move: -1, hitPressed: true }), 1);
    prediction.advance(dt);
    const ack = kind === "missing" ? 0 : 1;
    const value = snapshot(game, 2, ack, kind === "null" ? null : 1);
    prediction.reconcile(value, dt);
    prediction.advance(2 * dt);
    const frame = prediction.player.swingFrame;
    prediction.reconcile({ ...value, tick: 20 }, 2 * dt);
    expect(prediction.player.swingFrame).toBe(frame);
    expect(prediction.diagnostics(2 * dt).pendingInputs).toBe(2 - ack);
    expect(
      prediction.diagnostics(2 * dt).fallbacks[
        kind === "null" ? "null" : "missing"
      ],
    ).toBe(1);
  },
);
it("history expiry suspends the same stale-ack generation without periodically resurrecting an old hit", () => {
  const game = new Simulation();
  const prediction = new Prediction("right", game.players.right);
  prediction.reconcile(snapshot(game), 0);
  prediction.accept(command(1, { hitPressed: true }), 0);
  for (let tick = 1; tick <= 300; tick++) {
    prediction.advance(tick * dt);
    prediction.reconcile(snapshot(game, tick + 10), tick * dt);
  }
  expect(prediction.player).toEqual(game.snapshot().players.right);
  expect(prediction.diagnostics(5000)).toMatchObject({
    pendingInputs: 0,
    steps: 0,
    suspended: true,
    expirations: 1,
  });
  prediction.reconcile(snapshot(game, 311, 1, 311), 5000);
  prediction.accept(command(2), 5000);
  prediction.advance(5000 + dt);
  expect(prediction.player.vx).toBeGreaterThan(0);
});
it("long callback gaps do at most six steps, cancel incomplete time history, and never apply new direction retroactively", () => {
  const game = new Simulation();
  const prediction = new Prediction("left", game.players.left);
  prediction.reconcile(snapshot(game), 0);
  prediction.accept(command(1), 0);
  prediction.advance(20);
  const before = prediction.player.x;
  prediction.accept(command(2, { move: -1 }), 90);
  expect(prediction.player.x).toBeGreaterThan(before);
  prediction.advance(500);
  expect(prediction.diagnostics(500)).toMatchObject({
    stalls: 1,
    suspended: true,
    steps: 0,
  });
  expect(prediction.diagnostics(500).fixedSteps).toBeLessThanOrEqual(11);
  prediction.advance(500);
  expect(prediction.diagnostics(500).fixedSteps).toBeLessThanOrEqual(11);
  prediction.clear();
  prediction.reconcile(snapshot(game, 40, 2, null), 500);
  prediction.advance(500 + dt);
  expect(prediction.player.x).toBe(game.players.left.x);
});
it("numeric-to-null metadata invalidates one anchor without losing or replaying outstanding edges", () => {
  const game = new Simulation();
  const prediction = new Prediction("right", game.players.right);
  prediction.reconcile(snapshot(game), 0);
  prediction.accept(command(1, { move: 0 }), 0);
  prediction.advance(dt);
  prediction.reconcile(snapshot(game, 1, 1, 1), dt);
  prediction.accept(command(2, { hitPressed: true, jumpPressed: true }), dt);
  prediction.advance(2 * dt);
  // Establish an overlapping fallback before the server clears the old held ack.
  prediction.reconcile(snapshot(game, 10, 1, 1), 2 * dt);
  prediction.advance(3 * dt);
  prediction.reconcile(snapshot(game, 11, 1, null), 3 * dt);
  expect(prediction.diagnostics(3 * dt).pendingInputs).toBe(1);
  // The already consumed speculative swing is not restarted after invalidation.
  prediction.advance(4 * dt);
  expect(prediction.player.swinging).toBe(false);
  prediction.reconcile(snapshot(game, 12, 1, null), 4 * dt);
  expect(prediction.diagnostics(4 * dt).pendingInputs).toBe(1);
  // Fresh input remains eligible in the same generation.
  prediction.accept(command(3, { hitPressed: true, hitHeld: true }), 4 * dt);
  prediction.advance(5 * dt);
  expect(prediction.player.swinging).toBe(true);
  const frame = prediction.player.swingFrame;
  prediction.reconcile(snapshot(game, 13, 1, null), 5 * dt);
  expect(prediction.player.swingFrame).toBe(frame);
});
it("null clear of fully confirmed input stops local held motion, including existing missing-anchor fallback", () => {
  const game = new Simulation();
  const prediction = new Prediction("right", game.players.right);
  prediction.reconcile(snapshot(game), 0);
  prediction.accept(command(1), 0);
  prediction.advance(dt);
  prediction.reconcile(snapshot(game, 20, 1, 1), dt); // Authority ahead: missing mapping.
  prediction.advance(2 * dt);
  expect(prediction.player.vx).toBeGreaterThan(0);
  prediction.reconcile(snapshot(game, 21, 1, null), 2 * dt);
  prediction.advance(3 * dt);
  expect(prediction.player.vx).toBe(0);
  expect(prediction.diagnostics(3 * dt).pendingInputs).toBe(0);
});
