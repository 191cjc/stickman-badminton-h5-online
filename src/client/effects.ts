import {
  seededRandom,
  type ClassicPresentationEvent,
  type PresentationJournal,
  type SoundId,
} from "../shared/classic/presentation";
import {
  cloneClassicPlayer,
  stepClassicPlayer,
} from "../shared/classic/player";
import { CLASSIC_WORLD, emptyClassicIntent } from "../shared/classic/types";
import type { GameState, PlayerState } from "../shared/state";
import type { Snapshot } from "../shared/protocol";

export interface Particle {
  kind: "tail" | "smoke" | "confetti";
  x: number;
  y: number;
  dx: number;
  dy: number;
  spin: number;
  rotation: number;
  scale: number;
  scaleVar: number;
  color?: string;
  random: () => number;
}
export interface Spark {
  x: number;
  y: number;
  dir: number;
  frame: number;
  tick: number;
  order: number;
}
export const MAX_PARTICLES = 768; // source upper bound: 180 tail +180 smoke +292 confetti
const dt = 1 / 60;
const range = (rng: () => number, a: number, b: number) => a + rng() * (b - a);
/** RGB.getUint -> ColorTransform.color integer channels; keep the inclusive source 256 draw. */
export function confettiColor(r: number, g: number, b: number): string {
  // AS3 packs uint offsets with shifts/OR. The 256 carry edge is retained, not clamped.
  return `#${(((r << 16) | (g << 8) | b) & 0xffffff).toString(16).padStart(6, "0")}`;
}
export function createParticle(
  kind: Particle["kind"],
  x: number,
  y: number,
  rng: () => number,
): Particle {
  if (kind === "confetti")
    return {
      kind,
      x,
      y,
      dx: range(rng, 1, 4),
      dy: range(rng, 3, 6),
      spin: 0,
      rotation: 0,
      scale: 1,
      scaleVar: 1,
      color: confettiColor(
        Math.floor(rng() * 257),
        Math.floor(rng() * 257),
        Math.floor(rng() * 257),
      ),
      random: rng,
    };
  const dir = range(
    rng,
    kind === "tail" ? 0 : 145,
    kind === "tail" ? 360 : 215,
  );
  const speed = range(rng, kind === "tail" ? 1 : 2, kind === "tail" ? 3 : 4);
  const angle = ((dir - 90) * Math.PI) / 180;
  return {
    kind,
    x,
    y,
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
    spin: range(rng, 20, 40),
    scaleVar: range(rng, 0.85, 0.95),
    rotation: range(rng, 0, 360),
    scale: 1,
    random: rng,
  };
}
export function stepParticle(p: Particle): boolean {
  p.x += p.dx * 30 * dt;
  p.y += p.dy * 30 * dt;
  p.rotation += p.spin * 30 * dt;
  if (p.kind === "confetti") {
    if (p.random() * 100 < 1.6666) {
      p.dx = range(p.random, 1, 4);
      if (p.random() * 100 < 50) p.dx *= -1;
    }
    return p.y + 4.1 / 2 <= CLASSIC_WORLD.height;
  }
  p.scale *= Math.pow(p.scaleVar, p.kind === "tail" ? 0.5 : 30 * dt);
  return p.scale > 0.1 && p.scale <= 1;
}

/** Authority events only; reconciliation never calls this presentation owner. */
export class Effects {
  readonly particles: Particle[] = [];
  readonly sparks: Spark[] = [];
  private pending: (ClassicPresentationEvent & { suppressSound: boolean })[] =
    [];
  private room = "";
  private cursor = 0;
  private clock = 0;
  private initialized = false;
  private needsBaseline = false;
  private paused = false;
  private celebration = false;
  private resultAccumulator = 0;
  private resultAge = 0;
  private resultPlayers?: Record<"left" | "right", PlayerState>;
  private resultRandom = seededRandom(0x90302c);
  private soundEnabled = true;
  finishOrder = Infinity;
  reset(room = "", resumed = false): void {
    this.room = room;
    this.cursor = 0;
    this.clock = 0;
    this.initialized = false;
    this.needsBaseline = resumed;
    this.paused = false;
    this.pending = [];
    this.particles.length = 0;
    this.sparks.length = 0;
    this.celebration = false;
    this.resultAge = 0;
    this.resultAccumulator = 0;
    this.resultPlayers = undefined;
    this.finishOrder = Infinity;
    this.resultRandom = seededRandom(0x90302c);
    this.soundEnabled = true;
  }
  suspend(): void {
    this.pending = [];
    this.particles.length = 0;
    this.sparks.length = 0;
    this.paused = true;
    this.needsBaseline = true;
  }
  ingest(snapshot: Snapshot): void {
    if (snapshot.room !== this.room) return;
    if (snapshot.status === "reconnecting") {
      this.suspend();
      return;
    }
    const tick = Math.floor(snapshot.state.elapsed * 60 + 1e-6);
    if (this.needsBaseline) {
      this.cursor = snapshot.effects.cursor;
      this.pending = [];
      this.clock = tick;
      this.needsBaseline = false;
      this.initialized = true;
    } else this.receive(snapshot.effects, tick);
    this.paused = false;
    if (snapshot.status === "finished")
      this.finish(snapshot.resultReason === "score", snapshot.state);
  }
  private receive(journal: PresentationJournal, tick: number): void {
    if (!this.initialized) {
      this.clock = Math.max(0, tick - 30);
      this.initialized = true;
    }
    if (journal.events.length && journal.events[0].id > this.cursor + 1) {
      // Journal gap: establish a new cursor. Historical sounds are never replayed.
      this.pending = [];
      this.cursor = journal.cursor;
      this.clock = tick;
      return;
    }
    for (const e of journal.events) {
      if (e.id <= this.cursor) continue;
      this.cursor = e.id;
      if (tick - e.tick > 30) continue;
      // Suppression belongs to its retained event, so bounded queue eviction
      // cannot leave an independent history of discarded IDs behind.
      this.pending.push({ ...e, suppressSound: tick - e.tick > 6 });
    }
    this.cursor = Math.max(this.cursor, journal.cursor);
    if (this.pending.length > 128)
      this.pending.splice(0, this.pending.length - 128);
  }
  finish(natural: boolean, state?: GameState): void {
    if (!natural) {
      this.celebration = false;
      this.particles.length = 0;
      this.sparks.length = 0;
      this.pending = [];
      this.needsBaseline = true;
      return;
    }
    if (!this.celebration) {
      this.celebration = true;
      this.resultAge = 0;
      this.finishOrder =
        this.pending.find((e) => e.kind === "victory")?.id ?? this.cursor + 0.5;
    }
    if (state && !this.resultPlayers)
      this.resultPlayers = {
        left: cloneClassicPlayer(state.players.left),
        right: cloneClassicPlayer(state.players.right),
      };
  }
  advance(
    authorityTick: number,
    frameDt: number,
    onSound: (sound: SoundId) => void,
  ): void {
    if (this.paused || !this.initialized) return;
    const target = Math.max(this.clock, Math.floor(authorityTick + 1e-6));
    // On large presentation gaps skip historical audio, fast-forward particles within bounded lifetime.
    const gap = target - this.clock;
    if (gap > 120) {
      this.particles.length = 0;
      this.sparks.length = 0;
      this.clock = target - 30;
      this.soundEnabled = false;
    }
    this.applyPending(this.clock, target, onSound);
    while (this.clock < target) {
      this.clock++;
      this.step();
      this.applyPending(this.clock, target, onSound);
    }
    this.soundEnabled = true;
    if (this.celebration) {
      this.resultAccumulator += Math.min(Math.max(frameDt, 0), 0.25);
      while (this.resultAccumulator + 1e-9 >= dt) {
        this.resultAccumulator -= dt;
        this.resultAge += dt;
        this.step();
        if (this.resultRandom() * 100 < 70)
          this.addParticle(
            createParticle(
              "confetti",
              this.resultRandom() * 640,
              -10,
              this.resultRandom,
            ),
          );
        if (this.resultPlayers)
          for (const p of Object.values(this.resultPlayers)) {
            // Original actor callbacks/independent clips continue after victory.
            // These deep copies use empty input; no ball/score/authority events run here.
            stepClassicPlayer(p, emptyClassicIntent(), dt, {
              pointActive: false,
            });
            if (p.characterId === "toaster" && this.resultRandom() * 100 < 25)
              this.addParticle(
                createParticle(
                  "smoke",
                  p.x + range(this.resultRandom, -5, 5) - 0.05,
                  p.y - 60,
                  this.resultRandom,
                ),
              );
          }
      }
    }
  }
  private applyPending(
    tick: number,
    presentationTick: number,
    onSound: (sound: SoundId) => void,
  ): void {
    const ready = this.pending.filter((e) => e.tick <= tick);
    this.pending = this.pending.filter((e) => e.tick > tick);
    for (const e of ready) {
      if (e.kind === "victory" && this.celebration) this.finishOrder = e.id;
      const age = tick - e.tick;
      if (
        "sound" in e &&
        age <= 6 &&
        presentationTick - e.tick <= 6 &&
        this.soundEnabled &&
        !e.suppressSound
      )
        onSound(e.sound);
      if (e.kind === "shot" && age < 21)
        this.sparks.push({
          x: e.x,
          y: e.y,
          dir: e.dir,
          frame: 1 + age,
          tick: e.tick,
          order: e.id,
        });
      if ((e.kind === "tail" || e.kind === "smoke") && age < 90) {
        const rng = seededRandom(e.seed);
        for (let i = 0; i < (e.kind === "tail" ? 2 : 1); i++) {
          const p = createParticle(e.kind, e.x - 0.05, e.y, rng);
          let live = true;
          for (let f = 0; f < age && live; f++) live = stepParticle(p);
          if (live) this.addParticle(p);
        }
      }
    }
  }
  private addParticle(p: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push(p);
  }
  private step(): void {
    for (let i = this.particles.length - 1; i >= 0; i--)
      if (!stepParticle(this.particles[i])) this.particles.splice(i, 1);
    for (let i = this.sparks.length - 1; i >= 0; i--)
      if (++this.sparks[i].frame >= 22) this.sparks.splice(i, 1);
  }
  get introAlpha(): number {
    return Math.max(
      0,
      Math.min(1, 1 - 3 * (this.clock / 60 + this.resultAge - 2)),
    );
  }
  get finishAlpha(): number {
    return this.celebration ? Math.min(1, this.resultAge * 4.5) : 0;
  }
  get frozenPlayers(): Record<"left" | "right", PlayerState> | undefined {
    return this.resultPlayers;
  }
  get celebrating(): boolean {
    return this.celebration;
  }
  diagnostics() {
    return {
      cursor: this.cursor,
      clock: this.clock,
      pending: this.pending.length,
      suppressedSounds: this.pending.filter(
        (e) => e.suppressSound && "sound" in e,
      ).length,
      particles: this.particles.length,
      sparks: this.sparks.length,
      paused: this.paused,
      resultAge: this.resultAge,
    };
  }
}
