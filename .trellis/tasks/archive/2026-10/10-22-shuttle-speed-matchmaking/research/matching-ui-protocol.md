# Matching, UI and protocol investigation

## Current evidence

- `src/shared/protocol.ts:7` owns protocol4 and `badminton-v4`. Queue currently has exactly `type, character` (`:27`, `:81`); queued echoes the role (`:47`), matched restores both roles (`:50`). A required speed is a breaking wire change, not merely a UI selector.
- `src/server/service.ts:42` stores a queued guest's role/time. `:185` clears queue membership and role; `:279` always shifts the first two guests and creates `Simulation({characters})`. `:324` freezes role until cancel and makes identical repeated queue commands idempotent. `:453` restores matched metadata on retained-seat reconnect. `:607` expires queued guests after120s. Health (`:133`) and stats (`:627`) use total queue length.
- The existing legacy branch at `src/server/service.ts:418` sends protocol_mismatch/1008 before binding the guest/socket. Extend it to cover v4 after moving the coordinated release to v5.
- `src/client/main.ts:75` owns selected role and scene. `updateSelection` (`:120`) and `buttons` (`:140`) gate native choices. queued (`:397`) and matched (`:422`) replace client choices with authority-confirmed values. `:571` sends queue. `showResult` (`:511`) retains result after room reclamation; `updateHud` (`:538`) centralizes accessible match status.
- `index.html:49` has start/cancel inside the court overlay. Native speed choices belong in this same menu, directly beside/before matching actions. No need for a settings modal or Canvas-drawn buttons.
- CSS already provides scrollable menus and compact rules for either narrow or short viewports. Four choices must fit one compact row, with minimum reachable controls; extra vertical height must scroll rather than cover the scoreboard/corner actions.
- `src/client/network.ts` uses shared protocol for session, hello and subprotocol, and already disables retries on mismatch, offering refresh. `scripts/http-check.mjs` contains hardcoded4/v4 checks; update it together with the protocol. Historical fixtures and validation entries remain historical.

## Proposed contracts

User subsequently requested and confirmed manual swing selection. `research/manual-swing-controls.md` and final `design.md` add a strict swing field to InputFrame in this same protocol5 release; identity/ack/timing invariants remain.

One shared readonly numeric list `[1, 1.25, 1.5, 2]`, a derived `ShuttleSpeed` type and strict numeric guard. UI labels append `x`; wire values remain numeric. Queue is exactly `{type:"queue", character, shuttleSpeed}`; no optional/missing default accepted on the new wire. Simulation's absent option may default to1 for existing in-process callers, while an explicitly invalid option must fail.

`queued` and `matched` both echo `shuttleSpeed`. The simulation owns immutable match speed and includes it in serialized gameplay state; neither repeated queue nor input may override it. Client desired selection and confirmed active-match speed are separate, so choosing the next match's speed cannot relabel an existing retained result. Reconnect takes the value from matched/snapshot, never storage. Initial page defaults1; retain the most recent in-page selection for rematch without adding a new storage contract.

Advance coordinated protocol to5 / `badminton-v5`; add v4 to legacy mismatch negotiation. A changed serialized gameplay schema should be explicit (`flash-90302-v3`) and all consumers/tests/current documentation updated. InputFrame gains the strictly validated per-hit swing choice described in the manual-input design. No change to ack/ackTick, authenticated seats, timing, room lifetime or Cookie.

## Minimal independent queues without extra owners

Retain the existing bounded `Guest[]` and existing cleanup/statistics rather than introducing four duplicate lifecycle implementations. To find a pair, scan FIFO order once while remembering the first index for each speed. The first repeated speed completes a pair; remove those two indexes and repeat until no pair or room capacity. This implements FIFO within each speed and completion order among ready pairs. An older singleton of another speed cannot block a ready pair. No fallback to cross-speed matching or automatic timeout-based speed change.

Freeze role and speed together. Identical repeats echo queued without another entry; either change errors `already_queued`. Cancellation, disconnect, expiry and room creation clear both pending fields. Room creation captures validated values before clearing. Reconnect reconstructs speed from the room simulation. Existing total limits100rooms/5000guests remain.

## Meaningful validation

- Parser: all7roles×4speeds, missing/string/null/boolean/object/array/out-of-range speeds, extra authority keys and unchanged strict input range.
- Real-service tests: interleaved singleton/ready pairs; same-tier FIFO; no cross-tier pairing; idempotence/freeze; cancel/change/requeue; queued close/expiry; rematch another tier; retained-seat speed and role; old v4 cannot occupy an existing v5 visitor.
- Same-tick authoritative snapshots from both seats must have identical ball/score/config; each tier serves, returns, scores and reaches a natural result. A third guest cannot change seats or speed.
- Native UI: four visible choices with aria-pressed, appropriate loading/queue/room gates, default1, confirmed queue/room indicator, retained-result and rematch behavior. Keyboard focus must retain the existing native-control input-release contract.
- Code checks/build and isolated HTTP before isolated two-guest Chromium checks, including compact layouts and reconnect. No public matchmaking probes or claims about physical two-computer latency.

## Release

Follow `.trellis/spec/deployment/operations.md`. Frontend/backend switch atomically under this project's current symlink; service restart loses in-memory matches. Keep prior v4 release for rollback and use its matching checker on rollback. No shared Nginx, unrelated route/service, source archive or Cookie-secret changes are required.
