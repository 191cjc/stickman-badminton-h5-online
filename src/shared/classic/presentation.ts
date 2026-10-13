import type { Side } from "../types";

export type SoundId = "whoosh" | "birdiehit" | "toasterpop" | "ding" | "cheer";
interface EventBase {
  id: number;
  tick: number;
}
export type ClassicPresentationEvent =
  | (EventBase & { kind: "swing"; side: Side; sound: "whoosh" })
  | (EventBase & {
      kind: "shot";
      side: Side;
      x: number;
      y: number;
      dir: number;
      sound: "birdiehit" | "toasterpop";
    })
  | (EventBase & { kind: "point"; side: Side; sound: "ding" })
  | (EventBase & { kind: "victory"; side: Side; sound: "cheer" })
  | (EventBase & {
      kind: "tail" | "smoke";
      x: number;
      y: number;
      seed: number;
    });
export type PresentationPayload = ClassicPresentationEvent extends infer E
  ? E extends ClassicPresentationEvent
    ? Omit<E, "id" | "tick">
    : never
  : never;
export interface PresentationJournal {
  cursor: number;
  events: ClassicPresentationEvent[];
}
export const PRESENTATION_LIMIT = 128;
export const PRESENTATION_TICKS = 30;
/** Cosmetic streams never consume net-bounce/gameplay randomness. */
export function seededRandom(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 0x100000000;
  };
}
