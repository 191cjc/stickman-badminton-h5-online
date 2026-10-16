# 持续运行卡顿定位与优化

## Goal

Reduce the stutter and delayed interaction the user reports after an initially smooth online session. Establish a repeatable sustained-runtime baseline, then change the measured performance bottlenecks while preserving the original Flash multiplayer behavior and visual effects.

## Background

- User report: early play feels acceptable, later play becomes choppy. This is not yet reproduced on the user's machine or attributed to a particular subsystem.
- Production is the original Flash-derived seven-character online versus mode at `/badminton-h5-online/`, using protocol 4, 60 Hz server simulation and 30 Hz snapshots.
- The latest optimization corrected elapsed local prediction and hit-input timing; it deliberately did not replace the renderer.
- The existing renderer lazily rasterizes filtered SVG frames into bounded caches. Input timers, WebSocket callbacks, prediction, effects and rendering share the main thread. The completed600s isolated DPR2 baseline recorded larger late frame gaps, repeated within-room raster evictions, stable-range JS heap and15,861identical corresponding authority states. It does not establish the user's device cause or physical latency; see [baseline](research/baseline.md).
- Deterministic read-only reproductions establish prolonged presentation backlog after main-thread pauses, avoidable scheduler deadline loss, duplicate-content raster identities and dropped-event suppression metadata retention. See [timing](research/timing.md) and [rendering](research/rendering.md) for source anchors, reproduction details and limits.
- Before this task, lint, type checking, the build and all 229 tests in 18 files passed on the clean baseline `4cf4570`.
- User decision on2026-10-16: “允许自动调低，优先流畅”. Persistent overload may lower internal game resolution while the CSS window and original effect contents remain; high-DPR details may become softer.

## Requirements

- R1: Collect comparable early/late observations during sustained isolated two-guest play, including frame gaps, long tasks, cache churn, input cadence, authority presentation gap and memory trend where available.
- R2: Reduce repeated raster work for identical source contents; recover recent authority presentation after long main-thread pauses; avoid unnecessary input-cadence loss from callback work; keep discarded effect metadata bounded. Preserve bounded allocation, bounded work and lifecycle cleanup.
- R3: Preserve the source-derived physics, animation timing, seven available characters, original art/filter/effect contents and audio behavior. Server authority continues to own shuttle contact/flight, score and result; client prediction remains local-player-only.
- R4: Keep matching, release on focus loss, retained-seat reconnect, result, leave and rematch working. Do not change the other game entrances, services or credentials.
- R5: Record before/after evidence and its limits. Do not promise a latency value or claim the user's device issue is solved solely from headless measurements.
- R6: Automatically reduce internal rendering resolution during persistent eligible presentation overload. Preserve CSS court size and world/input geometry, retain a finite lower bound, avoid repeated up/down transitions, and avoid reacting to loading/hidden/focus-loss/scene-transition gaps.

## Acceptance criteria

- AC1 (R1): A documented sustained two-page workload compares early and late time windows under the same viewport, DPR, character set and action/lifecycle sequence. Report any failure to reproduce gradual degradation explicitly.
- AC2 (R2): Each optimization is supported by an observed cost or a reproducible timing/resource regression. Relevant tests assert observable behavior, bounded resources and recovery rather than mirroring new implementation details.
- AC3 (R3): Gameplay/source data remain unchanged unless separately approved; targeted browser checks retain original effects and confirm both clients receive the same authority state and result.
- AC4 (R4): Focus release, reconnect, natural result, leave and rematch pass relevant automated checks. Any production publication is recorded with a concrete release/rollback target and health/static-resource checks.
- AC5 (R5): Lint, types, meaningful tests and build pass; validation notes distinguish isolated browser evidence from external dual-machine acceptance and physical input latency.
- AC6 (R6): Sustained overload can lower effective backing density with debug disabled; healthy or ineligible frames do not repeatedly lower it. Tests and browser evidence cover finite stages, cooldown, lowest-stage stability, rematch retention, unchanged CSS size and preserved original effects at the selected density. Before/after results state the sharpness trade-off.

## Out of scope

Changing the game framework or transport, moving network/prediction to a Worker, an offline atlas/cropping pipeline, modifying authoritative rules, inventing client shuttle contacts, historical-hit compensation, campaign/AI/unlocks, unrelated services, speculative tuning without evidence, and guaranteeing a measured latency on the user's computers.

## Planning status

Task creation, the resolution trade-off and final planning review are approved (user: “开始”). Research and the600s baseline are complete. The task is in progress on `feat/sustained-smoothness`; rendering and timing implementation have been dispatched with separate file ownership. No blocking product question remains.
