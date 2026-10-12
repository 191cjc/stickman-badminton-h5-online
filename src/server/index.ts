import { randomBytes } from "node:crypto";
import { createGameService } from "./service";

const production = process.env.NODE_ENV === "production";
if (
  production &&
  (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET.length < 32)
)
  throw new Error(
    "Production requires COOKIE_SECRET of at least 32 characters.",
  );
const service = createGameService({
  origins: (
    process.env.ALLOWED_ORIGINS ?? "http://127.0.0.1:5184,http://localhost:5184"
  ).split(","),
  secret: process.env.COOKIE_SECRET ?? randomBytes(32).toString("hex"),
  secureCookie: production,
  trustProxy: production,
  logger: (event) =>
    process.stdout.write(
      JSON.stringify({ at: new Date().toISOString(), ...event }) + "\n",
    ),
});
const port = Number(process.env.PORT ?? 8794);
service.http.listen(port, "127.0.0.1", () =>
  process.stdout.write(`Badminton H5 online listening at 127.0.0.1:${port}\n`),
);
let closing = false;
async function shutdown(): Promise<void> {
  if (closing) return;
  closing = true;
  await service.close();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
