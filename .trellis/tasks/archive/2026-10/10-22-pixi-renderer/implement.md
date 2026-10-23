# Execution plan

## Before implementation

- [x] Confirm task consent; save clean Canvas checkpoint/tag/full Git bundle.
- [x] Inspect renderer/cache/quality/main/tools/source animation and existing docs/specs.
- [x] Create untouched production build/source snapshots for rollback and visual comparison.
- [x] Finish official Pixi/API and atlas/color research; retain findings in research/.
- [x] Complete Canvas cold/warm75s two-guest baseline before product edits.
- [x] Review PRD/design/plan and curate implement/check context, then activate task.

## Implement

1. Pin PixiJS and reproducible bake/browser/PNG tooling. Extend source→baked atlas pipeline with validated hashes, deterministic trim/dedup/packing/extrusion, density tiers/fragments/groups and body-only confetti basis verification. Keep reference/SWF/XML/numeric animation untouched.
2. Build all new artifacts; measure source/download/page/RGBA sizes and select bounded active-group defaults. Verify reproducibility and trimmed reconstruction.
3. Implement Pixi WebGL renderer + atlas lifecycle, pooled exact-order scene, confetti batch, texture preparation/context restore and real diagnostics. Replace obsolete runtime raster/color code and adapt renderer regression checks.
4. Integrate main initialization/loading/role changes/resize/visibility/context lifecycle through existing input gates/RAF. Preserve server/network/prediction/effects/audio contracts.
5. Run targeted checks, typecheck/lint/tests/build. Repair issues and independently review whole diff/spec compliance with Trellis checker.

## Browser acceptance

- Same A/B driver on isolated18925/18926 after build; no asset build or other browser workload concurrently. Compare75s cold/warm frame p95, long tasks, loading/resource bytes, backing/quality and measured JS heap; estimates explicitly marked.
- Exact-state screenshots old/new at equal density: seven roles, body forward/back/jump, serve/over/under at boundary frames; net, shuttle, smoke/tail/spark, intro/finish/court text, colored confetti. Inspect original ordering and mirror readability.
- Two real local guests naturally reach seven points/rematch with equal authority. Native keyboard, pointer touch controls, synthetic standard pad/settings, self-left, resize and compact layouts.
- Delayed/failed atlas + retry; stale room prep; hidden/resume; WebGL lose/restore; resource counts stable over repeated role changes/rematches. Debug absent normally, detached local numeric summaries when enabled.

## Finish

- Update README/tools/design/validation and focused Trellis specs with commands/contracts, measurements, screenshots, limitations and untested devices.
- Rerun checks only after changes/new concerns. Record independent review and no production deployment.
- Keep changes reviewable; follow authorized commit workflow and leave rollback tag intact. Remote push requires the missing destination URL.

## Rollback points

Original Canvas `fb87796` / `pre-pixijs-20261022`; ignored baseline build and source snapshot; complete-history bundle verified. Never overwrite frozen references or operate production services/queues.

## Final local delivery status

- [x] Pixi8.22 WebGL renderer, bounded scene/role PNG ownership, body-only confetti shader, sole existing RAF and real progress/failure/lifecycle gates implemented.
- [x] Source/shared/server/reference/upstream unchanged against checkpoint. Independent PNG build/check:36 files byte-identical;34 images decoded RGBA and metadata unchanged after compression optimization.
- [x] Final typecheck/lint/build pass; final24 test files/455 tests pass (74.42s), including24 quality/27 renderer/11 atlas regressions.
- [x] Full202 frozen-state pairs plus final26-case supplement visually checked; sampling differences and rejected low-disk run disclosed.
- [x] Final cold/warm75s benchmark pixi-quality70-final complete with no errors. Initial regressions and repeated102.5ms boundary investigation retained; remaining warm-task-count/download/memory costs disclosed.
- [x] Final four-tier natural matches:2608 equal same-tick authority snapshots; keyboard/touch/synthetic-pad/settings/mirror/reconnect/rematch/compact layouts/context restoration pass.
- [x] Real PNG failure/retry/exit,30s result reclaim/new-role ownership and loss-during-preparation lifecycle scenarios pass. Genuine headed tab hidden817ms/resume/input-neutral rearm pass.
- [x] README/design/build/validation/report/evidence and seven-section rendering spec updated; physical devices/WebGL1/weak-network/BFCache and combined delayed-role/reclaim limits explicit.
- [x] Phase3.4 concrete two-commit plan approved by the user with “继续” on 2026-10-23; implementation `5573394` and documentation `7c723f5` committed with exactly the approved paths. Finish-work archive/journal use the same authorization and are recorded as separate bookkeeping commits.
- [ ] Pre-migration remote backup push awaits missing repository URL; no remote configured. Local commit/tag/full bundle available.

No production deployment. Primary handoff: docs/pixi-migration.md; commands and tools/render-validation/README.md are reproducible from the workspace.
