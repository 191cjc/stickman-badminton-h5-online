/** Rasterize the unchanged SVG (including its filters) once per device-scale bucket.
 * Destination registration/dimensions remain the source DrawFrame's, independent
 * of the integer backing dimensions. No image/URL is retained outside this LRU. */
export const RASTER_LIMITS = {
  entries: 256,
  bytes: 64 * 1024 * 1024,
  entryBytes: 24 * 1024 * 1024,
  side: 4096,
  minScale: 0.25,
  maxScale: 4,
};
export function deviceRasterScale(
  matrix: Pick<DOMMatrixReadOnly, "a" | "b" | "c" | "d">,
): number {
  return Math.max(
    Math.hypot(matrix.a, matrix.b),
    Math.hypot(matrix.c, matrix.d),
  );
}
export function rasterPlan(width: number, height: number, scale: number) {
  if (
    ![width, height, scale].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    return;
  const bucket = Math.min(
    RASTER_LIMITS.maxScale,
    RASTER_LIMITS.minScale *
      2 **
        (Math.ceil(
          Math.log2(
            Math.max(scale, RASTER_LIMITS.minScale) / RASTER_LIMITS.minScale,
          ) * 2,
        ) /
          2),
  );
  const density = Math.min(
    bucket,
    RASTER_LIMITS.side / width,
    RASTER_LIMITS.side / height,
    Math.sqrt(RASTER_LIMITS.entryBytes / (4 * width * height)),
  );
  // floor keeps both the pixel-byte and side limits strict, including huge SVGs.
  const pixelWidth = Math.max(1, Math.floor(width * density));
  const pixelHeight = Math.max(1, Math.floor(height * density));
  return {
    width: pixelWidth,
    height: pixelHeight,
    bytes: pixelWidth * pixelHeight * 4,
  };
}
interface Entry {
  canvas: HTMLCanvasElement;
  bytes: number;
  prepared?: boolean;
}
export class RasterCache {
  private entries = new Map<string, Entry>();
  private bytes = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private failures = 0;
  private failed = new Set<string>();
  constructor(
    private readonly createCanvas = () => document.createElement("canvas"),
    private readonly limits = {
      entries: RASTER_LIMITS.entries,
      bytes: RASTER_LIMITS.bytes,
    },
  ) {}
  get(
    key: string,
    image: CanvasImageSource,
    width: number,
    height: number,
    scale: number,
  ): CanvasImageSource {
    const plan = rasterPlan(width, height, scale);
    if (!plan) return image;
    const id = `${key}:${plan.width}x${plan.height}`;
    const entry = this.entries.get(id);
    if (entry) {
      this.hits++;
      this.entries.delete(id);
      this.entries.set(id, entry);
      return entry.canvas;
    }
    if (this.failed.has(id)) return image;
    this.misses++;
    // An exceptional browser allocation failure preserves the original art. Do
    // not retry that failed allocation every frame or retain an unbounded set.
    if (plan.bytes > this.limits.bytes || this.limits.entries < 1) return image;
    while (
      this.entries.size >= this.limits.entries ||
      this.bytes + plan.bytes > this.limits.bytes
    )
      this.evict();
    let canvas: HTMLCanvasElement | undefined;
    try {
      canvas = this.createCanvas();
      canvas.width = plan.width;
      canvas.height = plan.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("raster_context_missing");
      ctx.drawImage(image, 0, 0, plan.width, plan.height);
      this.entries.set(id, { canvas, bytes: plan.bytes });
      this.bytes += plan.bytes;
      return canvas;
    } catch {
      if (canvas) canvas.width = canvas.height = 0;
      this.failures++;
      this.failed.add(id);
      if (this.failed.size > this.limits.entries)
        this.failed.delete(this.failed.values().next().value!);
      return image;
    }
  }
  /** Flush deferred SVG/filter drawing before the loading cover is removed. */
  prepare(
    key: string,
    image: CanvasImageSource,
    width: number,
    height: number,
    scale: number,
  ): void {
    this.get(key, image, width, height, scale);
    const plan = rasterPlan(width, height, scale);
    if (!plan) return;
    const id = `${key}:${plan.width}x${plan.height}`;
    const entry = this.entries.get(id);
    if (!entry || entry.prepared) return;
    try {
      // A read synchronizes this backing canvas's drawing queue. Reading one
      // pixel avoids retaining a second full-size RGBA allocation.
      entry.canvas.getContext("2d")!.getImageData(0, 0, 1, 1);
      entry.prepared = true;
    } catch {
      this.entries.delete(id);
      this.bytes -= entry.bytes;
      entry.canvas.width = entry.canvas.height = 0;
      this.failures++;
      this.failed.add(id);
      if (this.failed.size > this.limits.entries)
        this.failed.delete(this.failed.values().next().value!);
    }
  }
  private evict(): void {
    const key = this.entries.keys().next().value!;
    const entry = this.entries.get(key)!;
    this.entries.delete(key);
    this.bytes -= entry.bytes;
    entry.canvas.width = entry.canvas.height = 0;
    this.evictions++;
  }
  clear(): void {
    while (this.entries.size) this.evict();
    this.failed.clear();
  }
  diagnostics() {
    return {
      entries: this.entries.size,
      bytes: this.bytes,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      failures: this.failures,
      limits: { ...RASTER_LIMITS, ...this.limits },
    };
  }
}
