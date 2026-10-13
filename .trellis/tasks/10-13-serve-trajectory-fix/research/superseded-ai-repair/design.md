# Repair design

## Boundary

The underlying defect is shot eligibility, not a downward serve impulse. `ai-controller.ts` decides whether to request a jump/swing; `simulation.ts` owns successful authoritative contacts. Fix both owners: AI should not react to its own outgoing shot, and shared authority must reject a racket contact when the player's side equals `shuttle.lastTouchedBy`.

Only the derived shared AI and simulation plus focused test files require product changes. Main owns task artifacts, specs, validation documentation, browser/deployment evidence and Git. No browser hooks or debug exports belong in production code.

## Contracts

`lastTouchedBy` is already present on Shuttlecock and snapshots. A serve through the attached-shuttle path remains valid; during flying state the next valid contact belongs to the opposite side. A rejected self-contact leaves ball trajectory/profile, rally count and score unchanged. AI's incoming predicate must gate attacking jumps and swings against own shots while retaining movement/receiving behavior.

No payload migration or world-coordinate change is needed. The same Simulation rule is used by browser practice and server authority. Local player swing animation may still occur on explicit input; it must not rewrite the ball.

## Upstream compatibility

Frozen upstream reproduces the defect and remains unchanged. Keep full-match comparison for behavior unaffected by the intentional consecutive-contact correction. If a comparison encounters the old invalid self-hit, explain and narrowly handle that divergence without silently blessing arbitrary physics drift. Add behavioral tests that verify legal trajectory/contact outcomes, rather than mirroring the guard expression.

## Verification and release

Use existing headless shared/service/prediction tests, then an isolated local Vite preview and Chromium. Browser instrumentation may observe Canvas translation/rotation and DOM scores without adding runtime debug APIs. Existing environment-provided Playwright/Chromium tooling may be used read-only as test tooling; application dependencies remain independent.

Check repeated human input, AI normal/boss serving and opponent returns through simulation tests. Browser practice uses ordinary buttons and keyboard controls; online browser checks, if needed, use isolated local backend/guests to avoid public queue interference. Publish only after checks pass. Snapshot protected Nginx files and cloud-service PID/start time, verify current/previous release and public assets/health/WS after restarting only this service. Roll back to the previous release if the new runtime cannot pass release checks.
