# Integrated implementation and acceptance

Date: 2026-10-16. Branch: `feat/sustained-smoothness`; baseline: `4cf4570`.

## Implemented boundary

Only the client owners and their regression coverage change: RenderQuality/main, Renderer, Interpolation, InputScheduler and Effects. No server/shared simulation, protocol4, frozen reference, SVG/audio source, dependencies or other game entrances change. Local-player Prediction remains unchanged. Server owns all shuttle contact/flight, collision, score and result.

- Manifest content hashes plus actual backing dimensions share identical filtered SVG rasters; per-frame registration remains independent. Preparation uses the same identity as rendering.
- Persistent eligible overload lowers a page-lifetime world-density cap through useful levels of `[4, 2.8, 2, 1.4, 1]`, keeping CSS/window/world/input geometry and original effects/audio. Density changes invalidate only raster backing stores. Cap persists across rematches; reload starts native again.
- A window completes at both >=2s and >=4 samples, then requires >=50% gaps >25ms. Transition/restoration/viewport grace is1s, decrease cooldown6s. Loading/menu/queue/focus/visibility/reconnect are excluded; natural-result local animation remains eligible. These are cost-control settings, not FPS guarantees.
- A continuous sample pause >250ms reanchors to the latest actual authority tick/receipt and recovers forward near the target buffer, within real compatible snapshots. Ordinary slew/contact/boundary rules remain; missing authority holds.
- Input minimum spacing counts elapsed synchronous callback work between attempt starts, avoiding another skipped usable period. One timer, transactional edge/seq handling and no-burst lifecycle guards remain.
- Sound suppression belongs to the retained bounded pending event. Historical catch-up checks freshness at the final presentation target, suppressing obsolete sounds while retaining source particle stepping and fresh exactly-once audio.

Detailed owner reports: [render implementation](render-implementation.md), [timing implementation](timing-implementation.md). Deterministic before/after fixtures and their limits are recorded in the timing report, including 1s blocked sampling actual presentation gap745.83→66.54ms and callback-cost cadence. These are not physical key-to-render measurements.

## Independent review and quality gate

[Full-scope check](check-report.md) found and fixed one severe-overload edge case:2s elapsed windows were cleared before four very slow frames could arrive. The completion guard now requires both bounds;750/1000ms regression traces failed before the fix and pass afterward. No remaining reviewed source issue.

Final lint/typecheck: exit0. Tests:20files/269passed. Production build passed (client `index-Ckx9WmJY.js`); isolated built HTTP checks passed for HTML/two assets, source manifest/schema/geometry/four SVG hashes, Cookie flags and protocol4 WS greeting. These local checks do not claim the three separate production entrances were routed through the isolated server.

The comparable600s run, default-debug-off adaptation/original effects/audio, ordered-network lifecycle and limitations are recorded in [acceptance](acceptance.md) and `docs/validation.md`. Source remained frozen for these checks. Public release is recorded separately from isolated acceptance.
