# Implementation plan

- [x] User explicitly approved creating task and continuing the proposed loading animation + batch prewarm scope.
- [x] Inspect existing startup/scene/cache behavior and persist converged PRD/design/context. No additional product decision.
- [x] Activate task then Trellis implement sub-agent owns src/client, index.html, necessary tests and implementation report. No commit/deploy; preserve other agents' work.
- [x] Independent Trellis check sub-agent reviews complete changes, repairs findings and runs full required checks.
- [x] Main runs final-build HTTP then authorized cold/slow/failure/retry/compact/resumed-room browser checks plus short two-guest gameplay regression. Record actual limits.
- [x] Update specs and validation docs, publish independent release preserving old services/env, verify public HTTP/health/source assets.
- [ ] Commit current-task changes; archive and record journal.

## Validation

npm run typecheck
npm run lint
npm test
npm run build
node artifacts/flash-versus-verification/http-check.mjs

Use isolated fixtures and the existing authorized Chromium harness. Do not disturb production matches for browser checks. Cache/filter source identity and server bundle stay unchanged. Cold-loading observation demonstrates progress/ready ordering, not zero main-thread blocking or user-device load-time promises.
