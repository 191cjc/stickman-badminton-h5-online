# Live source audit: community residue versus executable gameplay

User asked whether parts of the old community project's logic remain. Read-only audit on 2026-10-13, before this task implementation:

1. `src/shared/simulation.ts:3` exports `ClassicSimulation` from `./classic/simulation`; no executable community implementation is in that adapter.
2. Source search of `src/`, `index.html`, `vite.config.ts`, and `package.json` finds `upstream` only in adapter comments, not an import. `tsconfig.json` includes src/tests/Vite; `upstream/` is frozen historical provenance and does not become a runtime/build entry.
3. Migration commit `d69adb5` deleted the old live `src/shared/{config,entities,flight,math,player-step,ai-controller}.ts`, their community-specific tests, and the previous simulation implementation. The live `classic/{player,birdie,animation,ai,simulation,assets}.ts` were added from recovered Flash source/data. Renderer was replaced with original-asset drawing.
4. There **are** inherited generic interfaces in `src/shared/types.ts` matching `upstream/src/game/types.ts`: Side, MatchMode, AiDifficulty, GamePhase, PlayerIntent, Viewport. Type declarations are not executable physics, but saying the entire app has no inherited source residue would be inaccurate.
5. `src/shared/types.ts:17`, `src/server/service.ts:489`, `src/shared/classic/simulation.ts:159` retain an internal `hitMove` coalescing field. Current Flash shot direction does not read it; it should be removed in the scoped contract cleanup. `hitJump` is different: `player.ts:275` uses it to retain a jump state across burst input coalescing; this is project networking glue, not community shot-angle physics, so retain the protection unless replaced by an equivalent tested mechanism.
6. `src/shared/classic/simulation.ts:87` and `:96` retain the current free-practice `single/normal/boss` API/temporary tuning; `src/client/main.ts:281` exposes practice. Its AI algorithm is the migrated Flash algorithm, not the deleted community AI. Nevertheless the latest user scope is online-versus only, so remove the product practice path and unnecessary single-mode configuration rather than expanding the AI migration.
7. Cookie/session matching, seat authentication, WebSocket sampling, prediction/correction, interpolation, scene menus, independent systemd/Nginx and release/rollback are this online project's infrastructure. They remain useful to the original-Flash multiplayer port; reusing them does not import community ball/score rules.

## Implementation boundary and acceptance

- Seven original-versus human characters; no community physics imports, no AI mode/entry in the live product, no unused hitMove shot-combination vestige.
- Preserve neutral type/controller architecture and needed network edge protection instead of gratuitously renaming types to conceal provenance.
- Verify runtime/build imports and generated release don't load archived upstream assets or game code. Keep UPSTREAM.json/upstream for the user-requested source/version record, and keep frozen Flash archive unchanged.
- Existing deficits are incomplete Flash feature migration and deliberate H5/network adaptations. This audit does not assert complete original behavior parity, nor that every line of generic infrastructure was rewritten from scratch.
