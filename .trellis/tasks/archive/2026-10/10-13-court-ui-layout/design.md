# Court presentation design

## Change boundary

The gap lives in the static DOM and CSS: match actions sit outside a court whose width is capped at 1180px. Change `index.html` and `src/client/style.css`; modify `main.ts` only if necessary for scene-specific layout, preserving command handlers. Existing Canvas resize logic requires no simulation or renderer changes. `docs/validation.md` records validation and manual acceptance limits. The main session owns Trellis artifacts and spec updates.

## Layout

Use a compact header and wider centered page (maximum 1600px). Remove the separate introduction. Preserve the court's 16:9 mapping, with viewport-aware sizing where helpful on short screens. Keyboard instructions and touch controls stay readily available below the court.

Move the existing start/cancel/practice buttons into the overlay's menu panel. Keep the end-match button in an independent positioned court action layer: putting it under the overlay would remove it during active play. No buttons or listeners are duplicated. The existing `buttons()` and `overlay()` helpers retain visibility ownership.

Scoreboard and match status remain on their own layers. Reserve vertical room for them around the menu, and tune narrow-screen font/padding/placement so the corner button does not overlap the scoreboard. A scrollable menu is acceptable as a last-resort fallback for unusually small court heights; primary actions must remain reachable. Visible focus outlines are retained or improved for semantic buttons.

## Compatibility and rollback

Base path, wire commands, logical input and Canvas world dimensions remain unchanged. CSS and HTML are built by the existing Vite pipeline. A future publication uses the existing release procedure; this task only validates local output. Revert this work commit to restore the former presentation.

## Verification boundary

Review all scene states and HTML IDs structurally, then run code checks and build. Fetch built HTML/CSS/JS from an isolated localhost HTTP preview using the application base path. No browser automation is permitted; visual fit, keyboard focus and touch operation require later manual checks.
