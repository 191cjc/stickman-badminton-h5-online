# Source and regression evidence

Baseline `a7a314b` and the archived bootstrap review retain each defect's source anchors. Existing `tests/service.test.ts` uses real HTTP/WS on port 0, signed Cookies, duration overrides and deterministic service teardown. Its reconnect test exercises normal resume and collector expiry, but does not isolate expired upgrade.

Deadlines use `Date.now()`, simulation uses `performance.now()`, collector runs every 100 ms. Deliberate interval control plus a wall-clock jump can reach upgrade after expiry without first collecting the room. Preserve real network events and restore timers/mocks. Do not simply test a helper or expose room internals.

The existing documented policy gives a connected opposite player the win, otherwise null. The reconnecting socket belongs to the expired seat. Assert the returning socket receives `disconnect` result and idle, room count becomes zero, and no resumed `matched` for the old room appears. Also retain collector/valid-reconnect coverage.

Parser cases: all four valid logical commands; arrays/nested arrays/non-string types; exact-key rejection. Real malformed WS messages must close 1008/`invalid_message` rather than remain silently connected.

Publisher order: resources/env/include and `nginx -t` precede current switch, daemon reload/enable/restart, loopback health, reload and public HTTP check. Change only the diagnostic and matching documentation; do not execute publisher as a test.
