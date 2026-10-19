# Frontend development

The client uses native TypeScript, static HTML, CSS, and Canvas 2D. `main.ts` coordinates scene/UI state; `Input`, `Network`, `Prediction`, `Interpolation`, and `Renderer` own focused behavior.

## Pre-development checklist

- Read [directory structure](directory-structure.md) before adding or moving modules.
- For UI work, read [components](component-guidelines.md) and [event lifecycle](event-lifecycle.md).
- For multiplayer work, read [state management](state-management.md), [type safety](type-safety.md), and [shared protocol](../shared/protocol.md).
- Before verification, read [quality guidelines](quality-guidelines.md).
- Read [cross-layer](../guides/cross-layer-thinking-guide.md) and [reuse](../guides/code-reuse-thinking-guide.md) guidance for contract/configuration changes.

## Topics

| Document | Local concern |
| --- | --- |
| [Directory structure](directory-structure.md) | Module ownership and dependencies |
| [Component guidelines](component-guidelines.md) | Static DOM, Canvas presentation, accessibility |
| [Event lifecycle](event-lifecycle.md) | Keyboard/touch, focus loss, WS reconnect, timers |
| [State management](state-management.md) | Scene state, authority, prediction, interpolation, optional self-left perspective |
| [Type safety](type-safety.md) | Shared contracts and boundary assertions |
| [Quality guidelines](quality-guidelines.md) | Checks and browser acceptance limits |

Write Trellis specs in English. Product UI is currently Chinese; retain its existing language when changing labels.

## Quality check

Check HTML IDs/types, scene/authority ownership, input release, prediction resets, and base-path behavior against source. Follow [quality guidelines](quality-guidelines.md) for checks and distinguish headless verification from manual browser acceptance. For spec-only changes, verify links, navigation, and source evidence.
