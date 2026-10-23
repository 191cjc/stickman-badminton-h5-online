import assert from "node:assert/strict";
import { mkdir, readFile, statfs, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { PNG } from "pngjs";

// --compact keeps all metrics/contact sheets and removes successful full-size
// intermediates. Compact defaults to32-case batches; --batch-size overrides it.
// A fresh browser context per batch bounds both temporary PNGs and fixture pages.
const { values } = parseArgs({
  options: {
    url: {
      type: "string",
      default:
        "http://127.0.0.1:18927/badminton-h5-online/tools/render-validation/fixture.html",
    },
    output: { type: "string", default: "artifacts/pixi-migration/visuals" },
    densities: { type: "string", default: "2,4" },
    roles: {
      type: "string",
      default: "joe,nadia,harry,pirate,top-hat,red,toaster",
    },
    actions: {
      type: "string",
      default: "forward,backward,jump,serve,overhead,underhand",
    },
    boundaries: { type: "boolean", default: false },
    compact: { type: "boolean", default: false },
    "batch-size": { type: "string" },
    executable: {
      type: "string",
      default:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    },
  },
});
const output = resolve(values.output);
const densities = values.densities.split(",").map(Number);
assert.ok(
  densities.every((n) => n === 2 || n === 4),
  "Use density2 (SD) or4 (HD)",
);
const roles = values.roles.split(","),
  actions = values.actions.split(",");
const cases = [];
for (const role of roles) {
  for (const action of actions) cases.push({ role, action });
  cases.push({ role, action: "forward", mirrored: true });
  if (values.boundaries)
    for (const action of ["serve", "overhead", "underhand"])
      for (const frame of [1, -1]) cases.push({ role, action, frame });
}
for (const action of [
  "intro",
  "layers",
  "finish-left",
  "finish-right",
  "confetti",
])
  for (const mirrored of [false, true])
    cases.push({ role: "pirate", action, mirrored });
const nameOf = (options) =>
  `${options.role}-${options.action}${options.mirrored ? "-mirrored" : ""}${options.frame ? "-frame" + options.frame : ""}`;
const batchSize = Number(
  values["batch-size"] ?? (values.compact ? 32 : cases.length),
);
assert.ok(
  Number.isInteger(batchSize) && batchSize >= 1 && batchSize <= 1024,
  "Use batch-size1..1024",
);
const report = {
  browser: "",
  densities,
  cases: cases.length,
  errors: [],
  failedRequests: [],
  compact: values.compact,
  batchSize,
  batches: [],
  contextEvents: [],
  contextSnapshots: [],
  renderMessages: [],
  disk: [],
  comparisons: [],
  interpretation:
    "Fixed state screenshots from original checkpoint Canvas renderer and actual WebGL renderer. Metrics quantify sampling/filter differences; they are not automatic visual acceptance or native Flash parity. Source geometry/name/score oracle and untouched-state assertions run separately. All contact sheets/statistics are retained; compact mode deletes successful full pairs/diffs/crops. Failed black pairs remain available for diagnosis.",
};
const regions = {
  court: [0, 0, 640, 426],
  leftActor: [70, 230, 220, 190],
  rightActor: [350, 230, 220, 190],
  scoreboard: [230, 0, 180, 100],
  net: [295, 180, 50, 246],
  overlay: [100, 80, 440, 230],
  effects: [220, 140, 240, 120],
};
function stats(before, after, box) {
  const errors = new Uint32Array(256);
  let sum = 0,
    different = 0,
    max = 0,
    count = 0;
  for (let y = box[1]; y < box[1] + box[3]; y++)
    for (let x = box[0]; x < box[0] + box[2]; x++) {
      const i = (y * before.width + x) * 4;
      let changed = false;
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(before.data[i + c] - after.data[i + c]);
        errors[d]++;
        sum += d;
        max = Math.max(max, d);
        count++;
        changed ||= d > 3;
      }
      if (changed) different++;
    }
  let cumulative = 0,
    p95 = 0;
  for (; p95 < 255; p95++) {
    cumulative += errors[p95];
    if (cumulative >= count * 0.95) break;
  }
  return {
    pixels: count / 3,
    meanAbsoluteChannelError: sum / count,
    p95AbsoluteChannelError: p95,
    maxAbsoluteChannelError: max,
    pixelsAnyChannelAbove3: different,
    fractionAnyChannelAbove3: different / (count / 3),
  };
}
function crop(image, box) {
  const out = new PNG({ width: box[2], height: box[3] });
  PNG.bitblt(image, out, box[0], box[1], box[2], box[3], 0, 0);
  return out;
}
function thumbnail(image, width = 640) {
  const ratio = image.width / width,
    height = Math.round(image.height / ratio);
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const src =
        (Math.floor(y * ratio) * image.width + Math.floor(x * ratio)) * 4;
      image.data.copy(out.data, (y * width + x) * 4, src, src + 4);
    }
  return out;
}
function allBlack(image) {
  for (let i = 0; i < image.data.length; i += 4)
    if (image.data[i] || image.data[i + 1] || image.data[i + 2]) return false;
  return true;
}
async function diskSnapshot(label) {
  const disk = await statfs(output);
  report.disk.push({ label, availableBytes: disk.bavail * disk.bsize });
}
async function contextSnapshot(page, variant, density, label) {
  try {
    const snapshot = await page.evaluate(
      ({ variant }) => {
        const canvas = document.querySelector("#fixture");
        const gl =
          variant === "pixi"
            ? (canvas?.getContext("webgl2") ?? canvas?.getContext("webgl"))
            : null;
        return {
          events: window.visualContextEvents?.splice(0) ?? [],
          fixtureStatus: window.fixtureStatus,
          fixtureError: window.fixtureError,
          backing: canvas
            ? { width: canvas.width, height: canvas.height }
            : null,
          contextLost: gl?.isContextLost() ?? null,
        };
      },
      { variant },
    );
    report.contextEvents.push(
      ...snapshot.events.map((event) => ({
        ...event,
        variant,
        density,
        label,
      })),
    );
    delete snapshot.events;
    report.contextSnapshots.push({ variant, density, label, ...snapshot });
  } catch (error) {
    report.contextSnapshots.push({
      variant,
      density,
      label,
      unavailable: String(error),
    });
  }
}
await mkdir(output, { recursive: true });
await diskSnapshot("start");
const browser = await chromium.launch({
  headless: true,
  executablePath: values.executable,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});
report.browser = browser.version();
let active;
try {
  for (const density of densities) {
    for (let offset = 0; offset < cases.length; offset += batchSize) {
      const batchCases = cases.slice(offset, offset + batchSize);
      const batchNumber = Math.floor(offset / batchSize) + 1;
      const batchReport = {
        density,
        number: batchNumber,
        cases: batchCases.length,
        first: nameOf(batchCases[0]),
        last: nameOf(batchCases.at(-1)),
        comparisons: 0,
        complete: false,
      };
      report.batches.push(batchReport);
      const context = await browser.newContext({
        viewport: { width: 640 * density, height: 426 * density },
        deviceScaleFactor: 1,
      });
      const originals = new Map();
      for (const variant of ["canvas", "pixi"]) {
        const page = await context.newPage();
        active = { page, variant, density, batch: batchNumber };
        await page.addInitScript(() => {
          window.visualContextEvents = [];
          for (const type of [
            "webglcontextlost",
            "webglcontextrestored",
            "webglcontextcreationerror",
          ])
            document.addEventListener(
              type,
              (event) => {
                const entry = {
                  type,
                  at: performance.now(),
                  statusMessage: event.statusMessage ?? "",
                  target: event.target?.id ?? "",
                  defaultPrevented: event.defaultPrevented,
                };
                window.visualContextEvents.push(entry);
                queueMicrotask(() => {
                  entry.defaultPrevented = event.defaultPrevented;
                });
              },
              true,
            );
        });
        page.on("crash", () =>
          report.errors.push(
            `Browser page crashed (${variant},density${density})`,
          ),
        );
        page.on("pageerror", (error) => report.errors.push(String(error)));
        page.on("console", (message) => {
          if (/webgl|context|gpu|memory/i.test(message.text()))
            report.renderMessages.push({
              variant,
              density,
              type: message.type(),
              text: message.text(),
              location: message.location(),
            });
          if (message.type() === "error") {
            const location = message.location();
            report.errors.push(
              message.text() +
                (location.url
                  ? ` (${location.url}:${location.lineNumber})`
                  : ""),
            );
          }
        });
        page.on("response", (response) => {
          if (response.status() >= 400)
            report.failedRequests.push({
              variant,
              density,
              url: response.url(),
              status: response.status(),
            });
        });
        page.on("requestfailed", (request) =>
          report.failedRequests.push({
            variant,
            density,
            url: request.url(),
            failure: request.failure()?.errorText,
          }),
        );
        const url = new URL(values.url);
        url.searchParams.set("variant", variant);
        await page.goto(url.href);
        await page.waitForFunction(
          () =>
            window.fixtureStatus === "ready" ||
            window.fixtureStatus === "failed",
          null,
          { timeout: 120000 },
        );
        assert.equal(
          await page.evaluate(() => window.fixtureStatus),
          "ready",
          await page.evaluate(() => window.fixtureError),
        );
        for (const options of batchCases) {
          const name = nameOf(options) + "-density" + density;
          report.lastAttempt = {
            name,
            variant,
            density,
            batch: batchNumber,
            stage: "render",
          };
          const fixture = await page.evaluate(
            (options) => window.renderFixture(options),
            { ...options, density },
          );
          assert.deepEqual(fixture.backing, {
            width: 640 * density,
            height: 426 * density,
          });
          const file = resolve(output, name + "-" + variant + ".png");
          report.lastAttempt.stage = "screenshot";
          await page.locator("#fixture").screenshot({ path: file });
          if (variant === "canvas") {
            originals.set(name, { file, fixture });
            continue;
          }
          const source = originals.get(name);
          assert.deepEqual(
            fixture.oracle,
            source.fixture.oracle,
            "Same source selectors, registration, readable score/names",
          );
          assert.deepEqual(
            fixture.state,
            source.fixture.state,
            "Same frozen game state",
          );
          const before = PNG.sync.read(await readFile(source.file)),
            after = PNG.sync.read(await readFile(file));
          const black = { canvas: allBlack(before), pixi: allBlack(after) };
          await contextSnapshot(page, variant, density, name);
          assert.equal(after.width, before.width);
          assert.equal(after.height, before.height);
          const metrics = Object.fromEntries(
            Object.entries(regions).map(([key, box]) => [
              key,
              stats(
                before,
                after,
                box.map((n) => n * density),
              ),
            ]),
          );
          const diff = new PNG({ width: before.width, height: before.height });
          for (let i = 0; i < diff.data.length; i += 4) {
            for (let c = 0; c < 3; c++)
              diff.data[i + c] = Math.min(
                255,
                4 * Math.abs(before.data[i + c] - after.data[i + c]),
              );
            diff.data[i + 3] = 255;
          }
          if (!values.compact || black.canvas || black.pixi)
            await writeFile(
              resolve(output, name + "-diff-x4.png"),
              PNG.sync.write(diff),
            );
          const thumbs = [thumbnail(before), thumbnail(after), thumbnail(diff)];
          const sheet = new PNG({ width: 1920, height: 426 });
          for (let i = 0; i < 3; i++)
            PNG.bitblt(thumbs[i], sheet, 0, 0, 640, 426, i * 640, 0);
          await writeFile(
            resolve(output, name + "-contact.png"),
            PNG.sync.write(sheet),
          );
          // Preserve full pixel crops for filter/registration inspection where needed.
          if (
            !values.compact &&
            ["layers", "confetti", "intro", "serve"].includes(options.action)
          )
            for (const [label, box] of Object.entries(regions).filter(([key]) =>
              ["leftActor", "overlay", "effects"].includes(key),
            )) {
              for (const [kind, image] of [
                ["canvas", before],
                ["pixi", after],
              ])
                await writeFile(
                  resolve(output, name + "-" + label + "-" + kind + ".png"),
                  PNG.sync.write(
                    crop(
                      image,
                      box.map((n) => n * density),
                    ),
                  ),
                );
            }
          report.comparisons.push({
            name,
            options: { ...options, density },
            metrics,
            oracle: fixture.oracle,
            renderer: fixture.diagnostics,
            black,
            batch: batchNumber,
          });
          batchReport.comparisons++;
          await writeFile(
            resolve(output, "comparison.json"),
            JSON.stringify(report, null, 2) + "\n",
          );
          if (black.canvas || black.pixi)
            throw new Error(
              `All-black ${black.canvas ? "Canvas" : "Pixi"} screenshot for ${name}; failing PNG pair/contact retained. Inspect contextEvents/contextSnapshots/renderMessages/disk in comparison.json.`,
            );
          if (values.compact) {
            await unlink(source.file);
            await unlink(file);
            const obsolete = [resolve(output, name + "-diff-x4.png")];
            for (const label of ["leftActor", "overlay", "effects"])
              for (const kind of ["canvas", "pixi"])
                obsolete.push(
                  resolve(output, name + "-" + label + "-" + kind + ".png"),
                );
            for (const path of obsolete)
              await unlink(path).catch((error) => {
                if (error.code !== "ENOENT") throw error;
              });
            originals.delete(name);
          }
          console.log(name, JSON.stringify(metrics.court));
        }
        await page.close();
        active = undefined;
      }
      await context.close();
      batchReport.complete = true;
      await diskSnapshot(
        "density" + density + "-batch" + batchNumber + "-complete",
      );
    }
    await diskSnapshot("density" + density + "-complete");
  }
  assert.deepEqual(report.errors, []);
  report.complete = true;
} catch (error) {
  report.error = String(error);
  if (active)
    await contextSnapshot(
      active.page,
      active.variant,
      active.density,
      "failure",
    );
  throw error;
} finally {
  try {
    await diskSnapshot("end");
    await writeFile(
      resolve(output, "comparison.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  } finally {
    await browser.close();
  }
}
