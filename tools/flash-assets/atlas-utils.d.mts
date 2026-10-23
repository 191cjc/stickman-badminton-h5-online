import type { AtlasRect } from "../../src/client/atlas-manifest";
import type {
  AssetManifest,
  DrawFrame,
} from "../../src/shared/classic/manifest";
export interface Raster {
  width: number;
  height: number;
  data: Uint8Array;
}
export interface TrimmedRaster extends Raster {
  bounds: AtlasRect;
}
export const MAX_PAGE_SIDE: number;
export const GUTTER: number;
export const CORE_SIDE: number;
export function sha256(bytes: Uint8Array | string): string;
export function lexical(a: string, b: string): number;
export function recolorBody(svg: string, color: string): string;
export function alphaBounds(raster: Raster): AtlasRect;
export function splitBounds(bounds: AtlasRect): AtlasRect[];
export function packFragments<T extends { id: string; trim: AtlasRect }>(
  entries: T[],
): Array<{
  width: number;
  height: number;
  entries: Array<T & { frame: AtlasRect }>;
}>;
export function blitWithGutter(
  target: Raster,
  entry: { raster: TrimmedRaster; trim: AtlasRect; frame: AtlasRect },
): void;
export function confettiDelta(black: Raster, white: Raster): TrimmedRaster;
export function sourceGroups(source: AssetManifest): Map<string, DrawFrame[]>;
