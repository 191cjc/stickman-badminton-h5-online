export type Side = "left" | "right";

export type GamePhase = "menu" | "playing" | "paused" | "point" | "matchEnd";

export interface PlayerIntent {
  move: number;
  jump: boolean;
  jumpPressed: boolean;
  hitHeld: boolean;
  hitPressed: boolean;
  pausePressed: boolean;
  // Server-only locks preserve shot combinations when input packets are coalesced.
  hitJump?: boolean;
}

export interface Viewport {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  dpr: number;
}
