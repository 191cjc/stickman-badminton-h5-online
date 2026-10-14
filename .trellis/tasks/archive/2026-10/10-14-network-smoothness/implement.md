# Implementation plan

- [x] User requested the recommended optimization and agreed to create the task.
- [x] Read current code/specs and record isolated baseline/filter-attribution.
- [x] PRD/design converge on measured incremental optimization, original effects,
  authority and v3; no unresolved user-owned scope choice.
- [x] Curate implement/check context, validate and activate under existing user
  request to optimize and subsequent task/continue authorization.
- [x] Trellis implement agent: add bounded filtered-raster cache and correct scaled
  drawing, monotonic adaptive interpolation with deterministic jitter regression,
  page-owned60Hz input scheduler with transactional edges, opt-in finite diagnostic
  readings. Own src/tests and necessary client markup/styles; no deployment/commit.
- [x] Implementer runs relevant tests plus lint/typecheck/build and writes
  research/implementation-report.md, including memory/timing limits.
- [x] Independent Trellis check agent reviews all requirements/source contracts,
  self-fixes local failures, runs full checks and writes research/check-report.md.
- [x] Main reruns final-build HTTP then same DPR1/2 baseline harness with original
  filters, browser ordered delay/burst/stall comparison, complete match/rematch/
  retained-Cookie reconnect and compact layout checks. Record actual performance,
  new bounds and evidence limits; do not invent physical input latency results.
- [x] Main syncs docs/specs/source-adaptation notes; final diff/links/source hashes.
- [x] Publish independent release after successful validation, preserve secret,
  restart only this project, check public assets/WS/health/logs and prior entrances/
  other services. Keep `20261013T110500Z-versus` as rollback target.
- [x] Commit recognized current-task changes under existing Git authorization:
  runtime/specs `299b207`, verification/release evidence `d15099e`.
  Isolated validation servers stopped.

Task archival and the session journal use `trellis-finish-work`; their management
commits follow the two implementation/evidence commits above.

## Verification

```
npm run typecheck
npm run lint
npm test
npm run build
node artifacts/flash-versus-verification/http-check.mjs
node artifacts/flash-versus-verification/performance-baseline.mjs optimized
```

Weak-network harness must preserve message order to model TCP stream behavior;
don't drop arbitrary WS messages then pretend to have tested TCP packet loss.
No artificial FPS/latency promises; if any workload still misses acceptable
smoothness, investigate and report the measured residual before publishing.
