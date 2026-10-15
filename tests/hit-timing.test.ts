import { expect, it } from "vitest";
import { Interpolation } from "../src/client/prediction";
import { BaselineInterpolation } from "./fixtures/interpolation-v3";
import { Simulation } from "../src/shared/simulation";
import { createClassicPlayer } from "../src/shared/classic/player";
import {
  CHARACTER_IDS,
  type CharacterId,
} from "../src/shared/classic/characters";
import { emptyIntent } from "../src/shared/state";
import type { Side } from "../src/shared/types";
import type { Snapshot } from "../src/shared/protocol";
const dt = 1000 / 60,
  warmup = 180;
function flight(role: CharacterId, side: Side, low = false): Simulation {
  const game = new Simulation({ cosmetics: false });
  game.players.left = createClassicPlayer("left", role);
  game.players.right = createClassicPlayer("right", role);
  game.players.left.x = 140;
  game.players.right.x = 500;
  const x = low ? 400 : 380,
    vx = low ? 100 : role === "toaster" ? 600 : 900;
  game.shuttle = {
    x: side === "right" ? x : 640 - x,
    y: low ? 350 : role === "toaster" ? 275 : 250,
    vx: side === "right" ? vx : -vx,
    vy: low ? 100 : role === "toaster" ? 100 : 400,
    speed: Math.hypot(vx, low || role === "toaster" ? 100 : 400),
    state: "flying",
    lastTouchedBy: side === "right" ? "left" : "right",
    dir: 0,
    rotation: 0,
    predictedLandingX: 0,
  };
  return game;
}
function snap(game: Simulation, tick: number): Snapshot {
  const state = game.snapshot();
  state.elapsed = tick / 60;
  return {
    type: "snapshot",
    room: "cue",
    tick,
    ack: 0,
    ackTick: null,
    status: "playing",
    reconnectRemainingMs: 0,
    state,
    effects: game.presentation(),
  };
}
/** Ordered two-tick downlink and two-tick uplink. The first displayed incoming
 * flying shuttle is the same visible cue; input is sampled on the next60Hz
 * boundary after one fixed reaction tick, never selected from an authority-perfect contact oracle. Stable
 * pre-roll establishes each presentation clock before injecting the selected
 * source-valued rally fixture. No renderer/public latency claim is made. */
function trial(
  role: CharacterId,
  side: Side,
  baseline: boolean,
  phase: number,
  cueLead = 0,
  low = false,
) {
  const buffer = baseline ? new BaselineInterpolation() : new Interpolation();
  const trace = flight(role, side, low),
    game = flight(role, side, low);
  const ready = new Simulation({ cosmetics: false });
  ready.players.left = createClassicPlayer("left", role);
  ready.players.right = createClassicPlayer("right", role);
  const packets: { at: number; value: Snapshot }[] = [];
  for (let tick = 0; tick <= warmup + 45; tick++) {
    if (tick % 2 === phase)
      packets.push({
        at: tick + 2,
        value: snap(tick < warmup ? ready : trace, tick),
      });
    if (tick >= warmup) {
      trace.setIntents(emptyIntent(), emptyIntent());
      trace.update(1 / 60);
    }
  }
  let delivered = 0,
    cue: number | undefined,
    enqueued: number | undefined,
    consumed: number | undefined,
    displayTick = 0;
  for (let tick = 0; tick < warmup + 45; tick++) {
    while (delivered < packets.length && packets[delivered].at <= tick) {
      const packet = packets[delivered++];
      buffer.push(packet.value, packet.at * dt);
    }
    const shown = buffer.sample(tick * dt);
    if (shown && cue === undefined && shown.shuttle.state === "flying") {
      cue = tick;
      displayTick = shown.elapsed * 60;
      // Equal lead removes reaction/sampling wait; it cannot send before the
      // visible cue or shorten the two-tick ordered uplink.
      enqueued = tick + 1 + 1 - cueLead;
      expect(enqueued).toBeGreaterThanOrEqual(cue);
      consumed = enqueued + 2;
    }
    if (tick >= warmup) {
      const input = { ...emptyIntent(), hitPressed: tick === consumed };
      game.setIntents(
        side === "left" ? input : emptyIntent(),
        side === "right" ? input : emptyIntent(),
      );
      game.update(1 / 60);
      if (game.rallyHits || !game.pointActive) break;
    }
  }
  return {
    cue,
    enqueued,
    consumed,
    displayTick,
    delay: consumed === undefined ? -1 : consumed - warmup,
    hit: game.rallyHits > 0,
    kind: game.players[side].swingKind,
    frame: game.players[side].swingFrame,
    contact: game.diagnostics().contacts.at(-1),
    score: { ...game.score },
    lastTouchedBy: game.shuttle.lastTouchedBy,
    x: game.shuttle.x,
    y: game.shuttle.y,
    vx: game.shuttle.vx,
    vy: game.shuttle.vy,
    diagnostics: buffer.diagnostics(),
  };
}
it.each(CHARACTER_IDS)(
  "visible-cue input trace shortens extra return lead for %s on both sides and snapshot phases",
  (role) => {
    for (const side of ["left", "right"] as const)
      for (const phase of [0, 1]) {
        const before = trial(role, side, true, phase),
          after = trial(role, side, false, phase);
        expect(after.delay).toBeLessThan(before.delay);
        // Search an identical visible-cue lead on each original timing window.
        const sweep = Array.from({ length: 3 }, (_, lead) => ({
          lead,
          before: trial(role, side, true, phase, lead),
          after: trial(role, side, false, phase, lead),
        }));
        expect(
          sweep.some((value) => !value.before.hit && value.after.hit),
          JSON.stringify({
            role,
            side,
            phase,
            sweep: sweep.map((s) => ({
              lead: s.lead,
              before: [s.before.delay, s.before.hit],
              after: [s.after.delay, s.after.hit],
            })),
          }),
        ).toBe(true);
        const restored = sweep.find(
          (value) => !value.before.hit && value.after.hit,
        )!;
        expect(restored.after.kind).toBe("overhead");
        expect(restored.after.consumed! - restored.after.enqueued!).toBe(2);
        expect(restored.after.score).toEqual({ left: 0, right: 0 });
        expect(restored.after.lastTouchedBy).toBe(side);
        // Pin the unchanged source-law witnesses, including power differences,
        // contact position/frame and the following gravity/drag/flight step.
        const toaster = role === "toaster";
        const power = {
          joe: 1,
          nadia: 0.96,
          harry: 1.05,
          toaster: 0.96,
          pirate: 1.1,
          "top-hat": 1,
          red: 1,
        }[role];
        const rightX = toaster
          ? phase === 0
            ? 460.44016736203974
            : 466.82256066755815
          : 480.2997515658199;
        const y = toaster
          ? phase === 0
            ? 304.05456067070816
            : 308.0123782438798
          : 305.0844665274828;
        const direction = side === "left" ? 1 : -1;
        const x = side === "right" ? rightX : 640 - rightX;
        const vx =
          (toaster ? 1459.472504397653 : 1246.3867579729438 * power) *
          direction;
        const vy = toaster ? -395.07468775820433 : -962.8837154868155 * power;
        const contact = restored.after.contact!;
        expect(contact).toMatchObject({
          side,
          kind: "overhead",
          previousTouch: side === "left" ? "right" : "left",
          frame: toaster ? 5 : 3,
        });
        expect(contact.at).toBeCloseTo((toaster ? 11 + phase : 9) / 60, 10);
        for (const [actual, expected] of [
          [contact.x, x],
          [contact.y, y],
          [contact.vx, vx],
          [contact.vy, vy],
          [restored.after.x, x + (vx * 0.96) / 60],
          [restored.after.y, y + ((vy + 20) * 0.96) / 60],
          [restored.after.vx, vx * 0.96],
          [restored.after.vy, (vy + 20) * 0.96],
        ])
          expect(actual).toBeCloseTo(expected, 8);
        expect(restored.after.diagnostics.delayMs).toBeCloseTo(1000 / 30);
        expect(after.diagnostics.rewinds).toBe(0);
      }
  },
);
it("preserves source-specific timing counterexamples and out-of-reach misses", () => {
  // Raw source witnesses complement, rather than stand in for, actual cue A/B.
  const contact = (role: CharacterId, delay: number, unreachable = false) => {
    const game = flight(role, "right", true);
    if (unreachable) game.players.right.x = 610;
    for (
      let tick = 0;
      tick < 45 && game.pointActive && !game.rallyHits;
      tick++
    ) {
      game.setIntents(emptyIntent(), {
        ...emptyIntent(),
        hitPressed: tick === delay,
      });
      game.update(1 / 60);
    }
    return game;
  };
  expect(contact("joe", 2).rallyHits).toBe(1);
  expect(contact("joe", 4).rallyHits).toBe(0);
  expect(contact("toaster", 2).rallyHits).toBe(0);
  expect(contact("toaster", 4).rallyHits).toBe(1);
  expect(contact("joe", 2, true).rallyHits).toBe(0);
  expect(contact("toaster", 4, true).rallyHits).toBe(0);
});
