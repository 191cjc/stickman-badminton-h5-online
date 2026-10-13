# Flash 90302 integration implementation

Implemented in the independently owned runtime, client, server, and root test files on 2026-10-13. No commit, public release, service restart, or modification of another game service was performed by the integration implementer.

## Live runtime boundary

`src/shared/simulation.ts` now exports the new `ClassicSimulation` as `Simulation`; state types and player serialization come from the classic plain-data player API. The former community runtime (`entities`, `config`, `player-step`, `ai-controller`, `flight`, and `math`, with their focused numerical tests) was removed from `src/shared`. The frozen `upstream/` and `UPSTREAM.json` were left intact for historical provenance. The previous full-match comparison against the abandoned community simulator was removed; the classic implementation worker owns independent numerical/source-evidence tests under `tests/classic`.

AI practice and every online authoritative room instantiate the same new classic simulation. Online client prediction advances only the local classic player. It reads the latest authoritative shuttle to choose an original swing but never modifies the ball, collisions, score, or result. It clones nested AI/latch state, filters history by incorporated/discarded input ack, and resets on room/score/phase/reconnect changes. Replay of unacknowledged motion, jumps, body frames, and explicit serve animation matches the authoritative shared player step in targeted tests.

## Timing and wire compatibility

Protocol is now 2, WebSocket subprotocol `badminton-v2`; simulation/input are 60 Hz and snapshots 30 Hz. One authoritative simulation frame samples the latest pending held input and coalesces press edges once. Ack advances after that one frame. Snapshot cadence and remote interpolation derive from exported constants, removing the former 120-Hz two-substep assumption. A packet burst is discarded/coalesced rather than accelerating physics. Sequence still identifies logical input scope, not server tick; ack and tick remain distinct.

The new client stops on incompatible session, hello, or `protocol_mismatch` error, clears retry/ping timers, and offers refresh. Manual reconnect cannot override that terminal mismatch. An authenticated legacy `badminton-v1` upgrade is accepted only long enough to send the mismatch error and close 1008; it never binds Guest.socket or acquires a seat. The old client already treats 1008 as terminal with a refresh message. Other unsupported/missing protocols remain rejected at upgrade. Root public verification scripts are owned/updated by the main session.

Cookie signing/HttpOnly/Origin checks, exact logical payload validation, server seat derivation, burst/rate limits, stale input release, pause on disconnect, same-Cookie seat retention, expiry verdicts, finished-room reclamation, rematch, and result authority retain the existing boundaries.

## Canvas and controls

The renderer preloads `public/classic/manifest.json` and its extracted SVG layers from the isolated base path. It uses the original logical 640×426 transform, source Joe scale ±1.25, source body labels/indices and action frames, source shuttle rotation, and stage-positioned background/net. Actions draw before the body according to original depth order. Attached shuttle comes from the original serve layer, avoiding duplicate drawing. There is no community stickman/physics fallback. Source Joe stays black on both sides; small side markers correspond to the existing HUD. Art-load errors remain explicit. Core integration checks compatibility of asset schema, fps, and world size.

The larger court and native game-area start/cancel/practice/leave buttons remain. The court aspect ratio now follows the Flash world. Keyboard/touch and focus release listeners were preserved; the new hint identifies side and source controls rather than community move-hit combinations. The main session owns source footer/doc updates and actual browser acceptance.

## Verification performed

- `npx vitest run tests/protocol.test.ts tests/network.test.ts`: 19 tests passed.
- `npx vitest run tests/prediction.test.ts tests/service.test.ts`: 28 tests passed, including real HTTP/WS two-guest same-tick state agreement, new original serve, full seven-point identical results, original burst semantics, independent identities, seat safety, pause/resume, collector/upgrade expiry, room reuse, and legacy-client rejection. This run took approximately 21.7 seconds.
- Targeted ESLint of all integration-owned runtime/client/server/root tests passed.
- `npm run typecheck` passed after classic worker's initial type errors were fixed.

Source/runtime parity, complete visual-frame/collision evidence, browser operation, and public publishing checks are owned by the main/core/art workers and are not asserted here. Targeted headless state/network tests do not establish physical key-to-display latency, external two-computer play, mobile pointer feel, other browsers, or weak-network experience.
