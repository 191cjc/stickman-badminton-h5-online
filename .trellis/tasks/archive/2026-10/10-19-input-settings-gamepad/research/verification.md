# Implementation, integration and release verification

Date: 2026-10-19. Final plan approved with “开始吧”.

## Code and scope

- Implementer:100 targeted tests across6 files, lint/typecheck/diff-check passed. Independent reviewer found no in-scope defect, made no product edits, and confirmed the same targeted checks.
- Primary final checks: `npm run lint`, `npm test` (24 files /357 tests), `npm run build` (includes typecheck), `git diff --check` passed. The backend bundle is byte-identical to the pre-release production bundle (SHA-256 `d11f325000575b6f0862ec5db6c7e9ab20eefb267225c839336ccc421f95c62d`). No changes in server/shared/renderer/assets/reference/dependencies or other project routes/configuration.
- New executable input/device contract and frontend index/directory/event-lifecycle updates checked for local links. Both task manifests validate with13 real context entries.

## Isolated acceptance

- Built backend18815/static-proxy18816: HTTP200, JS/CSS, health4/60/30, source metadata/four SVG hashes, HttpOnly/SameSite Cookie and v4 WS greeting passed before browser launch.
- `controls-browser.mjs`: native keyboard capture/conflict/reserved Enter/Escape/Tab, remapping/persistence, logical pointer after remap, mirrored actual-right controls, synthetic standard pad merging/edges/detach, settings/blur/retained-Cookie reconnect neutral rearm, polling while application RAF callback held, API exception/recovery, enable/detection, native UI focus, leave/rematch,320×568/812×375 reachability, denied/invalid storage, no-API and reset.261 corresponding complete authority states equal; zero page/console errors.
- `controls-gameplay-browser.mjs`: separate fresh guests; synthetic pad causes authoritative jump and shuttle launch, opponent disconnect/resume clears a held pad until neutral, natural7:0 result with647 corresponding complete states equal and identical final result; zero page/console errors.
- Initial RAF-stall probe used Playwright's own default RAF-based wait and timed out because the probe intentionally suspended RAF. Changed only probe polling to20ms timers. Next native-focus probe expected neutral frames whereas intended native focus stops sampling; changed that assertion to require no frames. Full main scenario then passed. Both failed probe reports retained; no product code edits or reduced acceptance scope resulted.
- Ignored artifacts: `controls-browser-results.json`, `controls-gameplay-browser-results.json`, `controls-browser-raf-probe-failure.json`, `controls-browser-native-focus-probe-failure.json`, compact screenshots and tooling under `artifacts/flash-versus-verification/`.

## Public release

- Built release: `20261019T083234Z-controls-gamepad`; rollback: `20261019T070111Z-self-left-view`. Use `bash scripts/rollback.sh 20261019T070111Z-self-left-view` then refresh. No rollback drill performed.
- Published prevalidated build and production dependency into its independent release directory, atomically switched current, restarted only `badminton-h5-online.service`. No unit/snippet/vhost edits or Nginx reload needed; nginx configuration test passed. Pre-restart health rooms0/queued0.
- Service active since2026-10-19 16:32:36CST, PID300002. Initial health poll occurred before bind and existing retry succeeded; logs show normal stop/start/listen. Health protocol4, simulation60Hz, snapshots30Hz.
- Official `scripts/http-check.mjs https://www.firesoul.cn` passed page, assets, metadata/SVG hashes, production Cookie/v4 handshake and three legacy entry HTTP200 responses.
- Public HTML/`index-DWoCfovp.js`/`index-CacULKDD.css` byte-equal to final build; immutable asset caching and source records/server bundle match.
- Before/after audit: other snippets/vhost/legacy demo source hashes and unrelated service PID/start times identical; production environment fingerprint and0600 mode unchanged. Public matching was not used. Both isolated verification ports stopped.

## Limits

These are same-host isolated Chromium tests using synthetic navigator Gamepad API data. No physical controller, firmware/driver/USB/Bluetooth/browser-OS mapping, real mobile touch or cross-computer latency was tested. Browser hardware updates may follow a browser refresh cadence even though application sender polling is independent of RAF. No latency/FPS claim. Standard-only gameplay; gamepad remapping, vibration, menu navigation and manual device selection remain out of scope.
