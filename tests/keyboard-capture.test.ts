import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KeyboardCapture } from "../src/client/controls-settings";
let doc: EventTarget, win: EventTarget;
beforeEach(() => {
  doc = Object.assign(new EventTarget(), { hidden: false });
  win = new EventTarget();
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", win);
});
afterEach(() => vi.unstubAllGlobals());
const key = (type: string, code: string, extra = {}) => {
  const event = Object.assign(new Event(type, { cancelable: true }), {
    code,
    repeat: false,
    isComposing: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    ...extra,
  });
  doc.dispatchEvent(event);
  return event;
};
it.each(["Enter", "Space"])(
  "ignores %s used to open capture, consumes its keyup, then captures a fresh press",
  (code) => {
    const accept = vi.fn(),
      status = vi.fn(),
      capture = new KeyboardCapture(accept, status);
    key("keydown", code);
    capture.begin("left");
    expect(key("keydown", code, { repeat: true }).defaultPrevented).toBe(true);
    expect(key("keyup", code).defaultPrevented).toBe(true);
    expect(accept).not.toHaveBeenCalled();
    expect(key("keydown", "KeyJ").defaultPrevented).toBe(true);
    expect(accept).toHaveBeenCalledWith("left", "KeyJ");
    expect(capture.active).toBe(false);
    expect(key("keyup", "KeyJ").defaultPrevented).toBe(true);
    expect(key("keyup", "KeyJ").defaultPrevented).toBe(false);
  },
);
it("invalid capture remains active and modified/composing/repeat events retain native behavior", () => {
  const accept = vi.fn(() => "conflict"),
    status = vi.fn(),
    capture = new KeyboardCapture(accept, status);
  capture.begin("hit");
  for (const extra of [
    { ctrlKey: true },
    { altKey: true },
    { metaKey: true },
    { isComposing: true },
    { repeat: true },
  ]) {
    expect(key("keydown", "KeyJ", extra).defaultPrevented).toBe(false);
    key("keyup", "KeyJ");
  }
  expect(accept).not.toHaveBeenCalled();
  key("keydown", "KeyD");
  expect(capture.active).toBe(true);
  expect(status).toHaveBeenLastCalledWith("conflict");
});
it("first Escape cancels capture and is consumed; next Escape and Tab retain their panel/native ownership", () => {
  const accept = vi.fn(),
    capture = new KeyboardCapture(accept, () => {});
  capture.begin("jump");
  expect(key("keydown", "Escape").defaultPrevented).toBe(true);
  expect(capture.active).toBe(false);
  key("keyup", "Escape");
  expect(key("keydown", "Escape").defaultPrevented).toBe(false);
  key("keyup", "Escape");
  capture.begin("jump");
  expect(key("keydown", "Tab").defaultPrevented).toBe(false);
  expect(capture.active).toBe(false);
  expect(accept).not.toHaveBeenCalled();
});
it.each(["blur", "pagehide", "hidden", "close"])(
  "%s cancels capture without rebinding",
  (type) => {
    const accept = vi.fn(),
      capture = new KeyboardCapture(accept, () => {});
    capture.begin("left");
    if (type === "hidden") {
      Object.assign(doc, { hidden: true });
      doc.dispatchEvent(new Event("visibilitychange"));
    } else if (type === "close") capture.cancel();
    else win.dispatchEvent(new Event(type));
    key("keydown", "KeyJ");
    expect(capture.active).toBe(false);
    expect(accept).not.toHaveBeenCalled();
  },
);
