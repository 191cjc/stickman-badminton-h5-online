import { ImageSource, Rectangle, Texture } from "pixi.js";
import { BASE_PATH } from "../shared/protocol";
import { ATLAS_ACTIVE_RGBA_LIMIT } from "./atlas-manifest";
import type { AssetManifest } from "../shared/classic/manifest";
import type { GameState } from "../shared/state";
import type {
  AtlasFrame,
  AtlasFragment,
  AtlasManifest,
  AtlasTier,
} from "./atlas-manifest";
import {
  IMAGE_LOAD_CONCURRENCY,
  LoadingError,
  yieldForPaint,
  type LoadingProgress,
} from "./loading";

export const ATLAS_RGBA_LIMIT = ATLAS_ACTIVE_RGBA_LIMIT;
// Large lossless atlas pages can exceed the generic 15s deadline on public links.
// Bound their combined download/decode separately; scene cancellation stays immediate.
export const ATLAS_IMAGE_TIMEOUT_MS = 60_000;
export interface AtlasTextureFragment {
  texture: Texture;
  fragment: AtlasFragment;
  frame: AtlasFrame;
}
interface LoadedPage {
  image: HTMLImageElement;
  source: ImageSource;
  textures: Map<string, Texture>;
  uploaded: boolean;
  bytes: number;
}

/** These are dependencies of the displayed pair, never of a snapshot tick. */
export function requiredAtlasGroups(
  source: AssetManifest,
  state: GameState,
): string[] {
  const groups = new Set(["court", "common"]);
  for (const player of Object.values(state.players)) {
    groups.add(`body-${player.characterId}`);
    groups.add(`swing-${source.characters[player.characterId].family}`);
  }
  return [...groups].sort();
}

/** Owns each decoded image, GPU source and rectangle view exactly once. */
export class AtlasLoader {
  private pages = new Map<string, LoadedPage>();
  private frameViews = new Map<string, AtlasTextureFragment[]>();
  private tier?: AtlasTier;
  private generation = 0;
  private controller?: AbortController;
  private desired: string[] = [];
  private disposed = false;
  private uploads = 0;
  private decodes = 0;
  constructor(readonly manifest: AtlasManifest) {}

  private pageIds(groups: readonly string[], tier: AtlasTier): string[] {
    const variant = this.manifest.variants[tier];
    return [
      ...new Set(
        groups.flatMap((group) => {
          const ids = variant.groups[group];
          if (!ids) throw new LoadingError("manifest", "incompatible");
          return ids;
        }),
      ),
    ].sort();
  }

  chooseTier(
    groups: readonly string[],
    density: number,
    maxTextureSize: number,
  ): AtlasTier {
    // Retain the first tier: resize/quality changes must not churn the working set.
    let tier = this.tier ?? (density > 2 ? "hd" : "sd");
    const fits = (candidate: AtlasTier) => {
      const variant = this.manifest.variants[candidate];
      const pages = this.pageIds(groups, candidate).map(
        (id) => variant.pages[id],
      );
      return (
        pages.every(
          (page) =>
            page.width <= maxTextureSize && page.height <= maxTextureSize,
        ) &&
        pages.reduce((sum, page) => sum + page.rgbaBytes, 0) <= ATLAS_RGBA_LIMIT
      );
    };
    if (!fits(tier)) tier = "sd";
    if (!fits(tier)) throw new LoadingError("images", "incompatible");
    return tier;
  }

  async prepare(
    groups: readonly string[],
    density: number,
    maxTextureSize: number,
    upload: (source: ImageSource) => void,
    onProgress: (p: LoadingProgress) => void,
  ): Promise<boolean> {
    this.cancel();
    if (this.disposed) return false;
    const generation = this.generation;
    const tier = this.chooseTier(groups, density, maxTextureSize);
    if (this.tier !== tier) this.releaseAll();
    this.tier = tier;
    this.desired = this.pageIds(groups, tier);
    const wanted = new Set(this.desired);
    // Reclaim obsolete actors before allocating the next pair.
    for (const [id, page] of this.pages)
      if (!wanted.has(id)) {
        this.frameViews.clear();
        this.release(page);
        this.pages.delete(id);
      }
    const controller = new AbortController();
    this.controller = controller;
    const valid = () =>
      !this.disposed &&
      generation === this.generation &&
      !controller.signal.aborted;
    const variant = this.manifest.variants[tier];
    const missing = this.desired.filter((id) => !this.pages.has(id));
    let completed = 0,
      next = 0;
    onProgress({ stage: "images", completed, total: missing.length });
    const worker = async () => {
      while (valid() && next < missing.length) {
        const id = missing[next++],
          info = variant.pages[id];
        const image = await decodeAtlasImage(
          `${BASE_PATH}classic-atlas/${info.path}?v=${info.sha256}`,
          controller.signal,
        );
        if (!valid()) {
          image.removeAttribute("src");
          return;
        }
        if (
          image.naturalWidth !== info.width ||
          image.naturalHeight !== info.height
        ) {
          image.removeAttribute("src");
          throw new LoadingError("images", "incompatible");
        }
        const source = new ImageSource({
          resource: image,
          label: `classic-atlas:${tier}:${id}`,
          width: info.width,
          height: info.height,
          resolution: 1,
          alphaMode: "premultiply-alpha-on-upload",
          scaleMode: "linear",
          addressMode: "clamp-to-edge",
          autoGenerateMipmaps: false,
        });
        // Page lifetime is explicit, not driven by Pixi's idle texture GC.
        source.autoGarbageCollect = false;
        this.pages.set(id, {
          image,
          source,
          textures: new Map(),
          uploaded: false,
          bytes: info.rgbaBytes,
        });
        this.decodes++;
        onProgress({
          stage: "images",
          completed: ++completed,
          total: missing.length,
        });
      }
    };
    try {
      await Promise.all(
        Array.from(
          { length: Math.min(IMAGE_LOAD_CONCURRENCY, missing.length) },
          worker,
        ),
      );
      if (!valid()) return false;
      const pending = this.desired.filter(
        (id) => !this.pages.get(id)!.uploaded,
      );
      completed = 0;
      onProgress({ stage: "prewarm", completed, total: pending.length });
      for (const id of pending) {
        await yieldForPaint();
        if (!valid()) return false;
        const page = this.pages.get(id)!;
        upload(page.source);
        if (!valid()) return false;
        page.uploaded = true;
        this.uploads++;
        onProgress({
          stage: "prewarm",
          completed: ++completed,
          total: pending.length,
        });
      }
      return valid();
    } catch (error) {
      const stale = generation !== this.generation || this.disposed;
      controller.abort();
      if (stale) return false;
      if (error instanceof LoadingError) throw error;
      throw new LoadingError("images", "request");
    } finally {
      if (this.controller === controller) this.controller = undefined;
    }
  }

  ready(groups: readonly string[]): boolean {
    if (!this.tier || this.disposed) return false;
    return this.pageIds(groups, this.tier).every(
      (id) => this.pages.get(id)?.uploaded,
    );
  }

  fragments(key: string): AtlasTextureFragment[] {
    if (!this.tier) return [];
    const cached = this.frameViews.get(key);
    if (cached) return cached;
    const frame = this.manifest.variants[this.tier].frames[key];
    if (!frame) throw new LoadingError("prewarm", "incompatible");
    const views = frame.fragments.map((fragment) => {
      const page = this.pages.get(fragment.page);
      if (!page?.uploaded) throw new LoadingError("prewarm", "changed");
      const rect = fragment.frame;
      const cacheKey = `${rect.x},${rect.y},${rect.width},${rect.height}`;
      let texture = page.textures.get(cacheKey);
      if (!texture) {
        texture = new Texture({
          source: page.source,
          frame: new Rectangle(rect.x, rect.y, rect.width, rect.height),
        });
        page.textures.set(cacheKey, texture);
      }
      return { texture, fragment, frame };
    });
    this.frameViews.set(key, views);
    return views;
  }

  cancel(): void {
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
  }
  contextLost(): void {
    this.cancel();
    this.frameViews.clear();
    for (const page of this.pages.values()) page.uploaded = false;
  }
  private release(page: LoadedPage): void {
    for (const texture of page.textures.values()) texture.destroy(false);
    page.textures.clear();
    page.source.destroy();
    page.image.removeAttribute("src");
  }
  private releaseAll(): void {
    this.frameViews.clear();
    for (const page of this.pages.values()) this.release(page);
    this.pages.clear();
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancel();
    this.releaseAll();
  }
  diagnostics() {
    return {
      tier: this.tier ?? null,
      pages: this.pages.size,
      uploadedPages: [...this.pages.values()].filter((p) => p.uploaded).length,
      rgbaBytesEstimate: [...this.pages.values()].reduce(
        (sum, page) => sum + page.bytes,
        0,
      ),
      rgbaLimit: ATLAS_RGBA_LIMIT,
      uploads: this.uploads,
      decodes: this.decodes,
      groups: this.tier
        ? [
            ...new Set(
              this.desired.map(
                (id) => this.manifest.variants[this.tier!].pages[id].group,
              ),
            ),
          ]
        : [],
    };
  }
}

/** Decode is part of the bounded deadline; abort also cancels pending callbacks. */
export function decodeAtlasImage(
  url: string,
  signal: AbortSignal,
): Promise<HTMLImageElement> {
  const image = new Image();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: LoadingError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      image.onload = image.onerror = null;
      if (error) {
        image.removeAttribute("src");
        reject(error);
      } else resolve(image);
    };
    const abort = () => finish(new LoadingError("images", "changed"));
    const timer = setTimeout(
      () => finish(new LoadingError("images", "timeout")),
      ATLAS_IMAGE_TIMEOUT_MS,
    );
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    image.onload = () => {
      // Explicit decode completes before progress/upload; browsers may load before decode.
      const decoded = image.decode?.() ?? Promise.resolve();
      decoded.then(
        () => finish(),
        () => finish(new LoadingError("images", "request")),
      );
    };
    image.onerror = () => finish(new LoadingError("images", "request"));
    image.src = url;
  });
}
