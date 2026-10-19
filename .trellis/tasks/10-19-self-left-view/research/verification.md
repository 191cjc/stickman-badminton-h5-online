# Implementation and verification record

## Implementation / independent check

- User approved final plan with “开始” on2026-10-19; branch feat/self-left-view, task started.
- Implement agent delivered local default-off persisted perspective, accessible panel, actual-seat input mapping, retained result display, world-only reflection and prepare/render art selection.
- Independent check found repeat keydown's early return skipped preventDefault for held Arrow/Space. It retained repeat-state suppression but prevented default for bound gameplay keys; native INPUT Space still retains its default. Regression assertions passed.
- Final check: lint/typecheck and291 tests across21 files pass. Primary rebuilt final source (index-BNPzeNWs.js/index-BoY6qMhL.css). Server bundle compared byte-equal to prior deployed release.
- Relevant specs updated and relative file links checked. Compact action reservation corrected from stale100px wording to actual122px, with two-column actions and separate leave row.

## Ordered acceptance evidence

Isolated backend18815 / static+proxy18816; no production matching. Code/build/HTTP checks preceded browser. HTTP checked title/assets, health4/60Hz/30Hz, source manifest/four SVG hashes, Cookie and WS hello.

Browser acceptance is composed of separate runs, not one uninterrupted all-pass study:

1. Main two-guest Chromium run (leftDPR1/rightDPR2) passed readiness gate, default/persistence/isolation, all four seat/preference cases, actual keys and pointer-operated touch-button directions, settings input/repeat/focus/Space/Escape, retained-Cookie reconnect, asymmetric scores, natural7:0 and original spark/tail/smoke/confetti transforms.1022 corresponding authority states matched. Actual right displayed0:7 and p2wins; left/right original intro role art swapped correctly. Readable art matrices positive, mirrored world-effect matrices negative.
2. After30s actual room reclamation, the main run's settings click timed out waiting for Playwright scheduled navigation. A focused follow-up used noWaitAfter plus explicit panel/ARIA/score/label assertions: both directions of retained-result switch passed and main-frame navigation count did not change. This follow-up then timed out locating inactive left page's static start button.
3. Source re-review found no settings navigation or recursion and no DOM removal of start. Effects/time/cache bounds are unchanged. A fresh foreground-page short run passed native leave/rematch with preference retained,320×568 and812×375 settings/checkbox/complete/match reachability, storage getter denial and invalid stored value. No product fix was invented for the automation timeouts.

Earlier harness probes are preserved: first pointer move used an offscreen touch-button rectangle (fixed by scroll + viewport assertion); an early microtask observed defaultPrevented before later product listeners (fixed by observing after dispatch); a score-frame assertion incorrectly expected a leading slash after stripping the base path. These were harness fixes, not additional product changes.

Main/retained/UI and combined reports plus screenshots are under ignored artifacts/flash-versus-verification/self-left-*.json/png/mjs. Original source/filter resources remain unchanged. Real touch hardware, physical two-computer feel, other browsers and prolonged result/background responsiveness are not established by these feature checks. No latency/FPS claim.

## Publication

Before publication: production health4/60Hz/30Hz, rooms0/queued0. Isolated verification server stopped.

Published20261019T070111Z-self-left-view with publish.sh exit0. Repeated required291 tests/lint/type/build passed; Nginx validation/reload passed. Own service restarted2026-10-19 15:02:33 CST, PID274795 active. Initial health raced binding; built-in retry succeeded. Official public HTTP checked HTML/assets/source hashes/Cookie/v4 and all three other entries200. Public byte audit verified index/JS/CSS, release provenance and server bundle. Source/config/env fingerprint audit and unrelated service PID/start-time comparison passed; only owned service restarted. Verification ports18815/18816 closed.

Previous/rollback release20261016T061913Z-sustained-smoothness; use existing rollback.sh with that ID, then refresh. No production rollback drill or public matchmaking. Local browser evidence and external acceptance limits remain as above.
