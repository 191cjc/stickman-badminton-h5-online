# Code reuse in the badminton application

## Search the owner first

Before introducing a helper or changing tuning, search with `rg` and identify the source that owns the behavior:

| Concern                                | Existing owner                                             |
| -------------------------------------- | ---------------------------------------------------------- |
| Shared movement/jump/swing latches     | [stepClassicPlayer](../../../src/shared/classic/player.ts) |
| Shuttle drag/flight                    | [birdie.ts](../../../src/shared/classic/birdie.ts)         |
| Geometry and common math               | [assets.ts](../../../src/shared/classic/assets.ts)         |
| Gameplay tuning                        | [CLASSIC_WORLD](../../../src/shared/classic/types.ts)      |
| Wire types/input validation            | [protocol.ts](../../../src/shared/protocol.ts)             |
| Serializable player and snapshot types | [state.ts](../../../src/shared/state.ts)                   |
| Identity/room orchestration            | [service.ts](../../../src/server/service.ts)               |

Reuse player stepping in Prediction and Simulation. Keep original live flight and AI landing preview in birdie.ts: the source preview always applies gravity and omits net-top bounce, while live flight has different rules. Preserve these source differences instead of forcing both through one identical step. Changes to either model must update the corresponding authority/AI evidence.

## Preserve boundaries while extracting

Shared gameplay must remain independent of DOM and Node service APIs. Canvas drawing consumes state and entity geometry; server sockets own authentication and seats. A helper extracted to shared must not bring browser event listeners or server room mutation with it.

The frozen `reference/flash-90302` and historical `upstream` copies are deliberate provenance data, not another live implementation to keep synchronized. Modify the derived `src/shared` code and validate source-value behavior with [core.test.ts](../../../tests/classic/core.test.ts) and frozen Flash references; do not silently edit the comparison reference to make a test pass.

## Constants and payloads

Some timing/base-path values still appear as literals in the client, server sampling, Vite, and ops. Search all consumers before changing them. Do not infer that every consumer already reads one exported constant.

Use existing ClientMessage/ServerMessage/GameState contracts instead of local copies. Client inbound JSON is currently type-asserted; adding another data origin requires explicit boundary design, not another cast presented as validation.

## Verification questions

- Which runtime(s) use the owner: browser, server, AI, tests, or deployment?
- Does extraction change phase/score/sequence behavior or only structure?
- Does a test compare an observable result, rather than the new helper against a copy of itself?
- Have all literal consumers and docs been found?
- Does the upstream provenance/license boundary remain intact?
