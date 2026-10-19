import { afterEach, expect, it, vi } from "vitest";
import {
  actionKeys,
  bindingError,
  CONTROLS_STORAGE_KEY,
  defaultControls,
  isSupportedCode,
  keyboardHelp,
  parseControls,
  readControls,
  saveControls,
} from "../src/client/controls";
afterEach(() => vi.unstubAllGlobals());
it("preserves all original aliases with detached mutable defaults and labels", () => {
  const a = defaultControls(),
    b = defaultControls();
  expect(a.bindings).toEqual({
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    jump: ["KeyW", "ArrowUp"],
    hit: ["Space", "KeyS", "ArrowDown"],
  });
  a.bindings.hit.length = 0;
  expect(actionKeys(a.bindings, "hit")).toBe("未设置");
  expect(actionKeys(b.bindings, "hit")).toBe("空格 / S / ↓");
  expect(keyboardHelp(b.bindings)).toContain("向左 A / ←");
  expect(b.gamepadEnabled).toBe(true);
});
it.each([
  "KeyJ",
  "Digit0",
  "ArrowDown",
  "Space",
  "Enter",
  "Slash",
  "Numpad9",
  "NumpadEnter",
  "IntlBackslash",
])("accepts a physical gameplay code %s", (code) =>
  expect(isSupportedCode(code)).toBe(true),
);
it.each([
  "KeyM",
  "Escape",
  "Tab",
  "ControlLeft",
  "ShiftRight",
  "MetaLeft",
  "F5",
  "BrowserBack",
  "Backspace",
  "Delete",
  "",
  "keyA",
  "KeyAAAA",
])("reserves or rejects %s", (code) =>
  expect(isSupportedCode(code)).toBe(false),
);
it("rejects conflicts and full rows without changing the current mapping", () => {
  const value = defaultControls(),
    before = structuredClone(value);
  expect(bindingError(value.bindings, "left", "KeyD")).toContain("向右");
  expect(bindingError(value.bindings, "hit", "KeyJ")).toContain("最多");
  expect(bindingError(value.bindings, "left", "KeyM")).toContain("静音");
  expect(bindingError(value.bindings, "left", "KeyA")).toBeUndefined();
  expect(bindingError(value.bindings, "left", "KeyJ")).toBeUndefined();
  expect(value).toEqual(before);
});
it.each([
  null,
  "",
  "{",
  "[]",
  "null",
  " ".repeat(4097),
  JSON.stringify({ ...defaultControls(), version: 2 }),
  JSON.stringify({ ...defaultControls(), extra: 1 }),
  JSON.stringify({ ...defaultControls(), gamepadEnabled: "true" }),
  JSON.stringify({
    version: 1,
    bindings: { left: [], right: [], jump: [] },
    gamepadEnabled: true,
  }),
  JSON.stringify({
    ...defaultControls(),
    bindings: { ...defaultControls().bindings, extra: [] },
  }),
  JSON.stringify({
    ...defaultControls(),
    bindings: { ...defaultControls().bindings, left: ["KeyA", "KeyA"] },
  }),
  JSON.stringify({
    ...defaultControls(),
    bindings: { ...defaultControls().bindings, left: ["KeyD"] },
  }),
  JSON.stringify({
    ...defaultControls(),
    bindings: {
      ...defaultControls().bindings,
      left: ["KeyA", "KeyB", "KeyC", "KeyJ"],
    },
  }),
  JSON.stringify({
    ...defaultControls(),
    bindings: { ...defaultControls().bindings, left: ["Escape"] },
  }),
  JSON.stringify({
    ...defaultControls(),
    bindings: { ...defaultControls().bindings, left: [42] },
  }),
  JSON.stringify({
    ...defaultControls(),
    bindings: { ...defaultControls().bindings, left: "KeyA" },
  }),
])("rejects malformed or unbounded preference data %#", (raw) =>
  expect(parseControls(raw)).toBeUndefined(),
);
it("roundtrips empty/custom keys and disabled pad, guarding storage getter/read/write failures", () => {
  const value = defaultControls();
  value.bindings.left = [];
  value.bindings.right = ["NumpadEnter"];
  value.gamepadEnabled = false;
  const values = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, raw: string) => {
      values.set(key, raw);
    },
  });
  saveControls(value, storage);
  expect(values.has(CONTROLS_STORAGE_KEY)).toBe(true);
  expect(readControls(storage)).toEqual(value);
  const denied = () => {
    throw Error("denied");
  };
  expect(readControls(denied)).toEqual(defaultControls());
  expect(readControls(() => ({ getItem: denied, setItem: denied }))).toEqual(
    defaultControls(),
  );
  expect(() => saveControls(value, denied)).not.toThrow();
  expect(() =>
    saveControls(value, () => ({ getItem: denied, setItem: denied })),
  ).not.toThrow();
  vi.stubGlobal(
    "window",
    Object.defineProperty({}, "localStorage", { get: denied }),
  );
  expect(readControls()).toEqual(defaultControls());
  expect(() => saveControls(value)).not.toThrow();
  expect(value.bindings.left).toEqual([]); // Persistence failure cannot discard live settings.
});
