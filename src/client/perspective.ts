import type { InputFrame } from "../shared/protocol";
import type { Side } from "../shared/types";

export const SELF_LEFT_STORAGE_KEY = "fiso-online:self-left:v1";
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
const browserStorage = (): PreferenceStorage => window.localStorage;

export function readSelfLeft(
  storage: () => PreferenceStorage = browserStorage,
): boolean {
  try {
    return storage().getItem(SELF_LEFT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}
export function saveSelfLeft(
  enabled: boolean,
  storage: () => PreferenceStorage = browserStorage,
): void {
  try {
    storage().setItem(SELF_LEFT_STORAGE_KEY, String(enabled));
  } catch {
    // Storage is optional: the live page choice must continue to work.
  }
}
export function isMirrored(enabled: boolean, actualSide?: Side): boolean {
  return enabled && actualSide === "right";
}
/** Reflection is its own inverse, so this maps display to actual side too. */
export function displaySide(side: Side, mirrored: boolean): Side {
  return mirrored ? (side === "left" ? "right" : "left") : side;
}
export function worldInput(frame: InputFrame, mirrored: boolean): InputFrame {
  if (!mirrored || frame.move === 0) return frame;
  return { ...frame, move: frame.move === 1 ? -1 : 1 };
}
