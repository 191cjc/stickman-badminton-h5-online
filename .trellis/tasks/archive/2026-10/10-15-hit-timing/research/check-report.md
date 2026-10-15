# Independent hit-timing review

Reviewed the complete application/test/script and current documentation/spec diff against `a9a0a88` on `feat/hit-timing`, plus the new task artifacts and fixtures. Loaded the full saved hook context, check manifest references, PRD, design, implementation plan/report and all affected layer indexes/quality contracts. No subagents, Git operations, production changes or browser runs were performed by this reviewer.

## Findings fixed

1. `tests/hit-timing.test.ts`: the anticipation sweep included values that placed the logical enqueue before the displayed cue. The useful restored witnesses used only causal lead0/1 and were already valid, but the broader sweep could not represent its stated visible-cue transport model. Made enqueue and consumption explicit, restricted equal lead to0..2, asserted enqueue is at/after the cue and retained exactly two uplink ticks. Both30Hz phases, both receiving sides and all seven roles still pass with unchanged favorable outcomes.
2. `tests/hit-timing.test.ts`: the original A/B asserted contact and velocity signs without pinning the numeric source-law outcome. Added contact side/kind/previous toucher/frame/time/position/velocity and the following gravity/drag/flight expectations, retaining per-role power differences, mirrored positions and zero score at the restored contact. Existing illegal/out-of-reach and Joe/Toaster timing counterexamples remain.
3. `tests/network.test.ts`: the changed file failed targeted Prettier checking. Applied formatting only; the real Input→Scheduler→Network transaction is unchanged.

## Findings not fixed

No unresolved implementation or contract blocker was found. No application code was changed by this review.

The main session separately corrected rollback documentation: the current protocol4 checker cannot verify a protocol3 rollback. The rollback block now names the frozen baseline, expects protocol3 health and directs full checks to scripts from that target revision. Current protocol4 docs and historical dated protocol3 evidence are intentionally distinct.

Final full-suite/build/HTTP/browser/production verification remains owned by the main session and is not established by this report. Physical two-computer feel remains external acceptance. The smaller buffer reduces configured waiting with less jitter margin; the asymmetric-uplink fallback is bounded approximation, not exact rollback. It preserves server ball/contact/score/result authority and original action latches, and does not guarantee that every earlier swing will connect.

## Full-scope checks

- Predictor uses one elapsed-time60Hz accumulator; accepted-command and simulated-step histories remain distinct and bounded. Catch-up is capped at six steps. Replay boundaries require valid ackTick alignment and cannot prune seq>ack owners. Null/missing/coalesced/overlapping anchors use one fallback generation per ack; new operations still enter it. Numeric→null invalidation clears confirmed held controls once, retains outstanding identities/consumed markers, and expiry suspends rather than periodically reviving old edges. Existing semantic/lifecycle owners clear histories.
- Service metadata is assigned after the first completed step using the newest sampled command, retained during held ticks, and cleared by the existing discard/release/timeout/disconnect/resume/finish owners. Current protocol4 and recognizable legacy1/2/3 handling are coordinated with client constants and scripts. Legacy sockets cannot replace the authenticated current socket/seat. Client input remains logical-only with the existing exact parser/range/rate/backlog limits.
- Input changes notify after state mutation; the single scheduler timer coalesces expedited and periodic attempts, enforces the8.33ms global spacing, retimes periodic work, skips stale deadlines, and cannot resurrect an inactive chain. Failed actual sends preserve seq/edges and do not register new prediction commands.
- The interpolation baseline is one shared2tick value for init/reset/adaptation. Existing bounded p90 jitter policy, monotonic cursor, real-state contact/attachment boundaries and hold-latest semantics remain. Frozen `BaselineInterpolation` was independently compared with HEAD: its implementation is identical after import/class-name normalization. No production renderer, source physics, geometry, filters/effects/audio or frozen reference file changed.
- Current shared/frontend/backend/deployment specs and README/design/deployment docs describe protocol4, fixed-time prediction, conditional anchors, approximate fallback and lower-buffer limitations. No new route, service, dependency, platform template or detection registry requires synchronization.

## Verification

- Independent focused regression run before the local test-strengthening fixes: seven files/91 tests passed (`prediction-clock`, `hit-timing`, `input-scheduler`, `input`, `network`, `protocol`, `service`),24.16s. This includes real HTTP/Cookie/Origin/WS policy, burst/held/null acknowledgements and retained-seat lifecycle.
- Strengthened visible-cue A/B: one file/eight tests passed, with all seven roles × both sides × both snapshot phases exercised internally. No oracle selects an authoritative contact time; the first displayed flying shuttle establishes the cue. The source-valued injected trajectory/pre-roll and fixed reaction/sample/transport model remain synthetic, not native-SWF, Canvas or physical/public latency measurements.
- After all local fixes: targeted network/A-B regression run passed two files/13 tests,0.67s; `npm run lint` and `npm run typecheck` both exit0; targeted Prettier check passed all18 changed application/test/script files; `git diff --check` was clean. The main session owns the final full suite/build and subsequent acceptance gates.
