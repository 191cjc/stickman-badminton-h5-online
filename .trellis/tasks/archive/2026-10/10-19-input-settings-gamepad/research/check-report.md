# Independent controls/gamepad review

Reviewed 2026-10-19 after implementer final handoff. Loaded the complete saved native hook output, all 13 check-manifest entries, task PRD/design/implementation plan and the Trellis check skill. Reviewed every task product/test/README change and new frontend controls/device spec against actual event, lifecycle and send paths. No product code was changed by this reviewer.

## Findings (fixed)

None. No mechanical or local defect requiring a fix was found.

## Findings (not fixed)

No unresolved source/spec violation found in this review. Native browser acceptance remains a required primary-session gate, not an asserted pass here. Physical USB/Bluetooth device discovery, vendor/OS/browser mapping, real mobile touch and real dual-computer feel remain external acceptance as the PRD specifies; synthetic samples cannot establish them.

## Reviewed behavior and boundaries

- Preference parsing enforces exact version/fields, four bounded supported-code arrays, no duplicate/cross-action key, a boolean gamepad flag and a 4096-character input limit. Defaults are detached, and storage getter/read/write failures are caught. The self-left storage key remains independent.
- Capture precedes the panel Escape handler; fresh physical presses, Enter/Space activation cleanup, consumed keyup/repeats, first Escape cancellation, native Tab, modifier/composition exclusion and focus/panel/loss cancellation follow the plan. Binding changes update current help and serve text, with empty actions supported.
- Keyboard-code, logical pointer-ID and one pad source merge by aggregate action OR. Opposing move cancels; aliases/overlap do not repeat rising edges. Pending provenance is bounded by three source kinds. Ordinary taps survive until an accepted send, while pad-only clearing removes its held contribution and unsent edge ownership without deleting keyboard/pointer state.
- The standard adapter reads the current API with the correct receiver and guarded getter/call, handles missing/throwing/nonstandard/incomplete data, retains an eligible selected slot, starts replacements unarmed and implements 0.35/0.20 hysteresis plus complete active-neutral rearm. Inactive discovery does not arm or create gameplay actions. Status updates are deduplicated.
- The existing InputScheduler remains the sole gameplay clock. Main polls immediately before peek, maps screen direction once, and passes the same accepted frame to commit/sequence/prediction. No gamepad/capture/preference module adds a timer, RAF owner, socket send, server identity or protocol field.
- Main's shared release/reset paths cover startup reveal, settings/changes, native interactive focus, blur/hidden/pagehide, disconnect and paused/resumed rooms, results and rematch. Touch-button pointerdown restores Canvas focus without using remappable keyboard codes.
- HTML IDs/types and Chinese descriptions match controller lookups. The panel retains hidden/inert startup behavior, scrollability and independent action placement. Exact compact reachability and native default actions require the scheduled browser gate.
- Git diff confirms no task changes to server/shared/protocol/simulation, original assets/reference/upstream, dependencies, operations/scripts or Vite configuration. Renderer, Prediction and input cadence implementation remain unchanged.
- New controls/device spec and its frontend index/directory/event-lifecycle links agree with the reviewed implementation. No further spec contract change was necessary.

## Verification run by reviewer

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npx vitest run tests/controls.test.ts tests/input.test.ts tests/keyboard-capture.test.ts tests/gamepad.test.ts tests/network.test.ts tests/input-scheduler.test.ts`: pass, **100 tests / 6 files**.
- `git diff --check`: pass.
- Protected source/config diff against HEAD: empty.
- Search of the three new controls/device modules for timers, RAF or network sending: no matches.

Primary owns the full suite/build, isolated HTTP/browser matrix, validation documentation, release/Git and wrap-up. Source write stability was signaled before those gates; no full-suite/build or browser success is claimed by this report.
