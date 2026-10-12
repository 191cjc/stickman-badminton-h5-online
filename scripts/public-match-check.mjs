import assert from "node:assert/strict";
import { WebSocket } from "ws";
const origin = process.argv[2] ?? "https://www.firesoul.cn";
const base = new URL("/badminton-h5-online/", origin);
const players = [];
async function connect() {
  const session = await fetch(new URL("api/session", base));
  assert.equal(session.status, 200);
  const url = new URL("ws", base);
  url.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(url, "badminton-v1", {
    headers: {
      Origin: new URL(origin).origin,
      Cookie: session.headers.get("set-cookie").split(";")[0],
    },
  });
  const player = { ws, messages: [], seq: 0, latest: undefined };
  ws.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    player.messages.push(message);
    if (message.type === "snapshot") player.latest = message;
  });
  ws.on("error", () => {});
  players.push(player);
  await wait(player, "hello");
  return player;
}
async function wait(player, type, predicate = () => true, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const index = player.messages.findIndex(
      (message) => message.type === type && predicate(message),
    );
    if (index >= 0) return player.messages.splice(index, 1)[0];
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${type}`);
}
function send(player, message) {
  player.ws.send(JSON.stringify(message));
}
let timer;
try {
  const left = await connect();
  const right = await connect();
  send(left, { type: "queue" });
  send(right, { type: "queue" });
  const l = await wait(left, "matched");
  const r = await wait(right, "matched");
  assert.equal(l.side, "left");
  assert.equal(r.side, "right");
  assert.equal(l.room, r.room);
  let sampledJump = false;
  let sampledMove = false;
  let consistencyChecks = 0;
  const snapshots = new Map();
  for (const player of players)
    player.ws.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type !== "snapshot" || message.room !== l.room) return;
      const prior = snapshots.get(message.tick);
      if (prior) {
        assert.deepEqual(message.state, prior);
        snapshots.delete(message.tick);
        consistencyChecks++;
      } else snapshots.set(message.tick, message.state);
      if (message.state.players.left.y < 770) sampledJump = true;
      if (message.state.players.left.x < 318) sampledMove = true;
    });
  timer = setInterval(() => {
    if (!left.latest || left.latest.status !== "playing") return;
    for (const [player, side] of [
      [left, "left"],
      [right, "right"],
    ]) {
      const seq = ++player.seq;
      const state = left.latest.state;
      const hit =
        state.shuttle.state === "attached" &&
        state.server === side &&
        !state.players[side].swingType &&
        seq > 30;
      send(player, {
        type: "input",
        seq,
        move: side === "left" && seq <= 12 ? -1 : 0,
        jump: side === "left" && seq === 6,
        jumpPressed: side === "left" && seq === 6,
        hitHeld: hit,
        hitPressed: hit,
      });
    }
  }, 1000 / 60);
  const result = await wait(left, "result", () => true, 35_000);
  const other = await wait(right, "result");
  clearInterval(timer);
  assert.deepEqual(result, other);
  assert.equal(result.reason, "score");
  assert.equal(Math.max(result.score.left, result.score.right), 7);
  assert.ok(sampledJump);
  assert.ok(sampledMove);
  assert.ok(consistencyChecks > 10);
  send(left, { type: "queue" });
  send(right, { type: "queue" });
  const rematch = await wait(left, "matched");
  await wait(right, "matched");
  assert.notEqual(rematch.room, l.room);
  send(left, { type: "leave" });
  const forfeit = await wait(right, "result");
  assert.equal(forfeit.reason, "leave");
  send(right, { type: "leave" });
  console.log(
    JSON.stringify(
      {
        origin,
        independentCookies: 2,
        matched: true,
        movement: sampledMove,
        jump: sampledJump,
        identicalSnapshots: consistencyChecks,
        result,
        rematch: true,
        leave: true,
        browserStarted: false,
      },
      null,
      2,
    ),
  );
} finally {
  clearInterval(timer);
  for (const player of players) player.ws.close();
}
