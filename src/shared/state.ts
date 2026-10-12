import type { Player } from "./entities";
import type { Simulation } from "./simulation";
import type { PlayerIntent } from "./types";

export const emptyIntent = (): PlayerIntent => ({
  move: 0,
  jump: false,
  jumpPressed: false,
  hitHeld: false,
  hitPressed: false,
  pausePressed: false,
});
export const serializePlayer = (player: Player) => ({
  ...player,
  ai: { ...player.ai },
});
export type PlayerState = ReturnType<typeof serializePlayer>;
export type GameState = ReturnType<Simulation["snapshot"]>;
