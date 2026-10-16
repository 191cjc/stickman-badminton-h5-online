# Implementation: bounded presentation and input timing

Date: 2026-10-16. Owner: dispatched timing implementer. Baseline: `4cf4570`.

## Boundary

The behavior gap is prolonged old authority presentation after blocked main-thread sampling, avoidable input cadence loss after late/expensive callbacks, and stale-sound metadata surviving event eviction. Changes remain in `Interpolation` (within `prediction.ts`), `InputScheduler`, `Effects` and their focused tests. `Prediction` mechanics/ledgers, server/shared simulation, protocol4, artwork, reference files, other entrances and services are untouched. The renderer/main/adaptive-density owner is implemented concurrently by another agent; its files were neither edited nor reverted here.

## Final behavior

### Authority presentation

- A continuous-playing sample gap **greater than250ms** triggers one forward recovery instead of spending multiple seconds at normal catch-up speed. Ordinary samples keep the existing0.85..1.15 rate and jitter adaptation.
- The authority clock is reanchored to the **latest actual snapshot tick and its receipt timestamp**. This prevents same-time ordered callback batches from leaving it anchored to an intermediate obsolete packet.
- Recovery chooses the rebased clock minus current target delay, clamped to the compatible buffered oldest/latest ticks and never behind the previous render cursor. Without fresh authority, receipt age can advance only to the latest real state, which then holds. No shuttle extrapolation/contact, score or result is invented.
- Existing room/status/phase/score/either-role boundaries still reset immediately. Contact/attachment transitions still select an actual discrete shuttle. There is no per-packet reanchor during normal presentation.
- Diagnostics return detached scalar `recoveries` (saturating at MAX_SAFE_INTEGER), `lastRecoveryPauseMs` and `lastRecoveryAdvanceTicks`, alongside existing target delay and actual latest-to-render gap. No histories, new default API or observer are added.

### Input scheduling

- The8.33ms minimum is between **attempt starts**. Synchronous callback work already consumes that time and is no longer followed by a second minimum-spacing reservation.
- Normal callbacks select the first future grid after callback completion; a too-near grid is retimed to `attemptStart + minSpacing`, rather than losing another whole period. The retimed deadline becomes the next periodic anchor. Expedited callbacks resume from their attempt start plus one period, or completion if already later.
- One timer, ceil-rounded waits, early-wakeup rescheduling, at most one attempt per callback, global stop/start spacing, expedited coalescing and generation guards remain. Expired periods still count as skipped; retiming a usable near deadline no longer counts as another discarded period. No input/edge transactional owner was changed.

### Effects and sounds

- Each queued event owns its `suppressSound` flag. The independent ID Set is removed, so pruning/processing/resetting the bounded128-event pending queue also releases all related suppression metadata.
- Opt-in diagnostic composition can read `suppressedSounds`, the number of retained sound events carrying suppression. It is always<=pending<=128, and zero after queue drain/suspend/reset.
- Added recovery lifecycle protection: sound freshness checks use the **current presentation target** as well as processing age. Catch-up through historical cosmetic ticks cannot replay previously queued sounds older than the existing inclusive6tick window. Fresh source sounds retain normal deduplication. The pre-existing>120tick catch-up behavior still suppresses its entire batch and re-enables fresh audio afterward.
- Particle emission amounts, lifetime stepping, spark/result depth ordering, source sounds/volume/tone, result cosmetic clocks and journal cursor rules are unchanged.

## Deterministic evidence

The current and baseline owners were loaded from working source and `git show 4cf4570:<path>` into separate in-memory TypeScript transpilation modules. No repository baseline copy or product state was modified. The same research fixtures were run against each owner.

### Blocked main thread with ordered same-time receipts

Continuous compatible authority:30Hz snapshots,60Hz sampling,3s warmup; both receipt callbacks and sampling stop during the block, then all queued packets run in order at the resume timestamp. These are simulated presentation gaps, **not measured physical latency**.

| Block duration | Actual gap immediately, before→after | Actual gap1s later, before→after |
| --- | --- | --- |
|300ms|45.83→53.01ms|48.21→49.78ms|
|500ms|245.83→63.09ms|107.78→52.64ms|
|1000ms|745.83→66.54ms|595.83→53.61ms|
|2000ms|1033.33→66.67ms|883.33→53.65ms|

The300ms case deliberately follows its current target delay rather than promising every trace has a smaller immediate gap. Jitter/delay decay remains unchanged: both target delay and actual gap reach the research<=50ms criterion2700ms after each current trace. Baseline1000/2000ms blocks required4683/6583ms for that combined criterion; baseline300/500ms already required2700ms. The50ms criterion is a reproducible comparison threshold, not a product latency commitment.

Repeating500ms blocks every2s yields actual gaps at6/10/20/30s of231.89/269.61/307.93/341.27ms before, versus57.80/57.80/57.80/57.80ms after. Repeating1000ms blocks yields1033.33ms at each observation before, versus66.67ms after. The target remains66.67ms. Tests assert monotonicity,<=latest, no invented contact, finite history<=32, and immediate semantic resets.

### Attempt-start cadence

Actual owner driven by one fake monotonic timer, count attempts starting<=1000ms:

| Callback cost | Every-dispatch lateness | Attempts before→after |
| --- | --- | --- |
|0ms|0ms|60→60|
|4ms|0ms|60→60|
|8ms|0ms|40→60|
|9ms|0ms|30→60|
|12ms|0ms|30→60|
|20ms|0ms|30→30|
|0ms|5ms|59→59|
|0ms|9ms|30→55|
|0ms|10ms|30→52|

All measured start gaps remain>=8.33ms; tests additionally exercise rapid expedited requests. Main-thread blockage still prevents timers running, so these fixtures do not promise60Hz on overloaded devices.

### Suppression lifetime and historical sound replay

A deliberately starved trace ingests90 contiguous bounded4-event bursts (two tail events, one smoke, one swing), each8ticks late.360events arrive while pending remains128. Baseline retains360independent silent IDs before advance and232after pending drains; current owns only the retained flags (32suppressed sound events) and zero after drain. Both versions produce91live particles after the same target200advance and no sound. This is a stress reproduction, **not proof of the user's memory leak**.

A separate initially-fresh queued-sound trace advances directly to tick60: the baseline plays the expired tick2 sound along with tick54 and60; the current owner keeps only the two sounds within6ticks. A180tick jump retains the prior whole-batch suppression. Subsequent fresh events play once in both cases. Continuous90tick presentation consumes exactly90source sounds once despite duplicate ingest/advance calls.

## Files changed

- `src/client/prediction.ts`: Interpolation-only recovery and numeric diagnostics.
- `src/client/input-scheduler.ts`: successor deadline spacing.
- `src/client/effects.ts`: queue-owned suppression and presentation-age sound guard.
- `tests/interpolation-recovery.test.ts`: blocked-sampling/batched-callback, repeated-stall, normal-slew, starvation/contact/boundary tests.
- `tests/input-scheduler.test.ts`: callback costs, late dispatch, early wakeup, retimed near grid and expedited callback-cost tests; retained existing lifecycle/coalescing coverage.
- `tests/effects.test.ts`: metadata bounds/drain/cleanup, historical-sound jumps and continuous source sound count.

## Verification and remaining work

Focused checks passed:8files/87tests (`interpolation-recovery`, `prediction`, `prediction-clock`, `input-scheduler`, `effects`, `input`, `network`, `hit-timing`), ESLint for the six owned source/test files, and `npm run typecheck`. Tests were first run against unchanged owners and exposed the stall/cadence/audio regressions; diagnostics-only assertions also initially failed because the new fields did not yet exist.

No browser, build, full-suite or production check is claimed by this subtask. Main session owns independent review, full quality gate, before/after600s browser workload, source visual/lifecycle acceptance, docs/spec updates and any actual release. Forward recovery visibly skips obsolete presentation after a freeze; real dual-computer feel and physical input latency remain externally verifiable. No deployment/restart, commit or remote push occurred here.
