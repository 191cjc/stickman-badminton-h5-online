import { expect, it } from "vitest";
import {
  RenderQuality,
  RENDER_QUALITY,
  type QualityFrame,
} from "../src/client/render-quality";

const playing: QualityFrame = {
  ready: true,
  visible: true,
  focused: true,
  presenting: true,
  nativeDpr: 2,
  scale: 1.986,
};

function trace(
  quality: RenderQuality,
  start: number,
  duration: number,
  gap: number,
  frame = playing,
) {
  const changes: Array<{ at: number; density: number }> = [];
  let at = start;
  for (; at <= start + duration; at += gap)
    if (quality.observe(at, frame))
      changes.push({
        at,
        density: quality.dpr(frame.nativeDpr, frame.scale) * frame.scale,
      });
  return { at, changes };
}

it.each([60, 120, 144])(
  "retains native resolution at healthy %s Hz and bounds its observation counters",
  (hz) => {
    const quality = new RenderQuality();
    for (let at = 0; at <= 60000; at += 1000 / hz) {
      expect(quality.observe(at, playing)).toBe(false);
      expect(quality.diagnostics().samples).toBeLessThanOrEqual(240);
    }
    expect(quality.dpr(2, 1.986)).toBe(2);
    expect(quality.dpr(4, 1.986)).toBe(2);
    expect(quality.dpr(0.8, 0.5)).toBe(0.8);
    expect(quality.diagnostics().reductions).toBe(0);
  },
);

it("a lone stall does not lower quality; persistent overload selects finite lower levels with cooldown", () => {
  const quality = new RenderQuality();
  let { at } = trace(quality, 0, 2000, 1000 / 60);
  quality.observe(at + 750, playing);
  ({ at } = trace(quality, at + 767, 3000, 1000 / 60));
  expect(quality.diagnostics().reductions).toBe(0);
  const { changes } = trace(quality, at, 60000, 1000 / 30);
  expect(changes.map((item) => item.density)).toEqual([2.8, 2, 1.4, 1]);
  for (let i = 1; i < changes.length; i++)
    expect(changes[i].at - changes[i - 1].at).toBeGreaterThanOrEqual(
      RENDER_QUALITY.cooldownMs + RENDER_QUALITY.windowMs,
    );
  expect(quality.dpr(2, playing.scale)).toBeLessThan(1);
  expect(quality.diagnostics()).toMatchObject({
    worldDensityCap: 1,
    reductions: 4,
  });
});

it.each([750, 1000])(
  "persistent %ims frame gaps accumulate enough evidence rather than discarding undersampled windows",
  (gap) => {
    const quality = new RenderQuality();
    const { changes } = trace(quality, 0, 90000, gap);
    expect(changes.map((item) => item.density)).toEqual([2.8, 2, 1.4, 1]);
    for (let i = 1; i < changes.length; i++)
      expect(changes[i].at - changes[i - 1].at).toBeGreaterThanOrEqual(
        RENDER_QUALITY.cooldownMs + RENDER_QUALITY.windowMs,
      );
    expect(quality.diagnostics().reductions).toBe(4);
  },
);

it.each(["ready", "visible", "focused", "presenting"] as const)(
  "%s=false excludes slow frames and restoration gaps, including a fresh grace period",
  (key) => {
    const quality = new RenderQuality();
    trace(quality, 0, 5000, 50, { ...playing, [key]: false });
    expect(quality.observe(60000, playing)).toBe(false);
    trace(quality, 60050, 900, 50);
    expect(quality.diagnostics().samples).toBe(0);
    expect(quality.diagnostics().reductions).toBe(0);
    const { changes } = trace(quality, 61000, 2100, 50);
    expect(changes).toHaveLength(1);
  },
);

it("scene transitions discard partial overload windows but retain quality across rematch and healthy play", () => {
  const quality = new RenderQuality();
  trace(quality, 0, 2500, 50);
  quality.resetObservation(2501);
  trace(quality, 2550, 2500, 50);
  expect(quality.diagnostics().reductions).toBe(0);
  trace(quality, 5100, 1000, 50);
  expect(quality.dpr(2, playing.scale) * playing.scale).toBe(2.8);
  const next = trace(quality, 6150, 5000, 50, {
    ...playing,
    presenting: false,
  });
  trace(quality, next.at + 10000, 10000, 1000 / 60);
  expect(quality.dpr(2, playing.scale) * playing.scale).toBe(2.8);
  expect(quality.diagnostics().reductions).toBe(1);
});

it("keeps CSS/world scaling independent, ignores resize pauses, and never upscales small viewports", () => {
  const quality = new RenderQuality();
  trace(quality, 0, 4000, 50);
  const cap = quality.diagnostics().worldDensityCap;
  expect(cap).toBe(2.8);
  const enlarged = { ...playing, scale: 4 };
  expect(quality.observe(20000, enlarged)).toBe(false);
  trace(quality, 20050, 900, 50, enlarged);
  expect(quality.dpr(2, 4)).toBe(0.7);
  expect(quality.dpr(1, 0.4)).toBe(1);
  expect(quality.dpr(2, 0.4)).toBe(2);
  expect(quality.diagnostics().reductions).toBe(1);
  // Nearby view changes cannot change a retained cap or restore a higher stage.
  for (let at = 21000; at < 26000; at += 100)
    quality.observe(at, { ...playing, scale: at % 200 ? 1.98 : 1.99 });
  expect(quality.diagnostics().worldDensityCap).toBe(cap);
});

it("only takes strictly lower useful stages, including native-density and lowest-stage cases", () => {
  for (const [scale, expected] of [
    [3, [4, 2.8, 2, 1.4, 1]],
    [1, [1.4, 1]],
    [0.4, []],
  ] as const) {
    const quality = new RenderQuality();
    const { changes } = trace(quality, 0, 90000, 50, { ...playing, scale });
    expect(changes.map((item) => item.density)).toEqual(expected);
    expect(quality.diagnostics().reductions).toBe(expected.length);
  }
});

it("ignores invalid/nonmonotonic samples, and exports detached finite state without requiring diagnostics", () => {
  const quality = new RenderQuality();
  trace(quality, 0, 4000, 50);
  const before = quality.dpr(2, playing.scale);
  for (const at of [Number.NaN, Infinity, -1, 100])
    expect(quality.observe(at, playing)).toBe(false);
  quality.observe(4050, { ...playing, scale: Number.NaN });
  expect(quality.dpr(2, playing.scale)).toBe(before);
  const exported = quality.diagnostics();
  exported.reductions = 999;
  expect(quality.diagnostics().reductions).toBe(1);
  expect(
    Object.values(quality.diagnostics()).every(
      (value) =>
        typeof value === "boolean" || (Number.isFinite(value) && value >= 0),
    ),
  ).toBe(true);
});
