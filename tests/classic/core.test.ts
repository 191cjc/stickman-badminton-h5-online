import { describe, expect, it } from "vitest";
import { classicGeometry } from "../../src/shared/classic/assets";
import {
  classicShotVelocity,
  stepClassicBirdie,
} from "../../src/shared/classic/birdie";
import {
  cloneClassicPlayer,
  createClassicPlayer,
  setupClassicServe,
  stepClassicPlayer,
} from "../../src/shared/classic/player";
import { ClassicSimulation } from "../../src/shared/classic/simulation";
import {
  emptyClassicIntent,
  type ClassicShuttleState,
} from "../../src/shared/classic/types";
import type { Side } from "../../src/shared/types";

const dt = 1 / 60;
const birdie = (
  patch: Partial<ClassicShuttleState> = {},
): ClassicShuttleState => ({
  x: 200,
  y: 200,
  vx: 100,
  vy: -100,
  speed: Math.hypot(100, 100),
  dir: 45,
  rotation: 45,
  state: "flying",
  lastTouchedBy: "left",
  predictedLandingX: 500,
  ...patch,
});

function putRightServer(game: ClassicSimulation): void {
  game.server = "right";
  game.players.left.serving = false;
  setupClassicServe(game.players.right);
}

function input(game: ClassicSimulation, side: Side, patch = {}) {
  const left = emptyClassicIntent();
  const right = emptyClassicIntent();
  Object.assign(side === "left" ? left : right, patch);
  game.setIntents(left, right);
  game.update(dt);
}

describe("Flash 90302 source-valued mechanics", () => {
  it("moves Joe directly at 225 and uses -400 jump plus 1200 gravity, without acceleration", () => {
    const joe = createClassicPlayer("left");
    stepClassicPlayer(
      joe,
      { ...emptyClassicIntent(), move: 1, jumpPressed: true },
      dt,
    );
    expect(joe.x).toBeCloseTo(153.75, 10);
    expect(joe.vx).toBe(225);
    expect(joe.vy).toBe(-380);
    expect(joe.y).toBeCloseTo(393.6666666666667, 10);
    expect(joe.grounded).toBe(false);
    expect(joe.bodyFrame).toBe("jump");
    for (let frame = 1; frame < 41; frame++)
      stepClassicPlayer(joe, emptyClassicIntent(), dt);
    expect(joe.y).toBe(400);
    expect(joe.vy).toBe(0);
    expect(joe.grounded).toBe(true);
  });

  it("clamps both sides to original walls and serve/net offsets", () => {
    const left = createClassicPlayer("left");
    const right = createClassicPlayer("right");
    left.x = -100;
    right.x = 1000;
    stepClassicPlayer(left, emptyClassicIntent(), dt);
    stepClassicPlayer(right, emptyClassicIntent(), dt);
    expect(left.x).toBe(48);
    expect(right.x).toBe(592);
    left.x = right.x = 317.25;
    setupClassicServe(left);
    setupClassicServe(right);
    expect(left.x).toBe(172.25);
    expect(right.x).toBe(462.25);
    left.serving = right.serving = false;
    left.x = right.x = 317.25;
    stepClassicPlayer(left, emptyClassicIntent(), dt);
    stepClassicPlayer(right, emptyClassicIntent(), dt);
    expect(left.x).toBe(267.25);
    expect(right.x).toBe(367.25);
  });

  it.each(["left", "right"] as const)(
    "releases %s serve at event frame7 with the source's unscaled point and ±40°/1485",
    (side) => {
      const game = new ClassicSimulation();
      if (side === "right") putRightServer(game);
      input(game, side, { hitPressed: true });
      expect(game.players[side].swingFrame).toBe(3); // § null§ custom clock starts at currentFrame/fps.
      for (let frame = 1; frame < 4; frame++) input(game, side);
      expect(game.shuttle.state).toBe("attached");
      input(game, side);
      expect(game.players[side].swingFrame).toBe(7);
      expect(game.shuttle.state).toBe("flying");
      expect(game.shuttle.x).toBeCloseTo(side === "left" ? 178.45 : 471.55, 10);
      expect(game.shuttle.y).toBe(377.75);
      expect(game.shuttle.vx).toBeCloseTo(
        side === "left" ? 954.5396003845111 : -954.5396003845111,
        10,
      );
      expect(game.shuttle.vy).toBeCloseTo(-1137.5759980316825, 10);
      expect(game.shuttle.lastTouchedBy).toBe(side);
      expect(game.rallyHits).toBe(0);
      let crossedNet = false;
      for (let tick = 0; tick < 120 && game.pointActive; tick++) {
        input(game, side);
        crossedNet ||=
          side === "left" ? game.shuttle.x > 334 : game.shuttle.x < 299;
      }
      expect(crossedNet).toBe(true);
      expect(game.score[side]).toBe(1);
    },
  );

  it("uses Flash angle conversion and gravity-before-drag at 60Hz", () => {
    expect(classicShotVelocity(1000, 90)).toEqual({ vx: 1000, vy: 0 });
    const ball = birdie();
    expect(stepClassicBirdie(ball, dt, () => 0.5)).toEqual([]);
    expect(ball.vx).toBe(96);
    expect(ball.vy).toBe(-76.8);
    expect(ball.x).toBe(201.6);
    expect(ball.y).toBe(198.72);
    const flat = birdie({ vy: 0 });
    stepClassicBirdie(flat, dt, () => 0.5);
    expect(flat.y).toBe(200); // Original only adds gravity when abs(dy)>0.
  });

  it("retains wall restitution/minimum speed, with no out-of-bounds point", () => {
    const ball = birdie({ x: 606, y: 100, vx: 210, vy: -100 });
    expect(stepClassicBirdie(ball, dt, () => 0.5)).toEqual(["wall"]);
    expect(ball.x).toBe(607);
    expect(ball.vx).toBe(-200);
    const left = birdie({ x: 34, y: 100, vx: -1000, vy: -100 });
    expect(stepClassicBirdie(left, dt, () => 0.5)).toEqual(["wall"]);
    expect(left.x).toBe(33);
    expect(left.vx).toBe(768);
  });

  it("samples the traversed path four times and stops at the original net-side collision", () => {
    const ball = birdie({ x: 299, y: 350, vx: 400, vy: 100 });
    expect(stepClassicBirdie(ball, dt, () => 0.5)).toEqual(["netSide"]);
    expect(ball.x).toBeCloseTo(299.6, 10);
    expect(ball.y).toBeCloseTo(350.48, 10);
    expect(ball.vx).toBeCloseTo(-38.4, 10);
    expect(ball.vy).toBeCloseTo(11.52, 10);
  });

  it("bounces on net top before side and uses seeded 50% ±150 when nearly vertical", () => {
    const ball = birdie({ x: 316, y: 318, vx: 0, vy: 200 });
    expect(stepClassicBirdie(ball, dt, () => 0.25)).toEqual(["netTop"]);
    expect(ball.y).toBeLessThan(319.681);
    expect(ball.vy).toBe(-100);
    expect(ball.vx).toBe(-150);
    const other = birdie({ x: 316, y: 318, vx: 0, vy: 200 });
    stepClassicBirdie(other, dt, () => 0.75);
    expect(other.vx).toBe(150);
  });

  it("scores ground once despite bounces, gives scorer serve after1.5sec and ends at7", () => {
    const game = new ClassicSimulation();
    for (let point = 0; point < 7; point++) {
      game.shuttle = birdie({ x: 100, y: 399, vx: 0, vy: 100 });
      input(game, "left");
      expect(game.score).toEqual({ left: 0, right: point + 1 });
      expect(game.server).toBe("right");
      for (let tick = 0; tick < 89; tick++) input(game, "left");
      expect(game.score.right).toBe(point + 1);
      if (point < 6) {
        expect(game.phase).toBe("point");
        input(game, "left");
        expect(game.phase).toBe("playing");
        expect(game.shuttle.state).toBe("attached");
      }
    }
    expect(game.winner).toBe("right");
    expect(game.phase).toBe("matchEnd");
    const result = game.snapshot();
    input(game, "right", { hitPressed: true, move: -1 });
    expect(game.snapshot()).toEqual(result);
  });
});

describe("original human actions and authoritative boundaries", () => {
  it("uses stage-add zero for an untouched receiver clip and frame/fps after its frame-1 stop", () => {
    const receiver = createClassicPlayer("right");
    expect(receiver.swingClips.overhead.clock).toBe(0);
    stepClassicPlayer(
      receiver,
      { ...emptyClassicIntent(), hitPressed: true },
      dt,
    );
    expect(receiver.swingFrame).toBe(2);
    for (let tick = 0; tick < 26; tick++)
      stepClassicPlayer(receiver, emptyClassicIntent(), dt);
    expect(receiver.swingFrame).toBe(1);
    expect(receiver.swingClips.overhead.clock).toBe(dt);
    expect(receiver.animationPlaying).toBe(false);
    stepClassicPlayer(
      receiver,
      { ...emptyClassicIntent(), hitPressed: true },
      dt,
    );
    expect(receiver.swingFrame).toBe(3);
  });

  it("resets every clip in setupServe and preserves hidden serve playback after switching to overhead", () => {
    const player = createClassicPlayer("left");
    setupClassicServe(player);
    for (const clip of Object.values(player.swingClips))
      expect(clip).toEqual({ frame: 1, clock: dt, playing: false });
    stepClassicPlayer(
      player,
      { ...emptyClassicIntent(), hitPressed: true },
      dt,
    );
    for (let tick = 0; tick < 20; tick++)
      stepClassicPlayer(player, emptyClassicIntent(), dt);
    expect(player.swingKind).toBe("overhead");
    expect(player.swingClips.serve.frame).toBe(23);
    expect(player.swingClips.serve.playing).toBe(true);
    expect(player.swingClips.overhead.clock).toBe(dt);
    stepClassicPlayer(
      player,
      { ...emptyClassicIntent(), hitPressed: true },
      dt,
    );
    expect(player.swingFrame).toBe(3);
    expect(player.swingClips.serve).toEqual({
      frame: 1,
      clock: dt,
      playing: false,
    });
  });

  it("retains separate underhand/overhead clocks across end-frame visibility switches", () => {
    const player = createClassicPlayer("left");
    const underhand = {
      shuttle: { x: 170, y: 375, vy: 100, lastTouchedBy: "right" as const },
    };
    stepClassicPlayer(
      player,
      { ...emptyClassicIntent(), hitPressed: true },
      dt,
      underhand,
    );
    expect(player.swingKind).toBe("underhand");
    expect(player.swingFrame).toBe(2);
    for (let tick = 0; tick < 17; tick++)
      stepClassicPlayer(player, emptyClassicIntent(), dt, underhand);
    expect(player.swingKind).toBe("overhead");
    expect(player.swingFrame).toBe(1);
    expect(player.animationClock).toBe(0);
    expect(player.swingClips.underhand.frame).toBe(19);
    expect(player.swingClips.underhand.playing).toBe(true);
    stepClassicPlayer(
      player,
      { ...emptyClassicIntent(), hitPressed: true },
      dt,
    );
    expect(player.swingFrame).toBe(2);
    expect(player.swingClips.underhand.clock).toBe(dt);
    expect(player.swingClips.underhand.playing).toBe(false);
    for (let tick = 0; tick < 26; tick++)
      stepClassicPlayer(player, emptyClassicIntent(), dt);
    stepClassicPlayer(
      player,
      { ...emptyClassicIntent(), hitPressed: true },
      dt,
      underhand,
    );
    expect(player.swingKind).toBe("underhand");
    expect(player.swingFrame).toBe(3);
  });

  it("plays the source net clip after collision, resumes without rewinding and stops on frame1", () => {
    const game = new ClassicSimulation();
    expect(game.net).toEqual({ frame: 1, clock: 0, playing: false });
    game.shuttle = birdie({ x: 316, y: 318, vx: 0, vy: 200 });
    input(game, "left");
    expect(game.diagnostics().ballEvents).toContain("netTop");
    expect(game.net.frame).toBe(2);
    input(game, "left");
    expect(game.net.frame).toBe(3);
    game.shuttle = birdie({ x: 299, y: 350, vx: 400, vy: 100 });
    input(game, "left");
    expect(game.diagnostics().ballEvents).toContain("netSide");
    expect(game.net.frame).toBe(4);
    for (let tick = 0; tick < 21; tick++) input(game, "left");
    expect(game.net).toEqual({ frame: 1, clock: dt, playing: false });
    game.shuttle = birdie({ x: 316, y: 318, vx: 0, vy: 200 });
    input(game, "left");
    expect(game.net.frame).toBe(3);
  });

  it("holds one swing, ignores edges during the lock, accepts a new press after original recovery", () => {
    const player = createClassicPlayer("left");
    stepClassicPlayer(player, { ...emptyClassicIntent(), hitHeld: true }, dt);
    for (let tick = 0; tick < 50; tick++) {
      stepClassicPlayer(player, { ...emptyClassicIntent(), hitHeld: true }, dt);
    }
    expect(player.swingFrame).toBe(1);
    expect(player.animationPlaying).toBe(false);
    stepClassicPlayer(player, emptyClassicIntent(), dt);
    stepClassicPlayer(
      player,
      { ...emptyClassicIntent(), hitPressed: true },
      dt,
    );
    expect(player.animationPlaying).toBe(true);
    const frame = player.swingFrame;
    stepClassicPlayer(
      player,
      { ...emptyClassicIntent(), hitPressed: true },
      dt,
    );
    expect(player.swingFrame).toBe(frame + 1);
  });

  it("selects underhand from the restored Joe zone and uses original airborne power", () => {
    const player = createClassicPlayer("left");
    // Independently selected point near Joe's foot inside original underHitbox.
    const ball = { x: 170, y: 375, vy: 100, lastTouchedBy: "right" as const };
    stepClassicPlayer(
      player,
      { ...emptyClassicIntent(), hitPressed: true },
      dt,
      { shuttle: ball },
    );
    expect(player.swingKind).toBe("underhand");
    expect(player.contactEnabled).toBe(true);
  });

  it("lets a right player return a legal opponent shot with restored racket geometry", () => {
    const game = new ClassicSimulation();
    game.players.left.serving = false;
    game.shuttle = birdie({
      x: 450,
      y: 250,
      vx: 100,
      vy: 100,
      lastTouchedBy: "left",
    });
    input(game, "right", { hitPressed: true });
    for (let tick = 0; tick < 20 && game.rallyHits === 0; tick++)
      input(game, "right");
    expect(game.rallyHits).toBe(1);
    expect(game.shuttle.lastTouchedBy).toBe("right");
    expect(game.shuttle.vx).toBeLessThan(0);
    expect(game.diagnostics().contacts[0].previousTouch).toBe("left");
    expect(game.diagnostics().contacts[0].kind).toBe("overhead");
  });

  it.each(["left", "right"] as const)(
    "does not self-contact in %s two-press serve+advance/jump source trajectories",
    (side) => {
      // Grid covers actual 60-Hz edges at 0.2..1.2sec, both sides, grounded or a single jump.
      for (const jumpAt of [-1, 6, 12, 18, 24]) {
        for (const secondAt of [12, 18, 24, 30, 36, 48, 60, 72]) {
          const game = new ClassicSimulation();
          if (side === "right") putRightServer(game);
          for (let tick = 0; tick < 140 && game.pointActive; tick++) {
            input(game, side, {
              hitPressed: tick === 0 || tick === secondAt,
              jumpPressed: tick === jumpAt,
              move: tick > 5 ? (side === "left" ? 1 : -1) : 0,
            });
          }
          expect(game.rallyHits).toBe(0);
        }
      }
    },
  );

  it("shares player prediction, keeps ball authority separate, and deep-clones serializable snapshots", () => {
    const game = new ClassicSimulation();
    const predicted = cloneClassicPlayer(game.players.left);
    const command = {
      ...emptyClassicIntent(),
      move: 1,
      jumpPressed: true,
      hitPressed: true,
    };
    stepClassicPlayer(predicted, command, dt, { pointActive: true });
    game.setIntents(command, emptyClassicIntent());
    game.update(dt);
    expect(predicted).toEqual(game.players.left);
    const state = game.snapshot();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    state.players.left.bob = -1;
    state.players.left.swingClips.serve.clock = -1;
    state.net.frame = 99;
    state.score.left = 99;
    expect(game.players.left.bob).not.toBe(-1);
    expect(game.players.left.swingClips.serve.clock).not.toBe(-1);
    expect(game.net.frame).not.toBe(99);
    expect(game.score.left).toBe(0);
    expect(classicGeometry.net.x).toBe(317.25);
  });

  it("is deterministic, bounds large dt and preserves a sub-frame input edge", () => {
    const first = new ClassicSimulation({ seed: 123 });
    const second = new ClassicSimulation({ seed: 123 });
    for (let tick = 0; tick < 1200; tick++) {
      const serve =
        first.shuttle.state === "attached" && first.server === "left";
      input(first, "left", { hitPressed: serve });
      input(second, "left", { hitPressed: serve });
    }
    expect(second.snapshot()).toEqual(first.snapshot());
    const game = new ClassicSimulation();
    game.setIntents(
      { ...emptyClassicIntent(), hitPressed: true },
      emptyClassicIntent(),
    );
    game.update(dt / 2);
    game.setIntents(emptyClassicIntent(), emptyClassicIntent());
    game.update(dt / 2);
    expect(game.players.left.animationPlaying).toBe(true);
    const elapsed = game.elapsed;
    game.update(60);
    expect(game.elapsed - elapsed).toBeCloseTo(0.25, 10);
    const stable = game.snapshot();
    game.update(Number.NaN);
    expect(game.snapshot()).toEqual(stable);
  });

  it("pauses explicit timers and clears contact after a point", () => {
    const game = new ClassicSimulation();
    game.shuttle = birdie({ x: 100, y: 399, vx: 0, vy: 100 });
    input(game, "left");
    expect(game.phase).toBe("point");
    game.phase = "paused";
    const paused = game.snapshot();
    game.update(10);
    expect(game.snapshot()).toEqual(paused);
    game.phase = "point";
    game.players.right.contactEnabled = true;
    game.shuttle = birdie({ x: 450, y: 250, vx: 100, vy: 100 });
    input(game, "right", { hitPressed: true });
    expect(game.rallyHits).toBe(0);
  });
});
