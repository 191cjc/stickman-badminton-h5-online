# Independent repair review

Reviewed the scoped product changes against baseline `a7a314b`, the saved native check context, PRD/design/execution plan, and `implementation-report.md`. This reviewer did not edit product files, specs, dependencies, deployment resources, or Git history.

## Findings (fixed)

None. No mechanical or local correctness issue requiring a reviewer edit was found.

## Findings (not fixed)

No unresolved issue was found in the scoped repair. Main-session spec synchronization remains intentionally pending, as assigned:

- `.trellis/spec/backend/identity-and-input.md`: replace the obsolete command-coercion exception with the actual string-discriminator contract and parser/real-WS regression evidence.
- `.trellis/spec/backend/rooms.md`: replace the obsolete upgrade-versus-collector branch difference with the shared expiry verdict, immediate reclamation, and deterministic expired-upgrade test coverage.
- `.trellis/spec/shared/protocol.md`: remove the reference to a current command-type coercion exception; link the dedicated parser tests alongside service evidence.
- `.trellis/spec/deployment/operations.md`: remove the obsolete diagnostic mismatch; describe the corrected snippet/include inspection guidance and unchanged pre-switch validation gate.

These documents belong to the main session and were not changed by this reviewer. The main session separately reported successful built HTML, JavaScript, and CSS HTTP checks using an isolated Vite preview on port 5194, followed by stopping the preview. This reviewer did not perform or independently rerun that check.

## Source-backed review

- `src/shared/protocol.ts:61` rejects non-string `type` before command membership. Valid commands, input and ping shapes retain their previous exact-key/value validation. `tests/protocol.test.ts` contains 16 cases, including every valid logical command and array/nested-array/non-string discriminator rejection. Existing service-file parser assertions retain logical input validation coverage.
- `src/server/service.ts:422` keeps malformed parsed messages on the existing 1008/`invalid_message` close path. The 12 new authenticated HTTP/WS cases at `tests/service.test.ts:157` observe both exact close code and reason through actual sockets, rather than only checking parser return values.
- `src/server/service.ts:235` centralizes reconnect expiry: the expired side's opposite guest wins only when that guest has a bound socket; otherwise winner is null. Both upgrade (`service.ts:391`) and collector (`service.ts:543`) call this helper. Existing `finish` sends the authoritative result and final snapshot; `reclaim` removes room ownership and sends idle. Upgrade does not enter the resumed `matched` branch after expiry.
- The two tests at `tests/service.test.ts:293` fake only `Date`, `setInterval`, and `clearInterval`; socket events, `setTimeout`, and monotonic polling remain real. Moving wall time 701 ms beyond the configured 700 ms retention executes no interval. Both cases assert a retained room and no prior `room_reclaimed` event immediately before authenticated upgrade. The absent-opponent case waits for the existing server disconnect log, so absence is observed server-side. Both verify exact result/score, idle, room count zero, no stale `matched`, and immediate queue reuse; the online opponent also observes the same result and idle.
- The ordinary same-Cookie resume and real collector-expiry test at `tests/service.test.ts:268` remains in the full suite and passes. Service teardown clears fake service/heartbeat intervals before `vi.useRealTimers()` in the `finally` block (`tests/service.test.ts:79`). Monotonic `Peer.wait` avoids a stalled timeout under frozen Date.
- The only publisher change is `scripts/publish.sh:40`, the failure diagnostic. Nginx validation and failure exit remain before `current`/`previous` changes, this service's restart, and Nginx reload. `docs/deployment.md:25` now accurately describes resource/environment/include preparation before validation and the subsequent switch/restart/health/reload/check order. No publisher execution was used for verification.

## Verification

All commands ran from `/home/ubuntu/stickman-badminton-h5-online` and exited 0:

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | Pass |
| TypeCheck | `npm run typecheck` | Pass |
| Full tests | `npm test` | **50 passed, 7 files passed**, duration **20.20 s** |
| Build | `npm run build` | Pass; `dist/client` and `dist/server/index.js` generated |
| Shell syntax | `bash -n scripts/publish.sh scripts/rollback.sh` | Pass |
| Diff whitespace | `git diff --check` | Pass |

The full suite includes the 16 parser cases, 21 service-file cases, prediction, simulation/upstream comparison, AI, flight, and math tests. The configured test include excludes frozen upstream test files. Baseline-failure and targeted-repair results remain in `implementation-report.md`; this reviewer independently ran the final full suite.

No publication, service restart, browser launch, physical two-computer test, or latency measurement occurred. Browser rendering, mobile controls, weak-network behavior, and physical input response remain external acceptance.

## Main-session follow-through

After the independent report, main synchronized the four listed specs. Documentation checks passed for 20 spec documents and 169 local links; index coverage and template/language checks passed. Isolated built HTML/JS/CSS HTTP checks returned 200 and the temporary preview was stopped. No later product-code change required another test/build run. Details are recorded in `final-validation.json`.
