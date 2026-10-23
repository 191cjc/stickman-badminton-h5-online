/** Presentation cost control only; never changes world geometry or simulation. */
export const RENDER_QUALITY = Object.freeze({
  windowMs: 2000,
  // Preserve stable 30 Hz detail, allowing ordinary timer jitter around 33 ms.
  slowFrameMs: 35,
  // Severe overload needs headroom for game/DOM/composition work after resize.
  severeTargetFrameMs: 25,
  slowFraction: 0.5,
  minSamples: 4,
  maxSamples: 240,
  graceMs: 1000,
  cooldownMs: 6000,
  worldDensityLevels: Object.freeze([4, 2.8, 2, 1.4, 1]),
});

export interface QualityFrame {
  ready: boolean;
  visible: boolean;
  focused: boolean;
  presenting: boolean;
  nativeDpr: number;
  scale: number;
}

function nativeDensity(dpr: number): number {
  return Number.isFinite(dpr) && dpr > 0 ? Math.min(dpr, 2) : 1;
}

/** Lower-only, page-lifetime cap. A reload is the only automatic quality reset. */
export class RenderQuality {
  private cap?: number;
  private lastFrame?: number;
  private windowStart?: number;
  private samples = 0;
  private slowSamples = 0;
  private meanGap = 0;
  private graceUntil = 0;
  private cooldownUntil = 0;
  private eligible = false;
  private nativeDpr = 1;
  private scale = 1;
  private observedAt = 0;
  private reductions = 0;
  private lastWindowSlowFraction = 0;
  private lastWindowMeanGap = 0;

  dpr(nativeDpr: number, scale: number): number {
    const native = nativeDensity(nativeDpr);
    return this.cap !== undefined && Number.isFinite(scale) && scale > 0
      ? Math.min(native, this.cap / scale)
      : native;
  }

  /** Ignore transition/blur/loading time, retaining a cap already earned. */
  resetObservation(at: number): void {
    this.lastFrame = undefined;
    this.clearWindow();
    this.eligible = false;
    if (Number.isFinite(at) && at >= 0) {
      this.observedAt = at;
      this.graceUntil = at + RENDER_QUALITY.graceMs;
    }
  }

  /** Returns true once per decrease, so the caller resizes the render backing. */
  observe(at: number, frame: QualityFrame): boolean {
    if (!Number.isFinite(at) || at < this.observedAt) return false;
    this.observedAt = at;
    if (
      !frame.ready ||
      !frame.visible ||
      !frame.focused ||
      !frame.presenting ||
      !Number.isFinite(frame.scale) ||
      frame.scale <= 0
    ) {
      this.resetObservation(at);
      return false;
    }
    const native = nativeDensity(frame.nativeDpr);
    if (
      !this.eligible ||
      native !== this.nativeDpr ||
      frame.scale !== this.scale
    ) {
      this.resetObservation(at);
      this.eligible = true;
      this.nativeDpr = native;
      this.scale = frame.scale;
      this.lastFrame = at;
      return false;
    }
    const previous = this.lastFrame;
    this.lastFrame = at;
    const start = Math.max(this.graceUntil, this.cooldownUntil);
    if (previous === undefined || previous < start || at <= previous) {
      this.clearWindow();
      return false;
    }
    this.windowStart ??= previous;
    // Counters only: no per-frame history or diagnostic observer is needed.
    if (this.samples < RENDER_QUALITY.maxSamples) {
      const gap = at - previous;
      this.samples++;
      if (gap > RENDER_QUALITY.slowFrameMs) this.slowSamples++;
      this.meanGap += (gap - this.meanGap) / this.samples;
    }
    // Severe overload can produce fewer than four frames in two seconds.
    // Keep that evidence until both completion bounds hold, rather than
    // repeatedly clearing an undersampled window that can never lower quality.
    if (
      at - this.windowStart < RENDER_QUALITY.windowMs ||
      this.samples < RENDER_QUALITY.minSamples
    )
      return false;
    this.lastWindowSlowFraction = this.slowSamples / this.samples;
    this.lastWindowMeanGap = this.meanGap;
    const overloaded =
      this.lastWindowSlowFraction >= RENDER_QUALITY.slowFraction;
    this.clearWindow();
    if (!overloaded) return false;
    const actualDensity = this.dpr(native, frame.scale) * frame.scale;
    // Pixel area scales with density squared. A whole severely slow window
    // can skip levels; the slow-frame fraction still excludes isolated stalls.
    // Use a tighter target than the 30 Hz observation tolerance to leave
    // headroom, without lowering detail on an already stable 30 Hz court.
    const targetDensity =
      this.lastWindowMeanGap >= 2 * RENDER_QUALITY.slowFrameMs
        ? Math.max(
            1,
            actualDensity *
              Math.sqrt(
                RENDER_QUALITY.severeTargetFrameMs / this.lastWindowMeanGap,
              ),
          )
        : actualDensity;
    const next = RENDER_QUALITY.worldDensityLevels.find(
      (level) =>
        level < actualDensity - 1e-6 &&
        level <= targetDensity + 1e-6 &&
        (this.cap === undefined || level < this.cap),
    );
    if (next === undefined) return false;
    this.cap = next;
    this.reductions++;
    this.cooldownUntil = at + RENDER_QUALITY.cooldownMs;
    this.resetObservation(at);
    return true;
  }

  private clearWindow(): void {
    this.windowStart = undefined;
    this.samples = this.slowSamples = 0;
    this.meanGap = 0;
  }

  diagnostics() {
    const dpr = this.dpr(this.nativeDpr, this.scale);
    return {
      stage:
        this.cap === undefined
          ? 0
          : RENDER_QUALITY.worldDensityLevels.indexOf(this.cap) + 1,
      limited: this.cap !== undefined,
      worldDensityCap: this.cap ?? 0,
      nativeDpr: this.nativeDpr,
      effectiveDpr: dpr,
      worldScale: this.scale,
      worldDensity: dpr * this.scale,
      reductions: this.reductions,
      eligible: this.eligible,
      samples: this.samples,
      slowSamples: this.slowSamples,
      lastWindowSlowFraction: this.lastWindowSlowFraction,
      lastWindowMeanGap: this.lastWindowMeanGap,
      graceRemainingMs: Math.max(0, this.graceUntil - this.observedAt),
      cooldownRemainingMs: Math.max(0, this.cooldownUntil - this.observedAt),
    };
  }
}
