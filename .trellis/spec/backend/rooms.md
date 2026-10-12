# Matching, room authority, and cleanup

## Queue and seats

[Service matching](../../../src/server/service.ts) queues connected Guest objects in FIFO order, prevents duplicate queued entries, and pairs two guests into left/right seats with a fresh room UUID and Simulation. Each gets `matched`, then an authoritative snapshot. The client cannot select another room or take a side.

A playing/reconnecting guest must leave its current match before queueing. A finished guest can queue again; the old seat is detached and the new match starts independently. Queue cancellation during an active match is rejected. A queued socket close removes it immediately; an unmatched guest expires from the queue after 120 seconds.

## Input sampling and acknowledgement

Gameplay uses 120-Hz fixed steps. Every two room ticks, each seat samples the newest pending input; coalesces jump press edges; selects the most recent hit edge and preserves its direction/jump combination; and discards accumulated older held-state samples. This prevents a packet burst from creating a long queue or accelerating physics. With no new input, held state continues with press edges/internal hit locks cleared.

The first substep receives press edges and the second clears them. Ack advances to the sampled sequence only after the two substeps finish. Input stale for 750 ms clears pending/held/current input and acknowledges discarded frames. `release` also clears the seat. Do not confuse this held-input safety with room disconnection or pause.

Snapshots for playing rooms are sent on every fourth room tick (30 Hz), so normal acks represent completed input samples. Snapshot sends are restricted to guests still attached to that room; finished-room broadcasts must not leak into a guest's newly matched room.

## Disconnect and reconnection

Socket close clears both seats' logical input and sets room status `reconnecting`; physics pauses. The disconnected seat is retained for 15 seconds. Valid same-Cookie reconnect restores the seat, clears input again, and resumes only once both seats are connected with no pending reconnect deadline.

The server sends WS ping every five seconds and terminates a socket that has not answered the previous heartbeat. Silent transport failure therefore is not detected instantly; retention time starts from confirmed server-side close. State this distinction in user-facing operational explanations.

Expired upgrade and collector expiry share `expireReconnect(room, expired)`: the opposite guest's bound socket selects that side as winner, otherwise winner is null. Both paths publish a `disconnect` result and reclaim the room. The returning socket belongs to the expired side; its presence must not award an absent opponent. An expired upgrade sends result/idle without a resumed `matched`, then permits independent queue reuse.

For upgrade regressions, control Date and intervals while retaining real HTTP/WS events, setTimeout and monotonic polling. Advance wall-clock expiry without running the collector; assert the room still exists and no reclaim event has occurred immediately before reconnect. [Service tests](../../../tests/service.test.ts) cover online/absent opponents, equal result messages, no stale match, reclamation and queue reuse. Ordinary resume and collector expiry remain separately covered.

## Results and reclamation

Natural winner is from `Simulation.snapshot().winner` at target score 7. `leave` awards the opposite side. The collector checks a playing room's 20-minute wall-clock age from creation and ends it with no winner; reconnecting rooms follow the reconnect-deadline branch first. Finished rooms retain result for 30 seconds, or are removed sooner when both guests detach for new matchmaking/leave. Reclaim clears only guest.room pointers still referencing that room and sends an appropriate idle reason.

Limits are 100 rooms and 5000 guest records; idle disconnected guests without queue/room expire after 24 hours. These resource caps are not evidence of a 100-room load test.

[Service tests](../../../tests/service.test.ts) cover pair/rematch/leave, stale release, coalesced packet burst with combo preservation, queued disconnect, same-Cookie resume, expiry reclamation, and matching final seven-point results. [Shared simulation](../shared/simulation.md) defines mechanics; [frontend state](../frontend/state-management.md) defines their presentation.
