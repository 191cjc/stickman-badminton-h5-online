import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import type { AssetManifest } from "../src/shared/classic/manifest";
import { Simulation } from "../src/shared/simulation";
import { Renderer } from "../src/client/renderer";
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
function fixture() {
  const events: string[] = [];
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
          ? JSON.stringify(manifest)
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
  return { events, rasters, flushes, canvases };
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
