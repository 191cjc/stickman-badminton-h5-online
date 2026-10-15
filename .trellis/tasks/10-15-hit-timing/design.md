# Hit-timing optimization design

## Boundary and rationale

The observed gap is additional online anticipation for return shots, with rare local-character pullbacks. The relevant owners are the client prediction clock, paced input delivery and delayed authority presentation. Keep Flash90302 physics, source geometry, animation clocks, server contact order and result authority unchanged.

Two independent findings justify this scope:

1. The old predictor advances once per sent packet while the authority advances per elapsed fixed tick. A 400-ms/30-Hz sender fixture leaves prediction 45 units behind and causes a snap (`research/local-prediction.md`).
2. Buffering four simulation ticks adds more visible-ball age than buffering one 30-Hz snapshot. Synthetic mirrored character fixtures contain legal return windows at six ticks of consumed delay that close at eight (`research/authority-timing.md`).

Do not add a historical-ball/current-racket collision fallback: it mixes timelines, can launch from the wrong location and cannot correctly handle intervening contacts, net RNG, ground or published points. Full rollback and speculative ball presentation are separate future work, contingent on measurements from this release.

## Ownership and expected files

| Owner                                                      | Necessary changes                                                                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/client/prediction.ts`                                 | Fixed-time local stepping, replay anchors, shorter healthy interpolation delay, bounded diagnostics                                    |
| `src/client/main.ts`                                       | Advance prediction using monotonic time independently of send count; wire logical-change notification and reset paths                  |
| `src/client/input.ts`                                      | Notify logical changes after held/edge state updates, preserving keyboard/pointer semantics                                            |
| `src/client/input-scheduler.ts`                            | Coalesced expedited samples with a strict rate bound and one owned timer                                                               |
| `src/shared/protocol.ts`                                   | Protocol4 and server-owned `ackTick` metadata; client input shape unchanged                                                            |
| `src/server/service.ts`                                    | Track first completed tick using the newest command, explicit discarded/reset ack metadata, reject legacy versions before seat binding |
| `scripts/http-check.mjs`, `scripts/public-match-check.mjs` | Coordinated version/handshake expectations                                                                                             |
| Relevant `tests/`                                          | Behavioral timing, input, protocol and real-service regressions; existing source-mechanics tests remain the parity guard               |
| `docs/`, affected `.trellis/spec/`                         | Timing contracts, actual validation, protocol compatibility, release/rollback notes                                                    |

No source change is expected in shared player/birdie/simulation mechanics, artwork, audio, renderer or upstream archives. A necessary change outside this boundary must first explain the evidence and update planning; do not silently expand implementation.

## 1. Local elapsed-time prediction

### Fixed steps and accepted commands

Decouple command acceptance from simulation advancement. Continue to commit a press edge and advance input seq only when `Network.send` accepts the frame. Register that accepted logical command with a monotonic local time. Advance the predictor with exact `1/SIM_HZ` shared-player steps using the last accepted held input. Consume jump/hit edges once at their eligible step, then retain held flags only.

Advance from render callbacks and around accepted input/snapshot processing so a slower sender does not make local simulation run at half speed. These callbacks share one accumulator; calling it twice at the same time cannot advance twice. Integrate the previous held state over time preceding a new command rather than applying a late new direction retroactively to a blocked interval. Presentation smoothing still operates on the resulting own-player clone.

Bound catch-up to 6 fixed steps/100 ms per advance. An overlong gap, missing history or inconsistent anchor discards the incomplete replay timeline and uses a fresh authority anchor rather than an arbitrary large dt or unbounded work. Retain at most 120 simulated steps and 240 accepted commands, with an additional two-second age limit. These bounds cover normal 60-Hz stepping and the expedited sender's maximum120-Hz attempts. An overrun is diagnostic data, not evidence of network loss.

### Server acknowledgement anchor

Extend every snapshot with `ackTick: number | null`:

- A numeric value is the first completed room tick that simulated the logical command named by `ack`. It is not the number of received messages.
- When a new pending command becomes current, run the existing authoritative step first, then record `ack` and that completed tick. Held-only steps retain ackTick while snapshot.tick advances.
- A clear/discard path (release, timeout, disconnect/reconnect clearing or non-playing input) sets ackTick to null, even when ack advances to received. This explicitly says no replay anchor can be inferred from that acknowledgement.
- Initial ack0 has ackTick null. Numeric values are integers in `[1, snapshot.tick]`.

Maintain separate accepted-command and simulated-step ledgers. Preserve edges when several commands arrive before one local step: latest held values, OR of jump edges, and latest hit edge with its hit-time jump, mirroring server coalescing. Never overwrite an unconsumed edge merely because a newer held command exists.

For a consistent replay anchor, retain the local fixed step at which an accepted ack command first took effect. If its local step is `L`, use `L + (snapshot.tick - ackTick)` as the boundary for already-simulated **confirmed-held** steps. This mapping is conditional, not a universal clock identity. It must never discard a logical command/edge with seq greater than ack. Restore the authoritative player and replay retained steps after the valid boundary, including subsequent held steps; do not replay exactly one step per sequence.

Keep the current ack anchor after older history is pruned so repeated unchanged-ack snapshots can account for held duration. If the proposed boundary overtakes any unacknowledged step, the anchor is inconsistent (for example, during an asymmetric uplink stall). A command coalesced away before a local step, missing/expired history or null metadata also prevents exact anchor replay. Do not claim exact reconciliation in these cases or merely replay all old steps on top of a snapshot that already contains elapsed movement.

Use an explicit bounded fallback generation instead: capture a fresh authoritative actor once, coalesce the retained unacknowledged logical batch into its next local step, and then continue local fixed stepping. Same-ack snapshots may refresh read-only ball context but must not repeatedly rebase the actor/restart the same edge. Newly accepted commands still enter the next-step coalescer normally; suppression applies only to already-consumed old edges. Shared source latches may reject an edge during an active action; never force a successful swing or contact.

An advancing ack or a fresh semantic clear/reset permits a new authority reconciliation. Expiry of the two-second history bound instead suspends local replay for that same generation and falls back to authority; it must not repeatedly recreate a generation that replays an old hit every two seconds. Keep command acknowledgement distinct from step-history eviction, with bounded bookkeeping to remember consumed/expired edges. A numeric-to-null ackTick transition can invalidate an anchor once but cannot acknowledge seq>ack. Never resend old commands. Track this approximate fallback separately from ordinary exact-anchor replay. Long-stall tests assert bounded work, edge retention, no action restart and eventual authority recovery, not exact pose equivalence during unknowable one-way delay.

Room, own character, score, phase, connection status, blur/hidden/pagehide, release, rematch and reconnection clear replay anchors and held/edge state through existing owners. Preserve existing small-error exponential visual smoothing and 40-unit snap rule until measurements justify tuning; masking a wrong clock with a larger smoothing threshold is out of scope.

## 2. Expedite logical operation changes

Input emits a notification when logical held values or a press edge actually change, after updating state. Ignore key repeat, unmapped keys and duplicate keys that leave the logical action unchanged. Cover keyboard release and pointerup/cancel/lostcapture, including a press-and-release before the next sample.

The existing page-owned scheduler gets a coalescing request method. When active it can move its next sample earlier; all attempts, periodic and expedited, share a minimum spacing of `1000/(2*INPUT_HZ)` (8.33 ms). Thus sustained traffic stays at most about120 input attempts/s plus timer rounding, below the existing server180 message/s policy. Normal unchanged held input remains60Hz. An expedited sample resets its next periodic deadline rather than leaving a second timer or a duplicate near-immediate periodic send.

Inactive requests do nothing. Failed sends preserve edges/seq exactly as today; the next bounded attempt retries. Callbacks that stop/release cannot resurrect a timer. Late callbacks send one current sample and skip stale deadlines; no catch-up wire burst. Local movement never advances according to this higher possible message count.

## 3. Reduce presentation waiting

Keep SIM_HZ60 and SNAPSHOT_HZ30. Change the healthy interpolation minimum/initial target from two snapshots (4ticks) to one snapshot (2ticks). Compute this baseline from constants in one place, including reset and adaptation; do not leave the old literal4 in a secondary path.

Retain the current p90 arrival-variation measurement, slow decrease/quick increase policy, maximum12ticks, bounded32 snapshots/60 jitter samples, monotonic cursor and0.85..1.15 slew. Healthy configured waiting becomes approximately33.3ms instead of66.7ms. These are configuration values, not promised network or physical latency. Jitter may still increase waiting.

Interpolation stays inside real snapshots. Hold the newest real state on starvation. Never extrapolate through a contact/net/wall/ground, blend across attachment/last-toucher changes, or rewind a continuous rally. Room/score/phase/status/role boundaries keep their reset behavior; effects/audio consume the same presented authority time and remain deduplicated.

## 4. Protocol and operational compatibility

Use protocol4 / `badminton-v4` because replay depends on ackTick semantics. Keep state version `flash-90302-v2`, gameplay rates, client input keys, Cookie identity, side ownership, reconnect15s and independent route unchanged. Handle v1/v2/v3 as recognizable legacy handshakes that receive protocol_mismatch and close1008 before guest/socket/seat binding. A page detecting session/hello mismatch stops retries and asks for refresh.

Update both checking scripts, tests, README and current contract docs together. No Nginx/systemd route change is required. Build and switch frontend/backend atomically with the existing publish script; preserve production secret/environment. Restart clears in-memory matches as already documented. Baseline rollback target at planning is release `20261014T064853Z-fisoonline`; verify the actual current target immediately before a later publish and record it. Roll back the entire release and refresh pages, not only one side of protocol4.

## 5. Diagnostics and verification

Reuse the default-off debug API. Preserve existing detached finite summaries, no identity fields or uploads. Add only counters needed for fixed steps/catch-up/history fallback, expedited samples, and the server-ack anchor/held duration. Existing interpolation delay/available authority gap and RTT/frame statistics already cover the rest. Label displayed authority gap separately from public-network input latency.

Behavioral gates:

1. Reproduce the old400-ms discrepancy; compare regular/reduced sends with time-based stepping and consistent delayed acknowledgements. Test unchanged ack across held ticks, coalesced commands, and asymmetric uplink stalls where the held-time boundary crosses an unacknowledged edge. Assert that fallback cannot erase/restart that edge or claim exact reconstruction.
2. Exercise actual Input->Scheduler->Network transaction on keyboard/pointer changes, rapid edges, failed send, throttling, stopping and background/focus resets.
3. Drive actual interpolation with deterministic ordered30-Hz snapshots and synthetic two-way transport delays. Apply the same visible cue to identical source-valued shuttle trajectories. Compare old4-tick and new2-tick buffers; show a legal return restored, preserve illegal misses and character-specific timing counterexamples. Test both sides/all seven role geometries.
4. Keep jitter/burst/stall, stale-packet, monotonicity, hold-last and effect/result/reset coverage. Record starvation/holding trade-offs rather than asserting lower waiting always improves every stream.
5. Use real authenticated HTTP/WS service tests for ackTick, legacy rejection/seat ownership, input bursts, release, timeout, reconnect, natural result and rematch; peers agree on same-tick ball/score/state.
6. Run lint/typecheck/full tests/build and isolated HTTP before authorized targeted two-page browser checks. Preserve original SVG filters/effects. Compare actual input cadence, frame gaps, correction distribution and authority gap under the same workload; targeted no-render diagnostics can isolate timing but cannot replace visual acceptance.

Physical two-computer timing and other networks remain external acceptance. No guaranteed delay reduction is inferred from an RTT, synthetic frame count or same-host headless result.
