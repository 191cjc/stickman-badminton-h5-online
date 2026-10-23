import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import type { Raster } from "../../tools/flash-assets/atlas-utils.mjs";
import type { AssetManifest } from "../../src/shared/classic/manifest";
import type {
  AtlasManifest,
  AtlasTier,
  AtlasFragment,
} from "../../src/client/atlas-manifest";
import {
  alphaBounds,
  blitWithGutter,
  confettiDelta,
  packFragments,
  recolorBody,
  sha256,
  splitBounds,
} from "../../tools/flash-assets/atlas-utils.mjs";
import {
  ATLAS_ACTIVE_RGBA_LIMIT,
  sourceGpuFrames,
  validateAtlasManifest,
} from "../../src/client/atlas-manifest";

const sourceBytes = readFileSync(
  new URL("../../public/classic/manifest.json", import.meta.url),
);
const source: AssetManifest = JSON.parse(sourceBytes.toString());
const atlasDirectory = new URL("../../public/classic-atlas/", import.meta.url);
const manifest: AtlasManifest = JSON.parse(
  readFileSync(new URL("manifest.json", atlasDirectory), "utf8"),
);
const report = JSON.parse(
  readFileSync(new URL("report.json", atlasDirectory), "utf8"),
) as {
  variants: Record<AtlasTier, { worstActivePair: { rgbaBytes: number } }>;
  confetti: Record<
    AtlasTier,
    {
      maxAlphaError: number;
      maxPremultipliedRgbError: number;
      colors: string[];
    }
  >;
};
const { PNG } = createRequire(import.meta.url)("pngjs") as {
  PNG: { sync: { read(bytes: Uint8Array): Raster } };
};
const tiers: AtlasTier[] = ["hd", "sd"];
const pixel = (image: Raster, x: number, y: number) => [
  ...image.data.subarray(
    (y * image.width + x) * 4,
    (y * image.width + x) * 4 + 4,
  ),
];

describe("generated original-SVG atlas contract", () => {
  it("covers every GPU source path and preserves all source hashes/order metadata", () => {
    const validated = validateAtlasManifest(
      manifest,
      sha256(sourceBytes),
      source,
    );
    for (const tier of tiers) {
      for (const frame of sourceGpuFrames(source)) {
        const baked = validated.variants[tier].frames[frame.path];
        expect(baked.sourceSha256).toBe(source.files[frame.path]);
        const density = tier === "hd" ? 4 : 2;
        const actualDensity = frame.path.startsWith("effects/spark-")
          ? density / 2
          : density;
        expect(baked.pixelWidth).toBe(Math.ceil(frame.width * actualDensity));
        expect(baked.pixelHeight).toBe(Math.ceil(frame.height * actualDensity));
        // Source coordinates remain authoritative even with fractional ceil rounding.
        const right =
          frame.x + (baked.pixelWidth * frame.width) / baked.pixelWidth;
        expect(right).toBeCloseTo(frame.x + frame.width, 10);
      }
    }
    for (const role of Object.values(source.characters))
      expect(manifest.dom[role.preview.path].path).toMatch(/\.png$/);
    expect(manifest.dom[source.ui.rematchUp.path]).toBeDefined();
    expect(manifest.dom[source.ui.rematchOver.path]).toBeDefined();
  });

  it("contains lossless RGBA8 pages with correct dimensions, digests and 2048 limit", () => {
    const paths = new Set();
    for (const tier of Object.values(manifest.variants)) {
      for (const page of Object.values(tier.pages)) {
        const bytes = readFileSync(new URL(page.path, atlasDirectory));
        expect(sha256(bytes)).toBe(page.sha256);
        expect(bytes[24]).toBe(8);
        expect(bytes[25]).toBe(6);
        const decoded = PNG.sync.read(bytes);
        expect([decoded.width, decoded.height]).toEqual([
          page.width,
          page.height,
        ]);
        expect(page.width).toBeLessThanOrEqual(2048);
        expect(page.height).toBeLessThanOrEqual(2048);
        expect(page.rgbaBytes).toBe(page.width * page.height * 4);
        expect(paths.has(page.path)).toBe(false);
        paths.add(page.path);
      }
    }
    for (const image of Object.values(manifest.dom)) {
      const bytes = readFileSync(new URL(image.path, atlasDirectory));
      expect(sha256(bytes)).toBe(image.sha256);
      const png = PNG.sync.read(bytes);
      expect([png.width, png.height]).toEqual([image.width, image.height]);
    }
  });

  it("shares duplicate pixels while retaining independent source frame selection", () => {
    for (const tier of tiers) {
      const frames = manifest.variants[tier].frames;
      const role = source.characters.joe;
      const first = role.body.backward[0];
      const identical = role.body.backward
        .slice(1)
        .find((frame) => source.files[frame.path] === source.files[first.path]);
      expect(identical).toBeDefined();
      expect(frames[first.path]).toEqual(frames[identical!.path]);
      expect(role.body.backward).toHaveLength(16);
      expect(new Set(role.body.backward.map((frame) => frame.path)).size).toBe(
        16,
      );
      expect(
        Object.values(manifest.variants[tier].groups).flat(),
      ).not.toContain("body-unused-0");
    }
  });

  it("budgets all 49 active pairs, and records measured confetti error separately", () => {
    for (const tier of tiers) {
      const variant = manifest.variants[tier];
      const observed = [];
      for (const [leftId, left] of Object.entries(source.characters)) {
        for (const [rightId, right] of Object.entries(source.characters)) {
          const groups = new Set([
            "court",
            "common",
            `body-${leftId}`,
            `body-${rightId}`,
            `swing-${left.family}`,
            `swing-${right.family}`,
          ]);
          const pages = [...groups].flatMap((group) => variant.groups[group]);
          const bytes = pages.reduce(
            (sum, id) => sum + variant.pages[id].rgbaBytes,
            0,
          );
          expect(bytes).toBeLessThanOrEqual(ATLAS_ACTIVE_RGBA_LIMIT);
          expect(groups.size).toBeLessThanOrEqual(6);
          observed.push(bytes);
        }
      }
      expect(observed).toHaveLength(49);
      expect(report.variants[tier].worstActivePair.rgbaBytes).toBe(
        Math.max(...observed),
      );
      expect(report.confetti[tier].maxAlphaError).toBe(0);
      expect(report.confetti[tier].maxPremultipliedRgbError).toBeLessThan(3);
      expect(report.confetti[tier].colors).toContain("12ab45");
    }
  });

  it("reconstructs the original red confetti from actual packed black/delta pixels", () => {
    for (const tier of tiers) {
      const variant = manifest.variants[tier];
      const paths = [
        source.effects.confetti.frames[0].path,
        manifest.confetti.base,
        manifest.confetti.delta,
      ];
      const packed = paths.map((path) => {
        const fragment = variant.frames[path].fragments[0];
        return {
          fragment,
          image: PNG.sync.read(
            readFileSync(
              new URL(variant.pages[fragment.page].path, atlasDirectory),
            ),
          ),
        };
      });
      const [original, black, delta] = packed;
      expect(black.fragment.trim).toEqual(original.fragment.trim);
      expect(delta.fragment.trim).toEqual(original.fragment.trim);
      for (let y = 0; y < original.fragment.trim.height; y++) {
        for (let x = 0; x < original.fragment.trim.width; x++) {
          const values = packed.map(({ fragment, image }) =>
            pixel(image, fragment.frame.x + x, fragment.frame.y + y),
          );
          const [target, base, change] = values;
          expect(base[3]).toBe(target[3]);
          expect(change[3]).toBe(target[3]);
          for (let channel = 0; channel < 3; channel++) {
            const output =
              base[channel] + (channel === 0 ? change[channel] : 0);
            expect(
              (Math.abs(output - target[channel]) * target[3]) / 255,
            ).toBeLessThanOrEqual(3);
          }
        }
      }
    }
  });

  it("has continuous real-neighbor gutters across large background tile joins", () => {
    const tier = manifest.variants.hd;
    const background = tier.frames[source.background.path];
    expect(background.fragments.length).toBeGreaterThan(1);
    const images = new Map<string, Raster>();
    const image = (part: AtlasFragment) => {
      if (!images.has(part.page))
        images.set(
          part.page,
          PNG.sync.read(
            readFileSync(new URL(tier.pages[part.page].path, atlasDirectory)),
          ),
        );
      return images.get(part.page)!;
    };
    let joins = 0;
    for (const left of background.fragments) {
      for (const right of background.fragments) {
        if (
          left.trim.x + left.trim.width !== right.trim.x ||
          left.trim.y !== right.trim.y
        )
          continue;
        joins++;
        for (
          let y = 0;
          y < Math.min(left.trim.height, right.trim.height);
          y += 37
        ) {
          for (let offset = 0; offset < 2; offset++) {
            expect(
              pixel(
                image(left),
                left.frame.x + left.frame.width + offset,
                left.frame.y + y,
              ),
            ).toEqual(
              pixel(image(right), right.frame.x + offset, right.frame.y + y),
            );
            expect(
              pixel(
                image(right),
                right.frame.x - 1 - offset,
                right.frame.y + y,
              ),
            ).toEqual(
              pixel(
                image(left),
                left.frame.x + left.frame.width - 1 - offset,
                left.frame.y + y,
              ),
            );
          }
        }
      }
    }
    expect(joins).toBeGreaterThan(0);
  });

  it("rejects mismatched releases, traversal, rect bounds, group leaks and wrong basis", () => {
    expect(() =>
      validateAtlasManifest(manifest, "0".repeat(64), source),
    ).toThrow(/source digest mismatch/);
    const outside = structuredClone(manifest);
    Object.values(outside.variants.hd.pages)[0].path = "../escape.png";
    expect(() => validateAtlasManifest(outside)).toThrow(/page path identity/);
    const bounds = structuredClone(manifest);
    Object.values(bounds.variants.hd.frames)[0].fragments[0].frame.x = 2048;
    expect(() => validateAtlasManifest(bounds)).toThrow(/rect.x|bounds|gutter/);
    const ownership = structuredClone(manifest);
    const variant = ownership.variants.hd;
    const score = variant.frames[Object.values(source.scores)[0].path];
    const oldPage = variant.pages[score.fragments[0].page];
    variant.pages["body-joe-extra"] = { ...oldPage, group: "body-joe" };
    variant.groups["body-joe"].push("body-joe-extra");
    score.fragments[0].page = "body-joe-extra";
    expect(() =>
      validateAtlasManifest(ownership, sha256(sourceBytes), source),
    ).toThrow(/wrong source group/);
    const basis = structuredClone(manifest);
    basis.variants.hd.frames[basis.confetti.delta].fragments[0].trim.x++;
    expect(() => validateAtlasManifest(basis)).toThrow(
      /confetti basis registration/,
    );
  });
});

describe("baker trim, packing, colors and gutter rules", () => {
  it("keeps alpha=1 tails and empty timeline slots; fragments preserve original coordinates", () => {
    const data = Buffer.alloc(5 * 3 * 4);
    data[(2 * 5 + 4) * 4 + 3] = 1;
    expect(alphaBounds({ width: 5, height: 3, data })).toEqual({
      x: 4,
      y: 2,
      width: 1,
      height: 1,
    });
    expect(
      alphaBounds({ width: 4, height: 2, data: Buffer.alloc(32) }),
    ).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(splitBounds({ x: 47, y: 23, width: 2045, height: 2 })).toEqual([
      { x: 47, y: 23, width: 2044, height: 2 },
      { x: 2091, y: 23, width: 1, height: 2 },
    ]);
  });

  it("packs deterministic nonoverlapping two-texel gutters without rotating fragments", () => {
    const entries = Array.from({ length: 24 }, (_, id) => ({
      id: `entry-${id}`,
      trim: {
        x: 0,
        y: 0,
        width: 140 + (id % 4) * 31,
        height: 201 + (id % 3) * 7,
      },
    }));
    const a = packFragments(entries);
    expect(packFragments([...entries].reverse())).toEqual(a);
    for (const page of a) {
      expect(page.width).toBeLessThanOrEqual(2048);
      expect(page.height).toBeLessThanOrEqual(2048);
      for (const entry of page.entries) {
        expect([entry.frame.width, entry.frame.height]).toEqual([
          entry.trim.width,
          entry.trim.height,
        ]);
        for (const other of page.entries) {
          if (entry === other) continue;
          const left = entry.frame;
          const right = other.frame;
          expect(
            left.x + left.width + 4 <= right.x ||
              right.x + right.width + 4 <= left.x ||
              left.y + left.height + 4 <= right.y ||
              right.y + right.height + 4 <= left.y,
          ).toBe(true);
        }
      }
    }
  });

  it("extrudes exterior boundaries and copies real neighbors into interior tile gutters", () => {
    const raster = {
      width: 5,
      height: 1,
      data: Buffer.from([
        10, 0, 0, 255, 20, 0, 0, 255, 30, 0, 0, 255, 40, 0, 0, 255, 50, 0, 0,
        255,
      ]),
      bounds: { x: 0, y: 0, width: 5, height: 1 },
    };
    const target = { width: 7, height: 5, data: Buffer.alloc(7 * 5 * 4) };
    blitWithGutter(target, {
      raster,
      trim: { x: 0, y: 0, width: 3, height: 1 },
      frame: { x: 2, y: 2, width: 3, height: 1 },
    });
    expect(Array.from({ length: 7 }, (_, x) => pixel(target, x, 2)[0])).toEqual(
      [10, 10, 10, 20, 30, 40, 50],
    );
    expect(pixel(target, 4, 0)).toEqual(pixel(target, 4, 2));
  });

  it("recolors only nested body and rejects source graphs violating the affine alpha basis", () => {
    const template =
      '<filter><feFlood flood-color="#ff0000" /></filter><path fill="#aa0000"/><path data-confetti-body="true" fill="#ff0000" />';
    expect(recolorBody(template, "#12ab45")).toBe(
      '<filter><feFlood flood-color="#ff0000" /></filter><path fill="#aa0000"/><path data-confetti-body="true" fill="#12ab45" />',
    );
    expect(() => recolorBody(template, "red")).toThrow();
    expect(() => recolorBody("<svg/>", "#ffffff")).toThrow();
    const black = { width: 1, height: 1, data: Buffer.from([20, 30, 40, 100]) };
    const white = {
      width: 1,
      height: 1,
      data: Buffer.from([220, 230, 240, 100]),
    };
    expect([...confettiDelta(black, white).data]).toEqual([200, 200, 200, 100]);
    expect(() =>
      confettiDelta(black, {
        ...white,
        data: Buffer.from([220, 230, 240, 101]),
      }),
    ).toThrow(/alpha/);
    expect(() =>
      confettiDelta(black, {
        ...white,
        data: Buffer.from([19, 230, 240, 100]),
      }),
    ).toThrow(/negative/);
  });
});
