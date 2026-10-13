# Flash90302 human-versus simulation

## 1. Scope / Trigger

[ClassicSimulation](../../../src/shared/classic/simulation.ts), exported through [Simulation](../../../src/shared/simulation.ts), owns online human-versus mechanics. Shared code contains no DOM, Cookie, WS, service APIs or wall-clock timers. Source is unchanged Flash90302 in [reference](../../../reference/flash-90302/README.md); community `upstream/` is historical, never the parity oracle. No verified MIT grant.

The product roster is exactly `joe`, `nadia`, `harry`, `toaster`, `pirate`, `top-hat`, `red`. No AI, campaign, unlock state, Robot or Timmy runtime. Preserve their frozen reference files.

## 2. Signatures

- `new ClassicSimulation({characters?: Partial<Record<Side, CharacterId>>, seed?, cosmeticSeed?, cosmetics?} = {})`
- `setIntents(left: PlayerIntent, right: PlayerIntent): void`
- `update(dt: number): void`; bounded explicit fixed60Hz stepping
- `snapshot(): ClassicState`; version `flash-90302-v2`, plain deep-copied player/clip/bob/ball/score data
- `presentation(): PresentationJournal`; cursor and recent events, separate from gameplay restoration
- [stepClassicPlayer](../../../src/shared/classic/player.ts) is shared by authority and own-character Prediction; returns source action events and Toaster contact origin
- [assets](../../../src/shared/classic/assets.ts) provides character-aware geometry, animation and racket poses from generated source data

## 3. Contracts

World640×426, ground400, net317.25, player scale1.25, target7, pointDelay1.5s. Authority order: left actor, right actor, birdie, independent clip callbacks. Adult serve23/release7, Toaster27/release8; overhead27/contactEnd15, underhand19/contactEnd10. Preserve source stage-add clock0 versus stop frame/fps clocks and hidden outgoing clip progression. Do not replace with elapsed-duration swing windows.

Character constructor attributes are movement/jump/power; [registry](../../../src/shared/classic/characters.ts) pins all seven. Human Toaster can jump; base movement/contact precedes final bob y. Use returned `contactOrigin` for that frame, and original unscaled servePoint despite draw scale1.25. Pirate has shape220/depth21.

Racket hitTestPoint(false) is transformed global AABB; shot selection zones use source contours within0.01localpixel flattening error. Numeric data retains SWF precision; SVG matrices use exporter rounding. Mirror both sides identically. Human contact has no invented last-toucher rejection. Held hit latches until release; repeated presses cannot restart active actions.

`hitJump` is internal hit-time edge protection for burst sampling, never a wire field. Obsolete `hitMove` is removed. Prediction never launches the birdie, scores or emits authority effects. Snapshot nested clips/bob must not alias mutable state.

[Presentation events](../../../src/shared/classic/presentation.ts) have monotonically increasing match IDs and simulation tick. Limit128 groups, keep30ticks. Separate cosmetic RNG; enabling effects or changing cosmeticSeed must not alter gameplay replay/RNG. Tail emits pairs after source speed update before collisions; Toaster smoke follows source actor callback. Rendering owns particle movement, not authority.

## 4. Validation & Error Matrix

| Condition | Behavior |
| --- | --- |
| Nonfinite/nonpositive dt | No advancement |
| Excess dt | At most0.25s/15frames catch-up |
| Paused/ended authority | No point timer or score progression |
| Repeated press during active swing | No restart |
| Ground with active point | Exactly one point and1.5s next rally |
| Score7 | One matchEnd/winner; no repeated score |
| Score/phase/role/room/status boundary | Reset prediction history |
| FX disabled or alternate cosmeticSeed | Identical ball/score/gameplay RNG |

## 5. Good / Base / Bad Cases

Good: source geometry, per-role movement and shared stepping with server ball authority. Base: Joe defaults preserve source behavior and upward1485-speed ±40-degree serve. Bad: same Joe geometry for Toaster, final bob contact instead of pre-bob contact, extra servePoint scaling, or community physics reintroduced.

## 6. Tests Required

[Core](../../../tests/classic/core.test.ts): seven×two-side movement/jump/serve, Toaster release/bob/contact order, clip clocks/hidden playback, action latches, legal return, quick inputs, net/wall/ground, one score/seven-point result, replay/pause and cosmetic isolation. [Assets](../../../tests/classic/assets.test.ts): frozen digests, source values, transforms, shape witnesses, visibility, Pirate attachment, sounds/filter bounds and reconstructible schema2 outputs. [Prediction](../../../tests/prediction.test.ts) and [service](../../../tests/service.test.ts): role-aware replay, authority boundaries and completed-step ack.

Source-derived numbers and migrated replay are different from unchanged-SWF execution. Ruffle is a compatibility runtime, not native Flash. Preserve limits in [validation](../../../docs/validation.md).

## 7. Wrong vs Correct

Wrong: swap artwork only, collapse independent timelines, predict ball scoring or modify frozen source to satisfy tests. Correct: generate role-aware numeric/visible contracts from unchanged XML and keep server-owned ball/score with isolated presentation events.
