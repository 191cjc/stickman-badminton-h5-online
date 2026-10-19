# Event and connection lifecycle

## Page-lifetime controllers

[main.ts](../../../src/client/main.ts) constructs one `Input`, `Network`, and `Renderer` and starts a `requestAnimationFrame` loop for presentation. A single page-owned [InputScheduler](../../../src/client/input-scheduler.ts) separately paces logical input at60Hz. [input.ts](../../../src/client/input.ts) owns native keyboard/pointer listeners. Controllers live for the page; there is currently no general mount/unmount or `dispose()` API. Recreating them for scene transitions would duplicate listeners.

## Logical input and release

Both sides default to A/D/W/S or arrows; W/↑ jumps; S/↓/space hits or serves. Keyboard bindings are browser-local and configurable; effective help must follow them. `Input.peek(seq)` produces an `InputFrame` without consuming jump/hit edges. Only after `Network.send(frame)` returns true does main synchronously call `Input.commit(frame)`, advance seq and register the accepted prediction command. A rejected send retains edges and sequence. `read(seq)` remains a convenience peek+commit helper; online sending must use the transactional pair. Touch input uses logical-action `data-control`, independent pointer-ID ownership/capture, and pointerup/pointercancel/lostpointercapture release. Keyboard, pointer and gamepad contributions merge under the [controls/device contract](controls-and-devices.md).

Blur, hidden visibility, and pagehide call `release()`. `main.ts` clears prediction history and sends `release`; the server also owns [input timeout and disconnect cleanup](../backend/rooms.md). Do not depend on keyup or pagehide delivery as the only server release mechanism.

Keyboard handlers skip game input on focused button/input elements. Native button Space keyup must retain its browser default while clearing any held game Space state. Preserve Canvas focus after matching and normal keyboard access to action buttons.

Input's optional `enabled: () => boolean` callback gates new keyboard/pointer presses during loading and settings. Keyup/pointer cancellation still release. Ignore keyboard repeat events: held controls are already tracked, and repeat after release must not recreate a stale move/hit edge. Settings Escape is intercepted in document capture before the gameplay leave shortcut; native checkbox Space remains a settings action. See the [perspective lifecycle](state-management.md#optional-self-left-perspective).

## Network lifecycle

[network.ts](../../../src/client/network.ts) fetches the same-origin session with cookies, then opens a `badminton-v4` WS. `connecting` and socket-state guards prevent duplicate connection creation. Automatic retries use a bounded 15-second window; manual retries reset it. Policy close 1008, protocol mismatch, and an initial duplicate active guest stop automatic retry and display a reason.

The client pings every two seconds and clears that interval on close. RTT is transport round-trip time, not input-to-render latency. Server heartbeat and seat retention are separate contracts.

Use `Network.send()` for ready-state and buffered-output checks. It returns false when disconnected or above its output threshold. It also catches socket.send exceptions and reports false. This means accepted by the local socket, not server acknowledgement; ack/replay and server input validation remain separate. Do not commit edges or advance sequence or accept a prediction command on false.

## Verification

[Service tests](../../../tests/service.test.ts) cover identity, queue cancel/disconnect, reconnect, and server input timeout. Native focus/pointer behavior and rendered feedback require [manual browser checks](../../../docs/validation.md).

M toggles the shared audio gain and visible mute button; Esc clears input and sends server leave. Reconnect suspends effects, clears transient queues/particles and establishes a cursor baseline before resuming. New rooms and exit revoke old scene Blob URLs, clear effects and stop audio nodes. Controllers remain page-owned rather than duplicated per scene.

## Paced input contract

### 1. Scope / Trigger

Input, Network, main and shared prediction cross a transactional send boundary. Rendering cannot own the input cadence.

### 2. Signatures

`InputScheduler(step: () => void, now?: () => number)`, `setActive(active: boolean): void`, `request(): void`, `diagnostics()`. `Input.peek(seq: number): InputFrame`, `commit(frame: InputFrame): void`; `Network.send(message: ClientMessage): boolean`.

### 3. Contracts

One timer owns both normal60Hz deadlines and expedited logical-change requests. Input notifies only after held/edge state truly changes; key repeats or unrelated keys do not request. `request()` advances the deadline, coalesces changes, and respects a global minimum1000/120ms between attempts, including stop/start. An expedited send retimes the normal deadline; no second periodic timer or stale burst remains. Late normal callbacks skip expired periods; callbacks never emit more than one frame. Round timer waits upward and reschedule early fires. Even rejected sends count as attempts for spacing, while preserving edge/seq.

Run only with loaded assets, connected online scene, latest status playing, visible document and active focus. Blur/hidden/pagehide, close, leave, result and room transitions stop/reset and release. Focus/visible restoration and online snapshots restart from a fresh deadline. Main-thread blockage still blocks timers. Prediction advances elapsed time separately on RAF/accepted input/snapshot callbacks; more packets never speed physics. Protocol4 metadata does not add client coordinates/timestamps.


The minimum spacing is between attempt **starts**, including rejected sends. Count synchronous `step()` time toward it. After normal work, pick the first future periodic grid and retime a too-near grid to `attemptStart + 1000/120`; do not discard another whole period merely because completion is near it. Expedited work resumes from `max(attemptStart + 1000/60, completion)`. Keep one timer, ceil-rounded waits and no catch-up burst. Callback-cost tests (8/9/12ms), late grids, early wakeups and expedited work assert actual attempt times and minimum spacing, not only counters.

### 4. Validation & Error Matrix

| Condition | Expected |
| --- | --- |
| Disconnected, buffered over64KiB, send exception | false; preserve pending edges, seq and prediction history |
| Successful synchronous send | commit once, consecutive seq, register command once; fixed-time prediction when gameplay phase playing |
| Timer fires early | Reschedule without input |
| Long callback gap | One input, skip past deadlines, no accelerated gameplay |
| Release/stop during callback | No timer resurrection |
| Blur/hidden/room result | Release keys, clear prediction history, stop sampling |

### 5. Good / Base / Bad Cases

Good: rejected jump+hit later appears once in an accepted frame. Base: held movement produces60Hz samples despite30Hz RAF. Bad: RAF accumulator sends a burst after a400ms stall or commits edges before a throwing send.

### 6. Tests Required

Scheduler tests cover15/30/60/144Hz draw cadences, early/late callbacks, long stalls, stop/restart and callback release. Input/network tests invoke actual Network.send rejection modes, assert unchanged seq/history and retained edges, then one accepted edge and consecutive next seq. Exercise expedited+periodic coalescing, rapid changes bounded120Hz, no-op repeats and inactive requests. Browser verifies blur sends release and stops new input until focus, plus retained-Cookie reconnect.

### 7. Wrong vs Correct

Wrong: `const frame = input.read(++seq); network.send(frame); prediction.accept(frame, performance.now());`

Correct: `const frame = input.peek(seq + 1); if (network.send(frame)) { input.commit(frame); seq++; prediction.accept(frame, performance.now()); }` (prediction only in playing phase).
