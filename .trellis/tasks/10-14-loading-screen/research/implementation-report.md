# Loading-screen implementation report

## Changes

- `index.html` supplies a visible startup cover before JavaScript, with `#loading-screen`, `#loading-status`, native `#loading-progress`, readable `#loading-count`, explanatory `#loading-detail`, and native `#loading-retry`. Court starts busy; menu/actions/touch controls start inert and Canvas starts outside the tab order.
- `style.css` supplies a small CSS spinner, reduced-motion support, compact layouts, and a separate cover above scene UI. Failure retains the cover and offers reload rather than re-enabling matching.
- New `loading.ts` provides typed stage progress, six image-loading workers, per-image 15-second timeout with whole-batch cancellation/late-callback cleanup, and bounded manifest/confetti fetch including body reads. `yieldForPaint()` waits for RAF and its next task; a 50ms fallback lets hidden/suspended-RAF pages finish. The fallback is a scheduling limit, not a fabricated resource progress/duration.
- `Renderer.load(onProgress)` reports real manifest/image/confetti stages; SVG URLs retain original path/hash and filters. `Renderer.prepare(viewport,state,effects,onProgress)` deduplicates only current court/actor/shuttle and visible intro/finish frames using shared normal-drawing frame selectors and identical DPR/world/player scale buckets. Each raster has a paint opportunity before its work and a final yield before readiness. Generation changes return `false` rather than reporting ready.
- `RasterCache.prepare()` uses existing get/rasterPlan/bounds, then one-pixel `getImageData` to synchronize that backing canvas's deferred commands. It flushes once per prepared entry. Readback failure frees the entry and remembers the original-SVG fallback without repeating expensive failures. Main/confetti budgets remain 64/32MiB; no full-canvas readback allocation is retained.
- `main.ts` gates all regular Canvas drawing, roster/start/cancel/leave handling and existing input scheduler on completed preparation. Up to three preparation passes recover from actual scene resets/viewport changes. Ready clears keys pressed during loading, reveals the actual current scene, focuses an online room and synchronizes input without calling `idle()` or resetting a resumed room. Empty initial/late WS idle preserves warm first-screen rasters; reconnect clears them once when entering pause instead of on each repeated paused snapshot.

## Validation

- Targeted `vitest` loading/renderer/raster: 3 files / 18 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Full `npm test`: 16 files / 196 tests passed, including unchanged authority, protocol, effects, audio, and HTTP/WS suites.
- `npm run build`: passed; client JS `index-wsjtUqlH.js` (109.41kB), CSS `index-CMOCPJtZ.css` (7.88kB), backend 157.8kB.
- Prettier targeted changed implementation/test/HTML/CSS files; `git diff --check` passed.
- New tests exercise bounded/out-of-order image completion, callback deduplication and cancellation, never-firing image timeout, HTTP/body-read failure, suspended-RAF fallback, source/hash identity, exact preparation counts, yields/readback, same-scale first render hitting prepared cache, deduplicated attached-shuttle behavior, generation cancellation/restart and cache allocation/readback fallback.

## Boundaries and follow-ups

- Browser/HTTP/release verification belongs to main and has not been claimed here. No deployment, commit, server/shared gameplay change or source-asset change was made by this implementer.
- A single original filtered SVG can still block the main thread during raster/readback; CSS animation/progress cannot promise uninterrupted animation or a device-independent load time. Preparation covers a captured current first-screen set, not every later animation/effect/role frame. A live resumed match can advance to another authoritative frame during preparation; authority/room state remains current and later frames use normal bounded lazy caching.
- Hidden-tab timers may be browser-throttled; the fallback removes the unconditional RAF dependency but cannot override browser scheduling policy. Rapid repeated resize/scene resets beyond three passes produce an explicit retry instead of an infinite loader.
