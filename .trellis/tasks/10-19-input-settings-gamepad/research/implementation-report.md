# Implementation report

## Minimal change boundary (before code)

The existing client can only translate a fixed physical-key map and pointer presses masquerading as those keys. This task adds browser-local four-action bindings and standard-controller samples at the existing Input owner. controls.ts owns validation/storage/labels; input.ts owns independent logical sources and transactional edges; gamepad.ts owns selection/rearm/decode; controls-settings.ts owns native capture/UI; main.ts composes those owners into its existing sender/lifecycle. HTML/CSS expose the settings and current hints, tests cover boundary behavior, and README records use/acceptance limits.

Server/shared mechanics/protocol, Prediction/Renderer timing, artwork/reference data, service configuration and other routes remain outside this change. No new dependency, sender, gameplay timer, framework or controller menu navigation. Input refactoring is verified against existing alias/release/send tests plus cross-source and pending-edge ownership cases.

## Progress

Implementation started after approved plan. Checks/results will be appended after implementation.

## Implemented owners and behavior

- `src/client/controls.ts`: typed four-action/default-alias map, explicit physical-code allowlist, conflict/max-three checks, labels/effective help, exact bounded version1 schema and guarded separate localStorage preference.
- `src/client/input.ts`: physical keyboard sources, logical pointer-ID sources and single gamepad source merge with aggregate jump/hit edges. Pending provenance is bounded to keyboard/pointer/gamepad groups. Ordinary quick taps survive failed sends; pad detachment discards only pad-owned pending edges/holds. Repeats, native/editable focus, composition and browser shortcuts retain defined behavior.
- `src/client/gamepad.ts`: standard-layout positional controls, .35/.20 hysteresis, stable lowest-index initial selection, replacement/disconnect reset, complete-neutral rearm, status-only inactive discovery and guarded API access. No independent timer or sender.
- `src/client/controls-settings.ts`: native alias add/remove/reset, captured-key conflict feedback, activation key/keyup suppression, Escape/Tab/blur/visibility/pagehide cancellation and Chinese status.
- `src/client/main.ts`: poll immediately before existing peek/worldInput/send/commit/seq/prediction; share release/rearm across existing boundaries and native focus, one-shot startup/settings/detection/events status, dynamic controls/side/serve hints. Touch pointer use restores Canvas focus after native menus without focusing the touch button.
- `index.html` / `style.css`: existing self-left setting retained; scrollable binding rows, hand-controller enable/detection/status/help, current-control help and logical touch attributes.
- README: per-guest remapping, controller mapping and activation/rearm, menu/nonstandard/remap/haptics exclusions, local-only persistence and physical-device validation limits.
- Tests changed/added: input, controls, keyboard-capture, gamepad, network. Existing pointer tests now use logical action values and native pointer IDs. Added actual InputScheduler + Network.send rejection and mirrored accepted-prediction transaction with gamepad quick taps.

## Implementer verification

2026-10-19 after final product edits and targeted formatting:

- `npx vitest run tests/input.test.ts tests/controls.test.ts tests/keyboard-capture.test.ts tests/gamepad.test.ts tests/network.test.ts tests/input-scheduler.test.ts`: **6 files /100 tests passed**.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `git diff --check`: passed (shared tree includes primary-owned spec changes).

Earlier checkpoint:5files/78tests, lint/typecheck passed before final README/focus/test changes. Final targeted100-test result supersedes that checkpoint. No full suite/build/browser/HTTP or public deployment was run by this implementer; primary and independent checker own those remaining gates. No backend/shared/protocol/source asset/reference/dependency/deployment edit, service operation or Git commit performed.

## Handoff risks / remaining acceptance

Native DOM capture/Space/focus layout, two-guest authority/lifecycle behavior, pointer remap independence and synthetic navigator integration still require the planned isolated browser checks. Unit tests do not prove real USB/Bluetooth hardware mapping, other browsers, actual mobile touch, real two-computer feel or latency. No physical controller is available in this implementation turn. Existing loop remains the sole timer; hardware presses wholly between its samples cannot be reconstructed.
