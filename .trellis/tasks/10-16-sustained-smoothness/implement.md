# Execution plan: sustained online smoothness

## Planning / activation gates

- [x] Obtain task-creation consent; create task.
- [x] Record requirements and read project guidelines.
- [x] Persist focused rendering and timing research.
- [x] Confirm user accepts adaptive internal-resolution reduction in favor of smoothness.
- [x] Complete isolated600s two-guest baseline and persist early/late evidence/limits.
- [x] Rewrite PRD once against final scope and check requirement convergence.
- [x] Curate implement/check context manifests with real specs/research.
- [x] Present final planning summary; obtain subsequent explicit user approval (user: “开始”).
- [x] Run `task.py start`, create `feat/sustained-smoothness`, and dispatch implementation after approval.

## Implementation sequence

1. Dispatch Trellis implement agent with the active-task path, task artifacts and curated context. State ownership of the listed client owners and tests; other services/reference data remain untouched. Native context injection is preferred; child loads context if injection unavailable. Do not revert other agents' work.
2. Add deterministic regression cases for blocked main-thread sampling/batched receipt, repeated stalls, callback-cost/late-deadline cadence, identical-content raster aliases, late-effect queue suppression bounds and adaptive-density behavior. Test observable invariants rather than private assignments.
3. Implement content-hash raster sharing and raster-only invalidation; preserve frame registration/filter images and strict memory/failure fallback.
4. Implement bounded adaptive density in its own policy owner; compose into effective viewport only. Retain CSS dimensions, source effects/audio and authority. Observe only eligible stable presentation, use cooldown, retain a finite lowered cap across rematch and avoid oscillation. Add debug-only detached policy diagnostics.
5. Implement forward-only authority presentation recovery and safe clock rebase after abnormal sample pauses. Preserve normal interpolation, semantic boundaries, no-rewind/no-beyond-latest and hold on authority absence.
6. Correct input deadline spacing between attempt starts, retaining all existing transactional edge/lifecycle/no-burst contracts.
7. Bound silent-suppression metadata with its pending event owner, retaining stale-audio rules and source effect clocks.
8. Format only changed files; run focused tests while changing relevant owners. Summarize precise final behavior and any deviations in `research/implementation-report.md`.

## Validation and independent review

1. Run `npm run lint`, `npm run typecheck` (or build's included typecheck), `npm test`, `npm run build`. No unrelated dependency churn.
2. Run isolated HTTP/static/manifest hash/session/current protocol checks using18815/18816; do not queue guests on production for the baseline.
3. Repeat the same600s `artifacts/flash-versus-verification/sustained-soak.mjs` workload at1440×1000/DPR2/Toaster-Pirate, same50ms DOM-input bot,4s natural-result dwell and rematch. Record actual input cadence, quality stages, raster deltas, frame/long-task early/late windows, authority agreement and JS-heap trends. Compare mixed lifecycle windows honestly; do not relabel them as a single continuous rally. Add DPR1 targeted coverage.
4. Run a separate continuous-rally synthetic trace with blocked RAF+receipt callbacks and ordered batches, plus an ordered network stream-delay/stall browser scenario. Assert authority consistency, bounded recovery and no contact invention. These model different failures; neither is a physical latency test.
5. Verify default diagnostics absence, opt-in export finite/bounded, quality adaptation with debug disabled, original tail/spark/smoke/confetti/audio, seven-character selections, unchanged court CSS size, blur/release, retained-seat reconnect, natural result, leave and rematch. Low density affects sharpness; record visual evidence and external-device acceptance limits.
6. Dispatch independent Trellis check agent over the complete diff/context. Reviewer may repair spec drift and meaningful missing coverage; inspect its report. Rerun only checks justified by changes/failures, then record final full quality gate.
7. Update relevant specs and documentation in English/established doc language, including the functional adaptive policy and recovery contracts. Preserve original source/license records and distinguish implemented behavior from user-machine verification.

## Release / rollback points

- Do not activate or publish during planning; retain baseline and task artifacts.
- After approved implementation and checks, report a concrete build/release candidate. Public deployment is separate from local validation; use persisted session authorization and existing rollout workflow.
- Current production baseline is `20261015T065916Z-hit-timing`; rollback remains the last deployed compatible release. A new release must record its actual previous/current targets and restart/public health results. Do not restart other services, modify credentials or use public matchmaking with waiting real players.
- Any release must retain protocol4 and source manifests; no server migration is planned. A local regression can revert only this task's owned edits without touching other work.

## Completion record

- [x] All accepted requirements mapped to actual evidence in `research/acceptance.md` and `docs/validation.md`.
- [x] Lint/types/tests/build and full-scope independent review passed (20files/269tests); reviewer severe-overload fix included in the tested build.
- [x] Comparable600s before/after, debug-off adaptation/effects/audio, DPR1/2, ordered network/lifecycle and physical-device limits documented.
- [x] Production `20261016T061913Z-sustained-smoothness` activated; own service restarted, public HTTP/byte checks passed after one remote-close retry, prior release retained and unrelated resources unchanged.
- [x] Specs updated; code/tests/docs/task artifacts prepared as one local work commit under the user's existing Git authorization, with no remote push.
- Trellis archive and journal scripts follow the verified work commit; no required implementation or local acceptance remains. External physical two-computer/other-browser feel and sharpness are explicitly pending user acceptance.
