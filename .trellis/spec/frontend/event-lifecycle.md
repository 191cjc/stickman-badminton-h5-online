# Event and connection lifecycle

## Page-lifetime controllers

[main.ts](../../../src/client/main.ts) constructs one `Input`, `Network`, and `Renderer` and starts a `requestAnimationFrame` loop. [input.ts](../../../src/client/input.ts) owns native keyboard/pointer listeners. Controllers live for the page; there is currently no general mount/unmount or `dispose()` API. Recreating them for scene transitions would duplicate listeners.

## Logical input and release

Both sides use A/D/W/S or arrows; W/↑ jumps; S/↓/space hits or serves. `Input.read(seq)` produces `InputFrame`, retains jump/hit press edges until sampling, then clears those edges. Touch input uses `data-control`, pointer capture, and pointerup/pointercancel/lostpointercapture release.

Blur, hidden visibility, and pagehide call `release()`. `main.ts` clears prediction history and sends `release`; the server also owns [input timeout and disconnect cleanup](../backend/rooms.md). Do not depend on keyup or pagehide delivery as the only server release mechanism.

Keyboard handlers skip game input on focused button/input elements. Native button Space keyup must retain its browser default while clearing any held game Space state. Preserve Canvas focus after matching and normal keyboard access to action buttons.

## Network lifecycle

[network.ts](../../../src/client/network.ts) fetches the same-origin session with cookies, then opens a `badminton-v3` WS. `connecting` and socket-state guards prevent duplicate connection creation. Automatic retries use a bounded 15-second window; manual retries reset it. Policy close 1008, protocol mismatch, and an initial duplicate active guest stop automatic retry and display a reason.

The client pings every two seconds and clears that interval on close. RTT is transport round-trip time, not input-to-render latency. Server heartbeat and seat retention are separate contracts.

Use `Network.send()` for ready-state and buffered-output checks. It returns false when disconnected or above its output threshold. Currently `Input.read()` consumes edges before send succeeds; guaranteed edge delivery during client-side backpressure is not implemented. Any reliability change here needs its own task and evidence.

## Verification

[Service tests](../../../tests/service.test.ts) cover identity, queue cancel/disconnect, reconnect, and server input timeout. Native focus/pointer behavior and rendered feedback require [manual browser checks](../../../docs/validation.md).

M toggles the shared audio gain and visible mute button; Esc clears input and sends server leave. Reconnect suspends effects, clears transient queues/particles and establishes a cursor baseline before resuming. New rooms and exit revoke old scene Blob URLs, clear effects and stop audio nodes. Controllers remain page-owned rather than duplicated per scene.
