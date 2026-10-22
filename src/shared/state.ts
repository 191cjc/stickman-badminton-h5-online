import type { ClassicSimulation } from "./classic/simulation";
import { cloneClassicPlayer } from "./classic/player";
import type { PlayerIntent } from "./types";

export const emptyIntent = (): PlayerIntent => ({
  move: 0,
  jump: false,
  jumpPressed: false,
  hitHeld: false,
  hitPressed: false,
  swing: "auto",
  pausePressed: false,
});
export const serializePlayer = cloneClassicPlayer;
export type PlayerState = ReturnType<typeof serializePlayer>;
export type GameState = ReturnType<ClassicSimulation["snapshot"]>;
