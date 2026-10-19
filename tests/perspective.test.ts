import { expect, it, vi } from "vitest";
import {
  displaySide,
  isMirrored,
  readSelfLeft,
  saveSelfLeft,
  SELF_LEFT_STORAGE_KEY,
  worldInput,
} from "../src/client/perspective";
import type { InputFrame } from "../src/shared/protocol";

it.each([
  [false, "left", false],
  [false, "right", false],
  [true, "left", false],
  [true, "right", true],
  [true, undefined, false],
] as const)(
  "maps self-left=%s and real seat=%s without changing identity",
  (enabled, side, expected) => {
    const mirrored = isMirrored(enabled, side);
    expect(mirrored).toBe(expected);
    expect(displaySide("left", mirrored)).toBe(expected ? "right" : "left");
    expect(displaySide("right", mirrored)).toBe(expected ? "left" : "right");
    if (enabled && side) expect(displaySide(side, mirrored)).toBe("left");
  },
);

it.each([-1, 0, 1] as const)(
  "maps horizontal input %s once, preserving all edge and sequence fields",
  (move) => {
    const frame: InputFrame = Object.freeze({
      type: "input",
      seq: 13,
      move,
      jump: true,
      jumpPressed: true,
      hitHeld: false,
      hitPressed: true,
    });
    const mapped = worldInput(frame, true);
    expect(mapped).toEqual({ ...frame, move: move === 0 ? 0 : -move });
    expect(Object.is(mapped.move, -0)).toBe(false);
    expect(worldInput(frame, false)).toBe(frame);
    expect(worldInput(mapped, true)).toEqual(frame);
  },
);

it.each([null, "", "false", "1", "TRUE", "yes", "{}", "true"])(
  "defaults safely for stored value %s",
  (value) => {
    const getItem = vi.fn(() => value);
    expect(readSelfLeft(() => ({ getItem, setItem: vi.fn() }))).toBe(
      value === "true",
    );
    expect(getItem).toHaveBeenCalledWith(SELF_LEFT_STORAGE_KEY);
  },
);
it("storage access/read/write failures never escape and a successful choice persists as a boolean string", () => {
  const denied = () => {
    throw new Error("denied");
  };
  expect(readSelfLeft(denied)).toBe(false);
  expect(readSelfLeft(() => ({ getItem: denied, setItem: denied }))).toBe(
    false,
  );
  expect(() => saveSelfLeft(true, denied)).not.toThrow();
  expect(() =>
    saveSelfLeft(true, () => ({ getItem: denied, setItem: denied })),
  ).not.toThrow();
  const values = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  });
  saveSelfLeft(true, storage);
  expect(readSelfLeft(storage)).toBe(true);
  saveSelfLeft(false, storage);
  expect(readSelfLeft(storage)).toBe(false);
});
