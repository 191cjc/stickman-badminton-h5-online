# Self-left perspective design

Status: final plan approved by user (“开始”, 2026-10-19).

## Boundaries

The current gap is a fixed actual-seat viewpoint. Add a browser-local presentation preference. Main keeps actual seat and composes perspective, Input, Prediction and Renderer. No changes to Simulation, server, protocol4, source assets, Effects clocks or Audio ownership.

Expected files: `index.html` (settings controls), `src/client/style.css` (compact panel/action layout), `src/client/main.ts` (preference/lifecycle/input/HUD composition), `src/client/renderer.ts` (world-only reflection/readable art), a focused `src/client/perspective.ts` helper (typed display mapping and guarded local preference), and meaningful tests/docs. Optional Input change is limited to a demonstrated settings-focus/held-repeat gap. Do not refactor unrelated renderer, timing or gameplay code.

## Preference and mapping contract

- A page-owned boolean defaults false; guarded browser storage persists it under a project-specific versioned key. Only a recognized stored value enables it. Read/property/write exceptions are caught. Storage failure does not affect the live selection. No storage-event synchronization or identity use.
- `mirrored = selfLeftEnabled && actualSide === "right"`. With no side use false. Result retains its seat even after room/latest cleanup, so its score/actors remain consistent until a genuine idle/queued transition.
- One pure mapping owner identifies which actual side is displayed left/right, maps actual side to display side, and inverts `InputFrame.move` only for mirrored view. Retain shared Side/InputFrame/GameState types; never create a second wire contract.

## Data flow

```text
Settings checkbox -> local boolean -> perspective(actual seat)
Keyboard/touch -> screen intent -> inverse horizontal move
 -> Network.send -> successful commit/seq -> actual-seat Prediction
Server snapshots -> actual-seat Prediction + actual-coordinate Interpolation/Effects
 -> Renderer(world reflection + readable overlays) / display-ordered DOM
```

Read input with peek. Map move once before send; on success commit and Prediction.accept that same frame. Mapping must preserve seq/jump/hit edges and preserve zero as zero. Failed sends keep pending edges and sequence, using existing scheduler pacing.

## Safe live settings

An accessible native button in `.court-actions` toggles a labeled compact panel with one checkbox. Button exposes aria-expanded/controls; checkbox exposes checked state. Controls remain inert until startup readiness.

Opening the panel stops sampling, clears Input/Prediction and sends the existing best-effort release; it does not pause the authoritative match. `canSampleInput` includes panel-closed. Checkbox changes persist preference, clear old controls defensively and update display-dependent labels, score and result text synchronously. Keep seq, room, effects/event cursors, interpolation clock and rasters. Do not regenerate particles, replay sounds or clear adaptive quality stage.

Closing via button/Escape restores appropriate focus and input sampling only if existing canSampleInput guards permit. Escape while panel is open closes it and cannot reach leaveMatch; Space toggles the native checkbox without becoming a gameplay hit. Native keyup/pointer cancellation must keep clearing old physical controls. If a held-key repeat can reacquire a released key, fix only that event boundary and test it; do not add a second input owner.

Close stale panels on scene transitions if required for menu reachability, retaining the boolean. An active match is not paused simply because settings is open; no new server messages.

## Rendering and readable layers

Pass explicit optional perspective to both Renderer.render and Renderer.prepare; their default remains the ordinary view for existing callers. Do not overwrite/mirror state fields or actual player.side.

Apply translation640,0 and scale-1,1 only to world layers: background, net, floor lines, actors, shuttle and all world effects. The source actor transform still uses actual side; the outer reflection changes its displayed facing correctly. Keep the attached shuttle inside serve artwork. Preserve640×426 clip, viewport/DPR, source origins and source append order.

Draw scores/Logo/intro/finish in ordinary screen-world coordinates at their original depths. Select score keys by displayed-side values; map terminal actual winner to displayed p1/p2. Intro name frames use displayed side plus that actual player's character. Factor the selectors narrowly enough for prepare/render to share them; leave performance/cache machinery intact.

For late sparks around Finish and terminal confetti, switch coordinate transform at the existing layer boundaries without reorganizing draw order. Pure reflection does not change source raster scale; use the same SHA/backing-size key. No perspective-specific cache or toggle invalidation. Current prepare jobs must match the next frame's displayed score/names.

## HUD and identity

Main labels, hint/matched position, hidden accessible scores and result score order follow display mapping. Winner and server comparisons continue using actual side. Preserve reason/status strings and never infer new scores. Retain the last result data for rerendering its score text after a toggle even if latest/room are cleared. Existing side-colored dots remain screen-side decoration; they must not imply a new authenticated seat or character identity.

## Compatibility, rollout and limitations

Existing clients and server remain protocol4; preference is local and optional. No source extraction or license changes. Release through the existing independent build/current-release/systemd workflow after validation, preserving other entries. Rollback uses the previous release; the unused storage key is harmless. No new database, server config or infrastructure.

Mirror introduces only constant Canvas transforms and source-frame selection. Brief prediction reset during an explicit toggle is an intentional control boundary; this feature does not improve network latency. Browser-local two-guest checks do not establish physical dual-computer latency or all-device touch/browser compatibility.
