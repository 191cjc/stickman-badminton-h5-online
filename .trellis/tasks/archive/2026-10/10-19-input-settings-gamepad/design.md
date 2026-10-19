# Controls settings and gamepad design

Status: final plan approved by user (“开始吧”, 2026-10-19).

## Boundaries and ownership

This is one integrated client task because keyboard, touch and gamepad must share logical edges and release behavior. Do not split them into independent competing Input owners.

- `controls.ts` (new): typed four-action keyboard preferences, immutable defaults, supported-code validation, conflict detection, labels, guarded versioned persistence.
- `input.ts`: page-owned per-source held actions and pending edges, keyboard/pointer listeners, editable-target and repeat guards; retains InputFrame peek/commit semantics.
- `gamepad.ts` (new): page-owned Gamepad API adapter with no independent gameplay clock; device discovery/selection, standard mapping, hysteresis, neutral rearm and safe unavailable/disconnect behavior.
- `controls-settings.ts` (new, if needed to keep main focused): native keyboard-binding capture and small DOM settings controller. Does not send network commands, simulate or instantiate Input.
- `main.ts`: composes preference/controller lifecycle, polls gamepad before the existing input transaction, handles settings/UI and generates current hints.
- `index.html` / `style.css`: extend the existing settings panel with binding rows, reset, gamepad enable/status/detection/help and native accessible controls.
- Behavioral tests and README/validation/spec documentation follow the changed owners.

Keep server, shared protocol/simulation, Prediction timing, Renderer, source assets and extracted original effects unchanged. Client modules depend only on browser APIs and existing shared contracts; no input/network library is required.

## Keyboard preference and capture

Proposed storage key: `fiso-online:controls:v1`, with an explicit version, four bounded action-code arrays and a gamepad-enabled boolean. Retain `fiso-online:self-left:v1` separately. Validate the full payload before use: bounded text length, exact version/fields, exact four actions, arrays of at most three supported unique codes, no cross-action duplicate, and boolean flag. On malformed/unsupported data use defaults. Catch the storage getter/read/parse/write boundary; live changes must still work on storage failure. No identity, device ID or cross-tab/cloud synchronization.

Initial defaults preserve all nine existing aliases. Each action row shows its current codes, accessible remove controls and an Add button (maximum three). Empty actions display “未设置”. Add waits for a fresh physical `event.code`; conflicts leave the map intact and report the owning action. Reset restores the complete keyboard default map and current hints. Preserve explicit allowlisted gameplay codes and reserved M/Escape/Tab/browser modifier/shortcut behavior described in research/keyboard-and-settings.md.

Capture is document-scoped only while settings is open and capture is active. It must run before normal Escape-close handling. First Escape cancels capture, next Escape closes the panel. Tab cancels capture and preserves browser navigation; blur/hidden/pagehide/close/another setting also cancels. Ignore repeat/composition and Ctrl/Alt/Meta combinations. Capture the next actual press rather than the Enter/Space activation that opened capture; prevent a consumed keyup from activating another native button. Use textContent for all labels and errors.

## Multi-source input and transaction

Represent keyboard codes, pointer IDs and the selected gamepad as separate bounded source identities. Update one source's action set atomically, compute aggregate OR for left/right/jump/hit, and derive move as right minus left. Opposing directions cancel. A combined jump/hit false→true creates one pending edge; aliases or a second device pressing an already-held action do not duplicate it. Releasing one source retains other held sources.

Pending edge ownership must distinguish device removal from ordinary release: a quick press/release between sends remains pending, while unplug/disable/selection change discards only gamepad-owned unsent edges. Full lifecycle clearing removes every source and edge. Source-tagged pending sets are one suitable representation; bound source lifetimes and remove obsolete entries after release/commit. Preserve the synchronous peek/send/commit guarantee under failed sends.

```text
keyboard map / logical pointer / standard gamepad
 -> one Input action merger
 -> Input.peek(seq + 1)
 -> worldInput(frame, mirrored(actualSeat))
 -> Network.send(sameFrame)
 -> on success: Input.commit, advance seq, Prediction.accept(sameFrame)
```

No client timestamps, coordinates, seat changes or new messages. Only move is reversed by the existing perspective helper. Short gamepad presses wholly between hardware polls cannot be reconstructed; never invent them.

## Gamepad integration

Read `research/gamepad.md` for verified API contracts and inactive discovery. First-version gameplay targets only `mapping === "standard"`: left stick axis0 and horizontal D-pad buttons14/15 for movement, bottom face button0 for jump, left face button2 for hit/serve. Labels describe physical position with Xbox/PlayStation examples rather than promising vendor-specific mapping.

Default gamepad support enabled, with a local enable checkbox and stable automatic selection of one standard-mapped controller. Choose the lowest available index initially and retain that selection while it is present. On disconnect select the next eligible controller but require a new neutral sample before use. Do not persist transient index/ID or merge multiple gamepads. Manual device selection is outside this first version; show the active controller clearly. Disabling/unplugging discards that source; another controller cannot immediately inherit held buttons.

Use finite bounded axis/button reads and validate required controls. Horizontal thresholds: enter at absolute0.35 or greater, leave at0.20 or less; direction changes cross the appropriate opposite threshold. D-pad is digital; opposite directions cancel. Ignore unused sticks, triggers, menus and vibration. Standard held buttons use pressed/value consistently; malformed or missing required samples clear that contribution and remain unarmed, rather than producing synthetic presses or qualifying as a complete neutral sample.

Gameplay polling occurs immediately before peek in the existing render-independent InputScheduler step, at its existing bounded cadence. No second gameplay sender or RAF dependency. Enumerate status once at startup, on settings open, native gamepadconnected/disconnected and an explicit “检测手柄” button; this supports discovery/retry while the sender is stopped without another loop. Status-only reads never feed gameplay, consume edges or arm the device. The adapter must not repeatedly reset neutral rearm on unchanged statuses. Neutral rearm requires a complete sample of released gameplay buttons/D-pad and centered stick after a full release/settings/blur/hidden/loading/room/reconnect boundary; then a later press is eligible. No rearm while the page is unfocused, hidden or a native interactive control is active.

Treat missing getGamepads, blocked exposure/read exception and nonstandard devices as readable statuses. Serve through the existing public HTTPS entry; feature-detect and catch API access rather than imposing a blanket non-secure-origin rejection unsupported by the current specification. Actual browser access may require pressing a controller button first. Keep keyboard and touch functional; do not guess nonstandard layouts or advertise universal hardware compatibility.

## UI, focus and lifecycle

Retain the existing self-left checkbox and independent settings/action layers. Opening settings still clears all controls/prediction and sends best-effort release without pausing authority. Mapping edits, reset and controller enable changes use the same clear boundary where appropriate. Closing restores Canvas/menu focus and starts eligible sampling with fresh keyboard events and neutral-rearmed controller state.

Touch buttons use logical action data rather than a remappable keyboard code; each pointer owns its hold and cancellation. Keep native keyboard focus and Space behavior. Gamepad input must not control gameplay while focus is interacting with native settings/menu controls. Do not create gamepad menu navigation in this version.

Generate help, own-side hints and serve prompts from the effective keyboard bindings, plus concise gamepad instructions. Do not leave default-only S/arrow/Space prompts after remapping. Preserve actual-seat identity, display mapping and Chinese UI. Panel remains scrollable and Done/menu/leave reachable on desktop,320×568 and812×375. Startup controls stay inert until assetsReady.

## Verification, compatibility and release

Add meaningful preference/capture/merged-source/gamepad/lifecycle tests, retaining existing scheduler rejection, prediction and protocol suites. Code checks/build and isolated HTTP precede authorized browser checks. Use two fresh local guests; never production matchmaking. Synthetic getGamepads fixtures verify integration and behavior, not real firmware/USB/Bluetooth support. Verify physical standard controllers and dual-computer play separately before claiming their acceptance.

No protocol bump or backend configuration is needed. Follow existing atomic release/current/systemd procedures only after approved implementation and quality checks. Verify all unrelated public routes remain untouched. Rollback restores the previous release; an unused local preference key is harmless. No latency/FPS promise or new performance observer.
