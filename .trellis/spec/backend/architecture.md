# Backend architecture

## Factory and entry point

[createGameService](../../../src/server/service.ts) constructs an HTTP server, noServer WS server, guest/room maps, matching queue, rate buckets, simulation interval, and collector. It returns `http`, `stats()`, and asynchronous `close()`. Keep testable service construction separate from [index.ts](../../../src/server/index.ts), which reads environment, listens, logs, and handles SIGTERM/SIGINT.

Current storage is entirely in memory. Server restart clears rooms and queue; valid signed Cookie identity can be registered again through the session endpoint. Do not add persistence, Redis, account flows, or another service as an incidental implementation choice.

Production requires COOKIE_SECRET of at least 32 characters; development creates an ephemeral secret. ALLOWED_ORIGINS, PORT, NODE_ENV, production Cookie security, and trusted proxy IP behavior are owned by the runtime entry. The listening address is always 127.0.0.1; Nginx exposes only the independent routes.

## Time and scheduling

`performance.now()` drives the simulation accumulator; Date.now() drives wall-clock expiry/rate limits. The ticker runs every 8 ms, accumulates at most 100 ms from a callback gap, and processes at most 6 fixed steps per callback. Do not simulate a larger duration per gameplay step to catch up.

Room ticks advance only while playing. Paused/finished rooms can still send snapshots on the global broadcast cadence. Collector logic runs every 100 ms and owns expiry, idle session cleanup, and further matching. See [room rules](rooms.md) for the per-step contract.

## Logging and lifecycle

The entry writes JSON events with an ISO timestamp. Room IDs, result reason, side, and reclamation events are useful fields. The implementation does not log guest Cookie tokens or COOKIE_SECRET; preserve that boundary.

`close()` clears service intervals, terminates WS connections, closes the WS server, and closes HTTP. Each socket close handler clears its own heartbeat. Tests call this cleanup after each case; new timers/resources must be included in the owning lifecycle.

## Testing

[service.test.ts](../../../tests/service.test.ts) listens on port 0 at 127.0.0.1, uses independent HTTP Cookies and actual ws clients, and overrides reconnect/result/input timeout durations through ServiceOptions. Follow this pattern for identity and lifecycle changes instead of mocking out the behavior being verified.

Use `npm run typecheck`, `npm run lint`, and relevant tests. Gameplay tests may take roughly a real match duration; do not replace them with an assertion that bypasses scoring.

For packet-coalescing assertions, a sender loop is not an atomic network batch: WS frames can arrive across an8ms authority callback. The service imports performance from node:perf_hooks; faking global.performance alone does not control its clock. The burst fixture freezes Date/setInterval/clearInterval, explicitly spies imported performance.now to the fake Date elapsed time, and captures the original bound performance.now first for real Peer.wait polling. Real HTTP/WS and setTimeout remain live. Send all inputs then an ordered ping; pong is the receipt barrier. Only then advance service time (two40ms advances yield tick2 then tick4); snapshots broadcast on even room ticks. Assert exact tick/ack and retained movement/jump/action/latch behavior. Never relax position tolerance to conceal the race or accelerate simulation according to packet count. Close the ephemeral service before restoring the imported clock spy and timers; no runtime API or production timing change is needed.
