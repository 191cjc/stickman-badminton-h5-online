import type { Particle } from "./effects";
/** Source shape279 recolor happens inside the unchanged outer bevel/glow tree. */
export function recolorConfetti(template: string, color: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("invalid_confetti_color");
  let count = 0;
  const result = template.replace(/<path\b[^>]*>/g, (path) => {
    if (!path.includes('data-confetti-body="true"')) return path;
    count++;
    return path.replace(/fill="[^"]*"/, `fill="${color}"`);
  });
  if (count !== 1) throw new Error("confetti_body_missing");
  return result;
}
interface ImageEntry {
  image: HTMLImageElement;
  ready: boolean;
}
export class ConfettiImages {
  private generation = 0;
  private particles = new WeakMap<Particle, ImageEntry>();
  private cache = new Map<string, ImageEntry>();
  private pending = new Set<string>();
  constructor(private readonly template: string) {}
  get(particle: Particle): HTMLImageElement | undefined {
    if (!particle.color) return;
    let entry = this.particles.get(particle);
    if (!entry) {
      entry = this.cache.get(particle.color);
      if (!entry) {
        if (this.pending.size >= 768) return;
        const image = new Image();
        entry = { image, ready: false };
        const current = entry;
        const generation = this.generation;
        const color = particle.color;
        const url = URL.createObjectURL(
          new Blob([recolorConfetti(this.template, color)], {
            type: "image/svg+xml",
          }),
        );
        this.pending.add(url);
        const revoke = () => {
          URL.revokeObjectURL(url);
          this.pending.delete(url);
        };
        image.onload = () => {
          revoke();
          if (generation !== this.generation) return;
          current.ready = true;
          this.cache.delete(color);
          this.cache.set(color, current);
          while (this.cache.size > 64)
            this.cache.delete(this.cache.keys().next().value!);
        };
        image.onerror = () => {
          revoke();
        };
        image.src = url;
      }
      this.particles.set(particle, entry);
    }
    return entry.ready ? entry.image : undefined;
  }
  reset(): void {
    this.generation++;
    for (const url of this.pending) URL.revokeObjectURL(url);
    this.pending.clear();
    this.cache.clear();
    this.particles = new WeakMap();
  }
  diagnostics() {
    return { cached: this.cache.size, pending: this.pending.size };
  }
}
