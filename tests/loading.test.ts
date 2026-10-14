import { afterEach, expect, it, vi } from "vitest";
import {
  ASSET_TIMEOUT_MS,
  IMAGE_LOAD_CONCURRENCY,
  fetchAsset,
  loadImages,
  yieldForPaint,
} from "../src/client/loading";

class ImageStub {
  static made: ImageStub[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  constructor() {
    ImageStub.made.push(this);
  }
  removeAttribute() {
    this.src = "";
  }
}
function imageBatch(length: number) {
  ImageStub.made = [];
  vi.stubGlobal("Image", ImageStub);
  const sources = Array.from({ length }, (_, i) => ({
    path: `${i}.svg`,
    url: `/base/${i}.svg?v=original`,
  }));
  const count = vi.fn();
  return { result: loadImages(sources, count), count, sources };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("loads at most six images concurrently and counts actual out-of-order completion exactly once", async () => {
  const { result, count, sources } = imageBatch(17);
  expect(ImageStub.made).toHaveLength(IMAGE_LOAD_CONCURRENCY);
  expect(count.mock.calls).toEqual([[0, 17]]);
  let completed = 0;
  while (completed < sources.length) {
    const pending = ImageStub.made.filter((image) => image.onload !== null);
    expect(pending.length).toBeLessThanOrEqual(IMAGE_LOAD_CONCURRENCY);
    // Reverse order demonstrates completion progress is not the source index.
    for (const image of pending.reverse()) {
      const callback = image.onload!;
      callback();
      callback();
      completed++;
    }
    await Promise.resolve();
  }
  const images = await result;
  expect(images.size).toBe(17);
  expect(count.mock.calls).toEqual(
    Array.from({ length: 18 }, (_, i) => [i, 17]),
  );
  for (const source of sources)
    expect(images.get(source.path)?.src).toBe(source.url);
});
it("an image error aborts pending workers and late callbacks cannot revive progress", async () => {
  const { result, count } = imageBatch(17);
  const rejected = expect(result).rejects.toMatchObject({
    stage: "images",
    reason: "request",
  });
  const late = ImageStub.made[1].onload!;
  ImageStub.made[0].onerror!();
  await rejected;
  late();
  expect(ImageStub.made).toHaveLength(IMAGE_LOAD_CONCURRENCY);
  expect(ImageStub.made.every((image) => image.src === "")).toBe(true);
  expect(count.mock.calls).toEqual([[0, 17]]);
});
it("a never-firing image fails within the bounded timeout and releases all outstanding image handlers", async () => {
  vi.useFakeTimers();
  const { result, count } = imageBatch(17);
  const rejected = expect(result).rejects.toMatchObject({
    stage: "images",
    reason: "timeout",
  });
  await vi.advanceTimersByTimeAsync(ASSET_TIMEOUT_MS);
  await rejected;
  expect(ImageStub.made.every((image) => !image.onload && !image.onerror)).toBe(
    true,
  );
  expect(count.mock.calls).toEqual([[0, 17]]);
  expect(vi.getTimerCount()).toBe(0);
});
it("a successful manifest read clears its timer; HTTP failure is categorized", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response('{"ok":true}')),
  );
  expect(await fetchAsset("/manifest", (r) => r.json(), "manifest")).toEqual({
    ok: true,
  });
  expect(vi.getTimerCount()).toBe(0);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 404 })),
  );
  await expect(
    fetchAsset("/manifest", (r) => r.json(), "manifest"),
  ).rejects.toMatchObject({
    stage: "manifest",
    reason: "request",
  });
  expect(vi.getTimerCount()).toBe(0);
});
it("the manifest timeout includes a response body that never finishes", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", (_url: string, options: RequestInit) => {
    const body = new ReadableStream({
      start(stream) {
        options.signal!.addEventListener("abort", () =>
          stream.error(new DOMException("aborted", "AbortError")),
        );
      },
    });
    return Promise.resolve(new Response(body));
  });
  const result = fetchAsset("/manifest", (r) => r.json(), "manifest");
  const rejected = expect(result).rejects.toMatchObject({
    stage: "manifest",
    reason: "timeout",
  });
  await vi.advanceTimersByTimeAsync(ASSET_TIMEOUT_MS);
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});
it("raster work yields to a frame and its following task, with a bounded fallback for suspended RAF", async () => {
  vi.useFakeTimers();
  let frame: FrameRequestCallback | undefined;
  const cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 42;
  });
  vi.stubGlobal("cancelAnimationFrame", cancel);
  const ready = vi.fn();
  const result = yieldForPaint().then(ready);
  await Promise.resolve();
  expect(ready).not.toHaveBeenCalled();
  frame!(16);
  await Promise.resolve();
  expect(ready).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(0);
  await result;
  expect(ready).toHaveBeenCalledOnce();
  expect(cancel).toHaveBeenCalledWith(42);
  expect(vi.getTimerCount()).toBe(0);
  const hidden = yieldForPaint();
  await vi.advanceTimersByTimeAsync(50);
  await hidden;
  expect(vi.getTimerCount()).toBe(0);
});
