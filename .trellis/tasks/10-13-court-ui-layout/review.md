# Court UI review

## Findings (fixed)

- File: `src/client/style.css:294`
- Issue: The viewport-width breakpoint missed a narrow court produced by the height-based width limit. At 844×390 or 812×375, the court reaches its 480px width floor while the desktop centered scoreboard remains active. Its label, gap and padding widths can enter the right-side end-match area with native fonts; the compact HUD rules previously applied only below 640px viewport width.
- Fix: Share the compact, left-aligned scoreboard rules between narrow viewports and viewports at most 540px high. The HUD reserves 100px on the right, and labels may wrap. This avoids duplicating the rule block and preserves the existing court/menu sizing and end-match handlers. Rebuilt after this CSS change so the final assets contain the fix.

## Findings (not fixed)

No unresolved code or spec-compliance findings. Visual appearance with native fonts, browser focus scrolling, touch handling and actual input feel require manual acceptance; they are not established by these headless checks. No browser was launched. Local HTTP checking, documentation/spec bookkeeping and Git actions remain owned by the main session.

## Behavioral review

- The larger page supports approximately 1330×748 court sizing at 1440×900 and 1600×900 at 1920×1080 by CSS arithmetic. The introductory section is removed. Canvas still uses its existing uniform mapping of the unchanged 1600×900 world.
- `start`, `cancel` and `practice` retain unique IDs, semantic button types and existing handlers inside the menu overlay. `leave` retains its ID and handler in an independent court layer. `[hidden]` continues to override layout display properties.
- Idle and result show start/practice; queued shows cancel; online/practice show leave. Online reconnect pauses show the menu message with leave available independently. Active online/practice states hide the overlay without hiding leave. Existing rematch labels remain controlled by `buttons()`.
- Canvas focus after match/practice and input/focus-loss ownership are unchanged. The live match-status region remains present, and visible focus outlines are added.
- At 320px/360px viewports, the menu reserves top HUD/bottom status space, keeps actions before longer details and permits internal scrolling. Short-landscape screens use the compact HUD and menu rules. These are source/layout checks, not rendered-browser evidence.
- No changes to `main.ts`, input, networking, prediction, renderer, simulation, protocol or server code were needed.

## Verification

- Lint: pass — `npm run lint`.
- TypeCheck: pass — `npm run typecheck`; final `npm run build` also runs type checking.
- Tests: pass — `npm test`, 7 files and 50 tests.
- Build: pass — `npm run build`; repeated once because the reviewer changed CSS after the initial build.
- Formatting: pass — `npx prettier --check index.html src/client/style.css`.
- Diff whitespace: pass — `git diff --check`.
- Ephemeral structural check: pass — unique IDs; all four native action buttons descend from the court; start/cancel/practice descend from the overlay; leave does not; focusable Canvas, polite live status, hidden rule and shared compact HUD breakpoint are preserved. No permanent tests that mirror DOM/CSS assignments were added.
- Final client assets: `dist/client/assets/index-ZjfDxUHx.css` and `dist/client/assets/index-CNo39k9F.js`.

No deployment, production service changes, public matchmaking guest or browser automation occurred during review.
