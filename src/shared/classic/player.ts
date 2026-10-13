import { classicAnimation, classicGeometry } from "./assets";
import {
  advanceClassicClip,
  createClassicClip,
  resetClassicClip,
} from "./animation";
import {
  CLASSIC_WORLD,
  classicDirection,
  type ClassicPlayerContext,
  type ClassicPlayerEvents,
  type ClassicPlayerState,
  type ClassicSwingKind,
} from "./types";
import type { PlayerIntent, Side } from "../types";

export function createClassicPlayer(side: Side): ClassicPlayerState {
  return {
    side,
    x: side === "left" ? 150 : 500,
    y: CLASSIC_WORLD.groundY,
    vx: 0,
    vy: 0,
    grounded: true,
    moveMultiplier: 1,
    jumpMultiplier: 1,
    powerMultiplier: 1,
    bodyFrame: "normal",
    bodyFrameIndex: 1,
    swingKind: "overhead",
    swingFrame: 1,
    animationClock: 0,
    animationPlaying: false,
    swingClips: {
      serve: createClassicClip(),
      underhand: createClassicClip(),
      overhead: createClassicClip(),
    },
    swinging: false,
    contactEnabled: false,
    serving: false,
    hitLatched: false,
    jumpReady: false,
    ai: {
      enabled: false,
      errorThreshold: 100,
      initialErrorThreshold: 100,
      overheadPreference: 100,
      randomA: 100,
      randomB: 100,
      lastTrackedX: 0,
      lastSwingTime: 0,
      returnHome: false,
      pointWasInactive: false,
      homeAt: null,
      serveTargetX: 526,
      serveJump: false,
      serveTriggered: false,
      jumpAt: null,
      swingAt: null,
      pendingErrorRoll: false,
    },
  };
}

export function cloneClassicPlayer(
  player: ClassicPlayerState,
): ClassicPlayerState {
  return {
    ...player,
    ai: { ...player.ai },
    swingClips: {
      serve: { ...player.swingClips.serve },
      underhand: { ...player.swingClips.underhand },
      overhead: { ...player.swingClips.overhead },
    },
  };
}

function syncClassicSwing(player: ClassicPlayerState): void {
  const clip = player.swingClips[player.swingKind];
  player.swingFrame = clip.frame;
  player.animationClock = clip.clock;
  player.animationPlaying = clip.playing;
}

export function classicPointInPolygon(
  x: number,
  y: number,
  polygon: readonly { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function classicLocalPoint(
  player: ClassicPlayerState,
  x: number,
  y: number,
) {
  return {
    x:
      (x - player.x) /
      (CLASSIC_WORLD.playerScale * classicDirection(player.side)),
    y: (y - player.y) / CLASSIC_WORLD.playerScale,
  };
}

/** AS §_-h§.setupServe, with timers held in the serializable player. */
export function setupClassicServe(
  player: ClassicPlayerState,
  random: () => number,
): void {
  player.serving = true;
  player.swingKind = "serve";
  for (const clip of Object.values(player.swingClips)) resetClassicClip(clip);
  syncClassicSwing(player);
  player.swinging = false;
  player.contactEnabled = false;
  clampClassicPlayer(player);
  if (!player.ai.enabled) return;
  const ai = player.ai;
  ai.serveTriggered = false;
  ai.jumpAt = null;
  ai.swingAt = null;
  if (random() * 100 < 33) {
    ai.serveTargetX = classicGeometry.net.x + CLASSIC_WORLD.serveNetInset;
    ai.serveJump = !(random() * 100 < ai.errorThreshold);
  } else if (random() * 100 < 50) {
    ai.serveTargetX = 526;
    ai.serveJump = false;
  } else {
    ai.serveTargetX = 570;
    ai.serveJump = false;
  }
}

function chooseClassicSwing(
  player: ClassicPlayerState,
  context: ClassicPlayerContext,
): ClassicSwingKind {
  if (player.serving) return "serve";
  const ball = context.shuttle;
  if (!ball) return "overhead";
  const local = classicLocalPoint(player, ball.x, ball.y);
  // AS temporarily moves underHitbox down by 20 local units on the descent.
  const underhandY = local.y - (!player.grounded && player.vy > -100 ? 20 : 0);
  const inUnderhandZone = classicPointInPolygon(
    local.x,
    underhandY,
    classicGeometry.underhandZone,
  );
  let kind: ClassicSwingKind =
    inUnderhandZone && (ball.vy > 0 || ball.y > classicGeometry.net.topOrigin.y)
      ? "underhand"
      : "overhead";
  const nearNet =
    player.side === "left"
      ? ball.x > classicGeometry.net.sideOrigin.x - 15
      : ball.x < classicGeometry.net.sideOrigin.x + 15;
  if (inUnderhandZone && !player.ai.enabled && nearNet) kind = "overhead";
  if (
    inUnderhandZone &&
    player.ai.enabled &&
    (context.random?.() ?? 1) * 100 < player.ai.overheadPreference
  ) {
    kind = "overhead";
  }
  return kind;
}

/** AS §_-h§.swingMe. There is no buffered recovery cancel or held-hit assist. */
export function startClassicSwing(
  player: ClassicPlayerState,
  context: ClassicPlayerContext = {},
): boolean {
  if (
    context.pointActive === false ||
    player.swinging ||
    player.swingFrame !== 1
  )
    return false;
  player.swingKind = chooseClassicSwing(player, context);
  player.swinging = true;
  player.contactEnabled = !player.serving;
  player.swingClips[player.swingKind].playing = true;
  syncClassicSwing(player);
  return true;
}

/** AS custom MovieClip § null§.§_-4e§; frame1 stops, events use 1-based frames. */
export function advanceClassicAnimation(
  player: ClassicPlayerState,
  dt: number,
): ClassicPlayerEvents {
  const events: ClassicPlayerEvents = {
    swingStarted: false,
    serveReleased: false,
  };
  // Hidden serve/underhand clips continue to their frame-1 stop after their
  // last-frame setupOverhead event. Switching visibility never resets a clock.
  for (const kind of ["serve", "underhand", "overhead"] as const) {
    const clip = player.swingClips[kind];
    const duration = classicAnimation[kind].frames;
    advanceClassicClip(clip, duration, dt, (frame) => {
      if (frame === 1 && player.swingKind === kind) player.swinging = false;
      if (kind === "serve" && frame === classicAnimation.serve.release) {
        player.serving = false;
        events.serveReleased = true;
      }
      if (kind !== "serve") {
        if (frame === classicAnimation[kind].contactEnd)
          player.contactEnabled = false;
      }
      if (frame === duration && !player.serving) {
        player.swinging = false;
        player.swingKind = "overhead";
      }
    });
  }
  syncClassicSwing(player);
  return events;
}

export function clampClassicPlayer(player: ClassicPlayerState): void {
  const net = classicGeometry.net.x;
  const min =
    player.side === "left"
      ? CLASSIC_WORLD.playerWallInset
      : net +
        (player.serving
          ? CLASSIC_WORLD.serveNetInset
          : CLASSIC_WORLD.playerNetInset);
  const max =
    player.side === "left"
      ? net -
        (player.serving
          ? CLASSIC_WORLD.serveNetInset
          : CLASSIC_WORLD.playerNetInset)
      : CLASSIC_WORLD.width - CLASSIC_WORLD.playerWallInset;
  player.x = Math.min(max, Math.max(min, player.x));
}

/** Shared human movement/input/timeline for authoritative simulation and local prediction. */
export function stepClassicPlayer(
  player: ClassicPlayerState,
  intent: PlayerIntent,
  dt: number,
  context: ClassicPlayerContext = {},
): ClassicPlayerEvents {
  if (!(dt > 0) || !Number.isFinite(dt))
    return { swingStarted: false, serveReleased: false };
  const move = Math.sign(intent.move);
  const previousBodyFrame = player.bodyFrame;
  player.vx = move * 225 * player.moveMultiplier;
  player.bodyFrame =
    move === 0
      ? "normal"
      : move === classicDirection(player.side)
        ? "forward"
        : "backward";
  const jump =
    intent.jump ||
    intent.jumpPressed ||
    (intent.hitPressed && intent.hitJump === true);
  if (jump && player.grounded && (player.jumpReady || intent.jumpPressed)) {
    player.vy = -400 * player.jumpMultiplier;
    player.grounded = false;
  }
  player.jumpReady = !jump;
  const hit = intent.hitHeld || intent.hitPressed;
  const swingStarted =
    hit && (intent.hitPressed || !player.hitLatched)
      ? startClassicSwing(player, context)
      : false;
  player.hitLatched = hit;
  if (!player.grounded) {
    player.vy += 1200 * dt;
    player.bodyFrame = "jump";
  }
  player.bodyFrameIndex =
    previousBodyFrame !== player.bodyFrame
      ? 1
      : player.bodyFrame === "forward" || player.bodyFrame === "backward"
        ? (player.bodyFrameIndex % 16) + 1
        : 1;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  clampClassicPlayer(player);
  if (player.y > CLASSIC_WORLD.groundY && !player.grounded) {
    player.y = CLASSIC_WORLD.groundY;
    player.vy = 0;
    player.grounded = true;
  }
  const events =
    context.advanceAnimation === false
      ? { swingStarted: false, serveReleased: false }
      : advanceClassicAnimation(player, dt);
  events.swingStarted = swingStarted;
  return events;
}
