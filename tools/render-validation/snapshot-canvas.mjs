import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    ref: { type: "string", default: "pre-pixijs-20261022" },
    output: {
      type: "string",
      default: "artifacts/pixi-migration/canvas-source",
    },
  },
});
const project = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const root = resolve(project, values.output);
// Read checkpoint files directly; never checkout/reset the current workspace.
const paths = execFileSync(
  "git",
  [
    "ls-tree",
    "-r",
    "--name-only",
    values.ref,
    "--",
    "src/client",
    "src/shared",
  ],
  { cwd: project, encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
if (!paths.length) throw Error("Checkpoint contains no source files");
for (const path of paths) {
  const destination = resolve(root, path.slice("src/".length));
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(
    destination,
    execFileSync("git", ["show", `${values.ref}:${path}`], {
      cwd: project,
      maxBuffer: 32 * 1024 * 1024,
    }),
  );
}
await writeFile(
  resolve(root, "CHECKPOINT.json"),
  JSON.stringify(
    {
      ref: values.ref,
      commit: execFileSync("git", ["rev-parse", `${values.ref}^{commit}`], {
        cwd: project,
        encoding: "utf8",
      }).trim(),
      files: paths.length,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Saved ${paths.length} unchanged checkpoint files to ${root}`);
