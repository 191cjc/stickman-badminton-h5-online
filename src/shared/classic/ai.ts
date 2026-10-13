import { classicGeometry } from "./assets";
import { classicLocalPoint, classicPointInPolygon } from "./player";
import {
  CLASSIC_WORLD,
  emptyClassicIntent,
  type ClassicPlayerState,
  type ClassicShuttleState,
} from "./types";
import type { PlayerIntent } from "../types";

/** Ordinary right-side Flash AI, §_-h§.§_-2p§, with simulation-clock callbacks. */
export function classicAiIntent(
  player: ClassicPlayerState,
  ball: ClassicShuttleState,
  pointActive: boolean,
  elapsed: number,
  random: () => number,
): PlayerIntent {
  const intent = emptyClassicIntent();
  const ai = player.ai;
  const hasBall = ball.state !== "attached";
  let targetX = 450;
  if (player.serving) targetX = ai.serveTargetX;
  else if (
    !ai.returnHome &&
    hasBall &&
    ball.lastTouchedBy !== player.side &&
    ball.x >= CLASSIC_WORLD.width / 2
  ) {
    if (ball.predictedLandingX > 450 && ball.x < 340) {
      targetX = 450;
    } else {
      let dist = 20;
      if (ai.randomA < ai.errorThreshold) {
        if (ball.predictedLandingX < CLASSIC_WORLD.width / 2 + 240) {
          dist = 100 - (ball.predictedLandingX - CLASSIC_WORLD.width / 2) / 11;
        }
      } else if (
        ai.randomB < (100 - ai.errorThreshold) / 2 &&
        ball.predictedLandingX < CLASSIC_WORLD.width / 2 + 240
      ) {
        dist = 70 - (ball.predictedLandingX - CLASSIC_WORLD.width / 2) / 11;
      }
      if (
        Math.abs(ai.lastTrackedX - ball.x) > 8 ||
        ai.randomA < ai.errorThreshold ||
        ai.randomB < (100 - ai.errorThreshold) / 2
      ) {
        targetX = ball.x + dist;
        ai.lastTrackedX = ball.x;
      } else targetX = ai.lastTrackedX + dist;
    }
  }
  if (!pointActive && !ai.pointWasInactive) {
    ai.pointWasInactive = true;
    ai.homeAt = elapsed + 1;
  } else if (pointActive && ai.pointWasInactive) {
    ai.pointWasInactive = false;
    ai.returnHome = false;
    ai.homeAt = null;
    ai.randomA = 100;
    ai.randomB = 100;
    ai.errorThreshold = ai.initialErrorThreshold - 7;
  }
  if (ai.homeAt !== null && elapsed + 1e-9 >= ai.homeAt) {
    ai.returnHome = true;
    ai.homeAt = null;
  }
  intent.move =
    Math.abs(targetX - player.x) < 10 ? 0 : targetX < player.x ? -1 : 1;
  if (
    hasBall &&
    Math.abs(ball.y - 190) < 10 &&
    ball.lastTouchedBy !== player.side &&
    player.x - 60 - ball.x < 20 &&
    ai.randomB < (100 - ai.errorThreshold) / 2 &&
    ai.randomA >= ai.errorThreshold &&
    player.grounded
  ) {
    intent.jumpPressed = true;
  }
  if (
    hasBall &&
    pointActive &&
    elapsed - ai.lastSwingTime > 0.5 &&
    ball.lastTouchedBy !== player.side &&
    ball.x > classicGeometry.net.x
  ) {
    const local = classicLocalPoint(player, ball.x, ball.y);
    // Source raises computerHitbox by 20 local units while airborne.
    if (
      classicPointInPolygon(
        local.x,
        local.y + (player.grounded ? 0 : 20),
        classicGeometry.computerZone,
      )
    ) {
      intent.hitPressed = true;
      ai.lastSwingTime = elapsed;
      ai.pendingErrorRoll = true;
    }
  }
  if (
    player.serving &&
    Math.abs(ai.serveTargetX - player.x) < 10 &&
    !ai.serveTriggered
  ) {
    ai.serveTriggered = true;
    ai.jumpAt = ai.serveJump ? elapsed + 0.2 : null;
    ai.swingAt = elapsed + (ai.serveJump ? 0.3 : 0.2);
    ai.randomA = random() * 100;
    ai.randomB = random() * 100;
  }
  if (ai.jumpAt !== null && elapsed + 1e-9 >= ai.jumpAt) {
    if (player.grounded) intent.jumpPressed = true;
    ai.jumpAt = null;
  }
  if (ai.swingAt !== null && elapsed + 1e-9 >= ai.swingAt) {
    intent.hitPressed = pointActive;
    ai.swingAt = null;
    ai.serveTriggered = false;
  }
  return intent;
}
