# Implementation plan

Status: final planning summary approved by user (“开始吧”, 2026-10-19); implementation authorized.

## Ordered work

- [x] Inspect current Input, settings, scheduler, perspective, tests, specs and isolated validation harness.
- [x] Seed PRD and persist keyboard/settings evidence.
- [x] Finish Gamepad API research and reconcile polling, focus, source-release and hardware boundaries with design.
- [x] Converge PRD, design and this execution plan; curate both manifests and validate task context (12 real entries each).
- [x] Present final summary and obtain subsequent explicit user approval; then task.py start.
- [x] Dispatch trellis-implement with active task path, curated context and exclusive ownership of planned frontend/tests/README/docs changes. Agent is already an implementer and must not recursively spawn. Primary owns planning artifacts/spec integration/release coordination.
- [x] Add typed bounded controls preferences and keyboard capture, preserving default aliases and guarded storage.
- [x] Refactor Input to merge logical keyboard/pointer/gamepad sources; preserve transactional edges, pointer ownership and native focus/repeat behavior.
- [x] Add standard gamepad adapter, stable automatic selection, neutral rearm and safe availability/disconnect handling. Integrate polling with the existing paced sender and event/one-shot settings status refresh.
- [x] Extend in-court settings, effective control/serve hints, responsive layout and Chinese help. Retain self-left and loading gates.
- [x] Implementer runs focused behavioral tests, lint and typecheck; report changed files and remaining concerns in research/implementation-report.md.
- [x] Dispatch independent trellis-check against all changed files and task artifacts; review/fix directly with no recursive dispatch. Confirm unmodified server/protocol/simulation/source assets and preserved input pacing.
- [x] Run the final required commands once after fixes: npm run lint, npm run typecheck, npm test, npm run build, git diff --check. Broaden/repeat only for new edits or unresolved failures.
- [x] Start the existing isolated built frontend/server harness on owned local verification ports only; run HTTP/assets/Cookie/v4 WS checks. Stop temporary processes after verification.
- [x] Run authorized browser probes below and record actual pass/failure/deferred evidence, then update README/docs/validation.md.
- [x] Load trellis-update-spec, capture controls/device lifecycle contracts into affected frontend specs, and complete full-scope quality review including docs/spec links.
- [x] Use existing authorized Git/release scope for concrete reviewed changes. Follow current Trellis commit/wrap-up steps and existing independent publication/rollback procedures; do not push without authorization. Do not release planning-only artifacts as a product change.

## Meaningful code tests

- Preferences: existing aliases, supported-code boundaries, duplicate/conflicting codes, array/text bounds, unknown versions/fields, malformed JSON, missing/throwing storage getter/get/set, live fallback and detached defaults.
- Keyboard/capture: custom binding and removal/reset, aliases, reserved keys/shortcuts, composition/repeats, activation-key behavior, invalid capture with unchanged map, Escape/Tab/native Space and focus lifecycle.
- Source merger: independent keyboard aliases and pointer IDs, cross-device overlap/opposing movement, combined edges exactly once, disconnect dropping only pad-owned unsent edges, ordinary quick tap retained, all-source release.
- Real send boundary: rejected disconnected/buffered/throwing sends retain sequence/edges; accepted retry commits once and passes the same world-mapped frame to prediction. Keep existing bounded cadence/stop-start tests.
- Gamepad: standard mapping, axis finite/missing/out of range, digital opposite directions, threshold hysteresis, press/hold/release, selection stability, disabled/nonstandard/unavailable/throwing API, disconnect/index reuse, neutral-rearm after all relevant boundaries.

## Browser acceptance matrix

Use isolated fresh guests, foreground the action page, and assert DOM/state explicitly; remember prior Playwright background-page/navigation auto-wait limits.

1. Default controls then keyboard add/remove/conflict/reset; current help and serve prompt agree. Persist after reload and gracefully handle denied/invalid storage.
2. Native capture/checkbox/button Space, capture Escape then panel Escape, Tab, consumed keyup, no page scrolling for bound gameplay keys; capture cancellation on blur/hidden/close.
3. Pointer left/right/jump/hit after keyboard remapping; two-source hold/release does not cancel remaining input. Cover mirrored actual-right player and ordinary actual-left player.
4. Inject standard Gamepad API samples to test fresh discovery, bottom/left face jump/hit, axis/D-pad directions, opposing controls, continuous hold, neutral-rearm, disable/automatic selection/disconnect, manual detection and fallback keyboard. Confirm real outbound frame shape and authority agreement between two guests.
5. Loading/settings/native focus, blur, visibility, reconnect, leave/result/rematch and new-seat transitions never leak held actions or old pending gamepad edges. Gamepad polling remains independent of render RAF.
6. Desktop,320×568 and812×375 panel rows, hand-controller enable/detection, reset, Done, matching and leave remain reachable; self-left settings still work.
7. No error console/page events or default debug API. No original asset/effect/filter changes; unchanged authority/protocol/server bytes where applicable.

Physical controller firmware, browser/OS mapping, USB/Bluetooth pairing, real mobile touch, sustained user-device performance and two-computer feel remain explicitly external unless actually tested. Synthetic navigator fixtures do not satisfy physical-device acceptance.

## Risk and rollback points

- Highest-risk files: input.ts (source edges), main.ts (scheduler/release/scene focus), index.html/style.css (native capture and compact settings). Keep player stepping, interpolation, source rendering and authoritative simulation out of this task.
- Before implementation record clean baseline commit485c707/current deployment20261019T070111Z-self-left-view; check again before publication because external state can change.
- If a discovered requirement changes user-visible scope, return to planning and obtain fresh review of material changes. A failed browser probe is evidence to investigate, not a reason to remove original effects or lower acceptance silently.
- Publication uses an independent release/current switch and only this project's service/routes. Roll back to the pre-publication release and restart the owned service if validation fails. Never alter community/original/cloud entrances.
