# H5 integration boundaries

## Baseline and observed gaps

Baseline: `main` at `860ecc5`, working tree contains only this planning task. Frozen source/previous source archive work is complete; this task has not changed application code or deployed a release.

| Behavior | Present owner/evidence | Required change |
| --- | --- | --- |
| Match characters | `src/shared/classic/simulation.ts:49`, `src/shared/classic/player.ts:17` create Joe on both sides | Pass server-owned character IDs into creation; use source-backed character profiles and geometry. |
| Serve/contacts | `src/shared/classic/simulation.ts:217`, `src/shared/classic/simulation.ts:257`, `src/shared/classic/simulation.ts:276` use global Joe geometry and release rules | Select each character's serve origin, action timeline, hitbox and shot behavior. Preserve ball flight implementation. |
| Actions/prediction | `src/shared/classic/player.ts:214`, `src/client/prediction.ts:20`, `src/client/prediction.ts:33` use Joe clips and only reset on score/phase/status | Extend serializable character state and role-specific timers; seed prediction from authority before accepting input, reset across character/room boundaries. |
| Current AI | `src/shared/classic/simulation.ts:97` adds ad-hoc normal/boss movement/errors, `src/shared/classic/ai.ts:87` uses Joe computerZone | Remove live practice/AI mode: latest user scope is original versus only; keep source AI evidence archived. Preserve deterministic gameplay RNG for actual ball rules. |
| Effects | `src/shared/classic/simulation.ts:301` maintains a private contact ring; `src/client/renderer.ts:77` draws no FX | Introduce bounded authoritative presentation events; render original resources using separate cosmetic state. |
| UI/selection | `src/client/main.ts:51`, `src/client/main.ts:265`, `src/client/main.ts:281`, `index.html:44` offer match/practice but no roster | Extend the existing court menu, lock selection during queue/match, keep separate active leave layer, remove practice. |
| Input | `src/client/input.ts:4`, `src/shared/protocol.ts:14` only keyboard/touch logical inputs | Restore source Space→hit and same bindings on both computers; no pointer protocol for excluded Robot; no physics values from clients. |
| Queue/room | `src/server/service.ts:37`, `src/server/service.ts:264`, `src/server/service.ts:303` queue Guests without character choice | Queue carries validated character ID; immutable roster on room creation and reconnect. |
| Wire compatibility | `src/shared/protocol.ts:5`, `src/server/service.ts:158`, `src/server/service.ts:369` use v2 with only legacy v1 rejection | Breaking character/event state warrants protocol v3; reject v1 and v2 before acquiring any guest/seat; coordinate scripts/docs/client/server. |

## Architecture invariants

- Cookie, Origin, socket and seat ownership remain in the server service. Character choice is an enum selection, never a request for a room or side.
- Authority runs one 60-Hz simulation step; inputs at 60 Hz and snapshots at 30 Hz remain grounded in the original 60-fps source.
- Shared player stepping remains the sole movement/action implementation for server and local prediction. Ball contacts, flight, score and results are never predicted by the client.
- Per-character extraction changes the global-Joe geometry API but does not justify rewriting existing birdie collision/flight. Tests must establish the default Joe path still behaves as before.
- Events carry stable match-scoped IDs and the originating simulation tick/time; consumers must deduplicate repeated snapshots and align rendering with sampled authority time.
- A resumed connection uses a new presentation baseline: discard previous visual particles/voices and never replay old events. Old room events cannot enter the new room.
- Cosmetic RNG is independent of authority RNG. Source Flash used shared `Math.random`; H5 should document cosmetic partitioning as a deliberate network/replay adjustment rather than claiming an identical Flash random stream.
- Browser animation and audio are presentation owners. Pause them during reconnect, expire/limit local effects, and clear them at scene/room boundaries. No wall-clock gameplay callbacks or particle objects in the authority collision model.
- Original archive is immutable and excluded from public/dist. Only validated derived art/audio and generated geometry are served.

## Wire and presentation considerations

`snapshot()` is currently plain gameplay data, not a private restoration checkpoint. Keep transport effect envelopes distinct from prediction restore state so source actor steps cannot replay sounds or manufacture particles during reconciliation.

Current `finish()` sends result before a final snapshot (`src/server/service.ts:224`). The integration must deliver final contact/point effects once while entering result, preserving room scope and final authority tick. Duplicate finished snapshots (sent at 30 Hz) cannot restart victory audio/particles.

Current `main.ts` retains a backdrop after practice/result and discards latest upon idle/reclaim (`src/client/main.ts:147`). A result presentation needs its own source-derived elapsed clock: frozen gameplay elapsed must not stall celebration or restart transient clips each paint. Original qualifying victory confetti continues until leaving the result scene; bound live particle count/lifetime without inventing a timed celebration cutoff.

Backend bounds are 1024-byte client payload, 180 messages/s, pending 120 inputs, server output 256 KiB. New enum choice must fit these unchanged limits; pointer input is not added. A bounded event ring (for short snapshots gaps only) must be tested for steady memory/output, especially at 60-Hz tail cadence; do not ship all particle positions each snapshot.

## Change ownership for later execution

1. Asset generator and numeric source metadata: `tools/flash-assets/`, `public/classic/`, generated `src/shared/classic/assets-data.ts`, asset tests.
2. Shared role mechanics/events: `src/shared/classic/{types,player,animation,ai,assets,simulation}.ts`, `src/shared/{types,state,protocol}.ts`, source-value/core/protocol tests.
3. Authenticated roster/event delivery: `src/server/service.ts`, service/network tests, protocol checking scripts.
4. UI/input/prediction/presentation: existing client owners plus focused effects/audio modules, `index.html`, CSS, prediction/effect lifecycle tests.
5. Scope/provenance/validation/deployment documentation and source-backed spec refresh.

Asset generation precedes core integration. Shared public contracts need one owner; parallel asset/core work may proceed only with an agreed schema and ownership. Frontend/backend integrate once those contracts exist, followed by a whole-task independent check.

## Validation boundary

Planning changes need artifact/link checks only. Implementation requires source-derived numeric/asset tests, deterministic gameplay with FX on/off, real local authenticated HTTP/WS pairs, lint/type/build and isolated HTTP checks. Prior user authorization permits targeted original-SWF compatibility-runtime and H5 browser checks after code/HTTP verification. Those checks do not establish native Flash parity, physical dual-computer latency, mobile pointer behavior or public weak-network acceptance.

No production restart or unrelated route/service change belongs to planning. Publication later needs a verified concrete release and coordinated frontend/backend version switch; reference/resources of existing original/community/cloud entries remain read-only.
