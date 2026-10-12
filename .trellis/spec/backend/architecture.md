# Backend architecture

## Factory and entry point

[createGameService](../../../src/server/service.ts) constructs an HTTP server, noServer WS server, guest/room maps, matching queue, rate buckets, simulation interval, and collector. It returns `http`, `stats()`, and asynchronous `close()`. Keep testable service construction separate from [index.ts](../../../src/server/index.ts), which reads environment, listens, logs, and handles SIGTERM/SIGINT.

Current storage is entirely in memory. Server restart clears rooms and queue; valid signed Cookie identity can be registered again through the session endpoint. Do not add persistence, Redis, account flows, or another service as an incidental implementation choice.

Production requires COOKIE_SECRET of at least 32 characters; development creates an ephemeral secret. ALLOWED_ORIGINS, PORT, NODE_ENV, production Cookie security, and trusted proxy IP behavior are owned by the runtime entry. The listening address is always 127.0.0.1; Nginx exposes only the independent routes.

## Time and scheduling

`performance.now()` drives the simulation accumulator; Date.now() drives wall-clock expiry/rate limits. The ticker runs every 4 ms, accumulates at most 100 ms from a callback gap, and processes at most 12 fixed steps per callback. Do not simulate a larger duration per gameplay step to catch up.

Room ticks advance only while playing. Paused/finished rooms can still send snapshots on the global broadcast cadence. Collector logic runs every 100 ms and owns expiry, idle session cleanup, and further matching. See [room rules](rooms.md) for the per-step contract.

## Logging and lifecycle

The entry writes JSON events with an ISO timestamp. Room IDs, result reason, side, and reclamation events are useful fields. The implementation does not log guest Cookie tokens or COOKIE_SECRET; preserve that boundary.

`close()` clears service intervals, terminates WS connections, closes the WS server, and closes HTTP. Each socket close handler clears its own heartbeat. Tests call this cleanup after each case; new timers/resources must be included in the owning lifecycle.

## Testing

[service.test.ts](../../../tests/service.test.ts) listens on port 0 at 127.0.0.1, uses independent HTTP Cookies and actual ws clients, and overrides reconnect/result/input timeout durations through ServiceOptions. Follow this pattern for identity and lifecycle changes instead of mocking out the behavior being verified.

Use `npm run typecheck`, `npm run lint`, and relevant tests. Gameplay tests may take roughly a real match duration; do not replace them with an assertion that bypasses scoring.
