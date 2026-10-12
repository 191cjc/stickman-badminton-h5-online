import "./style.css";
import { worldConfig } from "../shared/config";
import { emptyIntent } from "../shared/state";
import { Simulation } from "../shared/simulation";
import type { Snapshot, ServerMessage } from "../shared/protocol";
import type { GameState } from "../shared/state";
import type { Side } from "../shared/types";
import { Input, toIntent } from "./input";
import { Network } from "./network";
import { Prediction, Interpolation } from "./prediction";
import { Renderer } from "./renderer";

function el<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing element: ${id}`);
  return value as T;
}
const canvas = el<HTMLCanvasElement>("game");
const ctx = canvas.getContext("2d", { alpha: false });
if (!ctx) throw new Error("浏览器不支持 Canvas 2D");
const start = el<HTMLButtonElement>("start");
const cancel = el<HTMLButtonElement>("cancel");
const leave = el<HTMLButtonElement>("leave");
const practice = el<HTMLButtonElement>("practice");
const renderer = new Renderer();
let interpolation = new Interpolation();
let prediction: Prediction | undefined;
let latest: Snapshot | undefined;
let side: Side | undefined;
let seq = 0;
let scene: "idle" | "queued" | "online" | "practice" | "result" = "idle";
let offline: Simulation | undefined;
let backdrop = new Simulation().snapshot();
let accumulated = 0;
let lastTime = 0;
let resultText = "";

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
  start.hidden =
    scene === "online" || scene === "queued" || scene === "practice";
  start.disabled =
    scene === "online" || scene === "queued" || scene === "practice";
  start.textContent = network.connected
    ? scene === "result"
      ? "再次匹配"
      : "开始匹配"
    : "重新连接";
  cancel.hidden = scene !== "queued";
  leave.hidden = scene !== "online" && scene !== "practice";
  practice.hidden =
    scene === "queued" || scene === "online" || scene === "practice";
}
function clearInput(notify = true): void {
  input.release(false);
  prediction?.clear();
  if (notify) network.send({ type: "release" });
}
const input = new Input(() => {
  prediction?.clear();
  network.send({ type: "release" });
});
const network = new Network(
  handleMessage,
  (connected, text) => {
    el("connection").textContent = text;
    el("connection-dot").classList.toggle("online", connected);
    if (!connected) {
      clearInput(false);
      if (scene === "online" || scene === "queued")
        overlay("连接中断", "正在恢复连接", text);
    }
    buttons();
  },
  (rtt) => {
    el("rtt").textContent = `RTT ${rtt} ms`;
  },
);

function idle(reason?: string): void {
  clearInput(false);
  scene = "idle";
  latest = undefined;
  side = undefined;
  prediction = undefined;
  offline = undefined;
  seq = 0;
  interpolation = new Interpolation();
  overlay(
    "即刻开打",
    "球场正在等你",
    reason === "queue_timeout"
      ? "匹配等待已超时，可以重新开始。"
      : reason === "disconnect"
        ? "断线保留时间已结束，可以再次匹配。"
        : "点击「开始匹配」进入在线对战，也可以先练习。",
  );
  labels();
  buttons();
}
function labels(): void {
  el("left-label").textContent = side === "left" ? "你 · 左侧" : "对手 · 左侧";
  el("right-label").textContent =
    scene === "practice"
      ? "AI · 右侧"
      : side === "right"
        ? "你 · 右侧"
        : "对手 · 右侧";
  if (!side) {
    el("left-label").textContent = "左侧";
    el("right-label").textContent = "右侧";
  }
  el("hint").textContent = side
    ? `你控制${side === "left" ? "白色左侧" : "黄色右侧"}角色。A 向左，D 向右，W 跳跃，S 挥拍；向球网移动并挥拍可打出更快的球。`
    : "两位玩家使用相同按键，匹配后显示你的场地位置。";
}
function handleMessage(message: ServerMessage): void {
  if (message.type === "idle") {
    if (scene === "practice") return;
    if (
      scene === "result" &&
      ["finished", "disconnect", "left", "timeout"].includes(
        message.reason ?? "",
      )
    ) {
      latest = undefined;
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
    overlay("匹配中", "正在寻找对手", "另一位玩家加入后会自动开赛。");
    labels();
    buttons();
    return;
  }
  if (message.type === "matched") {
    clearInput(false);
    scene = "online";
    offline = undefined;
    side = message.side;
    seq = 0;
    latest = undefined;
    prediction = new Prediction(side);
    interpolation = new Interpolation();
    overlay(
      "匹配成功",
      "准备开赛",
      `你在${side === "left" ? "左侧（白色）" : "右侧（黄色）"}。`,
    );
    labels();
    buttons();
    canvas.focus();
    return;
  }
  if (message.type === "snapshot") {
    if (scene !== "online" && scene !== "result") return;
    if (latest && latest.room !== message.room) return;
    const wasPaused = latest?.status === "reconnecting";
    latest = message;
    seq = Math.max(seq, message.ack);
    prediction?.reconcile(message);
    interpolation.push(message, performance.now());
    if (scene === "online") {
      if (message.status === "reconnecting") {
        clearInput(false);
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
    return;
  }
  if (message.type === "result") {
    clearInput(false);
    scene = "result";
    const won = message.winner === side;
    resultText =
      message.winner === null ? "比赛结束" : won ? "你赢了！" : "本场结束";
    const reason = {
      score: "比赛正常结束",
      leave: "有玩家主动结束比赛",
      disconnect: "重连超时，比赛按弃权结算",
      timeout: "比赛达到 20 分钟时限",
    }[message.reason];
    overlay(
      "比赛结果",
      resultText,
      `${message.score.left} : ${message.score.right} · ${reason}。点击「再次匹配」开始下一场。`,
    );
    el("match-status").textContent = reason;
    buttons();
    return;
  }
  if (message.type === "error") {
    el("match-status").textContent = `操作未完成：${message.code}`;
  }
}
function updateHud(state: GameState): void {
  el("score-left").textContent = String(state.score.left);
  el("score-right").textContent = String(state.score.right);
  if (scene === "result") return;
  if (latest?.status === "reconnecting") {
    el("match-status").textContent = "比赛暂停 · 等待重连";
    return;
  }
  el("match-status").textContent =
    state.phase === "point"
      ? `${state.server === side ? "你" : scene === "practice" ? "AI" : "对手"}得分 · 下一回合准备中`
      : state.shuttle.state === "attached"
        ? `${state.server === side ? "轮到你发球，按 S / ↓" : "等待对手发球"} · 先到 7 分获胜`
        : `回合击球 ${state.rallyHits} 次 · 先到 7 分获胜`;
}
start.addEventListener("click", () => {
  if (!network.connected) {
    el("connection").textContent = "正在连接";
    void network.connect(true);
    return;
  }
  clearInput();
  seq = 0;
  network.send({ type: "queue" });
  start.disabled = true;
});
cancel.addEventListener("click", () => network.send({ type: "cancel" }));
leave.addEventListener("click", () => {
  clearInput();
  if (scene === "practice") idle();
  else network.send({ type: "leave" });
});
practice.addEventListener("click", () => {
  clearInput();
  scene = "practice";
  latest = undefined;
  prediction = undefined;
  side = "left";
  seq = 0;
  offline = new Simulation("single");
  overlay("", "", "", false);
  labels();
  buttons();
  canvas.focus();
});

function frame(time: number): void {
  requestAnimationFrame(frame);
  const dt = lastTime
    ? Math.max(0, Math.min((time - lastTime) / 1000, 0.1))
    : 1 / 60;
  lastTime = time;
  accumulated += dt;
  let steps = 0;
  while (accumulated >= 1 / 60 && steps < 6) {
    accumulated -= 1 / 60;
    steps += 1;
    if (
      scene === "online" &&
      latest?.status === "playing" &&
      network.connected &&
      !document.hidden
    ) {
      const command = input.read(seq + 1);
      if (network.send(command)) {
        seq += 1;
        if (latest.state.phase === "playing") prediction?.apply(command);
      }
    } else if (scene === "practice" && offline) {
      const intent = toIntent(input.read(++seq));
      offline.setIntents(intent, emptyIntent());
      offline.update(1 / 120);
      offline.setIntents(
        { ...intent, jumpPressed: false, hitPressed: false },
        emptyIntent(),
      );
      offline.update(1 / 120);
    }
  }
  let state = backdrop;
  if (scene === "practice" && offline) {
    state = offline.snapshot();
    backdrop = state;
    updateHud(state);
    if (state.phase === "matchEnd") {
      scene = "result";
      overlay(
        "练习结束",
        state.winner === "left" ? "你赢了！" : "再接再厉",
        "可以再次练习，或开始在线匹配。",
      );
      buttons();
    }
  } else if (latest) {
    state = interpolation.sample(time) ?? latest.state;
    if (
      scene === "online" &&
      latest.status === "playing" &&
      latest.state.phase === "playing" &&
      prediction &&
      side
    ) {
      state = {
        ...state,
        players: { ...state.players, [side]: prediction.drawState(dt) },
      };
    }
    backdrop = state;
  }
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const scale = Math.min(
    width / worldConfig.width,
    height / worldConfig.height,
  );
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderer.render(
    ctx!,
    {
      width,
      height,
      scale,
      offsetX: (width - worldConfig.width * scale) / 2,
      offsetY: (height - worldConfig.height * scale) / 2,
      dpr,
    },
    state,
  );
}
void network.connect();
requestAnimationFrame(frame);
