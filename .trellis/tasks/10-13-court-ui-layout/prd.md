# Larger court and in-game actions

## Goal

Make the playable court the focus of the page, with matchmaking and match actions inside the game area. The user requested a larger game window and in-game buttons, then explicitly selected “创建任务并继续实现（推荐）”.

## Confirmed background

- `index.html` currently places all four match buttons in an introductory section above the court.
- `src/client/style.css` limits the page to 1180px; the introduction consumes additional vertical space.
- `main.ts` owns idle, queued, online, practice and result visibility. Its overlay is hidden during active play.
- The Canvas already scales and centers the unchanged 1600×900 world from measured CSS dimensions.

## Requirements

- R1: Increase the desktop court's available width to a maximum of 1600px, with small page gutters; remove the large above-court introduction so the game starts higher on the page. Retain proportional world rendering and accommodate shorter viewports.
- R2: Place existing native start, cancel and practice buttons in the in-game menu. Results retain the existing “再次匹配” behavior.
- R3: Keep the existing end-match button inside a separate court corner layer, available during online play, AI practice and reconnection even when the menu overlay is hidden.
- R4: Retain scoreboard, connection feedback, status announcements, keyboard access, Canvas focus, and existing touch controls. Small screens must keep menu actions reachable and avoid scoreboard/corner-button collisions.
- R5: Preserve Chinese labels, current game artwork and existing button IDs/handlers. Do not introduce UI dependencies.

## Acceptance criteria

- AC1 (R1): The desktop page supports a visibly wider court than the old 1180px cap at common 1440×900 and 1920×1080 viewports, and the above-court introduction is removed.
- AC2 (R2–R3): All four match-action buttons are descendants of the court, with unique IDs. Idle/result show start and practice; queued shows cancel; online/practice show end-match. End-match is not hidden by the menu overlay.
- AC3 (R4–R5): Native buttons, hidden rules, labels, live status and focus/input behavior are preserved; responsive rules account for 320px and 360px widths and short landscape screens.
- AC4: Lint, type checks, relevant existing tests, production build and isolated local HTTP checks pass. No automated browser is launched. Visual fit, native focus and touch feel remain explicitly pending manual acceptance.

## Scope limits

Only frontend presentation and its documentation/specs are in scope. No changes to simulation, protocol, identity, matchmaking, source provenance, existing game entrances or production services. No public deployment, browser automation or latency claim is included in this task.
