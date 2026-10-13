import { classicAssetData } from "./assets-data";

/** Geometry in original Joe coordinates, BEFORE the runtime ±1.25 / +1.25 scale. */
export const classicGeometry = classicAssetData.geometry;
export const classicAnimation = classicAssetData.animation;
export type ClassicRacketKind = "serve" | "overhead" | "underhand";
export interface ClassicPoint {
  readonly x: number;
  readonly y: number;
}
export interface ClassicRect extends ClassicPoint {
  readonly width: number;
  readonly height: number;
}
export interface ClassicRacketPose {
  /** Racket.rotation in currentSwing-local degrees, as used by the original shot code. */
  readonly rotation: number;
  /** Stage-axis bounding rectangle at Joe scale +1, matching hitTestPoint(false). */
  readonly hitbox: ClassicRect;
}

/** Flash frames are 1-based; hold the last pose if the action has completed. */
export function racketPose(
  kind: ClassicRacketKind,
  frame: number,
): ClassicRacketPose {
  const poses = classicAssetData.poses[kind];
  const index = Number.isFinite(frame)
    ? Math.min(poses.length - 1, Math.max(0, Math.trunc(frame) - 1))
    : 0;
  return poses[index];
}
