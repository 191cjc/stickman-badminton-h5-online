import {
  characterGeometry,
  classicAnimation,
  classicGeometry,
  racketPose,
} from "./assets";
import { advanceClassicClip, createClassicClip } from "./animation";
import type { CharacterId } from "./characters";
import {
  PRESENTATION_LIMIT,
  PRESENTATION_TICKS,
  seededRandom,
  type ClassicPresentationEvent,
  type PresentationJournal,
  type PresentationPayload,
} from "./presentation";
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
import type { GamePhase, PlayerIntent, Side } from "../types";

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

/** Flash 90302's seven-human multiplayer match, independent of DOM, clocks and sockets. */
export class ClassicSimulation {
  readonly players;
  tick = 0;
  private eventCursor = 0;
  private events: ClassicPresentationEvent[] = [];
  private readonly cosmeticRandom: () => number;
  private readonly cosmetics: boolean;
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
    options: {
      seed?: number;
      characters?: Partial<Record<Side, CharacterId>>;
      cosmeticSeed?: number;
      cosmetics?: boolean;
    } = {},
  ) {
    this.players = {
      left: createClassicPlayer("left", options.characters?.left),
      right: createClassicPlayer("right", options.characters?.right),
    };
    this.rngState = (options.seed ?? 0x90302) >>> 0 || 0x90302;
    this.cosmeticRandom = seededRandom(options.cosmeticSeed ?? 0x90302f);
    this.cosmetics = options.cosmetics !== false;
    this.setupRally();
  }

  private emit(payload: PresentationPayload): void {
    if (!this.cosmetics) return;
    this.events.push({ ...payload, id: ++this.eventCursor, tick: this.tick });
    if (this.events.length > PRESENTATION_LIMIT) this.events.shift();
  }
  presentation(): PresentationJournal {
    return {
      cursor: this.eventCursor,
      events: this.events
        .filter((e) => e.tick >= this.tick - PRESENTATION_TICKS)
        .map((e) => ({ ...e })),
    };
  }
  private emitSmoke(side: Side): void {
    const p = this.players[side];
    if (
      this.cosmetics &&
      p.characterId === "toaster" &&
      this.cosmeticRandom() * 100 < 25
    )
      this.emit({
        kind: "smoke",
        x: p.x + this.cosmeticRandom() * 10 - 5,
        y: p.y - 60,
        seed: Math.floor(this.cosmeticRandom() * 0x100000000),
      });
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

  /** Bound catch-up to 15 original frames. Paused time never advances point timers. */
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
      delete this.intents[side].hitJump;
    }
  }

  private step(dt: number): void {
    this.elapsed += dt;
    this.tick++;
    this.events = this.events.filter(
      (e) => e.tick >= this.tick - PRESENTATION_TICKS,
    );
    this.ballEvents = [];
    if (this.phase === "point") {
      this.pointTimer = Math.max(0, this.pointTimer - dt);
      if (this.pointTimer < 1e-9) this.setupRally();
    }
    // Original PlayState.handleEnterFrame: left -> right -> birdie. Timeline callbacks follow.
    for (const side of ["left", "right"] as const) {
      const player = this.players[side];
      const events = stepClassicPlayer(player, this.intents[side], dt, {
        shuttle: this.shuttle.state === "attached" ? undefined : this.shuttle,
        pointActive: this.pointActive,
        advanceAnimation: false,
      });
      if (events.swingStarted)
        this.emit({ kind: "swing", side, sound: "whoosh" });
      this.tryContact(side, events.contactOrigin);
      this.emitSmoke(side);
    }
    this.ballEvents = stepClassicBirdie(
      this.shuttle,
      dt,
      this.random,
      (ball) => {
        if (
          this.cosmetics &&
          ball.speed > 50 &&
          this.cosmeticRandom() * 100 < (ball.speed * 100) / 1400
        )
          this.emit({
            kind: "tail",
            x: ball.x,
            y: ball.y,
            seed: Math.floor(this.cosmeticRandom() * 0x100000000),
          });
      },
    );
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
    const geometry = characterGeometry(player.characterId);
    // AS serveBirdie uses the unscaled local offset explicitly, despite Joe's draw scale of 1.25.
    this.shuttle.x =
      player.x + geometry.servePoint.x * classicDirection(player.side);
    this.shuttle.y = player.y + geometry.servePoint.y;
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
    }
    setupClassicServe(this.players[this.server]);
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
    this.shotEvent(
      side,
      this.players[side].characterId === "toaster" ? "toasterpop" : "birdiehit",
    );
  }

  private tryContact(side: Side, origin?: { x: number; y: number }): void {
    const player = this.players[side];
    if (
      !this.pointActive ||
      this.shuttle.state === "attached" ||
      !player.contactEnabled
    )
      return;
    const pose = racketPose(
      player.swingKind,
      player.swingFrame,
      player.characterId,
    );
    const local = classicLocalPoint(
      origin ? { ...player, ...origin } : player,
      this.shuttle.x,
      this.shuttle.y,
    );
    if (!classicPointInRect(local.x, local.y, pose.hitbox)) return;
    player.contactEnabled = false;
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
    this.shotEvent(side, "birdiehit");
  }

  private shotEvent(side: Side, sound: "birdiehit" | "toasterpop"): void {
    this.emit({
      kind: "shot",
      side,
      x: this.shuttle.x,
      y: this.shuttle.y,
      dir: this.shuttle.dir,
      sound,
    });
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
    this.emit({ kind: "point", side, sound: "ding" });
    this.server = side;
    this.lastPointSide = side;
    this.lastPointReason = "落地";
    for (const player of Object.values(this.players))
      player.contactEnabled = false;
    if (this.score[side] >= CLASSIC_WORLD.targetScore) {
      this.winner = side;
      this.emit({ kind: "victory", side, sound: "cheer" });
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
      version: "flash-90302-v2",
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
