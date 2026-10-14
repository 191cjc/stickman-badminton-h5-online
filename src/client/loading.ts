export type LoadingStage = "manifest" | "images" | "confetti" | "prewarm";
export interface LoadingProgress {
  stage: LoadingStage;
  completed: number;
  total?: number;
}
export const IMAGE_LOAD_CONCURRENCY = 6;
export const ASSET_TIMEOUT_MS = 15_000;

export class LoadingError extends Error {
  constructor(
    readonly stage: LoadingStage,
    readonly reason: "timeout" | "request" | "incompatible" | "changed",
  ) {
    super(`loading_${stage}_${reason}`);
  }
}

/** Bound the entire request, including response body consumption. */
export async function fetchAsset<T>(
  url: string,
  read: (response: Response) => Promise<T>,
  stage: LoadingStage,
): Promise<T> {
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, ASSET_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new LoadingError(stage, "request");
    return await read(response);
  } catch (error) {
    if (error instanceof LoadingError) throw error;
    throw new LoadingError(stage, expired ? "timeout" : "request");
  } finally {
    clearTimeout(timer);
  }
}

/** Stop the whole batch on failure; late callbacks cannot update progress. */
export async function loadImages(
  sources: ReadonlyArray<{ path: string; url: string }>,
  onCount: (completed: number, total: number) => void,
): Promise<Map<string, HTMLImageElement>> {
  const images = new Map<string, HTMLImageElement>();
  const controller = new AbortController();
  let next = 0;
  onCount(0, sources.length);
  const worker = async () => {
    while (next < sources.length && !controller.signal.aborted) {
      const source = sources[next++];
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (error?: LoadingError) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          controller.signal.removeEventListener("abort", abort);
          image.onload = image.onerror = null;
          if (error) {
            image.removeAttribute("src");
            reject(error);
          } else resolve();
        };
        const abort = () => finish(new LoadingError("images", "request"));
        const timer = setTimeout(
          () => finish(new LoadingError("images", "timeout")),
          ASSET_TIMEOUT_MS,
        );
        controller.signal.addEventListener("abort", abort, { once: true });
        image.onload = () => finish();
        image.onerror = () => finish(new LoadingError("images", "request"));
        image.src = source.url;
      });
      if (controller.signal.aborted) return;
      images.set(source.path, image);
      onCount(images.size, sources.length);
    }
  };
  try {
    await Promise.all(
      Array.from(
        { length: Math.min(IMAGE_LOAD_CONCURRENCY, sources.length) },
        worker,
      ),
    );
    return images;
  } catch (error) {
    controller.abort();
    throw error;
  }
}

/** Run the next raster job after a paint opportunity, including hidden tabs. */
export function yieldForPaint(): Promise<void> {
  return new Promise((resolve) => {
    let task: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      cancelAnimationFrame(frame);
      clearTimeout(fallback);
      if (task !== undefined) clearTimeout(task);
      resolve();
    };
    const frame = requestAnimationFrame(() => {
      task = setTimeout(finish, 0);
    });
    // Background tabs may suspend RAF. This is a scheduler fallback, not a
    // fabricated loading duration; visible pages use the next paint normally.
    const fallback = setTimeout(finish, 50);
  });
}
