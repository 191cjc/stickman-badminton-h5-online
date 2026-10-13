import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Network } from "../src/client/network";
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
  const fetcher = vi
    .fn()
    .mockResolvedValue({
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
  expect(network.send({ type: "queue" })).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(sockets).toHaveLength(0);
  expect(statuses.at(-1)).toContain("刷新");
});
it.each(["hello", "error"])(
  "stops reconnecting and discards gameplay on a %s version mismatch after upgrade",
  async (type) => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
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
