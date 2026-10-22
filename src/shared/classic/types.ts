import type { GamePhase, PlayerIntent, Side } from "../types";
import type { CharacterId } from "./characters";
import type { ShuttleSpeed } from "../match-settings";

/** Flash 90302 logical units, not CSS pixels. See reference/flash-90302. */
export const CLASSIC_WORLD = {
  width: 640,
  height: 426,
  groundY: 400,
  wallInset: 33,
  playerWallInset: 48,
  netX: 317.25,
  playerNetInset: 50,
  serveNetInset: 145,
  playerScale: 1.25,
  fps: 60,
  targetScore: 7,
  pointDelay: 1.5,
} as const;

export type ClassicSwingKind = "serve" | "overhead" | "underhand";
export type ClassicBodyFrame = "normal" | "forward" | "backward" | "jump";

/** Each Flash MovieClip retains its own clock, even while another clip is visible. */
export interface ClassicClipState {
  frame: number;
  clock: number;
  playing: boolean;
}

/** All simulation/prediction fields are plain serializable data. */
export interface ClassicPlayerState {
  side: Side;
  characterId: CharacterId;
  bob: number;
  bobStep: number;
  bobBaseline: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  moveMultiplier: number;
  jumpMultiplier: number;
  powerMultiplier: number;
  bodyFrame: ClassicBodyFrame;
  bodyFrameIndex: number;
  swingKind: ClassicSwingKind;
  swingFrame: number;
  /** Original custom MovieClip clock, in seconds. */
  animationClock: number;
  animationPlaying: boolean;
  swingClips: Record<ClassicSwingKind, ClassicClipState>;
  swinging: boolean;
  contactEnabled: boolean;
  serving: boolean;
  hitLatched: boolean;
  jumpReady: boolean;
}

export interface ClassicShuttleState {
  x: number;
  y: number;
  /** Velocity/speed use native shuttle seconds; room speed scales flight time only. */
  vx: number;
  vy: number;
  speed: number;
  /** Flash angle: zero is up, +90 is right. */
  dir: number;
  rotation: number;
  state: "attached" | "flying" | "grounded";
  lastTouchedBy: Side | null;
  predictedLandingX: number;
}

export interface ClassicState {
  version: "flash-90302-v3";
  shuttleSpeed: ShuttleSpeed;
  phase: GamePhase;
  players: Record<Side, ClassicPlayerState>;
  shuttle: ClassicShuttleState;
  net: ClassicClipState;
  score: Record<Side, number>;
  server: Side;
  winner: Side | null;
  rallyHits: number;
  pointActive: boolean;
  pointTimer: number;
  elapsed: number;
  lastPointSide: Side | null;
  lastPointReason: string;
  statusText: string;
  lastShotLabel: string;
  lastShotSide: Side | null;
  rngState: number;
}

export interface ClassicPlayerContext {
  shuttle?: Pick<ClassicShuttleState, "x" | "y" | "vy" | "lastTouchedBy">;
  pointActive?: boolean;
  /** Authority advances timelines after both players and the birdie. Prediction defaults to true. */
  advanceAnimation?: boolean;
}

export interface ClassicPlayerEvents {
  swingStarted: boolean;
  serveReleased: boolean;
  /** Base movement/contact precedes Toaster's final bob position. */
  contactOrigin?: { x: number; y: number };
}

export type ClassicIntent = PlayerIntent;

export const classicDirection = (side: Side): 1 | -1 =>
  side === "left" ? 1 : -1;
export const otherClassicSide = (side: Side): Side =>
  side === "left" ? "right" : "left";

export const emptyClassicIntent = (): PlayerIntent => ({
  move: 0,
  jump: false,
  jumpPressed: false,
  hitHeld: false,
  hitPressed: false,
  swing: "auto",
  pausePressed: false,
});
