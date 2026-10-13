import { CLASSIC_WORLD, type ClassicClipState } from "./types";

/** bobby.§ null§.handleStageAdd resets the custom clock to zero. */
export const createClassicClip = (): ClassicClipState => ({
  frame: 1,
  clock: 0,
  playing: false,
});

/** gotoAndStop(1)/stop store currentFrame/fps, unlike the stage-add reset. */
export function resetClassicClip(clip: ClassicClipState): void {
  clip.frame = 1;
  clip.clock = 1 / CLASSIC_WORLD.fps;
  clip.playing = false;
}

/** Original custom callback visits each crossed frame and executes its scripts. */
export function advanceClassicClip(
  clip: ClassicClipState,
  frames: number,
  dt: number,
  onFrame: (frame: number) => void = () => {},
): void {
  if (!clip.playing || !(dt > 0) || !Number.isFinite(dt)) return;
  clip.clock += dt;
  const target = Math.floor(clip.clock * CLASSIC_WORLD.fps + 1e-9) + 1;
  const advance = target - clip.frame;
  for (let i = 0; i < advance && clip.playing; i++) {
    clip.frame = (clip.frame % frames) + 1;
    // All three Joe action clips and the original net stop on frame 1.
    if (clip.frame === 1) resetClassicClip(clip);
    onFrame(clip.frame);
  }
}
