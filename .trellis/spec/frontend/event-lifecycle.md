# Event and connection lifecycle

## Page-lifetime controllers

[main.ts](../../../src/client/main.ts) constructs one `Input`, `Network`, and `Renderer` and starts a `requestAnimationFrame` loop for presentation. A single page-owned [InputScheduler](../../../src/client/input-scheduler.ts) separately paces logical input at60Hz. [input.ts](../../../src/client/input.ts) owns native keyboard/pointer listeners. Controllers live for the page; there is currently no general mount/unmount or `dispose()` API. Recreating them for scene transitions would duplicate listeners.

## Logical input and release

Both sides use A/D/W/S or arrows; W/↑ jumps; S/↓/space hits or serves. `Input.peek(seq)` produces an `InputFrame` without consuming jump/hit edges. Only after `Network.send(frame)` returns true does main synchronously call `Input.commit(frame)`, advance seq and remember a prediction step. A rejected send retains edges and sequence. `read(seq)` remains a convenience peek+commit helper; online sending must use the transactional pair. Touch input uses `data-control`, pointer capture, and pointerup/pointercancel/lostpointercapture release.

Blur, hidden visibility, and pagehide call `release()`. `main.ts` clears prediction history and sends `release`; the server also owns [input timeout and disconnect cleanup](../backend/rooms.md). Do not depend on keyup or pagehide delivery as the only server release mechanism.

Keyboard handlers skip game input on focused button/input elements. Native button Space keyup must retain its browser default while clearing any held game Space state. Preserve Canvas focus after matching and normal keyboard access to action buttons.

## Network lifecycle

[network.ts](../../../src/client/network.ts) fetches the same-origin session with cookies, then opens a `badminton-v3` WS. `connecting` and socket-state guards prevent duplicate connection creation. Automatic retries use a bounded 15-second window; manual retries reset it. Policy close 1008, protocol mismatch, and an initial duplicate active guest stop automatic retry and display a reason.

The client pings every two seconds and clears that interval on close. RTT is transport round-trip time, not input-to-render latency. Server heartbeat and seat retention are separate contracts.

Use `Network.send()` for ready-state and buffered-output checks. It returns false when disconnected or above its output threshold. It also catches socket.send exceptions and reports false. This means accepted by the local socket, not server acknowledgement; ack/replay and server input validation remain separate. Do not commit edges or advance sequence/prediction on false.

## Verification

[Service tests](../../../tests/service.test.ts) cover identity, queue cancel/disconnect, reconnect, and server input timeout. Native focus/pointer behavior and rendered feedback require [manual browser checks](../../../docs/validation.md).

M toggles the shared audio gain and visible mute button; Esc clears input and sends server leave. Reconnect suspends effects, clears transient queues/particles and establishes a cursor baseline before resuming. New rooms and exit revoke old scene Blob URLs, clear effects and stop audio nodes. Controllers remain page-owned rather than duplicated per scene.

## Paced input contract

### 1. Scope / Trigger

Input, Network, main and shared prediction cross a transactional send boundary. Rendering cannot own the input cadence.

### 2. Signatures

`InputScheduler(step: () => void, now?: () => number)`, `setActive(active: boolean): void`, `diagnostics()`. `Input.peek(seq: number): InputFrame`, `commit(frame: InputFrame): void`; `Network.send(message: ClientMessage): boolean`.

### 3. Contracts

One timer callback samples at most one new input; deadlines follow1000/INPUT_HZ. Timer delays round upward, avoiding deliberately early callbacks. Late callbacks skip whole missed periods on the original deadline grid, never burst accumulated input; if the next grid is less than one quarter-period (~4.17ms) away after the callback, skip one more period to avoid near-adjacent samples. `skipped` counts every bypassed grid, including work duration and the quarter-period guard. Run only with loaded assets, connected online scene, latest status playing, visible document and active focus. Blur/hidden/pagehide, close, leave, result and room transitions stop/reset and release. Focus/visible restoration and online snapshots restart from a fresh deadline. Main-thread blockage still blocks timers; this is not a worker. No wire/protocol/env change.

### 4. Validation & Error Matrix

| Condition | Expected |
| --- | --- |
| Disconnected, buffered over64KiB, send exception | false; preserve pending edges, seq and prediction history |
| Successful synchronous send | commit once, consecutive seq, one1/60 prediction step when gameplay phase playing |
| Timer fires early | Reschedule without input |
| Long callback gap | One input, skip past deadlines, no accelerated gameplay |
| Release/stop during callback | No timer resurrection |
| Blur/hidden/room result | Release keys, clear prediction history, stop sampling |

### 5. Good / Base / Bad Cases

Good: rejected jump+hit later appears once in an accepted frame. Base: held movement produces60Hz samples despite30Hz RAF. Bad: RAF accumulator sends a burst after a400ms stall or commits edges before a throwing send.

### 6. Tests Required

Scheduler tests cover15/30/60/144Hz draw cadences, early/late callbacks, long stalls, stop/restart and callback release. Input/network tests invoke actual Network.send rejection modes, assert unchanged seq/history and retained edges, then one accepted edge and consecutive next seq. Browser verifies blur sends release and stops new input until focus, plus retained-Cookie reconnect.

### 7. Wrong vs Correct

Wrong: `const frame = input.read(++seq); network.send(frame); prediction.apply(frame);`

Correct: `const frame = input.peek(seq + 1); if (network.send(frame)) { input.commit(frame); seq++; prediction.apply(frame); }` (prediction only in playing phase).
