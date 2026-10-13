import type { CharacterId } from "./characters";
import type { ClassicBodyFrame, ClassicSwingKind } from "./types";
import type { SoundId } from "./presentation";
export interface DrawFrame {
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  filterPadding: number;
}
export interface AssetManifest {
  schema: 2;
  fps: number;
  coordinateSystem: { width: number; height: number };
  characters: Record<
    CharacterId,
    {
      family: "adult" | "toaster";
      body: Record<ClassicBodyFrame, DrawFrame[]>;
      preview: DrawFrame;
      bodySymbols: Record<ClassicBodyFrame, number[]>;
      bodyDepths: Record<ClassicBodyFrame, number[]>;
    }
  >;
  families: Record<
    "adult" | "toaster",
    { swings: Record<ClassicSwingKind, DrawFrame[]> }
  >;
  effects: Record<
    "spark" | "tail" | "smoke" | "confetti",
    { frames: DrawFrame[]; originalSymbol: number; removeFrame: number | null }
  >;
  sounds: Record<
    SoundId | "music" | "hover" | "press",
    {
      path: string;
      originalSymbol: number;
      sha256: string;
      seekSamples: number;
    }
  >;
  background: DrawFrame;
  courtBrand: DrawFrame;
  markers: DrawFrame;
  shuttle: DrawFrame;
  netFrames: DrawFrame[];
  ui: Record<
    "intro" | "finish" | "rematchUp" | "rematchOver" | "moreUp" | "moreOver",
    DrawFrame
  >;
  uiSources: Record<string, { symbol: number; frame: number }>;
  scores: Record<string, DrawFrame>;
  introNames: Record<string, DrawFrame>;
  files: Record<string, string>;
}
