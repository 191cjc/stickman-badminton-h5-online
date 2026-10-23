import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const { values } = parseArgs({
  options: {
    url: {
      type: "string",
      default: "http://127.0.0.1:18926/badminton-h5-online/?debug=1",
    },
    output: { type: "string", default: "artifacts/pixi-migration/lifecycle" },
    executable: {
      type: "string",
      default:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    },
  },
});
const url = new URL(values.url);
url.searchParams.set("debug", "1");
await mkdir(values.output, { recursive: true });
const report = {
  browser: "",
  dpr: 1,
  checks: {},
  samples: [],
  errors: [],
  console: [],
  failedRequests: [],
  routeCompletions: [],
  limits: [
    "Headless Chromium on the local host; physical device lifecycle/visibility and total GPU/process memory remain unverified.",
    "The combined delayed new-role PNG through natural-result reclaim is not exercised:15s asset timeout is shorter than30s room retention. Separate real scenarios cover each boundary; the combined main transition was source-reviewed and remains without direct automated browser or unit coverage.",
  ],
};
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
const guests = [];
let releaseDelayed;
let delayResolved = false;
const delayedUrls = new Set();
const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function guest() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    window.wire = [];
    window.sent = [];
    window.visibilityEvents = [];
    for (const type of ["visibilitychange", "freeze", "resume"])
      document.addEventListener(type, () =>
        window.visibilityEvents.push({
          type,
          at: performance.now(),
          hidden: document.hidden,
          visibility: document.visibilityState,
        }),
      );
    const WS = WebSocket;
    window.WebSocket = class extends WS {
      constructor(...args) {
        super(...args);
        this.addEventListener("message", (event) =>
          window.wire.push(JSON.parse(event.data)),
        );
      }
      send(raw) {
        window.sent.push(JSON.parse(raw));
        super.send(raw);
      }
    };
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const entry = { text: message.text(), url: message.location().url };
    report.console.push(entry);
    if (!delayedUrls.has(entry.url)) report.errors.push(JSON.stringify(entry));
  });
  page.on("requestfailed", (request) =>
    report.failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText,
      deliberatelyDelayed: delayedUrls.has(request.url()),
    }),
  );
  const cdp = await context.newCDPSession(page);
  await page.goto(url.href);
  await ready(page, true);
  const result = { context, page, cdp };
  guests.push(result);
  return result;
}
async function ready(page, menu = false) {
  await page.waitForFunction(
    (menu) =>
      document.querySelector("#loading-screen").hidden &&
      window.badmintonDiagnostics.snapshot().renderer.ready &&
      (!menu || !document.querySelector("#start").disabled),
    menu,
    { timeout: 90000, polling: 50 },
  );
}
const wire = (page) => page.evaluate(() => window.wire);
const latest = (page) =>
  page.evaluate(() =>
    window.wire.filter((message) => message.type === "snapshot").at(-1),
  );
const diagnostic = (page) =>
  page.evaluate(() => window.badmintonDiagnostics.snapshot());
async function focus(page) {
  await page.bringToFront();
  await page.locator("#game").focus();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForTimeout(80);
}
async function queue(page, role) {
  await ready(page, true);
  await page.locator(`[data-character="${role}"]`).click();
  await page.locator('[data-shuttle-speed="2"]').click();
  await page.locator("#start").click();
  await page.waitForFunction(
    () =>
      window.wire.at(-1)?.type === "queued" ||
      window.wire.some((message) => message.type === "matched"),
  );
}
async function match(a, b, leftRole, rightRole, { waitArt = true } = {}) {
  const old = (await latest(a))?.room;
  await queue(a, leftRole);
  await queue(b, rightRole);
  for (const page of [a, b])
    await page.waitForFunction(
      (old) =>
        window.wire.some(
          (message) =>
            message.type === "snapshot" &&
            message.room !== old &&
            message.state.phase === "playing",
        ),
      old,
      { timeout: 20000 },
    );
  if (waitArt) for (const page of [a, b]) await ready(page);
  const room = (await latest(a)).room;
  assert.equal((await latest(b)).room, room);
  return room;
}
async function checkAtlas(page, roles, label) {
  await ready(page);
  const diagnostics = await diagnostic(page),
    atlas = diagnostics.renderer.atlas;
  const expected = [
    "court",
    "common",
    ...roles.map((role) => `body-${role}`),
    ...roles.map((role) =>
      role === "toaster" ? "swing-toaster" : "swing-adult",
    ),
  ];
  assert.deepEqual(
    [...atlas.groups].sort(),
    [...new Set(expected)].sort(),
    label + " active groups",
  );
  const declaredPages = await page.evaluate(
    async ({ tier, groups }) => {
      const manifest = await (
        await fetch("./classic-atlas/manifest.json")
      ).json();
      return new Set(
        groups.flatMap((group) => manifest.variants[tier].groups[group]),
      ).size;
    },
    { tier: atlas.tier, groups: expected },
  );
  assert.equal(
    atlas.pages,
    declaredPages,
    label + " exact current-set page ownership",
  );
  assert.equal(atlas.uploadedPages, atlas.pages, label + " no missing uploads");
  assert.ok(
    atlas.rgbaBytesEstimate > 0 && atlas.rgbaBytesEstimate <= atlas.rgbaLimit,
    label + " bounded RGBA estimate",
  );
  report.samples.push({
    label,
    roles,
    atlas,
    renderer: diagnostics.renderer,
    quality: diagnostics.quality,
  });
  return atlas;
}
async function hud(page, mirrored) {
  const snapshot = await latest(page);
  assert.equal(
    await page.locator("#score-left").textContent(),
    String(snapshot.state.score[mirrored ? "right" : "left"]),
  );
  assert.equal(
    await page.locator("#score-right").textContent(),
    String(snapshot.state.score[mirrored ? "left" : "right"]),
  );
}
async function scorePixels(page, filename) {
  const mapping = await page.evaluate(() => {
    const canvas = document.querySelector("#game"),
      scale = Math.min(canvas.clientWidth / 640, canvas.clientHeight / 426);
    return {
      x: (canvas.clientWidth - scale * 640) / 2 + 248.05 * scale,
      y: (canvas.clientHeight - scale * 426) / 2 + 15 * scale,
      width: 143.95 * scale,
      height: 35 * scale,
    };
  });
  const image = PNG.sync.read(await page.locator("#game").screenshot());
  const out = new PNG({
    width: Math.floor(mapping.width),
    height: Math.floor(mapping.height),
  });
  PNG.bitblt(
    image,
    out,
    Math.floor(mapping.x),
    Math.floor(mapping.y),
    out.width,
    out.height,
    0,
    0,
  );
  await writeFile(values.output + "/" + filename, PNG.sync.write(out));
  return out;
}
function compareScorePixels(before, after) {
  assert.equal(after.width, before.width);
  assert.equal(after.height, before.height);
  let changed = 0,
    sum = 0;
  for (let i = 0; i < before.data.length; i += 4) {
    let different = false;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(before.data[i + c] - after.data[i + c]);
      sum += d;
      different ||= d > 16;
    }
    changed += Number(different);
  }
  const metrics = {
    fractionPixelsAnyChannelAbove16: changed / (before.width * before.height),
    meanAbsoluteChannelError: sum / (before.width * before.height * 3),
  };
  // Confetti can cross the scoreboard and adaptive sampling can soften edges.
  // A broad20% limit detects a replaced winner plate while retaining pixel evidence
  // for inspection; it does not assert identical animated result screenshots.
  assert.ok(
    metrics.fractionPixelsAnyChannelAbove16 < 0.2,
    "Winner plate should remain visually stable after reclaim",
  );
  return metrics;
}
async function resize(page, size, mirrored) {
  await page.setViewportSize(size);
  await page.waitForTimeout(120);
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector("#game"),
        q = window.badmintonDiagnostics.snapshot().quality;
      const scale = Math.min(
        canvas.clientWidth / 640,
        canvas.clientHeight / 426,
      );
      const dpr = q.worldDensityCap
        ? Math.min(devicePixelRatio, q.worldDensityCap / scale)
        : devicePixelRatio;
      return (
        Math.abs(canvas.width - canvas.clientWidth * dpr) <= 1 &&
        Math.abs(canvas.height - canvas.clientHeight * dpr) <= 1
      );
    },
    null,
    { timeout: 5000 },
  );
  await hud(page, mirrored);
  const sample = await page.evaluate(() => {
    const canvas = document.querySelector("#game"),
      bounds = canvas.getBoundingClientRect(),
      diagnostics = window.badmintonDiagnostics.snapshot();
    const scale = Math.min(canvas.clientWidth / 640, canvas.clientHeight / 426);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      canvas: {
        width: canvas.width,
        height: canvas.height,
        cssWidth: canvas.clientWidth,
        cssHeight: canvas.clientHeight,
        x: bounds.x,
        y: bounds.y,
      },
      world: {
        width: 640,
        height: 426,
        scale,
        offsetX: (canvas.clientWidth - scale * 640) / 2,
        offsetY: (canvas.clientHeight - scale * 426) / 2,
      },
      quality: diagnostics.quality,
      atlas: diagnostics.renderer.atlas,
    };
  });
  assert.equal(
    sample.atlas.tier,
    "sd",
    "DPR1 atlas tier remains stable across resize",
  );
  await page.screenshot({
    path: values.output + `/resize-${size.width}x${size.height}.png`,
  });
  report.samples.push({ label: "resize", ...sample });
}
async function naturalResult(a, b, room) {
  const deadline = Date.now() + 90000;
  const bySide = new Map();
  for (const page of [a, b])
    bySide.set(
      await page.evaluate(
        (room) =>
          window.wire.find(
            (message) => message.type === "matched" && message.room === room,
          ).side,
        room,
      ),
      page,
    );
  let serves = 0;
  while (Date.now() < deadline) {
    const message = await latest(b);
    if (message.state.winner) break;
    if (
      message.state.phase === "playing" &&
      message.state.shuttle.state === "attached"
    ) {
      const actor = bySide.get(message.state.server);
      await focus(actor);
      await actor.keyboard.down("j");
      await actor.waitForTimeout(60);
      await actor.keyboard.up("j");
      serves++;
      await actor.waitForTimeout(200);
    } else await pause(90);
  }
  for (const page of [a, b])
    await page.waitForFunction(
      (room) =>
        window.wire.some(
          (message) =>
            message.type === "snapshot" &&
            message.room === room &&
            message.state.winner,
        ) &&
        window.wire.some(
          (message) => message.type === "result" && message.reason === "score",
        ),
      room,
      { timeout: 1000 },
    );
  const result = (await wire(b))
    .filter((message) => message.type === "result")
    .at(-1);
  assert.equal(Math.max(result.score.left, result.score.right), 7);
  assert.ok(serves >= 7);
  return result;
}

try {
  const a = await guest(),
    b = await guest();
  // Right participant's native preference also lets resize verify displayed HUD order.
  await b.page.locator("#settings").click();
  await b.page.locator("#self-left-view").check();
  await b.page.locator("#settings-close").click();
  const firstRoom = await match(a.page, b.page, "toaster", "pirate");
  for (const guest of [a, b])
    await checkAtlas(guest.page, ["toaster", "pirate"], "initial-pair");

  // CDP freezing is a real browser lifecycle action. Do not invent document.hidden.
  await focus(a.page);
  await a.page.keyboard.down("d");
  await a.page.waitForTimeout(70);
  const beforeFreeze = await a.page.evaluate(() => ({
    events: window.visibilityEvents.length,
    sent: window.sent.length,
    frames: window.badmintonDiagnostics.snapshot().renderer.frames,
  }));
  await a.cdp.send("Page.setWebLifecycleState", { state: "frozen" });
  await b.page.waitForTimeout(700);
  await a.cdp.send("Page.setWebLifecycleState", { state: "active" });
  await a.page.bringToFront();
  const afterFreeze = await a.page.evaluate(
    (before) => ({
      hidden: document.hidden,
      events: window.visibilityEvents.slice(before.events),
      sent: window.sent.slice(before.sent),
      frames: window.badmintonDiagnostics.snapshot().renderer.frames,
    }),
    beforeFreeze,
  );
  await a.page.keyboard.up("d");
  const observedHidden = afterFreeze.events.some(
    (event) => event.type === "visibilitychange" && event.hidden,
  );
  if (observedHidden) {
    assert.ok(
      afterFreeze.sent.some((message) => message.type === "release"),
      "Native hidden transition releases held input",
    );
    assert.ok(
      afterFreeze.frames - beforeFreeze.frames < 10,
      "Frozen interval does not draw a catch-up burst",
    );
    assert.equal(afterFreeze.hidden, false);
  } else
    report.limits.push(
      "CDP freeze/resume produced no genuine hidden visibility event on this browser. Frozen execution was probed; hidden/resume input/effect behavior remains unverified by this script.",
    );
  await focus(a.page);
  await ready(a.page);
  assert.equal((await latest(a.page)).room, firstRoom);
  report.checks.lifecycleFreezeResume = {
    observedHidden,
    before: beforeFreeze,
    after: afterFreeze,
  };
  console.log(
    "Lifecycle: frozen/resumed; genuine hidden event observed:",
    observedHidden,
  );
  for (const size of [
    { width: 900, height: 600 },
    { width: 812, height: 375 },
    { width: 1440, height: 1000 },
  ])
    await resize(b.page, size, true);
  report.checks.resizeBackbufferWorldMappingMirrorHud = true;

  const result = await naturalResult(a.page, b.page, firstRoom);
  await a.page.screenshot({
    path: values.output + "/natural-result-before-reclaim.png",
  });
  const beforeReclaim = await checkAtlas(
    a.page,
    ["toaster", "pirate"],
    "natural-result-before-reclaim",
  );
  const beforeScore = await scorePixels(
    a.page,
    "winner-plate-before-reclaim.png",
  );
  // Real server's30s retention; no emitted/fabricated server messages or clock override.
  for (const guest of [a, b])
    await guest.page.waitForFunction(
      () =>
        window.wire.some(
          (message) => message.type === "idle" && message.reason === "finished",
        ),
      null,
      { timeout: 40000, polling: 100 },
    );
  for (const guest of [a, b]) await ready(guest.page, true);
  const afterReclaim = await checkAtlas(
    a.page,
    ["toaster", "pirate"],
    "natural-result-after-reclaim",
  );
  assert.equal(afterReclaim.pages, beforeReclaim.pages);
  assert.match(
    await a.page.locator("#overlay-detail").textContent(),
    new RegExp(`${result.score.left} : ${result.score.right}`),
  );
  assert.equal(await a.page.locator("#start-label").textContent(), "再次匹配");
  await hud(a.page, false);
  await hud(b.page, true);
  await a.page.screenshot({
    path: values.output + "/natural-result-after-reclaim.png",
  });
  const scoreComparison = compareScorePixels(
    beforeScore,
    await scorePixels(a.page, "winner-plate-after-reclaim.png"),
  );
  report.checks.naturalReclaimRetainsFinalScoreAndActorPages = {
    result,
    beforeReclaim,
    afterReclaim,
    scoreComparison,
  };
  console.log(
    "Lifecycle: natural seven-point result retained through real server reclaim",
  );

  const secondRoom = await match(a.page, b.page, "joe", "red");
  assert.notEqual(secondRoom, firstRoom);
  for (const guest of [a, b])
    await checkAtlas(guest.page, ["joe", "red"], "changed-pair");
  report.checks.rematchChangesGroupsReleasesOldActorsWithinBudget = true;
  console.log("Lifecycle: new pair replaces old actor pages within budget");
  await a.page.locator("#leave").click();
  for (const guest of [a, b])
    await guest.page.waitForFunction(
      () =>
        !document.querySelector("#start").disabled &&
        document.querySelector("#start-label").textContent === "再次匹配",
      null,
      { timeout: 10000 },
    );

  // Delay one real newly-required PNG, lose WebGL while preparing it, then use
  // the native loading-exit action. Late completion must reveal the result only.
  let requested;
  const requestStarted = new Promise((resolve) => {
    requested = resolve;
  });
  const held = new Promise((resolve) => {
    releaseDelayed = resolve;
  });
  await a.page.route("**/classic-atlas/**/body-nadia-*.png*", async (route) => {
    delayedUrls.add(route.request().url());
    requested();
    await held;
    try {
      await route.continue();
      report.routeCompletions.push({
        url: route.request().url(),
        continued: true,
      });
    } catch (error) {
      report.routeCompletions.push({
        url: route.request().url(),
        cancelled: String(error),
      });
    }
  });
  const thirdRoom = await match(a.page, b.page, "harry", "nadia", {
    waitArt: false,
  });
  await Promise.race([
    requestStarted,
    pause(10000).then(() => {
      throw Error("New role request never started");
    }),
  ]);
  await a.page.waitForFunction(
    () => !document.querySelector("#loading-screen").hidden,
  );
  await a.page.evaluate(() => {
    const canvas = document.querySelector("#game"),
      gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    window.lifecycleLoss = gl.getExtension("WEBGL_lose_context");
    if (!window.lifecycleLoss) throw Error("WEBGL_lose_context unavailable");
    window.lifecycleLoss.loseContext();
  });
  await a.page.waitForFunction(
    () => !window.badmintonDiagnostics.snapshot().renderer.contextAvailable,
  );
  await a.page.locator("#loading-exit").click();
  await a.page.waitForFunction(
    (room) =>
      window.wire.some(
        (message) =>
          message.type === "snapshot" &&
          message.room === room &&
          message.status === "finished",
      ) &&
      window.wire.some(
        (message) => message.type === "result" && message.reason === "leave",
      ),
    thirdRoom,
  );
  releaseDelayed();
  delayResolved = true;
  await a.page.evaluate(() => window.lifecycleLoss.restoreContext());
  await ready(a.page, true);
  await checkAtlas(
    a.page,
    ["harry", "nadia"],
    "cancelled-scene-restored-result",
  );
  const restored = await diagnostic(a.page);
  assert.ok(
    restored.renderer.contextLosses >= 1 &&
      restored.renderer.contextRestores >= 1,
  );
  assert.equal(await a.page.locator("#start-label").textContent(), "再次匹配");
  assert.match(
    await a.page.locator("#overlay-detail").textContent(),
    /主动结束/,
  );
  assert.ok(await a.page.locator("#leave").isHidden());
  const inputMark = await a.page.evaluate(() => window.sent.length);
  await a.page.keyboard.press("j");
  await a.page.keyboard.press("k");
  await a.page.waitForTimeout(120);
  assert.ok(
    (
      await a.page.evaluate(
        (n) =>
          window.sent.slice(n).filter((message) => message.type === "input"),
        inputMark,
      )
    ).every((message) => !message.hitPressed && !message.jumpPressed),
  );
  await a.page.screenshot({
    path: values.output + "/delayed-role-context-restore-after-exit.png",
  });
  report.checks.delayedRoleContextRestoreAndNativeExitKeepsResultGated = {
    thirdRoom,
    delayedUrls: [...delayedUrls],
    renderer: restored.renderer,
  };
  assert.deepEqual(report.errors, []);
  report.complete = true;
} catch (error) {
  report.error = String(error);
  throw error;
} finally {
  if (releaseDelayed && !delayResolved) releaseDelayed();
  await writeFile(
    values.output + "/lifecycle.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
