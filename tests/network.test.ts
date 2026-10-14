import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Network } from "../src/client/network";
import { Input } from "../src/client/input";
import { InputScheduler } from "../src/client/input-scheduler";
import { Prediction } from "../src/client/prediction";
import { Simulation } from "../src/shared/simulation";
import { PROTOCOL, SUBPROTOCOL } from "../src/shared/protocol";

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
      prediction.apply(frame, true, Date.now());
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
