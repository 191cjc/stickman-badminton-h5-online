# 优化联机击球时序与操作反馈

## Goal

Reduce the extra anticipation needed to return an opponent's shuttle online, and reduce occasional local-character corrections, while keeping both browsers on one server-authoritative match.

## Background and evidence

- The user reports generally playable two-person matches, rare character pullbacks, and needing to swing earlier than the visible shuttle suggests. This is an observed symptom, not a measured attribution to rendering or network latency.
- The current browser predicts only its own character; the shuttle is interpolated behind received authority. The server tests contact against its current shuttle, without a client presentation-time reference. See `src/client/prediction.ts:34`, `src/client/prediction.ts:144`, `src/shared/protocol.ts:15`, and `src/shared/classic/simulation.ts:312`.
- Prediction currently advances one 1/60-second step per successfully sent command; the server advances fixed time with held/coalesced input. See `src/client/main.ts:191` and `src/server/service.ts:508`.
- Before changes, the prediction/core/service baseline passed 59 tests. A synthetic 400-ms held-move fixture yields a 45-unit correction at 30-Hz command sampling versus zero at 60 Hz. Source-valued shot fixtures also show legal contacts at six delayed ticks that miss at eight; these establish timing sensitivity, not this user's latency. Evidence and caveats live in `research/local-prediction.md` and `research/authority-timing.md`.
- Frozen Flash90302 mechanics, seven characters, art, filters, effects and audio remain the source of truth. Previous rendering/cache work and its limits are documented in `docs/validation.md`.

## Requirements

- **R1 — Contact timing:** Reduce visible-ball versus authority timing mismatch and the resulting extra online anticipation by reducing unnecessary presentation wait and input scheduling wait. Preserve original racket geometry, action latches, character attributes and shuttle physics. No blanket hitbox enlargement or automatic successful returns.
- **R2 — Local response:** Prediction must follow elapsed simulation time rather than the number of delivered/sent messages. Continuous controls and action changes should reach the existing sender promptly; fixed stepping, catch-up, message frequency and reconciliation work remain bounded.
- **R3 — Authority and safety:** The server alone accepts contacts, changes shuttle trajectory, awards points and settles results. First release adds only server-owned acknowledgement timing metadata; clients still send logical operations and cannot assert timestamps, contacts, coordinates, side or score. It does not rewind gameplay or predict ball contacts.
- **R4 — Lifecycle:** Release/focus loss, failed send, reconnect, a new rally, a new room and rematch must reset relevant timing/history without replaying old swings or leaking another player's seat.
- **R5 — Observable validation:** Separate frame stalls, input/ack age, displayed-ball authority gap and local timing resets in reproducible checks. Retain bounded opt-in local diagnostics, without identity data or uploads.
- **R6 — Compatibility and operations:** Keep the independent public base path, original-game entrances and upstream archives untouched. Coordinate any wire change across client, server, scripts and documentation; document release/rollback and distinguish automated results from physical two-computer feel.

## Acceptance criteria

- **AC1 / R1:** Source-derived legal and illegal shot fixtures run on both sides and cover the seven-character geometry. An actual interpolation/input trace with the same visible cue demonstrates reduced extra lead or restores a previously missed legal return under specified synthetic delay; include a source timing counterexample so earlier input is not assumed universally better. No universal latency or successful-return guarantee is claimed.
- **AC2 / R2:** Equivalent held operations over equal elapsed time produce consistent local motion under regular and reduced-rate sampling. The 400-ms baseline discrepancy is removed in the controlled fixture. Long stalls perform bounded fixed catch-up then resynchronize; reconciliation must not treat input sequence as server tick or accelerate movement with a packet burst.
- **AC3 / R3:** Inputs containing invented timing/contact/coordinate fields remain rejected. Both peers receive the same authoritative state/result after accepted contacts; ground/point/match-end boundaries cannot duplicate points or revive an ended match. Acknowledgement timing distinguishes completed simulation from discarded input.
- **AC4 / R4:** Failed sends retain press edges; release/reconnect/rematch cannot replay stale contact requests. Existing authenticated seat and input-range checks remain covered by real HTTP/WebSocket tests.
- **AC5 / R5:** Diagnostics and history have explicit bounds and reset rules. Measurements clearly label configured buffers, synthetic transport delays and headless/shared-host performance.
- **AC6 / R6:** Lint, typecheck, meaningful regression tests, build and isolated HTTP/protocol checks pass; authorized targeted browser checks, if used, follow these gates. Public release remains separately identifiable and reversible.

## Out of scope

- AI, campaign/unlock state, accounts, database/Redis, another service or multiplayer framework migration.
- New artwork, removed original effects, asset-license changes or edits to frozen upstream/reference files.
- An unrelated renderer rewrite or broad gameplay tuning; further rendering work requires evidence that it is necessary for this contact-timing scope.
- Full server rollback, historical-shuttle/current-racket hitbox fallback, client ball extrapolation/contact prediction and any provisional-score system. These require a coherent player/ball/action/effect timeline and are deliberately deferred after measuring this first release.
- Promised public-network latency values or treating automated checks as physical dual-computer acceptance.

## Decisions and acceptance limits

- Task creation was authorized by the user's “开始” after the task-creation question. Scope follows the requested incremental recommendation; no additional product choice is needed before final review.
- Stable-stream presentation waiting is reduced while monotonic rendering, real-snapshot interpolation and server contact authority remain intact. Weak-network freezes are measured as a trade-off, not hidden by invented ball flight.
- Protocol changes ship client/server/scripts together and require old pages to refresh. A production restart still clears in-memory matches.
- The final planning summary needs the required fresh implementation approval before activation; documents and research may change during review, product code may not.
