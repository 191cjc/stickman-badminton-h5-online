import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CHARACTERS, CHARACTER_IDS } from "../../src/shared/classic/characters";
import { ClassicSimulation } from "../../src/shared/classic/simulation";
import {
  createClassicPlayer,
  setupClassicServe,
  stepClassicPlayer,
} from "../../src/shared/classic/player";
import {
  characterAnimation,
  racketPose,
} from "../../src/shared/classic/assets";
import { emptyClassicIntent } from "../../src/shared/classic/types";
const dt = 1 / 60;
const sourceClasses = {
  joe: "§_-18§",
  nadia: "§_-51§",
  harry: "§_-0S§",
  toaster: "override",
  pirate: "§_-2n§",
  "top-hat": "§use §",
  red: "§_-5P§",
};
const profiles = {
  joe: [1, 1, 1],
  nadia: [1.15, 1.1, 0.96],
  harry: [1.1, 0.9, 1.05],
  toaster: [1, 1.15, 0.96],
  pirate: [0.89, 0.9, 1.1],
  "top-hat": [0.89, 1.25, 1],
  red: [1.2, 1, 1],
};
describe("seven original human versus roles", () => {
  it("derives the actual move/jump/power constructor fields, preserving the excluded menu boundary", () => {
    expect(CHARACTER_IDS).toHaveLength(7);
    for (const id of CHARACTER_IDS) {
      const text = readFileSync(
        `reference/flash-90302/scripts/§_-0V§/${sourceClasses[id]}.as`,
        "utf8",
      );
      const scalar = (field: string) =>
        Number(text.match(new RegExp(field + " = ([\\d.]+);"))![1]);
      expect([scalar("§case §"), scalar("include"), scalar("§do§")]).toEqual(
        profiles[id],
      );
      expect([
        CHARACTERS[id].move,
        CHARACTERS[id].jump,
        CHARACTERS[id].power,
      ]).toEqual(profiles[id]);
    }
  });
  for (const id of CHARACTER_IDS)
    for (const side of ["left", "right"] as const) {
      it(`${id}/${side} retains original immediate movement and human jump`, () => {
        const p = createClassicPlayer(side, id),
          [move, jump] = profiles[id];
        const x = p.x;
        stepClassicPlayer(
          p,
          {
            ...emptyClassicIntent(),
            move: side === "left" ? 1 : -1,
            jumpPressed: true,
          },
          dt,
        );
        expect(p.vx).toBe((side === "left" ? 1 : -1) * 225 * move);
        expect(Math.abs(p.x - x)).toBeCloseTo((225 * move) / 60, 9);
        expect(p.vy).toBeCloseTo(-400 * jump + 20, 9);
        expect(p.y).toBeCloseTo(400 + (-400 * jump + 20) / 60, 9);
        expect(p.grounded).toBe(false);
      });
      it(`${id}/${side} serves with its own release and unscaled explicit origin`, () => {
        const game = new ClassicSimulation({
          characters: { left: id, right: id },
        });
        game.server = side;
        game.players.left.serving = false;
        setupClassicServe(game.players[side]);
        const release = id === "toaster" ? 8 : 7;
        for (let f = 0; f < release - 3; f++) {
          const hit = { ...emptyClassicIntent(), hitPressed: f === 0 };
          game.setIntents(
            side === "left" ? hit : emptyClassicIntent(),
            side === "right" ? hit : emptyClassicIntent(),
          );
          game.update(dt);
          expect(game.shuttle.state).toBe("attached");
        }
        game.setIntents(emptyClassicIntent(), emptyClassicIntent());
        game.update(dt);
        expect(game.players[side].swingFrame).toBe(release);
        expect(game.shuttle.state).toBe("flying");
        expect(game.shuttle.x - game.players[side].x).toBeCloseTo(
          (side === "left" ? 1 : -1) * (id === "toaster" ? 22 : 28.45),
          9,
        );
        expect(game.shuttle.y - game.players[side].y).toBeCloseTo(
          id === "toaster" ? -86.55 : -22.25,
          9,
        );
        expect(game.shuttle.speed).toBeCloseTo(1485, 10);
        expect(game.shuttle.dir).toBe((side === "left" ? 1 : -1) * 40);
        const shot = game.presentation().events.find((e) => e.kind === "shot");
        expect(shot?.kind === "shot" && shot.sound).toBe(
          id === "toaster" ? "toasterpop" : "birdiehit",
        );
      });
      for (const kind of ["overhead", "underhand"] as const)
        it(`${id}/${side} ${kind} source pose accepts a contact with original power`, () => {
          const game = new ClassicSimulation({
              characters: { left: id, right: id },
            }),
            p = game.players[side];
          game.players.left.serving = false;
          p.serving = false;
          p.swingKind = kind;
          p.swingFrame = kind === "overhead" ? 1 : 9;
          p.contactEnabled = true;
          p.swinging = true;
          // Independent source witnesses: above the head at frame1 or low racket at frame9.
          const local =
            kind === "overhead"
              ? { x: id === "toaster" ? -30 : -22, y: -90 }
              : { x: 45, y: -35 };
          const sign = side === "left" ? 1 : -1;
          Object.assign(game.shuttle, {
            x: p.x + local.x * 1.25 * sign,
            y: p.y + local.y * 1.25,
            state: "flying",
            vx: 0,
            vy: 0,
            lastTouchedBy: side === "left" ? "right" : "left",
          });
          game.update(dt);
          expect(game.rallyHits).toBe(1);
          expect(p.contactEnabled).toBe(false);
          const shot = game
            .presentation()
            .events.find((e) => e.kind === "shot");
          expect(shot?.kind === "shot" && shot.dir).toBe(
            (kind === "overhead" ? 30 : 40) * sign,
          );
          const contact = game.diagnostics().contacts[0];
          expect(Math.hypot(contact.vx, contact.vy)).toBeCloseTo(
            (kind === "overhead" ? 1250 : 1300) * 1.4 * profiles[id][2] * 0.9,
            8,
          );
        });
    }
  it.each(["left", "right"] as const)(
    "Toaster %s contacts before final bob and preserves grounded/airborne and reversal rules",
    (side) => {
      const game = new ClassicSimulation({ characters: { [side]: "toaster" } }),
        p = game.players[side];
      p.serving = false;
      game.players.left.serving = false;
      p.bob = 3.8;
      p.y = 403.8;
      const pose = racketPose("overhead", 1, "toaster");
      Object.assign(game.shuttle, {
        x: p.x + (side === "left" ? 1 : -1) * -30 * 1.25,
        y: p.y + pose.hitbox.y * 1.25 + 0.1,
        state: "flying",
        vx: 0,
        vy: 0,
        lastTouchedBy: side === "left" ? "right" : "left",
      });
      const hit = { ...emptyClassicIntent(), hitPressed: true };
      game.setIntents(
        side === "left" ? hit : emptyClassicIntent(),
        side === "right" ? hit : emptyClassicIntent(),
      );
      game.update(dt);
      expect(game.rallyHits).toBe(1);
      expect(p.y).toBe(404);
      stepClassicPlayer(p, emptyClassicIntent(), dt);
      expect(p.bobStep).toBe(-0.2);
      expect(p.y).toBe(404);
      stepClassicPlayer(p, { ...emptyClassicIntent(), jumpPressed: true }, dt);
      expect(p.grounded).toBe(false);
      const savedBob = p.bob;
      for (let f = 0; f < 20; f++)
        stepClassicPlayer(p, emptyClassicIntent(), dt);
      expect(p.bob).toBe(savedBob);
      expect(p.y).toBeLessThan(400);
      expect(characterAnimation("toaster").serve.frames).toBe(27);
    },
  );
  it("FX chance/seed/disabled output never changes gameplay replay including net bounce randomness", () => {
    const a = new ClassicSimulation({
      seed: 123,
      cosmeticSeed: 1,
      characters: { left: "toaster", right: "pirate" },
    });
    const b = new ClassicSimulation({
      seed: 123,
      cosmeticSeed: 999,
      cosmetics: false,
      characters: { left: "toaster", right: "pirate" },
    });
    for (let f = 0; f < 1500; f++) {
      if (f === 40) {
        for (const game of [a, b])
          Object.assign(game.shuttle, {
            x: 316,
            y: 318,
            vx: 0,
            vy: 200,
            state: "flying",
          });
      }
      const left = {
        ...emptyClassicIntent(),
        hitPressed: f % 40 === 0,
        move: f % 80 < 40 ? -1 : 1,
      };
      for (const game of [a, b]) {
        game.setIntents(left, emptyClassicIntent());
        game.update(dt);
      }
      expect(a.snapshot()).toEqual(b.snapshot());
    }
    expect(a.presentation().cursor).toBeGreaterThan(0);
    expect(b.presentation().cursor).toBe(0);
  });
});
