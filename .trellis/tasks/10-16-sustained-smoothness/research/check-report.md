# Independent check: sustained smoothness

Date: 2026-10-16. Active task: `10-16-sustained-smoothness`; baseline `4cf4570`. The dispatched Trellis reviewer performed the review directly without spawning another agent. Source/tests are frozen after the local fix below. No commit, deployment, restart, browser run or production matchmaking was performed by this reviewer.

## Review scope

Read the complete native check context, task PRD/design/implementation plan, both context manifests, rendering/timing/baseline research and both implementation reports. Ran `get_context.py --mode packages` (single repository) and followed the frontend index's quality-check references, including directory structure/type safety and shared protocol/reuse/cross-layer contracts. Reviewed all changed client owners and their existing/new regressions, including the new adaptive-quality owner. Also inspected the primary session's concurrent frontend-spec/design updates; source/test ownership was not overwritten.

The reviewed changes preserve the server/shared/protocol/reference/art boundary. Local `Prediction` mechanics are unchanged; only `Interpolation` in that module changes. Ball contact/flight, score and result remain authoritative. Source SVG filters, draw registration, source layers, seven-character selection, logical input/transactional send ownership and existing cache budgets remain. Main composes quality independently of opt-in diagnostics. Raster-only invalidation preserves live color/effect/audio owners; full scene cleanup retains its original ownership. Presentation recovery remains forward-only within actual compatible snapshots, and stream-only starvation retains normal slew. Scheduler changes retain one timer, attempt-start minimum spacing and lifecycle generation guards. Suppression metadata now follows bounded pending-event lifetime, with stale catch-up audio guarded against the final presentation target.

## Findings (fixed)

- File: `src/client/render-quality.ts`; regression coverage: `tests/render-quality.test.ts`.
- Issue: Every elapsed 2-second observation window was cleared even when it had fewer than the required four samples. With fully eligible persistent 750 ms or 1000 ms RAF gaps, an actual-owner 60-second trace showed slow fraction 1 but zero reductions: severe overload discarded its evidence before meeting the sample minimum.
- Fix: A window completes only after both at least 2 seconds and at least four samples, then applies the existing slow-fraction threshold. No policy thresholds, density stages, grace, cooldown, floor, lifecycle exclusion or lone-stall protection changed. Primary explicitly agreed with this completion interpretation before the fix.
- Regression: Added 750 ms and 1000 ms persistent-gap traces asserting useful finite decreases, cooldown spacing and stable floor. Both cases failed on the reviewed implementation (no decreases) and passed after the guard correction. The full quality suite retains healthy/lone-stall/ineligible/resize/rematch/finite-diagnostics coverage. No RAF execution means no policy execution; this does not promise adaptation during a completely frozen main thread.

## Findings (not fixed)

No remaining source-code defect or required design change was found in the reviewed scope. Two wording refinements were passed to the primary session, which owns docs/specs: qualify the ordinary interpolation rate in its introductory paragraph, and distinguish the disconnect observation reset from locally continuing natural-result eligibility. They do not require a code change.

This review does not replace the primary session's build, isolated HTTP, comparable 600-second before/after browser run, debug-off/DPR1 adaptation, original visual/audio and lifecycle acceptance, or any actual publication. These are explicit remaining task validation steps rather than failed checks. Real-device/dual-computer sharpness, smoothness and physical input latency remain externally verifiable; no improvement is inferred solely from unit tests or configuration.

## Verification

- Initial full gate before the review fix: lint passed; typecheck passed; 20 test files / 267 tests passed.
- Red regression check: `npx vitest run tests/render-quality.test.ts` failed exactly the two new persistent-gap cases, with the existing 12 cases passing.
- Post-fix focused check: 1 file / 14 tests passed.
- Final `npm run lint`: passed (exit 0).
- Final `npm run typecheck`: passed (exit 0).
- Final `npm test`: 20 files / 269 tests passed (exit 0).
- `npx prettier --check src/client/render-quality.ts tests/render-quality.test.ts`: passed.
- `git diff --check`: passed.
- Build/HTTP/browser/release: owned by the primary session, not run or claimed by this reviewer.

Only the quality owner, its regression test and this report were edited by the reviewer. No unrelated edits were reverted. The primary may now build and perform integration acceptance against the frozen reviewed source.
