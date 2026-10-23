import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const { values } = parseArgs({
  options: {
    output: { type: "string", default: "artifacts/pixi-migration/acceptance" },
    url: {
      type: "string",
      default: "http://127.0.0.1:18926/badminton-h5-online/",
    },
    executable: {
      type: "string",
      default:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    },
  },
});
const root = values.output;
await mkdir(root, { recursive: true });
const report = {
  environment:
    "Isolated built application; two Chromium guests, native keys/pointer and synthetic standard Gamepad API. No physical devices or real two-computer latency acceptance.",
  checks: {},
  matches: [],
  errors: [],
  failedRequests: [],
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
async function guest(storage = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    hasTouch: true,
  });
  await context.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage))
      localStorage.setItem(key, value);
    window.wire = [];
    window.sent = [];
    window.pad = {
      index: 0,
      id: "Synthetic standard speed-controls probe",
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
          ...window.pad,
          axes: [...window.pad.axes],
          buttons: window.pad.buttons.map((b) => ({ ...b })),
        },
      ],
    });
    window.padButton = (i, pressed) =>
      (window.pad.buttons[i] = {
        pressed,
        touched: pressed,
        value: pressed ? 1 : 0,
      });
    const Original = window.WebSocket;
    window.WebSocket = class extends Original {
      constructor(...args) {
        super(...args);
        window.socket = this;
        this.addEventListener("message", (e) =>
          window.wire.push(JSON.parse(e.data)),
        );
      }
      send(raw) {
        window.sent.push(JSON.parse(raw));
        super.send(raw);
      }
    };
  }, storage);
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      report.errors.push(
        message.text() +
          (location.url ? ` (${location.url}:${location.lineNumber})` : ""),
      );
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      report.failedRequests.push({
        url: response.url(),
        status: response.status(),
      });
  });
  page.on("requestfailed", (request) =>
    report.failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText,
    }),
  );
  await page.goto(values.url);
  await ready(page);
  return { context, page };
}
async function ready(page) {
  await page.waitForFunction(
    () =>
      document.querySelector("#loading-screen")?.hidden &&
      !document.querySelector("#start")?.disabled &&
      document.querySelector("#connection-dot")?.classList.contains("online"),
    null,
    { timeout: 45000, polling: 20 },
  );
}
async function focus(page) {
  await page.bringToFront();
  await page.locator("#game").focus();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForTimeout(90);
}
const click = (page, selector) =>
  page.locator(selector).click({ noWaitAfter: true });
async function open(page) {
  await page.bringToFront();
  await click(page, "#settings");
  await page.locator("#settings-panel").waitFor({ state: "visible" });
}
async function close(page) {
  await click(page, "#settings-close");
  await page.locator("#settings-panel").waitFor({ state: "hidden" });
}
const codes = (page, action) =>
  page
    .locator(`[data-binding-action="${action}"] [data-binding-remove]`)
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.bindingRemove));
const snapshot = (page) =>
  page.evaluate(() => window.wire.filter((m) => m.type === "snapshot").at(-1));
const mark = (page) => page.evaluate(() => window.wire.length);
const sentMark = (page) => page.evaluate(() => window.sent.length);
async function waitWire(page, predicate, arg, timeout = 6000) {
  await page.waitForFunction(predicate, arg, { timeout, polling: 20 });
}
async function bounded(page, selector) {
  const box = await page.locator(selector).boundingBox(),
    size = page.viewportSize();
  assert.ok(
    box &&
      box.width > 0 &&
      box.height > 0 &&
      box.x >= -1 &&
      box.y >= -1 &&
      box.x + box.width <= size.width + 1 &&
      box.y + box.height <= size.height + 1,
    selector + " " + JSON.stringify(box),
  );
}
async function selected(page, speed) {
  assert.equal(
    await page
      .locator(`[data-shuttle-speed="${speed}"]`)
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.locator('[data-shuttle-speed][aria-pressed="true"]').count(),
    1,
  );
}
async function queue(page, speed) {
  await click(page, `[data-shuttle-speed="${speed}"]`);
  await selected(page, speed);
  const before = await mark(page);
  await click(page, "#start");
  await waitWire(
    page,
    (n) => window.wire.slice(n).some((m) => m.type === "queued"),
    before,
  );
}
async function roomReady(page, old) {
  await waitWire(
    page,
    (old) =>
      window.wire.some(
        (m) =>
          m.type === "snapshot" &&
          m.room !== old &&
          m.state.phase === "playing",
      ),
    old,
    15000,
  );
  return (await snapshot(page)).room;
}
async function recovery(page, side) {
  await waitWire(
    page,
    (side) => {
      const s = window.wire.filter((m) => m.type === "snapshot").at(-1);
      return (
        s?.state.players[side].swingFrame === 1 &&
        !s.state.players[side].swinging
      );
    },
    side,
  );
}
async function checkSwing(page, side, keys, expected) {
  await recovery(page, side);
  await focus(page);
  const before = await mark(page),
    sent = await sentMark(page);
  for (const key of keys) await page.keyboard.down(key);
  await waitWire(
    page,
    ({ before, side, expected }) =>
      window.wire
        .slice(before)
        .some(
          (m) =>
            m.type === "snapshot" &&
            m.state.players[side].swinging &&
            m.state.players[side].swingKind === expected,
        ),
    { before, side, expected },
  );
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
  const frames = await page.evaluate(
    (n) =>
      window.sent.slice(n).filter((m) => m.type === "input" && m.hitPressed),
    sent,
  );
  assert.equal(frames.length, 1);
  assert.equal(
    frames[0].swing,
    keys.includes("w") !== keys.includes("s")
      ? keys.includes("w")
        ? "overhead"
        : "underhand"
      : "auto",
  );
  return frames[0];
}
function equalStates(a, b, room) {
  const byTick = new Map(
    b
      .filter((m) => m.type === "snapshot" && m.room === room)
      .map((m) => [m.tick, m]),
  );
  let count = 0;
  for (const s of a.filter((m) => m.type === "snapshot" && m.room === room)) {
    const other = byTick.get(s.tick);
    if (other) {
      assert.deepEqual(s.state, other.state);
      count++;
    }
  }
  return count;
}

try {
  const leftGuest = await guest(),
    rightGuest = await guest();
  const left = leftGuest.page,
    right = rightGuest.page;
  assert.equal(
    await left.evaluate(() => typeof window.badmintonDiagnostics),
    "undefined",
  );
  report.checks.defaultDiagnosticsAbsent = true;
  assert.equal(
    await left.getByRole("group", { name: "球速场次", exact: true }).count(),
    1,
  );
  assert.deepEqual(
    (await left.locator("[data-shuttle-speed]").allTextContents()).map((text) =>
      text.trim(),
    ),
    ["1x", "1.25x", "1.5x", "2x"],
  );
  await selected(left, 1);
  for (const page of [left, right]) {
    await open(page);
    assert.deepEqual(await codes(page, "jump"), ["KeyK", "ArrowUp"]);
    assert.deepEqual(await codes(page, "hit"), ["KeyJ", "Space", "ArrowDown"]);
    assert.deepEqual(await codes(page, "overhead"), ["KeyW"]);
    assert.deepEqual(await codes(page, "underhand"), ["KeyS"]);
    if (page === right) await page.locator("#self-left-view").check();
    await close(page);
    await click(page, '[data-character="pirate"]');
  }
  await queue(left, 1);
  await queue(right, 1.25);
  await right.waitForTimeout(400);
  for (const page of [left, right]) {
    assert.equal(
      await page.evaluate(
        () => window.wire.filter((m) => m.type === "matched").length,
      ),
      0,
    );
    assert.ok(await page.locator('[data-shuttle-speed="2"]').isDisabled());
  }
  await click(right, "#cancel");
  await ready(right);
  await queue(right, 1);
  const room = await roomReady(right);
  await roomReady(left);
  assert.equal((await snapshot(right)).state.shuttleSpeed, 1);
  assert.equal(
    await right.evaluate(
      () => window.wire.find((m) => m.type === "matched").side,
    ),
    "right",
  );
  // Real WebGL loss/restore through the existing canvas, retaining this room.
  await right.waitForFunction(
    () => document.querySelector("#loading-screen").hidden,
    null,
    { timeout: 90000 },
  );
  const lossProbe = await right.evaluate(() => {
    const canvas = document.querySelector("#game");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) throw new Error("Product canvas is not WebGL");
    window.lossExtension = gl.getExtension("WEBGL_lose_context");
    if (!window.lossExtension)
      throw new Error("WEBGL_lose_context unavailable");
    return {
      version: gl.getParameter(gl.VERSION),
      tick: window.wire.filter((m) => m.type === "snapshot").at(-1)?.tick,
    };
  });
  await right.evaluate(() => window.lossExtension.loseContext());
  await right.waitForFunction(
    () => !document.querySelector("#loading-screen").hidden,
    null,
    { timeout: 10000 },
  );
  const lossMark = await mark(right);
  await right.waitForTimeout(400);
  await waitWire(
    right,
    (n) => window.wire.slice(n).some((m) => m.type === "snapshot"),
    lossMark,
  );
  await right.evaluate(() => window.lossExtension.restoreContext());
  await right.waitForFunction(
    () => document.querySelector("#loading-screen").hidden,
    null,
    { timeout: 30000 },
  );
  assert.equal((await snapshot(right)).room, room);
  assert.ok((await snapshot(right)).tick > lossProbe.tick);
  report.checks.webglContextLossRestoreRetainsAuthorityRoom = lossProbe;
  report.checks.defaultChoicesDifferentTierIsolationCancelRequeueAndLock = true;
  console.log("Speed controls: choices, isolation, same-tier match checked");

  const s = await snapshot(right);
  const server = s.state.server,
    nonServer = server === "left" ? "right" : "left";
  const actor = nonServer === "left" ? left : right;
  await focus(actor);
  let sent = await sentMark(actor);
  await actor.keyboard.down("w");
  await actor.waitForTimeout(100);
  await actor.keyboard.up("w");
  await actor.keyboard.down("s");
  await actor.waitForTimeout(100);
  await actor.keyboard.up("s");
  const modifierFrames = await actor.evaluate(
    (n) => window.sent.slice(n).filter((m) => m.type === "input"),
    sent,
  );
  assert.ok(
    modifierFrames.length > 0 &&
      modifierFrames.every(
        (m) => !m.jump && !m.jumpPressed && !m.hitHeld && !m.hitPressed,
      ),
  );
  const ground = (await snapshot(actor)).state.players[nonServer].y;
  await actor.keyboard.press("k");
  await waitWire(
    actor,
    ({ side, ground }) =>
      window.wire.filter((m) => m.type === "snapshot").at(-1).state.players[
        side
      ].y <
      ground - 1,
    { side: nonServer, ground },
  );
  await waitWire(
    actor,
    (side) =>
      window.wire.filter((m) => m.type === "snapshot").at(-1).state.players[
        side
      ].grounded,
    nonServer,
  );
  await checkSwing(actor, nonServer, ["w", "j"], "overhead");
  await checkSwing(actor, nonServer, ["s", "j"], "underhand");
  await checkSwing(actor, nonServer, ["j"], "overhead");
  await checkSwing(actor, nonServer, ["w", "s", "j"], "overhead");
  await recovery(actor, nonServer);
  await focus(actor);
  sent = await sentMark(actor);
  await actor.keyboard.down("j");
  await actor.waitForTimeout(80);
  await actor.keyboard.down("s");
  await actor.waitForTimeout(140);
  await actor.keyboard.up("s");
  await actor.keyboard.up("j");
  assert.equal(
    await actor.evaluate(
      (n) =>
        window.sent.slice(n).filter((m) => m.type === "input" && m.hitPressed)
          .length,
      sent,
    ),
    1,
  );
  report.checks.defaultJKModifiersAutoBothAndNoHeldRetarget = true;
  console.log("Speed controls: native J/K/W/S actions checked");

  // Representative logical touch and standard-pad controls, including mirror move.
  await recovery(actor, nonServer);
  await focus(right);
  sent = await sentMark(right);
  await right.evaluate(() => (window.pad.axes[0] = 0.8));
  await waitWire(
    right,
    (n) =>
      window.sent.slice(n).some((m) => m.type === "input" && m.move === -1),
    sent,
  );
  await right.evaluate(() => (window.pad.axes[0] = 0));
  await right.waitForTimeout(100);
  await right.evaluate(() => window.padButton(0, true));
  await right.waitForTimeout(80);
  await right.evaluate(() => window.padButton(0, false));
  await waitWire(
    right,
    () =>
      window.wire.filter((m) => m.type === "snapshot").at(-1).state.players
        .right.grounded,
  );
  await focus(actor);
  sent = await sentMark(actor);
  await click(actor, '[data-control="hit"]');
  await waitWire(
    actor,
    (n) =>
      window.sent
        .slice(n)
        .some((m) => m.type === "input" && m.hitPressed && m.swing === "auto"),
    sent,
  );
  report.checks.mirroredGamepadMoveJumpAndTouchAuto = true;

  // Close a held modifier connection and recover exactly the retained room/tier.
  await focus(right);
  await right.keyboard.down("w");
  const before = await mark(right);
  await right.evaluate(() =>
    window.socket.close(4000, "isolated speed controls reconnect"),
  );
  await right.keyboard.up("w");
  await waitWire(
    right,
    (n) => window.wire.slice(n).some((m) => m.type === "matched" && m.resumed),
    before,
    15000,
  );
  const resumed = await right.evaluate(
    (n) => window.wire.slice(n).find((m) => m.type === "matched" && m.resumed),
    before,
  );
  assert.equal(resumed.room, room);
  assert.equal(resumed.shuttleSpeed, 1);
  await focus(right);
  await right.waitForTimeout(100);
  assert.equal((await snapshot(right)).state.shuttleSpeed, 1);
  report.checks.retainedCookieRoomTierAndInputClear = true;

  // End a natural seven-point game in each tier using actual key serves.
  let currentRoom = room;
  for (const speed of [1, 1.25, 1.5, 2]) {
    if (speed !== 1) {
      const oldRoom = currentRoom;
      for (const page of [left, right]) await queue(page, speed);
      currentRoom = await roomReady(right, oldRoom);
      await roomReady(left, oldRoom);
    }
    assert.equal((await snapshot(right)).state.shuttleSpeed, speed);
    let launched = false,
      servedDedicated = false;
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      const state = (await snapshot(right)).state;
      if (state.winner) break;
      if (state.phase === "playing" && state.shuttle.state === "attached") {
        const page = state.server === "left" ? left : right;
        await focus(page);
        const n = await mark(page);
        await page.keyboard.down("w");
        await page.keyboard.down("j");
        await page.waitForTimeout(70);
        await page.keyboard.up("j");
        await page.keyboard.up("w");
        await page.waitForTimeout(160);
        const recent = await page.evaluate(
          (n) => window.wire.slice(n).filter((m) => m.type === "snapshot"),
          n,
        );
        launched ||= recent.some((m) => m.state.shuttle.state === "flying");
        servedDedicated ||= recent.some(
          (m) =>
            m.state.players[state.server].swingKind === "serve" &&
            m.state.players[state.server].swinging,
        );
      }
      await right.waitForTimeout(100);
    }
    await waitWire(
      right,
      (room) =>
        window.wire.some(
          (m) => m.type === "snapshot" && m.room === room && m.state.winner,
        ),
      currentRoom,
      1000,
    );
    await waitWire(
      left,
      () =>
        window.wire.filter((m) => m.type === "result" && m.reason === "score")
          .length >=
        window.wire.filter((m) => m.type === "matched" && !m.resumed).length,
    );
    await waitWire(
      right,
      () =>
        window.wire.filter((m) => m.type === "result" && m.reason === "score")
          .length >=
        window.wire.filter((m) => m.type === "matched" && !m.resumed).length,
    );
    const wires = await Promise.all([
      left.evaluate(() => window.wire),
      right.evaluate(() => window.wire),
    ]);
    const results = wires.map((w) =>
      w.filter((m) => m.type === "result" && m.reason === "score").at(-1),
    );
    assert.deepEqual(results[0], results[1]);
    assert.equal(Math.max(results[1].score.left, results[1].score.right), 7);
    assert.ok(launched && servedDedicated);
    const equal = equalStates(wires[0], wires[1], currentRoom);
    assert.ok(equal > 50);
    assert.match(
      await right.locator("#overlay-detail").textContent(),
      new RegExp(speed + "x 场"),
    );
    await click(right, `[data-shuttle-speed="${speed === 2 ? 1 : 2}"]`);
    assert.match(
      await right.locator("#overlay-detail").textContent(),
      new RegExp(speed + "x 场"),
    );
    report.matches.push({
      speed,
      room: currentRoom,
      result: results[1],
      equalAuthoritySnapshots: equal,
    });
    console.log(
      "Speed controls: natural game " +
        speed +
        "x completed (" +
        equal +
        " same-tick states)",
    );
  }
  report.checks.fourTierNaturalResultsSameTickAuthorityAndResultSpeed = true;

  // Six native settings rows and match selectors remain reachable in compact views.
  for (const size of [
    { width: 320, height: 568 },
    { width: 812, height: 375 },
  ]) {
    await right.setViewportSize(size);
    await open(right);
    await bounded(right, "#settings-panel");
    for (const selector of [
      '[data-binding-add="overhead"]',
      '[data-binding-add="underhand"]',
      "#controls-reset",
      "#gamepad-detect",
      "#settings-close",
    ]) {
      await right.locator(selector).scrollIntoViewIfNeeded();
      await bounded(right, selector);
    }
    await right.screenshot({
      path: root + `/settings-${size.width}x${size.height}.png`,
    });
    await close(right);
    for (const selector of [
      '[data-shuttle-speed="1"]',
      '[data-shuttle-speed="2"]',
      "#start",
    ]) {
      await right.locator(selector).scrollIntoViewIfNeeded();
      await bounded(right, selector);
    }
  }
  report.checks.compactSixRowsAndSpeedMenuReachable = true;
  await leftGuest.context.close();
  await rightGuest.context.close();

  const legacyKey = "fiso-online:controls:v1",
    v2Key = "fiso-online:controls:v2";
  const legacy = {
    version: 1,
    bindings: {
      left: ["ArrowLeft", "KeyA"],
      right: ["KeyD", "ArrowRight"],
      jump: ["ArrowUp", "KeyW"],
      hit: ["ArrowDown", "KeyS", "Space"],
    },
    gamepadEnabled: false,
  };
  const defaults = await guest({ [legacyKey]: JSON.stringify(legacy) });
  await open(defaults.page);
  assert.deepEqual(await codes(defaults.page, "jump"), ["KeyK", "ArrowUp"]);
  assert.deepEqual(await codes(defaults.page, "hit"), [
    "KeyJ",
    "Space",
    "ArrowDown",
  ]);
  assert.equal(
    await defaults.page.locator("#gamepad-enabled").isChecked(),
    false,
  );
  assert.equal(
    await defaults.page.evaluate((key) => localStorage.getItem(key), legacyKey),
    JSON.stringify(legacy),
  );
  await defaults.context.close();
  const custom = {
    version: 1,
    bindings: { left: ["KeyW"], right: ["KeyS"], jump: [], hit: ["KeyF"] },
    gamepadEnabled: true,
  };
  const migrated = await guest({ [legacyKey]: JSON.stringify(custom) });
  await open(migrated.page);
  assert.deepEqual(await codes(migrated.page, "left"), ["KeyW"]);
  assert.deepEqual(await codes(migrated.page, "right"), ["KeyS"]);
  assert.deepEqual(await codes(migrated.page, "jump"), []);
  assert.deepEqual(await codes(migrated.page, "overhead"), []);
  assert.deepEqual(await codes(migrated.page, "underhand"), []);
  assert.match(
    await migrated.page.locator("#binding-status").textContent(),
    /未设置/,
  );
  await click(migrated.page, '[data-binding-add="overhead"]');
  await migrated.page.keyboard.press("q");
  assert.deepEqual(await codes(migrated.page, "overhead"), ["KeyQ"]);
  const saved = await migrated.page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    v2Key,
  );
  assert.equal(saved.version, 2);
  assert.equal(
    await migrated.page.evaluate((key) => localStorage.getItem(key), legacyKey),
    JSON.stringify(custom),
  );
  await click(migrated.page, "#controls-reset");
  assert.deepEqual(await codes(migrated.page, "jump"), ["KeyK", "ArrowUp"]);
  await migrated.context.close();
  const invalid = await guest({
    [legacyKey]: JSON.stringify(custom),
    [v2Key]: '{"version":999}',
  });
  await open(invalid.page);
  assert.deepEqual(await codes(invalid.page, "left"), ["KeyA", "ArrowLeft"]);
  assert.deepEqual(await codes(invalid.page, "overhead"), ["KeyW"]);
  await invalid.context.close();
  report.checks.legacyDefaultsCustomConflictMigrationV2PersistenceResetAndInvalidFallback = true;
  const expired = await guest();
  await expired.page.evaluate(() => {
    window.socket.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          type: "result",
          winner: null,
          reason: "disconnect",
          score: { left: 3, right: 4 },
        }),
      }),
    );
    window.socket.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({ type: "idle", reason: "disconnect" }),
      }),
    );
  });
  const expiredText = await expired.page
    .locator("#overlay-detail")
    .textContent();
  assert.match(expiredText, /3 : 4/);
  assert.doesNotMatch(expiredText, /undefined|NaN|[0-9]x 场/);
  assert.match(
    await expired.page.locator("#match-status").textContent(),
    /重连超时/,
  );
  assert.equal(
    await expired.page.evaluate(
      () => window.wire.filter((m) => m.type === "matched").length,
    ),
    0,
  );
  await expired.context.close();
  report.checks.resultWithoutMatchedOmitsUnconfirmedSpeed = true;
  assert.deepEqual(report.errors, []);
  report.complete = true;
  await writeFile(
    root + "/browser-results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = String(error);
  await writeFile(
    root + "/browser-partial.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  throw error;
} finally {
  await browser.close();
}
