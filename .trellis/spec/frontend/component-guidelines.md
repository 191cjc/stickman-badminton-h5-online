# DOM and Canvas components

## Composition

The page is static [HTML](../../../index.html) with DOM coordination in [main.ts](../../../src/client/main.ts). There is no component framework, custom hook system, or global state library. Keep behavior in the existing controller classes and use the central scene helpers (`overlay`, `buttons`, `labels`, `updateHud`) for consistent UI transitions.

The local element lookup checks presence and uses a generic assertion:

```typescript
function el<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing element: ${id}`);
  return value as T;
}
```

Its generic does not validate the tag at runtime. When changing an element ID/type, update HTML and all typed lookups together. Use `textContent` for status/message text and the `hidden` property for visibility, matching existing helpers; do not interpolate network text into HTML.

## Canvas presentation

[Renderer.render](../../../src/client/renderer.ts) consumes `GameState` and `Viewport`; it loads the extracted `public/classic/manifest.json` and SVG image layers. Renderer must not decide collisions, scores, room status, or gameplay input.

The frame loop measures Canvas CSS dimensions, calculates a uniform world scale, and sets the drawing transform. Native DPR is capped at2; the page-owned RenderQuality policy may reduce backing DPR further under persistent overload (see below). Preserve the640×426 world mapping from [CLASSIC_WORLD](../../../src/shared/classic/types.ts) rather than changing physics coordinates to fit the screen.

Draw per-role family swing/body/attachments at their source depth, mirrored at±1.25horizontal/1.25vertical and the same1-basedframe as numeric authority. Pirate depth21 attachment is above swing; Toaster uses dedicated poses. The serve layer already contains its attached shuttle; draw the standalone shuttle only after release. Manifest dimensions/fps must agree with the simulation.

## Styling and accessibility

Use the existing global [CSS](../../../src/client/style.css), semantic buttons, Chinese labels, labeled Canvas, labeled directional touch buttons, and live match-status region. `[hidden]` must remain effective despite layout rules. Keep visible action buttons keyboard accessible and maintain their disabled/visibility rules across scene changes.

Canvas is focusable; matching explicitly focuses it. Touch buttons keep pointer cancellation handling described in [event lifecycle](event-lifecycle.md). Visual scaling and actual keyboard/touch behavior require manual browser verification; type checking alone cannot prove them.

## Match actions inside the court

Keep the existing `start` and `cancel` native buttons in the court's menu overlay. `buttons()` retains their scene visibility and start/rematch label; moving DOM nodes must not duplicate listeners or commands.

The `leave` button belongs to an independent court action layer, outside `#overlay`. `overlay(..., false)` hides the whole menu during online play, so an end-match button nested there would disappear. Keep it available during active play and reconnect pauses according to `buttons()`.

Size the presentation in CSS and retain the centered Canvas world transform. Reserve space for the scoreboard and live match status when positioning the menu and corner action. Narrow or short screens need reachable menu actions, including overflow handling where necessary; avoid covering the scoreboard with the end-match button. A wide viewport can still produce a narrow court through its height-based width limit: the compact scoreboard rules apply when viewport width is at most 640px **or** height is at most 540px, reserving122px on the right. Compact actions use two columns for mute/settings and a second row for end-match; the settings panel starts below them. Check these constraints manually without changing world coordinates or authoritative game state.

Seven native `[data-character]` buttons provide original previews and aria-pressed selection; disable them in queue/room, allow selection after result. Remove practice entirely. Keep `#mute` with aria-pressed and M feedback accessible outside the hidden menu. Source Intro/Finish art is Canvas presentation; online matching/result actions stay accessible native DOM buttons.

`#settings` also lives outside the menu overlay, with `aria-expanded`/`aria-controls` for `#settings-panel`. Its native `#self-left-view` checkbox follows the [self-left perspective contract](state-management.md#optional-self-left-perspective). Keep its loading/inert gate, readable source art, native Space behavior and compact action/panel layout. The match continues while the panel is open; gameplay input is gated until it closes.

## Filter-preserving raster contract

### 1. Scope / Trigger

Renderer caches unchanged source SVGs including original filters. Repeated filtered SVG drawing caused browser raster long tasks in two-pageDPR1/2 measurements. Never delete filters to optimize product rendering.

### 2. Signatures

[RasterCache](../../../src/client/raster-cache.ts): `get(key, image, width, height, scale): CanvasImageSource`, `clear(): void`, `diagnostics()`. `deviceRasterScale(matrix)` uses the largest column length of the actual transform, including DPR/world/rotation/mirroring. `rasterPlan(width,height,scale)` returns backing width/height/bytes or undefined.

### 3. Contracts

Half-octave scale buckets0.25..4. Floor-round backing dimensions; maximum side4096, one entry24MiB (RGBA estimate). Main raster LRU256entries/64MiB; separate tinted-confetti raster LRU768entries/32MiB protects the court working set. Oversized sources reduce backing density, retaining source dimensions/origin/filter padding at destination. Estimates exclude browser/GPU copies and loaded source SVGs. Main calls Renderer.clearEffectsImages when a prior scene returns to idle, on queue/matched and on entering reconnect pause, clearing both rasters and old Blob ownership. Repeated empty idle and paused snapshots keep the current cache; results retain their current court/actors until the next reset. Menu role previews are DOM images; the next queue/room resets the raster scene. Cache IDs combine source identity and actual backing size. Draw layers and source frames are unchanged.

### 4. Validation & Error Matrix

| Condition                         | Expected                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Same source/size bucket           | Cache hit; no repeated SVG filtering                                                                                               |
| Changed transform/bucket          | New bounded backing size                                                                                                           |
| Byte/count pressure               | Evict least-recently-used entry and zero its Canvas                                                                                |
| Oversized source                  | Lower bounded raster density, original destination registration                                                                    |
| Allocation/context/draw exception | Return original SVG; suppress retries while its ID remains in the bounded failure set; clear or failure-set eviction permits retry |
| Room/role/result exit             | Release backing stores and stale tinted scene resources                                                                            |

### 5. Good / Base / Bad Cases

Good: mirrored Pirate attachment keeps source origin with transformed cached drawing. Base: static court reuses filtered raster. Bad: tint a whole filtered image, remove filter attributes, allocate one Canvas for every particle scale, or report96MiB as total process memory.

### 6. Tests Required

Raster tests assert original source filtering/reuse, registration/padding under mirrored rotation, bucket reuse/change, huge sizes, LRU byte/count bounds, allocation fallback and clear. Browser compares filters-intact two-pageDPR1/2 frame p95/long tasks, original spark/trail/smoke/confetti, role switch and resize. Headless measurements do not establish user-device FPS or native Flash pixel parity.

### 7. Wrong vs Correct

Wrong: remove SVG filters or repeatedly draw the SVG during every RAF. Correct: lazily rasterize the unchanged image at a bounded transform bucket, draw at source x/y/width/height, and clean up on scene transitions.

### Content identity and density invalidation

Renderer keys source rasters by `manifest.files[frame.path]` SHA-256 plus planned backing width/height; preparation deduplicates by exactly the same identity. This is trusted release-manifest sharing, not browser verification of fetched bytes. Byte-identical Toaster/net/spark aliases share backing stores, while each `DrawFrame` keeps its own destination x/y/width/height. Different hashes or backing dimensions must not alias. Retain the existing path fallback and allocation-failure bounds.

`Renderer.invalidateRasters(): void` clears both raster LRUs and invalidates preparation generation. It preserves loaded source images, live tinted-confetti images, Effects and Audio. Use it for density changes; use `clearEffectsImages()` for full scene color/raster cleanup. Never stop a live spark or revoke live confetti merely because backing resolution changed. `renderer-loading.test.ts` covers actual aliases, separate registration, distinct contents/sizes, preparation identity/generation and live-effect preservation.

## Adaptive backing density

[RenderQuality](../../../src/client/render-quality.ts) owns `dpr(nativeDpr, scale)`, `observe(at, QualityFrame): boolean`, `resetObservation(at)` and detached `diagnostics()`. Main composes it with viewport and lifecycle. It runs with diagnostics disabled too.

- Start at native DPR capped2. After a decrease, effective DPR is `min(native capped DPR, retained world-density cap / CSS world scale)`; below1 is intentional on large CSS courts. Never change CSS size, world scale/offsets, input coordinates, effect contents or gameplay timing.
- An eligible window completes only after both at least2s and at least4 samples, then needs at least50% gaps strictly above25ms to decrease. Do not discard a slow window merely because2s elapsed before its fourth sample. Bound counters to240, with1s grace after transition/eligibility/viewport changes and6s cooldown after each decrease. A lone stall amid healthy frames must not lower quality. No RAF execution means no policy execution.
- Choose only a useful strictly lower world-density cap from `[4, 2.8, 2, 1.4, 1]`. Small viewports skip unnecessary levels. Lower only, at most five changes per page; no repeated invalidation at the floor or automatic upshift. Rematch retains the cap; reload resets it.
- Observe loaded, visible, focused, connected online `playing` phase or stable natural-result presentation. Loading/menu/queue/reconnect/non-natural results reset observations. A disconnect callback also resets the window; an existing natural result can become eligible again without a live socket because its animation is local. Scene/focus/visibility/viewport changes discard partial overload windows, retaining the cap.
- An actual decrease returns true once: main invalidates only rasters and resizes the backing through its ordinary frame owner. Finite decreases/cooldown bound cold-cache transitions.

Debug `quality.stage: 0` / `worldDensityCap: 0` denotes native mode; other stages are level index+1, so skipped levels are expected. These thresholds control cost, not guaranteed FPS. Tests cover eligibility/grace/cooldown, healthy/lone/sustained stalls, below1 DPR, resize/rematch retention, finite floor and detached bounded state. Browser acceptance proves debug-off adaptation, unchanged CSS, original effects and audio. Lower density softens detail; real-device acceptance remains separate.

## Startup loading and first-court preparation

### Scope and signatures

A static `#loading-screen` inside the court covers startup before JavaScript runs.
[loading.ts](../../../src/client/loading.ts) exports `LoadingProgress { stage:
"manifest" | "images" | "confetti" | "prewarm", completed: number, total?: number }`,
`loadImages(sources, onCount)`, `fetchAsset(url, read, stage)`, and `yieldForPaint()`.
`Renderer.load(onProgress)` loads source art; `Renderer.prepare(viewport, state,
effects, onProgress): Promise<boolean>` prepares the current first-draw set.
`RasterCache.prepare(key, image, width, height, scale): void` reuses the normal
cache plan and reads one pixel to materialize deferred SVG/filter drawing.

### Contracts

Show an indeterminate manifest stage then exact completed/total counts for each
named stage. Never invent a timed percentage or keep a minimum fake wait. Six
image workers bound concurrent requests; each image and fetch/body has a15s
request deadline. Failure aborts active image jobs and suppresses late progress.
Audio continues independently and does not gate readiness.

Deduplicate only current court/actor/score/net/overlay frames using the same
frame selectors as render. Use viewport DPR × world scale and the additional
1.25actor transform. Yield before each raster and after the last: RAF followed by
a task provides a paint opportunity, with a50ms fallback when RAF is suspended.
The one-pixel readback synchronizes raster work without allocating a second full
image. Original filters, registration,64/32MiB budgets and allocation fallback
remain intact. One expensive SVG can still produce a main-thread long task; a
loading animation does not promise zero blocking or preload every animation.

Main owns `assetsReady` separately from idle/queued/online/result. While unready,
keep the cover above all scene overlays, underlying controls inert, roster/start
handlers gated, input sampling stopped and ordinary Canvas drawing skipped.
WS remains connected and may restore a retained-Cookie room. Initialize idle
before loading, never call idle at readiness and clear the newly warm cache or a
restored room. Cache generation changes invalidate preparation; allow at most
three preparation attempts for the current scene/viewport, then show reload
rather than loop forever.
At reveal, release keys pressed during loading, restore the current menu or
online scene, focus an existing match and synchronize its input clock.

### Errors and verification

| Condition                                     | UI / behavior                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| WS idle or resumed room arrives before art    | Keep loading cover and input gate; update real scene underneath                    |
| Image/fetch timeout or request failure        | Stop preparation, readable failure category, enabled reload button                 |
| Incompatible manifest                         | Show version failure; no partial court or queue                                    |
| Cache reset / viewport changes during prepare | Up to three preparation attempts total; explicit failure if unstable               |
| Raster allocation/readback fails              | Reuse original source fallback; bound failure IDs, avoid repeated retries          |
| Ready                                         | Hide cover, clear aria-busy/inert, enable current-scene controls and neutral input |

Tests cover bounded concurrency, exact progress, request/body timeout, cancellation
and late events, visible/background yields, first-frame scale/dedup, generation
invalidation and materialization/fallback. Browser checks static-before-script
cover, delayed art/early idle, failure/reload, compact layouts, no game draws or
inputs before reveal and retained-Cookie room restoration. Example: prepare then
reveal the current scene; do not `assetsReady = true; idle()` after prewarming.
