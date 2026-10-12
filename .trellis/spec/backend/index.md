# Backend development

The Node.js service owns HTTP guest sessions, WS authentication, in-memory matchmaking/rooms, authoritative scheduling, and resource cleanup. It shares gameplay code with the browser while retaining authority over online collision, ball flight, scores, and results.

## Pre-development checklist

- Read [architecture](architecture.md) for service construction, configuration, logging, and testing.
- Read [identity and input](identity-and-input.md) before changing HTTP/WS entry points or validation.
- Read [room lifecycle](rooms.md) for matching, input sampling, disconnects, results, and reclamation.
- Read [shared protocol](../shared/protocol.md) and [simulation](../shared/simulation.md) for cross-layer changes.
- Read [deployment](../deployment/index.md) before changing listening addresses, origins, environment, or process behavior.

## Topics

| Document | Concern |
| --- | --- |
| [Architecture](architecture.md) | Factory, runtime entry, clocks, logging, tests |
| [Identity and input](identity-and-input.md) | Signed guests, upgrades, strict logical input |
| [Room lifecycle](rooms.md) | Queue, seats, fixed steps, reconnect, cleanup |

[service.ts](../../../src/server/service.ts) implements these behaviors; [service.test.ts](../../../tests/service.test.ts) exercises real HTTP/WS instances. Use [cross-layer guidance](../guides/cross-layer-thinking-guide.md) when changing messages or timing.

## Quality check

Trace Cookie/Origin/seat validation and each queue/room/cleanup transition against [service.ts](../../../src/server/service.ts). For code changes, run lint/types and relevant [service tests](../../../tests/service.test.ts); review bounded timers/resources and unchanged input authority. For spec-only changes, verify contract claims and links without restarting services.
