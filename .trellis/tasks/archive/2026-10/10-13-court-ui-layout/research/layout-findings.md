# Existing frontend evidence

- `index.html`: `.intro .actions` contains `start`, `cancel`, `leave`, `practice`; `.court` contains scoreboard, focusable Canvas, menu overlay, and a live match status.
- `src/client/style.css`: `#app` is `min(1180px, 94%)`; intro adds padding and heading height; court is 16:9. `[hidden]` is `display: none !important`.
- `src/client/main.ts`: `buttons()` owns scene visibility and labels. `overlay()` hides the whole overlay during online/practice, including all descendants. `matched` and practice click focus the Canvas. Canvas render dimensions come from `clientWidth/clientHeight`, with DPR capped at 2 and a uniformly centered world transform.
- `src/client/input.ts`: keyboard events ignore focused buttons/inputs; pointer controls and focus-loss release live here and need no changes for moving native action buttons.
- Existing frontend spec files explicitly prohibit claiming visual or input-feel acceptance from headless tests. The user prohibits automated browser testing.

Keep end-match outside the hidden menu overlay; menu placement can reuse all existing handlers without touching authoritative simulation or matchmaking.
