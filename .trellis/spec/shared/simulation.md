# Simulation, entities, and source reuse

## Ownership and environment independence

[Simulation](../../../src/shared/simulation.ts) owns players, shuttle, phase, score, server side, winner, rally, and impact state. It accepts logical PlayerIntent values and advances by explicit dt. Keep it independent of DOM, WS, Cookie identity, room creation, or client UI.

[config.ts](../../../src/shared/config.ts) owns world/player/racket/shuttle/match/AI tuning. The current world is 1600x900, groundY 780, netX 800, and target score 7. Keep rendering scale separate from these world coordinates.

`entities.ts` supplies Player/Shuttlecock geometry and state. Attached shuttle animation uses elapsed simulation time passed into updateAttached; it must not read browser performance time inside shared mechanics. AI uses the shared controller intent and flight prediction; practice currently supports normal/boss tuning.

## Mechanics reuse

[stepPlayer](../../../src/shared/player-step.ts) contains movement, acceleration, gravity, jump buffering/coyote time, swing queuing/recovery, and feedback timers. Both Simulation and browser Prediction use it. The server supplies a callback for held-hit readiness based on authoritative shuttle state; prediction's default callback does not synthesize those ball-dependent hits.

Shot launch, flight, racket/net collision, out/ground decisions, points, and winner remain in Simulation. [flight.ts](../../../src/shared/flight.ts) provides mutable/copy stepping of flight state with profile-specific drag; reuse it for AI and predictive trajectory calculations rather than creating another ball model.

`PlayerIntent.hitMove` and `hitJump` are optional internal locks preserving the hit-edge combination during server coalescing. Held state clears those locks. They must not be exposed as accepted client input fields.

## State and rendering

[Snapshot state](../../../src/shared/state.ts) is inferred with `ReturnType<Simulation["snapshot"]>` and `ReturnType<typeof serializePlayer>`. `serializePlayer` spreads own fields and clones the nested AI memory. Class methods/getters are not JSON transport; consumers hydrate existing class instances using Object.assign to access geometry methods.

Snapshot additions must remain serializable data and update their consumers/tests. Renderer reads positions/geometry/visual fields without deciding mechanics. Current snapshots include score and visual state; they are not full restoration checkpoints for every private simulation diagnostic.

## Regression evidence

[simulation.test.ts](../../../tests/simulation.test.ts) compares movements, jumps, swings, serve, flying shuttle, scores, and winner against the frozen community BadmintonGame over a full match without DOM. Attached shuttle bobbing intentionally uses a different time source, so the test does not compare that attached coordinate exactly. It also checks retained AI play.

Existing [flight](../../../src/shared/flight.test.ts), [math](../../../src/shared/math.test.ts), and [AI](../../../src/shared/ai-controller.test.ts) tests provide focused numerical coverage. [Prediction tests](../../../tests/prediction.test.ts) verify sharing the motion rules and replaying unacknowledged frames. Mechanics changes need observable regression evidence, not tests that mirror the implementation line by line.
