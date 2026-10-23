import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
// DOM predicates, synthetic keyboard driver, frame/long-task measurement, duration
// windows, and sequencing below are unchanged from the formal Canvas baseline:
// sha256 97a80313b62aea50e011efcfbba8c081eda38f62f0205c80c4aec18a352cbe9b.
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    seconds: { type: "string", default: process.env.BENCH_SECONDS ?? "75" },
    output: { type: "string", default: "artifacts/pixi-migration" },
    url: {
      type: "string",
      default: "http://127.0.0.1:18926/badminton-h5-online/?debug=1",
    },
    executable: {
      type: "string",
      default:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    },
  },
});
const variant = positionals[0] ?? "pixi";
if (!/^[a-zA-Z0-9_-]+$/.test(variant))
  throw new Error("Invalid report variant");
const duration = Number(values.seconds);
if (!Number.isFinite(duration) || duration <= 0)
  throw new Error("Invalid duration");
const root = values.output;
await mkdir(root, { recursive: true });
const summary = (values) => {
  const a = values.toSorted((a, b) => a - b);
  return {
    count: a.length,
    mean: a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0,
    p95: a[Math.floor((a.length - 1) * 0.95)] ?? 0,
    max: a.at(-1) ?? 0,
  };
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
const report = {
  variant,
  measurementNotes: {
    readyMs:
      "performance.now observed after readiness polling; not exact cover-hide timestamp",
    resources:
      "Recorded ResourceTiming entries only; default browser buffer can truncate. Sum is a subtotal, not all bytes.",
    cache:
      "New browser contexts for cold; same contexts reload after clearing cookies for warm. HTTP cache preserved; server sends no Cache-Control, matching formal baseline.",
    heap: "CDP measured JS heap only; renderer RGBA values are estimates, not total process/GPU memory.",
    workload:
      "Two guests, 50ms native logical KeyboardEvents, mixed play/result/rematch; summary is whole measurement window.",
  },
  browser: browser.version(),
  viewport: { width: 1440, height: 1000 },
  dpr: 2,
  duration,
  characters: ["toaster", "pirate"],
  errors: [],
  runs: [],
};
const guests = [];
try {
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext({
      viewport: report.viewport,
      deviceScaleFactor: report.dpr,
      hasTouch: true,
    });
    await context.addInitScript(() => {
      const m = (window.measure = {
        gaps: [],
        long: [],
        wire: [],
        sent: 0,
        held: new Set(),
        running: false,
        matches: 0,
        results: 0,
        animations: {},
        effectKinds: {},
        resultAt: 0,
      });
      const original = requestAnimationFrame;
      let last;
      window.requestAnimationFrame = function (cb) {
        return original.call(this, (t) => {
          cb(t);
          if (m.running && t !== last) {
            if (last !== undefined) m.gaps.push(t - last);
            last = t;
          }
        });
      };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) m.long.push(e.duration);
      }).observe({ type: "longtask", buffered: true });
      const WS = WebSocket;
      window.WebSocket = class extends WS {
        constructor(...args) {
          super(...args);
          this.addEventListener("message", (e) => {
            const v = JSON.parse(e.data);
            if (v.type === "matched") {
              m.side = v.side;
              m.matches++;
              m.resultAt = 0;
            }
            if (v.type === "result") {
              m.results++;
              m.resultAt = performance.now();
            }
            if (v.type === "snapshot") {
              m.last = v;
              for (const p of Object.values(v.state.players))
                m.animations[
                  p.characterId + ":" + p.bodyFrame + ":" + p.swingKind
                ] = true;
              for (const e of v.effects.events)
                for (const k of Object.keys(e))
                  m.effectKinds[k] = (m.effectKinds[k] ?? 0) + 1;
            }
          });
        }
        send(raw) {
          m.sent++;
          super.send(raw);
        }
      };
      const keys = {
        KeyA: "a",
        KeyD: "d",
        KeyJ: "j",
        KeyK: "k",
        KeyW: "w",
        KeyS: "s",
      };
      const hold = (code, down) => {
        if (m.held.has(code) === down) return;
        down ? m.held.add(code) : m.held.delete(code);
        window.dispatchEvent(
          new KeyboardEvent(down ? "keydown" : "keyup", {
            code,
            key: keys[code],
            bubbles: true,
            cancelable: true,
          }),
        );
      };
      window.measureStart = () => {
        window.dispatchEvent(new Event("focus"));
        document.querySelector("#game").focus();
        m.running = true;
        m.started = performance.now();
        m.bot = setInterval(() => {
          const s = m.last,
            at = performance.now(),
            age = at - m.started;
          if (!s || s.status !== "playing") {
            for (const c of [...m.held]) hold(c, false);
            if (m.resultAt && at - m.resultAt >= 5000) {
              const b = document.querySelector("#start");
              if (!b.hidden && !b.disabled) {
                m.resultAt = at;
                b.click();
              }
            }
            return;
          }
          const cycle = age % 7000,
            inward = cycle < 950,
            outward = cycle >= 950 && cycle < 1900;
          hold("KeyD", m.side === "left" ? inward : outward);
          hold("KeyA", m.side === "right" ? inward : outward);
          hold("KeyK", age % 2400 < 100);
          hold("KeyW", age % 4000 < 1800);
          hold("KeyS", age % 4000 >= 2000 && age % 4000 < 3800);
          hold("KeyJ", age % 650 < 110);
        }, 50);
      };
      window.measureStop = () => {
        m.running = false;
        clearInterval(m.bot);
        for (const c of [...m.held]) hold(c, false);
      };
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => report.errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") report.errors.push(m.text());
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    guests.push({ context, page, cdp });
  }
  for (const cache of ["cold", "warm"]) {
    const run = {
      cache,
      loading: [],
      frames: [[], []],
      longTasks: [[], []],
      samples: [],
    };
    report.runs.push(run);
    if (cache === "warm")
      for (const { context } of guests) await context.clearCookies();
    for (const { page } of guests) {
      if (cache === "cold") await page.goto(values.url);
      else await page.reload();
      await page.waitForFunction(
        () =>
          document.querySelector("#loading-screen")?.hidden &&
          !document.querySelector("#start")?.disabled &&
          document
            .querySelector("#connection-dot")
            ?.classList.contains("online"),
        null,
        { timeout: 90000 },
      );
      run.loading.push(
        await page.evaluate(() => ({
          readyMs: performance.now(),
          longTasks: window.measure.long.splice(0),
          resources: performance.getEntriesByType("resource").map((e) => ({
            url: e.name.split("/").at(-1),
            bytes: e.encodedBodySize,
            transfer: e.transferSize,
            duration: e.duration,
          })),
          canvas: {
            width: document.querySelector("#game").width,
            height: document.querySelector("#game").height,
            cssWidth: document.querySelector("#game").clientWidth,
            cssHeight: document.querySelector("#game").clientHeight,
          },
        })),
      );
    }
    if (!report.gl)
      report.gl = await guests[0].page.evaluate(() => {
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
    for (let i = 0; i < 2; i++)
      await guests[i].page
        .locator(`[data-character="${report.characters[i]}"]`)
        .click();
    for (const { page } of guests) await page.locator("#start").click();
    await Promise.all(
      guests.map(({ page }) =>
        page.waitForFunction(() => document.querySelector("#overlay").hidden),
      ),
    );
    await guests[0].page.screenshot({
      path: `${root}/${variant}-${cache}-intro.png`,
    });
    await Promise.all(
      guests.map(({ page }) =>
        page.evaluate(() => {
          window.measure.long = [];
          window.measureStart();
        }),
      ),
    );
    const began = Date.now();
    while (Date.now() - began < duration * 1000) {
      await new Promise((r) => setTimeout(r, 5000));
      const sample = await Promise.all(
        guests.map(async ({ page, cdp }, i) => {
          const value = await page.evaluate(() => ({
            gaps: window.measure.gaps.splice(0),
            long: window.measure.long.splice(0),
            diagnostics: window.badmintonDiagnostics.snapshot(),
            matches: window.measure.matches,
            results: window.measure.results,
            phase: window.measure.last?.state.phase,
            score: window.measure.last?.state.score,
            animations: window.measure.animations,
            effectKinds: window.measure.effectKinds,
            canvas: {
              width: document.querySelector("#game").width,
              height: document.querySelector("#game").height,
            },
          }));
          run.frames[i].push(...value.gaps);
          run.longTasks[i].push(...value.long);
          delete value.gaps;
          delete value.long;
          const { metrics } = await cdp.send("Performance.getMetrics");
          value.jsHeapUsedBytes = metrics.find(
            (m) => m.name === "JSHeapUsedSize",
          )?.value;
          return value;
        }),
      );
      run.samples.push({ atMs: Date.now() - began, guests: sample });
      await writeFile(
        `${root}/${variant}-benchmark.json`,
        JSON.stringify(report, null, 2),
      );
    }
    for (const { page } of guests)
      await page.evaluate(() => window.measureStop());
    await guests[0].page.screenshot({
      path: `${root}/${variant}-${cache}-end.png`,
    });
    for (const { page } of guests) {
      const leave = page.locator("#leave");
      if (await leave.isVisible()) await leave.click();
    }
    run.frameSummary = run.frames.map(summary);
    run.longTaskSummary = run.longTasks.map(summary);
    delete run.frames;
    delete run.longTasks;
    console.log(
      JSON.stringify({
        variant,
        cache,
        loadingMs: run.loading.map((l) => l.readyMs),
        frame: run.frameSummary,
        longTask: run.longTaskSummary,
        last: run.samples.at(-1),
      }),
    );
  }
  report.complete = true;
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(
    `${root}/${variant}-benchmark.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
