import { afterEach, expect, it, vi } from "vitest";
import { ConfettiImages, recolorConfetti } from "../src/client/confetti-images";
import { createParticle } from "../src/client/effects";
const template =
  '<svg><filter><feFlood flood-color="#ff0000"/></filter><path fill="#ff0000" data-confetti-body="true" /></svg>';
const images: FakeImage[] = [];
class FakeImage {
  onload?: () => void;
  onerror?: () => void;
  src = "";
  constructor() {
    images.push(this);
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  images.length = 0;
});
it("recolors only the source nested body, preserving independent bevel/flood colors", () => {
  expect(recolorConfetti(template, "#12ab45")).toBe(
    '<svg><filter><feFlood flood-color="#ff0000"/></filter><path fill="#12ab45" data-confetti-body="true" /></svg>',
  );
  expect(() => recolorConfetti(template, "javascript:x")).toThrow();
});
it("revokes Blob URLs on success/error/reset, ignores stale callbacks and retains live pictures after cache eviction", () => {
  vi.stubGlobal("Image", FakeImage);
  let id = 0;
  const make = vi
    .spyOn(URL, "createObjectURL")
    .mockImplementation(() => `blob:${++id}`);
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const owner = new ConfettiImages(template);
  const particle = createParticle("confetti", 0, 0, () => 0.2);
  expect(owner.get(particle)).toBeUndefined();
  images[0].onload!();
  const original = owner.get(particle);
  expect(original).toBe(images[0]);
  expect(revoke).toHaveBeenCalledWith("blob:1");
  for (let i = 0; i < 70; i++) {
    const p = createParticle("confetti", 0, 0, () => i / 100);
    owner.get(p);
    images.at(-1)!.onload!();
  }
  expect(owner.diagnostics().cached).toBe(64);
  expect(owner.get(particle)).toBe(original);
  const pending = createParticle("confetti", 0, 0, () => 0.999);
  owner.get(pending);
  const stale = images.at(-1)!;
  const staleUrl = stale.src;
  owner.reset();
  expect(revoke).toHaveBeenCalledWith(staleUrl);
  stale.onload!();
  expect(owner.diagnostics()).toEqual({ cached: 0, pending: 0 });
  owner.get(pending);
  images.at(-1)!.onerror!();
  expect(owner.diagnostics().pending).toBe(0);
  expect(make.mock.calls.length).toBeLessThan(80);
});
