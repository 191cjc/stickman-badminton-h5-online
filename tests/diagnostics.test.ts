import { expect, it } from "vitest";
import { Diagnostics, RollingSamples } from "../src/client/diagnostics";
it("rolling metrics remain finite and bounded and summarize observations rather than retaining event objects", () => {
  const values = new RollingSamples(3);
  for (const n of [1, 2, 3, 4, Infinity, NaN, -1]) values.add(n);
  expect(values.summary()).toEqual({ samples: 3, mean: 3, p95: 3, max: 4 });
  const diagnostics = new Diagnostics(() => ({
    interpolation: { renderTick: 123 },
  }));
  for (let i = 0; i < 1000; i++) {
    diagnostics.frame(i * 16, 1);
    diagnostics.received(i * 33, 3000);
    diagnostics.rtt(50);
    diagnostics.reconcile(i % 10, 50);
    diagnostics.input(i * 17, true);
  }
  diagnostics.input(0, false);
  const result = diagnostics.snapshot();
  expect(result.frame.gapMs.samples).toBe(240);
  expect(result.network.snapshotGapMs.samples).toBe(240);
  expect(result.predictionSamples.correction.samples).toBe(240);
  expect(result.input.rateHz).toBeCloseTo(1000 / 17);
  expect(result.input.rejected).toBe(1);
  const detached = diagnostics.snapshot();
  detached.frame.gapMs.mean = 999;
  expect(diagnostics.snapshot().frame.gapMs.mean).toBe(16);
  expect(JSON.stringify(result)).not.toMatch(/cookie|secret|room|ipAddress/i);
});
