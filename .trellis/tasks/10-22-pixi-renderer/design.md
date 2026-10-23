# PixiJS migration design

## Boundary and source contracts

Replace `src/client/renderer.ts`, runtime raster/color caches and their renderer-specific tests; add client atlas ownership and build-time PNG baking. `main.ts` only adapts initialization, scene asset readiness, draw calls and resource lifecycle. Existing simulation, input/scheduler, prediction, interpolation, effects clocks, audio and protocol remain the behavioral authority. Original `public/classic` manifest/data stays a source artifact and audio contract; add a separately versioned raster manifest and generated assets, never overwrite frozen reference inputs.

## Pipeline

Use pinned Chromium through Playwright at build time to render unchanged SVG filter trees, retaining existing browser filter semantics. Decode pixels, trim transparent bounds without dropping nonzero-alpha blur tails, deduplicate content, pack deterministic transparent PNG pages with two extruded edge pixels and no mipmaps. All pages fit 2048×2048; oversized artwork is split into fragments with individually compensated registration. Source frame metadata retains original floating x/y/width/height/padding; raster metadata adds density, integer source extent, trim, page rect and fragment offset. Pixel rounding must not alter destination dimensions. Hash-named pages and a validated source-manifest digest prevent mixing releases.

Group by court/common, swing family and individual body. DOM previews/rematch graphics use baked PNGs. Provide HD/SD variants: normal art densities 4/2, spark 2/1 (source render scale0.3), preview density1. Runtime picks a tier from actual world density and device texture limits; measure active-pair memory before freezing defaults. Load only scene + active actor/family groups; deduplicate aliases and retain no unbounded role history. A bounded cache can release nonactive pages after transition; uploads are paced behind real progress. Asset bytes and estimated decoded/GPU RGBA are reported separately from measured JS heap.

Confetti recolors only nested body: source RGB influences output affinely, while flood/bevel/glow and alpha are independent. Bake black/white endpoint samples; reconstruct premultiplied output as fixed black + tint×(white−black) in a shared batched mesh/shader. Verify multiple colors including filter boundary pixels against original SVG before accepting this path. A failed fidelity check must be resolved, never replaced by whole-texture tint.

## Pixi and presentation

Pin stable `pixi.js@8.22.0`, compatible with current TS6/Vite8. Use an explicit WebGL renderer initialized asynchronously against the existing canvas (preferred WebGL2 with documented fallback to1); do not create a Pixi ticker/Application loop. Existing `main.frame` remains the only RAF advancing presentation and calls renderer.render once. Text is original baked glyph art or existing DOM.

Use pooled sprites/containers, no per-frame texture regeneration. The clipped640×426 court root carries viewport translation/scale; world sublayers reflect x'=640−x. Strict sequence:

1. reflected background/net;
2. readable score;
3. reflected markers, smoke, left swing/body, right swing/body, tails, flying shuttle;
4. readable court brand;
5. readable intro/names;
6. reflected sparks created before finish;
7. readable finish;
8. reflected later sparks/confetti.

Actors use T(x−0.05,y)S(classicDirection×1.25,1.25); sprites compensate trimmed source coordinates before rotation/reflection. Scores/winners/intro names select by displayed side without mutating state. Blend and alpha already inside source SVGs are baked; runtime overlay alpha and ordinary source-over compositing are retained. Shared animation data continues selecting all frames.

## Loading and lifecycle

Startup initializes WebGL, fetches/validates source+raster manifests, loads common/current actor groups and DOM art, and explicitly prepares GPU textures before reveal. Six bounded image requests,15s deadlines and exact completion counts retain readable failure/reload UI. Audio loads separately from source manifest.

Matched actors may differ from startup. A generation-scoped readiness gate covers required groups behind the same loading UI while WS continues accepting snapshots. Clear own input and suspend presentation advancement during art preparation; never reset authoritative state to menu. Only latest generation can reveal/retain assets; errors keep matching/input gated with retry. Queue/idle/rematch release unused actor/scene resources while retaining reusable common resources within budget.

Resize changes renderer backing width/height/resolution, never CSS or world geometry. Preserve existing lower-only `RenderQuality` policy; quality changes do not reset live effects. Hidden/resume clears input through existing owner, resets elapsed presentation reference and pauses GPU draws. Context loss prevents default, shows recoverable preparation state and stops input/draw; on restore, reuse decoded pages, upload needed resources with progress, render latest state and clear input before reveal. Dispose GPU/decoded resources and listeners on terminal page exit; BFCache restoration must reinitialize or retain valid ownership.

## Validation and rollback

Untouched production Canvas build/source are saved locally before implementation. Isolated local backend/frontend use18925/18926. Same Chromium151,1440×1000,DPR2,Toaster/Pirate,50ms native logical key events,75s cold +75s warm result/rematch workload; collect true loading time, independent frame gaps/long tasks, resource timing, quality/backing size and CDP JS heap. Repeat exact driver after migration; do not overlap measurements with asset baking. Supplemental DPR1, all roles/actions, mirrored scores/names, resize, default-off diagnostics, asset failure/retry, context loss and controls are acceptance checks, not additional A/B claims.

Deterministic source-state visual fixtures compare old Canvas and new WebGL at equal backing density, including all actions/effects/overlays, trim/mirror/registration and confetti colors. Inspect screenshots and document resampling differences. Meaningful tests cover atlas integrity/source hashes, bounds/extrusion/trim mapping, asynchronous stale generation/failure/cleanup and actual scene transform/order without changing simulation.

Run typecheck/lint/all tests/build and independent full-scope Trellis check. Save reproducible scripts/raw reports and a concise permanent report. Production deployment is separate. Rollback uses `pre-pixijs-20261022`; complete history is also in the verified local bundle. Remote remains unconfigured.

## Risks and evidence limits

High-density pages trade baked download/GPU memory against eliminated filter CPU; packing/memory measurements determine caps and tier selection. Software WebGL on this headless shared host is not hardware/mobile performance. Chromium bake parity does not establish Safari/Firefox/native Flash identity; physical touch/gamepads and two-device latency remain unverified unless independently tested. Work must investigate measured regressions and state remaining device limits honestly.

## Implemented refinements from measurement

The final implementation retains the planned authority/RAF/source boundaries. Initial software-WebGL results regressed severely, so the single root pass now uses an explicitly cleared GL scissor instead of a full-court stencil mask, with no offscreen filters/backBuffer/MSAA. Ordinary sprite batches use one sampler; confetti keeps its independent two-texture shader. Idle reuse applies only without Effects and compares all consumed values, with explicit resize/reset/visibility/context invalidation. Meaningful renderer tests and a final26-case visual supplement cover these changes.

The lower-only quality stages,2s/4-sample observation,1s grace,6s cooldown and density1 floor remain. The measured WebGL policy now tolerates35ms slow gaps, observes all online room-playing frames including point waits, and for severe mean gaps≥70ms estimates the lower tier by pixel area against a separate25ms target. This avoids short-point resets and leaves submission headroom on the tested software GPU. It is a measured presentation refinement, not a universal device FPS guarantee.

PNG compression compares zlib strategies3/0 with identical lossless settings and chooses the smaller result (ties retain3), generator version pngbest-v2. All34 decoded images and all frame/group/packing metadata are unchanged; independent36-file regeneration is byte-identical. Baking CPU rises while shipped PNG bytes fall13.93%; page memory is unchanged. Final measured results and remaining regressions are recorded in docs/pixi-migration.md.
