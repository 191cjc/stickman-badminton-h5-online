# Identity, upgrades, and logical input

## Guest identity

[service.ts](../../../src/server/service.ts) signs a 24-byte random hex guest ID with HMAC-SHA256 and compares fixed-format signatures with timingSafeEqual. Cookies are bearer credentials: do not expose their values in logs, page JSON, URLs, or client storage.

GET `/badminton-h5-online/api/session` creates/registers the guest, refreshes the Cookie, and returns protocol/reconnect configuration plus `connected`. An invalid signature at this HTTP endpoint creates a new guest; it does not join an existing guest. Cookies have Path scoped to the project, HttpOnly, SameSite=Lax, 30-day Max-Age, and production Secure. Stable production secret allows identity reuse across service restarts, but not room restoration.

GET health is public and reports status/cadence/room/queue counts. Non-GET requests return 405; unknown routes return 404. Session requests with an explicit foreign Origin return 403. The session endpoint has an in-memory per-IP rate bucket; production trusts the IP header set by the loopback Nginx proxy.

## WebSocket seat binding

An upgrade must target the exact WS route, have an allowed Origin, offer `badminton-v2`, and contain a valid Cookie mapped to an initialized guest. Missing identity returns 401; foreign Origin 403; missing subprotocol 400; an existing guest socket 409.

Legacy `badminton-v1` is accepted only to send protocol_mismatch and1008close before binding a guest or seat. It cannot occupy or replace an active connection.

Guest.socket is assigned on successful current-version upgrade. New connections do not replace an active socket. Seat lookup uses the authenticated Guest object in the room, never a room/side/guest field submitted by the client. Reconnect reuses the same signed guest and the existing retained seat.

## Input validation

Use [parseClientMessage](../../../src/shared/protocol.ts) before dispatch. It rejects malformed/non-object JSON, missing/extra fields, non-integer/out-of-range sequences, move outside -1/0/1, non-boolean action flags, and invalid ping time. A type assertion by itself is not validation.

The discriminator must be an actual string before command membership is checked. Array/nested-array command types and other non-string values return null; an authenticated socket then closes with 1008/`invalid_message`. Do not coerce untrusted command types with `String`. [Parser regressions](../../../tests/protocol.test.ts) and [real WS regressions](../../../tests/service.test.ts) verify the two boundaries; see the [executable contract](../shared/protocol.md#boundary-regression-contract).

The only input payload is logical direction, jump/hit held/edge flags, and sequence. Internal `hitMove`/`hitJump` locks are server-created, not wire fields. Position, ball, score, room, side, and match results cannot be submitted as input.

WS payload maximum is 1024 bytes, compression is disabled, binary messages are rejected, and a connection is limited to 180 messages per one-second bucket. Input sequence must be received+1 and pending input is bounded at 120 frames. Invalid messages/sequence use policy close 1008. Slow output above 256 KiB terminates the socket.

## Evidence and changes

[Service tests](../../../tests/service.test.ts) verify Cookie reuse, forged/no Cookie rejection, foreign Origin, duplicate active connections, third-party input/extra seat fields, malformed values, and control ownership. Add a message through shared types/parser and both dispatch paths; do not create a bypass around this authenticated boundary.
