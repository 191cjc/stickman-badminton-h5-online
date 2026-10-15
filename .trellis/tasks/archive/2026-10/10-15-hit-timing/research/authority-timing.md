# Research: authoritative contact timing and smallest safe release

- Query: What is the smallest correct way to reduce extra anticipation for online return shots while preserving Flash90302 geometry, action clocks, physics and server authority? Compare reduced presentation delay, bounded shuttle presentation, historical contact and full rollback.
- Scope: internal; source and read-only synthetic simulation experiments. No implementation, deployment or browser test.
- Date: 2026-10-15

## Findings

### Recommendation and first-release boundary

Ship the reviewed, measurable timing improvement first: elapsed-time local-player prediction, immediate/coalesced operation-change sending within existing limits, and a healthy interpolation minimum of **two simulation ticks / one 30-Hz snapshot** instead of four ticks. Keep SIM_HZ=60 and SNAPSHOT_HZ=30. Preserve monotonic presentation, bounded jitter adaptation, hold-latest starvation, semantic resets, server-only shuttle/contact/score/result and all source mechanics. Use a server-owned completed-input `ackTick` if necessary to reconcile elapsed steps without equating seq with tick. Existing max-delay adaptation can remain bounded at its current 12 ticks for this release; reducing its maximum is a separate measured tradeoff, not required to establish the two-tick healthy-path improvement.

Do **not** introduce a history-hitbox fallback, client-selected authoritative hit coordinates, shuttle forward prediction, or server rollback in this release. The first change removes an avoidable part of presentation delay and input scheduling delay; it does not compensate all propagation delay, erase original action startup, or guarantee every visibly plausible stroke succeeds. If user acceptance still requires earlier confirmed ball response after these changes, plan a separate coherent ball-time/rollback design rather than widening racket geometry.

The PRD/design should explicitly call this stage a bounded timing improvement, and state that historical contact compensation remains deferred. R1/AC1 can be met as a measured reduction of extra lead on controlled traces, not complete latency compensation. R3's timing-field validation is conditional: first release need not trust any client presentation-time field at all.

### Files found and source anchors

| File                                            | Responsibility and useful anchors                                                                                                                                                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/client/main.ts`                            | Input send/commit/predict transaction at 191–204; snapshot acceptance/reconciliation at 331–342; sampled authority with local-player replacement at 463–488.                                                                             |
| `src/client/prediction.ts`                      | One player step per input at 27–34; latest-authority ball context at 48–53; interpolation initialization/reset at 94/124; jitter policy at 134–151; monotonic bounded cursor at 167–195; contact-boundary discrete selection at 219–231. |
| `src/server/service.ts`                         | Seat identity and pending inputs at 46–67; finished-result broadcast at 227–246; sequence and status checks at 361–380; room-step input coalescing/ack at 507–555; bounded time accumulator at 558–578.                                  |
| `src/shared/protocol.ts`                        | Protocol 3; 60/60/30 cadence at 7–11; current logical-only InputFrame at 16–24; tick/ack snapshot at 31–40; exact-key parser at 63–119.                                                                                                  |
| `src/shared/classic/player.ts`                  | Original swing selection at 123–147; nonrestartable action startup at 150–166; independent action clips at 169–200; input/movement/contact-origin order at 223–282.                                                                      |
| `src/shared/classic/simulation.ts`              | Source actor/ball/callback step order at 197–256; rally setup at 268–295; exact contact and launch at 312–350; immutable point gate/result at 383–405; snapshot scope at 407–430.                                                        |
| `src/shared/classic/birdie.ts`                  | Launch changes velocity, retains position at 60–73; gameplay-random top-net bounce at 75–100; flight and collision order at 103–156.                                                                                                     |
| `src/shared/classic/animation.ts`               | Stage-add clock0 versus stopped frame/fps clock at 3–14; frame-by-frame callbacks at 17–33.                                                                                                                                              |
| `src/shared/classic/presentation.ts`            | Event IDs/ticks at 5–25; journal bounds128/30ticks at 31–36; cosmetic RNG stored in closure at 38–46.                                                                                                                                    |
| `src/client/effects.ts`                         | Monotonic deduplication cursor at 168–190; sound/spark/particle application at 271–300; no event retraction contract.                                                                                                                    |
| `tests/classic/core.test.ts`                    | Independent source-value physics, action clocks, point/result and legal-return fixtures; legal right return at 344–361.                                                                                                                  |
| `tests/prediction.test.ts`                      | Replay/ball-authority, hold-latest, semantic-reset and ordered jitter fixtures. Delay expectations currently assume four-tick minimum and need intentional updates.                                                                      |
| `reference/flash-90302/scripts/§_-0V§/§_-h§.as` | Frozen original: action latch/swing selection at 260–310; hitTestPoint and source shot velocity at 324–359. Do not edit.                                                                                                                 |

### Why the current mixed timeline matters

The local actor is replaced with predicted state, while the opponent and shuttle remain at the interpolation cursor. Own swing prediction currently chooses its action from the **latest received authority shuttle**, which may differ from the shuttle actually drawn (`prediction.ts:48–53`, `main.ts:475–488`). The server chooses its action from its current shuttle and later tests frame-specific racket geometry against that current shuttle.

The original swing is not a generic fixed-duration hit window: action type depends on the ball's position/descending status, near-net conditions, player grounded/vertical state and the role's underhand contour (`player.ts:123–147`). Each clip has its own clock. Starting a swing, moving/jumping and contacting occur in a particular order; Toaster's contact origin precedes final bob. Source latches prohibit restarting an active action. A returned stroke can therefore miss because of timing, wrong action selection, physical reach, or the original action frame; not every miss is networking.

First release should keep selection and authority mechanics unchanged while measuring own predicted-vs-authority action differences. Feeding displayed stale shuttle coordinates into authoritative choice without a complete timing policy would change the mechanics. Lower display buffering reduces the mixed-time distance; it does not fully eliminate it.

### Comparison of approaches

| Approach                                                  | Correctness boundary                                                                                                                             | Benefit / remaining cost                                                                                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lower healthy interpolation delay 4→2 ticks               | Stay within received snapshots, keep genuine discrete states and semantic resets. No new authority path.                                         | Removes two configured ticks on a stable trace; more exposure to snapshot jitter. Does not remove uplink/downlink or action startup. Recommended now.           |
| Bounded shuttle-only forward presentation                 | Clone latest authoritative shuttle; project only a small free-flight horizon; no local racket contacts, collisions, scoring or authority writes. | Can reduce snapshot age, but unknown opponent contacts still cause correction. Adds a new ball clock and FX alignment issues. Defer until evidence warrants it. |
| Historical shuttle tested against current/predicted actor | This is a new mixed-time collision policy, not a faithful same-time contact. Must define launch time/origin and all intervening boundaries.      | A simple fallback creates ghost hits or teleporting balls. Not recommended as an incremental patch.                                                             |
| Full rollback/replay of delayed logical operations        | Requires complete deterministic restoration, a defined client/server time mapping and committed-state policy.                                    | Can correctly resolve past legal shots in a coherent model; materially more complex. Current snapshot/effect machinery is insufficient. Separate future task.   |

### Bounded forward shuttle presentation: possible later, with explicit limits

If later needed, start with at most two authority ticks of free-flight projection, derived from receipt/estimated authority time, never cumulative extrapolation from a previously projected value. This is a candidate bound for evaluation, not a proven suitable latency target.

- Only while the authoritative room and simulation are playing, pointActive, shuttle flying, and the room/rally/contact epoch remains unchanged.
- Reuse source gravity/drag and 60-Hz discrete stepping on a clone. Do not substitute constant-velocity or continuous approximations for the source flight law.
- Do not simulate an unconfirmed wall/net/ground bounce. Reject or stop **before** a candidate step that would touch any such boundary, including source four-sample net traversal and ceiling clamp. Calling `stepClassicBirdie` and merely suppressing its event list after retaining its mutated position is incorrect.
- Do not consume authoritative gameplay RNG; random net collisions should be excluded, not guessed. Do not emit predicted shot/point/victory events. Preserve received score and point state.
- Unknown future racket contacts cannot be ruled out from current state. Snap/visually correct on the next authority segment; never present this as guaranteed collision-free truth.
- Need a separate shuttle presentation tick and documented source-event clock. `main.ts:477` currently advances all effects from the sampled authority state's elapsed time, so moving only the ball may visibly detach the tail/spark from it. Do not advance scores/opponent/FX wholesale to an invented future to hide that mismatch.
- Attached shuttle, fresh contact, net/wall/ground vicinity, stale data beyond the horizon, point/result/reconnect/rematch all disable/reset projection immediately.

This additional design surface is why forward presentation is not needed for the recommended first release.

### Why historical hitbox fallback is insufficient

1. **Action selection is historical too.** Looking only for an old ball point inside the current racket misses changes between underhand/overhead, source clip startup, grounded power and pre-bob contact origin. Walking all historical points against a current racket is effectively a temporal hitbox enlargement.
2. **The launch origin must be defined.** `launchClassicBirdie` changes velocity and keeps position. Accepting a historical point then launching the current shuttle creates a hit away from the racket. Replacing the ball with the past position then launching now jumps it backward in time. Fast-forwarding only that ball after a past launch is partial rollback, with all the collision hazards below.
3. **Intervening events are causal.** A wall/net bounce, opposing racket contact, ground/point, serve release or reset between the historical point and now cannot be skipped. `lastTouchedBy` alone is inadequate: the same side can touch again, and original human rules deliberately do not reject same-side contacts.
4. **Published score/result is already observable.** The simulation awards a point on the ground step; service immediately finishes and broadcasts at matchEnd. There is currently no speculative point or revocation protocol. Historical compensation cannot revive these states by decrementing score.
5. **Current-shooter versus past-target is a deliberate new rule.** FPS-style target rewind assumes a shooter-origin policy. Here the player sees an advanced local actor and an older shuttle; rewinding both to the displayed ball tick may also be wrong for the user's actual actor pose. Any future design must explicitly define both temporal samples and preserve bounded authority on actor reach, never accept client coordinates.

Rejecting **all** contacts/net/wall/ground/reset events between historical sample and now could make a restricted experiment safer, but still leaves action selection, launch time and ghost-origin policy unresolved. It is not a release-ready shortcut.

### Full rollback feasibility and missing state

Gameplay is deterministic for a fixed seed and input history, so rollback is feasible in principle. Current `snapshot()` is a render/gameplay snapshot, **not a complete restoration checkpoint**. It omits simulation tick, accumulator, held/unconsumed intents, internal contact/ball diagnostics and presentation state; there is no restore API. A full checkpoint needs both actors' nested clip/bob/latch state, shuttle, net, score/phase/timers/server/winner, gameplay RNG, step counter/accumulator, ordered authoritative input samples and lifecycle epochs.

RNG/effects require special care: net-top bounce can consume gameplay RNG; cosmetic RNG is an opaque closure, so its state is not restored by assigning snapshot.rngState. Replay must either restore cosmetic RNG+journal or suppress provisional effects and regenerate only committed events. Already-published effect IDs cannot simply rewind or be reused: browsers permanently deduplicate by cursor; old spark/sound/cheer cannot currently be retracted. An event revision/cancellation/commit policy is needed.

Choose one eventual committed-state policy: reject rollback across committed contacts/points/results, or delay finalization/observable event publication until a bounded rollback horizon has passed. The latter itself adds latency. Neither may revive an ended room or duplicate a point. Replay must run the full source left→right→birdie→clips order, not only the shuttle, and must handle both peers' delayed operations deterministically in the same tick order.

Timing fields need strict validation if this future scope is authorized: finite/integer ticks, server-side history window (e.g. evaluate 6–8 ticks as a candidate, not a promise), no future tick, actual per-seat sent-snapshot references, current room + monotonically increasing rally/contact/reset epoch, one use per accepted swing edge, no active-action bypass, stale-on-reconnect/release discard. A nonce or sent-snapshot reference proves what was sent, not what the browser actually drew; the client can still choose a favorable time within its allowed window. Do not trust RTT/2 as exact one-way delay or accept self-reported arbitrary buffer size as entitlement to longer rewind. Bound memory and replay work per tick and per seat.

### Read-only trajectory experiments and reproducible fixtures

Executed with `node --import tsx --input-type=module` importing the existing `ClassicSimulation`, `createClassicPlayer`, `emptyClassicIntent` and role registry. No files or frozen source were modified.

Setup: `dt=1/60`, cosmetics disabled, fresh player objects for both sides, actor x left140/right500, both nonserving; empty intents except a single `hitPressed` at loop index d. Shuttle initialized flying with previous toucher opposite receiver. Run until contact/point, at most65steps. Delay d means the edge is consumed in fixed step d+1. Mirror x and vx through world640 for the left receiver. Fresh actor clips are important: constructor's initial serving actor has reset frame/fps clocks, while the nonserver has stage-add clock0; simply setting serving=false on that constructor actor is not a mirrored action-clock fixture.

| Synthetic shuttle at right side | Role / side                                     | d=6                                                                      | d=8  |
| ------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| x380,y250,vx900,vy400           | Joe, Nadia, Harry, Pirate, Top Hat, Red / right | Legal overhead at tick9, source action frame3, contact(480.300,305.084)  | Miss |
| x260,y250,vx−900,vy400          | Same six roles / mirrored left                  | Legal overhead at tick9, source action frame3, contact(159.700,305.084)  | Miss |
| x380,y275,vx600,vy100           | Toaster / right                                 | Legal overhead at tick11, source action frame5, contact(460.440,304.055) | Miss |

The first two mirrored witnesses were actually executed for all six adult roles. The Toaster right witness was actually executed; the same mirrored construction should be run/asserted in the implementation suite rather than assumed as runtime coverage.

Interpretation: with otherwise identical two-tick downlink and two-tick uplink, a four→two tick display-buffer reduction can change extra consumed-edge delay from8→6 ticks for a cue with aligned sampling phase. These **isolated fixtures prove the two ticks can matter**, not that the actual interpolation/WS pipeline always has that phase or that these invented initial conditions were encountered by the user. They retain source mechanics/geometry and are not an unchanged-SWF execution comparison.

Useful additional adult low-return fixture: right receiver, x400,y350,vx100,vy100. d2 returns underhand tick11/frame9 at(413.407,379.055); d4 misses. Mirror with fresh clips returns tick11/frame9 at(226.593,379.055). **Negative caveat:** Toaster on this exact trajectory misses at d2 but returns at d4 (tick13/frame9 at415.492,387.132). Earlier input is not universally more successful because original per-frame geometry and swing selection matter. Tests should measure timing windows/extra required lead, not assert every reduction in delay creates a legal hit.

Minimal experiment loop for the first witness:

```ts
const game = new ClassicSimulation({ cosmetics: false });
game.players.left = createClassicPlayer("left", role);
game.players.right = createClassicPlayer("right", role);
game.players.left.x = 140;
game.players.right.x = 500;
game.shuttle = {
  x: 380,
  y: 250,
  vx: 900,
  vy: 400,
  speed: Math.hypot(900, 400),
  dir: 0,
  rotation: 0,
  state: "flying",
  lastTouchedBy: "left",
  predictedLandingX: 0,
};
for (let t = 0; t < 65 && game.pointActive; t++) {
  game.setIntents(emptyClassicIntent(), {
    ...emptyClassicIntent(),
    hitPressed: t === delay,
  });
  game.update(1 / 60);
  if (game.rallyHits) break;
}
```

### Meaningful first-release validation

1. **Actual presentation-led A/B:** Generate a no-hit authoritative flight trace, 30Hz snapshots, fixed 60Hz client callbacks, equal ordered downlink/uplink and identical visible-ball cue. Exercise the real old four-tick and new two-tick interpolation paths, with actual current sampling-phase behavior. Trigger a single stroke only from the displayed ball/player geometry, not an authority-perfect oracle. Record displayed tick, received latest tick, enqueue/consumed tick, source action kind/frame and contact outcome. Include both30Hz snapshot phases, stable and ordered jitter traces, and an explicit lead sweep; quantify reduction in needed extra lead on favorable and adverse fixtures. Do not merely substitute d=6/d=8 and label it an end-to-end result.
2. **Source geometry coverage:** Seven roles × two sides; adults and Toaster; underhand/overhead, grounded/jumping/descent, source stage-add/reset/hidden-clip clock states. Keep legal, too-early, too-late and out-of-reach strokes. Preserve original no-restart latch, same-side source behavior, unscaled serve offset and pre-bob contact origin. Assert shot velocity/position with source expectations, not only `rallyHits>0`.
3. **Authority and discontinuities:** No new client contact/position/score assertion, no ball stepping/mutation in player prediction; snapshots to both peers remain equal on ball/score/result. Net-top seeded bounce, net side, wall, ground/point, serve release, result, reconnect and rematch never interpolate invented contacts or revive old phases. Existing exact-key parser rejects spoofed timing/coordinates if no timing request is added.
4. **Presentation tradeoff:** Uniform30Hz trace has two-tick healthy target and lower measured available buffer. Monotonic cursor, no beyond-latest shuttle, bounded histories32/60, old-tick rejection, ordered same-time burst and450ms stream pause recovery remain covered. Report hold/starvation counts before/after; do not hide increased holds under severe jitter as a universal smoothness improvement.
5. **Input/reconcile integration:** Parent session owns this design. Verify immediate changes share one send/seq/commit transaction with periodic sampling; same-tick bursts do not accelerate simulation; failed sends preserve edges; release/focus/reconnect clear pending operations. Equal elapsed motion at30/60Hz delivery uses the same60Hz player law, and server-owned ackTick is not assigned a new tick merely because an old held input continues.
6. **Diagnostics/lifecycle:** Bounded opt-in local metrics for display/latest/estimated authority ages, input→completed ack duration, correction magnitude and frame stalls. Treat render buffer as configured/client-relative age, not physical end-to-end latency. Reset measurements on room/status/role/score/phase transitions. No identity, room IDs or uploads.
7. **Gates and limits:** Full applicable lint/typecheck/tests/build, isolated HTTP/real WebSocket check, then authorized targeted browser checks if useful. Physical two-computer feel and public routes remain separately verified. No protocol cadence increase, renderer rewrite or framework migration is needed for this scope.

### Related specs and external references

- `.trellis/spec/shared/simulation.md`: frozen Flash90302 geometry/order/clocks, one-contact latch, server ball authority, cosmetic isolation.
- `.trellis/spec/shared/protocol.md`: seq versus tick, completed-step ack, exact wire validation, atomic protocol release.
- `.trellis/spec/backend/identity-and-input.md`: authenticated seat ownership, logical-only payload,180message/s and120pending bounds.
- `.trellis/spec/backend/rooms.md`: fixed-step coalescing, stale/release, reconnect and finished-result ownership.
- `.trellis/spec/frontend/state-management.md`: mixed local prediction/remote interpolation, monotonic authority presentation and effect deduplication.
- `.trellis/spec/frontend/event-lifecycle.md`: send-failure edge retention and focus/room reset boundaries.
- `.trellis/spec/frontend/quality-guidelines.md`: meaningful timing traces, main-thread effects and physical latency evidence limits.
- Frozen primary reference: `reference/flash-90302/README.md` and decompiled original `§_-h§.as` above; current transport/runtime versions from `package.json`: ws8.18.3 range, TypeScript6.0.3 range, Node24+.
- No external networking framework/documentation was required for this internal mechanics/timeline recommendation; popularity claims or transport migration are outside this research.

## Caveats / Not Found

- No measured reproduction on the user's two machines; no assertion that this is the sole cause of misses or local pullbacks.
- Synthetic flight initial velocities/coordinates are selected fixtures using unchanged migrated source laws, not a recording of an original Flash rally. Exact same-time original-runtime parity is a separate existing validation limitation.
- The current server stores no restorable historical simulation and exposes no full restore API. Render snapshot cloning does not imply rollback readiness.
- No existing protocol records which interpolated frame a player actually viewed. A future field must not be treated as proof of honest display timing.
- A smaller buffer intentionally trades some smoothness margin for responsiveness; fixed propagation and source action startup remain.
- First release defers full latency compensation, local predicted shuttle contacts and forward ball display. These must remain explicit in review/release notes, rather than being described as implemented hit rewind.

Replay-anchor review: [replay-anchor-review.md](replay-anchor-review.md).
