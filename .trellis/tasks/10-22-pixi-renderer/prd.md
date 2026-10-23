# PixiJS WebGL rendering migration

## Goal

Replace runtime filtered-SVG Canvas 2D drawing with PixiJS WebGL and reproducibly baked transparent lossless atlases. Deliver a runnable, reviewable local change with measured performance and visual comparison; switching libraries alone does not establish success.

## Background

- Existing renderer loads all 499 SVG images and rasterizes previously unseen frames at runtime. First-court preparation covers only current frames; original filter trees can stall later actions.
- Canvas renderer selects authoritative/predicted 1-based swing/body/net/effect frames. `main.ts` owns the single presentation RAF; `Effects` owns independent 60 Hz presentation stepping.
- Source DrawFrame preserves registration, dimensions and conservative filter padding. Swing precedes body; readable scores/names/brand/overlays stay outside world reflection.
- Seven playable characters, optional self-left view and all existing controls/settings must remain usable.
- Pre-migration checkpoint: `fb87796`, annotated tag `pre-pixijs-20261022`, verified complete-history bundle under ignored artifacts. No Git remote is configured; remote backup awaits the repository URL. User subsequently instructed continuing local development.

## Requirements

1. Inspect current renderer/cache/quality/main, extraction tools, manifest, animation/presentation data and prior design/verification records before implementation; confirm stable PixiJS APIs from official documentation.
2. Preserve all seven appearances/actions, scales, mirrors, original effects, score/text/markings and layer order. Preserve simulation, gameplay input, prediction/interpolation, audio and wire protocol. Avoid any second animation/logic loop.
3. Keep frozen SWF/XML/recovered scripts/reference unchanged. Extend reproducible extraction/build tools to bake filters into transparent lossless images/atlases; preserve frame timing, origins, dimensions, opacity/blend and overflow. Compensate trimmed coordinates, extrude edges, respect texture limits, version URLs and show recoverable failures.
4. Group assets by scene and needed actors, with bounded memory and resource cleanup across exits/rematches. Do not enlarge/load every asset together. Preserve confetti body-only recoloring and original filter colors.
5. Implement all current scene/player/net/shuttle/smoke/tail/spark/confetti/intro/result layers with strict transforms/order, including spark creation order around overlays. Retain genuine loading progress/retry, responsive size, adaptive drawing quality, hidden/resume and WebGL loss/recovery. Diagnostics remain opt-in and local.
6. Capture the untouched Canvas baseline first, then compare the same local browser/device/viewport/DPR/actors/input scenario before and after. Record cold and warm loading, frame-gap p95, long tasks and reliable resource/memory metrics with measured/estimated distinctions.
7. Validate first animations, sustained controls/effects, two independent guests, mirrored view, resize, rematch and actual screenshots. Run typecheck/lint/existing tests/production build and meaningful new regression checks.
8. Deliver generation commands, design/build/verification documentation, A/B raw evidence and visual comparisons, known issues and untested device ranges. Use independent local ports; production deployment is out of scope.

## Acceptance criteria

- AC1: Original source hashes and gameplay/protocol regressions pass; seven roles/actions and readable mirrored art retain source geometry and ordering.
- AC2: Product draw path uses PixiJS WebGL, has one presentation loop, and performs no runtime source-SVG filtering or per-color SVG generation.
- AC3: Assets rebuild deterministically with trim/registration/filter/color fidelity checks; loader handles corruption/failure/retry and bounded scene/role ownership.
- AC4: Two local guests complete natural matches and rematch with effects, resize/mirror, keyboard/touch/synthetic-pad/settings and no unexpected browser errors. WebGL context loss restores a playable court.
- AC5: Same-condition cold/warm measurements and screenshots are retained and honestly summarized. Investigate and fix observable regressions before calling the migration complete.
- AC6: Typecheck, lint, all tests and production build pass; docs explain commands, limits, remaining issues and device coverage.

## Out of scope

Physics or timing redesign, input/network protocol changes, new gameplay/features, replacement of original art, production publication, and claims of physical device/cross-browser acceptance without measurements.
