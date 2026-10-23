#!/usr/bin/env node
/** Lightweight build freshness/integrity check: no browser, bake or GPU needed. */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAtlasManifest } from "../../src/client/atlas-manifest.ts";
import { sha256 } from "./atlas-utils.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceDirectory = resolve(root, "public/classic");
const atlasDirectory = resolve(root, "public/classic-atlas");
const sourceBytes = await readFile(resolve(sourceDirectory, "manifest.json"));
const source = JSON.parse(sourceBytes);
for (const [path, expected] of Object.entries(source.files)) {
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(svg|mp3)$/.test(path))
    throw new Error("Invalid source path");
  if (sha256(await readFile(resolve(sourceDirectory, path))) !== expected)
    throw new Error(`Changed source file ${path}`);
}
const manifest = validateAtlasManifest(
  JSON.parse(await readFile(resolve(atlasDirectory, "manifest.json"))),
  sha256(sourceBytes),
  source,
);
const entries = [
  ...Object.values(manifest.variants).flatMap((variant) =>
    Object.values(variant.pages),
  ),
  ...Object.values(manifest.dom),
];
for (const image of entries) {
  const bytes = await readFile(resolve(atlasDirectory, image.path));
  if (sha256(bytes) !== image.sha256)
    throw new Error(`Changed atlas PNG ${image.path}`);
  if (
    bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    bytes.readUInt32BE(16) !== image.width ||
    bytes.readUInt32BE(20) !== image.height ||
    bytes[24] !== 8 ||
    bytes[25] !== 6
  )
    throw new Error(`Invalid RGBA8 PNG dimensions/format ${image.path}`);
}
process.stdout.write(
  `Atlas source/hash/format/group/budget checks passed (${entries.length} PNG references)\n`,
);
