# Frontend quality and verification

## Local checks

The project requires Node.js 24+. Use its independent lockfile and [package scripts](../../../package.json):

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Vite builds `dist/client`; esbuild separately bundles the server. Prettier is available via `npm run format`, which writes files; target changed files when broader formatting is unrelated to a task.

## Meaningful coverage

[Prediction tests](../../../tests/prediction.test.ts) check replay, correction/reset, authoritative ball/score preservation, interpolation, and holding the latest snapshot when packets stop. [Core tests](../../../tests/classic/core.test.ts) exercise source-derived movement/serve/collision/AI and full matches; [assets tests](../../../tests/classic/assets.test.ts) verify frozen data and geometry. These do not by themselves prove original runtime parity. [Service tests](../../../tests/service.test.ts) run actual HTTP/WS connections on ephemeral local ports and check identity, matching, control ownership, input safety, reconnect, and identical final results.

Match test selection to changes. Documentation-only edits need link/index/content checks; source changes need applicable type/lint/tests/build. Do not add tests that only restate assignments or rerun an already-passed suite without a new change or concern.

## Product acceptance boundary

Follow the user's current browser-testing authorization. The initial instruction forbade automatic browser tests, but the user explicitly authorized them for the 2026-10-13 AI-serve investigation. Targeted Chromium practice checks are permitted under that authorization; record what actually ran and avoid claiming coverage for other browsers or physical input latency. HTTP/protocol scripts are also available, but [public match checking](../../../scripts/public-match-check.mjs) creates real matchmaking guests and should only run with an empty public queue.

Record manual two-computer, focus-loss, touch, browser compatibility, and weak-network evidence separately in [validation.md](../../../docs/validation.md). Do not promise latency values from RTT or fixed timestep settings.

## Review constraints

Preserve the logical input contract, local-only player prediction, authority over ball/score/result, release rules, accessible actions, and exclusive base path. Use the [Flash core/asset evidence](../shared/simulation.md) for intentional mechanics refactors and [deployment guidance](../deployment/index.md) when publishing changes.
