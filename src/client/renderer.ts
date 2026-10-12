import { playerConfig, racketConfig, worldConfig } from "../shared/config";
import { Player, Shuttlecock } from "../shared/entities";
import { clamp } from "../shared/math";
import type { GameState } from "../shared/state";
import type { Viewport } from "../shared/types";

// Canvas artwork extracted from upstream. Rendering consumes a state only.
export class Renderer {
  private players = { left: new Player("left"), right: new Player("right") };
  private shuttle = new Shuttlecock();
  private impactX = 0;
  private impactY = 0;
  private impactPower = 1;
  private impactTimer = 0;
  private trailBoostPower = 0;
  private trailBoostTimer = 0;
  render(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    state: GameState,
  ): void {
    Object.assign(this.players.left, state.players.left);
    Object.assign(this.players.right, state.players.right);
    Object.assign(this.shuttle, state.shuttle);
    this.impactX = state.impactX;
    this.impactY = state.impactY;
    this.impactPower = state.impactPower;
    this.impactTimer = state.impactTimer;
    this.trailBoostPower = state.trailBoostPower;
    this.trailBoostTimer = state.trailBoostTimer;
    this.drawScreenBackground(ctx, viewport);
    ctx.save();
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);
    this.drawWorld(ctx);
    ctx.restore();
  }
  private drawScreenBackground(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
  ): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, viewport.height);
    gradient.addColorStop(0, "#1a2030");
    gradient.addColorStop(1, "#0d1017");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }

  private drawWorld(ctx: CanvasRenderingContext2D): void {
    this.drawCourt(ctx);
    this.drawPlayer(ctx, this.players.left, "#f8fafc");
    this.drawPlayer(ctx, this.players.right, "#facc15");
    this.drawShuttle(ctx);
    this.drawImpact(ctx);
  }

  private drawCourt(ctx: CanvasRenderingContext2D): void {
    const sky = ctx.createLinearGradient(0, 0, 0, worldConfig.groundY);
    sky.addColorStop(0, "#2e6f96");
    sky.addColorStop(0.68, "#b6d7d2");
    sky.addColorStop(1, "#f5f1d6");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, worldConfig.width, worldConfig.groundY);

    ctx.fillStyle = "#304b37";
    ctx.fillRect(
      0,
      worldConfig.groundY,
      worldConfig.width,
      worldConfig.height - worldConfig.groundY,
    );
    ctx.fillStyle = "#426a46";
    ctx.fillRect(55, worldConfig.groundY - 7, worldConfig.width - 110, 14);

    ctx.strokeStyle = "#edf7de";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(90, worldConfig.groundY);
    ctx.lineTo(worldConfig.width - 90, worldConfig.groundY);
    ctx.moveTo(worldConfig.netX, worldConfig.groundY);
    ctx.lineTo(worldConfig.netX, worldConfig.groundY - worldConfig.netHeight);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(410, worldConfig.groundY);
    ctx.lineTo(410, worldConfig.groundY - 82);
    ctx.moveTo(1190, worldConfig.groundY);
    ctx.lineTo(1190, worldConfig.groundY - 82);
    ctx.stroke();

    const netTop = worldConfig.groundY - worldConfig.netHeight;
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(worldConfig.netX - 8, worldConfig.groundY);
    ctx.lineTo(worldConfig.netX - 8, netTop);
    ctx.moveTo(worldConfig.netX + 8, worldConfig.groundY);
    ctx.lineTo(worldConfig.netX + 8, netTop);
    ctx.stroke();

    ctx.strokeStyle = "rgba(248,250,252,0.5)";
    ctx.lineWidth = 2;
    for (let y = netTop + 24; y < worldConfig.groundY - 8; y += 24) {
      ctx.beginPath();
      ctx.moveTo(worldConfig.netX - 38, y);
      ctx.lineTo(worldConfig.netX + 38, y);
      ctx.stroke();
    }
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    player: Player,
    color: string,
  ): void {
    const head = { x: player.x, y: player.y - 160 };
    const hip = { x: player.x, y: player.y - 62 };
    const chest = { x: player.x, y: player.y - 118 };
    const stride = clamp(player.vx / playerConfig.maxSpeed, -1, 1);
    const legSwing = stride * 30;

    ctx.strokeStyle = "rgba(0,0,0,0.24)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 4, 42, 10, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(chest.x, chest.y + 24);
    ctx.lineTo(hip.x, hip.y);
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(player.x - 28 - legSwing, player.y - 5);
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(player.x + 28 - legSwing, player.y - 5);
    ctx.stroke();

    const racket = player.getRacketLine();
    const offHandX = player.x - player.facing * 40;
    const hasInputFeedback = player.inputFeedbackTimer > 0;
    const hasQueuedHit = player.queuedHitTimer > 0;
    const hasReadyHit = player.readyHitTimer > 0;
    const isSwingActive = player.swingPhase === "active";
    ctx.beginPath();
    ctx.moveTo(chest.x, chest.y + 20);
    ctx.lineTo(offHandX, chest.y + 48);
    ctx.moveTo(chest.x, chest.y + 20);
    ctx.lineTo(racket.start.x, racket.start.y);
    ctx.stroke();

    ctx.strokeStyle = isSwingActive
      ? "#38f7ff"
      : hasInputFeedback || hasQueuedHit
        ? "#fef08a"
        : hasReadyHit
          ? "#67e8f9"
          : "rgba(17,24,39,0.82)";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(racket.start.x, racket.start.y);
    ctx.lineTo(racket.end.x, racket.end.y);
    ctx.stroke();
    ctx.strokeStyle =
      isSwingActive || hasInputFeedback || hasReadyHit
        ? "#ffffff"
        : "rgba(15,23,42,0.9)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(
      racket.end.x,
      racket.end.y,
      28,
      42,
      0.2 * player.facing,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    if (hasInputFeedback || hasQueuedHit || hasReadyHit) {
      const pulse = hasInputFeedback
        ? player.inputFeedbackTimer / 0.14
        : hasQueuedHit
          ? clamp(player.queuedHitTimer / racketConfig.hitBuffer, 0, 1)
          : 0.5;
      ctx.strokeStyle = hasQueuedHit
        ? `rgba(254,240,138,${0.78 * pulse})`
        : `rgba(56,247,255,${0.68 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        racket.start.x + player.facing * 44,
        racket.start.y - 8,
        16 + (1 - pulse) * 13,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }

  private drawShuttle(ctx: CanvasRenderingContext2D): void {
    const angle = Math.atan2(this.shuttle.vy, this.shuttle.vx);

    ctx.save();
    ctx.translate(this.shuttle.x, this.shuttle.y);
    ctx.rotate(Number.isFinite(angle) ? angle : 0);

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(13, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(4, -12);
    ctx.lineTo(-28, -22);
    ctx.lineTo(-22, 0);
    ctx.lineTo(-28, 22);
    ctx.lineTo(4, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (this.shuttle.state === "flying") {
      const boost =
        this.trailBoostTimer > 0 ? clamp(this.trailBoostPower, 1, 1.6) : 0;
      const trailScale = boost > 0 ? 0.12 + boost * 0.035 : 0.08;
      ctx.strokeStyle =
        boost > 0
          ? `rgba(255,246,170,${clamp(0.28 + boost * 0.2, 0.35, 0.62)})`
          : "rgba(255,255,255,0.28)";
      ctx.lineWidth = boost > 0 ? 4 + boost * 2.2 : 3;
      ctx.beginPath();
      ctx.moveTo(this.shuttle.x, this.shuttle.y);
      ctx.lineTo(
        this.shuttle.x - this.shuttle.vx * trailScale,
        this.shuttle.y - this.shuttle.vy * trailScale,
      );
      ctx.stroke();
    }
  }

  private drawImpact(ctx: CanvasRenderingContext2D): void {
    if (this.impactTimer <= 0) {
      return;
    }

    const progress = clamp(this.impactTimer / 0.18, 0, 1);
    const radius = 18 + (1 - progress) * 48 * this.impactPower;
    const flash = this.impactPower > 1.08 ? "255,246,170" : "255,255,255";
    ctx.save();
    ctx.translate(this.impactX, this.impactY);
    ctx.strokeStyle = `rgba(${flash},${0.84 * progress})`;
    ctx.lineWidth = 4 + this.impactPower * 1.8;

    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const inner = radius * 0.34;
      const outer = radius;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }

    ctx.restore();
  }
}
