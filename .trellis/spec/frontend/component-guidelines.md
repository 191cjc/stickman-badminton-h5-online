# DOM and Canvas components

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

## Canvas presentation

[Renderer.render](../../../src/client/renderer.ts) consumes `GameState` and `Viewport`; it loads the extracted `public/classic/manifest.json` and SVG image layers. Renderer must not decide collisions, scores, room status, or gameplay input.

The frame loop measures Canvas CSS dimensions, caps DPR at 2, calculates a uniform world scale, and sets the drawing transform. Preserve the640×426 world mapping from [CLASSIC_WORLD](../../../src/shared/classic/types.ts) rather than changing physics coordinates to fit the screen.

Draw the selected swing behind the body, mirrored at±1.25horizontal/1.25vertical, using the same1-basedframe as numeric authority. The serve layer already contains its attached shuttle; draw the standalone shuttle only after release. Manifest dimensions/fps must agree with the simulation.

## Styling and accessibility

Use the existing global [CSS](../../../src/client/style.css), semantic buttons, Chinese labels, labeled Canvas, labeled directional touch buttons, and live match-status region. `[hidden]` must remain effective despite layout rules. Keep visible action buttons keyboard accessible and maintain their disabled/visibility rules across scene changes.

Canvas is focusable; matching explicitly focuses it. Touch buttons keep pointer cancellation handling described in [event lifecycle](event-lifecycle.md). Visual scaling and actual keyboard/touch behavior require manual browser verification; type checking alone cannot prove them.

## Match actions inside the court

Keep the existing `start`, `cancel`, and `practice` native buttons in the court's menu overlay. `buttons()` retains their scene visibility and start/rematch label; moving DOM nodes must not duplicate listeners or commands.

The `leave` button belongs to an independent court action layer, outside `#overlay`. `overlay(..., false)` hides the whole menu during online play and practice, so an end-match button nested there would disappear. Keep it available during active play and reconnect pauses according to `buttons()`.

Size the presentation in CSS and retain the centered Canvas world transform. Reserve space for the scoreboard and live match status when positioning the menu and corner action. Narrow or short screens need reachable menu actions, including overflow handling where necessary; avoid covering the scoreboard with the end-match button. A wide viewport can still produce a narrow court through its height-based width limit: the compact scoreboard rules apply when viewport width is at most 640px **or** height is at most 540px, reserving 100px on the right for the corner action. Check these constraints manually without changing world coordinates or authoritative game state.
