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

Each local logical frame runs `stepClassicPlayer` once at1/60seconds. Only the local character is predicted. Its read-only authority context chooses action type; prediction never contacts or mutates the ball. Action clocks are included in reconciliation.

On a snapshot, `Prediction.reconcile()` drops acknowledged frames, deep-copies the local authoritative player, and replays unacknowledged frames when playing. Score/phase/character/room-status changes reset prediction history; initialize from the first authoritative chosen-role state before local stepping. Position errors below40worldunits are smoothed with a decaying visual offset; larger errors and phase resets snap. History is bounded at 120 frames. These values describe current code, not measured latency targets.

Online rendering replaces only the local player in a sampled authoritative state. Ball flight and score remain server-owned.

## Remote interpolation

`Interpolation` retains up to 12 snapshots, targets four60-Hz ticks behind estimated server time, interpolates x/y/vx/vy while selecting discrete action fields from a real snapshot, and holds the latest available sample if packets stop. It clears the buffer on room changes or non-playing status/phase; it does not interpolate across a score/phase boundary.

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
