# Research: Gamepad API integration with paced logical input

- Query: Minimal gamepad support preserving render-independent input pacing, transactional edges, source merging and safe lifecycle behavior.
- Scope: mixed — current client/spec inspection and official MDN/W3C references; planning only.
- Date: 2026-10-19

## Findings

### Existing owners and code patterns

| File | Relevant responsibility |
| --- | --- |
| `src/client/input.ts:4` | Fixed keyboard aliases; currently touch also routes physical key names through these aliases. |
| `src/client/input.ts:79` | Aggregate action false→true creates jump/hit edges; aliases do not duplicate an edge. |
| `src/client/input.ts:101` | Full release clears held controls and pending edges. |
| `src/client/input.ts:112` | `peek`/successful-send `commit` is the edge transaction boundary. |
| `src/client/input-scheduler.ts:7` | One page-owned timer, normal60Hz and expedited changes bounded120Hz, skipping missed deadlines. |
| `src/client/main.ts:152` | Shared clear stops scheduler, releases Input, clears prediction and optionally sends release. |
| `src/client/main.ts:161` | Settings open/close uses that clear path; opening gates controls and keeps server match running. |
| `src/client/main.ts:190` | Exactly one Input instance; new logical state requests the existing scheduler. |
| `src/client/main.ts:234` | Only gameplay send owner: gate, peek, screen→world mapping, send, commit, sequence advance, prediction. |
| `src/client/main.ts:248` | Gameplay sampling requires assets, online/playing state, connected socket, visibility, focus and closed settings. |
| `src/client/main.ts:274` | Idle and subsequent queued/matched/snapshot/result branches already clear at room/lifecycle boundaries. |
| `src/client/perspective.ts:34` | `worldInput` flips only move for actual-right mirrored view; use this final mapping for every input source. |
| `index.html:77` | Existing independent settings panel; its native controls and Done button must remain keyboard accessible. |
| `tests/input.test.ts` | EventTarget-based tests cover aliases, releases, focus/default behavior and pending-edge retention. |
| `tests/network.test.ts` | Actual Network.send failure modes and scheduler transactions are already tested. |

Read `.trellis/workflow.md`, the task PRD and relevant frontend/shared specs before forming these recommendations. Also read `research/keyboard-and-settings.md` to align source merging and keyboard/capture behavior.

### Official API facts

References accessed successfully on 2026-10-19:

1. MDN, [Using the Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API): native connection/disconnection events; gamepads already connected before page load may only become exposed after a button/axis interaction while the page is focused. Firefox's visible-page interaction requirement is documented. Fetch current state using `navigator.getGamepads()`; do not treat the event's Gamepad object as a permanently current state store. Index identifies a current slot, not permanent hardware identity.
2. MDN, [Navigator.getGamepads](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads): returns an array with Gamepad/null entries; holes preserve other devices' indices. Permissions Policy can cause `SecurityError`. Empty results can mean no exposed devices, not definitive absence of connected hardware.
3. MDN, [Gamepad.mapping](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/mapping): `standard` identifies the known ordinary gamepad layout; `xr-standard` is a different layout. The current mapping page acknowledges both; older guide prose claiming only one layout is incomplete.
4. W3C, [Gamepad Working Draft, 10 July 2025](https://www.w3.org/TR/2025/WD-gamepad-20250710/), reached through [latest published TR](https://www.w3.org/TR/gamepad/): sections4,12,14 and16–20 define slot reuse, snapshots/gesture exposure, canonical standard indices, connection events and Permissions Policy. It is a Working Draft, not a final Recommendation.
5. Official MDN [browser compatibility data for Navigator.getGamepads](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json): current data lists broad browser availability; this does not prove any particular controller/driver/connection works.

Canonical standard-layout positions relevant to this game:

| API value | Physical position | Proposed game action (product choice) |
| --- | --- | --- |
| `axes[0]`, negative/positive | Left-stick horizontal, left/right | Move left/right |
| `buttons[14]` / `[15]` | D-pad left/right | Move left/right |
| `buttons[0]` | Bottom button of right face cluster | Jump |
| `buttons[2]` | Left button of right face cluster | Hit/serve |

On common standard Xbox layouts these face buttons are A/X; on standard PlayStation layouts they are Cross/Square. UI must describe positions as well as examples: labels vary by manufacturer. D-pad up/down, other face buttons, sticks, triggers, haptics and gamepad menu navigation are outside the proposed minimum.

Security/context accuracy: the current fetched MDN pages and published W3C IDL do not establish a universal `[SecureContext]` requirement for this API. Do not infer from HTTPS best practice that every insecure origin must be rejected by product code. The public target already uses HTTPS; feature-detect the callable API and catch failures on the actual browser. Browser/OS security behavior remains device acceptance scope. Permissions Policy denial is explicitly documented. Do not prompt for an invented browser permission: a physical controller interaction may be necessary for exposure, and this is distinct from ordinary page-click user activation.

### Proposed minimum integration (not yet user-approved scope)

**Ownership and poll timing.** Add a focused client-only gamepad adapter/state owner plus bounded logical source state in Input. Keep one page-lifetime instance. In the existing `InputScheduler` step, after `canSampleInput()` passes and immediately before `peek`, safely fetch current gamepads, resolve selection, decode the selected pad and apply its source state. Then run the existing single peek→worldInput→send→commit/seq/prediction transaction. No protocol/server/simulation changes; no positions, timestamps or device IDs on the wire. Sampling the gamepad must not consume edges. Do not add an independent gameplay poll/send interval or send from RAF. `Input.onChange` during the scheduler callback can remain harmless because `request()` already ignores its running callback.

The periodic step samples gamepads at normal60Hz; keyboard changes may already expedite the same timer to120Hz. This is render-independent scheduling, not a claim that the browser/hardware internally refreshes gamepad state at60Hz. The browser can expose state on its own cadence. A tap occurring entirely between two browser samples can be missed; no native button-down event exists to recover it.

**While settings/menu/blur stop the scheduler.** No gameplay polling occurs. Obtain device/status snapshots only once at page initialization, on settings open, on native `gamepadconnected`/`gamepaddisconnected`, and from an accessible “检测手柄” button in settings. This provides explicit recovery after missed exposure/events or earlier API errors without creating a new loop. Connection events should invalidate a removed selected source immediately and trigger a one-shot fresh status enumeration; do not trust an indefinitely retained event object. Inactive enumeration updates availability/selection only; it never arms the gamepad or copies held gameplay actions into Input. Settings closing, focus restore, reconnection and new match restart the existing scheduler normally; the first active samples perform neutral rearm. If a user keeps a stick/button held while closing settings, it stays ignored until released and subsequently pressed again. Merely seeing neutral during inactive status inspection does not arm later gameplay.

**Selection.** Simplest MVP: automatically choose the lowest-index currently exposed connected standard-mapped pad; retain it while connected even if another lower-index pad later appears. Show the active device with `textContent` and a short fixed label, not HTML. If it disappears, clear only its source, choose the next eligible standard pad and require neutral before actions. Do not merge multiple pads, persist device IDs/indices, or add a selector unless specifically requested. A disconnect/reconnect or index reuse is a new activation even if index/ID appears identical. Describe this policy visibly as using the first recognized standard controller. A non-standard pad never blocks a standard pad elsewhere in the array.

**Dead zone and hysteresis.** Reasonable initial values: horizontal engagement at `abs(x)>=0.35`, release/rearm at `abs(x)<=0.20`; these are proposed product constants, not API requirements or latency guarantees. Retain an engaged direction until its release threshold; allow direct opposite engagement when the opposite threshold is crossed. Treat non-finite/missing axes as neutral; do not propagate analog values into the -1/0/1 wire field. Read digital `GamepadButton.pressed` safely, treating absent entries as unpressed. Within a pad, stick and D-pad left/right are independent action contributors: opposite intent cancels, as it does across sources. A one-dimensional dead zone is enough because only horizontal movement is used.

**Neutral rearm.** Full lifecycle release resets selected pad to unarmed and clears its last accepted state and edges. First active observation must see all mapped digital controls unpressed and the horizontal axis inside the release dead zone. That observation arms the pad and contributes no input; subsequent fresh actions can contribute. Rearm on page blur/hidden/pagehide, settings open/close, controls/view change, room/queue/result boundary, own/opponent reconnect pause/resume, selection replacement and API failure. Repeated paused snapshots must not accidentally arm. Release is not dependent on a browser keyup or future poll.

**UI focus.** While settings/capture is active no gameplay pad state is accepted. Prefer also suppressing pad gameplay when a native form/button/editable control has focus, matching the keyboard's native-control guard: clear only pad contribution and require neutral after Canvas/body gameplay focus returns. Inspect active focus inside the existing gameplay sample; a focusin listener can request the already-owned scheduler if needed. Do not map pad buttons to DOM click, mute, exit, matching or closing settings in this first version. Opening a menu must never serve/hit; native keyboard Space/Tab/Escape behavior stays intact.

**Multi-source merging and pending edges.** Keep keyboard codes, pointer IDs and selected pad as independent bounded action sources. OR each action across sources; move is `rightAny-leftAny`; aggregate false→true alone raises jump/hit. Releasing one source cannot remove another source's hold or manufacture a new edge. Full release discards every pending edge; successful commit consumes only sent edges; rejected send preserves pending edges and seq. For a device-only detach, drop the pad's held contribution and its unsent pending edge ownership while retaining unrelated keyboard/touch state and unrelated pending edges. Pending-source provenance can be a bounded owner token per action rather than an unbounded journal. A source-only clear is not `Input.release()`: the latter invokes page-wide focus/release/prediction behavior and would unnecessarily interrupt keyboard/touch play. Do not detach by synthesizing a fresh press from the surviving hold. If the implementation instead deliberately retains an already-released pad tap as a pending edge, make that choice explicit and test it; silently leaking a buffered hit through an unplug is undesirable for this requirement.

**Availability/status.** Guard both access to `navigator.getGamepads` and the call in try/catch with correct `navigator` receiver. Missing method → “当前浏览器不支持手柄”; SecurityError/other read failure → “暂时无法读取手柄，请检查浏览器设置后重试”; exposed non-standard-only devices → “该手柄尚不支持，请使用标准手柄或键盘”; empty exposure → “未检测到手柄，请连接后在本页按一下手柄按钮”; selected but unarmed → “手柄已连接，请松开摇杆和按键”; armed → “手柄可用”. Failure/detach immediately removes pad contribution without disabling keyboard/touch or crashing match/startup. Update DOM only when status/selection changes. A native refresh button allows recovery; do not permanently poison availability from one throwing call.

### Meaningful validation

- Pure adapter tests: `standard` mapping indices; no assumptions for empty/`xr-standard`; sparse/null array slots; empty/short button/axis data; finite axis sanitization; receiver-bound getGamepads; method/property access missing or throwing; status recovery after error.
- Selection tests: first lowest eligible, stable active despite later arrivals, multiple same-ID pads, ignored nonstandard preceding standard, disappearance/reused index, replacement starts unarmed. Connection-event enumeration must not arm gameplay.
- Hysteresis trace tests: enter/hold/release around both thresholds, direct reversal, near-center noise, opposite D-pad and stick cancellation; neutral observation followed by fresh mapped press.
- Actual Input merger tests: keyboard/pointer/gamepad overlap, opposite directions, no duplicate edge from aliases/second source, source-only detach preserving other holds/pending edges, no edge resurrection after release/rearm, pointer cancellation after keyboard remap.
- Existing Network.send rejection integration: gamepad edge sampled, send rejects because unavailable/buffered/exception, later accepted once with same seq and prediction command; mirror only move before identical send/prediction frame.
- Scheduler fake-time tests: gamepad updates and normal sends continue with15/30Hz or absent RAF, no additional timer, bounded120Hz expedited keyboard changes, one attempt after long stall, stop/start minimum spacing, no poll while inactive. Tests must exercise the real scheduler callback path, not a copied algorithm.
- Lifecycle/UI integration: active held pad→open settings/blur/hidden/disconnect/opponent reconnect/result/rematch→fresh sampling stays neutral until mapped controls neutral then fresh press. Native settings controls and key capture stay responsive; stale held pad does not close panel or send hit. Connected status list and refresh remain reachable while scheduler stopped.
- After code checks/build/isolated HTTP, authorized isolated Chromium may use synthetic `getGamepads` and native connection events to verify wiring, focus, panel reachability, mirrored direction, actual WS intent and same-tick authority agreement. Compact320×568 and812×375 need all settings actions reachable.

### Related specs

- `.trellis/spec/frontend/event-lifecycle.md`: one page-lifetime controller, release ownership, native focus,60Hz/120Hz paced transaction.
- `.trellis/spec/frontend/state-management.md`: authoritative state, screen perspective mapping once before send, prediction using same accepted frame.
- `.trellis/spec/frontend/type-safety.md`: shared InputFrame contract; no unchecked widening of device data into transport.
- `.trellis/spec/frontend/quality-guidelines.md`: meaningful checks, code/build/HTTP before browser, actual hardware/manual acceptance recorded separately.
- `.trellis/spec/shared/protocol.md`: protocol4 unchanged, logical-only input, authoritative collisions/shuttle/score.

## Caveats / Not Found

- No physical controller is available in this planning research. Browser-recognized standard mapping depends on controller model, driver, USB/Bluetooth mode, OS and browser. Synthetic mocks cannot prove discovery, hardware button positions, Bluetooth stability, real touch or end-to-end latency.
- Native Gamepad API behavior can follow the browser's refresh cadence even when application polling uses the independent60Hz scheduler; measure on target hardware rather than promise render-independent hardware updates.
- Published W3C document is a Working Draft and current MDN overview prose contains simplifications. Use the normative standard table for indices and current per-member documentation; do not claim all browser versions behave identically.
- Current server release timeout750ms is a fallback, not permission to leave local held state until timeout. Source detachment must affect the next paced frame and lifecycle releases should use existing best-effort release immediately.
- No automatic browser tests, service changes, dependency install, deployment, Git operation or product-code changes were performed by this research.
