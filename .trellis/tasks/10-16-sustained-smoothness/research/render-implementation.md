# Rendering implementation

Date: 2026-10-16. This report covers the rendering implementer's owned files only. No production publication, browser run, service restart, Git commit, source-art change or protocol/server/shared-gameplay change was performed by this implementer. Other task changes in timing/effects were developed concurrently and were not reverted.

## Behavior and ownership

- `src/client/render-quality.ts` owns a pure, page-lifetime, lower-only adaptive world-density cap. It starts at native DPR capped at 2. Effective backing DPR is `min(native DPR capped at 2, retained world-density cap / CSS world scale)` after a decrease. This can be below 1 for large CSS courts; it never upscales a smaller native viewport.
- Candidate maximum world densities are `[4, 2.8, 2, 1.4, 1]`. A decrease selects only the first candidate strictly below actual density (with a `1e-6` boundary tolerance) and below the retained cap. No automatic upshift occurs. A page reload starts fresh; scene resets/rematches retain the cap. There are at most five changes per page, often fewer because levels above native density are skipped. At/below the lowest useful density, further overload cannot repeatedly invalidate rasters.
- Each eligible observation window spans at least 2 seconds and retains only bounded counters (at most 240 frame samples, no array). A gap strictly greater than 25 ms is slow. A completed window needs at least 4 samples and at least 50% slow samples to lower one level. A lone stall amid healthy cadence does not satisfy the persistent fraction. These thresholds are a cost-control policy, not a guaranteed FPS or measured physical latency.
- Loading, hidden/unfocused state, queue/menu/reconnect, and invalid viewport values reset the observation window. Eligible restoration, explicit scene transitions and scale/native-DPR changes get a 1-second grace period. Each actual decrease adds a 6-second cooldown; a fresh completed observation window is required after cooldown. Partial overload windows are discarded across transitions. These resets do not erase a retained quality cap.
- `main.ts` composes the policy on ordinary RAF with debug both enabled and disabled. Stable online status/phase `playing` while connected and natural score-result presentation are eligible. Loading skips ordinary drawing as before. Focus/visibility, connection loss, idle/queue/match, reconnect entry/exit, result and readiness explicitly reset observations. The CSS court, offsets, world scale, input geometry, effects/audio/prediction/authority are unchanged.
- The existing opt-in diagnostic read callback includes a detached `quality` object with numeric/boolean values only. `worldDensityCap: 0` and `stage: 0` mean native uncapped presentation. There is no new default global, observer, upload or diagnostic dependency for adaptation.
- `Renderer.invalidateRasters()` releases both existing main/confetti backing caches and invalidates preparation generation, preserving loaded original SVG images and live tinted color images. `clearEffectsImages()` keeps its original scene cleanup semantics by resetting color ownership then delegating to raster invalidation. Main uses only raster invalidation for quality changes, retaining live source effects and audio.
- Normal source raster identity now uses manifest SHA-256 plus actual planned backing width/height, shared consistently by preparation deduplication, preparation and drawing. `DrawFrame` destination x/y/width/height remain per call even when two paths share an image backing. This uses release-manifest identity rather than fetching/hash-verifying bytes in the client. Distinct contents and backing dimensions remain separate. Confetti color keys, source filters/registration/padding and all cache/entry/byte/allocation-fallback bounds remain intact.

## Files changed

- Added `src/client/render-quality.ts` and `tests/render-quality.test.ts`.
- Updated `src/client/main.ts`, `src/client/renderer.ts` and `tests/renderer-loading.test.ts`.
- Added this report. No other files were edited by this implementer.

## Verification

- `npx vitest run tests/render-quality.test.ts tests/renderer-loading.test.ts tests/raster-cache.test.ts`: 3 files / 28 tests passed.
- Expanded relevant coverage with `tests/diagnostics.test.ts` and `tests/confetti-images.test.ts`: 5 files / 31 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Prettier targeted only owned source/tests; `git diff --check`: passed.

Coverage exercises healthy 60/120/144 Hz, isolated vs sustained stalls, grace/cooldown, finite useful levels/floor, ineligible loading/visibility/focus/presentation, explicit transition/rematch retention, resizing/below-1 effective DPR/no upscaling, invalid times/geometry and detached finite diagnostics. Renderer tests use actual byte-identical Toaster source paths, preserve independent destination coordinates/dimensions, distinguish actual different net hashes and density/backing changes, retain prepare/draw/reset identity, cancel preparation after density generation changes, and preserve live confetti images/particles through raster-only invalidation. Existing cache tests retain original-image fallback, filtered registration, strict limits and failure cleanup.

## Remaining verification and trade-offs

The main session owns the full suite/build, isolated HTTP/browser work, the comparable 600-second before/after workload, debug-off integration, physical-device limitations, independent review and final specs/docs. No sustained performance improvement is claimed by these unit checks. Lower density softens detail; a transition creates one cold lower-resolution raster set, bounded by finite decreases and cooldown. The policy does not distinguish host/GPU throttling or main-thread work from low monitor cadence; persistent visible frame gaps trigger it intentionally. Original effect contents and timings remain, but user-device sharpness and smoothness still need external acceptance.
