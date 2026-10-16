import { describe, expect, it } from "vitest";
import {
  Effects,
  createParticle,
  stepParticle,
  MAX_PARTICLES,
  confettiColor,
} from "../src/client/effects";
import { ClassicSimulation } from "../src/shared/classic/simulation";
import { emptyClassicIntent } from "../src/shared/classic/types";
import { seededRandom } from "../src/shared/classic/presentation";
import type { ClassicPresentationEvent } from "../src/shared/classic/presentation";
import type { Snapshot } from "../src/shared/protocol";
const dt = 1 / 60;
function snapshot(
  tick: number,
  events: ClassicPresentationEvent[] = [],
  patch: Partial<Snapshot> = {},
): Snapshot {
  const game = new ClassicSimulation({
    characters: { left: "toaster", right: "joe" },
  });
  game.elapsed = tick / 60;
  return {
    type: "snapshot",
    room: "r",
    tick,
    ack: 0,
    ackTick: null,
    status: "playing",
    reconnectRemainingMs: 0,
    state: game.snapshot(),
    effects: { cursor: events.at(-1)?.id ?? 0, events },
    ...patch,
  };
}
describe("source-triggered authority presentation", () => {
  it("missed accepted swing produces whoosh, real shots produce one spark/sound and no fabricated impact", () => {
    const game = new ClassicSimulation();
    game.players.left.serving = false;
    Object.assign(game.shuttle, {
      x: 600,
      y: 0,
      vx: 0,
      vy: 0,
      state: "flying",
    });
    game.setIntents(
      { ...emptyClassicIntent(), hitPressed: true },
      emptyClassicIntent(),
    );
    game.update(dt);
    expect(game.presentation().events).toEqual([
      { kind: "swing", side: "left", sound: "whoosh", id: 1, tick: 1 },
    ]);
    const serve = new ClassicSimulation({ characters: { left: "toaster" } });
    serve.setIntents(
      { ...emptyClassicIntent(), hitPressed: true },
      emptyClassicIntent(),
    );
    for (let f = 0; f < 6; f++) {
      serve.update(dt);
      serve.setIntents(emptyClassicIntent(), emptyClassicIntent());
    }
    const shots = serve.presentation().events.filter((e) => e.kind === "shot");
    expect(shots).toHaveLength(1);
    expect(shots[0]).toMatchObject({
      x: 172,
      y: serve.players.left.y - 86.55,
      dir: 40,
      sound: "toasterpop",
    });
    expect(
      serve
        .presentation()
        .events.some((e) => "sound" in e && e.sound === "birdiehit"),
    ).toBe(false);
    const wall = new ClassicSimulation();
    Object.assign(wall.shuttle, {
      x: 606,
      y: 200,
      vx: 1600,
      vy: 0,
      state: "flying",
    });
    wall.update(dt);
    expect(wall.diagnostics().ballEvents).toEqual(["wall"]);
    const trail = wall.presentation().events.filter((e) => e.kind === "tail");
    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({ x: 631.6, y: 200, tick: 1 }); // before wall clamps to607
    expect(wall.shuttle.x).toBe(607);
    expect(wall.presentation().events.some((e) => e.kind === "shot")).toBe(
      false,
    );
  });
  it("awards one ding per point and only one final cheer, retains bounded deep-copied journals", () => {
    const game = new ClassicSimulation({
      characters: { left: "toaster", right: "toaster" },
      cosmeticSeed: 1,
    });
    const seen = new Map<number, ClassicPresentationEvent>();
    for (let f = 0; f < 7; f++) {
      Object.assign(game.shuttle, {
        x: 100,
        y: 399,
        vx: 0,
        vy: 100,
        state: "flying",
      });
      game.update(dt);
      for (const e of game.presentation().events) seen.set(e.id, e);
      for (let t = 0; t < 90; t++) {
        game.update(dt);
        for (const e of game.presentation().events) seen.set(e.id, e);
        expect(game.presentation().events.length).toBeLessThanOrEqual(128);
        expect(JSON.stringify(game.presentation()).length).toBeLessThan(32768);
      }
    }
    expect([...seen.values()].filter((e) => e.kind === "point")).toHaveLength(
      7,
    );
    expect([...seen.values()].filter((e) => e.kind === "victory")).toHaveLength(
      1,
    );
    const frozen = game.snapshot(),
      cursor = game.presentation().cursor;
    game.update(100);
    expect(game.snapshot()).toEqual(frozen);
    expect(game.presentation().cursor).toBe(cursor);
    const copy = game.presentation();
    copy.events[0].tick = -123;
    expect(game.presentation().events[0].tick).not.toBe(-123);
  });
});
describe("client event deduplication, ages and independent fixed cosmetic clocks", () => {
  it("owns stale-sound suppression only while its bounded pending events remain retained", () => {
    const fx = new Effects();
    fx.reset("r");
    let id = 0;
    // Source-like bounded bursts: two tails + one smoke + one swing per tick,
    // delivered8ticks late while presentation is temporarily starved.
    for (let tick = 10; tick < 190; tick += 2) {
      const events: ClassicPresentationEvent[] = [
        { id: ++id, tick, kind: "tail", x: 200, y: 100, seed: id },
        { id: ++id, tick, kind: "tail", x: 200, y: 100, seed: id },
        { id: ++id, tick, kind: "smoke", x: 100, y: 340, seed: id },
        { id: ++id, tick, kind: "swing", side: "left", sound: "whoosh" },
      ];
      fx.ingest(snapshot(tick + 8, events));
      const d = fx.diagnostics();
      expect(d.pending).toBeLessThanOrEqual(128);
      expect(d.suppressedSounds).toBeLessThanOrEqual(d.pending);
    }
    expect(fx.diagnostics().pending).toBe(128);
    expect(fx.diagnostics().suppressedSounds).toBeGreaterThan(0);
    const sounds: string[] = [];
    fx.advance(200, dt, (s) => sounds.push(s));
    expect(sounds).toEqual([]);
    expect(fx.diagnostics().pending).toBe(0);
    expect(fx.diagnostics().suppressedSounds).toBe(0);
    expect(fx.particles.length).toBeLessThanOrEqual(MAX_PARTICLES);
    fx.ingest(
      snapshot(210, [
        { id: ++id, tick: 202, kind: "swing", side: "left", sound: "whoosh" },
      ]),
    );
    expect(fx.diagnostics().suppressedSounds).toBe(1);
    fx.suspend();
    expect(fx.diagnostics().suppressedSounds).toBe(0);
    fx.reset("other-room");
    expect(fx.diagnostics().pending).toBe(0);
    expect(fx.diagnostics().suppressedSounds).toBe(0);
  });

  it.each([60, 180])(
    "a %i-tick presentation jump never replays expired queued sounds but keeps recent source events",
    (target) => {
      const fx = new Effects();
      fx.reset("r");
      fx.ingest(snapshot(0));
      fx.advance(0, dt, () => {});
      const sounds: string[] = [];
      for (const [index, tick] of [2, target - 6, target].entries())
        fx.ingest(
          snapshot(tick, [
            {
              id: index + 1,
              tick,
              kind: "swing",
              side: "left",
              sound: "whoosh",
            },
          ]),
        );
      fx.advance(target, dt, (s) => sounds.push(s));
      // Existing >120tick recovery suppresses the entire catch-up batch. A
      // shorter jump retains only the normal inclusive6tick source window.
      expect(sounds).toEqual(target > 120 ? [] : ["whoosh", "whoosh"]);
      fx.advance(target, dt, (s) => sounds.push(s));
      expect(sounds).toHaveLength(target > 120 ? 0 : 2);
      fx.ingest(
        snapshot(target + 1, [
          {
            id: 4,
            tick: target + 1,
            kind: "swing",
            side: "left",
            sound: "whoosh",
          },
        ]),
      );
      fx.advance(target + 1, dt, (s) => sounds.push(s));
      expect(sounds.at(-1)).toBe("whoosh");
      expect(sounds).toHaveLength(target > 120 ? 1 : 3);
    },
  );

  it("continuous presentation consumes each source sound once without lowering emission density", () => {
    const fx = new Effects();
    fx.reset("r");
    const sounds: string[] = [];
    for (let tick = 1; tick <= 90; tick++) {
      const s = snapshot(tick, [
        {
          id: tick,
          tick,
          kind: "swing",
          side: "left",
          sound: "whoosh",
        },
      ]);
      fx.ingest(s);
      fx.ingest(s);
      fx.advance(tick, dt, (s) => sounds.push(s));
      fx.advance(tick, dt, (s) => sounds.push(s));
    }
    expect(sounds).toEqual(Array<string>(90).fill("whoosh"));
    expect(fx.diagnostics().pending).toBe(0);
  });

  it("consumes a shot once at its authority time, removes at frame22, pairs tails and skips expired sounds", () => {
    const fx = new Effects();
    fx.reset("r");
    const sounds: string[] = [];
    const event = {
      id: 1,
      tick: 10,
      kind: "shot",
      x: 180,
      y: 377.75,
      dir: 40,
      side: "left",
      sound: "birdiehit",
    } as const;
    const s = snapshot(10, [event]);
    fx.ingest(s);
    fx.advance(10, dt, (s) => sounds.push(s));
    fx.ingest(s);
    fx.advance(10, dt, (s) => sounds.push(s));
    expect(sounds).toEqual(["birdiehit"]);
    expect(fx.sparks).toEqual([
      { x: 180, y: 377.75, dir: 40, frame: 1, tick: 10, order: 1 },
    ]);
    fx.advance(30, dt, (s) => sounds.push(s));
    expect(fx.sparks[0].frame).toBe(21);
    fx.advance(31, dt, (s) => sounds.push(s));
    expect(fx.sparks).toHaveLength(0);
    fx.ingest(
      snapshot(32, [
        event,
        { id: 2, tick: 32, kind: "tail", x: 200, y: 100, seed: 1 },
      ]),
    );
    fx.advance(32, dt, (s) => sounds.push(s));
    expect(fx.particles).toHaveLength(2);
    const late = new Effects();
    late.reset("r");
    late.ingest(snapshot(40, [event]));
    late.advance(40, dt, (s) => sounds.push(s));
    expect(late.sparks).toHaveLength(0);
    expect(sounds).toHaveLength(1);
  });
  it("skips history across reconnect/journal gap/new room and prevents delayed room pollution", () => {
    const shot = {
      id: 1,
      tick: 10,
      kind: "shot",
      x: 20,
      y: 30,
      dir: 40,
      side: "left",
      sound: "birdiehit",
    } as const;
    const fx = new Effects();
    const sounds: string[] = [];
    fx.reset("r", true);
    fx.ingest(snapshot(10, [shot]));
    fx.advance(10, dt, (s) => sounds.push(s));
    expect(fx.sparks).toHaveLength(0);
    fx.ingest(snapshot(10, [shot], { status: "reconnecting" }));
    fx.advance(100, 1, (s) => sounds.push(s));
    expect(fx.diagnostics().paused).toBe(true);
    fx.ingest(snapshot(10, [shot]));
    fx.advance(10, dt, (s) => sounds.push(s));
    expect(sounds).toHaveLength(0);
    fx.ingest(snapshot(40, [{ ...shot, id: 10, tick: 40 }]));
    fx.advance(40, dt, (s) => sounds.push(s));
    expect(sounds).toHaveLength(0);
    expect(fx.sparks).toHaveLength(0);
    fx.reset("new");
    fx.ingest(snapshot(40, [shot]));
    expect(fx.diagnostics().cursor).toBe(0);
    fx.reset("r");
    fx.ingest(snapshot(10, [shot]));
    fx.advance(10, dt, (s) => sounds.push(s));
    expect(sounds).toEqual(["birdiehit"]);
  });
  it("keeps source pair/smoke distributions, 30*dt motion and shrink/removal at60Hz", () => {
    const tail = createParticle("tail", 0, 0, () => 0.5);
    expect(tail.dy).toBe(2);
    expect(tail.spin).toBe(30);
    expect(tail.scaleVar).toBeCloseTo(0.9, 12);
    expect(tail.rotation).toBe(180);
    expect(stepParticle(tail)).toBe(true);
    expect(tail.y).toBe(1);
    expect(tail.rotation).toBe(195);
    expect(tail.scale).toBeCloseTo(Math.sqrt(0.9), 12);
    const smog = createParticle("smoke", 0, 0, () => 0.5);
    expect(smog.dy).toBe(3);
    stepParticle(smog);
    expect(smog.y).toBe(1.5);
    expect(smog.scale).toBeCloseTo(Math.sqrt(0.9), 12);
    for (let f = 0; f < 42; f++) {
      expect(stepParticle(tail)).toBe(true);
      expect(stepParticle(smog)).toBe(true);
    }
    expect(stepParticle(tail)).toBe(false);
    expect(stepParticle(smog)).toBe(false);
    const confetti = createParticle("confetti", 0, -10, () => 0.5);
    expect(confetti.spin).toBe(0);
    expect(confetti.dx).toBe(2.5);
    expect(confetti.dy).toBe(4.5);
    expect(confetti.color).toBe("#808080");
    for (let f = 0; f < 192; f++) expect(stepParticle(confetti)).toBe(true);
    expect(stepParticle(confetti)).toBe(false);
    expect(confettiColor(256, 0, 0)).toBe("#000000");
    expect(confettiColor(0, 256, 256)).toBe("#010100");
  });
  it("natural result continues original confetti/Toaster bob at fixed60Hz across RAF rates, while authority freezes", () => {
    function run(hz: number) {
      const fx = new Effects();
      fx.reset("r");
      const s = snapshot(60, [], { status: "finished", resultReason: "score" });
      fx.ingest(s);
      const frozen = JSON.stringify(s.state);
      const sounds: string[] = [];
      for (let frame = 0; frame < hz * 20; frame++)
        fx.advance(60, 1 / hz, (s) => sounds.push(s));
      expect(JSON.stringify(s.state)).toBe(frozen);
      expect(fx.particles.length).toBeLessThanOrEqual(MAX_PARTICLES);
      expect(sounds).toEqual([]);
      return fx;
    }
    const a = run(30),
      b = run(144);
    expect(a.diagnostics().resultAge).toBeCloseTo(b.diagnostics().resultAge, 8);
    expect(a.particles.map((p) => ({ ...p, random: undefined }))).toEqual(
      b.particles.map((p) => ({ ...p, random: undefined })),
    );
    expect(a.finishAlpha).toBe(1);
    expect(a.introAlpha).toBe(0);
    // No invented three-second celebration timeout, and fresh result RNG stays deterministic.
    expect(a.particles.some((p) => p.kind === "confetti")).toBe(true);
    expect(a.frozenPlayers!.left.y).toBeCloseTo(b.frozenPlayers!.left.y, 9);
    const abnormal = new Effects();
    abnormal.reset("r");
    abnormal.ingest(
      snapshot(60, [], { status: "finished", resultReason: "leave" }),
    );
    for (let f = 0; f < 300; f++) abnormal.advance(60, dt, () => {});
    expect(abnormal.celebrating).toBe(false);
    expect(abnormal.particles).toHaveLength(0);
  });
  it("uses original2s intro then3*dt fade, does not hold up authoritative gameplay", () => {
    const fx = new Effects();
    fx.reset("r");
    fx.ingest(snapshot(0));
    fx.advance(120, dt, () => {});
    expect(fx.introAlpha).toBe(1);
    fx.advance(130, dt, () => {});
    expect(fx.introAlpha).toBeCloseTo(0.5, 9);
    fx.advance(140, dt, () => {});
    expect(fx.introAlpha).toBe(0);
    const rng = seededRandom(1);
    expect(rng()).toBeLessThan(0.25); // witness source smoke25% without gameplay RNG
  });
  it("finishes airborne Toaster/adult landing and outgoing clips on result copies, with bounded source smoke and no authority mutations", () => {
    const game = new ClassicSimulation({
      characters: { left: "toaster", right: "pirate" },
    });
    game.players.left.serving = false;
    const action = {
      ...emptyClassicIntent(),
      jumpPressed: true,
      hitPressed: true,
    };
    game.setIntents(action, action);
    game.update(dt);
    expect(game.players.left.grounded).toBe(false);
    expect(game.players.right.grounded).toBe(false);
    expect(game.players.left.swingFrame).toBeGreaterThan(1);
    expect(game.players.right.swingFrame).toBeGreaterThan(1);
    game.score.left = 7;
    game.winner = "left";
    game.phase = "matchEnd";
    game.pointActive = false;
    const state = game.snapshot(),
      frozen = JSON.stringify(state);
    const authority = JSON.stringify(game.presentation());
    const fx = new Effects();
    fx.reset("r");
    fx.ingest({
      ...snapshot(game.tick, [], { status: "finished", resultReason: "score" }),
      state,
    });
    const sounds: string[] = [];
    for (let frame = 0; frame < 120; frame++)
      fx.advance(game.tick, dt, (s) => sounds.push(s));
    const players = fx.frozenPlayers!;
    expect(players.left.grounded).toBe(true);
    expect(players.right.grounded).toBe(true);
    expect(players.left.y).toBeGreaterThanOrEqual(396);
    expect(players.left.y).toBeLessThanOrEqual(404);
    expect(players.left.bob).not.toBe(0);
    expect(players.right.y).toBe(400);
    for (const player of Object.values(players)) {
      expect(player.vy).toBe(0);
      expect(player.swingFrame).toBe(1);
      expect(player.swinging).toBe(false);
      expect(player.contactEnabled).toBe(false);
    }
    expect(fx.particles.some((p) => p.kind === "smoke")).toBe(true);
    const bobPositions = new Set<number>();
    for (let frame = 0; frame < 1200; frame++) {
      fx.advance(game.tick, dt, (s) => sounds.push(s));
      bobPositions.add(players.left.y);
      expect(fx.particles.length).toBeLessThanOrEqual(MAX_PARTICLES);
    }
    expect(bobPositions.size).toBeGreaterThan(20);
    expect(sounds).toEqual([]);
    expect(JSON.stringify(state)).toBe(frozen);
    expect(JSON.stringify(game.snapshot())).toBe(frozen);
    expect(JSON.stringify(game.presentation())).toBe(authority);
  });
});
