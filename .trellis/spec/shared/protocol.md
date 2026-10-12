# Wire protocol and timing contracts

## Shared definitions

[protocol.ts](../../../src/shared/protocol.ts) defines PROTOCOL=1, BASE_PATH `/badminton-h5-online/`, SIM_HZ=120, INPUT_HZ=60, SNAPSHOT_HZ=30, reconnect 15 seconds, result retention 30 seconds, and input timeout 750 ms.

Client and server import shared message types. Some consumers currently use literals (client stepping/interpolation, room modulo cadence, network retry time, and Vite/ops paths). Search all source, config, scripts, and documentation references when tuning a constant; changing its export alone does not update every consumer.

## Logical messages

| Direction | Messages | Owner/behavior |
| --- | --- | --- |
| Client to server | input | seq, move -1/0/1, jump/hit held and press edges |
| Client to server | queue/cancel/leave/release | Matchmaking, exit, or clear logical input |
| Client to server | ping | Client monotonic time echoed for RTT |
| Server to client | hello/queued/idle/matched | Session config and scene/seat transitions |
| Server to client | snapshot | room, tick, ack, room status, reconnect remaining time, GameState |
| Server to client | result | Authoritative winner, score, reason |
| Server to client | error/pong | Operation feedback or RTT response |

`parseClientMessage` rejects extra fields and validates logical-input values; room/seat identity is derived from the authenticated socket. Sequence numbers are integer 1..2,000,000,000 and must arrive continuously. Client payload cannot contain physics state or internal hit-combo locks. The current command-type coercion exception is documented in [backend input validation](../backend/identity-and-input.md).

## Cursors and authority

Tick identifies fixed simulation advancement; ack identifies incorporated/discarded logical input frames. They are not interchangeable. Input coalescing can acknowledge several received frames with one two-substep sample; phase/release/disconnect changes can discard pending inputs. Do not assume one sequence always equals two server ticks.

Snapshot authority covers both players and the shuttle/score. Browser prediction may replace only the local character for presentation and then reconcile against ack. Remote interpolation uses tick; it must not invent scores, collisions, or results.

New room matching creates a new sequence scope. Same-Cookie reconnect uses the retained seat and snapshot ack to continue the existing scope; `main.ts` takes max(seq, ack) after matched/reset. Change room, sequence, and buffer reset handling together.

## Validation and compatibility

The client compares the session protocol and offers WS `badminton-v1`; server validates the subprotocol. A breaking wire change must coordinate shared types/parser, server dispatch, client handlers, tests, and frontend/backend deployment. Do not claim schema validation on client inbound JSON: it is currently asserted as ServerMessage after parsing.

Use [service tests](../../../tests/service.test.ts) for strict inputs, independent identities, burst sampling, room lifecycle, and agreement of results; [prediction tests](../../../tests/prediction.test.ts) for ack replay/tick interpolation. Public scripts additionally verify same-origin HTTP/WS deployment, while browser/two-computer effects remain [external acceptance](../../../docs/validation.md).
