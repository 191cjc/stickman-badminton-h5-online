# Pixi rendering and atlas contract

## 1. Scope / Trigger

Apply to artwork extraction/baking, `renderer.ts`, atlas loading, confetti, viewport and main loading lifecycle. PixiJS8.22.0 is pinned. Simulation, input scheduling, interpolation, prediction, Effects/Audio clocks and protocol5 are unchanged. Frozen SWF/XML/reference and `public/classic` remain sources, never raster build outputs.

## 2. Signatures

```ts
new Renderer(canvas?, onContextChange?)
load(progress?): Promise<AssetManifest>
prepare(view, state, effects, progress, mirrored = false): Promise<boolean>
readyFor(state): boolean
render(view, state, effects?, mirrored = false): void
domUrl(sourcePath): string
clearEffectsImages(): void
invalidateFrame(): void
diagnostics(): object
destroy(): void
```

Commands: `npm run assets:atlas` generates, `npm run assets:atlas -- --check` independently rebuilds and compares bytes, `npm run assets:verify` validates committed outputs. `npm run build` includes verification. Bake uses pinned Playwright1.62.0 Chromium; install with `npx playwright install chromium`.

## 3. Contracts

- Idle/queue frames without Effects may reuse an unchanged canvas. Compare every consumed value (not object identity); state can mutate in place. Effects-present frames always draw. Resize/prepare/reset/context changes and visible or persisted-pageshow restoration invalidate this signature.
- One main RAF advances presentation. Use direct async `WebGLRenderer`; no Application, Ticker or AnimatedSprite. Import official `pixi.js/unsafe-eval` interpreter adapters so `script-src 'self'` remains valid. Do not add unsafe-eval to CSP.
- Validate source manifest SHA256 against atlas association, schema, paths, unique page ownership, group coverage, dimensions, rects and all pair budgets. Hashed PNG paths plus version query separate releases. This validates trusted release metadata, not fetched-byte cryptographic verification.
- Bake unchanged SVG filters to transparent lossless PNG. Densities HD4/SD2, sparks2/1; native DOM previews. Content dedup retains each DrawFrame's registration. Encode strategies3/0 with identical lossless settings, choose smaller (ties retain3), and identify this with generator pngbest-v2; decoded pixel/metadata equivalence and independent byte reproduction must both pass. Trim only alpha0 pixels; retain filter tails. Pages at most2048,2px neighboring-pixel gutters, clamp edges, linear sampling, no mipmaps. Split oversized art; at internal split boundaries extrude actual adjacent source pixels.
- Compensate each fragment by `x = DrawFrame.x + trim.x * DrawFrame.width / pixelWidth`, likewise y; destination dimensions use actual integer raster extent. Apply local rotation and actor `T(x-.05,y) S(direction*1.25,1.25)` after this mapping. Never infer registration from trimmed bounds alone.
- Groups: court/common + both body groups + swing families. At most96MiB estimated page RGBA for any active pair, each decoded/uploaded page owned once. Select SD if initial world density<=2 or HD does not fit; retain chosen tier across resize/quality. Release obsolete pages before allocating next roles, retain same-role rematch pages. Destroy frame views without double-destroying shared sources.
- Keep the ordinary sprite batch shader to one sampler (`min(deviceLimit,1)`) before first use and after restore. This trades a small number of ordered batches for cheaper fragment work on measured software WebGL; confetti retains its separate two-sampler shader.
- Court clipping uses GL scissor for the single root pass: disable scissor, bind/clear the entire root target with the Pixi background color, enable a pixel-center rounded/clamped world rectangle (bottom-origin Y), render with `clear:false`, and disable in `finally`. No filters, offscreen targets or backBuffer/MSAA pass may be added inside this wrapper without redesigning its clipping ownership. Avoid reinstating a full-court stencil mask without comparable profiling.
- World reflection x'=640-x applies only to background/net, actors/markers/smoke/tail/shuttle and world FX. Ordered layers: world background/net; readable score; world markers/smoke/left swing/body/right swing/body/tail/shuttle; readable brand; readable intro/names; early sparks; readable finish; late sparks; confetti. Source alpha/source-over and frame clocks stay intact.
- Confetti uses one batched mesh: bake black fixed filter base and white-minus-black body contribution, reconstruct premultiplied RGB per particle. Whole-texture tint incorrectly recolors bevel/shadow. Precompile its shader behind the cover.
- Six image workers,15s deadlines include decode/fetch body. Progress reports exact completed decode/upload jobs; explicit `texture.initSource` uploads pace behind paint yields. WebSocket continues under cover; gate controls/input, clear keys at reveal, never reset an active room to menu. Scene changes during prepare retry at most3 times; stale completions cannot reveal. Preserve latest authority as backdrop before room reclamation even while covered.
- WebGL loss prevents default, cancels prepare and invalidates uploads while preserving decoded sources. Independent context generation survives scene cancellation; restore checks limits and reuploads behind cover. Main offers failure/retry after15s; live-room exit stays reachable. Hidden pauses draws/reset elapsed time; terminal pagehide/HMR destroys renderer/listeners/resources; BFCache retains page ownership.
- Stable30Hz and ordinary frame jitter below35ms retain detail. Eligible online windows include point/serve waits because those frames still render. Persistent severe quality windows (mean gap >=70ms and slow fraction >=50%) may skip density levels using the square-root pixel-area estimate with a separate25ms target to leave composition/input headroom. Healthy/ordinary overload retains the existing grace/cooldown and floor1; lone stalls cannot trigger a jump. Keep counters bounded and reset them across hidden/loading/resize boundaries.
- Diagnostics stay opt-in `?debug=1`, numeric and bounded. Page RGBA estimates exclude browser image copies, framebuffer, driver and total process/GPU memory.

## 4. Validation & Error Matrix

| Condition                                   | Expected                                                             |
| ------------------------------------------- | -------------------------------------------------------------------- |
| Wrong source digest/path/rect/group/version | LoadingError incompatible; no partial court                          |
| Decode/fetch failure or timeout             | Abort other workers, suppress late progress, visible native retry    |
| Scene canceled while loading                | Return false, reclaim stale resources; only current pair can reveal  |
| Same pair/new action/mirror/resize          | No new SVG work or page requests; original frame selectors           |
| New role                                    | Release obsolete actor pages, gate until all current groups uploaded |
| Texture cap/budget rejects HD               | Use fitting SD; if neither fits, visible incompatible failure        |
| Context loss/restore                        | No input/draw under cover; reuse decode, reupload current groups     |
| Terminal disposal                           | Abort jobs; destroy texture views/sources/mesh/stage exactly once    |

## 5. Good / Base / Bad Cases

Good: alias artwork shares pixels while keeping fractional source origin, mirrored score reads normally, new swings need no runtime SVG filtering. Base: same-role rematch reuses pages and advances original state clocks. Bad: preload every role at HD, tint an entire filtered confetti sprite, add a second ticker, or call idle after loading.

## 6. Tests Required

`tests/classic/atlas.test.ts` asserts original source hashes, deterministic packing, transparent trim, neighboring gutters, split registration, page limits/budgets and color reconstruction. `renderer-loading.test.ts` uses real scene objects with narrow GPU mocks for exact matrices/order, readable overlays, aliases, bounded loading/deadlines, cancellation/retry, role release, reuse, context restore including scene-cancel race and disposal. Keep existing shared/gameplay and loading tests. Quality tests cover69ms ordinary overload,70ms severe boundary and the measured102.5ms window, alongside healthy30Hz, lone-stall exclusion, minimum samples, cooldown and floor. Sustained70–105ms windows intentionally trade detail earlier; include actual backing/density in comparison reports.

Browser: strict-CSP production build, fixed original Canvas/WebGL pairs for all7 roles/actions/boundaries/FX at SD+HD, actual WebGL loss/restore, PNG failures/retry/exit, two online clients, mirror, controls/settings, resize/hidden/rematch. Same-condition cold/warm75s comparisons must report p95 gaps, long tasks, observed loading, quality and reliable memory/resource limits. Inspect screenshots; image error metrics alone do not prove fidelity. Document headless software WebGL and untested physical/mobile ranges.

## 7. Wrong vs Correct

Wrong: `sprite.tint = confettiColor; ticker.add(() => animation.update())`.

Correct: reconstruct the nested body from baked endpoint textures and read the source-selected frame from existing state/Effects inside the sole main RAF. Set fragment position from source registration plus trim compensation, then apply the existing actor/world transforms.
