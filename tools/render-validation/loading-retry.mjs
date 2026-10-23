import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const { values } = parseArgs({
  options: {
    url: {
      type: "string",
      default: "http://127.0.0.1:18926/badminton-h5-online/",
    },
    output: { type: "string", default: "artifacts/pixi-migration/acceptance" },
    executable: {
      type: "string",
      default:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    },
  },
});
await mkdir(values.output, { recursive: true });
const report = { expectedFailedRequests: [], errors: [], checks: {} };
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
async function guest() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(() => {
    window.wire = [];
    window.sent = [];
    const WS = WebSocket;
    window.WebSocket = class extends WS {
      constructor(...args) {
        super(...args);
        this.addEventListener("message", (e) =>
          window.wire.push(JSON.parse(e.data)),
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
  return { page, context };
}
async function ready(page) {
  await page.waitForFunction(
    () =>
      document.querySelector("#loading-screen").hidden &&
      !document.querySelector("#start").disabled &&
      document.querySelector("#connection-dot").classList.contains("online"),
    null,
    { timeout: 90000 },
  );
}
try {
  const startup = await guest();
  let fail = true;
  await startup.page.route("**/classic-atlas/**/*.png*", (route) => {
    if (fail) {
      report.expectedFailedRequests.push(route.request().url());
      return route.abort("failed");
    }
    return route.continue();
  });
  await startup.page.goto(values.url);
  await startup.page
    .locator("#loading-retry")
    .waitFor({ state: "visible", timeout: 90000 });
  assert.equal(
    await startup.page.locator("#loading-screen").getAttribute("data-stage"),
    "failed",
  );
  assert.ok(await startup.page.locator("#start").isDisabled());
  fail = false;
  await startup.page.locator("#loading-retry").click();
  await ready(startup.page);
  report.checks.startupPngFailureNativeReloadRetry = true;
  await startup.context.close();

  const a = await guest(),
    b = await guest();
  for (const guest of [a, b]) {
    await guest.page.goto(values.url);
    await ready(guest.page);
  }
  await a.page.route("**/classic-atlas/**/body-toaster-*.png*", (route) => {
    report.expectedFailedRequests.push(route.request().url());
    return route.abort("failed");
  });
  await a.page.locator('[data-character="pirate"]').click();
  await b.page.locator('[data-character="toaster"]').click();
  for (const guest of [a, b]) await guest.page.locator("#start").click();
  await a.page
    .locator("#loading-retry")
    .waitFor({ state: "visible", timeout: 90000 });
  await a.page.locator("#loading-exit").waitFor({ state: "visible" });
  await a.page.waitForFunction(() =>
    window.wire.some((m) => m.type === "matched"),
  );
  const at = await a.page.evaluate(() => ({
    sent: window.sent.length,
    tick: window.wire.filter((m) => m.type === "snapshot").at(-1)?.tick ?? 0,
  }));
  await a.page.keyboard.down("j");
  await a.page.keyboard.down("d");
  await a.page.waitForTimeout(350);
  await a.page.keyboard.up("d");
  await a.page.keyboard.up("j");
  const inputs = await a.page.evaluate(
    (n) => window.sent.slice(n).filter((m) => m.type === "input"),
    at.sent,
  );
  assert.ok(
    inputs.every(
      (input) => !input.hitPressed && !input.jumpPressed && !input.move,
    ),
    "Art failure gates gameplay input",
  );
  await a.page.waitForFunction(
    (tick) =>
      window.wire.filter((m) => m.type === "snapshot").at(-1)?.tick > tick,
    at.tick,
  );
  await a.page.screenshot({ path: values.output + "/matched-art-failure.png" });
  await a.page.locator("#loading-exit").click();
  await a.page.waitForFunction(
    () => window.sent.some((m) => m.type === "leave"),
    null,
    { timeout: 5000 },
  );
  report.checks.liveRoleFailureKeepsSnapshotsGatesInputAndAllowsExit = true;
  await a.context.close();
  await b.context.close();
  assert.ok(report.expectedFailedRequests.length > 0);
  assert.deepEqual(report.errors, []);
  report.complete = true;
} finally {
  await writeFile(
    values.output + "/loading-retry.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
