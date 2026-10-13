import { classicAssetData } from "./assets-data";
import { CHARACTERS, type CharacterId } from "./characters";

export const classicAnimation = {
  ...classicAssetData.animation,
  ...classicAssetData.families.adult.animation,
};
/** Default Joe geometry kept as a source regression oracle. */
export const classicGeometry = {
  ...classicAssetData.families.adult.geometry,
  net: classicAssetData.net,
};
export const characterGeometry = (id: CharacterId) =>
  classicAssetData.families[CHARACTERS[id].family].geometry;
export const characterAnimation = (id: CharacterId) =>
  classicAssetData.families[CHARACTERS[id].family].animation;
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
  readonly rotation: number;
  readonly hitbox: ClassicRect;
}
/** Original mounted geometry BEFORE mirrored runtime scale; frames are 1-based. */
export function racketPose(
  kind: ClassicRacketKind,
  frame: number,
  id: CharacterId = "joe",
): ClassicRacketPose {
  const poses = classicAssetData.families[CHARACTERS[id].family].poses[kind];
  const index = Number.isFinite(frame)
    ? Math.min(poses.length - 1, Math.max(0, Math.trunc(frame) - 1))
    : 0;
  return poses[index];
}
