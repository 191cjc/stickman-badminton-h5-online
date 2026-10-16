import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import type { AssetManifest } from "../src/shared/classic/manifest";
import { Simulation } from "../src/shared/simulation";
import { Renderer } from "../src/client/renderer";
import { Effects, createParticle } from "../src/client/effects";
import type { LoadingProgress } from "../src/client/loading";
import type { Viewport } from "../src/shared/types";

const manifest = JSON.parse(
  readFileSync("public/classic/manifest.json", "utf8"),
) as AssetManifest;
const view: Viewport = {
  width: 960,
  height: 639,
  scale: 1.5,
  offsetX: 0,
  offsetY: 0,
  dpr: 2,
};
function fixture(art = manifest) {
  const events: string[] = [];
  const urls: string[] = [];
  const canvases: HTMLCanvasElement[] = [];
  const flushes = vi.fn(() => {
    events.push("flush");
    return {} as ImageData;
  });
  const rasters: Array<{ src: string; width: number; height: number }> = [];
  class ImageStub {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private url = "";
    set src(value: string) {
      this.url = value;
      urls.push(value);
      queueMicrotask(() => this.onload?.());
    }
    get src() {
      return this.url;
    }
    removeAttribute() {
      this.url = "";
    }
  }
  vi.stubGlobal("Image", ImageStub);
  vi.stubGlobal("fetch", (url: string) =>
    Promise.resolve(
      new Response(
        url.endsWith("manifest.json")
          ? JSON.stringify(art)
          : readFileSync(
              `public/classic/${manifest.effects.confetti.frames[0].path}`,
              "utf8",
            ),
      ),
    ),
  );
  vi.stubGlobal("document", {
    createElement: () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: (
            image: HTMLImageElement,
            _x: number,
            _y: number,
            width: number,
            height: number,
          ) => {
            events.push("raster");
            rasters.push({ src: image.src, width, height });
          },
          getImageData: flushes,
        }),
      } as unknown as HTMLCanvasElement;
      canvases.push(canvas);
      return canvas;
    },
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queueMicrotask(() => {
      events.push("frame");
      callback(0);
    });
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  return { events, rasters, flushes, canvases, urls };
}
function drawContext(viewport: Viewport) {
  const stack: Array<[number, number]> = [];
  let a = viewport.dpr,
    d = viewport.dpr;
  return {
    save: () => stack.push([a, d]),
    restore: () => {
      [a, d] = stack.pop()!;
    },
    scale: (x: number, y: number) => {
      a *= x;
      d *= y;
    },
    getTransform: () => ({ a, b: 0, c: 0, d }),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    rotate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}
afterEach(() => vi.unstubAllGlobals());

it("loads original hashed SVGs then prepares only current draw frames, yielding and flushing before readiness", async () => {
  const { events, rasters, flushes } = fixture();
  const renderer = new Renderer();
  const progress: LoadingProgress[] = [];
  await renderer.load((item) => progress.push(item));
  const loading = progress.filter((item) => item.stage === "images");
  const svgCount = Object.keys(manifest.files).filter((p) =>
    p.endsWith(".svg"),
  ).length;
  expect(loading.map((item) => item.completed)).toEqual(
    Array.from({ length: svgCount + 1 }, (_, i) => i),
  );
  expect(rasters).toHaveLength(0);
  const state = new Simulation({
    characters: { left: "pirate", right: "toaster" },
  }).snapshot();
  expect(
    await renderer.prepare(view, state, undefined, (item) => {
      progress.push(item);
      events.push(`progress:${item.completed}`);
    }),
  ).toBe(true);
  const prepared = progress.filter((item) => item.stage === "prewarm");
  const total = prepared[0].total!;
  expect(total).toBeLessThanOrEqual(10);
  expect(prepared.map((item) => item.completed)).toEqual(
    Array.from({ length: total + 1 }, (_, i) => i),
  );
  expect(rasters).toHaveLength(total);
  expect(flushes).toHaveBeenCalledTimes(total);
  expect(flushes.mock.calls.every((call) => call.join(",") === "0,0,1,1")).toBe(
    true,
  );
  for (let i = 0; i < total; i++)
    expect(events.slice(i * 4 + 1, i * 4 + 5)).toEqual([
      "frame",
      "raster",
      "flush",
      `progress:${i + 1}`,
    ]);
  expect(events.at(-1)).toBe("frame");
  const before = renderer.diagnostics().raster;
  renderer.render(drawContext(view), view, state);
  expect(renderer.diagnostics().raster.misses).toBe(before.misses);
  expect(renderer.diagnostics().raster.bytes).toBeLessThanOrEqual(
    64 * 1024 * 1024,
  );
  expect(renderer.diagnostics().confettiRaster.limits.bytes).toBe(
    32 * 1024 * 1024,
  );
  expect(rasters.every((item) => item.src.includes("?v="))).toBe(true);
});
it("deduplicates equal actor frames and does not prepare a separately attached shuttle", async () => {
  const { rasters } = fixture();
  const renderer = new Renderer();
  await renderer.load();
  const state = new Simulation().snapshot();
  await renderer.prepare(view, state, undefined, () => {});
  expect(
    rasters.filter((item) => item.src.includes("body/joe/normal-01.svg")),
  ).toHaveLength(1);
  expect(rasters.some((item) => item.src.includes(manifest.shuttle.path))).toBe(
    false,
  );
  const misses = renderer.diagnostics().raster.misses;
  await renderer.prepare(view, state, undefined, () => {});
  expect(renderer.diagnostics().raster.misses).toBe(misses);
});
it("a scene reset during an awaited batch cancels preparation without reporting ready; a fresh scene prepares normally", async () => {
  const { rasters, canvases } = fixture();
  const renderer = new Renderer();
  await renderer.load();
  const state = new Simulation().snapshot();
  const progress: LoadingProgress[] = [];
  const result = renderer.prepare(view, state, undefined, (item) => {
    progress.push(item);
    if (item.completed === 1) renderer.clearEffectsImages();
  });
  expect(await result).toBe(false);
  expect(progress.map((item) => item.completed)).toEqual([0, 1]);
  expect(rasters).toHaveLength(1);
  expect(canvases[0].width).toBe(0);
  expect(renderer.diagnostics().raster.bytes).toBe(0);
  expect(await renderer.prepare(view, state, undefined, () => {})).toBe(true);
});
it("rejects incompatible manifest data before any image workers begin", async () => {
  fixture();
  const image = vi.fn();
  vi.stubGlobal("Image", image);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("null")));
  await expect(new Renderer().load()).rejects.toMatchObject({
    stage: "manifest",
    reason: "incompatible",
  });
  expect(image).not.toHaveBeenCalled();
});

it("shares byte-identical source paths in preparation and draw while retaining each alias's destination", async () => {
  const art = structuredClone(manifest);
  const normal = art.characters.toaster.body.normal[0];
  const alias = art.characters.toaster.body.forward[0];
  expect(alias.path).not.toBe(normal.path);
  expect(art.files[alias.path]).toBe(art.files[normal.path]);
  expect(readFileSync(`public/classic/${alias.path}`)).toEqual(
    readFileSync(`public/classic/${normal.path}`),
  );
  // Registration is metadata, independent of identical image bytes/backings.
  alias.x += 7;
  alias.y -= 9;
  alias.width += 0.001;
  alias.height += 0.001;
  const { rasters } = fixture(art);
  const renderer = new Renderer();
  await renderer.load();
  const state = new Simulation({
    characters: { left: "toaster", right: "toaster" },
  }).snapshot();
  state.players.left.bodyFrame = "normal";
  state.players.right.bodyFrame = "forward";
  state.players.left.swingKind = state.players.right.swingKind = "serve";
  state.players.left.swingFrame = 1;
  state.players.right.swingFrame = 2;
  await renderer.prepare(view, state, undefined, () => {});
  expect(
    rasters.filter((item) => item.src.includes("body/toaster/")),
  ).toHaveLength(1);
  expect(
    rasters.filter((item) => item.src.includes("swings/toaster/serve-")),
  ).toHaveLength(1);
  const before = renderer.diagnostics().raster;
  const ctx = drawContext(view);
  renderer.render(ctx, view, state);
  const draws = vi.mocked(ctx.drawImage).mock.calls;
  const normalDraw = draws.find(
    (args) => args[1] === normal.x && args[2] === normal.y,
  )!;
  const aliasDraw = draws.find(
    (args) => args[1] === alias.x && args[2] === alias.y,
  )!;
  expect(normalDraw.slice(1)).toEqual([
    normal.x,
    normal.y,
    normal.width,
    normal.height,
  ]);
  expect(aliasDraw.slice(1)).toEqual([
    alias.x,
    alias.y,
    alias.width,
    alias.height,
  ]);
  expect(aliasDraw[0]).toBe(normalDraw[0]);
  expect(renderer.diagnostics().raster.misses).toBe(before.misses);
});

it("does not share distinct SVG hashes or backing sizes, and reset preserves preparation/draw identity", async () => {
  const { rasters } = fixture();
  const renderer = new Renderer();
  await renderer.load();
  const state = new Simulation().snapshot();
  state.net.frame = 1;
  await renderer.prepare(view, state, undefined, () => {});
  const first = renderer.diagnostics().raster.misses;
  state.net.frame = 2;
  renderer.render(drawContext(view), view, state);
  expect(renderer.diagnostics().raster.misses).toBe(first);
  state.net.frame = 3;
  renderer.render(drawContext(view), view, state);
  expect(renderer.diagnostics().raster.misses).toBe(first + 1);
  expect(manifest.files[manifest.netFrames[2].path]).not.toBe(
    manifest.files[manifest.netFrames[0].path],
  );
  const lowerView = { ...view, dpr: 0.7 };
  const beforeLower = renderer.diagnostics().raster.misses;
  await renderer.prepare(lowerView, state, undefined, () => {});
  expect(renderer.diagnostics().raster.misses).toBeGreaterThan(beforeLower);
  const afterPrepare = renderer.diagnostics().raster.misses;
  renderer.render(drawContext(lowerView), lowerView, state);
  expect(renderer.diagnostics().raster.misses).toBe(afterPrepare);
  renderer.clearEffectsImages();
  expect(renderer.diagnostics().raster.entries).toBe(0);
  await renderer.prepare(lowerView, state, undefined, () => {});
  const afterReset = renderer.diagnostics().raster.misses;
  renderer.render(drawContext(lowerView), lowerView, state);
  expect(renderer.diagnostics().raster.misses).toBe(afterReset);
  expect(rasters.every((item) => item.src.includes("?v="))).toBe(true);
});

it("raster-only invalidation releases both backing stores while retaining live color images and original effects", async () => {
  const { canvases, urls } = fixture();
  const renderer = new Renderer();
  await renderer.load();
  const state = new Simulation().snapshot();
  const effects = new Effects();
  const particle = createParticle("confetti", 100, 20, () => 0.3);
  effects.particles.push(
    particle,
    createParticle("tail", 100, 20, () => 0.3),
  );
  renderer.render(drawContext(view), view, state, effects);
  await Promise.resolve(); // Complete the original tinted SVG image's load.
  renderer.render(drawContext(view), view, state, effects);
  expect(renderer.diagnostics().confettiRaster.entries).toBe(1);
  expect(renderer.diagnostics().colors).toEqual({ cached: 1, pending: 0 });
  const images = urls.length;
  const particles = [...effects.particles];
  renderer.invalidateRasters();
  expect(renderer.diagnostics().raster.entries).toBe(0);
  expect(renderer.diagnostics().confettiRaster.entries).toBe(0);
  expect(
    canvases.every((canvas) => canvas.width === 0 && canvas.height === 0),
  ).toBe(true);
  expect(renderer.diagnostics().colors).toEqual({ cached: 1, pending: 0 });
  expect(effects.particles).toEqual(particles);
  renderer.render(drawContext(view), view, state, effects);
  expect(renderer.diagnostics().confettiRaster.entries).toBe(1);
  expect(urls).toHaveLength(images); // No source reload or color regeneration.
});

it("a raster-density invalidation cancels an in-flight preparation generation", async () => {
  fixture();
  const renderer = new Renderer();
  await renderer.load();
  expect(
    await renderer.prepare(
      view,
      new Simulation().snapshot(),
      undefined,
      (progress) => {
        if (progress.completed === 1) renderer.invalidateRasters();
      },
    ),
  ).toBe(false);
  expect(renderer.diagnostics().raster.entries).toBe(0);
});
