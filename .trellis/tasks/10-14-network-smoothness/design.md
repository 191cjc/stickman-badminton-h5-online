# Network smoothness design

## Scope and ownership

Preserve original shared simulation, seven-character source data, effects/audio,
server authority and protocol3. One implement agent owns application/test changes
and implementation report; a subsequent independent check agent reviews the whole
task. Main owns measurement harnesses, final docs/specs, release and Git.
No new user-owned scope choice remains: requested recommendation is measurement
and incremental optimization. Framework migration is deferred without evidence.

## 1. Measurements and drawing

Baseline browser harness in ignored artifacts records RAF intervals/callback CPU,
long tasks, draw counts, received snapshot gaps/bytes with two independent guests
at1440×1000,DPR1/2. Initial data and filter-only attribution are recorded in
research/baseline.md. JS draw-call durations do NOT include all deferred browser
raster work; frame intervals and long tasks are therefore essential evidence.

Renderer should draw reusable raster representations of the original filtered
SVGs instead of forcing SVG raster/filter work for every frame. Use bounded lazy
or warmed canvas/ImageBitmap caching, preserving DrawFrame origins/padding,
original filters, alpha/depth, mirrored characters and transforms. Quantize raster
scale so shrinking particles do not create a canvas per scale per frame. Respect
actual DPR/world/player scale for crispness; avoid repeatedly allocating huge
background caches and evicting the same hot assets. A static court layer may be
cached separately while net/score/brand layering remains source-correct.

Cache limits include count and pixel bytes; oversized/failed allocations need a
bounded, visually valid fallback. Document actual limits. No mutation of SVG
source, manifest, source hashes or original recovered files. Dynamic colored
confetti keeps its existing bounded color/Blob generation contract and gets a
raster path where useful; generation reset prevents stale images from returning.
Clear scene resources on room/role transitions, preserve page-owned controllers.

## 2. Monotonic remote presentation timeline

Replace direct latest-arrival anchoring with a local monotonically advanced render
tick for a continuous room/rally. Estimate server progression from tick/monotonic
receipt samples; a bounded jitter/gap history chooses a bounded interpolation
delay. Initialize near the existing two-snapshot delay on healthy data. Correct
clock error by bounded speed/slew rather than jumping backward on every packet;
the rendered tick cannot move backward within the same semantic segment.

Keep snapshots bounded and ignore duplicate/stale ticks within a segment before
they can corrupt state. Under short starvation hold the newest authority; never
predict collisions/score/attachment from guessed ball flight. Resume with monotonic
time and bounded catch-up. Phase/score/character/room/status boundaries reset the
timeline immediately, even when reconnect resumes at the same tick. Distinguish
same-segment stale packets from legitimate semantic changes; transport is ordered.
Expose buffer, target delay, starvation and rewind counters for validation.

Positions/velocities interpolate only within compatible states. Clip frames,
action latches/side/contact fields remain actual discrete values. Effects consume
the chosen authority time; result-clock/audio event dedup and terminal copies
must remain correct when sampling holds, speeds up or resets.

## 3. Fixed input sampling and edge delivery

Move60Hz sampling/prediction from RAF to one page-owned paced logical scheduler;
RAF owns rendering/cosmetics only. Bound long-stall recovery and do not pour stale
input backlogs into the authority. The scheduler runs only in an active connected
visible online scene; resets clocks on stop/resume. All existing blur/hidden/
pagehide/disconnect/leave/result/reconnect release routes stop or clear it.

Sending and consuming input edges must be transactional: a failed Network.send
cannot silently discard a jump/hit press. Choose a minimal peek/commit or explicit
restoration contract, with no double edge after successful delivery. Sequence
advances and prediction history change exactly for accepted input, preserving the
server's strict consecutive sequence/parser/ack semantics. The new task explicitly
covers the existing spec's documented client backpressure edge gap. Shared player
steps remain1/60 and local-only, with ball authority read-only.

## 4. Bounded diagnostics

Opt-in local diagnostic mode (`?debug=1` or similarly explicit developer entry)
reports FPS/frame gaps, raster cache stats, snapshot gap/bytes/RTT, interpolation
buffer/starvation and correction magnitude/ack age. Default court UI remains
simple. Use finite rolling statistics, cheap or disabled hooks by default; no
telemetry upload, Cookie/secret/PII capture or gameplay commands from diagnostics.
Prefer a read-only snapshot/export surface for the browser harness. Measure
actual correction instead of substituting RTT for input responsiveness.

## Validation and rollout

Deterministic tests compare old and new timeline behavior under reproducible
jitter/bursts/stalls; do not settle for mirroring assignments. Cache tests cover
eviction/oversized bounds/reset/scale buckets and original origin drawing; scheduler
tests cover multiple RAF cadences, timer stalls, send rejection and all releases.
Then lint/type/full tests/build and isolated HTTP precede browser checks.

Main runs the same before/after rendering harness with filters intact, plus ordered
WS delay/burst/stall injection and a complete natural-result/rematch/reconnect
regression. A same-source no-filter test is attribution only, never release art.
Record exact environmental limits and observed measurements. Existing release
baseline `20261013T110500Z-versus` is rollback target; publish only this project,
preserve production env, snapshot prior services/config hashes and check afterward.
No protocol bump unless an unavoidable contract change is reported to main before
implementation; planned work is wire-compatible v3.
