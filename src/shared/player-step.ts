import { playerConfig, racketConfig, worldConfig } from "./config";
import { clamp, sideDirection } from "./math";
import type { Player } from "./entities";
import type { PlayerIntent } from "./types";

// Extracted from the verified upstream updatePlayer; no ball/score mutation.
export function stepPlayer(
  player: Player,
  intent: PlayerIntent,
  dt: number,
  heldHitReady: () => boolean = () => false,
): { missed: boolean; activeDelay: number | null } {
  let missed = false;
  let activeDelay: number | null = null;
  player.facing = sideDirection(player.side);

  if (player.grounded) {
    player.coyoteTimer = playerConfig.coyoteTime;
  } else {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
  }

  if (intent.jumpPressed) {
    player.jumpBufferTimer = playerConfig.jumpBuffer;
  } else {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  }

  const targetSpeed = intent.move * playerConfig.maxSpeed;
  const speedStep =
    (player.grounded
      ? intent.move === 0
        ? playerConfig.groundDeceleration
        : playerConfig.groundAcceleration
      : playerConfig.airAcceleration) * dt;
  player.vx = approach(player.vx, targetSpeed, speedStep);

  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
    player.vy = -playerConfig.jumpSpeed;
    player.grounded = false;
    player.jumpBufferTimer = 0;
    player.coyoteTimer = 0;
  }

  player.vy += playerConfig.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  if (player.y >= worldConfig.groundY) {
    player.y = worldConfig.groundY;
    player.vy = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }

  if (player.x < player.minX || player.x > player.maxX) {
    player.x = clamp(player.x, player.minX, player.maxX);
    player.vx = 0;
  }

  if (intent.hitPressed) {
    queueHit(player, intent);
    player.hitHoldConsumed = true;
  } else if (heldHitReady()) {
    queueHit(player, intent);
    player.hitHoldCooldown = 0.34;
    player.hitHoldConsumed = true;
  }

  if (!intent.hitHeld) {
    player.hitHoldConsumed = false;
  }

  player.hitIntentTimer = Math.max(0, player.hitIntentTimer - dt);
  player.queuedHitTimer = Math.max(0, player.queuedHitTimer - dt);
  player.inputFeedbackTimer = Math.max(0, player.inputFeedbackTimer - dt);
  player.readyHitTimer =
    intent.hitHeld && !player.hitHoldConsumed
      ? 0.08
      : Math.max(0, player.readyHitTimer - dt);
  player.hitHoldCooldown = Math.max(0, player.hitHoldCooldown - dt);
  if (player.waitingForActiveMetric) {
    player.hitInputAge += dt;
  }
  const wasSwinging = player.isSwinging;
  const wasActive = player.swingPhase === "active";
  const swingHadHit = player.swingHasHit;
  player.updateSwing(dt);

  const startedQueuedSwing = tryStartQueuedSwing(player);
  const isActive = player.swingPhase === "active";

  if (player.waitingForActiveMetric && !wasActive && isActive) {
    activeDelay = player.hitInputAge;
    player.waitingForActiveMetric = false;
  }

  if (
    wasSwinging &&
    !player.isSwinging &&
    !swingHadHit &&
    !startedQueuedSwing
  ) {
    missed = true;
  }
  return { missed, activeDelay };
}

function tryStartQueuedSwing(player: Player): boolean {
  if (player.queuedHitTimer <= 0) {
    return false;
  }

  if (!player.isSwinging) {
    promoteQueuedHit(player);
    player.startSwing();
    return true;
  }

  if (player.canCancelRecovery) {
    promoteQueuedHit(player);
    player.startSwing(true);
    return true;
  }

  return false;
}

function getHitQueueDuration(player: Player): number {
  if (!player.isSwinging || player.canCancelRecovery) {
    return racketConfig.hitBuffer;
  }

  const cancelAt =
    racketConfig.windup +
    racketConfig.active +
    racketConfig.recovery * racketConfig.recoveryCancel;

  return Math.max(
    racketConfig.hitBuffer,
    cancelAt - player.swingTimer + racketConfig.hitBuffer,
  );
}

function queueHit(player: Player, intent: PlayerIntent): void {
  player.queuedHitMove = intent.hitMove ?? intent.move;
  player.queuedHitJump = (intent.hitJump ?? intent.jump) || !player.grounded;
  player.queuedHitTimer = getHitQueueDuration(player);
  player.inputFeedbackTimer = 0.14;
  player.hitInputAge = 0;
  player.waitingForActiveMetric = true;
}

function promoteQueuedHit(player: Player): void {
  player.hitIntentMove = player.queuedHitMove;
  player.hitIntentJump = player.queuedHitJump;
  player.hitIntentTimer = player.swingDuration + 0.04;
  player.queuedHitTimer = 0;
}

const approach = (value: number, target: number, maxDelta: number): number => {
  if (value < target) {
    return Math.min(target, value + maxDelta);
  }

  return Math.max(target, value - maxDelta);
};
