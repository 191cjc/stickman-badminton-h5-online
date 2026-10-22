# Cross-layer changes in multiplayer badminton

## Trace the data flow

Current online flow:

```text
Keyboard/pointer -> InputFrame -> same-origin authenticated WS
-> parseClientMessage -> authenticated room seat -> input sampling
-> shared Simulation -> Snapshot(tick, ack, ackTick, state)
-> local player correction + remote interpolation -> DOM/Canvas
```

[Input](../../../src/client/input.ts), [protocol](../../../src/shared/protocol.ts), [service](../../../src/server/service.ts), [prediction](../../../src/client/prediction.ts), and [main](../../../src/client/main.ts) implement these boundaries. A wire value has one shared type owner; the server validates untrusted logical commands before gameplay uses them.

## Contracts to preserve

- Guest Cookie is the bearer identity; active socket/seat are server-derived. Room/side/score/position fields from a client are not accepted.
- `seq` follows the guest's current room input scope. `ack` identifies incorporated/discarded logical input; `tick` identifies authoritative simulation time. Burst coalescing means they do not advance at a fixed ratio. Server-owned ackTick anchors the first completed consumption tick and becomes null on clear/discard.
- Press edges are sampled once in each60Hz simulation frame; movement uses the latest held direction, while the recent hit edge preserves its swing mode and jump state. Keep the mode/internal hitJump from that same edge frame; obsolete hitMove is removed.
- Online ball flight/collision/score/result are authoritative. Client prediction changes only local player presentation.
- Release, close, reconnect deadlines, normal result retention, and queue expiry are separate lifecycle transitions.

For any change, inspect the producer, parser/dispatcher, state owner, and consumer. Examples of relevant evidence are [burst/reconnect service tests](../../../tests/service.test.ts) and [replay/reset tests](../../../tests/prediction.test.ts).

## Path, timing, and deployment changes

Search protocol constants, client literals, server modulo steps, network retry, Vite base/proxy, env example, Nginx, systemd, scripts, and [deployment docs](../../../docs/deployment.md). A changed port or prefix must reach every owned route without affecting old game entrances.

Frontend/backend releases switch together through current. A breaking message contract must account for clients whose page is already loaded, not just a clean fresh build. Do not treat TypeScript type agreement as proof of runtime validation or transport compatibility.

## Verification and evidence limits

Check malformed inputs and real authenticated seat ownership, not only valid serialization. Check snapshots and results from two connections at the same tick. Exercise cleanup/resume rather than just room creation.

Type/lint/simulation/protocol tests and HTTP checks cover code and transport. They do not establish browser Canvas layout, physical key-to-display latency, mobile pointer behavior, or cross-network feel. Keep [manual acceptance](../../../docs/validation.md) and measurements separate from scripted outcomes.
