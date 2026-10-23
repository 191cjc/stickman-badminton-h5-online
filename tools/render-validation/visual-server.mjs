import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createServer } from "vite";

const { values } = parseArgs({
  options: { port: { type: "string", default: "18927" } },
});
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const server = await createServer({
  root,
  configFile: false,
  base: "/badminton-h5-online/",
  server: { host: "127.0.0.1", port: Number(values.port), strictPort: true },
});
await server.listen();
console.log(
  `Fixed-state fixture: http://127.0.0.1:${values.port}/badminton-h5-online/tools/render-validation/fixture.html`,
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await server.close();
    process.exit(0);
  });
