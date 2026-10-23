import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer, request } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    dist: {
      type: "string",
      default: process.env.BADMINTON_VERIFY_DIST_ROOT ?? "dist",
    },
    port: { type: "string", default: "18926" },
    "backend-port": { type: "string", default: "18925" },
  },
});
const port = Number(values.port),
  backendPort = Number(values["backend-port"]);
if (
  ![port, backendPort].every(
    (n) => Number.isInteger(n) && n > 1024 && n <= 65535,
  ) ||
  port === backendPort
)
  throw new Error("Use two distinct unprivileged local ports");
const project = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const buildRoot = resolve(project, values.dist);
const root = resolve(buildRoot, "client");
// Keep identical to the formal Canvas baseline, including absence of Cache-Control.
const csp =
  "default-src 'self'; img-src 'self' blob:; connect-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'self'";
const backend = spawn(
  process.execPath,
  [resolve(buildRoot, "server/index.js")],
  {
    cwd: project,
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(backendPort),
      ALLOWED_ORIGINS: `http://127.0.0.1:${port}`,
    },
    stdio: ["ignore", "inherit", "inherit"],
  },
);
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
};
const server = createServer(async (req, res) => {
  if (req.url === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url?.startsWith("/badminton-h5-online/api/")) {
    const upstream = request(
      {
        hostname: "127.0.0.1",
        port: backendPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (reply) => {
        res.writeHead(reply.statusCode, reply.headers);
        reply.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
    return;
  }
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/badminton-h5-online/")) throw Error("route");
    const relative = decodeURIComponent(
      url.pathname.slice("/badminton-h5-online".length),
    );
    const path = resolve(
      root,
      "." + relative + (relative.endsWith("/") ? "index.html" : ""),
    );
    if (!path.startsWith(root + sep)) throw Error("path");
    const data = await readFile(path);
    res.writeHead(200, {
      "Content-Length": data.length,
      "Content-Type": mime[extname(path)] ?? "application/octet-stream",
      "Content-Security-Policy": csp,
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("missing");
  }
});
server.on("upgrade", (req, socket, head) => {
  const proxy = request({
    hostname: "127.0.0.1",
    port: backendPort,
    path: req.url,
    headers: req.headers,
  });
  proxy.on("upgrade", (reply, peer, buffer) => {
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        Object.entries(reply.headers)
          .map(([k, v]) => k + ": " + v + "\r\n")
          .join("") +
        "\r\n",
    );
    if (head.length) peer.write(head);
    if (buffer.length) socket.write(buffer);
    peer.pipe(socket);
    socket.pipe(peer);
    peer.on("error", () => socket.destroy());
    socket.on("error", () => peer.destroy());
  });
  proxy.on("response", (reply) =>
    socket.end(
      "HTTP/1.1 " + reply.statusCode + " Rejected\r\nConnection: close\r\n\r\n",
    ),
  );
  proxy.on("error", () => socket.destroy());
  proxy.end();
});
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  backend.kill("SIGTERM");
  server.close();
  setTimeout(() => process.exit(code), 500).unref();
}
backend.on("error", (error) => {
  console.error(error);
  close(1);
});
backend.on("exit", (code) => {
  if (!closing) close(code || 1);
});
server.on("error", (error) => {
  console.error(error);
  close(1);
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Isolated ${buildRoot}: http://127.0.0.1:${port}/badminton-h5-online/ (backend ${backendPort}; baseline HTTP cache policy)`,
  ),
);
process.on("SIGTERM", () => close());
process.on("SIGINT", () => close());
