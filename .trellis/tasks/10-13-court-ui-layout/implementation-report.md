# Implementation report

## Files changed

- `index.html`: removed the above-court introduction; moved the existing start, cancel and practice buttons into the overlay menu; moved end-match into an independent court action layer. Existing IDs and Chinese labels are retained, and all four controls are native `type="button"` elements.
- `src/client/style.css`: raised the page maximum width from 1180px to 1600px, compacted the header and limited desktop court size by viewport height while preserving its 16:9 aspect ratio. Added menu scrolling, visible focus outlines, narrower-screen HUD/action separation and compact short-landscape styles. Expanded the previous invalid font shorthand into explicit inherited font-family, size, weight and line height.
- This report records implementation evidence. No changes were needed in `main.ts`, Canvas rendering, input, network, simulation or server code.

## Source rationale

`main.ts` already measures Canvas CSS dimensions and uniformly maps the unchanged 1600x900 game world. Presentation scaling therefore needs only CSS. Its existing `buttons()` helper still owns scene visibility and labels, and `overlay()` still hides the entire menu during active play. End-match is deliberately outside that hidden ancestor, so it remains available in online/practice/reconnection states.

Menu actions precede longer detail text so the primary buttons appear first when the panel must scroll. At widths up to 640px, the compact scoreboard sits at top left with a maximum width reserving the top-right end-match button; labels can wrap within the scoreboard. This keeps the playable floor clear. Overlay padding reserves separate scoreboard and status areas. Existing `[hidden]`, keyboard/Canvas focus handlers, live status and touch-control listeners are preserved.

CSS sizing arithmetic, not rendered-browser evidence:

| Viewport  | Approximate court |
| --------- | ----------------- |
| 1440x900  | 1330x748          |
| 1920x1080 | 1600x900          |
| 320x568   | 304x171           |
| 360x640   | 344x194           |
| 844x390   | 480x270           |

## Checks completed

- `npx prettier --write index.html src/client/style.css`: passed; both files already matched formatting.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `git diff --check`: passed.
- After the final small-screen padding adjustment, `npx prettier --check index.html src/client/style.css`: passed.
- An ephemeral Python HTML parser confirmed unique IDs, four native action buttons under the court, menu ancestry for start/cancel/practice, and independent ancestry for end-match. No new permanent tests were added.

## Remaining acceptance and coordination

The main session will run the appropriate existing tests/build, isolated HTTP validation and independent review. No browser, public matchmaking guest, production service, deployment script or release was started by this agent.

Actual visual sizing, scoreboard/corner clearance with native fonts, focus scrolling, Canvas keyboard focus, touch feel and unusually short-screen menu scrolling remain manual browser acceptance. These headless checks do not prove physical input latency or visual fit.
