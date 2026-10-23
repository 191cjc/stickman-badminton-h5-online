import { createHash } from "node:crypto";

export const MAX_PAGE_SIDE = 2048;
export const GUTTER = 2;
export const CORE_SIDE = MAX_PAGE_SIDE - GUTTER * 2;
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const lexical = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Change only the marked body; the original bevel/shadow filter stays untouched. */
export function recolorBody(svg, color) {
  if (!/^#[a-f0-9]{6}$/i.test(color)) throw new Error("Invalid confetti color");
  let count = 0;
  const result = svg.replace(/<path\b[^>]*>/g, (path) => {
    if (!path.includes('data-confetti-body="true"')) return path;
    count++;
    if (!/fill="[^"]*"/.test(path))
      throw new Error("Confetti body has no fill");
    return path.replace(/fill="[^"]*"/, `fill="${color}"`);
  });
  if (count !== 1) throw new Error("Expected exactly one confetti body");
  return result;
}

export function alphaBounds(raster) {
  let x0 = raster.width;
  let y0 = raster.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (!raster.data[(y * raster.width + x) * 4 + 3]) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  // Empty frames retain their timeline slot and full original registration.
  return x1 < 0
    ? { x: 0, y: 0, width: 1, height: 1 }
    : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

export function splitBounds(bounds) {
  const parts = [];
  for (let y = bounds.y; y < bounds.y + bounds.height; y += CORE_SIDE) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += CORE_SIDE) {
      parts.push({
        x,
        y,
        width: Math.min(CORE_SIDE, bounds.x + bounds.width - x),
        height: Math.min(CORE_SIDE, bounds.y + bounds.height - y),
      });
    }
  }
  return parts;
}

const contains = (a, b) =>
  a.x <= b.x &&
  a.y <= b.y &&
  a.x + a.width >= b.x + b.width &&
  a.y + a.height >= b.y + b.height;
const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

function occupy(page, used) {
  const next = [];
  for (const free of page.free) {
    if (!overlaps(free, used)) {
      next.push(free);
      continue;
    }
    if (used.x > free.x) next.push({ ...free, width: used.x - free.x });
    if (used.x + used.width < free.x + free.width)
      next.push({
        ...free,
        x: used.x + used.width,
        width: free.x + free.width - used.x - used.width,
      });
    if (used.y > free.y) next.push({ ...free, height: used.y - free.y });
    if (used.y + used.height < free.y + free.height)
      next.push({
        ...free,
        y: used.y + used.height,
        height: free.y + free.height - used.y - used.height,
      });
  }
  page.free = next.filter(
    (rectangle, index) =>
      !next.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          contains(other, rectangle) &&
          (!contains(rectangle, other) || otherIndex < index),
      ),
  );
  page.width = Math.max(page.width, used.x + used.width);
  page.height = Math.max(page.height, used.y + used.height);
}

/** Deterministic, nonrotating MaxRects best-short-side-fit with NPOT output. */
export function packFragments(entries) {
  const pages = [];
  const sorted = [...entries].sort(
    (a, b) =>
      b.trim.height - a.trim.height ||
      b.trim.width - a.trim.width ||
      lexical(a.id, b.id),
  );
  for (const entry of sorted) {
    const width = entry.trim.width + GUTTER * 2;
    const height = entry.trim.height + GUTTER * 2;
    if (width > MAX_PAGE_SIDE || height > MAX_PAGE_SIDE)
      throw new Error("Unsplit oversized frame");
    let best;
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      for (const free of pages[pageIndex].free) {
        if (free.width < width || free.height < height) continue;
        const short = Math.min(free.width - width, free.height - height);
        const long = Math.max(free.width - width, free.height - height);
        const rank = [short, long, pageIndex, free.y, free.x];
        if (
          !best ||
          rank.some(
            (value, i) =>
              value < best.rank[i] &&
              rank.slice(0, i).every((prior, j) => prior === best.rank[j]),
          )
        )
          best = { pageIndex, x: free.x, y: free.y, rank };
      }
    }
    if (!best) {
      best = { pageIndex: pages.length, x: 0, y: 0 };
      pages.push({
        width: 0,
        height: 0,
        free: [{ x: 0, y: 0, width: MAX_PAGE_SIDE, height: MAX_PAGE_SIDE }],
        entries: [],
      });
    }
    const page = pages[best.pageIndex];
    occupy(page, { x: best.x, y: best.y, width, height });
    page.entries.push({
      ...entry,
      frame: {
        x: best.x + GUTTER,
        y: best.y + GUTTER,
        width: entry.trim.width,
        height: entry.trim.height,
      },
    });
  }
  return pages.map(({ width, height, entries: parts }) => ({
    width: Math.ceil(width / 4) * 4,
    height: Math.ceil(height / 4) * 4,
    entries: parts,
  }));
}

/** Extrude outside trim; tile joins use their actual neighboring source pixels. */
export function blitWithGutter(target, entry) {
  const { raster, trim, frame } = entry;
  const bounds = raster.bounds;
  for (let dy = -GUTTER; dy < trim.height + GUTTER; dy++) {
    const sy = Math.max(
      bounds.y,
      Math.min(bounds.y + bounds.height - 1, trim.y + dy),
    );
    for (let dx = -GUTTER; dx < trim.width + GUTTER; dx++) {
      const sx = Math.max(
        bounds.x,
        Math.min(bounds.x + bounds.width - 1, trim.x + dx),
      );
      const from = (sy * raster.width + sx) * 4;
      const to = ((frame.y + dy) * target.width + frame.x + dx) * 4;
      for (let c = 0; c < 4; c++) target.data[to + c] = raster.data[from + c];
    }
  }
}

export function confettiDelta(black, white) {
  if (black.width !== white.width || black.height !== white.height)
    throw new Error("Confetti basis dimensions differ");
  const data = Buffer.alloc(black.data.length);
  for (let i = 0; i < data.length; i += 4) {
    if (black.data[i + 3] !== white.data[i + 3])
      throw new Error("Confetti alpha depends on color");
    for (let c = 0; c < 3; c++) {
      const delta = white.data[i + c] - black.data[i + c];
      if (delta < 0)
        throw new Error("Confetti color basis has a negative channel");
      data[i + c] = delta;
    }
    data[i + 3] = black.data[i + 3];
  }
  return {
    width: black.width,
    height: black.height,
    data,
    bounds: alphaBounds(black),
  };
}

export function sourceGroups(source) {
  const groups = new Map();
  const put = (name, frames) =>
    groups.set(
      name,
      [...new Map(frames.map((frame) => [frame.path, frame])).values()].sort(
        (a, b) => lexical(a.path, b.path),
      ),
    );
  put("court", [
    source.background,
    source.markers,
    source.courtBrand,
    ...source.netFrames,
  ]);
  put("common", [
    source.shuttle,
    source.ui.intro,
    source.ui.finish,
    ...Object.values(source.effects).flatMap((effect) => effect.frames),
    ...Object.values(source.scores),
    ...Object.values(source.introNames),
  ]);
  for (const [name, family] of Object.entries(source.families))
    put(`swing-${name}`, Object.values(family.swings).flat());
  for (const [name, role] of Object.entries(source.characters))
    put(`body-${name}`, Object.values(role.body).flat());
  return new Map([...groups].sort(([a], [b]) => lexical(a, b)));
}
