# Frontend directory structure

## Entry and module ownership

| File | Responsibility |
| --- | --- |
| [index.html](../../../index.html) | Page structure, action buttons, Canvas, status, touch controls |
| [main.ts](../../../src/client/main.ts) | Scene transitions, DOM updates, frame loop and controller composition |
| [input.ts](../../../src/client/input.ts) | Keyboard/pointer state and logical input frames |
| [network.ts](../../../src/client/network.ts) | Session initialization, WS, retries, RTT |
| [prediction.ts](../../../src/client/prediction.ts) | Local player correction/replay and remote interpolation |
| [renderer.ts](../../../src/client/renderer.ts) | Upstream-derived court/player/shuttle/impact drawing |
| [style.css](../../../src/client/style.css) | Page layout, responsive court and touch controls |
| [vite-env.d.ts](../../../src/client/vite-env.d.ts) | Vite asset type declarations |

Use lowercase hyphenated filenames for modules, PascalCase classes, and named exports, following these files. UI additions belong in client/HTML/CSS; HTTP/session/room logic belongs in server; reusable game mechanics/types belong in shared.

## Imports and builds

Client modules import gameplay contracts and pure helpers from `src/shared`. They must not import `src/server`, Node APIs, or the archived `upstream` entry point. `Simulation` is used locally for AI practice, not for authoritative online ball prediction.

[Vite configuration](../../../vite.config.ts) sets `/badminton-h5-online/`, builds `dist/client`, and proxies only this project's API/WS during development. Keep asset URLs compatible with that base. Source artwork is programmatic Canvas drawing; do not introduce a bitmap asset pipeline just to reproduce an existing primitive.

[package.json](../../../package.json) builds an independent server bundle separately. Treat `dist`, `node_modules`, coverage, and artifacts as generated/local output. Preserve the [upstream source record](../../../UPSTREAM.json) and frozen source copy for regression comparisons.
