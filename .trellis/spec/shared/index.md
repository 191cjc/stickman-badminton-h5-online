# Shared simulation and contracts

`src/shared` contains environment-independent gameplay entities, physics, AI, logical types, and transport definitions. It is imported by the browser and server; the server runs the authoritative online match.

## Pre-development checklist

- Read [simulation](simulation.md) before modifying mechanics, entity serialization, prediction-compatible movement, or score.
- Read [protocol](protocol.md) before changing cadence, messages, validation, ack/tick meaning, or room status.
- Follow [reuse](../guides/code-reuse-thinking-guide.md) and [cross-layer](../guides/cross-layer-thinking-guide.md) guidance.
- Check [frontend prediction](../frontend/state-management.md) and [backend rooms](../backend/rooms.md) for changes used by both runtimes.
- Preserve [upstream provenance](../deployment/operations.md) when modifying reused code.

## Topics

| Document | Concern |
| --- | --- |
| [Simulation](simulation.md) | Physics, player step, AI, state serialization, regressions |
| [Protocol](protocol.md) | Wire messages, input bounds, cadence, consistency |

Shared code must not import DOM runtime modules or Node server APIs. Inspect [state.ts](../../../src/shared/state.ts) for type-only dependencies that avoid an executable import cycle.

## Quality check

Check DOM/Node independence, serialization, input/ack/tick meanings, and shared movement/flight reuse. Mechanics changes need [upstream regression](../../../tests/simulation.test.ts) and applicable flight/math/AI/prediction tests. For spec-only changes, verify references and consistency with both client and server consumers.
