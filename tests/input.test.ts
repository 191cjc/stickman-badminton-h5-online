import { afterEach, expect, it, vi } from "vitest";
import { Input, bindings } from "../src/client/input";
class Element {
  constructor(readonly tagName: string) {}
}
afterEach(() => vi.unstubAllGlobals());
it("Space hits; W/Up jump; M/Escape are local actions and focus loss releases everything", () => {
  const win = new EventTarget(),
    doc = new EventTarget();
  Object.assign(doc, { hidden: false, querySelectorAll: () => [] });
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("HTMLElement", Element);
  const release = vi.fn(),
    mute = vi.fn(),
    leave = vi.fn(),
    input = new Input(release, mute, leave);
  const key = (type: string, code: string) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code, repeat: false });
    win.dispatchEvent(event);
  };
  expect(bindings.Space).toBe("hit");
  key("keydown", "Space");
  let frame = input.read(1);
  expect(frame.hitPressed).toBe(true);
  expect(frame.hitHeld).toBe(true);
  expect(frame.jump).toBe(false);
  key("keydown", "KeyW");
  frame = input.read(2);
  expect(frame.jumpPressed).toBe(true);
  expect(frame.jump).toBe(true);
  key("keydown", "KeyM");
  key("keydown", "Escape");
  expect(mute).toHaveBeenCalledOnce();
  expect(leave).toHaveBeenCalledOnce();
  win.dispatchEvent(new Event("blur"));
  expect(release).toHaveBeenCalledOnce();
  frame = input.read(3);
  expect(frame.move).toBe(0);
  expect(frame.jump).toBe(false);
  expect(frame.hitHeld).toBe(false);
  expect(frame.hitPressed).toBe(false);
});
it("preserves native button Space activation while releasing any previously held game key", () => {
  const win = new EventTarget(),
    doc = new EventTarget();
  Object.assign(doc, { hidden: false, querySelectorAll: () => [] });
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("HTMLElement", Element);
  const input = new Input(() => {});
  const down = new Event("keydown", { cancelable: true });
  Object.assign(down, { code: "Space", repeat: false });
  win.dispatchEvent(down);
  expect(input.read(1).hitHeld).toBe(true);
  for (const type of ["keydown", "keyup"]) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code: "Space", repeat: false });
    Object.defineProperty(event, "target", { value: new Element("BUTTON") });
    win.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }
  expect(input.read(2).hitHeld).toBe(false);
});
it.each(["blur", "pagehide", "hidden"])(
  "failed sends retain jump/hit edges once until accepted; %s discards pending edges",
  (releaseEvent) => {
    const win = new EventTarget(),
      doc = new EventTarget();
    Object.assign(doc, { hidden: false, querySelectorAll: () => [] });
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    vi.stubGlobal("HTMLElement", Element);
    const released = vi.fn();
    const input = new Input(released);
    const key = (type: string, code: string) => {
      const event = new Event(type, { cancelable: true });
      Object.assign(event, { code, repeat: false });
      win.dispatchEvent(event);
    };
    key("keydown", "KeyW");
    key("keydown", "Space");
    key("keyup", "KeyW");
    key("keyup", "Space");
    // A press/release between sends survives output backpressure. A failed send
    // performs no commit and uses the same consecutive sequence on retry.
    const rejected = input.peek(1);
    expect(rejected.jumpPressed).toBe(true);
    expect(rejected.hitPressed).toBe(true);
    expect(input.peek(1)).toEqual(rejected);
    input.commit(input.peek(1));
    expect(input.peek(2).jumpPressed).toBe(false);
    expect(input.peek(2).hitPressed).toBe(false);
    key("keydown", "KeyW");
    key("keydown", "Space");
    if (releaseEvent === "hidden") {
      Object.assign(doc, { hidden: true });
      doc.dispatchEvent(new Event("visibilitychange"));
    } else win.dispatchEvent(new Event(releaseEvent));
    expect(released).toHaveBeenCalledOnce();
    expect(input.peek(2)).toMatchObject({
      move: 0,
      jump: false,
      jumpPressed: false,
      hitHeld: false,
      hitPressed: false,
    });
  },
);
it("notifies only after logical changes, preserving aliases, rapid edges and pointer cancellation", () => {
  const win = new EventTarget(),
    doc = new EventTarget();
  const touch = Object.assign(new EventTarget(), {
    dataset: { control: "KeyW" },
    setPointerCapture: vi.fn(),
  });
  Object.assign(doc, { hidden: false, querySelectorAll: () => [touch] });
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("HTMLElement", Element);
  const changes: ReturnType<Input["peek"]>[] = [];
  const input = new Input(
    () => {},
    undefined,
    undefined,
    () => changes.push(input.peek(1)),
  );
  const key = (type: string, code: string, repeat = false) => {
    const event = Object.assign(new Event(type, { cancelable: true }), {
      code,
      repeat,
    });
    win.dispatchEvent(event);
  };
  key("keydown", "Space");
  key("keydown", "Space", true);
  key("keydown", "KeyS");
  key("keyup", "Space"); // Alias still holds hit; no logical change.
  key("keydown", "KeyX");
  expect(changes).toHaveLength(1);
  expect(changes[0]).toMatchObject({ hitPressed: true, hitHeld: true });
  key("keyup", "KeyS");
  expect(changes).toHaveLength(2);
  expect(changes[1]).toMatchObject({ hitPressed: true, hitHeld: false });
  touch.dispatchEvent(
    Object.assign(new Event("pointerdown"), { pointerId: 1 }),
  );
  expect(changes.at(-1)).toMatchObject({ jump: true, jumpPressed: true });
  touch.dispatchEvent(new Event("pointercancel"));
  touch.dispatchEvent(new Event("lostpointercapture"));
  expect(changes).toHaveLength(4);
  expect(changes.at(-1)).toMatchObject({ jump: false, jumpPressed: true });
  input.commit(input.peek(1));
  expect(changes).toHaveLength(4); // Committing edges is not a new user operation.
});
it("settings gate ignores native presses and touch, and closing cannot resurrect a released held key via repeat", () => {
  const win = new EventTarget(),
    doc = new EventTarget();
  const touch = Object.assign(new EventTarget(), {
    dataset: { control: "KeyS" },
    setPointerCapture: vi.fn(),
  });
  Object.assign(doc, { hidden: false, querySelectorAll: () => [touch] });
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("HTMLElement", Element);
  let enabled = true;
  const leave = vi.fn();
  const input = new Input(
    () => {},
    undefined,
    leave,
    undefined,
    () => enabled,
  );
  const key = (code: string, repeat = false, target?: Element) => {
    const event = Object.assign(new Event("keydown", { cancelable: true }), {
      code,
      repeat,
    });
    if (target) Object.defineProperty(event, "target", { value: target });
    win.dispatchEvent(event);
    return event;
  };
  key("KeyA");
  expect(input.peek(1).move).toBe(-1);
  enabled = false;
  input.release(false);
  expect(key("Space", false, new Element("INPUT")).defaultPrevented).toBe(
    false,
  );
  key("KeyD");
  key("KeyW");
  key("Escape");
  touch.dispatchEvent(
    Object.assign(new Event("pointerdown"), { pointerId: 1 }),
  );
  enabled = true;
  expect(key("KeyA", true).defaultPrevented).toBe(true);
  expect(key("ArrowLeft", true).defaultPrevented).toBe(true);
  expect(key("Space", true).defaultPrevented).toBe(true);
  expect(key("Space", true, new Element("INPUT")).defaultPrevented).toBe(
    false,
  );
  expect(input.peek(1)).toMatchObject({
    move: 0,
    jumpPressed: false,
    hitPressed: false,
    hitHeld: false,
  });
  expect(leave).not.toHaveBeenCalled();
  expect(touch.setPointerCapture).not.toHaveBeenCalled();
  key("KeyA");
  expect(input.peek(1).move).toBe(-1);
});
