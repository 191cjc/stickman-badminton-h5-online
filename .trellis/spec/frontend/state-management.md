# Frontend state management

## Owners

| State                                                                                     | Owner                                              |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Scene (`idle`, `queued`, `online`, `result`), side, sequence, latest snapshot | [main.ts](../../../src/client/main.ts)             |
| Held keys and jump/hit edges                                                              | [Input](../../../src/client/input.ts)              |
| WS/retry/ping state                                                                       | [Network](../../../src/client/network.ts)          |
| Predicted local player, pending frames, correction offset                                 | [Prediction](../../../src/client/prediction.ts)    |
| Buffered authoritative snapshots                                                          | [Interpolation](../../../src/client/prediction.ts) |
| Online shuttle, collision, score and result                                               | [Server authority](../backend/rooms.md)            |

Use the existing state owners. An online UI button sends a command; it must not locally award points, switch room ownership, or restart the authoritative simulation.

## Prediction and correction

`Prediction.accept(input, at)` registers only successfully sent logical commands. `advance(at)` integrates fixed1/60second steps using the last accepted held state, independent of sender/RAF frequency; old held time advances before accepting a changed command. Jump edges OR and the latest hit edge retains hit-time jump, consumed once through shared `stepClassicPlayer`. Only the local character is predicted; ball context is read-only and never contacts, launches or scores.

`reconcile(snapshot, at)` uses server ack/ackTick and the local command's first-use step to replay elapsed unconfirmed steps. If first-use step isL, the confirmed-held candidate boundary is `L + snapshot.tick - ackTick`; it is valid only with complete history and no seq>ack owner at/before that boundary. Never prune an unacknowledged command using elapsed authority time. Retain an established ack anchor after old steps are evicted so held-only snapshots do not replay confirmed movement.

For null/missing/coalesced-away or overlapping anchors, one fallback generation rebases from current authority and coalesces outstanding operations into the next local step. Same-ack snapshots must not repeatedly rebase or restart an old edge; newly accepted input remains eligible. A numeric-to-null ackTick transition restores authority and clears confirmed held controls once, preserving seq>ack identities and consumed-edge markers; repeated null snapshots cannot rebase again. This bounded approximation handles unknowable asymmetric stalls, not exact rollback. History expiry suspends prediction for that ack generation; only ack progress or a real clear/reset allows recovery, never replay an expired edge every two seconds.

Per advance catch-up is at most6steps/100ms. Keep at most120 simulated steps,240 accepted commands and2seconds. Room/own-role/score/phase/status/focus/release/reset clears histories and anchors. Initialize from the authoritative chosen-role player. Position errors below40worldunits smooth through a decaying visual offset; larger or semantic resets snap. Preserve source action latches, not a forced successful hit.

Online rendering replaces only the local player in a sampled authoritative state. Ball flight and score remain server-owned.

## Remote interpolation

`Interpolation` retains up to32 snapshots and60 arrival-jitter samples. Its continuous render tick advances monotonically with a rate clamped0.85..1.15, and remains at or behind latest authority. Receive/server interval variation p90 adapts delay from2 to12ticks (33.3..200ms at60Hz); increase coefficient0.2, decrease0.025. Clock estimate corrections per arrival clamp-0.5..2ticks. These are configuration bounds, not measured physical latency. Stale same-room ticks are rejected before semantic resets; duplicate continuous ticks are ignored. Room/status/phase/score/either-character changes reset immediately; non-playing samples return the latest actual state. No interpolation crosses those boundaries. Starvation holds latest authority without ball extrapolation.

Test replay, rally reset, authority boundaries, and hold-last behavior using [prediction.test.ts](../../../tests/prediction.test.ts). Remote animation smoothness and real network feel are not established by these headless tests.

Ball attachment/last-toucher transitions must not be interpolated into invented contacts; select the actual discrete shuttle snapshot across such transitions.


## Presentation event contract

### 1. Scope / Trigger

Role/effect/room changes cross main, Prediction, Renderer, Effects and Audio. Use source-derived data and existing owners; presentation cannot mutate authority.

### 2. Signatures

[Effects](../../../src/client/effects.ts): `reset(room, resumed)`, `suspend()`, `ingest(snapshot)`, `finish(natural, state?)`, `advance(authorityTick, frameDt, onSound)`. [Audio](../../../src/client/audio.ts): `load(manifest)`, `unlock()`, `play(id)`, `toggle()`, `setMatch(active)`, `advance(frameDt)`, `stop()`. Music uses its own gain and source60Hz callback increments1/(2*30), independent of the mute mixer and RAF density; do not claim the source parameter2 is a measured native2-second ramp.

### 3. Contracts

Snapshot effects cursor is match-scoped. Deduplicate repeated journals, buffer future events, age/expire old transient effects. Reconnect skips historical audio through baseline cursor; result/snapshot order cannot duplicate cheer. Tail/smoke originate from server source emissions;60Hz particle steps remain independent of RAF. Natural result uses a separate60Hz clock after gameplay tick freezes. Deep-copied terminal actors still run shared stepClassicPlayer with empty input and pointActive:false: outgoing clips finish, airborne actors land, then Toaster bob/smoke resumes. Never write these clones back to authority or launch/contact/score from them. Particle bound768, color cache64, short audio voices32; all finite-lived references and URLs clean up on scene transitions. Audio fetch/decode/autoplay failure must not block assetsReady or matchmaking. Do not permanently cache a resolved empty decode batch when mute/unlock happens before raw sounds load; later loaded bytes must still decode.

Draw background→net→scores/markers→smoke→players→tail→shuttle→append-ordered spark/intro/result/confetti. Intro255 lasts2s then fades3*dt; Finish269 uses frame1 and fade4.5*dt. BigSpark final scale0.3, removed22. Confetti nested body color leaves filters intact; original0..256 integer color boundary and SVG/MP3 conversion are documented compatibility limits.

### 4. Validation & Error Matrix

| Condition | Expected |
| --- | --- |
| Duplicate/finished snapshot | No repeated sound/spark |
| Wrong room journal | Ignore |
| Reconnect/gap cursor | Current baseline; no historical audio |
| Slow/fast RAF | Same source particle density/lifetime |
| Natural seven-point result | Single cheer, ongoing bounded confetti |
| Leave/disconnect/timeout result | Explicit reason, no natural-win confetti/cheer |
| Exit/rematch | Old nodes/particles/URLs clear; stale image callback cannot repopulate |
| Autoplay/decoder rejection | Matching and play continue |

### 5. Good / Base / Bad Cases

Good: Toaster serves with pop and spark, while ordinary birdiehit is suppressed. Base: accepted miss swing plays whoosh only. Bad: predicted whoosh that replays during reconcile, wall-hit sounds absent from source, or constant RAF particle chance.

### 6. Tests Required

Effects tests: cursor duplicates/gaps/late events, result ordering, resume baseline, independent clocks, terminal airborne landing/clips/bob without authority mutation, deterministic stepping and particle caps. Audio tests: overlapping voices/mute/unlock failure and cleanup. Browser checks: original sprites/filters, actual decoded/playable sounds, source-control Space/M/Esc, seven choices and reachable compact menu. Record physical dual-machine/other-browser/weak-network limits separately.

### 7. Wrong vs Correct

Wrong: recolor the entire filtered image or let late image.onload resurrect a cleared scene. Correct: tint only nested body through bounded Blob images and retain lifecycle generation checks/URL revocation.

## Monotonic presentation contract

### 1. Scope / Trigger

Network receive timing crosses interpolation, prediction, effects and rendering. Arrival jitter must not rewind a continuous rally or create contacts.

### 2. Signatures

`Interpolation.push(snapshot: Snapshot, at: number): boolean`, `sample(now: number): GameState | undefined`, `diagnostics()`. `Prediction.accept(input, at)`, `advance(at)`, `reconcile(snapshot, at)`, `diagnostics(now)` adds accepted-input age and actual correction magnitude.

### 3. Contracts

Receipt/sample times use monotonic performance.now(). Reject non-finite receipt times and stale/duplicate gameplay snapshots. Main returns before updating latest/prediction/effects for rejected snapshots. Sample x/y/vx/vy within two compatible authority snapshots; discrete fields choose a real endpoint. Attachment/last-toucher transitions choose actual shuttle state. `renderTick` may reset across semantic boundaries, never within a continuous one. Sample dt is capped0.25s for bounded catch-up. Diagnostics expose target delay, available authority buffer, starvation entries and rewinds; no wire change or client ball stepping.

### 4. Validation & Error Matrix

| Condition | Expected |
| --- | --- |
| Uniform cadence | Two-tick minimum delay, bounded samples |
| Ordered jitter/burst | Adapt within bounds; render tick does not rewind |
| No next snapshot | Hold latest; do not extrapolate ball |
| Old tick from earlier score/phase | Ignore before resetting current segment |
| Same tick on reconnect/status boundary | Accept new semantic state |
| Either role/score/room/status/phase change | Clear old interpolation segment; own-role/score/room/status/phase changes also clear prediction history |

### 5. Good / Base / Bad Cases

Good: ordered450ms stream pause holds authority and resumes monotonically. Base: healthy30Hz snapshots interpolate at render cadence. Bad: reanchor every frame to latest packet arrival or extrapolate a guessed shuttle through the net.

### 6. Tests Required

Deterministic uniform/jitter/same-time bursts/stall recovery must assert no same-segment rewind, no beyond-latest sample, bounded32/60 histories, stale/duplicate rejection and immediate semantic reset. Compare old/new held frames on a fixed trace; browser checks both received states per tick under ordered TCP delays, natural result and reconnect. Real network feel remains separate.

### 7. Wrong vs Correct

Wrong: `target = latest.tick + (now - latest.at) * SIM_HZ / 1000 - 4` recomputed as the cursor on every packet. Correct: advance a persistent cursor with bounded rate, slew clock estimates, cap at latest authority and reset only on semantic boundaries.

## Elapsed prediction verification

Assert400ms held movement at60Hz and30Hz sends reaches the same authority position;120Hz logical changes cannot double speed. Test two ledgers, coalesced edge ownership, retained held anchors, null ackTick, asymmetric-uplink overlap, same-ack fallback without repeated swing, expiry without edge resurrection and eventual acknowledgement recovery. Bounds must hold under sustained sends and multi-second stalls. Diagnostics expose fixed steps, alignment/fallback reasons, stalls/expiry/suspension and confirmed-held age as detached bounded numeric/boolean state.

Wrong: one predicted physics step per sent packet, or `steps.filter(step.id > candidate)` without checking unacknowledged owners. Correct: fixed elapsed-time advance, then validated server-owned replay boundary or a single bounded fallback generation.
