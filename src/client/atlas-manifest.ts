import type { AssetManifest, DrawFrame } from "../shared/classic/manifest";

export type AtlasTier = "hd" | "sd";
export interface AtlasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface AtlasFragment {
  page: string;
  frame: AtlasRect;
  /** Pixel coordinates inside the full, untrimmed source raster. */
  trim: AtlasRect;
}
export interface AtlasFrame {
  sourceSha256: string;
  pixelWidth: number;
  pixelHeight: number;
  fragments: AtlasFragment[];
}
export interface AtlasPage {
  path: string;
  sha256: string;
  width: number;
  height: number;
  rgbaBytes: number;
  group: string;
}
export interface AtlasVariant {
  pages: Record<string, AtlasPage>;
  frames: Record<string, AtlasFrame>;
  groups: Record<string, string[]>;
}
export interface AtlasManifest {
  schema: 1;
  sourceManifestSha256: string;
  generator: {
    playwrightVersion: string;
    chromiumVersion: string;
    algorithm: string;
  };
  variants: Record<AtlasTier, AtlasVariant>;
  dom: Record<
    string,
    { path: string; sha256: string; width: number; height: number }
  >;
  confetti: { base: string; delta: string };
}

export const ATLAS_MAX_SIDE = 2048;
export const ATLAS_ACTIVE_RGBA_LIMIT = 96 * 1024 * 1024;
const hashPattern = /^[a-f0-9]{64}$/;
const assetPattern = /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.png$/;
const groupPattern = /^(court|common|swing-(adult|toaster)|body-[a-z-]+)$/;

function fail(reason: string): never {
  throw new Error(`Invalid atlas manifest: ${reason}`);
}
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(label);
  return value as Record<string, unknown>;
}
function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.length || value.length > 256)
    fail(label);
  return value;
}
function hash(value: unknown, label: string): string {
  const result = string(value, label);
  if (!hashPattern.test(result)) fail(label);
  return result;
}
function integer(value: unknown, max: number, label: string, min = 1): number {
  if (
    !Number.isInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  )
    fail(label);
  return value as number;
}
function rect(value: unknown, maxWidth: number, maxHeight: number): AtlasRect {
  const r = object(value, "rectangle");
  const x = integer(r.x, maxWidth, "rect.x", 0);
  const y = integer(r.y, maxHeight, "rect.y", 0);
  const width = integer(r.width, maxWidth, "rect.width");
  const height = integer(r.height, maxHeight, "rect.height");
  if (x + width > maxWidth || y + height > maxHeight) fail("rectangle bounds");
  return { x, y, width, height };
}
function records(value: unknown, max: number, label: string) {
  const record = object(value, label);
  const entries = Object.entries(record);
  if (!entries.length || entries.length > max) fail(`${label} count`);
  if (
    entries.some(([key]) =>
      ["__proto__", "prototype", "constructor"].includes(key),
    )
  )
    fail(`${label} key`);
  return entries;
}

/** Every source frame required by the GPU scene, excluding DOM-only buttons/previews. */
export function sourceGpuFrames(source: AssetManifest): DrawFrame[] {
  return [
    source.background,
    source.courtBrand,
    source.markers,
    source.shuttle,
    ...source.netFrames,
    ...Object.values(source.characters).flatMap((role) =>
      Object.values(role.body).flat(),
    ),
    ...Object.values(source.families).flatMap((family) =>
      Object.values(family.swings).flat(),
    ),
    ...Object.values(source.effects).flatMap((effect) => effect.frames),
    source.ui.intro,
    source.ui.finish,
    ...Object.values(source.scores),
    ...Object.values(source.introNames),
  ];
}

/** Validate before decoding any page; a source release can never mix with another bake. */
export function validateAtlasManifest(
  value: unknown,
  sourceManifestSha256?: string,
  source?: AssetManifest,
): AtlasManifest {
  const root = object(value, "root");
  if (root.schema !== 1) fail("schema");
  const sourceHash = hash(root.sourceManifestSha256, "source digest");
  if (sourceManifestSha256 && sourceHash !== sourceManifestSha256)
    fail("source digest mismatch");
  const generator = object(root.generator, "generator");
  const normalizedGenerator = {
    playwrightVersion: string(
      generator.playwrightVersion,
      "Playwright version",
    ),
    chromiumVersion: string(generator.chromiumVersion, "Chromium version"),
    algorithm: string(generator.algorithm, "algorithm"),
  };
  const confettiInput = object(root.confetti, "confetti");
  const confetti = {
    base: string(confettiInput.base, "confetti base"),
    delta: string(confettiInput.delta, "confetti delta"),
  };
  if (confetti.base === confetti.delta) fail("confetti identities");
  const tiers = object(root.variants, "variants");
  const variants = {} as Record<AtlasTier, AtlasVariant>;
  for (const tier of ["hd", "sd"] as const) {
    const input = object(tiers[tier], tier);
    const pages: Record<string, AtlasPage> = Object.create(null);
    for (const [id, raw] of records(input.pages, 256, "pages")) {
      if (!/^[a-z0-9-]{1,100}$/.test(id)) fail("page identifier");
      const p = object(raw, "page");
      const path = string(p.path, "page path");
      const sha256 = hash(p.sha256, "page hash");
      if (!assetPattern.test(path) || !path.includes(sha256))
        fail("page path identity");
      const width = integer(p.width, ATLAS_MAX_SIDE, "page width");
      const height = integer(p.height, ATLAS_MAX_SIDE, "page height");
      const group = string(p.group, "page group");
      if (!groupPattern.test(group)) fail("page group");
      if (p.rgbaBytes !== width * height * 4) fail("page byte estimate");
      pages[id] = {
        path,
        sha256,
        width,
        height,
        group,
        rgbaBytes: width * height * 4,
      };
    }
    const groups: Record<string, string[]> = Object.create(null);
    const assigned = new Set<string>();
    for (const [group, raw] of records(input.groups, 32, "groups")) {
      if (
        !groupPattern.test(group) ||
        !Array.isArray(raw) ||
        !raw.length ||
        raw.length > 256
      )
        fail("group pages");
      groups[group] = raw.map((id: unknown) => {
        const key = string(id, "page reference");
        if (!pages[key] || pages[key].group !== group || assigned.has(key))
          fail("page group ownership");
        assigned.add(key);
        return key;
      });
    }
    if (assigned.size !== Object.keys(pages).length) fail("unowned page");
    if (!groups.court || !groups.common) fail("base groups");
    const frames: Record<string, AtlasFrame> = Object.create(null);
    for (const [path, raw] of records(input.frames, 1000, "frames")) {
      if (
        !/^[a-zA-Z0-9_/-]+\.svg$/.test(path) &&
        !Object.values(confetti).includes(path)
      )
        fail("source path");
      if (path.split("/").includes("..")) fail("source path traversal");
      const f = object(raw, "frame");
      const sourceSha256 = hash(f.sourceSha256, "source frame digest");
      if (
        source &&
        !Object.values(confetti).includes(path) &&
        source.files[path] !== sourceSha256
      )
        fail("unknown or mismatched source path");
      const pixelWidth = integer(f.pixelWidth, 16384, "source raster width");
      const pixelHeight = integer(f.pixelHeight, 16384, "source raster height");
      if (
        !Array.isArray(f.fragments) ||
        !f.fragments.length ||
        f.fragments.length > 64
      )
        fail("fragments");
      const fragments = f.fragments.map((fragment: unknown) => {
        const part = object(fragment, "fragment");
        const page = string(part.page, "fragment page");
        if (!pages[page]) fail("unknown page");
        const frame = rect(part.frame, pages[page].width, pages[page].height);
        const trim = rect(part.trim, pixelWidth, pixelHeight);
        if (frame.width !== trim.width || frame.height !== trim.height)
          fail("fragment raster size");
        // The two-pixel sampling gutter is outside Texture.frame.
        if (
          frame.x < 2 ||
          frame.y < 2 ||
          frame.x + frame.width + 2 > pages[page].width ||
          frame.y + frame.height + 2 > pages[page].height
        )
          fail("fragment gutter");
        return { page, frame, trim };
      });
      frames[path] = { sourceSha256, pixelWidth, pixelHeight, fragments };
    }
    const base = frames[confetti.base];
    const delta = frames[confetti.delta];
    if (
      !base ||
      !delta ||
      base.pixelWidth !== delta.pixelWidth ||
      base.pixelHeight !== delta.pixelHeight ||
      base.fragments.length !== 1 ||
      delta.fragments.length !== 1 ||
      JSON.stringify(base.fragments[0].trim) !==
        JSON.stringify(delta.fragments[0].trim)
    )
      fail("confetti basis registration");
    if (source) {
      for (const frame of sourceGpuFrames(source)) {
        if (
          !frames[frame.path] ||
          frames[frame.path].sourceSha256 !== source.files[frame.path]
        )
          fail(`missing or mismatched source frame ${frame.path}`);
      }
      const requireGroup = (paths: DrawFrame[], group: string) => {
        if (!groups[group]) fail(`missing group ${group}`);
        for (const frame of paths)
          if (
            frames[frame.path].fragments.some(
              (part) => pages[part.page].group !== group,
            )
          )
            fail(`wrong source group ${frame.path}`);
      };
      requireGroup(
        [
          source.background,
          source.courtBrand,
          source.markers,
          ...source.netFrames,
        ],
        "court",
      );
      requireGroup(
        [
          source.shuttle,
          source.ui.intro,
          source.ui.finish,
          ...Object.values(source.effects).flatMap((effect) => effect.frames),
          ...Object.values(source.scores),
          ...Object.values(source.introNames),
        ],
        "common",
      );
      for (const basis of [base, delta])
        if (basis.fragments.some((part) => pages[part.page].group !== "common"))
          fail("confetti group ownership");
      for (const [id, role] of Object.entries(source.characters))
        requireGroup(Object.values(role.body).flat(), `body-${id}`);
      for (const [id, family] of Object.entries(source.families))
        requireGroup(Object.values(family.swings).flat(), `swing-${id}`);
      const confettiHash = source.files[source.effects.confetti.frames[0].path];
      if (
        base.sourceSha256 !== confettiHash ||
        delta.sourceSha256 !== confettiHash
      )
        fail("confetti source digest");
      const roles = Object.entries(source.characters);
      for (const [leftId, left] of roles) {
        for (const [rightId, right] of roles) {
          const active = new Set([
            "court",
            "common",
            `body-${leftId}`,
            `body-${rightId}`,
            `swing-${left.family}`,
            `swing-${right.family}`,
          ]);
          const bytes = [...active]
            .flatMap((group) => groups[group])
            .reduce((sum, page) => sum + pages[page].rgbaBytes, 0);
          if (bytes > ATLAS_ACTIVE_RGBA_LIMIT) fail("active scene RGBA budget");
        }
      }
    }
    variants[tier] = { pages, groups, frames };
  }
  const dom: AtlasManifest["dom"] = Object.create(null);
  for (const [sourcePath, raw] of records(root.dom, 32, "DOM images")) {
    if (
      !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.svg$/.test(sourcePath) ||
      (source && !source.files[sourcePath])
    )
      fail("DOM source path");
    const image = object(raw, "DOM image");
    const path = string(image.path, "DOM image path");
    const sha256 = hash(image.sha256, "DOM image digest");
    if (!assetPattern.test(path) || !path.includes(sha256))
      fail("DOM path identity");
    dom[sourcePath] = {
      path,
      sha256,
      width: integer(image.width, 2048, "DOM width"),
      height: integer(image.height, 2048, "DOM height"),
    };
  }
  if (source)
    for (const frame of [
      ...Object.values(source.characters).map((role) => role.preview),
      source.ui.rematchUp,
      source.ui.rematchOver,
    ])
      if (!dom[frame.path]) fail(`missing DOM image ${frame.path}`);
  return {
    schema: 1,
    sourceManifestSha256: sourceHash,
    generator: normalizedGenerator,
    variants,
    dom,
    confetti,
  };
}
