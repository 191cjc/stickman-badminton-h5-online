import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  DOMAdapter,
  Mesh,
  Sprite,
  type Container,
  type PointData,
} from "pixi.js";
import type * as Pixi from "pixi.js";
import type { AssetManifest } from "../src/shared/classic/manifest";
import type { AtlasManifest } from "../src/client/atlas-manifest";
import { Simulation } from "../src/shared/simulation";
import type { Viewport } from "../src/shared/types";
import { Effects, createParticle } from "../src/client/effects";
import { Renderer, courtScissor } from "../src/client/renderer";
import {
  ATLAS_IMAGE_TIMEOUT_MS,
  AtlasLoader,
  decodeAtlasImage,
  requiredAtlasGroups,
} from "../src/client/atlas-loader";
import type { LoadingProgress } from "../src/client/loading";

const backend = vi.hoisted(() => ({
  render: vi.fn(),
  upload: vi.fn(),
  resize: vi.fn(),
  destroy: vi.fn(),
  init: vi.fn(),
  bind: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  scissor: vi.fn(),
  createLimits: vi.fn(() => ({ maxBatchableTextures: 32 })),
}));
vi.mock("pixi.js", async (original) => {
  const actual = await original<typeof Pixi>();
  return {
    ...actual,
    WebGLRenderer: class {
      gl = {
        MAX_TEXTURE_SIZE: 0x0d33,
        SCISSOR_TEST: 0x0c11,
        drawingBufferWidth: 640,
        drawingBufferHeight: 426,
        getParameter: () => 8192,
        enable: backend.enable,
        disable: backend.disable,
        scissor: backend.scissor,
      };
      view = { renderTarget: {} };
      background = { colorRgba: [16 / 255, 23 / 255, 34 / 255, 1] };
      renderTarget = { bind: backend.bind };
      texture = { initSource: backend.upload };
      limits = backend.createLimits();
      init = backend.init;
      render = backend.render;
      resize = (width: number, height: number, resolution: number) => {
        this.gl.drawingBufferWidth = Math.round(width * resolution);
        this.gl.drawingBufferHeight = Math.round(height * resolution);
        backend.resize(width, height, resolution);
      };
      destroy = backend.destroy;
    },
  };
});
const sourceText = readFileSync("public/classic/manifest.json", "utf8");
const source = JSON.parse(sourceText) as AssetManifest;
const atlas = JSON.parse(
  readFileSync("public/classic-atlas/manifest.json", "utf8"),
) as AtlasManifest;
const view: Viewport = {
  width: 1000,
  height: 700,
  scale: 1.4,
  offsetX: 17,
  offsetY: 11,
  dpr: 2,
};
const renderers: Renderer[] = [];
const originalAdapter = DOMAdapter.get();

function fixture(raster = atlas, sourceBytes = sourceText) {
  const urls: string[] = [],
    images: FakeImage[] = [];
  const infos = new Map(
    [
      ...Object.values(raster.dom),
      ...Object.values(raster.variants.hd.pages),
      ...Object.values(raster.variants.sd.pages),
    ].map((p) => [p.path, p]),
  );
  let manual = false,
    fail = false,
    active = 0,
    maximum = 0;
  class FakeImage {
    onload?: (() => void) | null;
    onerror?: (() => void) | null;
    naturalWidth = 0;
    naturalHeight = 0;
    private url = "";
    private waiting = false;
    decode = vi.fn().mockResolvedValue(undefined);
    set src(url: string) {
      this.url = url;
      urls.push(url);
      images.push(this);
      const info = infos.get(url.split("/classic-atlas/")[1]?.split("?")[0]);
      this.naturalWidth = info?.width ?? 1;
      this.naturalHeight = info?.height ?? 1;
      this.waiting = true;
      maximum = Math.max(maximum, ++active);
      if (!manual) queueMicrotask(() => this.complete());
    }
    get src() {
      return this.url;
    }
    complete() {
      if (!this.waiting) return;
      this.waiting = false;
      active--;
      if (fail) this.onerror?.();
      else this.onload?.();
    }
    removeAttribute() {
      if (this.waiting) {
        this.waiting = false;
        active--;
      }
      this.url = "";
    }
  }
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0));
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: string) =>
        new Response(
          url.includes("classic-atlas") ? JSON.stringify(raster) : sourceBytes,
        ),
    ),
  );
  // GlProgram's feature probe needs an adapter canvas, but these tests execute actual
  // Pixi transforms/geometry instead of creating a Node WebGL implementation.
  DOMAdapter.set({
    ...originalAdapter,
    createCanvas: () =>
      ({ getContext: () => null }) as unknown as HTMLCanvasElement,
  });
  const canvas = new EventTarget() as HTMLCanvasElement;
  const context = vi.fn();
  const renderer = new Renderer(canvas, context);
  renderers.push(renderer);
  return {
    renderer,
    canvas,
    context,
    urls,
    images,
    setManual: (value: boolean) => {
      manual = value;
    },
    setFailure: (value: boolean) => {
      fail = value;
    },
    maximum: () => maximum,
    complete: async () => {
      for (const image of [...images]) image.complete();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  backend.render.mockReset();
  backend.createLimits
    .mockReset()
    .mockImplementation(() => ({ maxBatchableTextures: 32 }));
});

it.each([1, 2, 32])(
  "caps a device's %i batch samplers before the first draw and reapplies the cap after restore",
  async (deviceLimit) => {
    const limits = { maxBatchableTextures: deviceLimit };
    backend.createLimits.mockReturnValueOnce(limits);
    const f = fixture();
    await f.renderer.load();
    const expected = Math.min(deviceLimit, 1);
    expect(limits.maxBatchableTextures).toBe(expected);
    expect(f.renderer.diagnostics().batchTextureLimit).toBe(expected);
    expect(backend.render).not.toHaveBeenCalled();
    const state = stateFor();
    await f.renderer.prepare(view, state, undefined, () => {});
    f.canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    // Pixi's limits system discovers device limits again during restoration.
    limits.maxBatchableTextures = deviceLimit;
    f.canvas.dispatchEvent(new Event("webglcontextrestored"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(limits.maxBatchableTextures).toBe(expected);
    expect(await f.renderer.prepare(view, state, undefined, () => {})).toBe(
      true,
    );
    expect(f.renderer.diagnostics().batchTextureLimit).toBe(expected);
  },
);
afterEach(() => {
  for (const renderer of renderers.splice(0)) renderer.destroy();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  DOMAdapter.set(originalAdapter);
});
function stateFor(
  left: "pirate" | "toaster" | "joe" = "pirate",
  right: "pirate" | "toaster" | "joe" = "toaster",
) {
  return new Simulation({ characters: { left, right } }).snapshot();
}
function stage(): Container {
  return backend.render.mock.calls.at(-1)![0].container as Container;
}
function sprites(container = stage()): Sprite[] {
  return container.children.flatMap((node) =>
    !node.visible ? [] : node instanceof Sprite ? [node] : sprites(node),
  );
}
function one(path: string): Sprite {
  return sprites().find((sprite) => sprite.label === path)!;
}
function sourcePoint(
  sprite: Sprite,
  point: PointData = { x: 0, y: 0 },
): PointData {
  return sprite.toGlobal(point);
}
function freezeDeep(value: object): void {
  for (const child of Object.values(value))
    if (child && typeof child === "object") freezeDeep(child);
  Object.freeze(value);
}

it("loads versioned baked PNGs only, prepares every active actor frame and reports actual decode/upload completions", async () => {
  const f = fixture(),
    progress: LoadingProgress[] = [];
  expect(await f.renderer.load((p) => progress.push(p))).toEqual(source);
  const state = stateFor();
  expect(f.renderer.readyFor(state)).toBe(false);
  expect(
    await f.renderer.prepare(view, state, undefined, (p) => progress.push(p)),
  ).toBe(true);
  expect(f.renderer.readyFor(state)).toBe(true);
  expect(f.urls.every((url) => /\.png\?v=[a-f0-9]{64}$/.test(url))).toBe(true);
  expect(f.maximum()).toBeLessThanOrEqual(6);
  const prewarm = progress.filter((p) => p.stage === "prewarm");
  expect(prewarm.map((p) => p.completed)).toEqual(
    Array.from({ length: prewarm[0].total! + 1 }, (_, index) => index),
  );
  expect(backend.upload).toHaveBeenCalledTimes(prewarm[0].total!);
  const diagnostics = f.renderer.diagnostics().atlas!;
  expect(diagnostics.rgbaBytesEstimate).toBeLessThanOrEqual(96 * 1024 * 1024);
  expect(diagnostics.groups.sort()).toEqual([
    "body-pirate",
    "body-toaster",
    "common",
    "court",
    "swing-adult",
    "swing-toaster",
  ]);
  const before = f.urls.length;
  for (
    let frame = 1;
    frame <= source.families.adult.swings.overhead.length;
    frame++
  ) {
    state.players.left.swingKind = "overhead";
    state.players.left.swingFrame = frame;
    state.net.frame = (frame % source.netFrames.length) + 1;
    f.renderer.render(view, state);
  }
  expect(f.urls).toHaveLength(before);
  expect(backend.init.mock.calls[0][0]).toMatchObject({
    preferWebGLVersion: 2,
    autoDensity: false,
    antialias: false,
  });
});

it("rejects mixed releases before images or GPU initialization and permits a fresh retry", async () => {
  const invalid = structuredClone(atlas);
  invalid.sourceManifestSha256 = "0".repeat(64);
  const f = fixture(invalid);
  await expect(f.renderer.load()).rejects.toMatchObject({
    stage: "manifest",
    reason: "incompatible",
  });
  expect(f.urls).toHaveLength(0);
  expect(backend.init).not.toHaveBeenCalled();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: string) =>
        new Response(
          url.includes("classic-atlas") ? JSON.stringify(atlas) : sourceText,
        ),
    ),
  );
  await expect(f.renderer.load()).resolves.toEqual(source);
});

it("cancels stale work on scene invalidation and reuses already decoded pages for the latest room", async () => {
  const f = fixture();
  await f.renderer.load();
  f.setManual(true);
  const state = stateFor();
  const first = f.renderer.prepare(view, state, undefined, () => {});
  await Promise.resolve();
  expect(f.maximum()).toBe(6);
  f.renderer.clearEffectsImages();
  await expect(first).resolves.toBe(false);
  await f.complete();
  expect(f.renderer.readyFor(state)).toBe(false);
  expect(backend.upload).not.toHaveBeenCalled();
  f.setManual(false);
  const latest = stateFor("joe", "joe");
  expect(await f.renderer.prepare(view, latest, undefined, () => {})).toBe(
    true,
  );
  expect(f.renderer.readyFor(state)).toBe(false);
  expect(f.renderer.readyFor(latest)).toBe(true);
  expect(f.renderer.diagnostics().atlas!.groups).not.toContain("body-pirate");
});

it("failed image batches stop late progress and retry instead of retaining a rejected request", async () => {
  const f = fixture();
  await f.renderer.load();
  f.setFailure(true);
  const state = stateFor(),
    progress: LoadingProgress[] = [];
  await expect(
    f.renderer.prepare(view, state, undefined, (p) => progress.push(p)),
  ).rejects.toMatchObject({ stage: "images", reason: "request" });
  const length = progress.length;
  await f.complete();
  expect(progress).toHaveLength(length);
  expect(f.renderer.readyFor(state)).toBe(false);
  f.setFailure(false);
  expect(await f.renderer.prepare(view, state, undefined, () => {})).toBe(true);
});

it("same-role rematch and backing-density changes retain sources, live effect data and bounded pooled sprites", async () => {
  const f = fixture();
  await f.renderer.load();
  const state = stateFor();
  await f.renderer.prepare(view, state, undefined, () => {});
  const before = f.renderer.diagnostics().atlas!,
    urls = f.urls.length;
  f.renderer.clearEffectsImages();
  await f.renderer.prepare(view, state, undefined, () => {});
  expect(f.urls).toHaveLength(urls);
  expect(f.renderer.diagnostics().atlas).toEqual(before);
  const effects = new Effects();
  effects.particles.push(createParticle("tail", 200, 100, () => 0.2));
  const particles = JSON.stringify(effects.particles);
  f.renderer.render(view, state, effects);
  const count = f.renderer.diagnostics().pooledSprites;
  for (let i = 0; i < 20; i++)
    f.renderer.render({ ...view, dpr: 0.7 }, state, effects);
  expect(f.renderer.diagnostics().pooledSprites).toBe(count);
  expect(f.renderer.diagnostics().atlas).toEqual(before);
  expect(JSON.stringify(effects.particles)).toBe(particles);
  expect(backend.resize).toHaveBeenCalledTimes(2);
});

it("preserves real source registration, family frame semantics and body-after-swing under world reflection", async () => {
  const f = fixture();
  await f.renderer.load();
  const state = stateFor();
  state.players.left.swingKind = "underhand";
  state.players.left.swingFrame = 9;
  state.players.left.bodyFrame = "forward";
  state.players.left.bodyFrameIndex = 6;
  state.players.right.swingKind = "overhead";
  state.players.right.swingFrame = 12;
  await f.renderer.prepare(view, state, undefined, () => {});
  for (const mirrored of [false, true]) {
    f.renderer.render(view, state, undefined, mirrored);
    const ordered = sprites();
    for (const player of Object.values(state.players)) {
      const character = source.characters[player.characterId];
      const swing =
        source.families[character.family].swings[player.swingKind][
          player.swingFrame - 1
        ];
      const body =
        character.body[player.bodyFrame][
          (player.bodyFrameIndex - 1) % character.body[player.bodyFrame].length
        ];
      expect(ordered.findIndex((s) => s.label === swing.path)).toBeLessThan(
        ordered.findIndex((s) => s.label === body.path),
      );
      const node = one(body.path),
        fragment = atlas.variants.hd.frames[body.path];
      const trim = fragment.fragments[0].trim;
      const localX = body.x + (trim.x * body.width) / fragment.pixelWidth;
      const localY = body.y + (trim.y * body.height) / fragment.pixelHeight;
      const actorDirection = player.side === "left" ? 1 : -1;
      const x = player.x - 0.05 + actorDirection * 1.25 * localX;
      const y = player.y + 1.25 * localY;
      const expectedX = view.offsetX + view.scale * (mirrored ? 640 - x : x);
      const actual = sourcePoint(node);
      expect(actual.x).toBeCloseTo(expectedX, 8);
      expect(actual.y).toBeCloseTo(view.offsetY + view.scale * y, 8);
      const p0 = node.toGlobal({ x: 0, y: 0 }),
        px = node.toGlobal({ x: node.texture.width, y: 0 });
      expect(Math.sign(px.x - p0.x)).toBe(actorDirection * (mirrored ? -1 : 1));
    }
  }
});

it("keeps original effect order and readable score/names/winner, with one body-only colored confetti mesh and no state mutation", async () => {
  const f = fixture();
  await f.renderer.load();
  const state = stateFor();
  state.score = { left: 1, right: 2 };
  state.shuttle.state = "flying";
  state.shuttle.x = 410;
  state.shuttle.y = 145;
  state.shuttle.rotation = 31;
  const effects = new Effects();
  effects.reset("test");
  effects.ingest({
    type: "snapshot",
    room: "test",
    tick: 0,
    ack: 0,
    ackTick: null,
    status: "playing",
    reconnectRemainingMs: 0,
    state,
    effects: { cursor: 0, events: [] },
  });
  effects.finish(true, state);
  effects.advance(0, 1 / 60, () => {});
  effects.finishOrder = 2;
  effects.sparks.push(
    { x: 221, y: 170, dir: 17, frame: 1, tick: 0, order: 1 },
    { x: 341, y: 120, dir: -35, frame: 4, tick: 0, order: 3 },
  );
  effects.particles.length = 0;
  effects.particles.push(
    createParticle("smoke", 480, 210, () => 0.3),
    createParticle("tail", 411, 146, () => 0.4),
    createParticle("confetti", 73, 89, () => 0.2),
  );
  const before = structuredClone(state),
    effectBefore = effects.diagnostics();
  freezeDeep(state);
  await f.renderer.prepare(view, state, effects, () => {});
  f.renderer.render(view, state, effects, true);
  const paths = sprites().map((node) => node.label);
  for (const path of [
    source.scores["2-1"].path,
    source.introNames["toaster-left"].path,
    source.introNames["pirate-right"].path,
    source.courtBrand.path,
    source.ui.intro.path,
    source.ui.finish.path,
  ]) {
    expect(paths).toContain(path);
    const node = one(path),
      p0 = node.toGlobal({ x: 0, y: 0 }),
      p1 = node.toGlobal({ x: 1, y: 0 });
    expect(p1.x).toBeGreaterThan(p0.x);
  }
  expect(paths.indexOf(source.effects.spark.frames[0].path)).toBeLessThan(
    paths.indexOf(source.ui.finish.path),
  );
  expect(paths.indexOf(source.effects.spark.frames[3].path)).toBeGreaterThan(
    paths.indexOf(source.ui.finish.path),
  );
  const world = stage().children[0].children.find(
    (node) => node.label === "world:confetti",
  )!;
  expect(world.children).toHaveLength(1);
  expect(world.children[0]).toBeInstanceOf(Mesh);
  expect(f.renderer.diagnostics().confetti).toMatchObject({
    draws: 1,
    particles: 1,
  });
  const mesh = world.children[0] as Mesh;
  expect(mesh.geometry.indexCount).toBe(6);
  expect(mesh.shader!.glProgram!.fragment).toContain(
    "fixedColor.rgb + bodyContribution * vBodyColor",
  );
  expect(state).toEqual(before);
  expect(effects.diagnostics()).toEqual(effectBefore);
  for (const winner of ["left", "right"] as const) {
    const result = structuredClone(state);
    result.phase = "matchEnd";
    result.winner = winner;
    f.renderer.render(view, result, effects, true);
    expect(sprites().map((node) => node.label)).toContain(
      source.scores[winner === "left" ? "p2wins" : "p1wins"].path,
    );
  }
});

it("gates draws on context loss, reuploads retained decoded pages on restore, and disposes listeners/sources once", async () => {
  const f = fixture();
  await f.renderer.load();
  const state = stateFor();
  await f.renderer.prepare(view, state, undefined, () => {});
  const before = f.renderer.diagnostics().atlas!,
    drawCount = backend.render.mock.calls.length;
  const event = new Event("webglcontextlost", { cancelable: true });
  f.canvas.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(f.context).toHaveBeenLastCalledWith(false);
  expect(f.renderer.readyFor(state)).toBe(false);
  f.renderer.render(view, state);
  expect(backend.render).toHaveBeenCalledTimes(drawCount);
  f.canvas.dispatchEvent(new Event("webglcontextrestored"));
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(f.context).toHaveBeenLastCalledWith(true);
  expect(await f.renderer.prepare(view, state, undefined, () => {})).toBe(true);
  expect(f.renderer.diagnostics().atlas!.decodes).toBe(before.decodes);
  expect(f.renderer.diagnostics().atlas!.uploads).toBe(before.uploads * 2);
  const remove = vi.spyOn(f.canvas, "removeEventListener");
  f.renderer.destroy();
  f.renderer.destroy();
  expect(backend.destroy).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledTimes(2);
  expect(f.renderer.diagnostics().atlas!.pages).toBe(0);
});

it("chooses the bounded SD tier before decoding when HD exceeds device limits", async () => {
  const f = fixture(),
    loader = new AtlasLoader(atlas),
    state = stateFor();
  const groups = requiredAtlasGroups(source, state);
  const hdMax = Math.max(
    ...groups
      .flatMap((g) => atlas.variants.hd.groups[g])
      .map((id) =>
        Math.max(
          atlas.variants.hd.pages[id].width,
          atlas.variants.hd.pages[id].height,
        ),
      ),
  );
  // Force budget failure independently of the actual generated page dimensions.
  const changed = structuredClone(atlas);
  for (const page of Object.values(changed.variants.hd.pages))
    page.rgbaBytes = 96 * 1024 * 1024;
  const capped = new AtlasLoader(changed);
  expect(capped.chooseTier(groups, 4, hdMax)).toBe("sd");
  expect(
    await loader.prepare(
      groups,
      1,
      8192,
      () => {},
      () => {},
    ),
  ).toBe(true);
  expect(loader.diagnostics().tier).toBe("sd");
  expect(f.urls.length).toBeGreaterThan(0);
  loader.destroy();
  capped.destroy();
});

it("restores graphics after a scene reset during the restore event's paint yield", async () => {
  const f = fixture();
  await f.renderer.load();
  await f.renderer.prepare(view, stateFor(), undefined, () => {});
  f.canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  f.canvas.dispatchEvent(new Event("webglcontextrestored"));
  // A matched/reconnect message can clear the old scene before Pixi has
  // completed restoration; the current room must still become preparable.
  f.renderer.clearEffectsImages();
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(f.context).toHaveBeenLastCalledWith(true);
  const current = stateFor("joe", "joe");
  expect(await f.renderer.prepare(view, current, undefined, () => {})).toBe(
    true,
  );
  expect(f.renderer.readyFor(current)).toBe(true);
  expect(f.renderer.readyFor(stateFor())).toBe(false);
});

it.each(["download", "decode"])(
  "immediately aborts a pending atlas %s and cleans up before any late completion",
  async (phase) => {
    const f = fixture();
    f.setManual(true);
    vi.useFakeTimers();
    const controller = new AbortController();
    const removeAbort = vi.spyOn(controller.signal, "removeEventListener");
    const request = decodeAtlasImage(
      "/classic-atlas/pending.png",
      controller.signal,
    );
    let decoded: (() => void) | undefined;
    if (phase === "decode") {
      f.images[0].decode.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            decoded = resolve;
          }),
      );
      await f.complete();
    }
    controller.abort();
    await expect(request).rejects.toMatchObject({
      stage: "images",
      reason: "changed",
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(removeAbort).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(f.images[0].onload).toBeNull();
    expect(f.images[0].onerror).toBeNull();
    expect(f.images[0].src).toBe("");
    decoded?.();
    await f.complete();
    await vi.runAllTimersAsync();
    expect(f.images[0].src).toBe("");
  },
);

it("allows an atlas download beyond 15s to complete without leaving a deadline or handlers", async () => {
  const f = fixture();
  f.setManual(true);
  vi.useFakeTimers();
  const controller = new AbortController();
  const removeAbort = vi.spyOn(controller.signal, "removeEventListener");
  const request = decodeAtlasImage(
    "/classic-atlas/slow.png",
    controller.signal,
  );
  const settled = vi.fn();
  void request.then(settled, settled);
  await vi.advanceTimersByTimeAsync(22_000);
  expect(settled).not.toHaveBeenCalled();
  expect(f.images[0].decode).not.toHaveBeenCalled();
  await f.complete();
  await expect(request).resolves.toBe(f.images[0]);
  expect(f.images[0].src).toBe("/classic-atlas/slow.png");
  expect(f.images[0].onload).toBeNull();
  expect(f.images[0].onerror).toBeNull();
  expect(removeAbort).toHaveBeenCalledWith("abort", expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);
});

it("shares identical atlas pixels while retaining each alias's fractional logical registration", async () => {
  const art = structuredClone(source),
    raster = structuredClone(atlas);
  const normal = art.characters.toaster.body.normal[0];
  const alias = art.characters.toaster.body.forward[0];
  expect(art.files[normal.path]).toBe(art.files[alias.path]);
  alias.x += 7;
  alias.y -= 9;
  alias.width += 0.001;
  alias.height += 0.001;
  const bytes = JSON.stringify(art);
  raster.sourceManifestSha256 = createHash("sha256")
    .update(bytes)
    .digest("hex");
  const f = fixture(raster, bytes);
  await f.renderer.load();
  const state = stateFor("toaster", "toaster");
  state.players.left.bodyFrame = "normal";
  state.players.right.bodyFrame = "forward";
  await f.renderer.prepare(view, state, undefined, () => {});
  f.renderer.render(view, state);
  const first = one(normal.path),
    second = one(alias.path);
  expect(first.texture).toBe(second.texture);
  const baked = raster.variants.hd.frames[alias.path],
    trim = baked.fragments[0].trim;
  const position = second.toGlobal({ x: 0, y: 0 });
  expect(position.x).toBeCloseTo(
    view.offsetX +
      view.scale *
        (state.players.right.x -
          0.05 -
          1.25 * (alias.x + (trim.x * alias.width) / baked.pixelWidth)),
    8,
  );
  expect(position.y).toBeCloseTo(
    view.offsetY +
      view.scale *
        (state.players.right.y +
          1.25 * (alias.y + (trim.y * alias.height) / baked.pixelHeight)),
    8,
  );
  expect(second.scale.y / first.scale.y).toBeCloseTo(
    alias.height / normal.height,
    10,
  );
});

it("releases obsolete role/family sources exactly once while preserving shared court pages", async () => {
  const f = fixture();
  await f.renderer.load();
  await f.renderer.prepare(view, stateFor(), undefined, () => {});
  const uploaded = backend.upload.mock.calls.map(([page]) => ({
    page,
    destroyed: vi.spyOn(page, "destroy"),
  }));
  await f.renderer.prepare(view, stateFor("joe", "joe"), undefined, () => {});
  for (const { page, destroyed } of uploaded) {
    const obsolete = /body-pirate|body-toaster|swing-toaster/.test(page.label);
    expect(destroyed).toHaveBeenCalledTimes(obsolete ? 1 : 0);
  }
  f.renderer.destroy();
  for (const { destroyed } of uploaded)
    expect(destroyed).toHaveBeenCalledTimes(1);
});

it("renders a confetti shader warmup under the loading cover before any result particle exists", async () => {
  const f = fixture();
  await f.renderer.load();
  const seen: boolean[] = [];
  backend.render.mockImplementation(
    ({ container }: { container: Container }) => {
      const world = container.children[0].children.find(
        (node) => node.label === "world:confetti",
      )!;
      seen.push(
        world.children.some((node) => node instanceof Mesh && node.visible),
      );
    },
  );
  await f.renderer.prepare(view, stateFor(), undefined, () => {});
  expect(seen).toEqual([true]);
  expect(f.renderer.diagnostics().confetti.particles).toBe(0);
  f.renderer.render(view, stateFor());
  expect(seen).toEqual([true, false]);
});

it.each(["download", "decode"])(
  "bounds the combined atlas download/decode while %s is pending and suppresses late completion",
  async (phase) => {
    const f = fixture();
    f.setManual(true);
    vi.useFakeTimers();
    const controller = new AbortController();
    const removeAbort = vi.spyOn(controller.signal, "removeEventListener");
    const request = decodeAtlasImage(
      "/classic-atlas/pending.png",
      controller.signal,
    );
    const settled = vi.fn();
    void request.then(settled, settled);
    let decoded: (() => void) | undefined;
    await vi.advanceTimersByTimeAsync(22_000);
    if (phase === "decode") {
      f.images[0].decode.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            decoded = resolve;
          }),
      );
      await f.complete();
    }
    const rejection = expect(request).rejects.toMatchObject({
      stage: "images",
      reason: "timeout",
    });
    await vi.advanceTimersByTimeAsync(ATLAS_IMAGE_TIMEOUT_MS - 22_000 - 1);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
    expect(removeAbort).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(f.images[0].onload).toBeNull();
    expect(f.images[0].onerror).toBeNull();
    expect(f.images[0].src).toBe("");
    decoded?.();
    await f.complete();
    expect(settled).toHaveBeenCalledTimes(1);
    expect(f.images[0].src).toBe("");
  },
);

it("retains unchanged idle pixels across snapshot copies without suppressing mutable actor/frame changes", async () => {
  const f = fixture();
  await f.renderer.load();
  const state = stateFor();
  await f.renderer.prepare(view, state, undefined, () => {});
  f.renderer.render(view, state);
  const draws = backend.render.mock.calls.length;
  for (let tick = 1; tick <= 40; tick++) {
    const copy = structuredClone(state);
    copy.elapsed = tick / 60; // The renderer does not own or consume this clock.
    f.renderer.render({ ...view }, copy);
  }
  expect(backend.render).toHaveBeenCalledTimes(draws);
  expect(f.renderer.diagnostics().staticFramesSkipped).toBe(40);
  const bodyPath = source.characters.pirate.body.normal[0].path;
  const origin = one(bodyPath).toGlobal({ x: 0, y: 0 });
  state.players.left.x += 5;
  f.renderer.render(view, state);
  expect(backend.render).toHaveBeenCalledTimes(draws + 1);
  expect(one(bodyPath).toGlobal({ x: 0, y: 0 }).x - origin.x).toBeCloseTo(
    5 * view.scale,
    8,
  );

  const changes: Array<() => void> = [
    () => {
      state.players.left.y -= 4;
    },
    () => {
      state.players.left.swingKind = "overhead";
    },
    () => {
      state.players.left.swingFrame = 7;
    },
    () => {
      state.players.left.bodyFrame = "forward";
    },
    () => {
      state.players.left.bodyFrameIndex = 4;
    },
    () => {
      state.players.right.x -= 3;
    },
    () => {
      state.players.right.y -= 2;
    },
    () => {
      state.players.right.swingKind = "underhand";
    },
    () => {
      state.players.right.swingFrame = 9;
    },
    () => {
      state.players.right.bodyFrame = "backward";
    },
    () => {
      state.players.right.bodyFrameIndex = 2;
    },
    () => {
      state.net.frame = 3;
    },
    () => {
      state.score.left = 1;
    },
    () => {
      state.score.right = 2;
    },
    () => {
      state.shuttle.state = "flying";
    },
    () => {
      state.shuttle.x += 11;
    },
    () => {
      state.shuttle.y -= 7;
    },
    () => {
      state.shuttle.rotation = 31;
    },
    () => {
      state.phase = "matchEnd";
      state.winner = "left";
    },
  ];
  for (const change of changes) {
    const count = backend.render.mock.calls.length;
    change();
    f.renderer.render(view, state);
    expect(backend.render).toHaveBeenCalledTimes(count + 1);
    f.renderer.render(view, state);
    expect(backend.render).toHaveBeenCalledTimes(count + 1);
  }
});

it("redraws static courts for every viewport component, reflection, backing resize and scene preparation", async () => {
  const f = fixture();
  await f.renderer.load();
  const state = stateFor();
  await f.renderer.prepare(view, state, undefined, () => {});
  let changed = { ...view };
  f.renderer.render(changed, state);
  for (const key of [
    "width",
    "height",
    "scale",
    "offsetX",
    "offsetY",
    "dpr",
  ] as const) {
    const count = backend.render.mock.calls.length;
    changed = { ...changed, [key]: changed[key] + 0.1 };
    f.renderer.render(changed, state);
    expect(backend.render).toHaveBeenCalledTimes(count + 1);
  }
  const beforeMirror = backend.render.mock.calls.length;
  f.renderer.render(changed, state, undefined, true);
  expect(backend.render).toHaveBeenCalledTimes(beforeMirror + 1);
  expect(
    one(source.courtBrand.path).toGlobal({ x: 1, y: 0 }).x,
  ).toBeGreaterThan(one(source.courtBrand.path).toGlobal({ x: 0, y: 0 }).x);
  // A direct backend resize clears its pixels even if the next draw returns to
  // the previous view/signature. Retaining that signature would leave it blank.
  f.renderer.resize({ ...changed, width: changed.width + 10 });
  f.renderer.render(changed, state, undefined, true);
  expect(backend.render).toHaveBeenCalledTimes(beforeMirror + 2);
  f.renderer.clearEffectsImages();
  await f.renderer.prepare(changed, state, undefined, () => {}, true);
  const prepared = backend.render.mock.calls.length;
  f.renderer.render(changed, state, undefined, true);
  expect(backend.render).toHaveBeenCalledTimes(prepared + 1);
  f.renderer.invalidateFrame();
  f.renderer.render(changed, state, undefined, true);
  expect(backend.render).toHaveBeenCalledTimes(prepared + 2);
  f.renderer.render(changed, state, undefined, true);
  expect(backend.render).toHaveBeenCalledTimes(prepared + 2);
});

it("always draws Effects presentations and removes their final pixels before retaining the next idle court", async () => {
  const f = fixture();
  await f.renderer.load();
  const state = stateFor();
  await f.renderer.prepare(view, state, undefined, () => {});
  f.renderer.render(view, state);
  const count = backend.render.mock.calls.length;
  const effects = new Effects();
  effects.particles.push(createParticle("tail", 300, 150, () => 0.3));
  for (let frame = 0; frame < 4; frame++)
    f.renderer.render(view, state, effects);
  expect(backend.render).toHaveBeenCalledTimes(count + 4);
  expect(sprites().map((node) => node.label)).toContain(
    source.effects.tail.frames[0].path,
  );
  f.renderer.render(view, state);
  expect(backend.render).toHaveBeenCalledTimes(count + 5);
  expect(sprites().map((node) => node.label)).not.toContain(
    source.effects.tail.frames[0].path,
  );
  f.renderer.render(view, state);
  expect(backend.render).toHaveBeenCalledTimes(count + 5);
});

it.each([
  { ...view },
  {
    width: 811.7,
    height: 613.3,
    scale: 0.87,
    offsetX: 31.2,
    offsetY: 7.35,
    dpr: 1.375,
  },
  { width: 700, height: 500, scale: 0.5, offsetX: 0.5, offsetY: 0.5, dpr: 1 },
  {
    width: 400,
    height: 250,
    scale: 0.9,
    offsetX: -20.25,
    offsetY: -40.75,
    dpr: 1.25,
  },
  {
    width: 400,
    height: 250,
    scale: 0.9,
    offsetX: 800,
    offsetY: 500,
    dpr: 1.25,
  },
])(
  "clips exactly the framebuffer centers inside a fractional reflected-or-ordinary court %#",
  (viewport) => {
    const width = Math.round(viewport.width * viewport.dpr),
      height = Math.round(viewport.height * viewport.dpr);
    const clip = courtScissor(viewport, width, height);
    const left = viewport.offsetX * viewport.dpr;
    const right = (viewport.offsetX + 640 * viewport.scale) * viewport.dpr;
    const bottom =
      height - (viewport.offsetY + 426 * viewport.scale) * viewport.dpr;
    const top = height - viewport.offsetY * viewport.dpr;
    for (let x = 0; x < width; x++)
      expect(x >= clip.x && x < clip.x + clip.width).toBe(
        x + 0.5 >= left && x + 0.5 < right,
      );
    for (let y = 0; y < height; y++)
      expect(y >= clip.y && y < clip.y + clip.height).toBe(
        y + 0.5 >= bottom && y + 0.5 < top,
      );
    expect(clip.x).toBeGreaterThanOrEqual(0);
    expect(clip.y).toBeGreaterThanOrEqual(0);
    expect(clip.x + clip.width).toBeLessThanOrEqual(width);
    expect(clip.y + clip.height).toBeLessThanOrEqual(height);
  },
);

it("clears the whole root before enabling scissor and restores disabled GL state after a rendering error", async () => {
  const f = fixture();
  await f.renderer.load();
  const state = stateFor();
  await f.renderer.prepare(view, state, undefined, () => {});
  const events: string[] = [];
  backend.disable.mockImplementation(() => events.push("disable"));
  backend.bind.mockImplementation(() => events.push("clear-root"));
  backend.enable.mockImplementation(() => events.push("enable"));
  backend.scissor.mockImplementation(() => events.push("clip"));
  backend.render.mockImplementation(() => {
    events.push("draw");
    throw new Error("context render error");
  });
  f.renderer.invalidateFrame();
  expect(() => f.renderer.render(view, state)).toThrow("context render error");
  expect(events).toEqual([
    "disable",
    "clear-root",
    "enable",
    "clip",
    "draw",
    "disable",
  ]);
  expect(backend.bind.mock.calls.at(-1)![0]).toMatchObject({
    clear: true,
    clearColor: [16 / 255, 23 / 255, 34 / 255, 1],
  });
  expect(backend.render.mock.calls.at(-1)![0]).toMatchObject({ clear: false });
  expect(backend.bind.mock.calls.at(-1)![0].target).toBe(
    backend.render.mock.calls.at(-1)![0].target,
  );
  const clip = courtScissor(view, 2000, 1400);
  expect(backend.scissor).toHaveBeenLastCalledWith(
    clip.x,
    clip.y,
    clip.width,
    clip.height,
  );
  backend.render.mockImplementation(() => events.push("draw"));
  f.renderer.render(view, state);
  expect(events.slice(-6)).toEqual([
    "disable",
    "clear-root",
    "enable",
    "clip",
    "draw",
    "disable",
  ]);
});
