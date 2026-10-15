# Implementation report — input and return timing

Implemented on `feat/hit-timing`, baseline `a9a0a88`; product/test/script edits frozen for independent review. No commit, publish, service restart or public match was performed by the implementation agent. Main owns the separate documentation/spec diff and deployment/verification work.

## Application changes

- `src/shared/protocol.ts`: protocol4 / badminton-v4; required server-owned `Snapshot.ackTick:number|null`. Client input remains exactly the original logical keys; no timestamp, contact or player/ball coordinate assertions.
- `src/server/service.ts`: first completed room tick using a newly consumed command is recorded after simulation. Continued held simulation retains that tick. Clear/discard/release/timeout/disconnect/resume/non-playing paths set it null. Recognizable legacy v1/v2/v3 pages receive mismatch/1008 before guest socket/seat binding, including while the current guest has an active socket.
- `src/client/prediction.ts`: replace packet-step `apply` with `accept(input, at)`, `advance(at)` and `reconcile(snapshot, at)`. One monotonic fixed60Hz accumulator advances the own actor; registration does not itself add a physics step. Integrate previous held state before accepting a late new direction. Commands and fixed steps have separate bounded ledgers (240 commands/120 steps/two seconds), and catch-up is at most6 steps/100ms.
- Replay uses a retained first-use anchor and server `ackTick` to account for confirmed held time, rather than replaying one frame per packet. Steps record held/edge sequence owners and source context. A boundary overlapping any seq>ack is not considered acknowledged. Null, missing/coalesced/expired or overlapping mappings enter a bounded fallback generation. Outstanding operations compact onto one next local step, with latest held state, jump-edge OR and latest hit edge/hit-time jump. Repeated stale acknowledgements cannot restart that old edge. New commands remain eligible; source latches still reject active-action restart. Expiry suspends the same generation until authority recovery, rather than recreating an old swing every two seconds.
- Same-ack numeric→null invalidates a normal replay anchor. If already in fallback, restore authority once, clear confirmed held controls, retain outstanding command identities/consumed-edge markers, and do not replay old consumed edges. Repeated null snapshots cannot repeatedly rebase. This handles explicit server discard without treating seq>ack as confirmed.
- The interpolation baseline is computed once as SIM_HZ/SNAPSHOT_HZ (2ticks, approximately33.3ms configured wait), used by initialization/reset/adaptation. Existing max12ticks, monotonic slew, actual-state boundaries, stale rejection and hold-last behavior remain. No ball extrapolation/contact prediction.
- `src/client/input.ts`: notify after actual logical held/edge changes; keyboard aliases/repeats and duplicate pointer releases do not produce artificial operations.
- `src/client/input-scheduler.ts`: one timer handles both periodic60Hz and coalesced expedited notifications. All attempts share at least8.33ms spacing; expedited work retimes the periodic deadline; late callbacks skip stale periods. Inactive requests and callbacks that stop/restart cannot duplicate timer chains.
- `src/client/main.ts`: wire notifications to scheduler and register commands only after actual socket acceptance; advance prediction from render and accepted-input/snapshot processing through the same clock. Existing room/focus/status/result reset owners remain.
- Opt-in diagnostics retain previous fields and add fixed-step/history/aligned/fallback/null/missing/overlap/suspended/expiry/stall counts, ackTick/confirmed-held ticks and expedited attempts. No new default UI/global API, identities or uploads.
- `scripts/http-check.mjs`, `scripts/public-match-check.mjs`: coordinated protocol4 checks and reported version.

Shared Flash player/birdie/simulation code, geometry, source tuning, artwork, original filters/effects/audio and frozen archives were not edited.

## Test changes and observable evidence

Updated existing prediction, service, scheduler, native-input, actual Network, protocol and effects fixtures; added `tests/prediction-clock.test.ts`, `tests/hit-timing.test.ts`, and frozen `tests/fixtures/interpolation-v3.ts` (a9a0a88 interpolation implementation, imports/class name adjusted only).

### Elapsed-time motion

A400ms fixture with no serve-position clamp produces authority/local x240 at60/30/15Hz command delivery, and correction0 after a delayed consistent completed acknowledgement. The recorded old30Hz sender gave x195 versus authority240, correction45. New120Hz command changes and a100-command same-time batch still run24 physics steps over400ms, not48/100. Held-ack tests retain the first-use anchor after command pruning for160 steps.

Adversarial cases cover overlapping stale acknowledgements with continuing downlink, null/missing/coalesced anchors, oldest-input expiry, bounded long callback catch-up, rapid hit+jump then release, most-recent hit-time jump, source action latch behavior, fresh edges during fallback and advancing-ack recovery. Approximate asymmetric-stall fallback is not asserted to reconstruct unknowable one-way input time exactly.

### Actual interpolation-led contact A/B

The test runs the real frozen old interpolation and current interpolation over identical ordered30Hz authority snapshots. A180tick stable preparation establishes their presentation clocks, then a selected source-law flying-shuttle fixture is injected. The input cue is the first **displayed** flying shuttle; it is not chosen using the authoritative contact frame. Both runs use two-tick downlink, two-tick uplink, one fixed reaction tick and the next60Hz input sample. Extra lead0 means that same cue/reaction/sample policy. Synthetic initial trajectories use unchanged migrated Flash physics; preparation is fixture setup, not a claimed original-game rally recording. No Canvas/physical/public-network timing is measured by this fixture.

Delay below is the zero-based source simulation step index where the press is consumed after fixture start. Final completed-step swing frames are one later than contact diagnostic frames because source animation callbacks follow contact checks.

| Roles | Receiving sides | Snapshot phase | Equal extra lead | Old cue tick / consumed delay / outcome | New cue tick / consumed delay / outcome |
| --- | --- | --- | --- | --- | --- |
| Joe, Nadia, Harry, Pirate, Top Hat, Red | both independently tested | even | 0 |184 / d8 / miss |182 / d6 / legal overhead |
| Same six adult roles | both independently tested | odd | 0 |185 / d9 / miss |183 / d7 / miss |
| Same six adult roles | both independently tested | odd | 1tick anticipation |185 / d8 / miss |183 / d6 / legal overhead |
| Toaster | both independently tested | even | 0 |184 / d8 / miss |182 / d6 / legal overhead |
| Toaster | both independently tested | odd | 0 |185 / d9 / miss |183 / d7 / legal overhead |

Joe right even-phase0-lead post-step witness changes from no return/grounded point to returned shuttle x460.3575634383,y289.9983270797,vx−1196.5312876540,vy−905.1683668673; mirrored left x179.6424365617 with opposite vx. Toaster right even-phase witness returns at x437.0886072917,y298.0533656666,vx−1401.0936042217,vy−360.0717002479; mirrored left x202.9113927083 with opposite vx. These are fixture outcomes, not universal shot timing or unchanged-SWF runtime parity claims.

Counterexamples remain: original low-return Joe accepts d2 but misses d4; Toaster misses d2 but accepts d4. Both out-of-reach attempts miss. A smaller display buffer therefore does not universally turn earlier inputs into successful contact. The test sweeps equal anticipation values for all seven roles on both sides and both snapshot phases, instead of only assigning raw d6/d8 and calling that end-to-end evidence.

Existing ordered jitter/burst/450ms pause tests still assert no presentation rewind or ball extrapolation and bounded snapshots/delay. The smaller healthy buffer trades smoothness margin for response; main-session before/after transport and browser measurements should report holding/starvation rather than assume universal improvement.

### Actual transport/lifecycle evidence

Real Cookie/Origin/WebSocket tests verify completed-use ackTick1 after the first sampled burst step, unchanged metadata while held, null initial/release/timeout/paused-discard/resume metadata, legacy refusal, room/role ownership and identical same-tick authoritative state/results. Native Input→Scheduler→Network tests exercise expedited sends, rapid press/release and touch cancellation, actual disconnection/backpressure/throw rejection, retained edges/seq and blur cleanup. Parser tests reject invented clock/contact authority and invalid logical ranges. Default-off debug boundaries remain unchanged.

## Checks run

- `npx vitest run tests/prediction-clock.test.ts tests/hit-timing.test.ts tests/prediction.test.ts tests/input-scheduler.test.ts tests/input.test.ts tests/network.test.ts tests/protocol.test.ts tests/service.test.ts tests/classic/core.test.ts tests/effects.test.ts`: **10files/133tests passed**,23.33s, before independent review.
- `npm run lint`: exit0.
- `npm run typecheck`: exit0.
- Targeted Prettier write on owned changed TypeScript files; `git diff --check`: clean.

Earlier failing tests were corrected fixture assumptions: an unchanged fallback ack is intentionally not a new authority reconciliation; a manual30-packet fixture must update its test peer's next seq; after the fixture's short120ms timeout a later snapshot correctly has null ackTick; an already pending expedited request must finish before testing normal periodic spacing. No server rate limits, source motion/contact values or tolerances were relaxed to make those fixtures pass.

## Remaining work and limits

Independent checker owns the next full-scope review and may self-fix findings. Main session owns final lint/typecheck/full tests/build, isolated HTTP/current/legacy checks, browser A/B/lifecycle evidence, docs/spec synchronization, deployment/rollback and Git/session closure. Actual two-computer/public-network feel remains external acceptance. This release has no hit rewind, local shuttle prediction, widened contact geometry or framework migration. Bandwidth/RTT/frame rate alone does not prove contact feel or establish a latency guarantee.
