import { expect, it, vi } from "vitest";
import {
  deviceRasterScale,
  RasterCache,
  RASTER_LIMITS,
  rasterPlan,
} from "../src/client/raster-cache";
import { drawCachedFrame } from "../src/client/renderer";

function canvases() {
  const drawn: unknown[][] = [];
  const made: HTMLCanvasElement[] = [];
  const create = () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: (...args: unknown[]) => drawn.push(args),
      }),
    } as unknown as HTMLCanvasElement;
    made.push(canvas);
    return canvas;
  };
  return { create, made, drawn };
}
it("cached draws preserve the source registration and filtered padding through mirroring/rotation", () => {
  const factory = canvases();
  const cache = new RasterCache(factory.create);
  const drawImage = vi.fn();
  const ctx = {
    drawImage,
    getTransform: () => ({ a: 0, b: -2.5, c: 2.5, d: 0 }),
  } as unknown as CanvasRenderingContext2D;
  const image = {} as HTMLImageElement;
  const frame = {
    path: "filtered-body",
    x: -24.05,
    y: -20.75,
    width: 48.1,
    height: 41.55,
    filterPadding: 14,
  };
  drawCachedFrame(ctx, frame, image, cache);
  drawCachedFrame(ctx, frame, image, cache);
  expect(factory.drawn).toHaveLength(1);
  expect(drawImage).toHaveBeenNthCalledWith(
    1,
    factory.made[0],
    -24.05,
    -20.75,
    48.1,
    41.55,
  );
  expect(drawImage.mock.calls[1]).toEqual(drawImage.mock.calls[0]);
  expect(frame.filterPadding).toBe(14);
});
it("reuses the actual filtered image raster within a bucket and chooses a new raster after a scale boundary", () => {
  const factory = canvases();
  const cache = new RasterCache(factory.create);
  const image = { src: "unchanged-filtered.svg" } as HTMLImageElement;
  const first = cache.get("original", image, 100, 80, 1.02);
  expect(cache.get("original", image, 100, 80, 1.1)).toBe(first);
  expect(factory.drawn).toHaveLength(1);
  expect(factory.drawn[0][0]).toBe(image);
  expect(image.src).toBe("unchanged-filtered.svg");
  const resized = cache.get("original", image, 100, 80, 1.6);
  expect(resized).not.toBe(first);
  expect(factory.drawn).toHaveLength(2);
  expect(cache.diagnostics().hits).toBe(1);
});
it("rotation, mirroring and player scale preserve device density; extreme source bounds lower density instead of allocating unbounded canvases", () => {
  const s = 3.25;
  expect(deviceRasterScale({ a: -s, b: 0, c: 0, d: s })).toBe(s);
  expect(deviceRasterScale({ a: 0, b: -s, c: s, d: 0 })).toBe(s);
  expect(rasterPlan(100, 80, 0.101)).toEqual(rasterPlan(100, 80, 0.2));
  for (const [width, height] of [
    [870.6, 580.95],
    [1e8, 1],
    [1, 1e8],
    [1e8, 1e8],
  ]) {
    const plan = rasterPlan(width, height, 100)!;
    expect(plan.width).toBeLessThanOrEqual(RASTER_LIMITS.side);
    expect(plan.height).toBeLessThanOrEqual(RASTER_LIMITS.side);
    expect(plan.bytes).toBeLessThanOrEqual(RASTER_LIMITS.entryBytes);
    expect(plan.width).toBeGreaterThan(0);
  }
  expect(rasterPlan(Number.NaN, 10, 1)).toBeUndefined();
});
it("LRU eviction enforces both limits and releases backing stores; clear drops old scale/color resources", () => {
  const factory = canvases();
  const cache = new RasterCache(factory.create, { entries: 2, bytes: 1000 });
  const image = {} as HTMLImageElement;
  const a = cache.get("a", image, 10, 10, 1) as HTMLCanvasElement;
  const b = cache.get("b", image, 10, 10, 1) as HTMLCanvasElement;
  cache.get("a", image, 10, 10, 1);
  cache.get("c", image, 10, 10, 1);
  expect(a.width).toBe(10);
  expect(b.width).toBe(0);
  expect(cache.diagnostics().bytes).toBe(800);
  cache.get("large", image, 15, 15, 1);
  expect(cache.diagnostics().entries).toBe(1);
  expect(cache.diagnostics().bytes).toBe(900);
  cache.clear();
  expect(cache.diagnostics().entries).toBe(0);
  expect(cache.diagnostics().bytes).toBe(0);
  expect(factory.made.every((c) => c.width === 0 && c.height === 0)).toBe(true);
  cache.get("a", image, 10, 10, 1);
  expect(cache.diagnostics().bytes).toBe(400);
});
it("failed allocations preserve original images without repeating expensive failures on every frame", () => {
  const create = vi.fn(() => {
    throw new Error("allocation");
  });
  const cache = new RasterCache(create);
  const image = {} as HTMLImageElement;
  for (let i = 0; i < 60; i++)
    expect(cache.get("source", image, 100, 100, 1)).toBe(image);
  expect(create).toHaveBeenCalledOnce();
  expect(cache.diagnostics().failures).toBe(1);
  cache.clear();
  cache.get("source", image, 100, 100, 1);
  expect(create).toHaveBeenCalledTimes(2);
});
it("preparation flushes a cached raster once and retains the original-image fallback when readback fails", () => {
  const flush = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: vi.fn(), getImageData: flush }),
  } as unknown as HTMLCanvasElement;
  const cache = new RasterCache(() => canvas);
  const image = {} as HTMLImageElement;
  cache.prepare("court", image, 100, 80, 2);
  cache.prepare("court", image, 100, 80, 2);
  expect(flush).toHaveBeenCalledExactlyOnceWith(0, 0, 1, 1);
  expect(cache.get("court", image, 100, 80, 2)).toBe(canvas);
  cache.clear();
  flush.mockImplementation(() => {
    throw new Error("readback");
  });
  cache.prepare("court", image, 100, 80, 2);
  expect(cache.diagnostics()).toMatchObject({
    entries: 0,
    bytes: 0,
    failures: 1,
  });
  expect(canvas.width).toBe(0);
  expect(cache.get("court", image, 100, 80, 2)).toBe(image);
});
it.each(["context", "draw"])(
  "a failed %s releases the temporary backing store and bounds remembered failures",
  (failure) => {
    const made: HTMLCanvasElement[] = [];
    const create = vi.fn(() => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () =>
          failure === "context"
            ? null
            : {
                drawImage: () => {
                  throw new Error("raster_failure");
                },
              },
      } as unknown as HTMLCanvasElement;
      made.push(canvas);
      return canvas;
    });
    const cache = new RasterCache(create, { entries: 2, bytes: 4096 });
    const source = {} as HTMLImageElement;
    for (const key of ["a", "b", "b", "c", "a"])
      expect(cache.get(key, source, 10, 10, 1)).toBe(source);
    // b was retained without a retry; adding c evicted a from the failure set.
    expect(create).toHaveBeenCalledTimes(4);
    expect(
      made.every((canvas) => canvas.width === 0 && canvas.height === 0),
    ).toBe(true);
    expect(cache.diagnostics()).toMatchObject({
      entries: 0,
      bytes: 0,
      failures: 4,
    });
  },
);
