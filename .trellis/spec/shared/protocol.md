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

`parseClientMessage` requires a string discriminator, rejects extra fields and validates logical-input values; room/seat identity is derived from the authenticated socket. Sequence numbers are integer 1..2,000,000,000 and must arrive continuously. Client payload cannot contain physics state or internal hit-combo locks. See [backend input validation](../backend/identity-and-input.md) for WS policy-close behavior.

## Cursors and authority

Tick identifies fixed simulation advancement; ack identifies incorporated/discarded logical input frames. They are not interchangeable. Input coalescing can acknowledge several received frames with one two-substep sample; phase/release/disconnect changes can discard pending inputs. Do not assume one sequence always equals two server ticks.

Snapshot authority covers both players and the shuttle/score. Browser prediction may replace only the local character for presentation and then reconcile against ack. Remote interpolation uses tick; it must not invent scores, collisions, or results.

New room matching creates a new sequence scope. Same-Cookie reconnect uses the retained seat and snapshot ack to continue the existing scope; `main.ts` takes max(seq, ack) after matched/reset. Change room, sequence, and buffer reset handling together.

## Validation and compatibility

The client compares the session protocol and offers WS `badminton-v1`; server validates the subprotocol. A breaking wire change must coordinate shared types/parser, server dispatch, client handlers, tests, and frontend/backend deployment. Do not claim schema validation on client inbound JSON: it is currently asserted as ServerMessage after parsing.

Use [service tests](../../../tests/service.test.ts) for strict inputs, independent identities, burst sampling, room lifecycle, and agreement of results; [prediction tests](../../../tests/prediction.test.ts) for ack replay/tick interpolation. Public scripts additionally verify same-origin HTTP/WS deployment, while browser/two-computer effects remain [external acceptance](../../../docs/validation.md).

## Boundary regression contract

### 1. Scope / Trigger

Untrusted command discriminators and expiry results cross the shared parser/server/consumer boundary. Keep the intended version-1 payloads compatible while rejecting malformed shapes and applying the same expiry verdict at both server entry points.

### 2. Signatures

`parseClientMessage(raw: string): ClientMessage | null` is the public parser. The service-internal `expireReconnect(room: Room, expired: Side): void` owns expiry completion/reclamation; it is not a client command or exported testing API.

### 3. Contracts

Logical commands have exactly `{ type: "queue" | "cancel" | "leave" | "release" }`. Input/ping retain their existing fields and ranges. Expired seats receive `{ type: "result", winner: Side | null, reason: "disconnect", score }`, followed by idle/reclamation. The opposite guest's bound socket determines the forfeit winner. Cookie, Origin and seat checks still precede dispatch.

### 4. Validation & Error Matrix

| Condition | Observable outcome |
| --- | --- |
| Valid string command, exact keys | Parser accepts; authenticated dispatch handles command |
| Array/nested-array/null/number/boolean/object discriminator | Parser returns null; WS closes 1008/`invalid_message` |
| Unknown command, malformed JSON or extra keys | Parser returns null; WS closes 1008/`invalid_message` |
| Expired seat, opposite socket bound | Opposite side wins with `disconnect`; room reclaimed |
| Expired seat, opposite socket absent | Winner null with `disconnect`; room reclaimed |
| Valid retained-seat reconnect | Resumed matched/snapshot; play resumes when both seats connected |

### 5. Good/Base/Bad Cases

Good: a late reconnect with an online opponent delivers matching forfeit results and permits rematching. Base: `{ "type": "release" }` clears held input. Bad: `{ "type": ["queue"] }` is rejected instead of remaining silently connected; a returning expired socket cannot create a victory for an absent opponent.

### 6. Tests Required

[Protocol tests](../../../tests/protocol.test.ts) cover valid commands, exact keys and malformed discriminators. [Service tests](../../../tests/service.test.ts) verify real authenticated policy-close code/reason and both expired-upgrade verdicts. Freeze Date/intervals while preserving real network events/setTimeout/monotonic polling; assert rooms=1 and no reclaim immediately before upgrade, then result/idle, rooms=0, no stale matched and queue reuse. Keep ordinary resume/collector expiry tests and restore service resources/timers in teardown.

### 7. Wrong vs Correct

Wrong: command membership through `String(v.type)` accepts array coercions; unconditional opposite-side expiry wins disagree with collector cleanup. Correct: require `typeof v.type === "string"` before membership and route upgrade/collector through the same opposite-socket check and reclamation helper. Client-provided positions, scores or seat fields remain rejected.
