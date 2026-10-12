# Frontend type safety

## Shared types

Use `import type` for type-only imports, enforced by [ESLint](../../../eslint.config.js). [tsconfig.json](../../../tsconfig.json) enables strict checks, unused locals/parameters, isolated modules, and no fallthrough.

- [types.ts](../../../src/shared/types.ts): Side, PlayerIntent, Vec2, Viewport, phases.
- [protocol.ts](../../../src/shared/protocol.ts): InputFrame, Snapshot, ClientMessage, ServerMessage.
- [state.ts](../../../src/shared/state.ts): inferred GameState/PlayerState and serialization helpers.

Use these contracts across client modules instead of maintaining duplicate payload interfaces. `GameState` is derived from `Simulation.snapshot()`; a snapshot field change affects frontend consumers and transport together.

## Current trust boundaries

Outgoing logical inputs are runtime-validated by the server's shared `parseClientMessage()`. The current browser receive path parses JSON and asserts `ServerMessage`; it does not perform a runtime server-message schema check. Do not describe these assertions as validation or introduce a new untrusted source under the same assumptions.

DOM generic lookups also assert the subtype after checking only existence. Keep IDs and tags coordinated with HTML. Non-null assertions used after Canvas/context or scene guards are local assumptions; do not copy them into unguarded boundary code.

## Contract changes

Read [shared protocol](../shared/protocol.md), trace all handlers for new message types, and update tests for the observable behavior. Some ClientMessage commands share a union-valued `type` property; current server dispatch explicitly narrows to `input` before reading `seq`. Preserve actual narrowing rather than casting to bypass it.

Use [prediction tests](../../../tests/prediction.test.ts) for inferred state/replay contracts and [service tests](../../../tests/service.test.ts) for malformed wire messages. Avoid `any` or unchecked casts to make a protocol disagreement compile.
