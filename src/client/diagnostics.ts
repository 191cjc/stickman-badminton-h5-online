/** Local opt-in measurements only. No identity, room IDs, commands or uploads. */
export class RollingSamples {
  private values: number[] = [];
  constructor(private readonly limit = 240) {}
  add(value: number): void {
    if (!Number.isFinite(value) || value < 0) return;
    this.values.push(value);
    if (this.values.length > this.limit) this.values.shift();
  }
  summary() {
    const sorted = [...this.values].sort((a, b) => a - b);
    return {
      samples: sorted.length,
      mean: sorted.length
        ? sorted.reduce((a, b) => a + b, 0) / sorted.length
        : 0,
      p95: sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0,
      max: sorted.at(-1) ?? 0,
    };
  }
}
export class Diagnostics {
  private frameGapMs = new RollingSamples();
  private frameCpuMs = new RollingSamples();
  private snapshotGapMs = new RollingSamples();
  private snapshotBytes = new RollingSamples();
  private rttMs = new RollingSamples();
  private correction = new RollingSamples();
  private ackAgeMs = new RollingSamples();
  private inputGapMs = new RollingSamples();
  private longTaskMs = new RollingSamples();
  private lastFrame?: number;
  private lastSnapshot?: number;
  private lastInput?: number;
  private accepted = 0;
  private rejected = 0;
  constructor(private readonly read: () => object) {
    if (
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes.includes("longtask")
    ) {
      const observer = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries())
          this.longTaskMs.add(entry.duration);
      });
      observer.observe({ type: "longtask", buffered: false });
    }
  }
  frame(at: number, cpuMs: number): void {
    if (this.lastFrame !== undefined) this.frameGapMs.add(at - this.lastFrame);
    this.lastFrame = at;
    this.frameCpuMs.add(cpuMs);
  }
  received(at: number, bytes: number): void {
    if (this.lastSnapshot !== undefined)
      this.snapshotGapMs.add(at - this.lastSnapshot);
    this.lastSnapshot = at;
    this.snapshotBytes.add(bytes);
  }
  input(at: number, accepted: boolean): void {
    if (!accepted) {
      this.rejected++;
      return;
    }
    this.accepted++;
    if (this.lastInput !== undefined) this.inputGapMs.add(at - this.lastInput);
    this.lastInput = at;
  }
  reconcile(correction: number, ackAgeMs: number): void {
    this.correction.add(correction);
    this.ackAgeMs.add(ackAgeMs);
  }
  rtt(value: number): void {
    this.rttMs.add(value);
  }
  resetTransport(): void {
    this.lastSnapshot = this.lastInput = undefined;
  }
  snapshot() {
    const frameGap = this.frameGapMs.summary();
    const inputGap = this.inputGapMs.summary();
    return {
      version: 1,
      sampleLimit: 240,
      frame: {
        fps: frameGap.mean ? 1000 / frameGap.mean : 0,
        gapMs: frameGap,
        cpuMs: this.frameCpuMs.summary(),
        longTaskMs: this.longTaskMs.summary(),
      },
      network: {
        snapshotGapMs: this.snapshotGapMs.summary(),
        snapshotBytes: this.snapshotBytes.summary(),
        rttMs: this.rttMs.summary(),
      },
      predictionSamples: {
        correction: this.correction.summary(),
        ackAgeMs: this.ackAgeMs.summary(),
      },
      input: {
        accepted: this.accepted,
        rejected: this.rejected,
        rateHz: inputGap.mean ? 1000 / inputGap.mean : 0,
        gapMs: inputGap,
      },
      ...this.read(),
    };
  }
}
declare global {
  interface Window {
    badmintonDiagnostics?: Readonly<{
      snapshot: () => ReturnType<Diagnostics["snapshot"]>;
    }>;
  }
}
