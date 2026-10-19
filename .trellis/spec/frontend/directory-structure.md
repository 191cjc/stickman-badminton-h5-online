# Frontend directory structure

## Entry and module ownership

| File                                                         | Responsibility                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [index.html](../../../index.html)                            | Page structure, action buttons, Canvas, status, touch controls           |
| [main.ts](../../../src/client/main.ts)                       | Scene transitions, DOM updates, frame loop and controller composition    |
| [input.ts](../../../src/client/input.ts)                     | Logical keyboard/pointer/gamepad holds, pending edges and input frames    |
| [controls.ts](../../../src/client/controls.ts)               | Validated browser-local bindings, defaults, conflicts and labels          |
| [controls-settings.ts](../../../src/client/controls-settings.ts) | Native binding capture and settings DOM, separate from network sending |
| [gamepad.ts](../../../src/client/gamepad.ts)                 | Standard pad discovery, mapping, neutral rearm and status                |
| [perspective.ts](../../../src/client/perspective.ts)         | Browser-local self-left preference, display-side and inverse input mapping |
| [network.ts](../../../src/client/network.ts)                 | Session initialization, WS, retries, RTT                                 |
| [prediction.ts](../../../src/client/prediction.ts)           | Local player correction/replay and remote interpolation                  |
| [input-scheduler.ts](../../../src/client/input-scheduler.ts) | Page-owned60Hz input timer, independent of RAF                           |
| [diagnostics.ts](../../../src/client/diagnostics.ts)         | Opt-in local bounded numeric measurements                                |
| [loading.ts](../../../src/client/loading.ts)                 | Bounded source loading, exact stage progress and paint-yield preparation |
| [raster-cache.ts](../../../src/client/raster-cache.ts)       | Filter-preserving bounded device-scale raster LRU                        |
| [render-quality.ts](../../../src/client/render-quality.ts)   | Pure lower-only page-lifetime adaptive backing-density policy            |
| [renderer.ts](../../../src/client/renderer.ts)               | Extracted Flash SVG layers selected by authoritative/predicted frame     |
| [style.css](../../../src/client/style.css)                   | Page layout, responsive court and touch controls                         |
| [vite-env.d.ts](../../../src/client/vite-env.d.ts)           | Vite asset type declarations                                             |

Use lowercase hyphenated filenames for modules, PascalCase classes, and named exports, following these files. UI additions belong in client/HTML/CSS; HTTP/session/room logic belongs in server; reusable game mechanics/types belong in shared.

## Imports and builds

Client modules import gameplay contracts and pure helpers from `src/shared`. They must not import `src/server`, Node APIs, or the archived `upstream` entry point. Product scenes have no local AI Simulation; only shared player stepping is predicted, never online ball authority.

[Vite configuration](../../../vite.config.ts) sets `/badminton-h5-online/`, builds `dist/client`, and proxies only this project's API/WS during development. Keep asset URLs compatible with that base. Source artwork is extracted from the frozen Flash XML into public/classic SVG layers. Numeric data and visible frames must regenerate from the same source via tools/flash-assets; keep research tool binaries out of production.

[package.json](../../../package.json) builds an independent server bundle separately. Treat `dist`, `node_modules`, coverage, and artifacts as generated/local output. Preserve [GAME_SOURCE.json](../../../GAME_SOURCE.json) and the frozen Flash reference for current source evidence; [UPSTREAM.json](../../../UPSTREAM.json) remains historical community provenance, not the Flash parity reference.

[Effects](../../../src/client/effects.ts) owns authority event consumption and bounded60Hz particle/result clocks. [Audio](../../../src/client/audio.ts) owns same-origin source audio, gesture unlocking, gain/mute and bounded overlapping nodes. Renderer owns scene images/Blob URL disposal and draws the Effects data; main composes these owners.
