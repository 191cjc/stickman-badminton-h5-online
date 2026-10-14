import { BASE_PATH } from "../shared/protocol";
import { classicAnimation } from "../shared/classic/assets";
import { CLASSIC_WORLD, classicDirection } from "../shared/classic/types";
import type { AssetManifest, DrawFrame } from "../shared/classic/manifest";
import type { GameState, PlayerState } from "../shared/state";
import type { Viewport } from "../shared/types";
import type { Effects, Particle, Spark } from "./effects";
import { ConfettiImages } from "./confetti-images";
import { RasterCache, deviceRasterScale, rasterPlan } from "./raster-cache";
import {
  fetchAsset,
  loadImages,
  LoadingError,
  yieldForPaint,
  type LoadingProgress,
} from "./loading";

export function drawCachedFrame(
  ctx: CanvasRenderingContext2D,
  frame: DrawFrame,
  image: HTMLImageElement,
  cache: RasterCache,
  key = frame.path,
): void {
  const scale = deviceRasterScale(ctx.getTransform());
  ctx.drawImage(
    cache.get(key, image, frame.width, frame.height, scale),
    frame.x,
    frame.y,
    frame.width,
    frame.height,
  );
}

/** All draw entries share original registration with numeric authority. */
export class Renderer {
  private manifest?: AssetManifest;
  private images = new Map<string, HTMLImageElement>();
  private colors?: ConfettiImages;
  private rasters = new RasterCache();
  private generation = 0;
  // Unique result colors must not evict the hot court/actor raster working set.
  private confettiRasters = new RasterCache(undefined, {
    entries: 768,
    bytes: 32 * 1024 * 1024,
  });
  async load(
    onProgress: (progress: LoadingProgress) => void = () => {},
  ): Promise<AssetManifest> {
    onProgress({ stage: "manifest", completed: 0 });
    const manifest = (await fetchAsset(
      `${BASE_PATH}classic/manifest.json`,
      (response) => response.json(),
      "manifest",
    )) as AssetManifest;
    try {
      if (
        manifest.schema !== 2 ||
        manifest.fps !== CLASSIC_WORLD.fps ||
        manifest.coordinateSystem.width !== 640 ||
        manifest.coordinateSystem.height !== 426 ||
        manifest.netFrames.length !== classicAnimation.net.frames ||
        !Object.keys(manifest.files).length ||
        Object.entries(manifest.files).some(
          ([path, hash]) =>
            !/^[a-zA-Z0-9/_-]+\.(svg|mp3)$/.test(path) ||
            path.includes("..") ||
            !/^[a-f0-9]{64}$/.test(hash),
        )
      )
        throw new LoadingError("manifest", "incompatible");
    } catch {
      throw new LoadingError("manifest", "incompatible");
    }
    const url = (path: string) =>
      `${BASE_PATH}classic/${path}?v=${manifest.files[path]}`;
    this.images = await loadImages(
      Object.keys(manifest.files)
        .filter((path) => path.endsWith(".svg"))
        .map((path) => ({ path, url: url(path) })),
      (completed, total) => onProgress({ stage: "images", completed, total }),
    );
    onProgress({ stage: "confetti", completed: 0, total: 1 });
    const template = await fetchAsset(
      url(manifest.effects.confetti.frames[0].path),
      (response) => response.text(),
      "confetti",
    );
    this.colors = new ConfettiImages(template);
    onProgress({ stage: "confetti", completed: 1, total: 1 });
    this.manifest = manifest;
    return manifest;
  }
  /** Only the current court/actor frames, using normal drawing's scale buckets. */
  async prepare(
    viewport: Viewport,
    state: GameState,
    effects: Effects | undefined,
    onProgress: (progress: LoadingProgress) => void,
  ): Promise<boolean> {
    const art = this.manifest;
    if (!art) throw new LoadingError("prewarm", "incompatible");
    const generation = this.generation;
    const jobs = new Map<string, { frame: DrawFrame; scale: number }>();
    const scale = viewport.dpr * viewport.scale;
    const add = (frame: DrawFrame | undefined, density = scale) => {
      if (!frame) return;
      const plan = rasterPlan(frame.width, frame.height, density);
      if (plan)
        jobs.set(`${frame.path}:${plan.width}x${plan.height}`, {
          frame,
          scale: density,
        });
    };
    add(art.background);
    add(this.netFrame(state));
    add(this.scoreFrame(state));
    add(art.markers);
    const players = effects?.frozenPlayers ?? state.players;
    for (const player of [players.left, players.right])
      for (const frame of this.playerFrames(player)) add(frame, scale * 1.25);
    if (state.shuttle.state !== "attached") add(art.shuttle);
    add(art.courtBrand);
    if (effects?.introAlpha) {
      add(art.ui.intro);
      add(art.introNames[`${state.players.left.characterId}-left`]);
      add(art.introNames[`${state.players.right.characterId}-right`]);
    }
    if (effects?.finishAlpha) add(art.ui.finish);
    let completed = 0;
    onProgress({ stage: "prewarm", completed, total: jobs.size });
    for (const { frame, scale: density } of jobs.values()) {
      // The progress/animation can paint before each expensive filtered raster.
      await yieldForPaint();
      if (generation !== this.generation) return false;
      const image = this.images.get(frame.path);
      if (!image) throw new LoadingError("prewarm", "incompatible");
      this.rasters.prepare(
        frame.path,
        image,
        frame.width,
        frame.height,
        density,
      );
      onProgress({
        stage: "prewarm",
        completed: ++completed,
        total: jobs.size,
      });
    }
    await yieldForPaint();
    return generation === this.generation;
  }
  clearEffectsImages(): void {
    this.generation++;
    this.colors?.reset();
    this.confettiRasters.clear();
    this.rasters.clear();
  }
  diagnostics() {
    return {
      raster: this.rasters.diagnostics(),
      confettiRaster: this.confettiRasters.diagnostics(),
      colors: this.colors?.diagnostics(),
    };
  }
  render(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    state: GameState,
    effects?: Effects,
  ): void {
    ctx.fillStyle = "#101722";
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    const art = this.manifest;
    if (!art) return;
    ctx.save();
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);
    ctx.beginPath();
    ctx.rect(0, 0, 640, 426);
    ctx.clip();
    this.draw(ctx, art.background);
    this.draw(ctx, this.netFrame(state));
    this.draw(ctx, this.scoreFrame(state));
    this.draw(ctx, art.markers);
    if (effects)
      for (const p of effects.particles)
        if (p.kind === "smoke") this.drawParticle(ctx, p);
    const players = effects?.frozenPlayers ?? state.players;
    this.drawPlayer(ctx, players.left);
    this.drawPlayer(ctx, players.right);
    if (effects)
      for (const p of effects.particles)
        if (p.kind === "tail") this.drawParticle(ctx, p);
    if (state.shuttle.state !== "attached") {
      ctx.save();
      ctx.translate(state.shuttle.x - 0.05, state.shuttle.y);
      ctx.rotate((state.shuttle.rotation * Math.PI) / 180);
      this.draw(ctx, art.shuttle);
      ctx.restore();
    }
    this.draw(ctx, art.courtBrand); // Original static court logo, depth38; no external action.
    if (effects) {
      // Intro is appended at match creation, sparks later. Finish is appended at victory;
      // terminal confetti is appended last. Never blanket-separate spark from overlay.
      if (effects.introAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = effects.introAlpha;
        ctx.translate(320, 213);
        this.draw(ctx, art.ui.intro);
        this.draw(
          ctx,
          art.introNames[`${state.players.left.characterId}-left`],
        );
        this.draw(
          ctx,
          art.introNames[`${state.players.right.characterId}-right`],
        );
        ctx.restore();
      }
      for (const spark of effects.sparks)
        if (spark.order < effects.finishOrder) this.drawSpark(ctx, spark);
      if (effects.finishAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = effects.finishAlpha;
        ctx.translate(320, 213);
        this.draw(ctx, art.ui.finish);
        ctx.restore();
      }
      for (const spark of effects.sparks)
        if (spark.order >= effects.finishOrder) this.drawSpark(ctx, spark);
      for (const p of effects.particles)
        if (p.kind === "confetti") this.drawParticle(ctx, p);
    }
    ctx.restore();
  }
  private draw(
    ctx: CanvasRenderingContext2D,
    frame: DrawFrame | undefined,
  ): void {
    if (!frame) return;
    const image = this.images.get(frame.path);
    if (image) drawCachedFrame(ctx, frame, image, this.rasters);
  }
  private netFrame(state: GameState): DrawFrame {
    const frames = this.manifest!.netFrames;
    return frames[
      Math.max(0, Math.min(frames.length - 1, state.net.frame - 1))
    ];
  }
  private scoreFrame(state: GameState): DrawFrame | undefined {
    const score =
      state.phase === "matchEnd" && state.winner
        ? `${state.winner === "left" ? "p1" : "p2"}wins`
        : `${state.score.left}-${state.score.right}`;
    return this.manifest!.scores[score];
  }
  private playerFrames(player: PlayerState): DrawFrame[] {
    const art = this.manifest!;
    const character = art.characters[player.characterId];
    const swings = art.families[character.family].swings[player.swingKind];
    const swing =
      swings[Math.max(0, Math.min(swings.length - 1, player.swingFrame - 1))];
    const bodyFrames = character.body[player.bodyFrame];
    const body =
      bodyFrames[Math.max(0, player.bodyFrameIndex - 1) % bodyFrames.length];
    return [swing, body];
  }
  private drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState): void {
    ctx.save();
    ctx.translate(player.x - 0.05, player.y);
    ctx.scale(classicDirection(player.side) * 1.25, 1.25);
    for (const frame of this.playerFrames(player)) this.draw(ctx, frame);
    ctx.restore();
  }
  private drawSpark(ctx: CanvasRenderingContext2D, spark: Spark): void {
    ctx.save();
    ctx.translate(spark.x, spark.y);
    ctx.rotate((spark.dir * Math.PI) / 180);
    ctx.scale(0.3, 0.3);
    this.draw(ctx, this.manifest!.effects.spark.frames[spark.frame - 1]);
    ctx.restore();
  }
  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const frame = this.manifest!.effects[p.kind].frames[0];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.scale(p.scale, p.scale);
    if (p.kind === "confetti") {
      const image = this.colors?.get(p);
      if (image)
        drawCachedFrame(
          ctx,
          frame,
          image,
          this.confettiRasters,
          `confetti:${p.color}`,
        );
    } else this.draw(ctx, frame);
    ctx.restore();
  }
}
