# Flash 90302 simulation and source reuse

## 1. Scope / Trigger

Gameplay migrated from the community H5 kernel to recovered Flash90302. Use [ClassicSimulation](../../../src/shared/classic/simulation.ts), exposed as Simulation by [the adapter](../../../src/shared/simulation.ts), for online authority and local AI practice. It owns players, shuttle, phase, score, action clocks, server side, RNG and winner. Shared mechanics must remain free of DOM, WS, Cookie, wall-clock timers and Node service APIs.

The active reference is the unchanged SWF, recovered ActionScript and compressed XML under [reference](../../../reference/flash-90302/README.md); [GAME_SOURCE.json](../../../GAME_SOURCE.json) identifies it. The frozen community `upstream/` is historical and must not become the new parity oracle. Neither source has a verified MIT grant.

## 2. Signatures

- `new ClassicSimulation(mode = 'versus', difficulty = 'normal', { seed? } = {})`
- `setIntents(left: PlayerIntent, right: PlayerIntent): void`
- `update(dt: number): void`; explicit bounded fixed60Hz stepping
- `snapshot(): ClassicState`; serializable state, not a complete private restoration checkpoint
- [stepClassicPlayer](../../../src/shared/classic/player.ts) accepts a plain player, logical intent, dt and read-only context; reused by Simulation and Prediction
- [racketPose](../../../src/shared/classic/assets.ts) accepts action and1-basedframe and returns full-precision original geometry before runtime scale

## 3. Contracts

[CLASSIC_WORLD](../../../src/shared/classic/types.ts):640×426, ground400, net317.25, player scale1.25, fps60, target7. Canvas CSS scaling must not change these units. First version uses Average Joe; normal/boss AI are local tuning, not the full original campaign.

Authority steps left player, right player, birdie, then custom timeline callbacks. Serve frame7 releases the shuttle; overhead27/underhand19/serve23 frame events and stop behavior come from the original. Stage-add clock0 and gotoAndStop/stop frame/fps clocks differ; preserve per-clip clocks when switching actions, including hidden outgoing animation. Do not replace this with elapsed/duration swing windows. Source-supported exact60Hz serve resumes1→3 and releases on fifth fixed tick, but this formula is not a native Flash timing measurement.

Racket `hitTestPoint(false)` uses transformed global AABB; selection zones use actual contours flattened within0.01Joe-localpixel error. Numeric authority retains SWF precision; SVG matrix strings use exporter rounding. Mirror/scale matrices identically for both sides. Net contact also drives the original net animation; it persists across rallies.

AI retains last-toucher rejection. Human contact has no invented same-side rejection; rapid-input samples passing cannot establish that every own-recontact scenario is impossible. Held hit latches until release, and active actions cannot be canceled/restarted by repeated press.

Input `hitMove`/`hitJump` are server-internal coalescing locks, never accepted wire fields. Online clients cannot launch the shuttle or award points. Snapshots deep-copy nested player action/AI and score/ball data; preserve alias isolation.

## 4. Validation & Error Matrix

| Condition                                  | Observable behavior                                        |
| ------------------------------------------ | ---------------------------------------------------------- |
| Nonfinite/nonpositive dt                   | No advancement                                             |
| Excess elapsed time                        | At most0.25s/15frames catch-up                             |
| Paused/ended state                         | No AI or point timer progression                           |
| Held hit/repeated edge during active swing | No action restart                                          |
| Ground event with active point             | One point, then1.5s next-rally delay                       |
| Score reaches7                             | Winner and matchEnd, no repeated scoring                   |
| Score/phase/room boundary                  | Prediction/interpolation reset, no ball authority transfer |

## 5. Good / Base / Bad Cases

Good: both sides use shared player stepping and full source matrices while the server decides contacts and scores. Base: a serve event creates one upwards±40-degree1485-speed shot. Bad: changing draw scale without the numeric transforms, predicting ball collision, replacing fixed action events with wall-clock timeout, or modifying frozen source to make a test pass.

## 6. Tests Required

[Core tests](../../../tests/classic/core.test.ts) assert source-value movement/jump, both serves, custom action clocks, contact windows, opponent return, quick-input grids, net/top/side/wall/ground, single scoring, seven-point results, seeded AI and replay/pause. [Assets tests](../../../tests/classic/assets.test.ts) assert frozen hashes, origins, matrices, actual zone witnesses, visibility and extracted resources. [Prediction](../../../tests/prediction.test.ts) and [service](../../../tests/service.test.ts) check transport authority and completed-step ack.

Source-derived numeric assertions, extraction determinism and migrated replay are different evidence from unchanged SWF execution. Original Ruffle screenshots are compatibility-runtime evidence, not native Flash or exhaustive parity. Record limits in [validation](../../../docs/validation.md).

## 7. Wrong vs Correct

Wrong: retain community120Hz two-substep assumptions and reuse a single zero-based swing duration. Correct: use one60Hz step and original1-based independent clip clocks/events, shared frame geometry and server-authoritative ball.
