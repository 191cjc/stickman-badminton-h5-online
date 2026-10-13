import { classicAnimation, classicGeometry, racketPose } from "./assets";
import { advanceClassicClip, createClassicClip } from "./animation";
import { classicAiIntent } from "./ai";
import {
  classicPointInRect,
  launchClassicBirdie,
  stepClassicBirdie,
  type ClassicBallEvent,
} from "./birdie";
import {
  advanceClassicAnimation,
  classicLocalPoint,
  cloneClassicPlayer,
  createClassicPlayer,
  setupClassicServe,
  stepClassicPlayer,
} from "./player";
import {
  CLASSIC_WORLD,
  classicDirection,
  emptyClassicIntent,
  type ClassicShuttleState,
  type ClassicState,
} from "./types";
import type {
  AiDifficulty,
  GamePhase,
  MatchMode,
  PlayerIntent,
  Side,
} from "../types";

interface ClassicContact {
  at: number;
  side: Side;
  kind: "serve" | "overhead" | "underhand";
  frame: number;
  previousTouch: Side | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Flash 90302's ordinary Joe match, independent of DOM, clocks and sockets. */
export class ClassicSimulation {
  readonly mode: MatchMode;
  readonly difficulty: AiDifficulty;
  readonly players = {
    left: createClassicPlayer("left"),
    right: createClassicPlayer("right"),
  };
  readonly net = createClassicClip();
  shuttle: ClassicShuttleState = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    dir: 0,
    rotation: 0,
    state: "attached",
    lastTouchedBy: null,
    predictedLandingX: 0,
  };
  score = { left: 0, right: 0 };
  server: Side = "left";
  winner: Side | null = null;
  phase: GamePhase = "playing";
  pointActive = true;
  pointTimer = 0;
  elapsed = 0;
  rallyHits = 0;
  lastPointSide: Side | null = null;
  lastPointReason = "";
  lastShotLabel = "";
  lastShotSide: Side | null = null;
  statusText = "轮到左侧发球";
  rngState: number;
  private accumulator = 0;
  private intents = { left: emptyClassicIntent(), right: emptyClassicIntent() };
  private contacts: ClassicContact[] = [];
  private ballEvents: ClassicBallEvent[] = [];

  constructor(
    mode: MatchMode = "versus",
    difficulty: AiDifficulty = "normal",
    options: { seed?: number } = {},
  ) {
    this.mode = mode;
    this.difficulty = difficulty;
    this.rngState = (options.seed ?? 0x90302) >>> 0 || 0x90302;
    if (mode === "single") {
      const right = this.players.right;
      right.ai.enabled = true;
      right.moveMultiplier = difficulty === "boss" ? 1.15 : 1.1;
      right.ai.errorThreshold = right.ai.initialErrorThreshold =
        difficulty === "boss" ? 35 : 100;
      right.ai.overheadPreference = right.ai.errorThreshold;
    }
    this.setupRally();
  }

  private random = (): number => {
    let x = this.rngState;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.rngState = x >>> 0;
    return this.rngState / 0x100000000;
  };

  setIntents(left: PlayerIntent, right: PlayerIntent): void {
    // Preserve an edge until at least one fixed frame consumes it (e.g. 120-Hz caller).
    this.intents.left = {
      ...left,
      hitPressed: left.hitPressed || this.intents.left.hitPressed,
      jumpPressed: left.jumpPressed || this.intents.left.jumpPressed,
      pausePressed: left.pausePressed || this.intents.left.pausePressed,
    };
    this.intents.right = {
      ...right,
      hitPressed: right.hitPressed || this.intents.right.hitPressed,
      jumpPressed: right.jumpPressed || this.intents.right.jumpPressed,
      pausePressed: right.pausePressed || this.intents.right.pausePressed,
    };
  }

  /** Bound catch-up to 15 original frames. Paused time never advances AI or point timers. */
  update(dt: number): void {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    if (this.intents.left.pausePressed || this.intents.right.pausePressed) {
      this.phase =
        this.phase === "paused"
          ? this.pointActive
            ? "playing"
            : "point"
          : "paused";
      this.intents.left.pausePressed = this.intents.right.pausePressed = false;
    }
    if (this.phase !== "playing" && this.phase !== "point") return;
    this.accumulator += Math.min(dt, 0.25);
    const fixedDt = 1 / CLASSIC_WORLD.fps;
    let frames = 0;
    while (this.accumulator + 1e-9 >= fixedDt && frames < 15) {
      this.accumulator = Math.max(0, this.accumulator - fixedDt);
      this.step(fixedDt);
      this.clearEdges();
      frames++;
      if (!this.pointActive && this.winner !== null) break;
    }
  }

  private clearEdges(): void {
    for (const side of ["left", "right"] as const) {
      this.intents[side].hitPressed = false;
      this.intents[side].jumpPressed = false;
      this.intents[side].pausePressed = false;
      delete this.intents[side].hitMove;
      delete this.intents[side].hitJump;
    }
  }

  private step(dt: number): void {
    this.elapsed += dt;
    this.ballEvents = [];
    if (this.phase === "point") {
      this.pointTimer = Math.max(0, this.pointTimer - dt);
      if (this.pointTimer < 1e-9) this.setupRally();
    }
    // Original PlayState.handleEnterFrame: left -> right -> birdie. Timeline callbacks follow.
    for (const side of ["left", "right"] as const) {
      const player = this.players[side];
      const intent = player.ai.enabled
        ? classicAiIntent(
            player,
            this.shuttle,
            this.pointActive,
            this.elapsed,
            this.random,
          )
        : this.intents[side];
      stepClassicPlayer(player, intent, dt, {
        shuttle: this.shuttle.state === "attached" ? undefined : this.shuttle,
        pointActive: this.pointActive,
        random: this.random,
        advanceAnimation: false,
      });
      if (player.ai.pendingErrorRoll) {
        player.ai.randomA = this.random() * 100;
        player.ai.randomB = this.random() * 100;
        player.ai.pendingErrorRoll = false;
      }
      this.tryContact(side);
    }
    this.ballEvents = stepClassicBirdie(this.shuttle, dt, this.random);
    if (
      this.ballEvents.includes("netTop") ||
      this.ballEvents.includes("netSide")
    )
      this.net.playing = true; // Source net.play() resumes without rewinding.
    if (this.ballEvents.includes("ground") && this.pointActive) {
      this.awardPoint(
        this.shuttle.x > classicGeometry.net.x ? "left" : "right",
      );
    }
    for (const side of ["left", "right"] as const) {
      const player = this.players[side];
      const events = advanceClassicAnimation(player, dt);
      if (events.serveReleased && this.pointActive && this.server === side)
        this.releaseServe(side);
    }
    advanceClassicClip(this.net, classicAnimation.net.frames, dt);
    if (this.shuttle.state === "attached") this.attachShuttle();
  }

  private attachShuttle(): void {
    const player = this.players[this.server];
    // AS serveBirdie uses the unscaled local offset explicitly, despite Joe's draw scale of 1.25.
    this.shuttle.x =
      player.x + classicGeometry.servePoint.x * classicDirection(player.side);
    this.shuttle.y = player.y + classicGeometry.servePoint.y;
  }

  private setupRally(): void {
    this.pointActive = true;
    this.phase = "playing";
    this.pointTimer = 0;
    this.rallyHits = 0;
    this.lastShotLabel = "";
    this.lastShotSide = null;
    for (const side of ["left", "right"] as const) {
      const player = this.players[side];
      player.serving = false;
      player.contactEnabled = false;
      player.ai.jumpAt = null;
      player.ai.swingAt = null;
      player.ai.serveTriggered = false;
    }
    setupClassicServe(this.players[this.server], this.random);
    this.shuttle = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      dir: 0,
      rotation: 0,
      state: "attached",
      lastTouchedBy: null,
      predictedLandingX: 0,
    };
    this.attachShuttle();
    this.statusText = `轮到${this.server === "left" ? "左" : "右"}侧发球`;
  }

  private releaseServe(side: Side): void {
    this.attachShuttle();
    const previousTouch = this.shuttle.lastTouchedBy;
    launchClassicBirdie(this.shuttle, 1350 * 1.1, 40 * classicDirection(side));
    this.shuttle.lastTouchedBy = side;
    this.lastShotLabel = "发球";
    this.lastShotSide = side;
    this.statusText = "对打中";
    this.recordContact(side, "serve", previousTouch);
  }

  private tryContact(side: Side): void {
    const player = this.players[side];
    if (
      !this.pointActive ||
      this.shuttle.state === "attached" ||
      !player.contactEnabled
    )
      return;
    const pose = racketPose(player.swingKind, player.swingFrame);
    const local = classicLocalPoint(player, this.shuttle.x, this.shuttle.y);
    if (!classicPointInRect(local.x, local.y, pose.hitbox)) return;
    player.contactEnabled = false;
    player.ai.errorThreshold += 7;
    const overhead = player.swingKind === "overhead";
    const speed = overhead
      ? 1250 * 1.4 * player.powerMultiplier * 0.9
      : (player.grounded ? 1300 : 1150) * 1.4 * player.powerMultiplier * 0.9;
    const dir = overhead
      ? (pose.rotation + 30) * classicDirection(side)
      : 40 * classicDirection(side);
    const previousTouch = this.shuttle.lastTouchedBy;
    launchClassicBirdie(this.shuttle, speed, dir);
    this.shuttle.lastTouchedBy = side;
    this.rallyHits++;
    this.lastShotLabel = overhead ? "高点击球" : "低手挑球";
    this.lastShotSide = side;
    this.recordContact(
      side,
      overhead ? "overhead" : "underhand",
      previousTouch,
    );
  }

  private recordContact(
    side: Side,
    kind: ClassicContact["kind"],
    previousTouch: Side | null,
  ): void {
    this.contacts.push({
      at: this.elapsed,
      side,
      kind,
      previousTouch,
      frame: this.players[side].swingFrame,
      x: this.shuttle.x,
      y: this.shuttle.y,
      vx: this.shuttle.vx,
      vy: this.shuttle.vy,
    });
    if (this.contacts.length > 32) this.contacts.shift();
  }

  private awardPoint(side: Side): void {
    // PlayState.pointActive makes all repeated ground bounces harmless to score.
    if (!this.pointActive) return;
    this.pointActive = false;
    this.score[side]++;
    this.server = side;
    this.lastPointSide = side;
    this.lastPointReason = "落地";
    for (const player of Object.values(this.players))
      player.contactEnabled = false;
    if (this.score[side] >= CLASSIC_WORLD.targetScore) {
      this.winner = side;
      this.phase = "matchEnd";
      this.pointTimer = 0;
      this.statusText = `${side === "left" ? "左" : "右"}侧获胜`;
    } else {
      this.phase = "point";
      this.pointTimer = CLASSIC_WORLD.pointDelay;
      this.statusText = `${side === "left" ? "左" : "右"}侧得分`;
    }
  }

  snapshot(): ClassicState {
    return {
      version: "flash-90302-v1",
      mode: this.mode,
      difficulty: this.difficulty,
      phase: this.phase,
      players: {
        left: cloneClassicPlayer(this.players.left),
        right: cloneClassicPlayer(this.players.right),
      },
      shuttle: { ...this.shuttle },
      net: { ...this.net },
      score: { ...this.score },
      server: this.server,
      winner: this.winner,
      rallyHits: this.rallyHits,
      pointActive: this.pointActive,
      pointTimer: this.pointTimer,
      elapsed: this.elapsed,
      lastPointSide: this.lastPointSide,
      lastPointReason: this.lastPointReason,
      lastShotLabel: this.lastShotLabel,
      lastShotSide: this.lastShotSide,
      statusText: this.statusText,
      rngState: this.rngState,
    };
  }

  diagnostics() {
    return {
      contacts: this.contacts.map((contact) => ({ ...contact })),
      ballEvents: [...this.ballEvents],
    };
  }
}
