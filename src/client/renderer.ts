// Pixi's official interpreter adapters keep the existing script-src 'self' CSP.
import "pixi.js/unsafe-eval";
import { Container, Sprite, Texture, WebGLRenderer } from "pixi.js";
import { BASE_PATH } from "../shared/protocol";
import { classicAnimation } from "../shared/classic/assets";
import { CLASSIC_WORLD, classicDirection } from "../shared/classic/types";
import type { AssetManifest, DrawFrame } from "../shared/classic/manifest";
import type { GameState, PlayerState } from "../shared/state";
import type { Viewport } from "../shared/types";
import type { Effects, Particle, Spark } from "./effects";
import { displaySide } from "./perspective";
import {
  AtlasLoader,
  decodeAtlasImage,
  requiredAtlasGroups,
} from "./atlas-loader";
import { validateAtlasManifest } from "./atlas-manifest";
import { ConfettiMesh } from "./confetti-mesh";
import {
  fetchAsset,
  IMAGE_LOAD_CONCURRENCY,
  LoadingError,
  yieldForPaint,
  type LoadingProgress,
} from "./loading";

/** A retained ordered sprite pool; source registration is independent of atlas trim. */
class SpriteLayer {
  readonly container: Container;
  private sprites: Sprite[] = [];
  private cursor = 0;
  constructor(label: string) {
    this.container = new Container({ label });
  }
  begin(): void {
    this.cursor = 0;
  }
  draw(
    loader: AtlasLoader,
    frame: DrawFrame | undefined,
    x = 0,
    y = 0,
    rotation = 0,
    sx = 1,
    sy = sx,
  ): void {
    if (!frame) return;
    const cos = Math.cos(rotation),
      sin = Math.sin(rotation);
    for (const entry of loader.fragments(frame.path)) {
      let sprite = this.sprites[this.cursor];
      if (!sprite) {
        sprite = new Sprite();
        this.sprites.push(sprite);
        this.container.addChild(sprite);
      }
      this.cursor++;
      const { trim } = entry.fragment;
      const px = frame.x + (trim.x * frame.width) / entry.frame.pixelWidth;
      const py = frame.y + (trim.y * frame.height) / entry.frame.pixelHeight;
      sprite.label = frame.path;
      sprite.texture = entry.texture;
      sprite.position.set(
        x + cos * sx * px - sin * sy * py,
        y + sin * sx * px + cos * sy * py,
      );
      sprite.rotation = rotation;
      sprite.scale.set(
        (sx * frame.width) / entry.frame.pixelWidth,
        (sy * frame.height) / entry.frame.pixelHeight,
      );
      sprite.visible = true;
    }
  }
  end(): void {
    for (let i = this.cursor; i < this.sprites.length; i++)
      this.sprites[i].visible = false;
  }
  clear(): void {
    for (const sprite of this.sprites) {
      sprite.visible = false;
      sprite.texture = Texture.EMPTY;
    }
    this.cursor = 0;
  }
  destroy(): void {
    this.container.destroy({ children: true });
    this.sprites = [];
  }
}

/** Existing game state/Effects select every frame; this owner never advances a clock. */
export class Renderer {
  private manifest?: AssetManifest;
  private atlas?: AtlasLoader;
  private gpu?: WebGLRenderer<HTMLCanvasElement>;
  private stage = new Container({ label: "stage" });
  private court = new Container({ label: "court" });
  private background = new SpriteLayer("world:background-net");
  private score = new SpriteLayer("readable:score");
  private actors = new SpriteLayer("world:markers-smoke-actors-tail-shuttle");
  private brand = new SpriteLayer("readable:brand");
  private intro = new SpriteLayer("readable:intro-names");
  private beforeFinish = new SpriteLayer("world:sparks-before-finish");
  private finish = new SpriteLayer("readable:finish");
  private afterFinish = new SpriteLayer("world:sparks-after-finish");
  private confettiWorld = new Container({ label: "world:confetti" });
  private confetti?: ConfettiMesh;
  private domImages = new Map<string, HTMLImageElement>();
  private domController?: AbortController;
  private generation = 0;
  private contextGeneration = 0;
  private contextAvailable = true;
  private prepared = false;
  private destroyed = false;
  private maxTextureSize = 0;
  private batchTextureLimit = 0;
  private resized?: string;
  private frames = 0;
  private staticSignature?: string;
  private staticFramesSkipped = 0;
  private prepareCount = 0;
  private losses = 0;
  private restores = 0;
  private restoreFailures = 0;
  private sourceManifestSha256?: string;
  private get layers(): SpriteLayer[] {
    return [
      this.background,
      this.score,
      this.actors,
      this.brand,
      this.intro,
      this.beforeFinish,
      this.finish,
      this.afterFinish,
    ];
  }
  constructor(
    private canvas?: HTMLCanvasElement,
    private onContextChange: (available: boolean) => void = () => {},
  ) {
    this.stage.addChild(this.court);
    for (const layer of this.layers) this.court.addChild(layer.container);
    this.court.addChild(this.confettiWorld);
    canvas?.addEventListener("webglcontextlost", this.contextLost);
    canvas?.addEventListener("webglcontextrestored", this.contextRestored);
  }

  async load(
    onProgress: (progress: LoadingProgress) => void = () => {},
  ): Promise<AssetManifest> {
    if (this.destroyed) throw new LoadingError("manifest", "changed");
    onProgress({ stage: "manifest", completed: 0, total: 2 });
    const sourceText = await fetchAsset(
      `${BASE_PATH}classic/manifest.json`,
      (response) => response.text(),
      "manifest",
    );
    let manifest: AssetManifest;
    try {
      manifest = JSON.parse(sourceText) as AssetManifest;
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
        throw new Error("source manifest");
      this.sourceManifestSha256 = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(sourceText),
          ),
        ),
        (n) => n.toString(16).padStart(2, "0"),
      ).join("");
    } catch {
      throw new LoadingError("manifest", "incompatible");
    }
    onProgress({ stage: "manifest", completed: 1, total: 2 });
    const value = await fetchAsset(
      `${BASE_PATH}classic-atlas/manifest.json`,
      (response) => response.json(),
      "manifest",
    );
    let raster;
    try {
      raster = validateAtlasManifest(
        value,
        this.sourceManifestSha256,
        manifest,
      );
    } catch {
      throw new LoadingError("manifest", "incompatible");
    }
    if (this.destroyed) throw new LoadingError("manifest", "changed");
    this.atlas?.destroy();
    this.atlas = new AtlasLoader(raster);
    this.manifest = manifest;
    onProgress({ stage: "manifest", completed: 2, total: 2 });
    if (!this.gpu) {
      const gpu = new WebGLRenderer<HTMLCanvasElement>();
      try {
        await gpu.init({
          canvas: this.canvas,
          width: 640,
          height: 426,
          resolution: 1,
          autoDensity: false,
          background: 0x101722,
          backgroundAlpha: 1,
          antialias: false,
          roundPixels: false,
          preferWebGLVersion: 2,
        });
      } catch {
        gpu.destroy({ removeView: false });
        throw new LoadingError("prewarm", "incompatible");
      }
      if (this.destroyed) {
        gpu.destroy({ removeView: false });
        throw new LoadingError("manifest", "changed");
      }
      this.gpu = gpu;
      this.readCapabilities();
    }
    this.domController?.abort();
    const controller = new AbortController();
    this.domController = controller;
    const entries = Object.entries(raster.dom);
    let completed = 0,
      next = 0;
    onProgress({ stage: "images", completed, total: entries.length });
    const worker = async () => {
      while (next < entries.length && !controller.signal.aborted) {
        const [key, info] = entries[next++];
        const image = await decodeAtlasImage(
          this.domUrl(key),
          controller.signal,
        );
        if (
          image.naturalWidth !== info.width ||
          image.naturalHeight !== info.height
        ) {
          image.removeAttribute("src");
          throw new LoadingError("images", "incompatible");
        }
        if (controller.signal.aborted || this.destroyed) {
          image.removeAttribute("src");
          return;
        }
        this.domImages.get(key)?.removeAttribute("src");
        this.domImages.set(key, image);
        onProgress({
          stage: "images",
          completed: ++completed,
          total: entries.length,
        });
      }
    };
    try {
      await Promise.all(
        Array.from(
          { length: Math.min(IMAGE_LOAD_CONCURRENCY, entries.length) },
          worker,
        ),
      );
    } catch (error) {
      controller.abort();
      throw error;
    } finally {
      if (this.domController === controller) this.domController = undefined;
    }
    if (this.destroyed) throw new LoadingError("manifest", "changed");
    return manifest;
  }

  domUrl(sourcePath: string): string {
    const asset = this.atlas?.manifest.dom[sourcePath];
    if (!asset) throw new LoadingError("manifest", "incompatible");
    return `${BASE_PATH}classic-atlas/${asset.path}?v=${asset.sha256}`;
  }

  async prepare(
    view: Viewport,
    state: GameState,
    effects: Effects | undefined,
    onProgress: (progress: LoadingProgress) => void,
    mirrored = false,
  ): Promise<boolean> {
    if (!this.manifest || !this.atlas || !this.gpu)
      throw new LoadingError("prewarm", "incompatible");
    if (this.destroyed || !this.contextAvailable) return false;
    const generation = ++this.generation;
    this.prepared = false;
    this.resetNodes();
    const groups = requiredAtlasGroups(this.manifest, state);
    const done = await this.atlas.prepare(
      groups,
      view.scale * view.dpr,
      this.maxTextureSize,
      (source) => {
        if (this.contextAvailable && !this.destroyed)
          this.gpu!.texture.initSource(source);
      },
      onProgress,
    );
    if (
      !done ||
      generation !== this.generation ||
      this.destroyed ||
      !this.contextAvailable
    )
      return false;
    this.prepareCount++;
    this.prepared = true;
    // Compile ordinary sprite/mask/mesh shaders behind the loading cover as well as uploading pixels.
    this.draw(view, state, effects, mirrored, true);
    await yieldForPaint();
    return generation === this.generation && this.readyFor(state);
  }

  readyFor(state: GameState): boolean {
    return !!(
      this.prepared &&
      this.contextAvailable &&
      !this.destroyed &&
      this.manifest &&
      this.atlas?.ready(requiredAtlasGroups(this.manifest, state))
    );
  }

  resize(view: Viewport): void {
    if (!this.gpu || !this.contextAvailable || this.destroyed) return;
    const key = `${view.width}:${view.height}:${view.dpr}`;
    if (key !== this.resized) {
      this.gpu.resize(view.width, view.height, view.dpr);
      this.resized = key;
      this.staticSignature = undefined;
    }
    this.court.position.set(view.offsetX, view.offsetY);
    this.court.scale.set(view.scale);
  }

  clearEffectsImages(): void {
    this.generation++;
    this.atlas?.cancel();
    this.resetNodes();
  }
  /** Request one repaint after visibility/BFCache resume without touching art or Effects. */
  invalidateFrame(): void {
    this.staticSignature = undefined;
  }
  private resetNodes(): void {
    this.staticSignature = undefined;
    for (const layer of this.layers) layer.clear();
    if (this.confetti) {
      this.confetti.destroy();
      this.confetti = undefined;
    }
  }

  render(
    view: Viewport,
    state: GameState,
    effects?: Effects,
    mirrored = false,
  ): void {
    this.draw(view, state, effects, mirrored, false);
  }
  private draw(
    view: Viewport,
    state: GameState,
    effects: Effects | undefined,
    mirrored: boolean,
    warmConfetti: boolean,
  ): void {
    if (!this.readyFor(state) || !this.gpu || !this.atlas || !this.manifest)
      return;
    // Idle/queue artwork has no Effects clock. Compare every rendered value,
    // including mutable frame selectors, rather than relying on state identity.
    const signature =
      effects === undefined && !warmConfetti
        ? staticCourtSignature(view, state, mirrored)
        : undefined;
    if (signature !== undefined && signature === this.staticSignature) {
      this.staticFramesSkipped++;
      return;
    }
    this.staticSignature = undefined;
    this.resize(view);
    const art = this.manifest,
      loader = this.atlas;
    for (const layer of this.layers) layer.begin();
    for (const world of [
      this.background.container,
      this.actors.container,
      this.beforeFinish.container,
      this.afterFinish.container,
      this.confettiWorld,
    ]) {
      world.position.set(mirrored ? CLASSIC_WORLD.width : 0, 0);
      world.scale.set(mirrored ? -1 : 1, 1);
    }
    this.background.draw(loader, art.background);
    this.background.draw(loader, this.netFrame(state));
    this.score.draw(loader, this.scoreFrame(state, mirrored));
    this.actors.draw(loader, art.markers);
    if (effects)
      for (const p of effects.particles)
        if (p.kind === "smoke") this.drawParticle(this.actors, p);
    const players = effects?.frozenPlayers ?? state.players;
    this.drawPlayer(players.left);
    this.drawPlayer(players.right);
    if (effects)
      for (const p of effects.particles)
        if (p.kind === "tail") this.drawParticle(this.actors, p);
    if (state.shuttle.state !== "attached")
      this.actors.draw(
        loader,
        art.shuttle,
        state.shuttle.x - 0.05,
        state.shuttle.y,
        radians(state.shuttle.rotation),
      );
    this.brand.draw(loader, art.courtBrand);
    this.intro.container.alpha = effects?.introAlpha ?? 0;
    this.finish.container.alpha = effects?.finishAlpha ?? 0;
    if (effects) {
      if (effects.introAlpha > 0) {
        this.intro.draw(loader, art.ui.intro, 320, 213);
        for (const frame of this.introFrames(state, mirrored))
          this.intro.draw(loader, frame, 320, 213);
      }
      for (const spark of effects.sparks)
        if (spark.order < effects.finishOrder)
          this.drawSpark(this.beforeFinish, spark);
      if (effects.finishAlpha > 0)
        this.finish.draw(loader, art.ui.finish, 320, 213);
      for (const spark of effects.sparks)
        if (spark.order >= effects.finishOrder)
          this.drawSpark(this.afterFinish, spark);
    }
    if (warmConfetti || effects?.particles.some((p) => p.kind === "confetti"))
      this.ensureConfetti();
    this.confetti?.update(effects?.particles ?? []);
    if (warmConfetti) this.confetti!.prewarm();
    for (const layer of this.layers) layer.end();
    try {
      this.renderCourt(view);
    } finally {
      if (warmConfetti) this.confetti!.update(effects?.particles ?? []);
    }
    this.staticSignature = signature;
    this.frames++;
  }
  private renderCourt(view: Viewport): void {
    const gpu = this.gpu!,
      gl = gpu.gl;
    const clip = courtScissor(
      view,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
    );
    // This renderer owns one root WebGL pass: no filters, offscreen targets or
    // backbuffer/MSAA pass. Clear the entire letterbox before restricting draws.
    // Pixi's public target bind/render calls do not change SCISSOR_TEST, and its
    // state cache does not track it. Always leave it disabled, including errors.
    gl.disable(gl.SCISSOR_TEST);
    gpu.renderTarget.bind({
      target: gpu.view.renderTarget,
      clear: true,
      clearColor: gpu.background.colorRgba,
    });
    try {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(clip.x, clip.y, clip.width, clip.height);
      gpu.render({
        container: this.stage,
        target: gpu.view.renderTarget,
        clear: false,
      });
    } finally {
      gl.disable(gl.SCISSOR_TEST);
    }
  }
  private ensureConfetti(): void {
    if (this.confetti) return;
    const loader = this.atlas!;
    const base = loader.fragments(loader.manifest.confetti.base);
    const delta = loader.fragments(loader.manifest.confetti.delta);
    if (base.length !== 1 || delta.length !== 1)
      throw new LoadingError("prewarm", "incompatible");
    this.confetti = new ConfettiMesh(
      this.manifest!.effects.confetti.frames[0],
      base[0],
      delta[0],
    );
    this.confettiWorld.addChild(this.confetti.mesh);
  }

  private netFrame(state: GameState): DrawFrame {
    const frames = this.manifest!.netFrames;
    return frames[
      Math.max(0, Math.min(frames.length - 1, state.net.frame - 1))
    ];
  }
  private scoreFrame(
    state: GameState,
    mirrored: boolean,
  ): DrawFrame | undefined {
    const score =
      state.phase === "matchEnd" && state.winner
        ? `${displaySide(state.winner, mirrored) === "left" ? "p1" : "p2"}wins`
        : `${state.score[displaySide("left", mirrored)]}-${state.score[displaySide("right", mirrored)]}`;
    return this.manifest!.scores[score];
  }
  private introFrames(state: GameState, mirrored: boolean): DrawFrame[] {
    const names = this.manifest!.introNames;
    return [
      names[`${state.players[displaySide("left", mirrored)].characterId}-left`],
      names[
        `${state.players[displaySide("right", mirrored)].characterId}-right`
      ],
    ];
  }
  private drawPlayer(player: PlayerState): void {
    const art = this.manifest!,
      character = art.characters[player.characterId];
    const swings = art.families[character.family].swings[player.swingKind];
    const swing =
      swings[Math.max(0, Math.min(swings.length - 1, player.swingFrame - 1))];
    const bodies = character.body[player.bodyFrame];
    const body = bodies[Math.max(0, player.bodyFrameIndex - 1) % bodies.length];
    // Pirate's depth21 attachment is already baked into body, above the swing.
    for (const frame of [swing, body])
      this.actors.draw(
        this.atlas!,
        frame,
        player.x - 0.05,
        player.y,
        0,
        classicDirection(player.side) * 1.25,
        1.25,
      );
  }
  private drawSpark(layer: SpriteLayer, spark: Spark): void {
    layer.draw(
      this.atlas!,
      this.manifest!.effects.spark.frames[spark.frame - 1],
      spark.x,
      spark.y,
      radians(spark.dir),
      0.3,
    );
  }
  private drawParticle(layer: SpriteLayer, particle: Particle): void {
    layer.draw(
      this.atlas!,
      this.manifest!.effects[particle.kind].frames[0],
      particle.x,
      particle.y,
      radians(particle.rotation),
      particle.scale,
    );
  }
  private readCapabilities(): void {
    this.maxTextureSize = this.gpu!.gl.getParameter(
      this.gpu!.gl.MAX_TEXTURE_SIZE,
    ) as number;
    if (!Number.isFinite(this.maxTextureSize) || this.maxTextureSize < 1)
      throw new LoadingError("prewarm", "incompatible");
    // The default batch fragment shader has one sampler branch per allowed
    // texture. Keep that shader small; Pixi preserves order across extra batches.
    this.batchTextureLimit = Math.min(this.gpu!.limits.maxBatchableTextures, 1);
    this.gpu!.limits.maxBatchableTextures = this.batchTextureLimit;
  }
  private contextLost = (event: Event): void => {
    event.preventDefault();
    if (this.destroyed) return;
    this.contextAvailable = false;
    this.staticSignature = undefined;
    this.prepared = false;
    this.generation++;
    this.contextGeneration++;
    this.atlas?.contextLost();
    this.losses++;
    this.onContextChange(false);
  };
  private contextRestored = (): void => {
    if (this.destroyed) return;
    const generation = ++this.contextGeneration;
    void yieldForPaint().then(() => {
      // Scene invalidation must not discard the only restored event. A newer
      // loss/restoration or terminal disposal can still invalidate this task.
      if (this.destroyed || generation !== this.contextGeneration) return;
      try {
        this.readCapabilities();
        this.contextAvailable = true;
        this.resized = undefined;
        this.restores++;
        this.onContextChange(true);
      } catch {
        this.restoreFailures++;
        this.contextAvailable = false;
        this.onContextChange(false);
      }
    });
  };
  diagnostics() {
    return {
      backend: "webgl",
      ready: this.prepared && this.contextAvailable && !this.destroyed,
      contextAvailable: this.contextAvailable,
      maxTextureSize: this.maxTextureSize,
      batchTextureLimit: this.batchTextureLimit,
      sourceManifestSha256: this.sourceManifestSha256,
      frames: this.frames,
      staticFramesSkipped: this.staticFramesSkipped,
      preparations: this.prepareCount,
      contextLosses: this.losses,
      contextRestores: this.restores,
      contextRestoreFailures: this.restoreFailures,
      atlas: this.atlas?.diagnostics(),
      confetti: this.confetti?.diagnostics() ?? { particles: 0, draws: 0 },
      pooledSprites: this.layers.reduce(
        (count, layer) => count + layer.container.children.length,
        0,
      ),
    };
  }
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.generation++;
    this.contextGeneration++;
    this.canvas?.removeEventListener("webglcontextlost", this.contextLost);
    this.canvas?.removeEventListener(
      "webglcontextrestored",
      this.contextRestored,
    );
    this.domController?.abort();
    for (const image of this.domImages.values()) image.removeAttribute("src");
    this.domImages.clear();
    this.resetNodes();
    for (const layer of this.layers) layer.destroy();
    this.stage.destroy({ children: true });
    this.atlas?.destroy();
    this.gpu?.destroy({ removeView: false });
    this.gpu = undefined;
  }
}
function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Match non-MSAA rectangular raster coverage by testing framebuffer pixel centers. */
export function courtScissor(
  view: Viewport,
  bufferWidth: number,
  bufferHeight: number,
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const edge = (value: number, limit: number) =>
    Math.max(0, Math.min(limit, Math.ceil(value - 0.5)));
  const left = edge(view.offsetX * view.dpr, bufferWidth);
  const right = edge(
    (view.offsetX + CLASSIC_WORLD.width * view.scale) * view.dpr,
    bufferWidth,
  );
  const bottom = edge(
    bufferHeight -
      (view.offsetY + CLASSIC_WORLD.height * view.scale) * view.dpr,
    bufferHeight,
  );
  const top = edge(bufferHeight - view.offsetY * view.dpr, bufferHeight);
  return {
    x: left,
    y: bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, top - bottom),
  };
}

/** Keep aligned with draw's effects-free source selectors and transforms. */
function staticCourtSignature(
  view: Viewport,
  state: GameState,
  mirrored: boolean,
): string {
  const left = state.players.left,
    right = state.players.right,
    shuttle = state.shuttle;
  return [
    view.width,
    view.height,
    view.scale,
    view.offsetX,
    view.offsetY,
    view.dpr,
    mirrored,
    state.phase,
    state.winner,
    state.score.left,
    state.score.right,
    state.net.frame,
    shuttle.state,
    shuttle.x,
    shuttle.y,
    shuttle.rotation,
    left.characterId,
    left.side,
    left.x,
    left.y,
    left.swingKind,
    left.swingFrame,
    left.bodyFrame,
    left.bodyFrameIndex,
    right.characterId,
    right.side,
    right.x,
    right.y,
    right.swingKind,
    right.swingFrame,
    right.bodyFrame,
    right.bodyFrameIndex,
  ].join("|");
}
