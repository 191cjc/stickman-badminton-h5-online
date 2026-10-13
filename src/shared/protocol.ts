import type { GameState } from "./state";
import type { Side } from "./types";
import { isCharacterId, type CharacterId } from "./classic/characters";
import type { PresentationJournal } from "./classic/presentation";

export const BASE_PATH = "/badminton-h5-online/";
export const PROTOCOL = 3;
export const SUBPROTOCOL = `badminton-v${PROTOCOL}`;
export const SIM_HZ = 60;
export const INPUT_HZ = 60;
export const SNAPSHOT_HZ = 30;
export const RECONNECT_MS = 15_000;
export const RESULT_MS = 30_000;
export const INPUT_TIMEOUT_MS = 750;

export interface InputFrame {
  type: "input";
  seq: number;
  move: -1 | 0 | 1;
  jump: boolean;
  jumpPressed: boolean;
  hitHeld: boolean;
  hitPressed: boolean;
}
export type ClientMessage =
  | InputFrame
  | { type: "queue"; character: CharacterId }
  | { type: "cancel" | "leave" | "release" }
  | { type: "ping"; time: number };
export type RoomStatus = "playing" | "reconnecting" | "finished";
export interface Snapshot {
  type: "snapshot";
  room: string;
  tick: number;
  ack: number;
  status: RoomStatus;
  reconnectRemainingMs: number;
  state: GameState;
  effects: PresentationJournal;
  resultReason?: "score" | "leave" | "disconnect" | "timeout";
}
export type ServerMessage =
  | Snapshot
  | { type: "hello"; protocol: number; reconnectMs: number }
  | { type: "queued"; character: CharacterId }
  | { type: "idle"; reason?: string }
  | {
      type: "matched";
      room: string;
      side: Side;
      resumed: boolean;
      characters: Record<Side, CharacterId>;
    }
  | {
      type: "result";
      winner: Side | null;
      reason: "score" | "leave" | "disconnect" | "timeout";
      score: { left: number; right: number };
    }
  | { type: "error"; code: string }
  | { type: "pong"; time: number };

// Accept only logical input. Extra fields (room, side, position, score…) are rejected.
export function parseClientMessage(raw: string): ClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.type !== "string") return null;
  const exactKeys = (keys: string[]) =>
    Object.keys(v).length === keys.length &&
    keys.every((k) => Object.hasOwn(v, k));
  if (
    v.type === "queue" &&
    exactKeys(["type", "character"]) &&
    isCharacterId(v.character)
  )
    return { type: "queue", character: v.character };
  if (["cancel", "leave", "release"].includes(v.type) && exactKeys(["type"]))
    return v as ClientMessage;
  if (
    v.type === "ping" &&
    exactKeys(["type", "time"]) &&
    typeof v.time === "number" &&
    Number.isFinite(v.time) &&
    v.time >= 0
  )
    return v as ClientMessage;
  if (
    v.type !== "input" ||
    !exactKeys([
      "type",
      "seq",
      "move",
      "jump",
      "jumpPressed",
      "hitHeld",
      "hitPressed",
    ])
  )
    return null;
  if (
    !Number.isSafeInteger(v.seq) ||
    (v.seq as number) < 1 ||
    (v.seq as number) > 2_000_000_000 ||
    ![-1, 0, 1].includes(v.move as number)
  )
    return null;
  if (
    !["jump", "jumpPressed", "hitHeld", "hitPressed"].every(
      (k) => typeof v[k] === "boolean",
    )
  )
    return null;
  return v as unknown as InputFrame;
}
