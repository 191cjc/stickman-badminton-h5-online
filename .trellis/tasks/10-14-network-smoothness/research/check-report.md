# Independent check — network smoothness

Reviewed the final application against the injected PRD/design/implementation
plan and frontend/shared/backend/deployment contracts. Review changes are limited
to missing regression coverage below and this report. No application, simulation,
wire, production, frozen asset or Git operation was changed by the reviewer.

## Findings (fixed)

- File: `tests/network.test.ts`
  - Issue: the existing input regression simulated failed delivery by omitting
    `commit`; it did not exercise actual `Network.send` readiness, buffered-output
    rejection or its new exception path.
  - Fix: added one paced input/network/prediction regression spanning disconnected,
    over64KiB buffered and throwing transport states. All leave sequence/history
    unchanged and preserve the pending jump/hit press. Recovery sends consecutive
    inputs1/2, edges appear exactly once and prediction records only accepted
    inputs. Stopping the timer prevents further sends.
- File: `tests/raster-cache.test.ts`
  - Issue: allocation failure coverage did not check failure after a canvas had
    been created, or eviction of remembered failure IDs under unique-key churn.
  - Fix: added separate missing-context and throwing-draw cases. Temporary
    backing stores become0×0, original images remain the fallback, retained
    failures suppress retries and old failure IDs are bounded/evicted.

## Findings (not fixed)

These were open at the initial application handoff. The final review below
resolves the specification and isolated-browser portions; public release checks
remain main-owned.

- Spec/document synchronization remains with main, as dispatched. The old
  `frontend/state-management.md` still describes12frames/fixed4tick receipt-anchor
  interpolation. `frontend/event-lifecycle.md` still documents consumed-before-send
  edges and the absence of guaranteed backpressure handling. Update these to the
  actual32snapshot/60jitter-sample monotonic timeline, adaptive4..12ticks and paced
  transactional input contract; the task expressly authorizes fixing the previous
  edge gap. Also add raster/input-scheduler/diagnostics ownership and actual cache
  bounds/API to directory/component/quality docs. These are intended contract
  changes, not reasons to revert the implementation.
- Final identical-workload DPR1/2 measurements, final-build HTTP, ordered browser
  delay/burst/stall, natural result/rematch/reconnect/layout and deployment checks
  remain main-owned. The reviewer did not start browsers or services. Unit checks
  establish neither a physical user-device FPS nor key-to-display latency. Verify
  actual cold-frame and steady cache eviction counts with original filters before
  publishing; meaningful improvement cannot be concluded solely from JS draw-call
  duration.

No unresolved application defect or authority/protocol design change was found
within this task. These remaining items are the already-planned main handoff.

## Reviewed behavior and bounds

- Raster source and `DrawFrame` destination registration/padding remain unchanged.
  Device scale uses the current2D transform, including DPR/world/player/particle
  scale and mirror/rotation; half-octave buckets span0.25..4. Backings are bounded
  to4096per side and24MiB per entry, with reduced density for oversized art. Cache
  count and bytes both enforce LRU eviction. Failure leaves original filtered art
  available rather than removing source effects.
- Static/actor/effect cache is256entries/64MiB; separately colored confetti is
  768entries/32MiB, so result color churn cannot evict court assets. Combined
  estimated RGBA backings are at most96MiB. This excludes browser/GPU copies and
  the existing499loaded source images. Unusually large transforms can soften art
  under the approved scale cap. Failed allocation can retain the old rendering
  bottleneck. Clearing a scene zeros backing stores and clears failure memory;
  existing confetti generation checks prevent old callbacks restoring reset
  colors/URLs. Rasterization itself is synchronous and adds no late callbacks.
- Same-room older ticks are rejected before semantic-boundary handling; duplicate
  playing ticks cannot reanchor state. Room/status/phase/score/role changes reset
  the timeline, including legitimate same-tick pause/resume. Within a continuous
  rally the render cursor only advances, rate slews within0.85..1.15 and holds at
  the latest received authority. No future ball step/collision/score is simulated.
  Contact/attachment discontinuities choose an actual shuttle snapshot; other
  discrete actions/clips also come from real snapshots. Effects consume sampled
  authority elapsed time; terminal animation/audio/particles retain their
  independently tested owners and deep-copied result actors.
- One page-owned60Hz timer, independent of RAF frequency, emits at most one input
  per callback and skips stale deadlines. It is stopped/cleared on the existing
  blur/hidden/pagehide/disconnection/result/leave/room transitions, and resumes
  with a fresh deadline on eligible focus/visibility/playing snapshots. Native
  Space controls and pointer release handlers remain intact. JS timers cannot
  run while the browser main thread is blocked; this is an explicit limit.
- `peek -> Network.send -> commit` is synchronous. Only accepted delivery consumes
  edges, advances sequence and enters local-player prediction. Existing server
  strict parsing, consecutive sequence, burst coalescing and completed-step ack
  are unchanged. The local predictor has no ball/contact/score authority.
- Diagnostic creation is guarded by `?debug=1`; the default page has no exported
  API or observer. The opt-in frozen API only exports detached numeric summaries
  of<=240samples, with finite bounded history. It contains no Cookie, secret,
  identity, IP, room identifier, upload or gameplay command. Page-lifetime scalar
  counters do not retain per-frame/per-message objects.

## Verification

- Lint: pass (`npm run lint`).
- TypeCheck: pass (`npm run typecheck`; also repeated by required build script).
- Tests: pass,14files/182tests (`npm test`,24.30s); targeted new
  network/raster checks also passed11/11 before the full suite.
- Build: pass (`npm run build`). Client `index-D_1GqhSC.js`104.77kB,
  `index-CDPOmVno.css`6.80kB; backend157.8kB. Reviewer additions are tests only, so
  application asset identity remains the implementer's final identity.
- Diff whitespace: pass (`git diff --check`).
- Authority/source isolation: no changes under `src/shared`, `src/server`,
  `public`, `reference` or `upstream`; full classic source/hash and simulation
  regressions passed in the suite. No other project/service/path was operated.

Application code is frozen and ready for main's final HTTP/browser measurement
and independent release verification. No implementation/check subagent was
spawned by this reviewer.

## Final documentation and evidence review

Reviewed the five updated frontend specs, README, GAME_SOURCE.json,
docs/design/deployment/validation and research/verification.md against actual
application owners and saved measurement summaries. All199local Markdown
targets in README/docs/specs exist. Corrected two local specification details:

- component-guidelines: remembered raster failures can be retried after a
  bounded failure-set eviction as well as an explicit clear.
- state-management: either-character changes reset interpolation; prediction
  itself keys own-character/room/status/phase/score, consistent with room-frozen
  roles.

The updated input/timeline/cache/diagnostic specs now reflect the implementation.
The old/new frame p95 and long-task counts match saved raw summaries:
DPR1 116.7→16.7ms on both sides, DPR2 433.3/450.1→50.0ms. HTTP507hashes,
ordered-network853/697same-state pairs and full-browser794pairs/24audio plays
also agree. Limits correctly distinguish headless/shared-host rendering,
ordered TCP delays, configured cadence and observed~43Hz weak-network sampling
from physical user-device latency or real packet loss. The scripted opponent
does not return serves, explicitly recorded rather than described as physical
rally acceptance. Main owns final cache/release evidence and corrected the
minor long-task range wording (one left sample is54ms from count2/mean55.5).

## Publication-gate burst-test race (first fix superseded)

Required publish checks exposed an existing race in `tests/service.test.ts`:
its burst test sent30separate WS messages and assumed every message arrived
before the next simulation callback. A valid partial delivery can cross a room
tick. The reported150→153.75position is exactly one Joe225/60movement step;
server coalesces the latest input actually received in each tick, not an atomic
batch inferred from the sender's loop. No server/runtime defect was found.

The first fix restarted its ephemeral service with Date/intervals/global
performance controlled and added an ordered ping/pong receipt barrier. This was
incomplete: the service imports node:perf_hooks.performance, which is independent
of the fake global performance replacement. The accumulator therefore still
used real elapsed time while interval callbacks advanced artificially. Earlier
passing repetitions below did not prove clock control; the second publish gate
timed out waiting for the next even-tick snapshot. This first fix and its clock
explanation are explicitly superseded by the imported-clock correction below.
The pong barrier and original exact gameplay assertions remain valid.

Historical checks after the incomplete first fix:

- Targeted case: initial pass plus20/20independent repeated runs.
- Full suite:14files/182tests pass,24.97s (Vitest4.1.11).
- Lint/typecheck/diff whitespace: pass.
- Production build: pass; unchanged `index-D_1GqhSC.js`,
  `index-CDPOmVno.css` and157.8kB backend.

No new application build or browser-performance measurement is required from
the test-only change. Publish must still complete its required gates and public
verification. Reviewer performed no production, deployment or Git operation.

## Final paced-input follow-up review

Main's targeted browser diagnostics identified further avoidable scheduler phase
loss. The implementer subsequently froze changes only to input-scheduler.ts and
its tests; the reviewer did not modify these application changes.

Reviewed the final schedule directly: requested delays use ceil, late callbacks
compute the first future point on the existing60Hz grid using after-step time,
and a future point less than one quarter-period (~4.17ms) away is skipped once
more. The skipped counter includes bypassed periods and this spacing guard.
There is still exactly one input attempt per callback and no loop/backlog replay.
Stopping inside a callback exits before any successor timer; stop/resume resets
the phase, with repeated activation remaining idempotent. The synchronous send
transaction and server coalescing/seq/ack semantics are untouched.

Three added observable regressions cover17/34/50ms ceil pacing without the
two-wakeup retry, delayed57ms arrival resuming at67ms rather than74ms, and a49ms
sample bypassing the too-close50ms grid to67ms. Existing independent RAF-rate,
long-stall, stop/restart/callback-release and actual failed-send cases remain
green. No concrete defect or additional reviewer code change was found.

Final code gates after the follow-up:

- Lint/typecheck/full tests: pass,14files/185tests,23.68s.
- Production build: pass; **index-DKa9Z-SC.js**104.83kB, unchanged
  index-CDPOmVno.css6.80kB/backend157.8kB.
- Whitespace and unchanged shared/server/public/reference/upstream: pass.
- The service burst fixture retains all exact position/action/tick/ack assertions
  and passed again in this full suite.

This is the final application freeze handed to main. Earlier rendering/browser
figures in this report refer to the pre-follow-up index-D_1GqhSC build; main will
rerun final HTTP/performance/browser acceptance against index-DKa9Z-SC before
publication. The scheduler-only adjustment does not establish an observed rate
or physical latency improvement by itself. No services or Git operation were
performed by the reviewer.

## Final imported service clock correction

The second publication-gate failure exposed the incomplete timer fixture rather
than a server broadcast throttle. The actual server emits snapshots on even
room ticks; it has no independent last-send33ms interval. Increasing fake timer
advancement alone would leave the real accumulator clock uncontrolled.

Final changes remain entirely in tests/service.test.ts:

- Capture `pollingNow = performance.now.bind(performance)` before any mock and
  use this native clock for Peer.wait deadlines, preserving real bounded network
  polling even while simulation time is frozen.
- Fake Date/setInterval/clearInterval and explicitly spy the service's imported
  perf_hooks.performance.now, returning Date.now minus the fixture origin. Do
  not rely on replacing global.performance. Restore all mocks during cleanup.
- Retain actual HTTP/WS and the ordered ping/pong after input30. Explicitly
  assert service clock0/40/80ms. Each40ms advance gives the real service ticker
  five8ms callbacks: the first stage emits tick2, the second emits tick4.
- Preserve exact x150, airborne, serve/swing, cleared latch, advancing animation,
  tick2→4 and ack30 assertions. No widened tolerance, input/authority/physics
  change or production operation.

Final validation: targeted initial pass plus20/20independent repetitions,
14files/185full tests pass (25.01s), lint/typecheck/diff-check/build pass.
Build remains index-DKa9Z-SC.js104.83kB, index-CDPOmVno.css6.80kB and backend157.8kB.
Main owns the already completed final application browser evidence and remaining
public release gates; this correction is test-only and needs no new browser
performance measurement.
