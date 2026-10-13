# Frontend state management

## Owners

| State                                                                                     | Owner                                              |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Scene (`idle`, `queued`, `online`, `practice`, `result`), side, sequence, latest snapshot | [main.ts](../../../src/client/main.ts)             |
| Held keys and jump/hit edges                                                              | [Input](../../../src/client/input.ts)              |
| WS/retry/ping state                                                                       | [Network](../../../src/client/network.ts)          |
| Predicted local player, pending frames, correction offset                                 | [Prediction](../../../src/client/prediction.ts)    |
| Buffered authoritative snapshots                                                          | [Interpolation](../../../src/client/prediction.ts) |
| Online shuttle, collision, score and result                                               | [Server authority](../backend/rooms.md)            |

Use the existing state owners. An online UI button sends a command; it must not locally award points, switch room ownership, or restart the authoritative simulation.

## Prediction and correction

Each local logical frame runs `stepClassicPlayer` once at1/60seconds. Only the local character is predicted. Its read-only authority context chooses action type; prediction never contacts or mutates the ball. Action clocks are included in reconciliation.

On a snapshot, `Prediction.reconcile()` drops acknowledged frames, deep-copies the local authoritative player, and replays unacknowledged frames when playing. Score/phase/room-status changes reset prediction history. Position errors below40worldunits are smoothed with a decaying visual offset; larger errors and phase resets snap. History is bounded at 120 frames. These values describe current code, not measured latency targets.

Online rendering replaces only the local player in a sampled authoritative state. Ball flight and score remain server-owned. Local `Simulation('single')` belongs to AI practice and must not feed online authority.

## Remote interpolation

`Interpolation` retains up to 12 snapshots, targets four60-Hz ticks behind estimated server time, interpolates x/y/vx/vy while selecting discrete action fields from a real snapshot, and holds the latest available sample if packets stop. It clears the buffer on room changes or non-playing status/phase; it does not interpolate across a score/phase boundary.

Test replay, rally reset, authority boundaries, and hold-last behavior using [prediction.test.ts](../../../tests/prediction.test.ts). Remote animation smoothness and real network feel are not established by these headless tests.

Ball attachment/last-toucher transitions must not be interpolated into invented contacts; select the actual discrete shuttle snapshot across such transitions.
