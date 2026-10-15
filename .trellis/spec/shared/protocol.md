# Wire protocol and timing contracts

## 1. Scope / Trigger

Any queue, role, effect, input, ack or lifecycle change crosses shared parser/server/client boundaries. Current protocol is4; frontend/backend switch together. [Definitions](../../../src/shared/protocol.ts) are the transport owner.

## 2. Signatures

`parseClientMessage(raw: string): ClientMessage | null`. HTTP session/WS hello return protocol4. WS requires `badminton-v4`; state version `flash-90302-v2`. BASE_PATH `/badminton-h5-online/`; SIM_HZ=INPUT_HZ=60, SNAPSHOT_HZ=30, reconnect15s, results30s, input timeout750ms.

## 3. Contracts

| Direction | Payload |
| --- | --- |
| Client | `{type:"queue", character: CharacterId}`; exact seven-role enum |
| Client | `{type:"cancel"\|"leave"\|"release"}`; exactly one key |
| Client | input: seq integer1..2,000,000,000, move -1/0/1, jump/jumpPressed/hitHeld/hitPressed booleans |
| Client | ping: finite nonnegative time |
| Server | queued includes frozen character; matched includes room/side/resumed/characters for both sides |
| Server | snapshot: room/tick/ack/ackTick/status/reconnectRemainingMs/state/effects, optional resultReason |
| Server | effects: cursor + recent typed events with id/tick/sound or emission position/seed |
| Server | result: winner Side or null, reason score/leave/disconnect/timeout, authoritative score |

Reject non-string discriminators, arrays, unknown roles (including Robot/Timmy), extra room/side/position/score keys and internal hitJump. Identity and seats come from the signed Cookie/socket. Queue role freezes until cancel; same role repeats idempotently, changed queued role errors. Room role cannot change.

Tick counts fixed authority frames; ack counts incorporated/discarded inputs, not one-to-one tick. Coalesce bursts once, run a60Hz step, then ack. `ackTick: number | null` is the first completed authority tick that simulated the command named by ack. Numeric values are integers1..snapshot.tick; held-only ticks retain it. Initial state and clear/discard paths (release, timeout, non-playing input, disconnect/reconnect clearing) set it null. Null does not permit inferring a replay boundary. Client InputFrame remains unchanged: no timestamps, positions or contact declarations. New rooms reset seq; retained-seat reconnect continues existing ack. Prediction affects only own character; interpolated discrete fields remain actual role/action/contact states.

Effect IDs are match-scoped; journal bounded128/30ticks. Browser aligns to authority time, deduplicates and ages events. Reconnect cursor establishes a baseline rather than replaying old sounds. Result/snapshot order must both work; no frozen-result repeated sounds/scoring. Old-room effects never leak into a rematch.

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Current protocol + valid Cookie/Origin | Single socket/seat binding and hello4 |
| Legacy v1/v2/v3 | protocol_mismatch then1008 before guest/socket/seat binding |
| Missing/unknown subprotocol | HTTP400 |
| Client protocol mismatch | Refresh-required UI, no automatic retry |
| Malformed discriminator/JSON/role/extra keys | Parser null; policy-close1008 invalid_message |
| Queued same role | Idempotent queued response |
| Queued changed role | already_queued until cancel/requeue |
| Expired reconnect, opposite socket present | Opposite wins disconnect, room reclaimed |
| Expired reconnect, opposite absent | Null winner, room reclaimed |
| Valid retained-seat reconnect | Original role/seat and seq scope restored |

Collector and upgrade use one expiry owner: `expireReconnect(room, expired)`. Returning expired socket must not award an absent opponent. Do not validate by `String(v.type)` coercion. Inbound browser JSON is currently asserted as ServerMessage after parsing; do not claim client-side runtime schema validation.

## 5. Good / Base / Bad Cases

Good: Toaster/Pirate queue creates fixed roles and independent visitors receive identical ball/score. Base: exact release clears input. Bad: `{type:["queue"]}`, omitted role, Timmy or an old v2 page occupying a current seat.

## 6. Tests Required

[Protocol](../../../tests/protocol.test.ts): all seven enums, exact fields, malformed discriminators and logical ranges. [Service](../../../tests/service.test.ts): real Cookie/Origin/WS policy, role freeze/same-role match, completed-step ack/bursts, result agreement, paused/resumed lifecycle and expiry paths. Keep actual HTTP/WS events when controlling Date/intervals; verify room exists immediately before expired upgrade, result+idle without stale matched, reclaim and requeue. [Network](../../../tests/network.test.ts): mismatch stops retry. [Prediction](../../../tests/prediction.test.ts): role-aware initialization/replay and ball authority. Effects tests cover late/duplicate/result/reconnect cursors and bounded resources.

[Public scripts](../../../scripts/http-check.mjs) verify deployment handshake without browser; actual matchmaking script only with empty production queue. Physical dual-computer and browser effects stay separately recorded in [validation](../../../docs/validation.md).

## 7. Wrong vs Correct

Wrong: use seq as a simulation tick, or retain numeric ackTick after release. Correct: set ack/ackTick only after the command's first completed authority step; clear ackTick on discard.

Wrong: bump only PROTOCOL, ack before simulation, use seq as tick, or replay recent sounds on resumed matched. Correct: coordinate parser/server/client/scripts/docs and atomic releases; ack after fixed step, and restore current effects baseline on reconnect.
