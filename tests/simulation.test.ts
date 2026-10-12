import { describe, expect, it } from "vitest";
import { BadmintonGame } from "../upstream/src/game/badminton-game";
import { Simulation } from "../src/shared/simulation";
import { emptyIntent } from "../src/shared/state";
import type { GameState } from "../src/shared/state";
import type { InputSnapshot, PlayerIntent, Side } from "../src/shared/types";

describe("upstream mechanics regression", () => {
  it("preserves movement, jump, swing, serve, flight and score through a full match without DOM", () => {
    const original = new BadmintonGame("versus");
    const legacy = original as unknown as {
      players: GameState["players"];
      shuttle: GameState["shuttle"];
      score: GameState["score"];
      phase: string;
      winner: Side | null;
    };
    const online = new Simulation();
    for (let frame = 0; frame < 4000; frame++) {
      const state = online.snapshot();
      const left: PlayerIntent = {
        ...emptyIntent(),
        move: frame < 80 ? -1 : 0,
        jump: frame === 4,
        jumpPressed: frame === 4,
        hitPressed:
          state.shuttle.state === "attached" &&
          state.server === "left" &&
          !state.players.left.swingType,
      };
      const right: PlayerIntent = {
        ...emptyIntent(),
        move: frame < 80 ? 1 : 0,
        hitPressed:
          state.shuttle.state === "attached" &&
          state.server === "right" &&
          !state.players.right.swingType,
      };
      const down = new Set<string>();
      const pressed = new Set<string>();
      for (const [intent, keys] of [
        [left, ["KeyA", "KeyD", "KeyW", "KeyS"]],
        [right, ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]],
      ] as const) {
        if (intent.move) down.add(keys[intent.move > 0 ? 1 : 0]);
        if (intent.jump) down.add(keys[2]);
        if (intent.jumpPressed) pressed.add(keys[2]);
        if (intent.hitPressed) pressed.add(keys[3]);
      }
      const snapshot: InputSnapshot = { down, pressed };
      original.setInput(snapshot);
      for (let sub = 0; sub < 2; sub++) {
        online.setIntents(
          sub ? { ...left, jumpPressed: false, hitPressed: false } : left,
          sub ? { ...right, jumpPressed: false, hitPressed: false } : right,
        );
        online.update(1 / 120);
        original.update(1 / 120);
      }
      const next = online.snapshot();
      expect(next.score).toEqual(legacy.score);
      expect(next.phase).toEqual(legacy.phase);
      for (const side of ["left", "right"] as const)
        expect(next.players[side]).toEqual({ ...legacy.players[side] });
      expect(next.shuttle.state).toBe(legacy.shuttle.state);
      if (next.shuttle.state !== "attached")
        expect(next.shuttle).toEqual({ ...legacy.shuttle });
      if (next.phase === "matchEnd") {
        expect(next.winner).toBe(legacy.winner);
        expect(Math.max(next.score.left, next.score.right)).toBe(7);
        return;
      }
    }
    throw new Error("match never completed");
  });
  it("retains playable AI practice", () => {
    const game = new Simulation("single", "boss");
    game.setIntents({ ...emptyIntent(), hitPressed: true }, emptyIntent());
    game.update(1 / 120);
    game.setIntents(emptyIntent(), emptyIntent());
    let maximumRally = 0;
    for (let i = 0; i < 3000; i++) {
      game.update(1 / 120);
      maximumRally = Math.max(maximumRally, game.snapshot().rallyHits);
    }
    expect(maximumRally).toBeGreaterThan(0);
  });
});
