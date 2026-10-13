import { classicGeometry, type ClassicRect } from "./assets";
import { CLASSIC_WORLD, type ClassicShuttleState } from "./types";

export type ClassicBallEvent = "wall" | "netTop" | "netSide" | "ground";

export function classicPointInRect(
  x: number,
  y: number,
  rect: ClassicRect,
): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

/** bobby.§_-3e§.§_-12§: original Flash zero-angle is straight up. */
export function classicShotVelocity(
  speed: number,
  dir: number,
): { vx: number; vy: number } {
  const angle = ((dir - 90) / 180) * Math.PI;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

/** Birdie.§_-5z§ future ground-X preview: original ignores top-net bounce. */
export function predictClassicLanding(
  ball: Pick<ClassicShuttleState, "x" | "y" | "vx" | "vy">,
): number {
  let { x, y, vx, vy } = ball;
  if (y > CLASSIC_WORLD.groundY) y = CLASSIC_WORLD.groundY - 1;
  for (let step = 0; y < CLASSIC_WORLD.groundY && step < 2048; step++) {
    vy = (vy + 1200 / CLASSIC_WORLD.fps) * 0.96;
    vx *= 0.96;
    x += vx / CLASSIC_WORLD.fps;
    y += vy / CLASSIC_WORLD.fps;
    if (x > CLASSIC_WORLD.width - CLASSIC_WORLD.wallInset) {
      x = CLASSIC_WORLD.width - CLASSIC_WORLD.wallInset;
      vx *= -0.8;
      if (Math.abs(vx) < 200) vx = 200 * (vx >= 0 ? 1 : -1);
    }
    if (x < CLASSIC_WORLD.wallInset) {
      x = CLASSIC_WORLD.wallInset;
      vx *= -0.8;
      if (Math.abs(vx) < 200) vx = 200 * (vx >= 0 ? 1 : -1);
    }
    if (classicPointInRect(x, y, classicGeometry.net.side)) {
      const direction = vx > 0 ? -1 : 1;
      // The source ejects in whole logical pixels, rather than snapping to an edge.
      while (classicPointInRect(x, y, classicGeometry.net.side)) x += direction;
      vx *= -0.1;
      vy *= 0.1;
    }
  }
  return x;
}

export function launchClassicBirdie(
  ball: ClassicShuttleState,
  speed: number,
  dir: number,
): void {
  const velocity = classicShotVelocity(speed, dir);
  ball.vx = velocity.vx;
  ball.vy = velocity.vy;
  ball.speed = speed;
  ball.dir = dir;
  ball.rotation = dir;
  ball.state = "flying";
  ball.predictedLandingX = predictClassicLanding(ball);
}

/** Birdie.§_-3Q§. Source uses rectangular hitTestPoint(false), top checked first. */
function collideClassicNet(
  ball: ClassicShuttleState,
  random: () => number,
): ClassicBallEvent | null {
  if (
    classicPointInRect(ball.x, ball.y, classicGeometry.net.top) &&
    ball.vy > 0
  ) {
    while (classicPointInRect(ball.x, ball.y, classicGeometry.net.side))
      ball.y -= 1;
    ball.vy *= 0.3;
    ball.vx *= 0.8;
    if (ball.vy > -100) ball.vy = -100;
    if (Math.abs(ball.vx) < 100) ball.vx = random() * 100 < 50 ? -150 : 150;
    return "netTop";
  }
  if (classicPointInRect(ball.x, ball.y, classicGeometry.net.side)) {
    const direction = ball.vx > 0 ? -1 : 1;
    while (classicPointInRect(ball.x, ball.y, classicGeometry.net.side))
      ball.x += direction;
    ball.vx *= -0.1;
    ball.vy *= 0.1;
    return "netSide";
  }
  return null;
}

/** Birdie.handleEnterFrame: gravity -> drag -> flight -> walls -> four net samples -> ground. */
export function stepClassicBirdie(
  ball: ClassicShuttleState,
  dt: number,
  random: () => number,
  onFlight?: (ball: Readonly<ClassicShuttleState>) => void,
): ClassicBallEvent[] {
  if (ball.state === "attached" || !(dt > 0) || !Number.isFinite(dt)) return [];
  const events: ClassicBallEvent[] = [];
  if (Math.abs(ball.vy) > 0) ball.vy += 1200 * dt;
  const damping = Math.pow(0.96, 60 * dt);
  ball.vx *= damping;
  ball.vy *= damping;
  const oldX = ball.x;
  const oldY = ball.y;
  if (Math.abs(ball.vx) > 5) ball.x += ball.vx * dt;
  if (Math.abs(ball.vy) > 5) ball.y += ball.vy * dt;
  ball.dir = (Math.atan2(ball.vy, ball.vx) / Math.PI) * 180 + 90;
  ball.rotation = ball.dir;
  ball.speed = Math.hypot(ball.vx, ball.vy);
  // §_-24§: source tail emission position is after flight, BEFORE any collision.
  onFlight?.(ball);
  if (ball.y < -500) ball.y = -500;
  if (ball.x > CLASSIC_WORLD.width - CLASSIC_WORLD.wallInset) {
    ball.x = CLASSIC_WORLD.width - CLASSIC_WORLD.wallInset;
    ball.vx *= -0.8;
    if (Math.abs(ball.vx) < 200) ball.vx = 200 * (ball.vx >= 0 ? 1 : -1);
    events.push("wall");
  }
  if (ball.x < CLASSIC_WORLD.wallInset) {
    ball.x = CLASSIC_WORLD.wallInset;
    ball.vx *= -0.8;
    if (Math.abs(ball.vx) < 200) ball.vx = 200 * (ball.vx >= 0 ? 1 : -1);
    events.push("wall");
  }
  const endX = ball.x;
  const endY = ball.y;
  for (let sample = 1; sample <= 4; sample++) {
    ball.x = (sample * (endX - oldX)) / 4 + oldX;
    ball.y = (sample * (endY - oldY)) / 4 + oldY;
    const collision = collideClassicNet(ball, random);
    if (collision) {
      events.push(collision);
      break;
    }
  }
  if (ball.y > CLASSIC_WORLD.groundY) {
    ball.vy *= -0.4;
    ball.y = CLASSIC_WORLD.groundY;
    if (Math.abs(ball.vy) < 5) ball.vy = 0;
    ball.state = "grounded";
    events.push("ground");
  }
  return events;
}
