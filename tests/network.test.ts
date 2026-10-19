import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Network } from "../src/client/network";
import { Input } from "../src/client/input";
import { InputScheduler } from "../src/client/input-scheduler";
import { Prediction } from "../src/client/prediction";
import { Simulation } from "../src/shared/simulation";
import { PROTOCOL, SUBPROTOCOL } from "../src/shared/protocol";
import { worldInput } from "../src/client/perspective";

class Socket extends EventTarget {
  static OPEN = 1;
  readyState = 0;
  bufferedAmount = 0;
  sent: string[] = [];
  closed = false;
  constructor(
    readonly url: URL,
    readonly protocol: string,
  ) {
    super();
    sockets.push(this);
  }
  send(raw: string): void {
    this.sent.push(raw);
  }
  open(): void {
    this.readyState = Socket.OPEN;
    this.dispatchEvent(new Event("open"));
  }
  message(value: unknown): void {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(value) }),
    );
  }
  close(code = 1000, reason = ""): void {
    this.closed = true;
    this.readyState = 3;
    this.dispatchEvent(Object.assign(new Event("close"), { code, reason }));
  }
}
const sockets: Socket[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  sockets.length = 0;
  vi.stubGlobal("location", {
    href: "http://test.local/badminton-h5-online/",
    protocol: "http:",
  });
  vi.stubGlobal("WebSocket", Socket);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("stops before opening a socket on incompatible session and requires a refresh even after manual retry", async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ protocol: PROTOCOL - 1, connected: false }),
  });
  vi.stubGlobal("fetch", fetcher);
  const statuses: string[] = [];
  const network = new Network(
    () => {},
    (_connected, text) => statuses.push(text),
    () => {},
  );
  await network.connect();
  await network.connect(true);
  await vi.advanceTimersByTimeAsync(20_000);
  expect(network.refreshRequired).toBe(true);
  expect(network.connected).toBe(false);
  expect(network.send({ type: "queue", character: "joe" })).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(sockets).toHaveLength(0);
  expect(statuses.at(-1)).toContain("刷新");
});
it.each(["hello", "error"])(
  "stops reconnecting and discards gameplay on a %s version mismatch after upgrade",
  async (type) => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ protocol: PROTOCOL, connected: false }),
    });
    vi.stubGlobal("fetch", fetcher);
    const received: unknown[] = [];
    const network = new Network(
      (message) => received.push(message),
      () => {},
      () => {},
    );
    await network.connect();
    expect(sockets[0].protocol).toBe(SUBPROTOCOL);
    sockets[0].open();
    sockets[0].message(
      type === "hello"
        ? { type, protocol: PROTOCOL - 1, reconnectMs: 15_000 }
        : { type, code: "protocol_mismatch" },
    );
    await vi.advanceTimersByTimeAsync(20_000);
    await network.connect(true);
    expect(network.refreshRequired).toBe(true);
    expect(sockets[0].closed).toBe(true);
    expect(sockets[0].sent).toEqual([]);
    expect(received).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it("paced sends retain edges and consecutive sequence through disconnection, backpressure and a throwing socket", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ protocol: PROTOCOL, connected: false }),
    }),
  );
  const win = new EventTarget();
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    querySelectorAll: () => [],
    addEventListener: () => {},
  });
  vi.stubGlobal("HTMLElement", class {});
  const network = new Network(
    () => {},
    () => {},
    () => {},
  );
  const input = new Input(() => {});
  const prediction = new Prediction("left", new Simulation().players.left);
  const key = (type: string, code: string) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code, repeat: false });
    win.dispatchEvent(event);
  };
  for (const code of ["KeyW", "Space"]) {
    key("keydown", code);
    key("keyup", code);
  }
  let seq = 0;
  const scheduler = new InputScheduler(
    () => {
      const frame = input.peek(seq + 1);
      if (!network.send(frame)) return;
      input.commit(frame);
      seq++;
      prediction.accept(frame, Date.now());
    },
    () => Date.now(),
  );
  scheduler.setActive(true);
  await vi.advanceTimersByTimeAsync(17); // No socket yet.
  await network.connect();
  const socket = sockets[0];
  socket.open();
  socket.bufferedAmount = 64 * 1024 + 1;
  await vi.advanceTimersByTimeAsync(17);
  socket.bufferedAmount = 0;
  vi.spyOn(socket, "send").mockImplementationOnce(() => {
    throw new Error("transport_failure");
  });
  await vi.advanceTimersByTimeAsync(17);
  expect(seq).toBe(0);
  expect(prediction.diagnostics(Date.now()).pendingInputs).toBe(0);
  expect(input.peek(1)).toMatchObject({ jumpPressed: true, hitPressed: true });
  expect(socket.sent).toEqual([]);
  await vi.advanceTimersByTimeAsync(34);
  const frames = socket.sent.map((raw) => JSON.parse(raw));
  expect(frames.map(({ seq }) => seq)).toEqual([1, 2]);
  expect(frames[0]).toMatchObject({ jumpPressed: true, hitPressed: true });
  expect(frames[1]).toMatchObject({ jumpPressed: false, hitPressed: false });
  expect(prediction.diagnostics(Date.now()).pendingInputs).toBe(2);
  scheduler.setActive(false);
  await vi.advanceTimersByTimeAsync(100);
  expect(socket.sent).toHaveLength(2);
});
it("mirrored movement reaches the actual right-side prediction only after the identical frame is accepted", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ protocol: PROTOCOL, connected: false }),
      }),
  );
  const win = new EventTarget();
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    querySelectorAll: () => [],
    addEventListener: () => {},
  });
  vi.stubGlobal("HTMLElement", class {});
  const network = new Network(
    () => {},
    () => {},
    () => {},
  );
  await network.connect();
  const socket = sockets[0];
  socket.open();
  const input = new Input(() => {});
  const simulation = new Simulation();
  const prediction = new Prediction("right", simulation.players.right);
  const originalX = prediction.drawState(0).x;
  const accepted = vi.spyOn(prediction, "accept");
  const key = (code: string) =>
    win.dispatchEvent(
      Object.assign(new Event("keydown"), { code, repeat: false }),
    );
  key("KeyA");
  key("KeyW");
  key("Space");
  let seq = 0;
  const send = () => {
    const frame = worldInput(input.peek(seq + 1), true);
    if (!network.send(frame)) return;
    input.commit(frame);
    seq++;
    prediction.accept(frame, seq * 17);
  };
  socket.bufferedAmount = 64 * 1024 + 1;
  send();
  expect(seq).toBe(0);
  expect(accepted).not.toHaveBeenCalled();
  expect(input.peek(1)).toMatchObject({
    move: -1,
    jumpPressed: true,
    hitPressed: true,
  });
  socket.bufferedAmount = 0;
  send();
  send();
  const frames = socket.sent.map((raw) => JSON.parse(raw));
  expect(frames[0]).toMatchObject({
    seq: 1,
    move: 1,
    jumpPressed: true,
    hitPressed: true,
  });
  expect(frames[1]).toMatchObject({
    seq: 2,
    move: 1,
    jumpPressed: false,
    hitPressed: false,
  });
  expect(accepted.mock.calls.map(([frame]) => frame)).toEqual(frames);
  prediction.advance(100);
  expect(prediction.drawState(0).x).toBeGreaterThan(originalX);
  expect(simulation.players.right.x).toBe(originalX); // Read-only authority context.
});
it("actual logical notifications expedite one transactional send and rejected expedited edges survive until accepted", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ protocol: PROTOCOL, connected: false }),
    }),
  );
  const win = new EventTarget(),
    touch = Object.assign(new EventTarget(), {
      dataset: { control: "KeyW" },
      setPointerCapture: vi.fn(),
    });
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    querySelectorAll: () => [touch],
    addEventListener: () => {},
  });
  vi.stubGlobal("HTMLElement", class {});
  const network = new Network(
    () => {},
    () => {},
    () => {},
  );
  await network.connect();
  sockets[0].open();
  const began = Date.now();
  const now = () => Date.now() - began;
  const prediction = new Prediction("right", new Simulation().players.right);
  let seq = 0;
  const scheduler = new InputScheduler(() => {
    const frame = input.peek(seq + 1);
    if (!network.send(frame)) return;
    input.commit(frame);
    seq++;
    prediction.accept(frame, now());
  }, now);
  const input = new Input(
    () => {
      scheduler.setActive(false);
      prediction.clear();
    },
    undefined,
    undefined,
    () => scheduler.request(),
  );
  const key = (type: string, code: string) =>
    win.dispatchEvent(Object.assign(new Event(type), { code, repeat: false }));
  scheduler.setActive(true);
  sockets[0].bufferedAmount = 64 * 1024 + 1;
  touch.dispatchEvent(
    Object.assign(new Event("pointerdown"), { pointerId: 1 }),
  );
  touch.dispatchEvent(new Event("pointerup"));
  key("keydown", "Space");
  key("keyup", "Space");
  await vi.advanceTimersByTimeAsync(1);
  expect(seq).toBe(0);
  expect(prediction.diagnostics(now()).pendingInputs).toBe(0);
  sockets[0].bufferedAmount = 0;
  key("keydown", "KeyD");
  await vi.advanceTimersByTimeAsync(9);
  expect(seq).toBe(1);
  expect(JSON.parse(sockets[0].sent[0])).toMatchObject({
    seq: 1,
    move: 1,
    jump: false,
    jumpPressed: true,
    hitHeld: false,
    hitPressed: true,
  });
  expect(prediction.diagnostics(now()).fixedSteps).toBe(0); // Acceptance is not a physics tick.
  await vi.advanceTimersByTimeAsync(17);
  expect(JSON.parse(sockets[0].sent[1])).toMatchObject({
    seq: 2,
    jumpPressed: false,
    hitPressed: false,
  });
  win.dispatchEvent(new Event("blur"));
  expect(prediction.diagnostics(now()).pendingInputs).toBe(0);
  await vi.advanceTimersByTimeAsync(100);
  expect(sockets[0].sent).toHaveLength(2);
});
