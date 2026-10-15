import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { WebSocket } from "ws";
const origin = process.argv[2] ?? "https://www.firesoul.cn";
const base = new URL("/badminton-h5-online/", origin);
const page = await fetch(base);
assert.equal(page.status, 200);
const html = await page.text();
assert.ok(html.includes("<title>FisoOnline</title>"));
assert.ok(html.includes("火柴人羽毛球"));
const assets = [
  ...html.matchAll(/(?:src|href)="(\/badminton-h5-online\/assets\/[^\"]+)"/g),
].map((match) => match[1]);
assert.ok(assets.length >= 2);
for (const path of assets) {
  const res = await fetch(new URL(path, origin));
  assert.equal(res.status, 200);
  assert.ok(Number(res.headers.get("content-length")) > 0);
}
const health = await fetch(new URL("api/health", base));
assert.equal(health.status, 200);
const status = await health.json();
assert.equal(status.ok, true);
assert.equal(status.protocol, 4);
assert.equal(status.simulationHz, 60);
assert.equal(status.snapshotHz, 30);
const artResponse = await fetch(new URL("classic/manifest.json", base));
assert.equal(artResponse.status, 200);
const art = await artResponse.json();
assert.equal(art.schema, 2);
assert.equal(art.fps, 60);
assert.deepEqual(art.coordinateSystem, { width: 640, height: 426 });
assert.equal(
  art.source.swfSha256,
  "cab8a824c54af3a0b9454ef30fcbcabc532931f2a96717239fabd58f57e59912",
);
assert.equal(art.netFrames.length, 24);
for (const frame of [
  art.background,
  art.courtBrand,
  art.shuttle,
  art.netFrames[1],
]) {
  const response = await fetch(new URL(`classic/${frame.path}`, base));
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("content-type")?.includes("image/svg+xml"));
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.toString().includes("<svg"));
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    art.files[frame.path],
  );
}
const session = await fetch(new URL("api/session", base));
assert.equal(session.status, 200);
const setCookie = session.headers.get("set-cookie");
assert.ok(setCookie?.includes("HttpOnly"));
assert.ok(setCookie.includes("SameSite=Lax"));
if (base.protocol === "https:") assert.ok(setCookie.includes("Secure"));
const wsUrl = new URL("ws", base);
wsUrl.protocol = base.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(wsUrl, "badminton-v4", {
  headers: { Cookie: setCookie.split(";")[0], Origin: new URL(origin).origin },
});
const greeting = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    ws.terminate();
    reject(new Error("WebSocket timed out"));
  }, 5000);
  ws.once("error", (error) => {
    clearTimeout(timeout);
    reject(error);
  });
  ws.once("message", (raw) => {
    clearTimeout(timeout);
    resolve(JSON.parse(raw.toString()));
  });
});
assert.equal(greeting.type, "hello");
assert.equal(greeting.protocol, 4);
ws.close();
const existing = [];
for (const path of [
  "/badminton/",
  "/badminton-original/",
  "/badminton-cloud/",
]) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200);
  existing.push({ path, status: response.status });
}
console.log(
  JSON.stringify(
    {
      origin,
      page: page.status,
      assets: assets.length,
      health: status.ok,
      classicArt:
        "source record, 640x426, 60 fps, 24 net frames and 4 SVG hashes checked",
      cookie: "HttpOnly/SameSite checked",
      websocket: "hello protocol=4",
      existing,
    },
    null,
    2,
  ),
);
