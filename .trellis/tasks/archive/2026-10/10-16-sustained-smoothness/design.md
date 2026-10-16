# Design: sustained online smoothness

## Boundary and evidence

The behavior gap is an initially acceptable session becoming choppy or showing old shuttle positions after stalls. Rendering work lives in Renderer/RasterCache and the Canvas backing resolution in main; interpolation owns authority presentation recovery; InputScheduler owns attempt cadence; Effects owns event metadata lifetime. The source-derived simulation and server remain unchanged.

Baseline commit: `4cf4570`. Before task research: lint, types, 18 files/229 tests and build passed. Isolated HTTP/static hashes/session/current WS handshake passed. The sustained two-page DPR2 run is documented in `research/baseline.md` once complete. The research reports distinguish deterministic defects, static inventory and actual browser measurements.

Confirmed mechanisms:

- Interpolation's 250 ms sample-dt cap and 1.15 catch-up rate can leave hundreds of milliseconds of old presentation after blocked main-thread sampling; repeated synthetic stalls accumulate a bounded backlog. Target delay alone does not show actual authority gap.
- InputScheduler can skip a usable deadline by enforcing minimum spacing again after synchronous callback completion, even though spacing is between attempt starts.
- Renderer keys by path despite 499 SVG paths containing only 339 unique SVG contents. High-density actor animation inventories can exceed the main 64 MiB cache; the browser baseline records actual misses/evictions.
- Effects can retain silent IDs belonging to events removed by the bounded pending-queue truncation. This is reproduced under synthetic starvation, not established as the user's normal-play leak.

The user explicitly selected “允许自动调低，优先流畅” on 2026-10-16. Internal resolution may decrease under persistent overload; CSS window size, original effect contents and gameplay timing must remain intact. Sharpness on high-DPR displays is a documented trade-off.

## 1. Adaptive Canvas density

Add a focused, pure client policy owner (`render-quality.ts`) rather than embedding control state in Renderer. The owner observes monotonic RAF cadence during stable eligible presentation. It chooses a bounded maximum number of device pixels per original world unit; viewport continues to expose CSS dimensions, CSS/world scale, offsets and the effective backing DPR.

Effective backing DPR is `min(native capped DPR, worldDensityCap / CSS-world-scale)`. This may be below 1 on a large CSS court. A DPR1 cap alone is insufficient: the current 1272×846 CSS Canvas already scales the 640×426 world by about 1.986. Initial behavior uses native DPR capped2. Candidate maximum-world-density levels are 4, 2.8, 2, 1.4 and 1; only select a level strictly below actual current density. These avoid unnecessary adjacent raster-bucket changes while keeping finite work. Do not upscale a small native viewport to fill a cap.

Use an observation window completed only after both at least2s and4samples; gaps strictly above25ms are slow and at least50% must be slow. Retain bounded counters up to240samples. Reset/ignore observation during asset preparation, hidden/unfocused state, queueing, and1s transition/restoration/viewport grace. Active-play and stable natural-result presentation can be eligible. A lone delayed frame must not continuously trigger changes. Each decrease has a6s cooldown before a fresh window. These cost-control settings are explicit and testable, not advertised target FPS. The independent review corrected early clearing of undersampled2s windows, with750/1000ms regressions.

Lower at most one level per completed observation/cooldown period. Retain the lowered cap across rematches in the same page. Do not automatically alternate up/down during play; a reload starts fresh. Small viewport changes must not cause density oscillation. At the lowest level, keep rendering without repeated invalidations.

When a level changes, resize Canvas through the existing viewport/frame owner and invalidate old raster backing stores once, retaining source images, live effect particles, audio, network state, prediction and authority. Add a raster-only invalidation method to Renderer if needed; do not misuse scene reset to stop live effects. Destination registration and all source transforms remain unchanged. Loading preparation uses the same effective viewport and raster identity as drawing.

Expose detached numeric/boolean quality state only through the existing opt-in diagnostic composition. Functional quality adaptation must work with debug disabled; do not add a default global API, performance observer or upload.

## 2. Share identical rasters

Use manifest SVG SHA-256 plus actual backing dimensions as the raster identity for normal source frames. `DrawFrame` x/y/width/height remain per draw and are never borrowed from the first alias. Different contents cannot share, and scale changes still produce distinct backing dimensions. Use the same identity for preparation job deduplication and actual drawing. Keep the frozen source manifest/files and source artwork unchanged. Confetti remains keyed by actual body color in its separate bounded owner.

This is release-manifest identity sharing, not runtime cryptographic verification of fetched bytes. Keep existing allocation failure fallback and strict byte/entry/backing limits. Do not enlarge memory limits merely to fit all animations at maximum DPR or prewarm every roster frame.

## 3. Forward-only presentation recovery

Keep the ordinary monotonic interpolation algorithm and its normal jitter slew. Add an explicit recovery path after an abnormal sample pause (initial candidate at the existing250ms cap), or a clearly documented equivalent bounded rule supported by the deterministic traces. Recovery chooses a point within the current compatible actual authority segment near latest tick minus the current target delay, clamped to oldest/latest and never behind the prior render cursor. Reestablish a coherent authority clock reference from the latest received snapshot when rebasing; same-time batch receipts must not leave the clock anchored to an obsolete intermediate packet.

Do not recover by extrapolating a ball, inventing contacts or dropping acknowledged logical commands. No authority means hold the latest actual state. Normal packet jitter alone must not cause per-packet reanchoring or forward jumps. Score/phase/status/room/either-role boundaries retain immediate reset semantics. Recovery intentionally skips obsolete presentation after a real freeze; it does not reconstruct what the player saw during the block.

Retain bounded numeric recovery diagnostics, alongside target delay and actual authority presentation gap. Effects already advance from sampled authority time; verify bounded catch-up, sound suppression and no repeated shot/result events after a forward recovery.

## 4. Input deadlines

Compute successor eligibility against the last attempt start, counting synchronous step execution as elapsed spacing. If a future grid is too close to that start, retime to the first safe future deadline rather than reserving another full period after callback completion. Preserve one timer, ceiling waits, a global8.33ms minimum between attempt starts, at most one attempt per callback, expedited logical changes, stop/restart generation guards, no post-stall burst, and transactional send/edge retention.

This does not promise60 input sends/s while the main thread is blocked. Prediction remains elapsed fixed-step rather than packet-count driven, with its existing expiry and authority fallback.

## 5. Bounded effect metadata

Tie stale-sound suppression to retained queued events by storing suppression alongside its owning event. Preserve event cursor deduplication, stale sound suppression, original effect timing/density and terminal ordering. Check sound freshness against the final presentation target too, preventing historical catch-up ticks from replaying obsolete sounds; keep the inclusive6tick freshness and existing>120tick whole-batch silence. This additional lifecycle guard was confirmed during implementation and approved within the same scope. Test metadata bounds under a bounded late-burst/starvation trace and cleanup after resume/reset. Do not describe this stress reproduction as proof of the user's leak.

## Expected files and why

- `src/client/render-quality.ts`: sole bounded adaptive-density policy, independently testable.
- `src/client/main.ts`: compose policy with stable presentation lifecycle, effective viewport and diagnostic export.
- `src/client/renderer.ts`: content identity sharing, matching preparation identity and raster-only invalidation.
- `src/client/prediction.ts`: Interpolation recovery only; no local prediction or physics rewrite.
- `src/client/input-scheduler.ts`: safe deadline ownership.
- `src/client/effects.ts`: queue-owned suppression lifetime.
- Relevant tests for those owners: observable cadence, timing/authority, cache/geometry, adaptation and resource cleanup.
- `docs/design.md`, `docs/validation.md`, relevant Trellis specs: final contracts, results and limitations. Deployment docs change only for an actual release.

If source/API changes materially exceed these owners, return to planning with evidence before broadening scope. Shared simulation/protocol/server/asset reference files are out of scope.

## Compatibility, rollout and risks

Protocol4 and all server contracts remain compatible. No dependency/framework change is needed. Keep all routes and services other than this isolated project untouched. Do not publish during planning. After implementation and independent review, prepare a reviewable release and rollback target using existing scripts and authorization; record an actual restart/publication separately from local success.

Risks: density transitions create one cold lower-resolution raster set; cooldown and finite decreases bound that cost. Lower density softens high-DPR details. A forward recovery visibly skips obsolete motion after a freeze, while preserving actual server states and result. Shared-host headless work can show regressions or resource bounds but cannot establish physical dual-computer feel. Atlas/offline rasterization, Worker transport, WebRTC, historical hit compensation and physics changes are deferred.
