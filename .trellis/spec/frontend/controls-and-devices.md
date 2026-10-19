# Keyboard settings and gamepad input

## 1. Scope / Trigger

Keyboard remapping and standard Gamepad API input are browser-local controls over the existing logical InputFrame. They cross preferences, native events, source merging, paced sending and prediction. Keep these contracts when changing any device or settings flow.

## 2. Signatures and owners

- [controls.ts](../../../src/client/controls.ts): `Action = "left" | "right" | "jump" | "hit"`, `KeyBindings`, `ControlsPreferences`, `defaultControls()`, `parseControls(raw)`, `readControls(storage?)`, `saveControls(value, storage?)`, `bindingError(...)`, `actionKeys(...)`, `keyboardHelp(...)`.
- [input.ts](../../../src/client/input.ts): one page-owned `Input`, `setBindings(bindings)`, `setGamepad(actions)`, `clearGamepad()`, `release(notify?)`, `peek(seq)`, `commit(frame)`; native editable-target guard is shared with main.
- [gamepad.ts](../../../src/client/gamepad.ts): one `GamepadController(input, onStatus, read?, enabled?)`; `refresh()` reads status only, `poll()` samples gameplay, `reset()` requires neutral rearm, `setEnabled(enabled)` clears the device boundary.
- [controls-settings.ts](../../../src/client/controls-settings.ts): page-owned `KeyboardCapture` / `ControlsSettings` own native binding capture and panel content, never network sending or simulation.

## 3. Contracts

`fiso-online:controls:v1` stores exactly `{version:1, bindings:{left:string[],right:string[],jump:string[],hit:string[]}, gamepadEnabled:boolean}`. Limit stored text to4096 characters and each action to three unique supported physical codes. Reject cross-action duplicate keys, unknown fields/version, reserved codes and malformed types as a whole; use detached defaults. Catch storage property access, get, parse and set errors. The live page remains usable without persistence. Keep the existing self-left key independent; send no preference/device identity to server.

Defaults retain A/left-arrow, D/right-arrow, W/up-arrow, Space/S/down-arrow. User may remove every binding for an action; display “未设置” and keep touch/gamepad available. M remains mute; Escape/Tab and Ctrl/Alt/Meta browser shortcuts retain their native/capture hierarchy. Labels describe physical codes; non-US layouts need physical-device acceptance.

Capture consumes only a fresh eligible press after native Add activation. Prevent a captured keyup from activating a native button. First Escape cancels capture; the next closes settings. Tab cancels capture and navigates normally. Blur/hidden/pagehide/panel close/other settings focus cancels. Repeats and IME composition must not bind or resurrect old controls.

Track independent keyboard-code, pointer-ID and one gamepad source. OR each action; right minus left gives move. Only an aggregate jump/hit false→true creates an edge. Pending provenance is bounded by source kind so unplug/disable can drop gamepad-owned unsent edges without removing keyboard/touch edges. Ordinary quick taps survive release until a successful synchronous send commits them. Full lifecycle release clears every hold and edge. Touch data-control values are logical actions, independent of keyboard codes.

One existing InputScheduler owns gameplay polling/sending: after eligibility, poll the gamepad immediately before peek, map screen move with worldInput once, send, then commit/advance seq/predict only on success with the same frame. No RAF gameplay sampling, second polling/sender loop or device timestamps/positions on the wire. Browser hardware refresh may have its own cadence; taps entirely between exposed samples can be missed.

Standard gamepad mapping uses left axis0 and horizontal D-pad14/15, bottom face0 for jump, left face2 for hit/serve. Axis engagement is at±0.35 and release/rearm at absolute0.20 or less; direct reversal and stick/D-pad opposition remain well defined. Validate finite axis and required buttons. Incomplete samples clear the contribution and do not qualify for neutral rearm. Do not guess empty/xr-standard mappings.

Select one lowest-index exposed connected standard pad initially and retain it while present. Disconnect/replacement/index reuse clears it and starts unarmed; do not persist device IDs or merge pads. Full release, settings, focus, room and reconnect boundaries require one complete neutral active sample before later presses are accepted. Status-only discovery never arms or injects actions. Refresh once at startup, settings open, native connect/disconnect, and explicit Detect; no inactive loop. Native button/form/editable focus suppresses pad gameplay and requires rearm on return.

## 4. Validation and error matrix

| Condition | Required result |
| --- | --- |
| Unknown/malformed/reserved/conflicting saved configuration | Whole safe default configuration |
| Storage getter/read/write denied | Live controls work; no startup or matching failure |
| Key already assigned to another action | Explain conflict; unchanged configuration |
| Settings/capture/native UI Space/Escape/Tab | Native settings behavior; no hit or leave leakage |
| Alias/second source holds an already-held action | No duplicate jump/hit edge |
| Source release or pad disconnect | Remaining sources survive; removed pad's unsent edges do not leak |
| API absent/throws/nonstandard-only | Readable recoverable status; keyboard/touch remain functional |
| Controller held during resume | Neutral until released/centered and freshly pressed |
| Failed Network.send | Preserve edges, seq and prediction history |
| Sparse/changed pad slots | Stable valid selection; replacement starts unarmed |

## 5. Good / Base / Bad cases

Good: mirrored actual-right player holds keyboard-left while pad-right cancels it, then unplugging restores the held keyboard direction in the next paced command. Base: add J for hit, save locally, refresh and serve with J. Bad: remap W and thereby break touch jump; unplug by calling full Input.release and cancel keyboard; arm while settings status reads a centered stick; send a pad button directly from RAF.

## 6. Tests required

Preference tests assert bounded schema, detached defaults and throwing storage boundaries. Native event tests cover actual capture/focus/default behavior, conflicts, aliases and pointer IDs. Adapter tests cover standard positions, sparse slots, exceptions/recovery, hysteresis, stable selection/replacement and complete neutral rearm. Real Input/Network/InputScheduler integration tests verify source provenance and retained edges/sequence under disconnected, buffered and throwing sends, including world mapping to accepted prediction. Keep existing cadence tests independent of RAF.

After code/build/isolated HTTP checks, authorized Chromium probes verify native settings, current help/serve text, mirrored keyboard/touch/gamepad, lifecycle/reconnect/rematch, actual outbound logical frames and same-tick authority, plus320×568/812×375 panel reachability. Synthetic navigator data proves integration only. Physical USB/Bluetooth discovery, firmware/driver/OS/browser mapping, real touch and two-computer latency need separate evidence. Serve public HTTPS and feature-detect API access; do not invent a universal permission prompt or unsupported secure-context restriction.

## 7. Wrong vs Correct

Wrong: `touch -> bindings["KeyW"]`; `RAF -> gamepad -> socket.send`; `disconnect -> input.release()`; arm from inactive settings enumeration.

Correct: `touch -> logical jump source`; `existing scheduler -> gamepad.poll -> peek -> worldInput -> successful send -> commit/predict`; `disconnect -> clearGamepad + neutral rearm`; use status-only refresh while inactive.
