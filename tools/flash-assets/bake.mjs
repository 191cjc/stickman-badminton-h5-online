#!/usr/bin/env node
import {
  readFile,
  writeFile,
  mkdir,
  rm,
  rename,
  readdir,
} from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import {
  alphaBounds,
  blitWithGutter,
  confettiDelta,
  lexical,
  packFragments,
  recolorBody,
  sha256,
  sourceGroups,
  splitBounds,
} from "./atlas-utils.mjs";

const require = createRequire(import.meta.url);
const EXPECTED_PLAYWRIGHT = "1.62.0";
const EXPECTED_CHROMIUM = "151.0.7922.34";
const ALGORITHM = "chromium-srgb-ceil-alpha0-maxrects-gutter2-pngbest-v2";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = resolve(ROOT, "public/classic");
const args = process.argv.slice(2);
const check = args.includes("--check");
const outputIndex = args.indexOf("--output");
if (
  (outputIndex >= 0 &&
    (!args[outputIndex + 1] || args[outputIndex + 1].startsWith("--"))) ||
  args.some(
    (arg, index) =>
      arg !== "--check" &&
      arg !== "--output" &&
      !(outputIndex >= 0 && index === outputIndex + 1),
  )
)
  throw new Error(
    "Usage: node tools/flash-assets/bake.mjs [--check] [--output directory]",
  );
const OUTPUT = resolve(
  ROOT,
  outputIndex >= 0 ? args[outputIndex + 1] : "public/classic-atlas",
);
if (
  OUTPUT === SOURCE ||
  SOURCE.startsWith(OUTPUT + "/") ||
  OUTPUT.startsWith(SOURCE + "/") ||
  OUTPUT === ROOT
)
  throw new Error("Atlas output must be separate from source files");
const STAGE = `${OUTPUT}.building-${process.pid}`;
const playwrightVersion = require("playwright/package.json").version;
if (playwrightVersion !== EXPECTED_PLAYWRIGHT)
  throw new Error(
    `Install playwright@${EXPECTED_PLAYWRIGHT}; found ${playwrightVersion}`,
  );
if (Number(process.versions.node.split(".")[0]) < 24)
  throw new Error("Node24+ required");
const sourceBytes = await readFile(resolve(SOURCE, "manifest.json"));
const source = JSON.parse(sourceBytes);
const sourceManifestSha256 = sha256(sourceBytes);
const inputs = new Map();
for (const [path, expectedHash] of Object.entries(source.files)) {
  if (
    !/^[a-zA-Z0-9_/-]+\.(svg|mp3)$/.test(path) ||
    path.split("/").includes("..")
  )
    throw new Error(`Unsafe source path ${path}`);
  const bytes = await readFile(resolve(SOURCE, path));
  if (sha256(bytes) !== expectedHash)
    throw new Error(
      `Changed source ${path}; regenerate the source manifest first`,
    );
  if (path.endsWith(".svg")) inputs.set(path, bytes.toString("utf8"));
}
await mkdir(STAGE, { recursive: true });
const browser = await chromium
  .launch({
    executablePath: chromium.executablePath(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--force-color-profile=srgb",
    ],
  })
  .catch(async (error) => {
    await rm(STAGE, { recursive: true, force: true });
    throw error;
  });
const chromiumVersion = browser.version();
if (chromiumVersion !== EXPECTED_CHROMIUM) {
  await browser.close();
  await rm(STAGE, { recursive: true, force: true });
  throw new Error(
    `Run npx playwright install chromium: expected Chromium${EXPECTED_CHROMIUM}, found ${chromiumVersion}`,
  );
}
const page = await browser.newPage({
  viewport: { width: 640, height: 426 },
  deviceScaleFactor: 1,
});
await page.goto("about:blank");
const rasterCache = new Map();
let renderedCount = 0;
async function rasterize(svg, width, height, identity) {
  const cached = rasterCache.get(identity);
  if (cached) return cached;
  const png = await page.evaluate(
    async ({ svg, width, height }) => {
      const url = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml" }),
      );
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", {
          willReadFrequently: true,
          colorSpace: "srgb",
        });
        context.drawImage(image, 0, 0, width, height);
        // Readback forces unchanged filter trees to finish before encoding.
        context.getImageData(0, 0, width, height);
        const encoded = canvas.toDataURL("image/png").split(",")[1];
        canvas.width = canvas.height = 0;
        return encoded;
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    { svg, width, height },
  );
  const decoded = PNG.sync.read(Buffer.from(png, "base64"));
  const raster = {
    width,
    height,
    data: decoded.data,
    bounds: alphaBounds(decoded),
  };
  rasterCache.set(identity, raster);
  renderedCount++;
  if (renderedCount % 50 === 0)
    process.stdout.write(`Baked ${renderedCount} unique rasters\n`);
  return raster;
}
const encoding = {
  strategy3Bytes: 0,
  strategy0Bytes: 0,
  selectedBytes: 0,
  strategy3Images: 0,
  strategy0Images: 0,
};
const encode = (raster) => {
  const options = {
    colorType: 6,
    inputColorType: 6,
    inputHasAlpha: true,
    deflateLevel: 9,
    filterType: -1,
  };
  const rle = PNG.sync.write(raster, { ...options, deflateStrategy: 3 });
  const standard = PNG.sync.write(raster, { ...options, deflateStrategy: 0 });
  // Both encode the identical RGBA8 raster. Preserve the old encoding on ties
  // and never increase a PNG's transfer size compared with strategy3.
  const preferStandard = standard.length < rle.length;
  const selected = preferStandard ? standard : rle;
  encoding.strategy3Bytes += rle.length;
  encoding.strategy0Bytes += standard.length;
  encoding.selectedBytes += selected.length;
  encoding.strategy3Images += Number(!preferStandard);
  encoding.strategy0Images += Number(preferStandard);
  return selected;
};
const manifest = {
  schema: 1,
  sourceManifestSha256,
  generator: {
    playwrightVersion,
    chromiumVersion,
    algorithm: ALGORITHM,
    nodeVersion: process.versions.node,
    platform: `${process.platform}-${process.arch}`,
    colorSpace: "srgb",
    alpha: "straight PNG; premultiply on GPU upload",
    pngEncoding: "RGBA8 adaptive filter; zlib9 min(strategy3,strategy0), ties3",
    mipmaps: false,
    gutter: 2,
  },
  variants: {},
  dom: {},
  confetti: { base: "confetti:black", delta: "confetti:delta" },
};
const report = {
  sourceManifestSha256,
  generator: manifest.generator,
  encoding,
  sourceSvgPaths: inputs.size,
  variants: {},
  dom: {},
  confetti: {},
};
const groups = sourceGroups(source);
const confettiFrame = source.effects.confetti.frames[0];
const template = inputs.get(confettiFrame.path);
const confettiHash = source.files[confettiFrame.path];
try {
  for (const [tier, density] of [
    ["hd", 4],
    ["sd", 2],
  ]) {
    const variant = { pages: {}, frames: {}, groups: {} };
    const groupReport = {};
    const confettiWidth = Math.ceil(confettiFrame.width * density);
    const confettiHeight = Math.ceil(confettiFrame.height * density);
    const black = await rasterize(
      recolorBody(template, "#000000"),
      confettiWidth,
      confettiHeight,
      `${confettiHash}:${density}:black`,
    );
    const white = await rasterize(
      recolorBody(template, "#ffffff"),
      confettiWidth,
      confettiHeight,
      `${confettiHash}:${density}:white`,
    );
    const delta = confettiDelta(black, white);
    let maxAlphaError = 0;
    let maxPremultipliedRgbError = 0;
    let totalPremultipliedError = 0;
    let samples = 0;
    const colors = [
      "000000",
      "ffffff",
      "ff0000",
      "00ff00",
      "0000ff",
      "12ab45",
      "808080",
      "fdfdfd",
      "010203",
    ];
    for (const color of colors) {
      const direct = await rasterize(
        recolorBody(template, `#${color}`),
        confettiWidth,
        confettiHeight,
        `${confettiHash}:${density}:${color}`,
      );
      const channels = [0, 2, 4].map(
        (start) => parseInt(color.slice(start, start + 2), 16) / 255,
      );
      for (let i = 0; i < direct.data.length; i += 4) {
        maxAlphaError = Math.max(
          maxAlphaError,
          Math.abs(direct.data[i + 3] - black.data[i + 3]),
        );
        for (let c = 0; c < 3; c++) {
          const predicted = black.data[i + c] + delta.data[i + c] * channels[c];
          const error =
            (Math.abs(predicted - direct.data[i + c]) * black.data[i + 3]) /
            255;
          maxPremultipliedRgbError = Math.max(maxPremultipliedRgbError, error);
          totalPremultipliedError += error;
          samples++;
        }
      }
    }
    if (maxAlphaError !== 0 || maxPremultipliedRgbError > 3)
      throw new Error(`Confetti affine basis fidelity failed for ${tier}`);
    report.confetti[tier] = {
      colors,
      maxAlphaError,
      maxPremultipliedRgbError,
      meanPremultipliedRgbError: totalPremultipliedError / samples,
      units: "8-bit channel values (0..255)",
      bounds: black.bounds,
    };
    for (const [group, frames] of groups) {
      const entries = [];
      const aliases = new Map();
      let originalRgbaBytes = 0;
      let trimmedRgbaBytes = 0;
      for (const frame of frames) {
        const frameDensity = frame.path.startsWith("effects/spark-")
          ? density / 2
          : density;
        const pixelWidth = Math.ceil(frame.width * frameDensity);
        const pixelHeight = Math.ceil(frame.height * frameDensity);
        const key = `${source.files[frame.path]}:${pixelWidth}:${pixelHeight}`;
        let alias = aliases.get(key);
        if (!alias) {
          const raster = await rasterize(
            inputs.get(frame.path),
            pixelWidth,
            pixelHeight,
            key,
          );
          alias = { paths: [], raster, sourceSha256: source.files[frame.path] };
          aliases.set(key, alias);
          originalRgbaBytes += pixelWidth * pixelHeight * 4;
          trimmedRgbaBytes += raster.bounds.width * raster.bounds.height * 4;
          splitBounds(raster.bounds).forEach((trim, index) =>
            entries.push({ id: `${key}:${index}`, alias: key, raster, trim }),
          );
        }
        alias.paths.push(frame.path);
      }
      if (group === "common") {
        for (const [path, raster] of [
          [manifest.confetti.base, black],
          [manifest.confetti.delta, delta],
        ]) {
          aliases.set(path, {
            paths: [path],
            raster,
            sourceSha256: confettiHash,
          });
          entries.push({ id: path, alias: path, raster, trim: black.bounds });
          originalRgbaBytes += raster.width * raster.height * 4;
          trimmedRgbaBytes += raster.bounds.width * raster.bounds.height * 4;
        }
      }
      const packed = packFragments(entries);
      const parts = new Map([...aliases.keys()].map((key) => [key, []]));
      const pageIds = [];
      let pngBytes = 0;
      let rgbaBytes = 0;
      for (let index = 0; index < packed.length; index++) {
        const packedPage = packed[index];
        const pixels = {
          width: packedPage.width,
          height: packedPage.height,
          data: Buffer.alloc(packedPage.width * packedPage.height * 4),
        };
        for (const entry of packedPage.entries) blitWithGutter(pixels, entry);
        const bytes = encode(pixels);
        const hash = sha256(bytes);
        const path = `${tier}/${group}-${hash}.png`;
        await mkdir(resolve(STAGE, tier), { recursive: true });
        await writeFile(resolve(STAGE, path), bytes);
        const id = `${group}-${index}`;
        variant.pages[id] = {
          path,
          sha256: hash,
          width: pixels.width,
          height: pixels.height,
          rgbaBytes: pixels.width * pixels.height * 4,
          group,
        };
        pageIds.push(id);
        for (const entry of packedPage.entries)
          parts
            .get(entry.alias)
            .push({ page: id, frame: entry.frame, trim: entry.trim });
        pngBytes += bytes.length;
        rgbaBytes += pixels.width * pixels.height * 4;
      }
      for (const [key, alias] of aliases) {
        const fragments = parts
          .get(key)
          .sort((a, b) => a.trim.y - b.trim.y || a.trim.x - b.trim.x);
        for (const path of alias.paths)
          variant.frames[path] = {
            sourceSha256: alias.sourceSha256,
            pixelWidth: alias.raster.width,
            pixelHeight: alias.raster.height,
            fragments,
          };
      }
      variant.groups[group] = pageIds;
      groupReport[group] = {
        paths: frames.length,
        uniqueRasters: aliases.size,
        pages: pageIds.length,
        pngBytes,
        rgbaBytes,
        originalRgbaBytes,
        trimmedRgbaBytes,
      };
      process.stdout.write(
        `${tier} ${group}: ${pageIds.length} pages, ${(rgbaBytes / 1048576).toFixed(2)}MiB RGBA estimate\n`,
      );
    }
    const activePairs = [];
    for (const [leftId, left] of Object.entries(source.characters)) {
      for (const [rightId, right] of Object.entries(source.characters)) {
        const activeGroups = [
          ...new Set([
            "court",
            "common",
            `body-${leftId}`,
            `body-${rightId}`,
            `swing-${left.family}`,
            `swing-${right.family}`,
          ]),
        ];
        const rgbaBytes = activeGroups.reduce(
          (sum, group) => sum + groupReport[group].rgbaBytes,
          0,
        );
        if (rgbaBytes > 96 * 1024 * 1024)
          throw new Error(
            `${tier} active ${leftId}/${rightId} exceeds 96MiB RGBA cap`,
          );
        activePairs.push({
          left: leftId,
          right: rightId,
          groups: activeGroups,
          rgbaBytes,
        });
      }
    }
    activePairs.sort(
      (a, b) =>
        b.rgbaBytes - a.rgbaBytes ||
        lexical(a.left + a.right, b.left + b.right),
    );
    manifest.variants[tier] = variant;
    report.variants[tier] = {
      groups: groupReport,
      totalPages: Object.keys(variant.pages).length,
      sourcePaths: Object.keys(variant.frames).length,
      worstActivePair: activePairs[0],
      activePairs,
      totalPngBytes: Object.values(groupReport).reduce(
        (sum, group) => sum + group.pngBytes,
        0,
      ),
      totalRgbaBytes: Object.values(groupReport).reduce(
        (sum, group) => sum + group.rgbaBytes,
        0,
      ),
    };
  }
  await mkdir(resolve(STAGE, "dom"), { recursive: true });
  for (const frame of [
    ...Object.values(source.characters).map((role) => role.preview),
    source.ui.rematchUp,
    source.ui.rematchOver,
  ]) {
    const width = Math.ceil(frame.width);
    const height = Math.ceil(frame.height);
    const raster = await rasterize(
      inputs.get(frame.path),
      width,
      height,
      `${source.files[frame.path]}:${width}:${height}`,
    );
    const bytes = encode(raster);
    const hash = sha256(bytes);
    const path = `dom/image-${hash}.png`;
    await writeFile(resolve(STAGE, path), bytes);
    manifest.dom[frame.path] = { path, sha256: hash, width, height };
    report.dom[frame.path] = {
      pngBytes: bytes.length,
      rgbaBytes: width * height * 4,
    };
  }
  await writeFile(
    resolve(STAGE, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  report.uniqueRasterizations = renderedCount;
  report.memoryNote =
    "RGBA estimates are page width*height*4, excluding decoded browser copies, framebuffers, JS heap and total GPU/process memory.";
  report.reproducibilityNote =
    "Byte reproducibility verified only in the pinned local Node/Chromium/platform environment; other platforms are unverified.";
  await writeFile(
    resolve(STAGE, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  const digests = async (directory, prefix = "") => {
    const result = {};
    for (const entry of (
      await readdir(directory, { withFileTypes: true })
    ).sort((a, b) => lexical(a.name, b.name))) {
      const path = prefix + entry.name;
      if (entry.isDirectory())
        Object.assign(
          result,
          await digests(resolve(directory, entry.name), path + "/"),
        );
      else
        result[path] = sha256(await readFile(resolve(directory, entry.name)));
    }
    return result;
  };
  const generated = await digests(STAGE);
  if (check) {
    const previous = await digests(OUTPUT);
    if (JSON.stringify(generated) !== JSON.stringify(previous))
      throw new Error(
        "Rebuilt atlas differs; inspect the generated inputs, generator and environment",
      );
    await rm(STAGE, { recursive: true });
    process.stdout.write(
      `Deterministic rebuild passed: ${Object.keys(generated).length} files, manifest ${generated["manifest.json"]}\n`,
    );
  } else {
    await rm(OUTPUT, { recursive: true, force: true });
    await rename(STAGE, OUTPUT);
    process.stdout.write(
      `Wrote ${relative(ROOT, OUTPUT)}: ${Object.keys(generated).length} files, manifest ${generated["manifest.json"]}\n`,
    );
  }
} finally {
  await browser.close();
  await rm(STAGE, { recursive: true, force: true });
}
