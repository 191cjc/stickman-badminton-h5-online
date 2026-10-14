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

The frame loop measures Canvas CSS dimensions, caps DPR at 2, calculates a uniform world scale, and sets the drawing transform. Preserve the640×426 world mapping from [CLASSIC_WORLD](../../../src/shared/classic/types.ts) rather than changing physics coordinates to fit the screen.

Draw per-role family swing/body/attachments at their source depth, mirrored at±1.25horizontal/1.25vertical and the same1-basedframe as numeric authority. Pirate depth21 attachment is above swing; Toaster uses dedicated poses. The serve layer already contains its attached shuttle; draw the standalone shuttle only after release. Manifest dimensions/fps must agree with the simulation.

## Styling and accessibility

Use the existing global [CSS](../../../src/client/style.css), semantic buttons, Chinese labels, labeled Canvas, labeled directional touch buttons, and live match-status region. `[hidden]` must remain effective despite layout rules. Keep visible action buttons keyboard accessible and maintain their disabled/visibility rules across scene changes.

Canvas is focusable; matching explicitly focuses it. Touch buttons keep pointer cancellation handling described in [event lifecycle](event-lifecycle.md). Visual scaling and actual keyboard/touch behavior require manual browser verification; type checking alone cannot prove them.

## Match actions inside the court

Keep the existing `start` and `cancel` native buttons in the court's menu overlay. `buttons()` retains their scene visibility and start/rematch label; moving DOM nodes must not duplicate listeners or commands.

The `leave` button belongs to an independent court action layer, outside `#overlay`. `overlay(..., false)` hides the whole menu during online play, so an end-match button nested there would disappear. Keep it available during active play and reconnect pauses according to `buttons()`.

Size the presentation in CSS and retain the centered Canvas world transform. Reserve space for the scoreboard and live match status when positioning the menu and corner action. Narrow or short screens need reachable menu actions, including overflow handling where necessary; avoid covering the scoreboard with the end-match button. A wide viewport can still produce a narrow court through its height-based width limit: the compact scoreboard rules apply when viewport width is at most 640px **or** height is at most 540px, reserving 100px on the right for the corner action. Check these constraints manually without changing world coordinates or authoritative game state.

Seven native `[data-character]` buttons provide original previews and aria-pressed selection; disable them in queue/room, allow selection after result. Remove practice entirely. Keep `#mute` with aria-pressed and M feedback accessible outside the hidden menu. Source Intro/Finish art is Canvas presentation; online matching/result actions stay accessible native DOM buttons.

## Filter-preserving raster contract

### 1. Scope / Trigger

Renderer caches unchanged source SVGs including original filters. Repeated filtered SVG drawing caused browser raster long tasks in two-pageDPR1/2 measurements. Never delete filters to optimize product rendering.

### 2. Signatures

[RasterCache](../../../src/client/raster-cache.ts): `get(key, image, width, height, scale): CanvasImageSource`, `clear(): void`, `diagnostics()`. `deviceRasterScale(matrix)` uses the largest column length of the actual transform, including DPR/world/rotation/mirroring. `rasterPlan(width,height,scale)` returns backing width/height/bytes or undefined.

### 3. Contracts

Half-octave scale buckets0.25..4. Floor-round backing dimensions; maximum side4096, one entry24MiB (RGBA estimate). Main raster LRU256entries/64MiB; separate tinted-confetti raster LRU768entries/32MiB protects the court working set. Oversized sources reduce backing density, retaining source dimensions/origin/filter padding at destination. Estimates exclude browser/GPU copies and loaded source SVGs. Main calls Renderer.clearEffectsImages on idle/queue/matched and reconnect pause, clearing both rasters and old Blob ownership; results retain their current court/actors until the next reset. Menu role previews are DOM images; the next queue/room resets the raster scene. Cache IDs combine source identity and actual backing size. Draw layers and source frames are unchanged.

### 4. Validation & Error Matrix

| Condition | Expected |
| --- | --- |
| Same source/size bucket | Cache hit; no repeated SVG filtering |
| Changed transform/bucket | New bounded backing size |
| Byte/count pressure | Evict least-recently-used entry and zero its Canvas |
| Oversized source | Lower bounded raster density, original destination registration |
| Allocation/context/draw exception | Return original SVG; suppress retries while its ID remains in the bounded failure set; clear or failure-set eviction permits retry |
| Room/role/result exit | Release backing stores and stale tinted scene resources |

### 5. Good / Base / Bad Cases

Good: mirrored Pirate attachment keeps source origin with transformed cached drawing. Base: static court reuses filtered raster. Bad: tint a whole filtered image, remove filter attributes, allocate one Canvas for every particle scale, or report96MiB as total process memory.

### 6. Tests Required

Raster tests assert original source filtering/reuse, registration/padding under mirrored rotation, bucket reuse/change, huge sizes, LRU byte/count bounds, allocation fallback and clear. Browser compares filters-intact two-pageDPR1/2 frame p95/long tasks, original spark/trail/smoke/confetti, role switch and resize. Headless measurements do not establish user-device FPS or native Flash pixel parity.

### 7. Wrong vs Correct

Wrong: remove SVG filters or repeatedly draw the SVG during every RAF. Correct: lazily rasterize the unchanged image at a bounded transform bucket, draw at source x/y/width/height, and clean up on scene transitions.
