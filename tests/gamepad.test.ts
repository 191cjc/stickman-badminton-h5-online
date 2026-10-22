import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GamepadController, type PadSample } from "../src/client/gamepad";
import { Input } from "../src/client/input";
let win: EventTarget;
beforeEach(() => {
  win = new EventTarget();
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    querySelectorAll: () => [],
    addEventListener: () => {},
  });
  vi.stubGlobal("HTMLElement", class {});
});
afterEach(() => vi.unstubAllGlobals());
const pad = (index = 0, id = "Standard pad"): PadSample => ({
  index,
  id,
  connected: true,
  mapping: "standard",
  axes: [0, 0],
  buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
});
function fixture(initial: (PadSample | null)[] = [pad()]) {
  let samples = initial;
  const input = new Input(() => {}),
    statuses: string[] = [];
  const read = vi.fn(() => samples);
  const controller = new GamepadController(
    input,
    (status) => statuses.push(status),
    read,
  );
  return {
    input,
    controller,
    statuses,
    read,
    get samples() {
      return samples;
    },
    set samples(value: (PadSample | null)[]) {
      samples = value;
    },
  };
}
function press(p: PadSample, index: number, value = true) {
  p.buttons[index].pressed = value;
  p.buttons[index].value = Number(value);
}
function axis(p: PadSample, value: number) {
  p.axes = [value, 0];
}
it("inactive discovery never arms; standard mapping merges axes/D-pad and positional face buttons", () => {
  const f = fixture(),
    p = f.samples[0]!;
  f.controller.refresh();
  f.controller.refresh();
  expect(f.statuses.at(-1)).toContain("先松开");
  press(p, 0);
  press(p, 2);
  axis(p, 1);
  f.controller.poll();
  expect(f.input.peek(1)).toMatchObject({
    move: 0,
    jump: false,
    hitHeld: false,
  });
  press(p, 0, false);
  press(p, 2, false);
  axis(p, 0);
  f.controller.poll();
  expect(f.statuses.at(-1)).toContain("可用");
  press(p, 0);
  press(p, 2);
  axis(p, -1);
  f.controller.poll();
  expect(f.input.read(1)).toMatchObject({
    move: -1,
    jump: true,
    jumpPressed: true,
    hitHeld: true,
    hitPressed: true,
  });
  f.controller.poll();
  expect(f.input.peek(2)).toMatchObject({
    jumpPressed: false,
    hitPressed: false,
  });
  press(p, 15);
  f.controller.poll();
  expect(f.input.peek(2).move).toBe(0);
  axis(p, 0);
  f.controller.poll();
  expect(f.input.peek(2).move).toBe(1);
  press(p, 14);
  f.controller.poll();
  expect(f.input.peek(2).move).toBe(0);
});
it("uses .35 engage/.20 release hysteresis and direct opposite direction changes", () => {
  const f = fixture(),
    p = f.samples[0]!;
  f.controller.poll();
  for (const [x, move] of [
    [0.34, 0],
    [0.35, 1],
    [0.25, 1],
    [0.2, 0],
    [-0.35, -1],
    [-0.21, -1],
    [0.35, 1],
    [-0.34, 0],
    [-0.35, -1],
  ]) {
    axis(p, x);
    f.controller.poll();
    expect(f.input.peek(1).move).toBe(move);
  }
});
it("lowest eligible selection stays stable; unplug/same-index reconnection must neutral-rearm", () => {
  const p2 = pad(2),
    p1 = pad(1),
    f = fixture([null, null, p2]);
  f.controller.poll();
  f.samples = [null, p1, p2];
  axis(p1, -1);
  axis(p2, 1);
  f.controller.poll();
  expect(f.input.peek(1).move).toBe(1);
  press(p2, 2);
  f.controller.poll();
  expect(f.input.peek(1).hitPressed).toBe(true);
  p2.connected = false;
  f.controller.poll();
  expect(f.input.peek(1)).toMatchObject({ move: 0, hitPressed: false });
  expect(f.statuses.at(-1)).toContain("手柄 2");
  axis(p1, 0);
  f.controller.poll();
  axis(p1, -1);
  f.controller.poll();
  expect(f.input.peek(1).move).toBe(-1);
  // Native disconnect invalidates the selected slot even when an API snapshot is stale.
  win.dispatchEvent(
    Object.assign(new Event("gamepaddisconnected"), { gamepad: p1 }),
  );
  expect(f.input.peek(1).move).toBe(0);
  f.controller.poll();
  expect(f.input.peek(1).move).toBe(0);
  axis(p1, 0);
  f.controller.poll();
  axis(p1, 1);
  f.controller.poll();
  expect(f.input.peek(1).move).toBe(1);
  win.dispatchEvent(
    Object.assign(new Event("gamepadconnected"), { gamepad: p1 }),
  );
  f.controller.poll();
  expect(f.input.peek(1).move).toBe(0);
});
it("reset, disable, malformed samples and errors clear pad-owned holds/edges, retaining keyboard", () => {
  const f = fixture(),
    p = f.samples[0]!;
  f.controller.poll();
  const key = (type: string, code: string) =>
    win.dispatchEvent(Object.assign(new Event(type), { code, repeat: false }));
  key("keydown", "KeyA");
  key("keydown", "KeyK");
  key("keyup", "KeyK");
  press(p, 2);
  f.controller.poll();
  f.controller.reset();
  expect(f.input.peek(1)).toMatchObject({
    move: -1,
    jumpPressed: true,
    hitPressed: false,
  });
  f.controller.poll();
  expect(f.input.peek(1).hitPressed).toBe(false);
  press(p, 2, false);
  f.controller.poll();
  press(p, 2);
  f.controller.poll();
  expect(f.input.peek(1).hitPressed).toBe(true);
  f.controller.setEnabled(false);
  expect(f.input.peek(1)).toMatchObject({
    move: -1,
    jumpPressed: true,
    hitPressed: false,
  });
  expect(f.statuses.at(-1)).toContain("关闭");
  f.controller.setEnabled(true);
  f.controller.poll();
  expect(f.input.peek(1).hitHeld).toBe(false);
  press(p, 2, false);
  f.controller.poll();
  press(p, 2);
  f.controller.poll();
  f.read.mockImplementationOnce(() => {
    throw Error("denied");
  });
  f.controller.poll();
  expect(f.input.peek(1)).toMatchObject({
    move: -1,
    jumpPressed: true,
    hitPressed: false,
  });
  expect(f.statuses.at(-1)).toContain("无法读取");
  f.controller.poll();
  expect(f.input.peek(1).hitHeld).toBe(false);
});
it.each([NaN, Infinity, -Infinity, 1.01, -1.01])(
  "rejects malformed axis %s without arming and recovers through neutral",
  (x) => {
    const f = fixture(),
      p = f.samples[0]!;
    axis(p, x);
    f.controller.poll();
    expect(f.statuses.at(-1)).toContain("数据不完整");
    axis(p, 1);
    f.controller.poll();
    expect(f.input.peek(1).move).toBe(0);
    axis(p, 0);
    f.controller.poll();
    axis(p, 1);
    f.controller.poll();
    expect(f.input.peek(1).move).toBe(1);
  },
);
it("missing required controls cannot qualify as neutral; unused controls are ignored", () => {
  const f = fixture(),
    p = f.samples[0]!;
  p.buttons = p.buttons.slice(0, 3);
  f.controller.poll();
  expect(f.statuses.at(-1)).toContain("数据不完整");
  const good = pad();
  press(good, 2);
  f.samples = [good];
  f.controller.poll();
  expect(f.input.peek(1).hitHeld).toBe(false);
  press(good, 2, false);
  press(good, 1);
  press(good, 3);
  f.controller.poll();
  f.controller.poll();
  expect(f.input.peek(1)).toMatchObject({
    move: 0,
    jump: false,
    jumpPressed: false,
    hitHeld: false,
    hitPressed: false,
  });
});
it("nonstandard pads do not block standard pads; missing/throwing API method or getter safely recovers", () => {
  const non = pad();
  non.mapping = "";
  const f = fixture([non]);
  f.controller.refresh();
  expect(f.statuses.at(-1)).toContain("布局");
  f.samples = [non, pad(1)];
  f.controller.refresh();
  expect(f.statuses.at(-1)).toContain("手柄 2");
  let statuses: string[] = [];
  vi.stubGlobal("navigator", {});
  const g = new GamepadController(f.input, (s) => statuses.push(s));
  g.refresh();
  expect(statuses.at(-1)).toContain("不支持");
  const denied = () => {
    throw Error("denied");
  };
  vi.stubGlobal(
    "navigator",
    Object.defineProperty({}, "getGamepads", { get: denied }),
  );
  g.refresh();
  expect(statuses.at(-1)).toContain("无法读取");
  const receiver = {
    getGamepads() {
      expect(this).toBe(receiver);
      return [pad()];
    },
  };
  vi.stubGlobal("navigator", receiver);
  g.refresh();
  expect(statuses.at(-1)).toContain("已连接");
  statuses = [];
  g.refresh();
  expect(statuses).toEqual([]); // Unchanged status does not churn DOM/rearm.
});
