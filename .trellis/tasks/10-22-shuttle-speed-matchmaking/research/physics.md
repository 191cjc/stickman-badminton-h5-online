# Research: shuttle-only speed tiers

- Query: Design bounded 1x / 1.25x / 1.5x / 2x shuttle acceleration while retaining exact 1x gameplay, 60 Hz actor/input/timeline/point clocks, and server authority.
- Scope: internal; transient in-memory experiments using current source modules, no product changes.
- Date: 2026-10-22

## Findings

### Recommendation

Use **shuttle time scaling**, retaining native launch velocities and collision constants. Keep the existing 1x execution branch unchanged. Above 1x, execute exactly two birdie substeps per real 60 Hz frame, each with `birdieDt = realDt * multiplier / 2`. Retain the original first contact pass inside the left/right actor callbacks, then repeat the existing left/right `tryContact` immediately before the second birdie substep. Reuse each actor's saved `contactOrigin` and its current source racket pose; do not advance actors, input edges, bob or animation again.

This bounds every birdie integration/contact interval to at most the current native `1/60` second, without a dynamic loop, extra hit allowance, expanded racket, contact rewind, last-toucher restriction, or physics rewrite. It is an intentionally discrete contact scheme, with the same class of corner-graze limitations as the baseline. Swept moving-racket collision is not justified without a concrete failed fixture under this bound.

This preserves the familiar shape of a shot approximately at fractional tiers. Do **not** describe fractional tiers as exact original-trajectory playback. The existing gravity-before-drag integration is sensitive to step size. At 2x, two existing native-size steps reproduce the baseline free-flight path at native step boundaries; player positions, contact timing, effects and collisions with moving rackets still run on different real-time schedules, so whole-match 2x parity is not claimed.

### Files found and source contracts

| File / anchor | Relevant behavior |
| --- | --- |
| `.trellis/tasks/10-22-shuttle-speed-matchmaking/prd.md` | R4/R5 and AC4/AC5 require faster flight, retained actor/action/point timing, usable collision and scoring, and shared authority. |
| `src/shared/classic/simulation.ts:163` | Fixed 60 Hz accumulator; maximum 0.25 s / 15 real frames per update. No global time multiplier belongs here. |
| `src/shared/classic/simulation.ts:197` | Real frame increments elapsed/tick and decrements point timer once; actor order is left, right, birdie, independent timelines. |
| `src/shared/classic/simulation.ts:211` | Shared player step uses `advanceAnimation:false`; its returned pre-bob contact origin is immediately used by authority. |
| `src/shared/classic/simulation.ts:221` | Existing birdie step and pre-collision tail callback; currently one callback opportunity per real frame. |
| `src/shared/classic/simulation.ts:249` | Actor timelines, serve releases and net clip advance after birdie physics, once per real frame. |
| `src/shared/classic/simulation.ts:297` | Serve launch uses unchanged native 1485 speed at ±40 degrees, after physics for that frame. |
| `src/shared/classic/simulation.ts:312` | Contact uses source transformed racket AABB, pointActive, non-attached ball and contactEnabled; successful contact disables contact and uses character power. No previous-toucher rejection. |
| `src/shared/classic/simulation.ts:383` | First ground awards once, disables both contacts, sets 1.5 s timer or terminal winner. |
| `src/shared/classic/simulation.ts:407` | Snapshot copies plain ball, player, clips, score and RNG state; no restoration constructor exists today. |
| `src/shared/classic/birdie.ts:29` | Landing preview is source-derived, native 60 Hz, ignores net-top bounce, and is computed at launch. |
| `src/shared/classic/birdie.ts:60` | Launch assigns native vx/vy/speed/dir and sets flying, then computes landing preview. |
| `src/shared/classic/birdie.ts:103` | Gravity → damping → flight → wall correction → four net samples → ground. Fractional dt already supported; attached state does not advance. |
| `src/shared/classic/player.ts:123` | Swing kind uses ball position and only the sign of ball.vy; downward ball selects underhand when in its source zone. |
| `src/shared/classic/player.ts:150` | Swing latches and source clip windows prevent recovery restart and held-hit assist. |
| `src/shared/classic/player.ts:223` | Player movement, jump gravity, pose, body frames, contact origin and bob are stepped at actor dt. |
| `src/shared/classic/player.ts:273` | Contact origin precedes Toaster's final bob, which is written afterward. |
| `src/shared/classic/types.ts:60` | Ball fields are numeric/plain; existing velocity fields have no explicit clock-unit comment. |
| `src/shared/classic/types.ts:95` | Prediction context reads x/y/vy/lastTouchedBy, never launches a shuttle. |
| `src/shared/classic/presentation.ts:35` | Journal bounds are 128 groups / 30 real simulation ticks; cosmetic RNG is separate. |
| `src/client/prediction.ts:125` | Own actor replay stores authority context with each real fixed step. |
| `src/client/prediction.ts:165` | Context is a copy of authoritative shuttle state. |
| `src/client/prediction.ts:482` | Interpolation blends real authoritative x/y/vx/vy; it does not simulate the ball. |
| `src/client/prediction.ts:500` | Current shot boundary checks attachment state and last toucher; same-side consecutive hits need an additional boundary witness. |
| `src/client/effects.ts:294` | One authority tail event creates a pair of cosmetic particles. |
| `src/client/renderer.ts:206` | Shuttle drawing uses authority position and rotation, with no velocity extrapolation. |
| `src/shared/state.ts:15` / `src/shared/simulation.ts:3` | Public state derives from ClassicSimulation snapshot; public Simulation is the classic class alias. |

### Candidate comparison

| Candidate | Result | Decision |
| --- | --- | --- |
| Multiply launch vx/vy only | More power changes arc height, reach, wall interactions and time aloft. The tested 2x serve takes longer to land. Thresholds/restitution are also left in inconsistent units. | Reject for the proposed faster version of familiar flight. |
| Multiply whole simulation dt | Actor movement, jumps, input consumption, clips, scoring delays and tick meaning also accelerate. | Reject. |
| One birdie step with dt × multiplier | Simple but doubles native integration/contact gap at 2x; changes drag/gravity discretization and increases net/racket skips. | Reject in favor of bounded steps. |
| Two equal birdie steps above 1x | Maximum native step remains 1/60; at most two existing birdie calls and two contact passes; fractional arc differences are modest in the measured serve. | Recommend. |
| Fixed 1/240 native birdie step, 5/6/8 steps at high tiers | High tiers share one fine integration grid, but 1x would require a separate baseline integrator. Measured serve shifts ~5.46 px at apex and ~5.84 px at landing from baseline, and cost/FX handling expand. | Unnecessary for this scope. |
| Fractional accumulator of whole source frames | Can preserve native frame endpoints exactly but adds serialized residual time and uneven 1/2-step display cadence at fractional tiers. Smooth fractional display/contact requires additional state or future-step interpolation. | Avoid complexity/cadence tradeoff. |
| Exact fractional extension of the original discrete map | Possible for unconstrained drag/gravity, but movement thresholds, vy=0 gravity exception, walls/net/ground, and source sampling order complicate exactness. | Do not rewrite the integrator for this feature. |

### Measured transient experiments

Commands used `node --import tsx --input-type=module` with a stdin script importing current birdie/actor/simulation modules. No experiment file or product file was written. Flight starts at Joe's actual left-serve release `(178.45, 377.75)`, native speed 1485, angle 40; no rackets, fixed gameplay random value 0.25. Flight time is quantized to the outer real 60 Hz frame and excludes the serve animation.

| Multiplier | Launch-only flight frames | Recommended two-step flight frames | Recommended approximate ms | Apex y | Landing x |
| --- | --- | --- | --- | --- | --- |
| 1 | 81 | 81, existing single-step branch | 1350 | 160.7767 | 546.2756 |
| 1.25 | 96 | 65 | 1083 | 158.0472 | 549.2607 |
| 1.5 | 111 | 54 | 900 | 158.9568 | 548.1686 |
| 2 | 141 | 41 | 683 | 160.7767 | 546.2756 |

The launch-only 2x serve reaches y≈−189.89 and hits a wall; it is not faster overall. A single birdie step at doubled dt lands at x≈539.32 with apex y≈168.07, illustrating unnecessary integration drift. Two native steps at 2x retain the baseline free-flight apex and landing exactly in this experiment. The recommended fractional tiers differ by at most ~2.99 px landing x and ~2.73 px apex y in **this fixture only**, not a global error guarantee.

A second transient experiment replaced `step` only on an in-memory `ClassicSimulation({cosmetics:false})` object, preserving current actor/animation/serve/point methods and invoking two high-only birdie steps with the original and midpoint contact passes. Results:

| Multiplier | Joe serve release real tick | Flight frames | Legal right return fixture (`core.test.ts:344`) | Next rally after point |
| --- | --- | --- | --- | --- |
| 1 | 5 | 81 | 1 return, last toucher right | 90 real frames |
| 1.25 | 5 | 65 | 1 return, last toucher right | 90 real frames |
| 1.5 | 5 | 54 | 1 return, last toucher right | 90 real frames |
| 2 | 5 | 41 | 1 return, last toucher right | 90 real frames |

This is design feasibility evidence, not a test of a finished implementation. It did not exercise all seven characters, prediction, browser/network effects or the proposed landing-preview adaptation.

### Exact chronology for the bounded implementation

1. Keep the real-frame beginning, tick/elapsed, point timer and first actor/contact sequence. Call `stepClassicPlayer` once per side at `realDt`, preserve its returned `contactOrigin`, call existing `tryContact` there, and emit Toaster smoke once. Preserve the original left-before-right order.
2. For 1x, continue calling the existing birdie path once at `realDt`, with the same callback/event ordering. Do not refactor calculations merely to unify the branches if that changes floating operations, RNG order or source timing.
3. Above 1x, call birdie step 1 at `realDt * multiplier / 2`. Collect its collision events. Start/resume the net animation for net collisions as before. **If it reports ground and pointActive is true, award the point immediately using that substep's resolved x.** Do not postpone ground handling until the entire frame is over.
4. Before birdie step 2, call left/right `tryContact` using the saved origins. `pointActive` and `contactEnabled` now reject a ball that already landed. Both contact attempts inspect the actual collision-resolved position after the first substep. Keep the current swing frame/pose; do not replay input, move the actor, advance its clip, use final Toaster bob, or enlarge a contact window.
5. Run birdie step 2 at the same birdie dt; merge its events rather than overwriting earlier ones. Immediately award its first ground if applicable. A point is still guarded by pointActive; successful contact still consumes contactEnabled. Ball state can continue bouncing during a point without another score.
6. Run actor animation/serve-release callbacks and the net clip once at `realDt`, then attached-ball positioning as today. A serve released here does not receive retroactive birdie steps earlier in that frame. Terminal callbacks and the next real-frame stop retain existing source ordering.

This uses source endpoint contact semantics on the actor's actual per-frame motion. A moving/jumping actor changes its contact origin once per real frame; that same origin is valid for both high-only contact samples in the frame. It does not linearly sweep a guessed actor position or interpolate future animation poses. Test moving, jumping, mirrored and Toaster origins explicitly because a stale or final-bob origin would be a real regression.

### Why no initial swept moving-racket solver

At the current maximum character power (Pirate 1.1), the strongest grounded underhand launch is 1801.8 native units/s (`simulation.ts:333`, `characters.ts:39`). The first native 1/60 integration after damping moves ~28.58 logical px for that ±40-degree shot; an angle-independent first-step upper bound at that launch magnitude is ~29.15 px. Two bounded high steps therefore restore the original displacement interval instead of roughly doubling it in one large step. Measured minimum active racket AABB width/height is ~48.97 px for adults and ~49.37 px for Toaster; underhand minima are ~52.28/52.71 px. This is sufficient evidence for limiting step distance; it is **not** proof against diagonal corner grazes or arbitrary manually injected velocities.

The existing net is ~32.51 px wide; top box is ~33.32 × 9.42 px. Each substep retains the four existing net path samples, now no farther apart in native time than baseline. Relative moving-racket swept AABB would need careful event chronology: a segment from pre-step ball position to raw onFlight position may cross a net that should stop the ball, and a segment to a post-ground-bounce endpoint may award a hit after a point. A segment between corrected endpoints can also hide an intervening wall/net turn. Sweeping indiscriminately creates invalid hits.

If a concrete current-roster high-tier test demonstrates unacceptable new misses, first add the exact trajectory witness and compare it with the 1x native-time bound. A later swept solution must split motion at every environment collision, compare the moving ball and **same active** moving AABB within each segment, stop at the earliest event, and consume contactEnabled once. It must not traverse a resolved net/ground collision or sweep old-to-new animation poses as a new hit allowance. That is more work than this bounded feature needs without a failing witness.

### Velocity units, landing preview and serialization

- Keep `shuttle.vx`, `vy` and `speed` in **native shuttle logical units per shuttle second**. Launch values, wall minimum 200, net-top ±150/−100, movement threshold 5 and drag all retain their native units. `x/y` remain world logical positions, `elapsed/tick/pointTimer` remain real simulation time. Document this distinction in the ball type; do not multiply ball fields again when snapshotting, predicting or rendering.
- Approximate real-time displayed speed, if ever needed, is native speed × multiplier; no current product velocity display was found. If protocol design instead requires vx/vy in real seconds, the physics boundary must explicitly convert both ways. Mixing scaled velocities with scaled dt would double-apply speed and break thresholds. Native fields are the simpler choice for this codebase.
- `Prediction` currently copies ball context and only uses `vy > 0` for swing selection. A positive multiplier does not change that sign. Preserve context copying and own-player stepping at `1/SIM_HZ`; no predicted birdie, score, authority contact, sound or effect emission belongs in prediction.
- Store an immutable validated tier on authority construction and include it in serialized match state/config so reconnection and diagnostics have one explicit value. All four numeric literals are finite and exactly representable. No extra substep accumulator or residual fraction is needed for the two-equal-step scheme. The main session owns field naming/protocol/schema version decisions; do not silently redefine the existing snapshot version contract.
- `predictClassicLanding` currently computes a native-60-Hz approximation at each launch; with fractional substeps its value will be stale by several pixels relative to the chosen integrator. Extend it for the same **birdie substep dt**, retaining its existing source caveat of ignoring net-top bounce, and pass the room's dt through both serve and return launches. Retain the existing function path/operations at 1x to avoid floating-point drift. A high-only path can use gravity `1200*birdieDt`, drag `pow(0.96,60*birdieDt)`, and dt-based x/y. Do not multiply initial velocity. The preview is not currently rendered or used in gameplay (`rg predictedLandingX` only finds declaration, launch and fixtures), but its serialization should still be internally meaningful. It remains a source-style preview, not an exact collision oracle; zero-vy gravity and ignored net-top behavior already differ from live physics.

### Cosmetics and shot boundaries

- Keep gameplay and cosmetic RNG separate. High substeps can legitimately cause different gameplay collisions/RNG consumption across tiers; at a fixed tier, enabling cosmetics or changing cosmeticSeed must never alter gameplay, contacts, score or rngState.
- Preserve the current 1x tail callback exactly. For high tiers provide the tail-emission callback **only on the last birdie substep**, retaining source position after flight/before that substep's collision. This caps authority tail groups at one per real frame, with existing native-speed probability; it prevents a naive two-step implementation from doubling the tail journal/particle rate. One group already generates two client particles. Keep smoke, effect tick ages, particle movement and net animation at their existing real clocks. The high-tier trail is more widely spaced; this is a bounded cosmetic tradeoff.
- Interpolation must not blend across shot discontinuities. Its current state/lastTouchedBy boundary handles serve release and alternating returns, but same-side consecutive contacts are legal and can retain both fields. Also require matching `rallyHits` before blending shuttle continuous fields; otherwise choose a real endpoint. Use existing phase/score/room/status boundaries for rally reset. Test an artificial but legal same-side return boundary; do not add a gameplay last-toucher ban merely to simplify interpolation.
- A speed/config semantic boundary should clear incompatible prediction/interpolation context if one is ever received, even though legitimate room speed cannot change in place. This preserves defensive consistency without allowing client input to change physics. It does not authorize a new client ball simulator.

### Suggested implementation verification

These tests should describe behavior and failed edge cases, not simply assert an internal loop count.

1. **1x regression:** default constructor versus explicit 1x, seeded input replay per tick, source serve/shot constants, contacts/score/gameplay RNG, cosmetic journal, source clip clocks, Toaster, pause and 15-frame catch-up. Existing frozen/native-value fixtures remain unchanged apart from intentional config metadata. Relevant existing suites: `tests/classic/core.test.ts`, `tests/classic/characters.test.ts`, `tests/classic/assets.test.ts`, `tests/hit-timing.test.ts`, `tests/effects.test.ts`.
2. **Flight rate and path:** identical serve release coordinates/angle/native velocity at four tiers, unchanged real release tick for adults and Toaster, monotonically decreasing no-return flight duration with ±1 real-frame quantization. Verify source 2x path at every second native endpoint for a no-contact trace; use bounded/documented fractional fixture differences rather than claiming exact paths across tiers. Cover grounded/airborne returns and all role powers/both sides.
3. **Actors/time:** same isolated movement/jump/body/bob/swing trace for each multiplier with a non-contacting ball; same latches/contactEnd/recovery and one input edge per real frame; 90 real frames after a point; paused/terminal state stays stopped; catch-up updates agree with the corresponding real fixed-frame sequence.
4. **Contact timing:** active racket entered after high substep 1 can contact before substep 2; accepted contact uses current source pose and native launch speed, consumes exactly once, and cannot restart the swing. Exercise actor movement/jump, both sides, Toaster's pre-bob witness, just-outside AABB, closed contactEnd, held hit and out-of-reach misses. Do not demand equal hit success across tiers for the same delayed real-time press.
5. **Environment chronology:** net-side and descending net-top fixtures at each multiplier, seeded top bounce determinism, wall correction/minimum velocity, ground during first high substep with an otherwise active racket (point wins; no return after landing), one score under subsequent bounces, correct scorer at that substep's x, seven-point terminal result. Assert event aggregation retains a first-substep net event even when the second has none. Never sweep raw pre-collision flight coordinates into a legal hit.
6. **Grounded motion/preview:** no speed scaling for attached ball; non-attached grounded bounce/damping uses the selected birdie clock while next-point timer is real. Launch preview uses chosen substep integration for a fixture without the known preview exceptions, remains finite, and retains baseline output at 1x; snapshot JSON stays plain and detached.
7. **Cosmetics:** for each tier compare gameplay snapshots/RNG/contact traces with cosmetics on/off and different cosmeticSeed; at most one tail group per real frame, correct pre-collision coordinates for its chosen substep, paired particles, unchanged bounded journal and particle clocks. Smoke remains one actor callback opportunity per real tick.
8. **Prediction/interpolation:** own-player replay and completed-step ack stay on 60 Hz; descending/upward authority contexts retain correct swing choice for all tiers; same-side `rallyHits` discontinuity chooses a real ball endpoint; no prediction contact/score/effect creation; reset history on incompatible match config. Existing uniform/jitter/stall recovery tests remain valid because cadence is unchanged.
9. **Integrated authority:** two same-tier clients observe identical ball/config/score at the same server tick through serve, return, net, ground, point timer and match end. Browser checks should include moving return input at 2x and narrow-screen visibility. Automated/in-process passing results do not establish physical dual-machine latency or high-tier playability under arbitrary network delay.

Expected validation commands after implementation include project `npm run lint`, `npm run typecheck`, targeted Vitest suites above plus prediction/service suites, and build/browser validation selected by the main implementation plan. No repository tests were added or run by this planning-only research.

### Related specs and external references

- `.trellis/spec/shared/simulation.md`: fixed real 60 Hz stepping, original geometry/clip/contact order, no invented previous-toucher rejection, server-only birdie/scoring, separate cosmetic RNG, plain snapshots and required source fixtures.
- `.trellis/spec/shared/index.md`: DOM/Node independence and public simulation/state aliases.
- `.trellis/spec/frontend/state-management.md`: monotonic authority interpolation, own-actor-only prediction, actual shot boundaries and no client shuttle extrapolation.
- `.trellis/workflow.md`: research artifacts persist while task remains in planning; implementation/activation are outside this agent's scope.
- No external physics library or web reference is required. Version context from `package.json`: Node >=24, tsx ^4.20.0, TypeScript ^6.0.3, Vitest ^4.1.8. The unchanged Flash90302 reference and existing source-derived fixtures remain the project's baseline; this research did not execute native Flash or Ruffle.

## Caveats / Not Found

- Exact fractional-tier trajectory preservation is not promised. The ~3 px measured drift applies only to the tested Joe serve; contacts, net edges and walls can amplify a small path change into a different event.
- The bounded scheme preserves the baseline native sampling interval, not continuous collision detection. Thin diagonal AABB grazes remain possible. No concrete high-only missed-contact witness requiring a swept solver was found in this research; the transient prototype exercised one existing legal-return fixture, not an exhaustive search.
- The source contact model uses per-real-frame actor endpoints and source AABBs. This plan deliberately retains it; it does not claim physically continuous racket motion between ticks.
- Landing preview has existing source exceptions (notably ignored net-top bounce and unconditional preview gravity). No product consumer of predictedLandingX or velocity display was found. A precise future trajectory oracle would be separate scope.
- Native ball velocity units need an explicit documented contract alongside the room speed field; field naming/versioning and queue/protocol/UI work belong to the main session.
- Two-substep CPU cost is bounded but unprofiled. Input send rate, snapshot cadence and browser interpolation delay do not shrink with ball flight time. Therefore 2x affords less real reaction time; neither synthetic fixtures nor this design establishes acceptable real-network feel.
