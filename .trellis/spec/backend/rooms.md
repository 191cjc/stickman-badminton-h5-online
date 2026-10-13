# Matching, room authority, and cleanup

## Queue and seats

[Service matching](../../../src/server/service.ts) queues connected Guest objects in FIFO order, prevents duplicate queued entries, and pairs two guests into left/right seats with a fresh room UUID and Simulation with both frozen character IDs. The strict queue enum comes from the shared seven-role registry; same queued role is idempotent, changed role requires cancel/requeue, and both seats may choose the same role. Each gets `matched`, then an authoritative snapshot. The client cannot select another room or take a side.

A playing/reconnecting guest must leave its current match before queueing. A finished guest can queue again; the old seat is detached and the new match starts independently. Queue cancellation during an active match is rejected. A queued socket close removes it immediately; an unmatched guest expires from the queue after 120 seconds.

## Input sampling and acknowledgement

Gameplay uses60-Hz fixed steps. On every room tick, each seat samples the newest pending held state; coalesces jump press edges; selects the most recent hit edge and preserves its hit-time jump state; and discards older held-state samples. Movement uses the latest direction. Internal hitJump preserves the jump state at the accepted hit edge; obsolete hitMove is removed. This prevents a packet burst from creating a long queue or accelerating physics. With no new input, held state continues with press edges/internal hit locks cleared.

The single step receives press edges once. Ack advances to the sampled sequence only after that60Hz simulation frame finishes. Input stale for 750 ms clears pending/held/current input and acknowledges discarded frames. `release` also clears the seat. Do not confuse this held-input safety with room disconnection or pause.

Snapshots for playing rooms are sent on every second room tick (30 Hz), so normal acks represent completed input samples. Snapshot sends are restricted to guests still attached to that room; finished-room broadcasts must not leak into a guest's newly matched room.

## Disconnect and reconnection

Socket close clears both seats' logical input and sets room status `reconnecting`; physics pauses. The disconnected seat is retained for 15 seconds. Valid same-Cookie reconnect restores the seat, clears input again, and resumes only once both seats are connected with no pending reconnect deadline.

The server sends WS ping every five seconds and terminates a socket that has not answered the previous heartbeat. Silent transport failure therefore is not detected instantly; retention time starts from confirmed server-side close. State this distinction in user-facing operational explanations.

Expired upgrade and collector expiry share `expireReconnect(room, expired)`: the opposite guest's bound socket selects that side as winner, otherwise winner is null. Both paths publish a `disconnect` result and reclaim the room. The returning socket belongs to the expired side; its presence must not award an absent opponent. An expired upgrade sends result/idle without a resumed `matched`, then permits independent queue reuse.

For upgrade regressions, control Date and intervals while retaining real HTTP/WS events, setTimeout and monotonic polling. Advance wall-clock expiry without running the collector; assert the room still exists and no reclaim event has occurred immediately before reconnect. [Service tests](../../../tests/service.test.ts) cover online/absent opponents, equal result messages, no stale match, reclamation and queue reuse. Ordinary resume and collector expiry remain separately covered.

## Results and reclamation

Natural winner is from `Simulation.snapshot().winner` at target score 7. `leave` awards the opposite side. The collector checks a playing room's 20-minute wall-clock age from creation and ends it with no winner; reconnecting rooms follow the reconnect-deadline branch first. Finished rooms retain result for 30 seconds, or are removed sooner when both guests detach for new matchmaking/leave. Reclaim clears only guest.room pointers still referencing that room and sends an appropriate idle reason.

Limits are 100 rooms and 5000 guest records; idle disconnected guests without queue/room expire after 24 hours. These resource caps are not evidence of a 100-room load test.

[Service tests](../../../tests/service.test.ts) cover pair/rematch/leave, stale release, coalesced packet bursts with latest movement and preserved action edges, queued disconnect, same-Cookie resume, expiry reclamation, and matching final seven-point results. [Shared simulation](../shared/simulation.md) defines mechanics; [frontend state](../frontend/state-management.md) defines their presentation.

Snapshots include the bounded128-event/30-tick presentation journal and cursor from the room simulation. Events are presentation-only; no client event controls ball/score. Natural completion records point/victory before final snapshot/result. Legacy v1/v2 rejection happens before socket/guest/seat binding.
