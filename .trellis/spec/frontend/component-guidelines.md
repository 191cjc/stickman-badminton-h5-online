# DOM and Pixi components

## Composition

The page is static [HTML](../../../index.html) with DOM coordination in [main.ts](../../../src/client/main.ts). There is no component framework, custom hook system, or global state library. Keep behavior in the existing controller classes and use the central scene helpers (`overlay`, `buttons`, `labels`, `updateHud`) for consistent UI transitions.

The local element lookup checks presence and uses a generic assertion:

```typescript
function el<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing element: ${id}`);
  return value as T;
}
```

Its generic does not validate the tag at runtime. When changing an element ID/type, update HTML and all typed lookups together. Use `textContent` for status/message text and the `hidden` property for visibility, matching existing helpers; do not interpolate network text into HTML.

## Court presentation

[Renderer.render](../../../src/client/renderer.ts) consumes `GameState` and `Viewport`; it validates the source `public/classic/manifest.json` against the separately baked `public/classic-atlas/manifest.json` and draws PNG texture views through Pixi WebGL. Renderer must not decide collisions, scores, room status, or gameplay input.

The frame loop measures Canvas CSS dimensions, calculates a uniform world scale, and passes the viewport to Pixi, which resizes its backing and transforms the court root. Native DPR is capped at2; the page-owned RenderQuality policy may reduce backing DPR further under persistent overload (see below). Preserve the640×426 world mapping from [CLASSIC_WORLD](../../../src/shared/classic/types.ts) rather than changing physics coordinates to fit the screen.

Draw per-role family swing/body/attachments at their source depth, mirrored at±1.25horizontal/1.25vertical and the same1-basedframe as numeric authority. Pirate depth21 attachment is above swing; Toaster uses dedicated poses. The serve layer already contains its attached shuttle; draw the standalone shuttle only after release. Manifest dimensions/fps must agree with the simulation.

## Styling and accessibility

Use the existing global [CSS](../../../src/client/style.css), semantic buttons, Chinese labels, labeled Canvas, labeled directional touch buttons, and live match-status region. `[hidden]` must remain effective despite layout rules. Keep visible action buttons keyboard accessible and maintain their disabled/visibility rules across scene changes.

Canvas is focusable; matching explicitly focuses it. Touch buttons keep pointer cancellation handling described in [event lifecycle](event-lifecycle.md). Visual scaling and actual keyboard/touch behavior require manual browser verification; type checking alone cannot prove them.

## Match actions inside the court

Keep the existing `start` and `cancel` native buttons in the court's menu overlay. `buttons()` retains their scene visibility and start/rematch label; moving DOM nodes must not duplicate listeners or commands.

The `leave` button belongs to an independent court action layer, outside `#overlay`. `overlay(..., false)` hides the whole menu during online play, so an end-match button nested there would disappear. Keep it available during active play and reconnect pauses according to `buttons()`.

Size the presentation in CSS and retain the centered Canvas world transform. Reserve space for the scoreboard and live match status when positioning the menu and corner action. Narrow or short screens need reachable menu actions, including overflow handling where necessary; avoid covering the scoreboard with the end-match button. A wide viewport can still produce a narrow court through its height-based width limit: the compact scoreboard rules apply when viewport width is at most 640px **or** height is at most 540px, reserving122px on the right. Compact actions use two columns for mute/settings and a second row for end-match; the settings panel starts below them. Check these constraints manually without changing world coordinates or authoritative game state.

Four native `[data-shuttle-speed]` buttons in the “球速场次” group use aria-pressed for a single choice, default1x. Disable them during loading/queue/room and allow result selection; next selection must not change the retained result speed. Seven native `[data-character]` buttons provide original previews and aria-pressed selection; disable them in queue/room, allow selection after result. Remove practice entirely. Keep `#mute` with aria-pressed and M feedback accessible outside the hidden menu. Source Intro/Finish art is Canvas presentation; online matching/result actions stay accessible native DOM buttons.

`#settings` also lives outside the menu overlay, with `aria-expanded`/`aria-controls` for `#settings-panel`. Its native `#self-left-view` checkbox follows the [self-left perspective contract](state-management.md#optional-self-left-perspective). Keep its loading/inert gate, readable source art, native Space behavior and compact action/panel layout. The match continues while the panel is open; gameplay input is gated until it closes.

## Baked artwork and loading

Follow the executable [Pixi rendering and atlas contract](rendering.md) for baking, registration, ordering, shader colors, scene loading and WebGL recovery. The Canvas raster and SVG Blob caches were removed; do not reintroduce SVG filtering during play.

## Adaptive backing density

[RenderQuality](../../../src/client/render-quality.ts) owns `dpr(nativeDpr, scale)`, `observe(at, QualityFrame): boolean`, `resetObservation(at)` and detached `diagnostics()`. Main composes it with viewport and lifecycle. It runs with diagnostics disabled too.

- Start at native DPR capped2. After a decrease, effective DPR is `min(native capped DPR, retained world-density cap / CSS world scale)`; below1 is intentional on large CSS courts. Never change CSS size, world scale/offsets, input coordinates, effect contents or gameplay timing.
- An eligible window completes only after both at least2s and at least4 samples, then needs at least50% gaps strictly above35ms to decrease. Do not discard a slow window merely because2s elapsed before its fourth sample. Bound counters to240, with1s grace after transition/eligibility/viewport changes and6s cooldown after each decrease. A lone stall amid healthy frames must not lower quality. No RAF execution means no policy execution.
- Choose only a useful strictly lower world-density cap from `[4, 2.8, 2, 1.4, 1]`. Small viewports skip unnecessary levels. Lower only, at most five changes per page; no repeated resize at the floor or automatic upshift. Rematch retains the cap; reload resets it.
- A completed overloaded window with mean gap >=105ms may skip levels using `density * sqrt(25 / meanGap)`, rounded down to an existing tier/floor1. The separate25ms target reserves headroom while35ms remains the normal tolerance. This bounds severe recovery time; an isolated stall still fails the slow-fraction requirement. Stable30Hz (including timer jitter below35ms) keeps detail.
- Observe loaded, visible, focused, connected online `playing` room status (including point/serve waits) or stable natural-result presentation. Loading/menu/queue/reconnect/non-natural results reset observations. A disconnect callback also resets the window; an existing natural result can become eligible again without a live socket because its animation is local. Scene/focus/visibility/viewport changes discard partial overload windows, retaining the cap.
- An actual decrease returns true once: the ordinary frame owner resizes the Pixi backing. Retain the loaded atlas tier, live Effects and Audio; lowering backing density does not reload pages.

Debug `quality.stage: 0` / `worldDensityCap: 0` denotes native mode; other stages are level index+1, so skipped levels are expected. These thresholds control cost, not guaranteed FPS. Tests cover eligibility/grace/cooldown, healthy/lone/sustained stalls, below1 DPR, resize/rematch retention, finite floor and detached bounded state. Browser acceptance proves debug-off adaptation, unchanged CSS, original effects and audio. Lower density softens detail; real-device acceptance remains separate.

## Startup and matched-pair loading

Static `#loading-screen` covers startup. Main retains `assetsReady` separately from scene state, gates input and underlying controls, receives WS snapshots throughout preparation, and reveals the latest scene without calling idle. Exact manifest/decode/upload counts come from completed work; no fake percentage or fixed wait. Audio loads independently. New matched roles must pass the same scene gate. `#loading-exit` remains reachable during live-room failure. See [rendering](rendering.md) for signatures, deadlines, generation cancellation and restore rules.
