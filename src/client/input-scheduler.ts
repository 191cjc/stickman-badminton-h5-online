import { INPUT_HZ } from "../shared/protocol";
const periodMs = 1000 / INPUT_HZ;
const minSpacingMs = periodMs / 4;

/** One paced input per callback, independent of RAF. A stalled page skips stale
 * deadlines rather than delivering a burst of logical simulation steps. */
export class InputScheduler {
  private timer?: ReturnType<typeof setTimeout>;
  private active = false;
  private deadline = 0;
  private ticks = 0;
  private skipped = 0;
  private latenessMs = 0;
  constructor(
    private readonly step: () => void,
    private readonly now = () => performance.now(),
  ) {}
  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.deadline = 0;
    if (active) {
      this.deadline = this.now() + periodMs;
      this.schedule();
    }
  }
  private schedule(): void {
    this.timer = setTimeout(
      () => {
        if (!this.active) return;
        const at = this.now();
        // setTimeout can fire early after rounding. Preserve the logical cadence.
        if (at + 0.01 < this.deadline) {
          this.schedule();
          return;
        }
        this.latenessMs = Math.max(0, at - this.deadline);
        this.ticks++;
        this.step();
        if (!this.active) return;
        const afterStep = this.now();
        // Retain the original phase and skip directly to a future grid point.
        // Sampling remains once per callback, even after a long blocked page.
        const periods = Math.max(
          1,
          Math.floor((afterStep - this.deadline) / periodMs) + 1,
        );
        this.deadline += periods * periodMs;
        this.skipped += periods - 1;
        // Do not turn a just-missed grid into near-immediate adjacent inputs.
        if (this.deadline - afterStep < minSpacingMs) {
          this.deadline += periodMs;
          this.skipped++;
        }
        this.schedule();
      },
      // Browser timer delays truncate fractional milliseconds. Round upward so
      // the usual60Hz interval does not deliberately need an early-wake retry.
      Math.max(1, Math.ceil(this.deadline - this.now())),
    );
  }
  diagnostics() {
    return {
      active: this.active,
      ticks: this.ticks,
      skipped: this.skipped,
      latenessMs: this.latenessMs,
    };
  }
}
