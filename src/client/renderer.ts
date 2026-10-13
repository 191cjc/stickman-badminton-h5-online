import { BASE_PATH } from "../shared/protocol";
import { classicAnimation } from "../shared/classic/assets";
import { CLASSIC_WORLD, classicDirection } from "../shared/classic/types";
import type {
  ClassicBodyFrame,
  ClassicSwingKind,
} from "../shared/classic/types";
import type { GameState, PlayerState } from "../shared/state";
import type { Viewport } from "../shared/types";

interface DrawFrame {
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
interface AssetManifest {
  schema: number;
  fps: number;
  coordinateSystem: { width: number; height: number };
  body: Record<ClassicBodyFrame, DrawFrame[]>;
  swings: Record<ClassicSwingKind, DrawFrame[]>;
  shuttle: DrawFrame;
  background: DrawFrame;
  net: DrawFrame;
  netFrames: DrawFrame[];
}

/** Draws the extracted Flash layers; no physics or contact decisions live here. */
export class Renderer {
  private manifest?: AssetManifest;
  private images = new Map<string, HTMLImageElement>();
  async load(): Promise<void> {
    const response = await fetch(`${BASE_PATH}classic/manifest.json`);
    if (!response.ok) throw new Error(`art_manifest_${response.status}`);
    const manifest = (await response.json()) as AssetManifest;
    if (
      manifest.schema !== 1 ||
      manifest.fps !== CLASSIC_WORLD.fps ||
      manifest.coordinateSystem.width !== CLASSIC_WORLD.width ||
      manifest.coordinateSystem.height !== CLASSIC_WORLD.height ||
      manifest.netFrames.length !== classicAnimation.net.frames
    )
      throw new Error("art_manifest_incompatible");
    const frames = [
      manifest.background,
      manifest.net,
      ...manifest.netFrames,
      manifest.shuttle,
      ...Object.values(manifest.body).flat(),
      ...Object.values(manifest.swings).flat(),
    ];
    await Promise.all(
      [...new Set(frames.map((frame) => frame.path))].map(async (path) => {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error(`art_load_${path}`));
          image.src = `${BASE_PATH}classic/${path}`;
        });
        this.images.set(path, image);
      }),
    );
    this.manifest = manifest;
  }
  render(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    state: GameState,
  ): void {
    ctx.fillStyle = "#101722";
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    if (!this.manifest) return;
    ctx.save();
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);
    ctx.beginPath();
    ctx.rect(0, 0, CLASSIC_WORLD.width, CLASSIC_WORLD.height);
    ctx.clip();
    this.draw(ctx, this.manifest.background);
    this.drawPlayer(ctx, state.players.left);
    this.drawPlayer(ctx, state.players.right);
    this.draw(
      ctx,
      this.manifest.netFrames[
        Math.max(
          0,
          Math.min(this.manifest.netFrames.length - 1, state.net.frame - 1),
        )
      ],
    );
    // The extracted serve layer contains its own attached shuttle. Drawing the
    // standalone one as well would duplicate it before the frame-7 release.
    if (state.shuttle.state !== "attached") {
      ctx.save();
      ctx.translate(state.shuttle.x, state.shuttle.y);
      ctx.rotate((state.shuttle.rotation * Math.PI) / 180);
      this.draw(ctx, this.manifest.shuttle);
      ctx.restore();
    }
    ctx.restore();
  }
  private draw(ctx: CanvasRenderingContext2D, frame: DrawFrame): void {
    const image = this.images.get(frame.path);
    if (image)
      ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height);
  }
  private drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState): void {
    const manifest = this.manifest!;
    const swings = manifest.swings[player.swingKind];
    const swing =
      swings[Math.max(0, Math.min(swings.length - 1, player.swingFrame - 1))];
    const bodyFrames = manifest.body[player.bodyFrame];
    const bodyIndex = player.bodyFrameIndex - 1;
    const body =
      bodyFrames[
        ((bodyIndex % bodyFrames.length) + bodyFrames.length) %
          bodyFrames.length
      ];
    // Side markers are presentation labels. Both players retain Joe's original
    // black artwork and share exactly the same mirrored racket geometry.
    ctx.fillStyle = player.side === "left" ? "#f8fafc" : "#facc15";
    ctx.beginPath();
    ctx.ellipse(player.x, CLASSIC_WORLD.groundY + 8, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(
      classicDirection(player.side) * CLASSIC_WORLD.playerScale,
      CLASSIC_WORLD.playerScale,
    );
    if (swing) this.draw(ctx, swing);
    if (body) this.draw(ctx, body);
    ctx.restore();
  }
}
