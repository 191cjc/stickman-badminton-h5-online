import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

// Run headed on the local virtual display:
// xvfb-run -a node tools/render-validation/visibility.mjs
const { values } = parseArgs({
  options: {
    url: {
      type: "string",
      default: "http://127.0.0.1:18926/badminton-h5-online/?debug=1",
    },
    output: { type: "string", default: "artifacts/pixi-migration/visibility" },
    strategy: { type: "string", default: "auto" },
    bfcache: { type: "boolean", default: false },
    executable: {
      type: "string",
      default:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    },
  },
});
assert.ok(
  process.env.DISPLAY,
  "Run this headed browser with xvfb-run -a node tools/render-validation/visibility.mjs",
);
assert.ok(["auto", "tab", "minimize"].includes(values.strategy));
const url = new URL(values.url);
url.searchParams.set("debug", "1");
await mkdir(values.output, { recursive: true });
const report = {
  browser: "",
  headed: true,
  virtualDisplay: true,
  connection: "external Chromium; default context; CDP noDefaults=true",
  dpr: 1,
  attempts: [],
  checks: {},
  errors: [],
  limits: [
    "Xvfb headed Chromium establishes genuine browser visibility events on a virtual display, not physical-device lifecycle or latency.",
    "Internal main.ts elapsed delta is not exported. This tool measures paused/resumed drawing, scheduler release/rearm, quality grace and authority continuity; exact elapsed-reset arithmetic remains source/test evidence.",
  ],
};
const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const externalBrowsers = [];
async function externalBrowser() {
  const profile = await mkdtemp(join(tmpdir(), "badminton-visibility-"));
  const child = spawn(
    values.executable,
    [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--force-device-scale-factor=1",
      "--window-size=1440,1000",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      ...(values.bfcache ? [] : ["--disable-back-forward-cache"]),
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const owned = { child, profile, browser: null, stderr: "", error: null };
  externalBrowsers.push(owned);
  owned.exited = new Promise((resolve) => child.once("close", resolve));
  child.on("error", (error) => {
    owned.error = error;
  });
  child.stderr.on("data", (data) => {
    owned.stderr = (owned.stderr + String(data)).slice(-8000);
  });
  const deadline = Date.now() + 15000;
  let port;
  while (Date.now() < deadline) {
    if (owned.error) throw owned.error;
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(`External Chromium exited: ${owned.stderr}`);
    try {
      const activePort = await readFile(
        join(profile, "DevToolsActivePort"),
        "utf8",
      );
      port = Number(activePort.split("\n")[0]);
      if (Number.isInteger(port) && port > 0) break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await pause(50);
  }
  assert.ok(port > 0, `External Chromium CDP did not start: ${owned.stderr}`);
  owned.browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, {
    noDefaults: true,
  });
  report.browser ||= owned.browser.version();
  const context = owned.browser.contexts()[0];
  assert.ok(context, "External Chromium must expose its default context");
  return { browser: owned.browser, context };
}
async function closeExternalBrowser(owned) {
  if (owned.browser?.isConnected()) {
    try {
      const cdp = await owned.browser.newBrowserCDPSession();
      await cdp.send("Browser.close");
    } catch {}
    await owned.browser.close().catch(() => {});
  }
  if (owned.child.exitCode === null && owned.child.signalCode === null) {
    owned.child.kill("SIGTERM");
    await Promise.race([owned.exited, pause(3000)]);
    if (owned.child.exitCode === null && owned.child.signalCode === null) {
      owned.child.kill("SIGKILL");
      await Promise.race([owned.exited, pause(1000)]);
    }
  }
  await rm(owned.profile, { recursive: true, force: true });
}
async function until(page, predicate, timeout = 10000, argument) {
  const deadline = Date.now() + timeout;
  do {
    if (await page.evaluate(predicate, argument)) return true;
    await pause(50);
  } while (Date.now() < deadline);
  return false;
}
async function ready(page, menu = false) {
  assert.ok(
    await until(
      page,
      (menu) =>
        document.querySelector("#loading-screen")?.hidden &&
        window.badmintonDiagnostics?.snapshot().renderer.ready &&
        (!menu || !document.querySelector("#start").disabled),
      90000,
      menu,
    ),
    "Product did not become ready",
  );
}
async function guest() {
  // Each real default context has its own profile/session cookie. Creating a
  // Playwright context would enable focus emulation despite noDefaults=true.
  const { context } = await externalBrowser();
  await context.addInitScript(() => {
    window.wire = [];
    window.sent = [];
    window.visibilityEvents = [];
    window.visibilityPad = {
      index: 0,
      id: "Synthetic visibility neutral-rearm probe",
      mapping: "standard",
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({
        pressed: false,
        touched: false,
        value: 0,
      })),
    };
    Object.defineProperty(navigator, "getGamepads", {
      value: () => [
        {
          ...window.visibilityPad,
          axes: [...window.visibilityPad.axes],
          buttons: window.visibilityPad.buttons.map((button) => ({
            ...button,
          })),
        },
      ],
    });
    const record = (event) => {
      const entry = {
        type: event.type,
        at: performance.now(),
        hidden: document.hidden,
        trusted: event.isTrusted,
        persisted: event.persisted ?? null,
        frames: window.badmintonDiagnostics?.snapshot().renderer.frames ?? null,
        sentCount: window.sent.length,
      };
      window.visibilityEvents.push(entry);
      try {
        const events = JSON.parse(
          sessionStorage.getItem("renderer-visibility-events") ?? "[]",
        );
        events.push(entry);
        sessionStorage.setItem(
          "renderer-visibility-events",
          JSON.stringify(events.slice(-100)),
        );
      } catch {}
    };
    for (const type of ["visibilitychange", "pagehide", "pageshow"])
      addEventListener(type, record, true);
    const WS = WebSocket;
    window.WebSocket = class extends WS {
      constructor(...args) {
        super(...args);
        this.addEventListener("message", (event) =>
          window.wire.push({
            ...JSON.parse(event.data),
            receivedAt: performance.now(),
          }),
        );
      }
      send(raw) {
        window.sent.push({ ...JSON.parse(raw), observedAt: performance.now() });
        super.send(raw);
      }
    };
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.setViewportSize({ width: 1440, height: 1000 });
  page.on("pageerror", (error) => report.errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push(message.text());
  });
  const cdp = await context.newCDPSession(page);
  await page.goto(url.href);
  await page.bringToFront();
  await ready(page, true).catch(async (error) => {
    report.startupFailure = await page.evaluate(() => ({
      hidden: document.hidden,
      status: document.querySelector("#loading-status")?.textContent,
      detail: document.querySelector("#loading-detail")?.textContent,
      diagnostics: window.badmintonDiagnostics?.snapshot(),
    }));
    throw error;
  });
  return { context, page, cdp };
}
async function focus(page) {
  await page.bringToFront();
  await page.locator("#game").focus();
  assert.ok(
    await until(page, () => !document.hidden && document.hasFocus(), 3000),
    "Browser did not visibly focus product tab",
  );
}
async function sample(page) {
  return page.evaluate(() => ({
    at: performance.now(),
    hidden: document.hidden,
    focused: document.hasFocus(),
    wireCount: window.wire.length,
    sentCount: window.sent.length,
    events: window.visibilityEvents,
    latest: window.wire.filter((message) => message.type === "snapshot").at(-1),
    diagnostics: window.badmintonDiagnostics.snapshot(),
  }));
}
async function pad(page, axis, jump = false) {
  await page.evaluate(
    ({ axis, jump }) => {
      window.visibilityPad.axes[0] = axis;
      window.visibilityPad.buttons[0] = {
        pressed: jump,
        touched: jump,
        value: Number(jump),
      };
    },
    { axis, jump },
  );
}
async function neutral(page) {
  await page.keyboard.up("d");
  await pad(page, 0);
  await pause(160);
}

try {
  const a = await guest(),
    b = await guest();
  report.gl = await a.page.evaluate(() => {
    const canvas = document.querySelector("#game");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return { available: false };
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      available: true,
      version: gl.getParameter(gl.VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      unmaskedVendor: debug
        ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)
        : null,
      unmaskedRenderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : null,
    };
  });
  for (const { page } of [a, b]) {
    await page.bringToFront();
    await page.locator("#start").click();
  }
  for (const { page } of [a, b]) {
    assert.ok(
      await until(
        page,
        () => window.wire.some((message) => message.type === "matched"),
        15000,
      ),
    );
    await ready(page);
  }
  const first = await sample(a.page),
    room = first.latest.room;
  const side = await a.page.evaluate(
    (room) =>
      window.wire.find(
        (message) => message.type === "matched" && message.room === room,
      ).side,
    room,
  );
  assert.equal(side, "left");
  let verified = false;
  for (const strategy of values.strategy === "auto"
    ? ["tab", "minimize"]
    : [values.strategy]) {
    await focus(a.page);
    await neutral(a.page);
    const mark = await a.page.evaluate(() => ({
      sent: window.sent.length,
      events: window.visibilityEvents.length,
    }));
    await a.page.keyboard.down("d");
    await pad(a.page, 0.8, true);
    assert.ok(
      await until(
        a.page,
        (n) =>
          window.sent
            .slice(n)
            .some((message) => message.type === "input" && message.move === 1),
        5000,
        mark.sent,
      ),
      "Held movement never reached server wire",
    );
    const before = await sample(a.page);
    let occluder, windowId;
    const attempt = { strategy, before };
    report.attempts.push(attempt);
    try {
      if (strategy === "tab") {
        occluder = await a.context.newPage();
        await occluder.goto("about:blank");
        await occluder.bringToFront();
      } else {
        ({ windowId } = await a.cdp.send("Browser.getWindowForTarget"));
        await a.cdp.send("Browser.setWindowBounds", {
          windowId,
          bounds: { windowState: "minimized" },
        });
      }
      const hidden = await until(a.page, () => document.hidden, 3000);
      attempt.observedHidden = hidden;
      if (!hidden) {
        attempt.limit =
          "Browser did not produce hidden visibility for this strategy";
        continue;
      }
      const hiddenStart = await sample(a.page);
      await pause(800);
      const hiddenEnd = await sample(a.page);
      attempt.hiddenStart = hiddenStart;
      attempt.hiddenEnd = hiddenEnd;
      const actualEvents = hiddenEnd.events.slice(mark.events);
      const hiddenEvent = actualEvents.find(
        (event) =>
          event.type === "visibilitychange" && event.hidden && event.trusted,
      );
      assert.ok(
        actualEvents.some(
          (event) =>
            event.type === "visibilitychange" && event.hidden && event.trusted,
        ),
        "Require trusted native hidden visibilitychange",
      );
      assert.equal(
        hiddenEnd.diagnostics.renderer.frames,
        hiddenStart.diagnostics.renderer.frames,
        "No GPU draws while actual document.hidden",
      );
      assert.equal(
        hiddenEnd.diagnostics.scheduler.active,
        false,
        "Hidden page input scheduler stopped",
      );
      assert.equal(hiddenEnd.latest.room, room);
      assert.ok(
        hiddenEnd.latest.tick > hiddenStart.latest.tick + 5,
        "Authority snapshots continue while hidden",
      );
      const hiddenInputs = await a.page.evaluate(
        (n) => window.sent.slice(n),
        hiddenEvent.sentCount,
      );
      assert.ok(
        hiddenInputs.some((message) => message.type === "release"),
        "Hidden transition releases held input",
      );
      assert.ok(
        hiddenInputs
          .filter((message) => message.type === "input")
          .every(
            (message) =>
              !message.move &&
              !message.jump &&
              !message.hitHeld &&
              !message.hitPressed &&
              !message.jumpPressed,
          ),
      );
    } catch (error) {
      if (attempt.observedHidden) throw error;
      attempt.limit = String(error);
    } finally {
      if (windowId !== undefined)
        await a.cdp
          .send("Browser.setWindowBounds", {
            windowId,
            bounds: { windowState: "normal" },
          })
          .catch((error) => {
            attempt.restoreWindowError = String(error);
          });
      await a.page.bringToFront();
      if (occluder) await occluder.close();
    }
    if (!attempt.observedHidden) {
      await neutral(a.page);
      continue;
    }
    await focus(a.page);
    await ready(a.page);
    const returnMark = await a.page.evaluate(() => window.sent.length);
    assert.ok(
      await until(
        a.page,
        (n) =>
          window.sent.slice(n).filter((message) => message.type === "input")
            .length >= 5,
        5000,
        returnMark,
      ),
      "Input scheduler did not resume",
    );
    const returned = await sample(a.page);
    const inputs = await a.page.evaluate(
      (n) => window.sent.slice(n).filter((message) => message.type === "input"),
      returnMark,
    );
    assert.ok(
      inputs.every(
        (message) =>
          !message.move &&
          !message.jump &&
          !message.hitHeld &&
          !message.hitPressed &&
          !message.jumpPressed,
      ),
      "Held keyboard/pad must stay released until neutral rearm",
    );
    assert.ok(
      returned.events.some(
        (event) =>
          event.type === "visibilitychange" && !event.hidden && event.trusted,
      ),
    );
    assert.equal(returned.latest.room, room);
    assert.ok(
      returned.diagnostics.renderer.frames >
        attempt.hiddenEnd.diagnostics.renderer.frames,
      "GPU drawing resumes",
    );
    assert.equal(
      returned.diagnostics.quality.reductions,
      before.diagnostics.quality.reductions,
      "Hidden interval must not lower drawing quality",
    );
    assert.equal(
      returned.diagnostics.quality.samples,
      0,
      "Visible return enters quality grace",
    );
    await neutral(a.page);
    const rearmMark = await a.page.evaluate(() => window.sent.length);
    await pad(a.page, 0.8, true);
    assert.ok(
      await until(
        a.page,
        (n) =>
          window.sent
            .slice(n)
            .some(
              (message) =>
                message.type === "input" &&
                message.move === 1 &&
                message.jumpPressed,
            ),
        5000,
        rearmMark,
      ),
      "New post-neutral pad input must work",
    );
    await neutral(a.page);
    attempt.returned = returned;
    attempt.rearmed = true;
    report.checks.genuineHiddenReleaseNoDrawsAuthorityContinuityReturnAndNeutralRearm =
      {
        strategy,
        room,
        hiddenMs: attempt.hiddenEnd.at - attempt.hiddenStart.at,
      };
    await a.page.screenshot({
      path: values.output + "/visible-after-return.png",
    });
    verified = true;
    break;
  }
  assert.ok(
    verified,
    "No genuine hidden visibility event was obtained; visibility acceptance remains unverified (see attempts)",
  );
  if (values.bfcache) {
    await a.page.goto("about:blank");
    await pause(200);
    await a.page.goBack();
    await ready(a.page);
    const history = await a.page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("renderer-visibility-events") ?? "[]"),
    );
    const observed = history.some(
      (event) => event.type === "pageshow" && event.persisted === true,
    );
    report.checks.bfcache = { observed, events: history };
    if (!observed)
      report.limits.push(
        "Back/forward navigation did not produce persisted=true; BFCache lifecycle remains unverified. Active WebSocket/browser cache policy may exclude this page.",
      );
  } else report.limits.push("Optional BFCache navigation was not requested.");
  assert.deepEqual(report.errors, []);
  report.complete = true;
} catch (error) {
  report.error = String(error);
  throw error;
} finally {
  try {
    await writeFile(
      values.output + "/visibility.json",
      JSON.stringify(report, null, 2) + "\n",
    );
  } finally {
    const cleanup = await Promise.allSettled(
      externalBrowsers.map(closeExternalBrowser),
    );
    for (const result of cleanup)
      if (result.status === "rejected") console.error(result.reason);
  }
}
