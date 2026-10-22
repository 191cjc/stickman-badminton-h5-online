import { describe, expect, it } from "vitest";
import { ClassicSimulation } from "../../src/shared/classic/simulation";
import { CHARACTER_IDS } from "../../src/shared/classic/characters";
import { classicGeometry, racketPose } from "../../src/shared/classic/assets";
import {
  cloneClassicPlayer,
  createClassicPlayer,
  setupClassicServe,
  startClassicSwing,
  stepClassicPlayer,
} from "../../src/shared/classic/player";
import {
  launchClassicBirdie,
  predictClassicLanding,
  stepClassicBirdie,
} from "../../src/shared/classic/birdie";
import {
  emptyClassicIntent,
  type ClassicShuttleState,
} from "../../src/shared/classic/types";
import {
  SHUTTLE_SPEEDS,
  type ShuttleSpeed,
} from "../../src/shared/match-settings";
import type { PlayerIntent } from "../../src/shared/types";
const dt = 1 / 60;
function step(
  game: ClassicSimulation,
  left = emptyClassicIntent(),
  right = emptyClassicIntent(),
) {
  game.setIntents(left, right);
  game.update(dt);
}
function freeBall(
  patch: Partial<ClassicShuttleState> = {},
): ClassicShuttleState {
  return {
    x: 200,
    y: 200,
    vx: 100,
    vy: -100,
    speed: 141,
    dir: 45,
    rotation: 45,
    state: "flying",
    lastTouchedBy: null,
    predictedLandingX: 0,
    ...patch,
  };
}
function noServe(game: ClassicSimulation) {
  game.players.left.serving = game.players.right.serving = false;
}

describe("room shuttle clock", () => {
  it("validates configuration and keeps default/explicit 1x seeded gameplay identical", () => {
    for (const shuttleSpeed of [null, 0, "2", 1.1, Number.NaN, Infinity])
      expect(
        () =>
          new ClassicSimulation({ shuttleSpeed: shuttleSpeed as ShuttleSpeed }),
      ).toThrow();
    const a = new ClassicSimulation(),
      b = new ClassicSimulation({ shuttleSpeed: 1 });
    for (let tick = 0; tick < 450; tick++) {
      const intent = {
        ...emptyClassicIntent(),
        hitPressed: tick % 100 === 0,
        move: tick % 80 < 40 ? 1 : -1,
        jumpPressed: tick % 53 === 0,
      };
      step(a, intent);
      step(b, intent);
      expect(a.snapshot()).toEqual(b.snapshot());
      expect(a.presentation()).toEqual(b.presentation());
    }
    const detached = a.snapshot();
    detached.shuttle.x = -999;
    detached.players.left.swingClips.serve.clock = -1;
    expect(a.snapshot().shuttle.x).not.toBe(-999);
    expect(a.snapshot().players.left.swingClips.serve.clock).not.toBe(-1);
    expect(JSON.parse(JSON.stringify(a.snapshot()))).toEqual(a.snapshot());
    expect(detached.version).toBe("flash-90302-v3");
  });
  for (const character of CHARACTER_IDS)
    for (const side of ["left", "right"] as const)
      it(`${character}/${side} releases at the same real tick and flies progressively faster`, () => {
        const flights: number[] = [],
          releases: number[] = [],
          launches: ClassicShuttleState[] = [];
        for (const shuttleSpeed of SHUTTLE_SPEEDS) {
          const game = new ClassicSimulation({
            characters: { left: character, right: character },
            shuttleSpeed,
          });
          if (side === "right") {
            noServe(game);
            game.server = side;
            setupClassicServe(game.players.right);
          }
          const hit = {
            ...emptyClassicIntent(),
            hitPressed: true,
            swing: "underhand" as const,
          };
          step(
            game,
            side === "left" ? hit : emptyClassicIntent(),
            side === "right" ? hit : emptyClassicIntent(),
          );
          let release = 1;
          while (game.shuttle.state === "attached" && release < 15) {
            step(game);
            release++;
          }
          expect(game.players[side].swingKind).toBe("serve");
          releases.push(release);
          launches.push({ ...game.shuttle });
          let flight = 0;
          while (game.pointActive && flight < 150) {
            step(game);
            flight++;
          }
          expect(game.pointActive).toBe(false);
          expect(game.score.left + game.score.right).toBe(1);
          expect(game.diagnostics().contacts).toHaveLength(1);
          flights.push(flight);
          for (let tick = 0; tick < 89; tick++) step(game);
          expect(game.phase).toBe("point");
          step(game);
          expect(game.phase).toBe("playing");
          expect(game.shuttle.state).toBe("attached");
        }
        expect(new Set(releases).size).toBe(1);
        expect(
          launches.every(
            (ball) =>
              JSON.stringify({ ...ball, predictedLandingX: 0 }) ===
              JSON.stringify({ ...launches[0], predictedLandingX: 0 }),
          ),
        ).toBe(true);
        expect(flights[0]).toBeGreaterThan(flights[1]);
        expect(flights[1]).toBeGreaterThan(flights[2]);
        expect(flights[2]).toBeGreaterThan(flights[3]);
      });
  it("keeps actor movement/jump/clip and real clocks identical at every tier", () => {
    for (const character of CHARACTER_IDS) {
      const games = SHUTTLE_SPEEDS.map(
        (shuttleSpeed) =>
          new ClassicSimulation({
            characters: { left: character, right: character },
            shuttleSpeed,
          }),
      );
      for (const game of games) {
        noServe(game);
        game.shuttle = freeBall({ x: 500, y: -450, vx: 0, vy: 0 });
      }
      for (let tick = 0; tick < 100; tick++) {
        const intent = {
          ...emptyClassicIntent(),
          move: tick < 40 ? -1 : 1,
          jumpPressed: tick === 1,
          hitPressed: tick === 5,
          swing: "underhand" as const,
        };
        for (const game of games) step(game, intent);
        for (const game of games.slice(1)) {
          expect(game.snapshot().players).toEqual(games[0].snapshot().players);
          expect(game.elapsed).toBe(games[0].elapsed);
          expect(game.tick).toBe(games[0].tick);
        }
      }
    }
  });
  it("2x follows every second native free-flight endpoint; fractional preview matches its integrator", () => {
    for (const speed of SHUTTLE_SPEEDS) {
      const ball = freeBall({ x: 178.45, y: 377.75 });
      const h = speed === 1 ? dt : (dt * speed) / 2;
      launchClassicBirdie(ball, 1485, 40, h);
      const preview = predictClassicLanding(ball, h);
      while (ball.state === "flying") stepClassicBirdie(ball, h, () => 0.25);
      expect(ball.x).toBeCloseTo(preview, 9);
    }
    const game = new ClassicSimulation({ shuttleSpeed: 2, cosmetics: false });
    noServe(game);
    const native = freeBall({ x: 150, y: 200, vx: 300, vy: -500 });
    game.shuttle = { ...native };
    for (let tick = 0; tick < 18; tick++) {
      stepClassicBirdie(native, dt, () => 0.25);
      stepClassicBirdie(native, dt, () => 0.25);
      step(game);
      expect(game.shuttle).toEqual(native);
    }
  });
  it.each(SHUTTLE_SPEEDS)(
    "%sx preserves ground/score, pause, net and bounded cosmetic isolation",
    (shuttleSpeed) => {
      const games = [
        new ClassicSimulation({ shuttleSpeed, cosmeticSeed: 1 }),
        new ClassicSimulation({ shuttleSpeed, cosmeticSeed: 7 }),
        new ClassicSimulation({ shuttleSpeed, cosmetics: false }),
      ];
      for (const game of games) {
        noServe(game);
        game.shuttle = freeBall({ x: 319, y: 280, vx: 0, vy: 200 });
      }
      for (let tick = 0; tick < 200; tick++) {
        for (const game of games) step(game);
        expect(games[0].snapshot()).toEqual(games[1].snapshot());
        expect(games[0].snapshot()).toEqual(games[2].snapshot());
        expect(
          games[0]
            .presentation()
            .events.filter(
              (event) => event.tick === games[0].tick && event.kind === "tail",
            ).length,
        ).toBeLessThanOrEqual(1);
        expect(games[0].presentation().events.length).toBeLessThanOrEqual(128);
      }
      const game = games[0];
      game.phase = "paused";
      const paused = game.snapshot();
      game.update(0.25);
      expect(game.snapshot()).toEqual(paused);
      game.phase = "playing";
      for (let point = game.score.left; point < 7; point++) {
        game.pointActive = true;
        game.phase = "playing";
        game.shuttle = freeBall({ x: 550, y: 399, vy: 200 });
        step(game);
      }
      expect(game.winner).toBe("left");
      expect(game.score.left).toBe(7);
      const ended = game.snapshot();
      game.update(dt);
      expect(game.snapshot()).toEqual(ended);
    },
  );
  for (const character of ["joe", "toaster"] as const)
    for (const side of ["left", "right"] as const)
      it(`${character}/${side} contacts a midpoint using the moved/jumping pre-bob source origin exactly once`, () => {
        for (const moving of [false, true])
          for (const shuttleSpeed of SHUTTLE_SPEEDS) {
            const game = new ClassicSimulation({
              characters: { [side]: character },
              shuttleSpeed,
              cosmetics: false,
            });
            noServe(game);
            const p = game.players[side];
            p.swingKind = "overhead";
            p.swinging = true;
            p.contactEnabled = true;
            p.swingFrame = p.swingClips.overhead.frame = 6;
            p.swingClips.overhead.clock = 6 / 60;
            p.swingClips.overhead.playing = true;
            const intent = {
              ...emptyClassicIntent(),
              move: moving ? 1 : 0,
              jumpPressed: moving,
            };
            const clone = cloneClassicPlayer(p);
            const origin = stepClassicPlayer(clone, intent, dt, {
              advanceAnimation: false,
            }).contactOrigin!;
            const box = racketPose("overhead", 6, character).hitbox;
            const direction = side === "left" ? 1 : -1;
            const edgeX = origin.x + box.x * 1.25 * direction;
            const y = origin.y + box.y * 1.25 + 0.01; // Final Toaster bob would incorrectly miss this witness.
            game.shuttle = freeBall({
              x: edgeX - direction * 2,
              y,
              vx: direction * 600,
              vy: 0,
              lastTouchedBy: side,
            });
            step(
              game,
              side === "left" ? intent : emptyClassicIntent(),
              side === "right" ? intent : emptyClassicIntent(),
            );
            expect(game.rallyHits).toBe(shuttleSpeed === 1 ? 0 : 1);
            if (shuttleSpeed > 1) {
              expect(game.players[side].contactEnabled).toBe(false);
              expect(game.diagnostics().contacts).toHaveLength(1);
              expect(game.diagnostics().contacts[0].previousTouch).toBe(side); // Source allows repeated same-side hits.
              step(game);
              expect(game.rallyHits).toBe(1);
            }
          }
      });
  it("awards a first-substep landing before a midpoint racket can return the bounce", () => {
    const game = new ClassicSimulation({ shuttleSpeed: 2 });
    noServe(game);
    const p = game.players.left;
    p.swingKind = "underhand";
    p.swingFrame = p.swingClips.underhand.frame = 6;
    p.swinging = p.contactEnabled = true;
    const rect = racketPose("underhand", 6).hitbox;
    // Place a source racket at the resolved ground endpoint, outside pre-flight contact.
    p.y = 400 - rect.y * 1.25;
    p.grounded = true;
    game.shuttle = freeBall({
      x: p.x + (rect.x + rect.width / 2) * 1.25,
      y: 399,
      vy: 200,
    });
    // y=399 starts just outside the active racket; its resolved y=400 bounce enters it.
    step(game);
    expect(game.score.right).toBe(1);
    expect(game.rallyHits).toBe(0);
    expect(game.pointActive).toBe(false);
    for (let tick = 0; tick < 20; tick++) step(game);
    expect(game.score.right).toBe(1);
  });
});

describe("manual source clip selection", () => {
  for (const character of CHARACTER_IDS)
    for (const side of ["left", "right"] as const)
      it(`${character}/${side} forces original clips with unchanged serve/recovery/contact gates`, () => {
        for (const choice of ["overhead", "underhand"] as const) {
          const game = new ClassicSimulation({
            characters: { [side]: character },
          });
          noServe(game);
          const player = game.players[side];
          const intent = {
            ...emptyClassicIntent(),
            hitPressed: true,
            swing: choice,
          };
          // No ball means auto overhead, so underhand must bypass source choice only.
          stepClassicPlayer(player, intent, dt);
          expect(player.swingKind).toBe(choice);
          const before = cloneClassicPlayer(player);
          expect(
            startClassicSwing(
              player,
              {},
              choice === "overhead" ? "underhand" : "overhead",
            ),
          ).toBe(false);
          expect(player).toEqual(before);
          player.contactEnabled = false;
          expect(startClassicSwing(player, {}, choice)).toBe(false);
          setupClassicServe(player);
          expect(startClassicSwing(player, {}, choice)).toBe(true);
          expect(player.swingKind).toBe("serve");
          const idle = cloneClassicPlayer(before);
          idle.swinging = false;
          idle.swingFrame = 1;
          expect(startClassicSwing(idle, { pointActive: false }, choice)).toBe(
            false,
          );
        }
      });
  it("buffers swing and hitJump from the same latest edge across sub-frame calls and clears them after consumption", () => {
    for (const replace of [false, true]) {
      const game = new ClassicSimulation();
      noServe(game);
      game.shuttle = freeBall({ x: 500, y: -400, vx: 0, vy: 0 });
      game.players.left.jumpReady = true;
      const forced: PlayerIntent = {
        ...emptyClassicIntent(),
        hitPressed: true,
        swing: "underhand",
        hitJump: true,
      };
      game.setIntents(forced, emptyClassicIntent());
      game.update(dt / 2);
      if (replace)
        game.setIntents(
          { ...forced, swing: "overhead", hitJump: false },
          emptyClassicIntent(),
        );
      game.setIntents(emptyClassicIntent(), emptyClassicIntent());
      game.update(dt / 2);
      expect(game.players.left.swingKind).toBe(
        replace ? "overhead" : "underhand",
      );
      expect(game.players.left.grounded).toBe(replace);
      const buffered = (game as unknown as { intents: { left: PlayerIntent } })
        .intents.left;
      expect(buffered.swing).toBe("auto");
      expect(buffered.hitJump).toBeUndefined();
      expect(buffered.hitPressed).toBe(false);
    }
  });
  it("held-only requests use auto and forced clips still miss an out-of-range ball", () => {
    const game = new ClassicSimulation();
    noServe(game);
    game.shuttle = freeBall({ x: 500, y: -400, vx: 0, vy: 0 });
    step(game, { ...emptyClassicIntent(), hitHeld: true, swing: "underhand" });
    expect(game.players.left.swingKind).toBe("overhead");
    for (let tick = 0; tick < 30; tick++) step(game);
    expect(game.rallyHits).toBe(0);
  });
});

it("manual modes override opposite automatic ball choices in grounded, airborne and near-net contexts", () => {
  for (const side of ["left", "right"] as const)
    for (const airborne of [false, true]) {
      const player = createClassicPlayer(side);
      player.grounded = !airborne;
      player.y = airborne ? 300 : 400;
      player.vy = airborne ? 50 : 0;
      const direction = side === "left" ? 1 : -1;
      const descending = {
        shuttle: {
          x: player.x + 20 * direction,
          y: player.y - (airborne ? 5 : 25),
          vy: 100,
          lastTouchedBy: side,
        },
      };
      const autoUnder = cloneClassicPlayer(player);
      expect(startClassicSwing(autoUnder, descending)).toBe(true);
      expect(autoUnder.swingKind).toBe("underhand");
      const overhead = cloneClassicPlayer(player);
      startClassicSwing(overhead, descending, "overhead");
      expect(overhead.swingKind).toBe("overhead");
      const upward = {
        shuttle: { ...descending.shuttle, y: player.y - 150, vy: -100 },
      };
      const autoOver = cloneClassicPlayer(player);
      startClassicSwing(autoOver, upward);
      expect(autoOver.swingKind).toBe("overhead");
      const underhand = cloneClassicPlayer(player);
      startClassicSwing(underhand, upward, "underhand");
      expect(underhand.swingKind).toBe("underhand");
    }
  const near = createClassicPlayer("left");
  near.x = 267.25;
  const context = {
    shuttle: {
      x: classicGeometry.net.sideOrigin.x - 5,
      y: 375,
      vy: 100,
      lastTouchedBy: "right" as const,
    },
  };
  const auto = cloneClassicPlayer(near);
  startClassicSwing(auto, context);
  expect(auto.swingKind).toBe("overhead");
  startClassicSwing(near, context, "underhand");
  expect(near.swingKind).toBe("underhand");
});
it("high tiers retain first-substep wall/net events and the last-substep pre-collision tail position", () => {
  for (const shuttleSpeed of SHUTTLE_SPEEDS.filter((speed) => speed > 1)) {
    const game = new ClassicSimulation({ shuttleSpeed });
    noServe(game);
    game.shuttle = freeBall({ x: 600, y: 200, vx: 2400, vy: 1 });
    const expected = { ...game.shuttle };
    const h = (dt * shuttleSpeed) / 2;
    const first = stepClassicBirdie(expected, h, () => 0.25);
    let tail: { x: number; y: number } | undefined;
    const second = stepClassicBirdie(
      expected,
      h,
      () => 0.25,
      (ball) => {
        tail = { x: ball.x, y: ball.y };
      },
    );
    expect(first).toContain("wall");
    expect(second).not.toContain("wall");
    step(game);
    expect(game.shuttle).toEqual(expected);
    expect(game.diagnostics().ballEvents).toEqual([...first, ...second]);
    const events = game
      .presentation()
      .events.filter((event) => event.kind === "tail");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject(tail!);
    const net = new ClassicSimulation({ shuttleSpeed });
    noServe(net);
    const top = classicGeometry.net.top;
    net.shuttle = freeBall({
      x: top.x + top.width / 2,
      y: top.y - 1,
      vx: 0,
      vy: 100,
    });
    step(net);
    expect(net.diagnostics().ballEvents).toContain("netTop");
    expect(net.net.playing).toBe(true);
    expect(net.pointActive).toBe(true);
    expect(net.shuttle.vy).toBeLessThan(0);
    expect(Math.abs(net.shuttle.vx)).toBeGreaterThan(0);
  }
});
