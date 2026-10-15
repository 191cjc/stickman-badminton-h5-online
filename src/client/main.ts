import "./style.css";
import { CLASSIC_WORLD as worldConfig } from "../shared/classic/types";
import {
  CHARACTERS,
  CHARACTER_IDS,
  type CharacterId,
} from "../shared/classic/characters";
import { Simulation } from "../shared/simulation";
import { INPUT_HZ, BASE_PATH } from "../shared/protocol";
import type { Snapshot, ServerMessage } from "../shared/protocol";
import type { Side, Viewport } from "../shared/types";
import { Input } from "./input";
import { Network } from "./network";
import { Prediction, Interpolation } from "./prediction";
import { Renderer } from "./renderer";
import { Effects } from "./effects";
import { Audio } from "./audio";
import { InputScheduler } from "./input-scheduler";
import { Diagnostics } from "./diagnostics";
import { LoadingError, type LoadingProgress } from "./loading";

function el<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing element: ${id}`);
  return value as T;
}
const canvas = el<HTMLCanvasElement>("game");
const loadingScreen = el("loading-screen"),
  loadingProgress = el<HTMLProgressElement>("loading-progress"),
  loadingRetry = el<HTMLButtonElement>("loading-retry");
const ctx = canvas.getContext("2d", { alpha: false });
if (!ctx) throw new Error("浏览器不支持 Canvas 2D");
const start = el<HTMLButtonElement>("start"),
  cancel = el<HTMLButtonElement>("cancel"),
  leave = el<HTMLButtonElement>("leave"),
  mute = el<HTMLButtonElement>("mute");
const startLabel = el("start-label"),
  rematchArt = el<HTMLImageElement>("rematch-art");
let rematchUp = "",
  rematchOver = "";
const renderer = new Renderer(),
  effects = new Effects(),
  audio = new Audio();
let assetsReady = false,
  interpolation = new Interpolation(),
  prediction: Prediction | undefined,
  latest: Snapshot | undefined,
  side: Side | undefined,
  room: string | undefined;
let selected: CharacterId = "joe",
  seq = 0,
  scene: "idle" | "queued" | "online" | "result" = "idle";
let backdrop = new Simulation().snapshot(),
  lastTime = 0;
let inputFocused = !document.hidden;
const diagnostics =
  new URLSearchParams(location.search).get("debug") === "1"
    ? new Diagnostics(() => ({
        renderer: renderer.diagnostics(),
        interpolation: interpolation.diagnostics(),
        prediction: prediction?.diagnostics(performance.now()),
        scheduler: scheduler.diagnostics(),
      }))
    : undefined;
if (diagnostics)
  Object.defineProperty(window, "badmintonDiagnostics", {
    value: Object.freeze({ snapshot: () => diagnostics.snapshot() }),
    configurable: false,
    writable: false,
  });
const characterButtons = new Map<CharacterId, HTMLButtonElement>();
for (const id of CHARACTER_IDS) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.character = id;
  button.setAttribute("aria-pressed", String(id === selected));
  const picture = document.createElement("img");
  picture.alt = "";
  picture.loading = "eager";
  picture.className = "character-picture";
  const name = document.createElement("span");
  name.textContent = CHARACTERS[id].name;
  button.append(picture, name);
  button.addEventListener("click", () => {
    if (!assetsReady) return;
    if (scene !== "idle" && scene !== "result") return;
    selected = id;
    updateSelection();
  });
  characterButtons.set(id, button);
  el("character-grid").append(button);
}
function updateSelection(): void {
  for (const [id, button] of characterButtons) {
    button.setAttribute("aria-pressed", String(selected === id));
    button.disabled = !assetsReady || (scene !== "idle" && scene !== "result");
  }
  const p = CHARACTERS[selected];
  el("character-detail").textContent =
    `${p.label} · 移动 ${p.move.toFixed(2)} / 跳跃 ${p.jump.toFixed(2)} / 力量 ${p.power.toFixed(2)}`;
}
function overlay(
  tag: string,
  title: string,
  detail: string,
  visible = true,
): void {
  el("overlay").hidden = !visible;
  el("overlay-tag").textContent = tag;
  el("overlay-title").textContent = title;
  el("overlay-detail").textContent = detail;
}
function buttons(): void {
  start.hidden = scene === "online" || scene === "queued";
  start.disabled = !assetsReady || start.hidden;
  startLabel.textContent = network.refreshRequired
    ? "刷新页面"
    : network.connected
      ? scene === "result"
        ? "再次匹配"
        : "开始匹配"
      : "重新连接";
  const originalRematch =
    scene === "result" && network.connected && !network.refreshRequired;
  rematchArt.hidden = !originalRematch;
  start.classList.toggle("original-rematch", originalRematch);
  cancel.hidden = scene !== "queued";
  leave.hidden = scene !== "online";
  el("character-selection").hidden = scene !== "idle" && scene !== "result";
  el("overlay").classList.toggle("result", scene === "result");
  updateSelection();
}
function clearInput(notify = true): void {
  scheduler.setActive(false);
  input.release(false);
  prediction?.clear();
  if (notify) network.send({ type: "release" });
}
function toggleMute(): void {
  void audio.unlock();
  const muted = audio.toggle();
  mute.setAttribute("aria-pressed", String(muted));
  mute.textContent = muted ? "开启声音" : "静音";
}
function leaveMatch(): void {
  if (!assetsReady || scene !== "online") return;
  clearInput();
  audio.play("press");
  network.send({ type: "leave" });
}
const input = new Input(
  () => {
    inputFocused = false;
    scheduler.setActive(false);
    prediction?.clear();
    network.send({ type: "release" });
    effects.suspend();
    audio.setMatch(false);
  },
  toggleMute,
  leaveMatch,
  () => scheduler.request(),
);
const network = new Network(
  handleMessage,
  (connected, text) => {
    el("connection").textContent = text;
    el("connection-dot").classList.toggle("online", connected);
    if (!connected) {
      clearInput(false);
      effects.suspend();
      audio.setMatch(false);
      if (network.refreshRequired) {
        idle();
        overlay("版本更新", "请刷新页面", text);
      }
      if (scene === "online" || scene === "queued")
        overlay(
          "连接中断",
          network.refreshRequired ? "请刷新页面" : "正在恢复连接",
          text,
        );
    }
    buttons();
  },
  (rtt) => {
    el("rtt").textContent = `RTT ${rtt} ms`;
    diagnostics?.rtt(rtt);
  },
  diagnostics ? (at, bytes) => diagnostics.received(at, bytes) : undefined,
);
const scheduler = new InputScheduler(() => {
  if (!canSampleInput()) {
    scheduler.setActive(false);
    return;
  }
  const command = input.peek(seq + 1);
  const accepted = network.send(command);
  diagnostics?.input(performance.now(), accepted);
  if (!accepted) return;
  input.commit(command);
  seq++;
  if (latest!.state.phase === "playing")
    prediction?.accept(command, performance.now());
});
function canSampleInput(): boolean {
  return (
    assetsReady &&
    scene === "online" &&
    latest?.status === "playing" &&
    network.connected &&
    !document.hidden &&
    inputFocused
  );
}
function syncInputClock(): void {
  scheduler.setActive(canSampleInput());
}
window.addEventListener("focus", () => {
  inputFocused = true;
  syncInputClock();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    inputFocused = true;
    syncInputClock();
  }
});
function idle(reason?: string): void {
  // The initial WS idle can arrive after startup preparation. An already-empty
  // idle scene has no old room resources and must keep its warmed first screen.
  const alreadyIdle = scene === "idle" && room === undefined;
  clearInput(false);
  scene = "idle";
  latest = undefined;
  side = undefined;
  room = undefined;
  prediction = undefined;
  seq = 0;
  interpolation = new Interpolation();
  diagnostics?.resetTransport();
  effects.reset();
  if (!alreadyIdle) renderer.clearEffectsImages();
  audio.setMatch(false);
  overlay(
    "即刻开打",
    "选择角色，进入球场",
    reason === "queue_timeout"
      ? "匹配等待已超时，可以重新开始。"
      : reason === "disconnect"
        ? "断线保留时间已结束，可以再次匹配。"
        : "选择角色后点击「开始匹配」，另一位玩家加入后自动开赛。",
  );
  labels();
  buttons();
}
function labels(): void {
  el("left-label").textContent = side
    ? side === "left"
      ? "你 · 左侧"
      : "对手 · 左侧"
    : "左侧";
  el("right-label").textContent = side
    ? side === "right"
      ? "你 · 右侧"
      : "对手 · 右侧"
    : "右侧";
  el("hint").textContent = side
    ? `你控制${side === "left" ? "左侧" : "右侧"} · ${CHARACTERS[selected].name}。A/D 或 ←/→ 移动，W/↑ 跳跃，S/↓/空格击球与发球。M 静音，Esc 结束比赛。`
    : "两位玩家使用相同按键，匹配后显示你的场地位置。";
}
function handleMessage(message: ServerMessage): void {
  if (message.type === "idle") {
    if (
      scene === "result" &&
      ["finished", "disconnect", "left", "timeout"].includes(
        message.reason ?? "",
      )
    ) {
      latest = undefined;
      room = undefined;
      buttons();
      return;
    }
    idle(message.reason);
    return;
  }
  if (message.type === "queued") {
    clearInput(false);
    scene = "queued";
    latest = undefined;
    prediction = undefined;
    side = undefined;
    room = undefined;
    selected = message.character;
    effects.reset();
    renderer.clearEffectsImages();
    audio.setMatch(false);
    overlay(
      "匹配中",
      "正在寻找对手",
      `${CHARACTERS[selected].name} 已准备，另一位玩家加入后会自动开赛。`,
    );
    labels();
    buttons();
    return;
  }
  if (message.type === "matched") {
    clearInput(false);
    scene = "online";
    side = message.side;
    room = message.room;
    selected = message.characters[side];
    seq = 0;
    latest = undefined;
    prediction = undefined;
    interpolation = new Interpolation();
    diagnostics?.resetTransport();
    effects.reset(room, message.resumed);
    renderer.clearEffectsImages();
    audio.stop();
    overlay(
      "匹配成功",
      "准备开赛",
      `你在${side === "left" ? "左侧" : "右侧"}。`,
    );
    labels();
    buttons();
    if (assetsReady) canvas.focus();
    return;
  }
  if (message.type === "snapshot") {
    if ((scene !== "online" && scene !== "result") || message.room !== room)
      return;
    if (!interpolation.push(message, performance.now())) return;
    const wasPaused = latest?.status === "reconnecting";
    latest = message;
    seq = Math.max(seq, message.ack);
    if (side) {
      prediction ??= new Prediction(side, message.state.players[side]);
      prediction.reconcile(message, performance.now());
      const reading = prediction.diagnostics(performance.now());
      diagnostics?.reconcile(reading.correction, reading.ackAgeMs);
    }
    if (document.hidden) {
      effects.suspend();
      audio.setMatch(false);
    } else {
      effects.ingest(message);
      audio.setMatch(
        message.status === "playing" || message.resultReason === "score",
      );
    }
    if (scene === "online") {
      if (message.status === "reconnecting") {
        clearInput(false);
        if (!wasPaused) renderer.clearEffectsImages();
        overlay(
          "对手断线",
          "比赛已暂停",
          `等待重连，剩余 ${Math.ceil(message.reconnectRemainingMs / 1000)} 秒。`,
        );
      } else {
        if (wasPaused) clearInput(false);
        overlay("", "", "", false);
      }
    }
    updateHud(message.state);
    syncInputClock();
    return;
  }
  if (message.type === "result") {
    clearInput(false);
    scene = "result";
    effects.finish(message.reason === "score");
    const reason = {
      score: "比赛正常结束",
      leave: "有玩家主动结束比赛",
      disconnect: "重连超时，比赛按弃权结算",
      timeout: "比赛达到 20 分钟时限",
    }[message.reason];
    overlay(
      "比赛结果",
      message.winner === null
        ? "比赛结束"
        : message.winner === side
          ? "你赢了！"
          : "本场结束",
      `${message.score.left} : ${message.score.right} · ${reason}。选择角色后可再次匹配。`,
    );
    el("match-status").textContent = reason;
    buttons();
    return;
  }
  if (message.type === "error")
    el("match-status").textContent = `操作未完成：${message.code}`;
}
function updateHud(state: typeof backdrop): void {
  el("score-left").textContent = String(state.score.left);
  el("score-right").textContent = String(state.score.right);
  if (scene === "result") return;
  el("match-status").textContent =
    latest?.status === "reconnecting"
      ? "比赛暂停 · 等待重连"
      : state.phase === "point"
        ? `${state.server === side ? "你" : "对手"}得分 · 下一回合准备中`
        : state.shuttle.state === "attached"
          ? `${state.server === side ? "轮到你发球，按 S / ↓ / 空格" : "等待对手发球"} · 先到 7 分获胜`
          : `回合击球 ${state.rallyHits} 次 · 先到 7 分获胜`;
}
start.addEventListener("click", () => {
  if (!assetsReady || start.hidden) return;
  void audio.unlock();
  audio.play("press");
  if (network.refreshRequired) {
    location.reload();
    return;
  }
  if (!network.connected) {
    el("connection").textContent = "正在连接";
    void network.connect(true);
    return;
  }
  clearInput();
  seq = 0;
  network.send({ type: "queue", character: selected });
  start.disabled = true;
});
cancel.addEventListener("click", () => {
  if (!assetsReady || cancel.hidden) return;
  audio.play("press");
  network.send({ type: "cancel" });
});
leave.addEventListener("click", leaveMatch);
mute.addEventListener("click", toggleMute);
for (const button of [start, cancel, leave]) {
  button.addEventListener("pointerenter", () => audio.play("hover"));
}
for (const event of ["pointerenter", "focus"])
  start.addEventListener(event, () => {
    if (rematchOver) rematchArt.src = rematchOver;
  });
for (const event of ["pointerleave", "blur"])
  start.addEventListener(event, () => {
    if (rematchUp) rematchArt.src = rematchUp;
  });
function viewport(): Viewport {
  const width = canvas.clientWidth,
    height = canvas.clientHeight,
    dpr = Math.min(devicePixelRatio || 1, 2);
  const scale = Math.min(
    width / worldConfig.width,
    height / worldConfig.height,
  );
  return {
    width,
    height,
    scale,
    offsetX: (width - worldConfig.width * scale) / 2,
    offsetY: (height - worldConfig.height * scale) / 2,
    dpr,
  };
}
function frame(time: number): void {
  const began = diagnostics ? performance.now() : 0;
  requestAnimationFrame(frame);
  const dt = lastTime
    ? Math.max(0, Math.min((time - lastTime) / 1000, 0.1))
    : 1 / INPUT_HZ;
  lastTime = time;
  // Loading owns raster preparation. Do not start cold Canvas drawing or
  // presentation clocks underneath the independent startup cover.
  if (!assetsReady) return;
  if (canSampleInput() && latest?.state.phase === "playing")
    prediction?.advance(time);
  audio.advance(dt);
  let state = backdrop;
  if (latest) {
    state = interpolation.sample(time) ?? latest.state;
    effects.advance(state.elapsed * 60, dt, (sound) => audio.play(sound));
    if (
      scene === "online" &&
      latest.status === "playing" &&
      latest.state.phase === "playing" &&
      prediction &&
      side
    )
      state = {
        ...state,
        players: { ...state.players, [side]: prediction.drawState(dt) },
      };
    backdrop = state;
  } else if (scene === "result")
    effects.advance(state.elapsed * 60, dt, (sound) => audio.play(sound));
  const view = viewport();
  const pixelWidth = Math.max(1, Math.round(view.width * view.dpr)),
    pixelHeight = Math.max(1, Math.round(view.height * view.dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx!.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  renderer.render(
    ctx!,
    view,
    state,
    scene === "online" || scene === "result" ? effects : undefined,
  );
  diagnostics?.frame(time, performance.now() - began);
}
function loading(progress: LoadingProgress): void {
  loadingScreen.dataset.stage = progress.stage;
  const status = el("loading-status");
  if (status.textContent !== "加载中") status.textContent = "加载中";
  if (progress.total === undefined) {
    loadingProgress.removeAttribute("value");
    el("loading-count").textContent = "";
  } else {
    loadingProgress.max = Math.max(1, progress.total);
    loadingProgress.value = progress.completed;
    el("loading-count").textContent =
      `${progress.completed} / ${progress.total} ${progress.stage === "images" ? "张画面" : "项"}`;
  }
}
async function prepareCourt(): Promise<void> {
  // Room messages can replace or clear the scene during a slow load. Restart
  // only for an actual cache reset/viewport change, with a finite retry bound.
  for (let attempt = 0; attempt < 3; attempt++) {
    const view = viewport();
    const prepared = await renderer.prepare(
      view,
      latest?.state ?? backdrop,
      scene === "online" || scene === "result" ? effects : undefined,
      loading,
    );
    const currentView = viewport();
    if (
      prepared &&
      view.width === currentView.width &&
      view.height === currentView.height &&
      view.dpr === currentView.dpr
    )
      return;
  }
  throw new LoadingError("prewarm", "changed");
}
loadingRetry.addEventListener("click", () => location.reload());
idle();
void renderer
  .load(loading)
  .then(async (manifest) => {
    for (const [id, button] of characterButtons)
      button.querySelector("img")!.src =
        `${BASE_PATH}classic/${manifest.characters[id].preview.path}?v=${manifest.files[manifest.characters[id].preview.path]}`;
    rematchUp = `${BASE_PATH}classic/${manifest.ui.rematchUp.path}?v=${manifest.files[manifest.ui.rematchUp.path]}`;
    rematchOver = `${BASE_PATH}classic/${manifest.ui.rematchOver.path}?v=${manifest.files[manifest.ui.rematchOver.path]}`;
    rematchArt.src = rematchUp;
    // Audio downloads/decoding cannot hold up a playable court.
    void audio.load(manifest);
    await prepareCourt();
    assetsReady = true;
    loadingScreen.hidden = true;
    document.querySelector(".court")!.setAttribute("aria-busy", "false");
    for (const element of document.querySelectorAll<HTMLElement>(
      "#overlay, .court-actions, .touch-controls",
    ))
      element.inert = false;
    canvas.tabIndex = 0;
    // Keys pressed during preparation must not become gameplay at reveal.
    input.release(false);
    buttons();
    if (scene === "online") canvas.focus();
    syncInputClock();
  })
  .catch((error: unknown) => {
    loadingScreen.dataset.stage = "failed";
    el("loading-status").textContent = "球场准备失败";
    loadingProgress.hidden = true;
    el("loading-count").textContent = "请重新加载后重试";
    const reasons = {
      timeout: "画面资源加载超时，请检查网络后重试。",
      request: "画面资源未能加载，请检查网络后重试。",
      incompatible: "画面资源版本不兼容，请重新加载。",
      changed: "球场状态发生变化，请重新加载后继续。",
    };
    el("loading-detail").textContent =
      error instanceof LoadingError
        ? reasons[error.reason]
        : "画面准备失败，请重新加载后重试。";
    loadingRetry.hidden = false;
    document.querySelector(".court")!.setAttribute("aria-busy", "false");
    buttons();
  });
void network.connect();
requestAnimationFrame(frame);
