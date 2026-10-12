import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { performance } from "node:perf_hooks";
import { WebSocket, WebSocketServer } from "ws";
import { Simulation } from "../shared/simulation";
import { emptyIntent } from "../shared/state";
import {
  BASE_PATH,
  INPUT_TIMEOUT_MS,
  PROTOCOL,
  RECONNECT_MS,
  RESULT_MS,
  SIM_HZ,
  SNAPSHOT_HZ,
  parseClientMessage,
} from "../shared/protocol";
import type {
  ClientMessage,
  InputFrame,
  RoomStatus,
  ServerMessage,
} from "../shared/protocol";
import type { PlayerIntent, Side } from "../shared/types";

const COOKIE = "badminton_h5_guest";
const SIDES: Side[] = ["left", "right"];
interface Guest {
  id: string;
  socket?: WebSocket;
  room?: string;
  queuedAt?: number;
  seen: number;
}
interface Seat {
  guest: Guest;
  pending: InputFrame[];
  held: PlayerIntent;
  current: PlayerIntent;
  received: number;
  ack: number;
  currentSeq: number;
  lastInput: number;
  reconnectUntil?: number;
}
interface Room {
  id: string;
  simulation: Simulation;
  seats: Record<Side, Seat>;
  tick: number;
  status: RoomStatus;
  created: number;
  finishedAt?: number;
  result?: Extract<ServerMessage, { type: "result" }>;
}
export interface ServiceOptions {
  origins: string[];
  secret: string;
  secureCookie?: boolean;
  trustProxy?: boolean;
  reconnectMs?: number;
  resultMs?: number;
  inputTimeoutMs?: number;
  logger?: (event: Record<string, unknown>) => void;
}

export function createGameService(options: ServiceOptions) {
  const guests = new Map<string, Guest>();
  const rooms = new Map<string, Room>();
  const queue: Guest[] = [];
  const httpRate = new Map<string, { count: number; until: number }>();
  const reconnectMs = options.reconnectMs ?? RECONNECT_MS;
  const resultMs = options.resultMs ?? RESULT_MS;
  const inputTimeoutMs = options.inputTimeoutMs ?? INPUT_TIMEOUT_MS;
  const log = options.logger ?? (() => {});
  const sign = (id: string) =>
    createHmac("sha256", options.secret).update(id).digest("base64url");
  function cookieId(req: IncomingMessage): string | undefined {
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1);
    if (!token || !/^[a-f0-9]{48}\.[A-Za-z0-9_-]{43}$/.test(token)) return;
    const [id, signature] = token.split(".");
    if (timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id))))
      return id;
  }
  function json(res: ServerResponse, code: number, body: unknown): void {
    res.writeHead(code, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(body));
  }
  function rateLimit(req: IncomingMessage): boolean {
    const now = Date.now();
    const key =
      options.trustProxy && typeof req.headers["x-real-ip"] === "string"
        ? req.headers["x-real-ip"]
        : (req.socket.remoteAddress ?? "unknown");
    let bucket = httpRate.get(key);
    if (!bucket || bucket.until <= now) {
      bucket = { count: 0, until: now + 60_000 };
      httpRate.set(key, bucket);
    }
    return ++bucket.count <= 120;
  }
  const http = createServer((req, res) => {
    if (req.method !== "GET")
      return json(res, 405, { error: "method_not_allowed" });
    if (req.url === `${BASE_PATH}api/health`)
      return json(res, 200, {
        ok: true,
        protocol: PROTOCOL,
        simulationHz: SIM_HZ,
        snapshotHz: SNAPSHOT_HZ,
        rooms: rooms.size,
        queued: queue.length,
      });
    if (req.url !== `${BASE_PATH}api/session`)
      return json(res, 404, { error: "not_found" });
    if (req.headers.origin && !options.origins.includes(req.headers.origin))
      return json(res, 403, { error: "origin_rejected" });
    if (!rateLimit(req)) return json(res, 429, { error: "rate_limited" });
    const now = Date.now();
    let id = cookieId(req);
    if (!id) id = randomBytes(24).toString("hex");
    let guest = guests.get(id);
    if (!guest) {
      if (guests.size >= 5000) return json(res, 503, { error: "capacity" });
      guest = { id, seen: now };
      guests.set(id, guest);
    }
    guest.seen = now;
    res.setHeader(
      "Set-Cookie",
      `${COOKIE}=${id}.${sign(id)}; Path=${BASE_PATH}; HttpOnly; SameSite=Lax; Max-Age=2592000${options.secureCookie ? "; Secure" : ""}`,
    );
    json(res, 200, {
      protocol: PROTOCOL,
      reconnectMs,
      connected: !!guest.socket,
    });
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 1024,
    perMessageDeflate: false,
    handleProtocols: (protocols) =>
      protocols.has("badminton-v1") ? "badminton-v1" : false,
  });
  function send(guest: Guest, message: ServerMessage): void {
    const ws = guest.socket;
    if (ws?.readyState !== WebSocket.OPEN) return;
    // A slow client must not build an unbounded queue of obsolete snapshots.
    if (ws.bufferedAmount > 256 * 1024) {
      ws.terminate();
      return;
    }
    ws.send(JSON.stringify(message));
  }
  function removeQueue(guest: Guest): void {
    const index = queue.indexOf(guest);
    if (index >= 0) queue.splice(index, 1);
    guest.queuedAt = undefined;
  }
  function clearSeat(seat: Seat): void {
    seat.pending = [];
    seat.held = emptyIntent();
    seat.current = emptyIntent();
    seat.ack = seat.received;
    seat.currentSeq = seat.received;
  }
  function snapshot(room: Room): void {
    const now = Date.now();
    const remaining = Math.max(
      0,
      ...SIDES.map((side) => (room.seats[side].reconnectUntil ?? now) - now),
    );
    const state = room.simulation.snapshot();
    for (const side of SIDES)
      if (room.seats[side].guest.room === room.id)
        send(room.seats[side].guest, {
          type: "snapshot",
          room: room.id,
          tick: room.tick,
          ack: room.seats[side].ack,
          status: room.status,
          reconnectRemainingMs: remaining,
          state,
        });
  }
  function reclaim(room: Room, reason: string): void {
    rooms.delete(room.id);
    for (const side of SIDES) {
      const guest = room.seats[side].guest;
      if (guest.room === room.id) {
        guest.room = undefined;
        send(guest, { type: "idle", reason });
      }
    }
    log({ event: "room_reclaimed", room: room.id, reason });
  }
  function finish(
    room: Room,
    winner: Side | null,
    reason: Extract<ServerMessage, { type: "result" }>["reason"],
  ): void {
    if (room.status === "finished") return;
    room.status = "finished";
    room.finishedAt = Date.now();
    room.result = {
      type: "result",
      winner,
      reason,
      score: room.simulation.snapshot().score,
    };
    for (const side of SIDES) {
      clearSeat(room.seats[side]);
      send(room.seats[side].guest, room.result);
    }
    snapshot(room);
    log({ event: "match_finished", room: room.id, winner, reason });
  }
  function expireReconnect(room: Room, expired: Side): void {
    const other = expired === "left" ? "right" : "left";
    finish(room, room.seats[other].guest.socket ? other : null, "disconnect");
    reclaim(room, "disconnect");
  }
  function detachFinished(guest: Guest): void {
    if (!guest.room) return;
    const room = rooms.get(guest.room);
    guest.room = undefined;
    if (room && SIDES.every((side) => room.seats[side].guest.room !== room.id))
      reclaim(room, "finished");
  }
  function makeSeat(guest: Guest): Seat {
    return {
      guest,
      pending: [],
      held: emptyIntent(),
      current: emptyIntent(),
      received: 0,
      ack: 0,
      currentSeq: 0,
      lastInput: Date.now(),
    };
  }
  function match(): void {
    while (queue.length >= 2 && rooms.size < 100) {
      const left = queue.shift()!;
      const right = queue.shift()!;
      left.queuedAt = undefined;
      right.queuedAt = undefined;
      const room: Room = {
        id: randomUUID(),
        simulation: new Simulation(),
        tick: 0,
        status: "playing",
        created: Date.now(),
        seats: { left: makeSeat(left), right: makeSeat(right) },
      };
      rooms.set(room.id, room);
      for (const side of SIDES) {
        room.seats[side].guest.room = room.id;
        send(room.seats[side].guest, {
          type: "matched",
          room: room.id,
          side,
          resumed: false,
        });
      }
      snapshot(room);
      log({ event: "match_created", room: room.id });
    }
  }
  function handle(guest: Guest, message: ClientMessage): void {
    guest.seen = Date.now();
    if (message.type === "ping") {
      send(guest, { type: "pong", time: message.time });
      return;
    }
    const room = guest.room ? rooms.get(guest.room) : undefined;
    const side = room
      ? SIDES.find((s) => room.seats[s].guest === guest)
      : undefined;
    const seat = room && side ? room.seats[side] : undefined;
    if (message.type === "queue") {
      if (room && room.status !== "finished") {
        send(guest, { type: "error", code: "already_in_match" });
        return;
      }
      detachFinished(guest);
      if (!guest.queuedAt) {
        guest.queuedAt = Date.now();
        queue.push(guest);
      }
      send(guest, { type: "queued" });
      match();
      return;
    }
    if (message.type === "cancel") {
      if (room && room.status !== "finished") {
        send(guest, { type: "error", code: "already_in_match" });
        return;
      }
      removeQueue(guest);
      send(guest, { type: "idle", reason: "cancelled" });
      return;
    }
    if (message.type === "leave") {
      removeQueue(guest);
      if (room && side)
        finish(room, side === "left" ? "right" : "left", "leave");
      detachFinished(guest);
      send(guest, { type: "idle", reason: "left" });
      return;
    }
    if (message.type === "release") {
      if (seat) clearSeat(seat);
      return;
    }
    if (message.type !== "input") return;
    if (!seat || !room) {
      send(guest, { type: "error", code: "not_in_match" });
      return;
    }
    if (message.seq !== seat.received + 1) {
      guest.socket?.close(1008, "invalid_sequence");
      return;
    }
    seat.received = message.seq;
    seat.lastInput = Date.now();
    if (room.status !== "playing") {
      clearSeat(seat);
      return;
    }
    if (seat.pending.length >= 120) {
      guest.socket?.close(1008, "input_backlog");
      return;
    }
    seat.pending.push(message);
  }
  http.on("upgrade", (req, socket, head) => {
    const reject = (code: number, reason: string) => {
      socket.write(
        `HTTP/1.1 ${code} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
      );
      socket.destroy();
    };
    if (req.url !== `${BASE_PATH}ws`) return reject(404, "Not Found");
    if (!req.headers.origin || !options.origins.includes(req.headers.origin))
      return reject(403, "Forbidden");
    if (
      !req.headers["sec-websocket-protocol"]
        ?.split(",")
        .map((x) => x.trim())
        .includes("badminton-v1")
    )
      return reject(400, "Bad Request");
    const id = cookieId(req);
    const guest = id ? guests.get(id) : undefined;
    if (!guest) return reject(401, "Unauthorized");
    if (guest.socket) return reject(409, "Conflict");
    wss.handleUpgrade(req, socket, head, (ws) => {
      guest.socket = ws;
      guest.seen = Date.now();
      let count = 0;
      let countStart = Date.now();
      let alive = true;
      send(guest, { type: "hello", protocol: PROTOCOL, reconnectMs });
      const room = guest.room ? rooms.get(guest.room) : undefined;
      if (room) {
        const side = SIDES.find((s) => room.seats[s].guest === guest)!;
        const seat = room.seats[side];
        if (
          seat.reconnectUntil &&
          Date.now() >= seat.reconnectUntil &&
          room.status !== "finished"
        ) {
          expireReconnect(room, side);
        } else {
          seat.reconnectUntil = undefined;
          clearSeat(seat);
          if (
            room.status === "reconnecting" &&
            SIDES.every(
              (s) =>
                room.seats[s].guest.socket && !room.seats[s].reconnectUntil,
            )
          )
            room.status = "playing";
          send(guest, { type: "matched", room: room.id, side, resumed: true });
          if (room.result) send(guest, room.result);
          snapshot(room);
        }
      } else send(guest, { type: "idle" });
      ws.on("message", (data, binary) => {
        if (binary) {
          ws.close(1008, "text_only");
          return;
        }
        const now = Date.now();
        if (now - countStart >= 1000) {
          count = 0;
          countStart = now;
        }
        if (++count > 180) {
          ws.close(1008, "rate_limited");
          return;
        }
        const message = parseClientMessage(data.toString());
        if (!message) {
          ws.close(1008, "invalid_message");
          return;
        }
        handle(guest, message);
      });
      ws.on("pong", () => {
        alive = true;
      });
      ws.on("error", () => {});
      const heartbeat = setInterval(() => {
        if (!alive) {
          ws.terminate();
          return;
        }
        alive = false;
        ws.ping();
      }, 5000);
      ws.on("close", () => {
        clearInterval(heartbeat);
        if (guest.socket !== ws) return;
        guest.socket = undefined;
        guest.seen = Date.now();
        removeQueue(guest);
        const active = guest.room ? rooms.get(guest.room) : undefined;
        if (active && active.status !== "finished") {
          const side = SIDES.find((s) => active.seats[s].guest === guest)!;
          active.seats[side].reconnectUntil = Date.now() + reconnectMs;
          active.status = "reconnecting";
          for (const s of SIDES) clearSeat(active.seats[s]);
          snapshot(active);
          log({ event: "match_disconnected", room: active.id, side });
        }
      });
    });
  });
  function step(): void {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.status !== "playing") continue;
      if (room.tick % 2 === 0) {
        for (const side of SIDES) {
          const seat = room.seats[side];
          if (now - seat.lastInput > inputTimeoutMs) clearSeat(seat);
          const input = seat.pending.at(-1);
          if (input) {
            seat.current = { ...input, pausePressed: false };
            seat.current.jumpPressed = seat.pending.some(
              (frame) => frame.jumpPressed,
            );
            const hit = seat.pending
              .slice()
              .reverse()
              .find((frame) => frame.hitPressed);
            seat.current.hitPressed = !!hit;
            if (hit) {
              seat.current.hitMove = hit.move;
              seat.current.hitJump = hit.jump;
            }
            seat.currentSeq = input.seq;
            seat.held = {
              ...seat.current,
              jumpPressed: false,
              hitPressed: false,
              hitMove: undefined,
              hitJump: undefined,
            };
            seat.pending = [];
          } else seat.current = seat.held;
        }
      }
      room.simulation.setIntents(
        room.seats.left.current,
        room.seats.right.current,
      );
      room.simulation.update(1 / SIM_HZ);
      room.tick += 1;
      for (const side of SIDES) {
        const seat = room.seats[side];
        seat.current = {
          ...seat.current,
          jumpPressed: false,
          hitPressed: false,
        };
        if (room.tick % 2 === 0) seat.ack = seat.currentSeq;
      }
      const state = room.simulation.snapshot();
      if (state.phase === "matchEnd") finish(room, state.winner, "score");
      else if (room.tick % 4 === 0) snapshot(room);
    }
  }
  let accumulator = 0;
  let previous = performance.now();
  let broadcastTicks = 0;
  const ticker = setInterval(() => {
    const now = performance.now();
    accumulator += Math.min(now - previous, 100);
    previous = now;
    let steps = 0;
    while (accumulator >= 1000 / SIM_HZ && steps < 12) {
      step();
      accumulator -= 1000 / SIM_HZ;
      steps += 1;
      broadcastTicks += 1;
      if (broadcastTicks % 4 === 0)
        for (const room of rooms.values())
          if (room.status !== "playing") snapshot(room);
    }
  }, 4);
  const collector = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.status === "finished" && now - room.finishedAt! >= resultMs)
        reclaim(room, "finished");
      else if (room.status === "reconnecting") {
        const expired = SIDES.find(
          (s) =>
            room.seats[s].reconnectUntil !== undefined &&
            room.seats[s].reconnectUntil! <= now,
        );
        if (expired) expireReconnect(room, expired);
      } else if (now - room.created > 20 * 60_000) {
        finish(room, null, "timeout");
        reclaim(room, "timeout");
      }
    }
    for (const guest of [...queue])
      if (now - guest.queuedAt! > 120_000) {
        removeQueue(guest);
        send(guest, { type: "idle", reason: "queue_timeout" });
      }
    for (const [id, guest] of guests)
      if (
        !guest.socket &&
        !guest.room &&
        !guest.queuedAt &&
        now - guest.seen > 24 * 3600_000
      )
        guests.delete(id);
    for (const [key, bucket] of httpRate)
      if (bucket.until <= now) httpRate.delete(key);
    match();
  }, 100);
  return {
    http,
    stats: () => ({
      rooms: rooms.size,
      queued: queue.length,
      guests: guests.size,
    }),
    close: async () => {
      clearInterval(ticker);
      clearInterval(collector);
      for (const ws of wss.clients) ws.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      if (http.listening)
        await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}
