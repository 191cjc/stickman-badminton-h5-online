import { afterEach, expect, it, vi } from "vitest";
import { InputScheduler } from "../src/client/input-scheduler";
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it.each([15, 30, 60, 144])(
  "samples at the same logical rate while an independent renderer runs at %iHz",
  async (rafHz) => {
    vi.useFakeTimers();
    const step = vi.fn();
    const scheduler = new InputScheduler(step, () => Date.now());
    const render = vi.fn();
    const raf = setInterval(render, 1000 / rafHz);
    scheduler.setActive(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(step.mock.calls.length).toBeGreaterThanOrEqual(59);
    expect(step.mock.calls.length).toBeLessThanOrEqual(60);
    expect(render.mock.calls.length).toBeGreaterThanOrEqual(rafHz - 1);
    scheduler.setActive(false);
    clearInterval(raf);
    expect(vi.getTimerCount()).toBe(0);
  },
);
it("a blocked callback sends at most one input, skips old deadlines, and stop/resume never pours a hidden backlog", async () => {
  vi.useFakeTimers();
  let offset = 0;
  const step = vi.fn();
  const scheduler = new InputScheduler(step, () => Date.now() + offset);
  scheduler.setActive(true);
  offset = 1000;
  await vi.advanceTimersByTimeAsync(17);
  expect(step).toHaveBeenCalledOnce();
  expect(scheduler.diagnostics().skipped).toBeGreaterThanOrEqual(59);
  scheduler.setActive(false);
  await vi.advanceTimersByTimeAsync(5000);
  expect(step).toHaveBeenCalledOnce();
  scheduler.setActive(true);
  scheduler.setActive(true);
  expect(vi.getTimerCount()).toBe(1);
  await vi.advanceTimersByTimeAsync(16);
  expect(step).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(2);
  expect(step).toHaveBeenCalledTimes(2);
  scheduler.setActive(false);
});
it("release during a callback cancels the page-owned timer without creating another chain", async () => {
  vi.useFakeTimers();
  const scheduler = new InputScheduler(
    () => scheduler.setActive(false),
    () => Date.now(),
  );
  scheduler.setActive(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(scheduler.diagnostics().ticks).toBe(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("rounds the initial fractional delay upward and does not schedule an early retry for each input", async () => {
  vi.useFakeTimers();
  const began = Date.now();
  const scheduled = vi.spyOn(globalThis, "setTimeout");
  const accepted: number[] = [];
  const scheduler = new InputScheduler(
    () => accepted.push(Date.now() - began),
    () => Date.now() - began,
  );
  scheduler.setActive(true);
  expect(scheduled.mock.calls[0][1]).toBe(17);
  await vi.advanceTimersByTimeAsync(16);
  expect(accepted).toEqual([]);
  await vi.advanceTimersByTimeAsync(34);
  expect(accepted).toEqual([17, 34, 50]);
  // Initial timer plus exactly one successor per accepted sample: no16ms+1ms
  // two-wakeup chain that can cross into the next busy rendering interval.
  expect(scheduled).toHaveBeenCalledTimes(4);
  scheduler.setActive(false);
});
it("late callbacks preserve the first future phase grid instead of restarting another full interval", async () => {
  vi.useFakeTimers();
  const began = Date.now();
  let offset = 0;
  const accepted: number[] = [];
  const now = () => Date.now() - began + offset;
  const scheduler = new InputScheduler(() => accepted.push(now()), now);
  scheduler.setActive(true);
  offset = 40;
  await vi.advanceTimersByTimeAsync(17);
  expect(accepted).toEqual([57]);
  // The original future grid is66.67ms:10ms away, versus resetting to73.67ms.
  await vi.advanceTimersByTimeAsync(9);
  expect(accepted).toEqual([57]);
  await vi.advanceTimersByTimeAsync(1);
  expect(accepted).toEqual([57, 67]);
  expect(scheduler.diagnostics().skipped).toBe(2);
  scheduler.setActive(false);
});
it("a future grid less than a quarter-period away is skipped rather than creating an adjacent input burst", async () => {
  vi.useFakeTimers();
  const began = Date.now();
  let offset = 0;
  const accepted: number[] = [];
  const now = () => Date.now() - began + offset;
  const scheduler = new InputScheduler(() => accepted.push(now()), now);
  scheduler.setActive(true);
  offset = 32;
  await vi.advanceTimersByTimeAsync(17);
  expect(accepted).toEqual([49]);
  // The50ms grid is just1ms away: skip it and wait for66.67ms instead.
  expect(scheduler.diagnostics().skipped).toBe(2);
  await vi.advanceTimersByTimeAsync(5);
  expect(accepted).toEqual([49]);
  await vi.advanceTimersByTimeAsync(13);
  expect(accepted).toEqual([49, 67]);
  scheduler.setActive(false);
});
it("logical-change requests coalesce, retime periodic work and share an8.33ms minimum spacing", async () => {
  vi.useFakeTimers();
  const began = Date.now();
  const times: number[] = [];
  const scheduler = new InputScheduler(
    () => times.push(Date.now() - began),
    () => Date.now() - began,
  );
  scheduler.request();
  expect(vi.getTimerCount()).toBe(0);
  scheduler.setActive(true);
  scheduler.request();
  scheduler.request();
  expect(vi.getTimerCount()).toBe(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(times).toEqual([1]);
  for (let i = 0; i < 1000; i++) {
    scheduler.request();
    await vi.advanceTimersByTimeAsync(1);
    expect(vi.getTimerCount()).toBe(1);
  }
  expect(times.length).toBeLessThanOrEqual(121);
  expect(times.length).toBeGreaterThan(100);
  for (let i = 1; i < times.length; i++)
    expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(1000 / 120);
  // Let the one outstanding expedited request run, then periodic resumes.
  await vi.advanceTimersByTimeAsync(9);
  const last = times.at(-1)!;
  await vi.advanceTimersByTimeAsync(17);
  expect(times.at(-1)! - last).toBeGreaterThanOrEqual(16);
  expect(scheduler.diagnostics().expedited).toBeGreaterThan(0);
  scheduler.setActive(false);
  scheduler.request();
  expect(vi.getTimerCount()).toBe(0);
});
it("stop/restart inside callback creates one fresh chain and stopping with pending expedited work cancels it", async () => {
  vi.useFakeTimers();
  let calls = 0;
  const scheduler = new InputScheduler(
    () => {
      calls++;
      if (calls === 1) {
        scheduler.setActive(false);
        scheduler.setActive(true);
      }
    },
    () => Date.now(),
  );
  scheduler.setActive(true);
  scheduler.request();
  await vi.advanceTimersByTimeAsync(1);
  expect(calls).toBe(1);
  expect(vi.getTimerCount()).toBe(1);
  await vi.advanceTimersByTimeAsync(17);
  expect(calls).toBe(2);
  scheduler.request();
  scheduler.setActive(false);
  await vi.advanceTimersByTimeAsync(1000);
  expect(calls).toBe(2);
  expect(vi.getTimerCount()).toBe(0);
});
