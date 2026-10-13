# Project development specifications

One npm package contains a TypeScript/Vite/Canvas browser client and a Node.js/WebSocket authoritative badminton server. Source inspection, tests, and existing project documents are the evidence for these specifications.

| Layer | Ownership | Start here |
| --- | --- | --- |
| Frontend | DOM UI, input, network callbacks, presentation | [Frontend](frontend/index.md) |
| Backend | HTTP identity, matching, rooms, authoritative scheduling | [Backend](backend/index.md) |
| Shared | Types, protocol, movement, flight, scoring, presentation events | [Shared](shared/index.md) |
| Deployment | Independent public entry, service, releases, rollback | [Deployment](deployment/index.md) |
| Cross-layer | Contract changes and reuse | [Thinking guides](guides/index.md) |

## Pre-development checklist

1. Read the current task artifacts and relevant layer indexes.
2. Follow each index's topic checklist and inspect its source references.
3. For multiplayer changes, follow the backend/shared contract through the affected frontend consumers.
4. Preserve the independence and upstream constraints in [deployment operations](deployment/operations.md).
5. Select checks from [quality guidelines](frontend/quality-guidelines.md) according to actual impact.

Layers are directory ownership boundaries, not separate workspace packages. See [package.json](../../package.json) and [project design](../../docs/design.md).
