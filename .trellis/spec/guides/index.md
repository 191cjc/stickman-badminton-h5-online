# Cross-layer thinking guides

These guides use this repository's multiplayer data flow and source reuse boundaries.

## Pre-development checklist

- Before a new helper, physics change, or duplicated payload handling, read [reuse](code-reuse-thinking-guide.md).
- Before a message/configuration/timing change, read [cross-layer](cross-layer-thinking-guide.md).
- Follow [layer indexes](../index.md) for concrete ownership and verification requirements.

| Guide | Use |
| --- | --- |
| [Code reuse](code-reuse-thinking-guide.md) | Shared movement/flight/types and avoiding divergent mechanics |
| [Cross-layer changes](cross-layer-thinking-guide.md) | Identity, logical input, authority, presentation, and deployment consistency |

The project is a single application, not the Trellis CLI source repository. Its specifications should describe its actual frontend/server/shared/deployment code.
