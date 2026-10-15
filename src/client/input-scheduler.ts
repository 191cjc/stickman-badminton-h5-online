import { INPUT_HZ } from "../shared/protocol";
const periodMs = 1000 / INPUT_HZ;
const minSpacingMs = periodMs / 2;

/** One shared timer for periodic and expedited logical samples. Late callbacks
 * skip expired deadlines; neither notifications nor stalls create a wire burst. */
export class InputScheduler {
  private timer?: ReturnType<typeof setTimeout>;
  private active = false;
  private deadline = 0;
  private lastAttempt = -Infinity;
  private expedited = false;
  private running = false;
  private generation = 0;
  private ticks = 0;
  private skipped = 0;
  private expeditedTicks = 0;
  private latenessMs = 0;
  constructor(
    private readonly step: () => void,
    private readonly now = () => performance.now(),
  ) {}
  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    this.generation++;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.expedited = false;
    this.deadline = active
      ? Math.max(this.now() + periodMs, this.lastAttempt + minSpacingMs)
      : 0;
    if (active && !this.running) this.schedule();
  }
  request(): void {
    if (!this.active || this.running) return;
    const wanted = Math.max(this.now(), this.lastAttempt + minSpacingMs);
    if (wanted >= this.deadline) return;
    this.deadline = wanted;
    this.expedited = true;
    clearTimeout(this.timer);
    this.schedule();
  }
  private schedule(): void {
    this.timer = setTimeout(
      () => {
        this.timer = undefined;
        if (!this.active) return;
        const at = this.now();
        if (
          at + 0.001 < this.deadline ||
          at < this.lastAttempt + minSpacingMs
        ) {
          this.schedule();
          return;
        }
        const due = this.deadline;
        const expedited = this.expedited;
        this.expedited = false;
        this.latenessMs = Math.max(0, at - due);
        this.lastAttempt = at;
        this.ticks++;
        if (expedited) this.expeditedTicks++;
        const generation = this.generation;
        this.running = true;
        try {
          this.step();
        } finally {
          this.running = false;
        }
        if (!this.active) return;
        if (generation !== this.generation) {
          this.schedule();
          return;
        }
        const afterStep = this.now();
        if (expedited)
          this.deadline = Math.max(at + periodMs, afterStep + minSpacingMs);
        else {
          const periods = Math.max(
            1,
            Math.floor((afterStep - due) / periodMs) + 1,
          );
          this.deadline = due + periods * periodMs;
          this.skipped += periods - 1;
          if (this.deadline - afterStep < minSpacingMs) {
            this.deadline += periodMs;
            this.skipped++;
          }
        }
        this.schedule();
      },
      Math.max(1, Math.ceil(this.deadline - this.now())),
    );
  }
  diagnostics() {
    return {
      active: this.active,
      ticks: this.ticks,
      skipped: this.skipped,
      expedited: this.expeditedTicks,
      latenessMs: this.latenessMs,
    };
  }
}
