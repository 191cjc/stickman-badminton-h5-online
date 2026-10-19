# Keyboard settings and input integration evidence

Inspected 2026-10-19. Planning evidence only; product code unchanged.

## Current owners and constraints

- `src/client/input.ts:4` defines nine fixed physical bindings for four actions. `Input` stores physical codes, creates a logical jump/hit edge only when the combined action rises, and exposes transactional peek/commit (`:112`). Preserve alias behavior and failed-send retention.
- `src/client/input.ts:65` passes touch `data-control` codes into that same keyboard map. Keyboard remapping would change touch meanings unless pointer sources use logical actions directly. Track pointer IDs independently so releasing one pointer cannot cancel another device's hold.
- `src/client/input.ts:26` skips focused native controls, gates repeats, preserves native Space, and reserves M/Escape. Expand the interactive-target guard to editable ancestors for new capture UI where appropriate; do not swallow unrelated browser shortcuts.
- `src/client/main.ts:152` is the shared clear path; `:161` opens settings by releasing, stopping sends and clearing prediction. The panel does not pause the server. `:234` owns the only send clock and successful-send transaction, mapping the frame with `worldInput` before both send and prediction.
- `src/client/main.ts:274`, `:323` and subsequent message branches clear controls on idle/queue/match/result and reconnect paths. Device state must enter the same lifecycle, rather than recreating Input on every scene transition.
- `src/client/main.ts:304`/`:478` and `index.html:101` hardcode hints. These must reflect effective user bindings and gamepad instructions, with one shared formatter and no obsolete default-only serve prompt.
- `index.html:77` and `src/client/style.css:542` provide an independent scrollable panel. Retain native checkbox Space, Escape behavior, `hidden`/`inert`, startup gate, and reachable Done/action buttons at 320×568 and 812×375.
- `src/client/perspective.ts` already catches storage getter/read/write exceptions. Reuse that boundary pattern with a separate versioned controls key; do not mingle identity with preferences or transmit settings to the server.
- `tests/input.test.ts` uses EventTarget-based native event stubs. It already verifies aliases, repeated-event prevention, source release, rejection-retained edges and pointer cancellation. Expand these behavioral cases rather than testing only assignments.

## Proposed keyboard UX for final review

- Four action rows show the current keys. Each action supports up to three keys, with accessible remove/add controls; keep all existing bindings as the initial defaults. An action may be temporarily unassigned and is labeled “未设置”.
- Adding captures the next fresh unmodified physical `KeyboardEvent.code`, with a readable Chinese label. Preserve the full map on a rejected capture. Reject a key already assigned to another action; an existing alias on the same action is a no-op. Expose a clear conflict message.
- Reserve M for mute and Escape for panel/capture cancellation; reserve Tab/modifier/browser-navigation keys and modified Ctrl/Alt/Meta shortcuts. Use an explicit supported gameplay-code set for capture and persisted-data validation, rather than accepting arbitrary strings. Letters, digits, arrows, Space, Enter and common punctuation/numpad gameplay keys are sufficient for the first version.
- Escape first cancels active capture; a subsequent Escape closes settings. Tab cancels capture and retains normal navigation. Clicking another setting, panel close, blur, visibility loss or pagehide cancels capture. An activation key used to enter capture must not bind itself or trigger a second native action on keyup.
- Reset restores all existing aliases; changes take effect locally while the panel remains open, release prior input, update every instruction, and persist best-effort. No cloud/cross-tab synchronization.

## Proposed input merger

Maintain bounded held-action state separately per keyboard code, pointer ID and selected gamepad. Combined action is OR across active sources; move is right minus left, so opposing directions cancel. Emit jump/hit edges only on the combined false→true transition. A release of one source does not cancel another source or manufacture an edge. Full lifecycle release discards all pending edges; successful-send commit consumes only the sent pending edges. An unplug removes only gamepad-owned held state. Common pause/release boundaries also tell gamepad sampling to require a neutral observation before accepting a held controller again.

## Validation targets

Capture actual DOM keyboard events in isolated authorized browser scenarios; check remapping, conflict/rejection, repeat/default scrolling, native Space/Escape/Tab, persistence/blocked or invalid storage, pointer actions after remap, mirrored seats, lifecycle and compact layout. Unit tests cover malformed bounded storage payloads, source merging and real Network.send rejection/acceptance. These checks do not prove physical controller firmware, real mobile touch, non-US keyboard labeling or cross-computer latency.
