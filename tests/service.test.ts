import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import { performance } from "node:perf_hooks";
import { createGameService } from "../src/server/service";
import {
  BASE_PATH,
  PROTOCOL,
  SIM_HZ,
  SUBPROTOCOL,
  parseClientMessage,
} from "../src/shared/protocol";
import type { CharacterId } from "../src/shared/classic/characters";
import { CLASSIC_WORLD } from "../src/shared/classic/types";
import type {
  ClientMessage,
  ServerMessage,
  Snapshot,
} from "../src/shared/protocol";

class Peer {
  messages: ServerMessage[] = [];
  seq = 0;
  constructor(readonly ws: WebSocket) {
    ws.on("message", (raw) =>
      this.messages.push(JSON.parse(raw.toString()) as ServerMessage),
    );
  }
  send(message: ClientMessage): void {
    this.ws.send(JSON.stringify(message));
  }
  input(move: -1 | 0 | 1, hitPressed = false): void {
    this.send({
      type: "input",
      seq: ++this.seq,
      move,
      jump: false,
      jumpPressed: false,
      hitHeld: hitPressed,
      hitPressed,
    });
  }
  async wait<T extends ServerMessage["type"]>(
    type: T,
    predicate: (message: Extract<ServerMessage, { type: T }>) => boolean = () =>
      true,
    timeout = 5000,
  ): Promise<Extract<ServerMessage, { type: T }>> {
    const end = performance.now() + timeout;
    while (performance.now() < end) {
      const index = this.messages.findIndex(
        (message) =>
          message.type === type &&
          predicate(message as Extract<ServerMessage, { type: T }>),
      );
      if (index >= 0)
        return this.messages.splice(index, 1)[0] as Extract<
          ServerMessage,
          { type: T }
        >;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Timeout waiting for ${type}`);
  }
}
describe("real HTTP / WebSocket rooms", () => {
  let service: ReturnType<typeof createGameService>;
  let base: string;
  const peers: Peer[] = [];
  const events: Record<string, unknown>[] = [];
  async function startService(): Promise<void> {
    events.length = 0;
    service = createGameService({
      origins: ["http://test.local"],
      secret: "test-secret-kept-out-of-protocol",
      reconnectMs: 700,
      resultMs: 700,
      inputTimeoutMs: 120,
      logger: (event) => events.push(event),
    });
    await new Promise<void>((resolve) =>
      service.http.listen(0, "127.0.0.1", resolve),
    );
    base = `http://127.0.0.1:${(service.http.address() as AddressInfo).port}`;
  }
  beforeEach(startService);
  afterEach(async () => {
    try {
      peers.splice(0).forEach((peer) => peer.ws.terminate());
      await service.close();
    } finally {
      vi.useRealTimers();
    }
  });
  async function cookie(existing?: string): Promise<string> {
    const res = await fetch(`${base}${BASE_PATH}api/session`, {
      headers: existing ? { Cookie: existing } : {},
    });
    expect(res.status).toBe(200);
    return res.headers.get("set-cookie")!.split(";")[0];
  }
  function rawConnect(
    identity?: string,
    origin = "http://test.local",
    protocol = SUBPROTOCOL,
  ): WebSocket {
    return new WebSocket(
      `${base.replace("http:", "ws:")}${BASE_PATH}ws`,
      protocol,
      {
        headers: { Origin: origin, ...(identity ? { Cookie: identity } : {}) },
      },
    );
  }
  async function connect(identity: string): Promise<Peer> {
    const peer = new Peer(rawConnect(identity));
    peers.push(peer);
    await peer.wait("hello");
    return peer;
  }
  async function rejected(
    identity: string | undefined,
    code: number,
    origin?: string,
  ): Promise<void> {
    const ws = rawConnect(identity, origin);
    ws.on("error", () => {});
    const status = await new Promise<number>((resolve) =>
      ws.once("unexpected-response", (_request, response) => {
        response.resume();
        ws.terminate();
        resolve(response.statusCode!);
      }),
    );
    expect(status).toBe(code);
  }
  async function pair(
    leftCharacter: CharacterId = "joe",
    rightCharacter: CharacterId = "joe",
  ): Promise<[Peer, Peer, string]> {
    const identity = await cookie();
    const left = await connect(identity);
    const right = await connect(await cookie());
    left.send({ type: "queue", character: leftCharacter });
    right.send({ type: "queue", character: rightCharacter });
    const l = await left.wait("matched");
    const r = await right.wait("matched");
    expect(l.side).toBe("left");
    expect(r.side).toBe("right");
    expect(r.room).toBe(l.room);
    return [left, right, identity];
  }
  it("issues a persistent signed HttpOnly cookie and rejects forged, foreign-origin and duplicate connections", async () => {
    const res = await fetch(`${base}${BASE_PATH}api/session`);
    const header = res.headers.get("set-cookie")!;
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain(`Path=${BASE_PATH}`);
    const identity = header.split(";")[0];
    expect(await cookie(identity)).toBe(identity);
    await rejected(undefined, 401);
    await rejected(identity.replace(/.$/, "x"), 401);
    await rejected(identity, 403, "https://foreign.example");
    await connect(identity);
    await rejected(identity, 409);
    expect((await fetch(`${base}${BASE_PATH}api/health`)).status).toBe(200);
  });
  it.each(["badminton-v1", "badminton-v2"])(
    "negotiates the new cadence and closes a legacy page before it can claim a connection or match (%s)",
    async (legacyProtocol) => {
      const identity = await cookie();
      const legacy = rawConnect(identity, "http://test.local", legacyProtocol);
      const messages: ServerMessage[] = [];
      legacy.on("message", (raw) =>
        messages.push(JSON.parse(raw.toString()) as ServerMessage),
      );
      const closed = new Promise<{ code: number; reason: string }>(
        (resolve) => {
          legacy.once("close", (code, reason) =>
            resolve({ code, reason: reason.toString() }),
          );
        },
      );
      legacy.once("open", () =>
        legacy.send(JSON.stringify({ type: "queue", character: "joe" })),
      );
      expect(await closed).toEqual({ code: 1008, reason: "protocol_mismatch" });
      expect(messages).toEqual([{ type: "error", code: "protocol_mismatch" }]);
      expect(service.stats()).toMatchObject({ rooms: 0, queued: 0 });
      const current = await connect(identity);
      current.send({ type: "queue", character: "joe" });
      await current.wait("queued");
      // Legacy pages report their version mismatch even while this guest has an
      // active current connection; they cannot replace it or change its queued role.
      const stale = new Peer(
        rawConnect(identity, "http://test.local", legacyProtocol),
      );
      peers.push(stale);
      const staleClosed = new Promise<{ code: number; reason: string }>(
        (resolve) => {
          stale.ws.once("close", (code, reason) =>
            resolve({ code, reason: reason.toString() }),
          );
        },
      );
      expect(await stale.wait("error")).toEqual({
        type: "error",
        code: "protocol_mismatch",
      });
      expect(await staleClosed).toEqual({
        code: 1008,
        reason: "protocol_mismatch",
      });
      expect(current.ws.readyState).toBe(WebSocket.OPEN);
      expect(service.stats()).toMatchObject({ rooms: 0, queued: 1 });
      current.send({ type: "queue", character: "joe" });
      expect(await current.wait("queued")).toEqual({
        type: "queued",
        character: "joe",
      });
      const health = await (
        await fetch(`${base}${BASE_PATH}api/health`)
      ).json();
      expect(health).toMatchObject({
        protocol: PROTOCOL,
        simulationHz: 60,
        snapshotHz: 30,
      });
    },
  );
  it("sends exactly the same original ball and score to both seats at the same authoritative tick", async () => {
    const [left, right] = await pair();
    left.input(0, true);
    const a = await left.wait("snapshot", (s) => s.tick >= 10 && s.ack === 1);
    const b = await right.wait("snapshot", (s) => s.tick === a.tick);
    expect(a.state.version).toBe("flash-90302-v2");
    expect(a.state.shuttle.state).toBe("flying");
    expect(a.state).toEqual(b.state);
    expect(b.ack).toBe(0);
  });
  it.each([
    { type: ["queue"] },
    { type: ["cancel"] },
    { type: ["leave"] },
    { type: ["release"] },
    { type: [["queue"]] },
    { type: [["cancel"]] },
    { type: [["leave"]] },
    { type: [["release"]] },
    { type: null },
    { type: 1 },
    { type: true },
    { type: {} },
  ])(
    "closes authenticated malformed commands with invalid_message: %j",
    async (message) => {
      const peer = await connect(await cookie());
      const closed = new Promise<{ code: number; reason: string }>(
        (resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Malformed command was not closed")),
            1000,
          );
          peer.ws.once("close", (code, reason) => {
            clearTimeout(timeout);
            resolve({ code, reason: reason.toString() });
          });
        },
      );
      peer.ws.send(JSON.stringify(message));
      expect(await closed).toEqual({ code: 1008, reason: "invalid_message" });
    },
  );
  it("matches two guests, binds inputs to their own sides, clears stale input and refuses third-party seat fields", async () => {
    const [left, right] = await pair();
    left.input(1);
    right.input(-1);
    const l = await left.wait("snapshot", (message) => message.ack >= 1);
    const r = await right.wait("snapshot", (message) => message.ack >= 1);
    expect(l.state.players.left.x).toBeGreaterThan(150);
    expect(r.state.players.right.x).toBeLessThan(500);
    const stopped = await left.wait(
      "snapshot",
      (message) =>
        message.state.players.left.vx === 0 &&
        message.tick > l.tick + SIM_HZ / 3,
    );
    expect(stopped.state.players.left.x).toBeLessThan(190);
    const outsider = await connect(await cookie());
    outsider.input(1);
    expect((await outsider.wait("error")).code).toBe("not_in_match");
    outsider.ws.send(
      JSON.stringify({
        type: "input",
        seq: 2,
        move: 1,
        jump: false,
        jumpPressed: false,
        hitHeld: false,
        hitPressed: false,
        side: "left",
      }),
    );
    expect(
      await new Promise<number>((resolve) =>
        outsider.ws.once("close", (code) => resolve(code)),
      ),
    ).toBe(1008);
    left.send({ type: "release" });
    left.send({ type: "leave" });
    const result = await right.wait("result");
    expect(result.reason).toBe("leave");
    expect(result.winner).toBe("right");
    left.send({ type: "queue", character: "joe" });
    right.send({ type: "queue", character: "joe" });
    expect((await left.wait("matched")).room).not.toBe(l.room);
  });
  it("samples packet bursts once using the latest held motion and preserving action edges", async () => {
    const [left] = await pair();
    for (let seq = 1; seq <= 30; seq++) {
      left.send({
        type: "input",
        seq,
        move: seq === 30 ? 0 : seq === 2 ? -1 : 1,
        jump: seq === 1,
        jumpPressed: seq === 1,
        hitHeld: seq === 2,
        hitPressed: seq === 2,
      });
    }
    const state = await left.wait("snapshot", (s) => s.ack === 30);
    expect(state.state.players.left.x).toBe(150);
    expect(state.state.players.left.y).toBeLessThan(CLASSIC_WORLD.groundY);
    expect(state.state.players.left.swingKind).toBe("serve");
    expect(state.state.players.left.swinging).toBe(true);
    const next = await left.wait("snapshot", (s) => s.tick > state.tick);
    // Thirty packets do not advance thirty input frames; one press starts one
    // original timeline, and its held latch clears on the newest released state.
    expect(next.state.players.left.x).toBe(150);
    expect(next.state.players.left.hitLatched).toBe(false);
    expect(next.state.players.left.swingFrame).toBeGreaterThan(
      state.state.players.left.swingFrame,
    );
  });
  it("freezes validated queue choices, allows identical roles, and restores retained seat character", async () => {
    const identity = await cookie(),
      a = await connect(identity);
    a.send({ type: "queue", character: "toaster" });
    expect((await a.wait("queued")).character).toBe("toaster");
    a.send({ type: "queue", character: "toaster" });
    await a.wait("queued");
    expect(service.stats().queued).toBe(1);
    a.send({ type: "queue", character: "pirate" });
    expect((await a.wait("error")).code).toBe("already_queued");
    const b = await connect(await cookie());
    b.send({ type: "queue", character: "pirate" });
    const matched = await a.wait("matched");
    await b.wait("matched");
    expect(matched.characters).toEqual({ left: "toaster", right: "pirate" });
    const initial = await a.wait("snapshot");
    expect(initial.state.players.left.characterId).toBe("toaster");
    expect(initial.state.players.right.characterId).toBe("pirate");
    a.send({ type: "queue", character: "red" });
    expect((await a.wait("error")).code).toBe("already_in_match");
    await new Promise<void>((resolve) => {
      a.ws.once("close", () => resolve());
      a.ws.close();
    });
    await b.wait("snapshot", (s) => s.status === "reconnecting");
    const resumed = await connect(identity);
    expect((await resumed.wait("matched")).characters).toEqual(
      matched.characters,
    );
    const state = await resumed.wait("snapshot");
    expect(state.state.players.left.characterId).toBe("toaster");
    resumed.send({ type: "leave" });
    await b.wait("result");
    resumed.send({ type: "queue", character: "red" });
    b.send({ type: "queue", character: "red" });
    const same = await resumed.wait("matched");
    await b.wait("matched");
    expect(same.characters).toEqual({ left: "red", right: "red" });
    expect(same.room).not.toBe(matched.room);
  });
  it.each(["robot", "timmy", "joe-invalid", ["joe"], null])(
    "rejects invalid queue role %j before it can enter queue",
    async (character) => {
      const peer = await connect(await cookie());
      const closed = new Promise<number>((resolve) =>
        peer.ws.once("close", (code) => resolve(code)),
      );
      peer.ws.send(JSON.stringify({ type: "queue", character }));
      expect(await closed).toBe(1008);
      expect(service.stats().queued).toBe(0);
    },
  );
  it("cancels queued guests and removes them when their connection closes", async () => {
    const peer = await connect(await cookie());
    peer.send({ type: "queue", character: "joe" });
    await peer.wait("queued");
    expect(service.stats().queued).toBe(1);
    peer.send({ type: "cancel" });
    await peer.wait("idle", (s) => s.reason === "cancelled");
    expect(service.stats().queued).toBe(0);
    peer.send({ type: "queue", character: "joe" });
    await peer.wait("queued");
    await new Promise<void>((resolve) => {
      peer.ws.once("close", () => resolve());
      peer.ws.close();
    });
    expect(service.stats().queued).toBe(0);
  });
  it("pauses, resumes with the same cookie and reclaims expired disconnected rooms", async () => {
    const [left, right, identity] = await pair();
    left.input(1);
    await left.wait("snapshot", (s) => s.ack === 1);
    left.ws.close();
    const paused = await right.wait(
      "snapshot",
      (s) => s.status === "reconnecting",
    );
    const resumed = await connect(identity);
    expect((await resumed.wait("matched")).resumed).toBe(true);
    const state = await resumed.wait("snapshot", (s) => s.status === "playing");
    resumed.seq = state.ack;
    resumed.input(0);
    const stopped = await resumed.wait(
      "snapshot",
      (s) => s.ack >= resumed.seq && s.state.players.left.vx === 0,
    );
    expect(stopped.state.score).toEqual(paused.state.score);
    resumed.ws.close();
    const result = await right.wait("result");
    expect(result.reason).toBe("disconnect");
    expect(result.winner).toBe("right");
    await right.wait("idle", (s) => s.reason === "disconnect");
    expect(service.stats().rooms).toBe(0);
  });
  it.each([true, false])(
    "expires reconnect during upgrade before collector (opponent online: %s)",
    async (opponentOnline) => {
      await service.close();
      // Freeze service intervals without mocking network events or polling timeouts.
      // Moving Date past the deadline then cannot let the collector mask upgrade.
      vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
      await startService();
      const [left, right, identity] = await pair();
      left.ws.close();
      const paused = await right.wait(
        "snapshot",
        (s) => s.status === "reconnecting",
      );
      if (!opponentOnline) {
        await new Promise<void>((resolve) => {
          right.ws.once("close", () => resolve());
          right.ws.close();
        });
        const end = performance.now() + 1000;
        while (
          !events.some(
            (event) =>
              event.event === "match_disconnected" && event.side === "right",
          )
        ) {
          if (performance.now() >= end)
            throw new Error("Server did not observe opponent disconnect");
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      vi.setSystemTime(Date.now() + 701);
      expect(service.stats().rooms).toBe(1);
      expect(events.some((event) => event.event === "room_reclaimed")).toBe(
        false,
      );
      const resumed = await connect(identity);
      const result = await resumed.wait("result");
      expect(result).toEqual({
        type: "result",
        reason: "disconnect",
        winner: opponentOnline ? "right" : null,
        score: paused.state.score,
      });
      await resumed.wait("idle", (s) => s.reason === "disconnect");
      expect(service.stats().rooms).toBe(0);
      expect(
        resumed.messages.some(
          (message) =>
            message.type === "matched" && message.room === paused.room,
        ),
      ).toBe(false);
      if (opponentOnline) {
        expect(await right.wait("result")).toEqual(result);
        await right.wait("idle", (s) => s.reason === "disconnect");
      }
      resumed.send({ type: "queue", character: "joe" });
      await resumed.wait("queued");
      expect(service.stats()).toMatchObject({ rooms: 0, queued: 1 });
    },
  );
  it("finishes an authoritative seven-point match with identical results on both connections", async () => {
    const [left, right] = await pair("toaster", "pirate");
    let latest: Snapshot | undefined;
    left.ws.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as ServerMessage;
      if (message.type === "snapshot") latest = message;
    });
    const delivered = {
      left: new Map<number, Snapshot["effects"]["events"][number]>(),
      right: new Map<number, Snapshot["effects"]["events"][number]>(),
    };
    for (const [peer, side] of [
      [left, "left"],
      [right, "right"],
    ] as const)
      peer.ws.on("message", (raw) => {
        const message = JSON.parse(raw.toString()) as ServerMessage;
        if (message.type === "snapshot")
          for (const event of message.effects.events)
            delivered[side].set(event.id, event);
      });
    const timer = setInterval(() => {
      if (!latest || latest.status !== "playing") return;
      for (const [peer, side] of [
        [left, "left"],
        [right, "right"],
      ] as const)
        peer.input(
          0,
          latest.state.shuttle.state === "attached" &&
            latest.state.server === side &&
            !latest.state.players[side].swinging,
        );
    }, 1000 / 60);
    try {
      const a = await left.wait("result", () => true, 35_000);
      const b = await right.wait("result", () => true, 2000);
      expect(a).toEqual(b);
      expect(a.reason).toBe("score");
      expect(Math.max(a.score.left, a.score.right)).toBe(7);
      const final = await left.wait("snapshot", (s) => s.status === "finished");
      const other = await right.wait(
        "snapshot",
        (s) => s.status === "finished" && s.tick === final.tick,
      );
      expect(final.state).toEqual(other.state);
      expect(final.effects).toEqual(other.effects);
      expect(final.resultReason).toBe("score");
      expect(
        [...delivered.left.values()].filter((e) => e.kind === "point"),
      ).toHaveLength(7);
      expect(
        [...delivered.left.values()].filter((e) => e.kind === "victory"),
      ).toHaveLength(1);
      expect([...delivered.left.values()]).toEqual([
        ...delivered.right.values(),
      ]);
    } finally {
      clearInterval(timer);
    }
  }, 40_000);
});
it("validates every field and rejects non-finite numbers, oversized directions and untrusted state", () => {
  const valid = {
    type: "input",
    seq: 1,
    move: 0,
    jump: false,
    jumpPressed: false,
    hitHeld: false,
    hitPressed: false,
  };
  expect(parseClientMessage(JSON.stringify(valid))).toEqual(valid);
  for (const changed of [
    { move: 2 },
    { seq: -1 },
    { seq: 1.5 },
    { jump: "yes" },
    { position: 999 },
    { room: "stolen" },
    { score: 7 },
  ])
    expect(
      parseClientMessage(JSON.stringify({ ...valid, ...changed })),
    ).toBeNull();
  expect(parseClientMessage('{"type":"ping","time":1e999}')).toBeNull();
  expect(parseClientMessage("null")).toBeNull();
});
