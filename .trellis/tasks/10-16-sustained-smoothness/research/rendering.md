# Research: Sustained client rendering and resource costs

- Query: Which current rendering/resource costs can become visible later in a session, and what is the smallest justified optimization while retaining the original Flash art, filters, effects, timing and authority?
- Scope: internal; read-only source, manifest inventory and an in-memory effect-owner reproduction. No browser workload, production action or product-code changes.
- Date: 2026-10-16

## Findings

### Relevant files and contracts

| File | Ownership / evidence |
| --- | --- |
| `src/client/renderer.ts` | Loads499 SVG sources, selects current animation layers, performs first-screen preparation, draws all scene layers, owns two raster caches and tinted confetti images. |
| `src/client/raster-cache.ts` | Half-octave raster density buckets, path/size keys,256-entry/64MiB main LRU, strict bounds and allocation fallback. |
| `src/client/main.ts` | One RAF, DPR cap2, Canvas resize/transform, room/queue/reconnect resource resets; presentation, prediction, networking and input timers remain on the main thread. |
| `src/client/effects.ts` | Bounded source-particle simulation and event queues, result celebration; one uncovered auxiliary-ID retention path described below. |
| `src/client/confetti-images.ts` | Recolors only the inner confetti body, owns pending Blob URLs and bounded color images. |
| `src/client/audio.ts` | One page-owned AudioContext,32 transient voices, fixed sound/decode maps and one music source. |
| `public/classic/manifest.json` | Source frame dimensions, animation paths and SHA-256 identities; quantitative inventory below uses this unchanged file. |
| `tools/flash-assets/finalize.py` | Extracted source-art normalization, conservative filter padding and original JPEG preservation. |
| `src/shared/classic/player.ts`, `animation.ts` | Explain which source frames can actually become visible; no gameplay changes proposed. |
| `tests/raster-cache.test.ts`, `renderer-loading.test.ts` | Source registration/filter/cache bounds and first-screen preparation coverage. |
| `tests/effects.test.ts`, `confetti-images.test.ts`, `audio.test.ts` | Effect/Blob/audio lifetime and reset coverage. |

Applicable specs: `.trellis/spec/frontend/component-guidelines.md:45` (filter-preserving raster contract),`:80` (startup preparation), `frontend/state-management.md:47` (effect lifetime and independent source clocks), `frontend/event-lifecycle.md` (single page owners and release), `frontend/quality-guidelines.md` (DPR1/2 comparisons, opt-in diagnostics, limits of headless evidence), and `shared/simulation.md` (source-derived visuals and authority).

### What is proven about the raster path

1. `drawCachedFrame` calls `getTransform`, derives actual transform density, looks up the raster and draws at the unchanged source x/y/width/height (`renderer.ts:18–32`). Actor factor1.25 and rotation/mirroring are included (`renderer.ts:270–290`).
2. Raster density rounds upward to a half-octave bucket0.25..4; maximum side4096 and entry24MiB (`raster-cache.ts:20–51`). A density just above2 selects2.828, doubling estimated pixels relative to2. A fixed world raster density near1.99 gives actor density≈2.48→bucket2.828. At DPR2 that actor raster saturates bucket4.
3. Every distinct **path plus backing dimensions** gets its own raster, including byte-identical source files (`raster-cache.ts:80–108`). Cache hits refresh LRU order, misses draw the source SVG into a new Canvas. `get` does not force materialization; expensive deferred filter work can appear later in browser rendering. `prepare` specifically reads one pixel to flush it (`raster-cache.ts:128–146`).
4. The cache evicts by count or estimated RGBA bytes, zeros removed Canvas backing stores and records cumulative hit/miss/eviction/failure counts (`raster-cache.ts:95–99`,`:149–169`). It is bounded; continued churn is still possible if the useful animation set exceeds its budget.
5. The startup loader loads all499 SVG images (`renderer.ts:77–81`) but prewarms only **currently selected court, actors, score and overlay frames**, deduplicated by path/backing size (`renderer.ts:94–152`). Loading an HTMLImageElement is not equivalent to preparing all filtered animation rasters.
6. First match, rematch and reconnect can be cold again: `clearEffectsImages` clears both raster caches and color ownership (`renderer.ts:154–159`); main calls it when leaving a prior scene for idle, on queue, on matched and on first reconnect pause (`main.ts:229–243`,`:288–320`,`:354–357`). It is **not** called each point or on every ordinary snapshot. Startup first-screen warming is therefore not a full-room animation prewarm, and queue+matched may discard recently built queue backdrop rasters twice.

### Static working-set inventory

This is a conservative inventory of possible source-frame rasters, **not a measured cache trace and not the number simultaneously visible**. It uses the exact `rasterPlan` formula against the unchanged manifest, deduplicating actual current keys `(path,pixelWidth,pixelHeight)`. Included: both characters' full body/swing source tables,24net frames, background/markers/brand/shuttle, first21spark frames and all half-octave tail/smoke density buckets from source scale0.1..1. Excluded: score progression, intro/name/finish overlays, other roster characters, previews and confetti. Byte estimates exclude source SVG images and browser/GPU copies.

| Pair | World raster density | Actor keys / MiB | Potential play keys / MiB | After content-hash sharing keys / MiB |
| --- | --- | --- | --- | --- |
| Toaster / Pirate |1|180 /30.200|239 /33.249|Not separately calculated|
| Toaster / Pirate |≈1.99|180 /121.138|243 /133.386|166 /119.32|
| Toaster / Pirate |≈3.98|180 /242.598|243 /284.798|166 /251.24|
| Joe / Joe |1|103 /17.529|162 /20.578|Not separately calculated|
| Joe / Joe |≈1.99|103 /70.337|166 /82.586|119 /76.51|
| Joe / Joe |≈3.98|103 /140.837|166 /183.037|119 /165.53|
| Joe / Red |≈1.99|137 /75.912|200 /88.161|137 /79.45|
| Joe / Red |≈3.98|137 /152.016|200 /194.217|137 /171.42|

The table exposes **byte pressure rather than an inevitable256-key overflow** for these fixed-room examples. A small initially visited frame subset can fit, then additional swings/poses add pressure. Actual game traces must establish whether the LRU starts rebuilding useful frames; static inventory alone cannot establish the user's symptom.

During research, the coordinating agent reported a provisional first70sDPR2 baseline: each page near62–64MiB,1276/1321misses and1228/1272evictions, frame-gap p95≈83ms and inputs≈11Hz. This is the coordinator's ongoing mixed2–3natural-match/result/rematch workload, **not a workload run by this researcher, not yet the final sustained report, and not proof of gradual degradation**. Its very high miss/eviction count corroborates cache work as a useful next attribution target; scene clears also count as evictions, so final phase-window deltas remain necessary.

At the existing1440×1000 desktop test viewport, `#app` is1408CSS px wide (`style.css:58–60`). Court max width is `(1000−152)*640/426 =1273.9906`CSS px, border-box height848 (`style.css:104–114`). After2px borders and integer Canvas client metrics, world scale is approximately1.986 at DPR1 and3.972 at DPR2; both fall in the same buckets as the≈1.99/≈3.98 rows. **Exact client dimensions must be recorded by the main baseline browser**; this researcher has not run layout or another browser workload. DPR2 Canvas backing area is approximately4.3million pixels per page. Presentation size remains a product choice; internal density can be adjusted separately.

Reachability caveats:

- Player source tables have adult69 swing frames (23serve+19underhand+27overhead), Toaster73,34body frames for each adult and4for Toaster.
- These are not all visible concurrently; most can be reached over mixed movement/jump/serve/upper/lower swings, but a particular test may never choose underhand or finish all animations.
- Last serve/underhand source frame immediately switches the visible swing to overhead (`player.ts:179–199`). A simple full-table inventory overstates these visible endpoint frames. Hidden clips advance numerically without necessarily being rendered.
- Received remote snapshots are30Hz, and sampled discrete animation fields can skip60Hz source frames. The locally predicted player can expose more frames. `animation.ts:18–32` preserves source60Hz callbacks. A never-observed source frame should not be unnecessarily prewarmed.
- Cache key sets can gain another density group after resize/zoom/DPR changes; old groups remain until LRU eviction or scene reset. Particle rotations use actual matrix lengths; near an exact scale-bucket boundary, floating-point lengths can theoretically select adjacent buckets. This is a minor unmeasured edge, not a diagnosed cause.

### Byte-identical animation sources offer a small safe improvement

The manifest contains499 SVG paths but **339 distinct SVG SHA-256 values**:160paths duplicate other source contents. Examples include27Toaster serve files sharing one hash, all4Toaster body files sharing one hash, repeated net poses and repeated spark poses. Current raster identity uses paths, so each duplicate may still incur a separate allocation/source rasterization.

Sharing only identical source SHA-256 **and actual backing dimensions** can reduce work without changing frame selection, animation timing, filters or source registration. Draw registration remains per `DrawFrame`; a shared raster must never replace the destination x/y/width/height with the first frame's metadata. Preparation must use the same identity as drawing. Source manifest files/hashes and frozen reference data can remain unchanged. A hash is an identity supplied by the release manifest; this is not client verification of fetched bytes.

This is justified by exact duplicate content, although its effect on sustained performance must still be measured. The conservative table shows hash sharing alone is insufficient to fit every possible current high-density room animation in64MiB.

### Transparent bounds and possible build-time cropping

`finalize.py:41–57` starts from JPEXS sprite dimensions/registration and adds conservative support based on4sigma, offset and nesting; it deliberately retains filter trees and expands their regions to2100%. The runtime caches that entire normalized rectangle. Fixed dimensions persist across every frame in a swing family:

| Layer | Normalized source dimensions | Added filter margin |
| --- | --- | --- |
| Adult serve (all23) |172.25×186.25|18 on each side|
| Adult underhand (all19) |185.9×187.15|18|
| Adult overhead (all27) |160.35×168.8|18|
| Toaster body (all4identical) |113.1×109.4|35|
| Tail |9.8×8.55|3|
| Smoke |48.1×41.55|14|
| Confetti |30.1×30.1|13|

Toaster body before conservative margin is43.1×39.4, about13.7% of the normalized rectangle's area. This **does not mean the remaining pixels can be discarded**: blur/bevel support is intentionally present there. SVG source trees also contain fully transparent hitbox paths, and fixed sprite bounds need not equal each visible frame's alpha bounds (for example `swings/toaster/serve-01.svg` includes a `fill-opacity="0.0"` hitbox). This makes cropping worth measuring but does not give a safe crop rectangle from static geometry alone.

No alpha-pixel scan was performed here; no compatible offline raster package is installed, and using another SVG engine might produce different filter pixels. **Never crop by unfiltered vector bounds, erase source filter padding, or apply a nonzero alpha threshold as a performance shortcut.**

If measured churn still warrants a larger asset pipeline, a browser-generated lossless raster variant could scan the fully filtered reference-density image for nonzero-alpha bounds, retain a sampling gutter, and store crop offsets/backing density separately from source x/y/width/height. Cropping only truly transparent margins retains source registration and appearance at that reference density. It requires frame-by-frame comparison under mirroring/rotation, background composites, seven characters, original sparks/smoke/tail and resize; a packed atlas additionally needs gutters to avoid sampling bleed. Dense atlases can pin large irrelevant sheets, so group by actual room/family/effect rather than the entire roster. Immutable original reference and existing source manifest should remain available. This is more work and risk than hash sharing or measured density control, so not the first implementation without baseline evidence.

### Effects and audio lifetime

- Particles are explicitly capped768 (`effects.ts:36`,`:305–307`), expire each fixed step (`effects.ts:88–100`,`:309–313`), and clear on reset/suspend/non-natural finish (`effects.ts:122–147`,`:192–200`). Sparks expire at22source frames. The pending presentation list is truncated128 (`effects.ts:189–190`). Large presentation gaps bound catch-up and clear historical transients (`effects.ts:220–227`). These do not prove an unbounded normal-play particle leak.
- Natural result intentionally continues confetti forever while the result scene remains visible, at source60Hz with≈70% spawn probability, plus source Toaster smoke (`effects.ts:236–267`). The effect workload changes substantially on result. Include a long result dwell separately from active-play windows rather than treating the two as comparable.
- Confetti colors use a WeakMap keyed by live particle, a64-image ready-color map and at most768pending URLs (`confetti-images.ts:18–30`). Every URL is revoked on load/error/reset, and generation checks prevent old callbacks repopulating a scene (`confetti-images.ts:42–69`). Current active particles may retain images evicted from the64color map; the768particle cap still bounds those owners. Their raster cache is separate768entries/32MiB and does not evict court/actor rasters (`renderer.ts:40–46`,`:291–299`).
- Random confetti colors usually do not repeat. Each new color can create a Blob+SVG+Image, and then a raster, even after steady state. This is bounded lifetime allocation churn, not automatic evidence of retained-memory growth. A result dwell can therefore sustain SVG/filter/image decoding costs indefinitely.
- Audio has at most32short voices; stop/onended remove/disconnect them (`audio.ts:76–89`,`:135–150`). Music is singular and guarded (`audio.ts:114–133`). Eight fixed source sounds retain raw/decoded data and decode promises; those maps do not grow with rallies. No accumulation bug demonstrated here.
- Per-frame allocations include `getTransform`/rasterPlan objects and LRU key delete/set, two-element player-frame arrays, main's predicted state wrapper, and `Effects.applyPending` filtering twice (`renderer.ts:18–32`,`:259–268`; `main.ts:488–491`; `effects.ts:271–274`). These are bounded transient allocations. Profile before spending effort on pooling or rewriting owners.

### Reproducible auxiliary suppression-ID retention

`Effects.receive` adds age>6event IDs to `silent` (`effects.ts:185`), then truncates `pending` to128 without removing the corresponding dropped IDs (`effects.ts:189–190`). Only delivered events delete their IDs (`effects.ts:284`). Resets clear the Set, but no independent cap exists. Thus repeated backlog truncation **can retain IDs for discarded events until the room resets**.

A read-only in-memory reproduction bundled `effects.ts` with esbuild `write:false`, instantiated Effects and fed100synthetic128late-event journals without presentation advancement. No source file/test/production state was written. Result: `pending=128`, `silent=12,800`; after one advance, `pending=0`, `silent=12,672`. Synthetic event density and presentation starvation intentionally force this path; this is **not evidence of that density or retention in actual authority play**. Ordinary new events generally arrive at source age0–1 and do not populate `silent`; hidden/reconnect paths suspend and clear owners. Current diagnostics report pending/particles/sparks but not suppression-ID count.

Exact stress inputs after in-memory import (TS `private` methods are normal properties in this bundle):

```js
const fx = new Effects();
fx.reset("r");
for (let batch = 0; batch < 100; batch++) {
  const tick = 32 * batch + 30;
  const events = Array.from({ length: 128 }, (_, index) => ({
    id: 128 * batch + index + 1,
    tick: tick - 10,
    kind: "tail",
    x: 100,
    y: 100,
    seed: 1,
  }));
  fx.receive({ cursor: 128 * (batch + 1), events }, tick);
}
// Internal inspection: fx.pending.length === 128; fx.silent.size === 12800.
fx.advance(32 * 99 + 30, 1 / 60, () => {});
// Internal inspection: fx.pending.length === 0; fx.silent.size === 12672.
```

These synthetic128events share a tick and intentionally do not model normal authority emission density. A product regression should assert the ownership invariant under a realistic bounded burst trace rather than silently treat this stress input as a recorded gameplay journal.

Small repair if needed: tie suppression state to each queued event, or remove dropped IDs whenever pending is pruned, preserving stale-sound suppression. Add a meaningful late-burst/backlog test asserting bounded retained metadata and no historical sound replay; include reset and recovery. This is a reproducible resource correctness issue suitable for a targeted fix, but do not present it as the primary observed user cause without a trace.

### Priority recommendation and verification

1. Use the main agent's single sustained two-page baseline. Compare early/late windows within the same active/rally phase, and track **deltas** of raster misses/evictions, per-page density/client dimensions, frame gap/long tasks, input cadence, packet cadence and interpolation delay. Separate startup, resize, new room and result dwell windows. Existing counters are cumulative, so raw totals at the end do not locate the onset.
2. Implement hash/backing-size sharing first if the baseline visits duplicate paths; it preserves exact source art and avoids extra requests/raster allocations. Tests should exercise two real distinct paths with identical hashes, different hashes at equal sizes, changed sizes, independent source destination registration, preparation identity and cache reset.
3. If continuous raster misses/evictions or GPU fill work correlate with deterioration, choose a **bounded density policy**. Preserve CSS court size, world transform, inputs and authority; decrease only internal resolution with hysteresis, a bounded number of levels and cooldown. A resolution change causes new cache work, so avoid frequent oscillation. Do not let low RAF during hidden/loading/semantic transitions count as persistent overload. Compare original effects at DPR1/2 and keep manual sharpness/device acceptance separate. Fixed source-raster density alone reduces cache work but leaves high-resolution Canvas compositing work; lowering Canvas internal density affects both. **DPR1 is not itself an adequate bound when the enlarged CSS court already scales the640world to≈1272CSS px.** For the conservative Toaster/Pirate inventory: with current path identity, world density√2 already requires66.64MiB before score/overlays; world1.13 instead needs35.80MiB. With hash sharing, world1.4 needs59.61MiB;14largest score frames plus source Intro/Finish and the two current role names add1.62MiB, giving≈61.23MiB. World1.5 or1.6 requires64.014MiB before that1.62MiB, so it does not leave adequate headroom. At CSS world scale1.986, world density1.4 means effectiveDPR≈0.705. This is a material sharpness tradeoff on high-DPR displays; it keeps the original art/filter/effect contents but does not promise pixel-identical resolution. It should be explicit in the design and compared visually, not described as a free quality-preserving optimization. The61.23MiB estimate is specific to this full-frame pair and stable density, not a guarantee about every pair, old resize buckets or browser total memory.
4. Repair the proven suppression-ID retention path with bounded metadata if included in scope. Do not replace original effect timing/density with frame-rate-based dropping.
5. Only if those measurements still show significant first-use/filter work, consider prepared lossless cropped room asset variants/atlases. Simply prewarming all source frames at current density exceeds the cache budget and can evict the very entries being prepared. Simply raising64MiB to fit every possible role pair increases browser/GPU pressure and does not solve first-use raster work.
6. Layered static-background composition can save repeated blits but should follow an observed fill/compositing cost: render currently redraws background/net/score/brand every RAF (`renderer.ts:173–203`), and source depth38brand must stay above moving content. Do not reorder source layers to simplify a static layer.

For browser comparisons, keep two pages/characters/viewport/DPR/action sequence/dwell windows identical, preserve source filters, capture actual authority snapshots and original tail/spark/smoke/confetti/audio, and verify focus-release/reconnect/rematch/leave. Detached numeric diagnostics must remain opt-in; no identity/room IDs or default observers. Headless shared-host frame gaps do not establish real-device input-to-display latency or prove the user's long-session issue is solved.

## External References / Versions

No external framework search was needed for this source-specific topic. The runtime under review is native TypeScript/Vite/Canvas2D with browser SVG filters and protocol4, server60Hz and snapshots30Hz; exact dependency versions are in this project's package/lock files. Existing validation evidence is `docs/validation.md:94–109`,`:122–127`,`:146–155` and the archived10-15-hit-timing verification report: DPR2 previously retained≈50ms frame gaps and occasional filtered-raster long tasks, but those short runs did not prove gradual degradation.

## Caveats / Not Found

- No browser, production queue, WebSocket room, HTTP route or service was touched by this researcher.
- No sustained-runtime trace or physical-device profile was produced here; the main session owns the isolated baseline.
- No normal-play memory leak, GPU throttling, cache thrashing onset or exact user-machine cause has been established.
- Alpha margins are conservative and visible filter support must be retained; safe crop savings remain unmeasured.
- The full-table inventory intentionally overstates reachable visible endpoint frames and does not account for actual frame-frequency/local/remote scheduling. It is a budget-pressure signal, not an acceptance result.
