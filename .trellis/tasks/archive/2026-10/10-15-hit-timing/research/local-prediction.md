# Local prediction and sampling evidence

Baseline: clean `a9a0a88`, branch `feat/loading-screen`; no runtime changes.

## Confirmed owners

- `src/client/main.ts:191`: paced sender commits edges/seq only after the local socket accepts a command; one `prediction.apply` follows an accepted command.
- `src/client/prediction.ts:27`: every apply runs exactly one shared `stepClassicPlayer(..., 1/60)`; reconciliation at line 36 drops `seq <= ack` and replays each remaining command once.
- `src/server/service.ts:508`: authority consumes the latest held command/merged edges and runs a fixed step independently of message count; acknowledgement follows simulation.
- `src/shared/protocol.ts:15`: input has a sequence and logical operations, but no presentation reference or input-time mapping. A snapshot has tick/ack but not the tick at which a newly acknowledged command first took effect.
- `src/client/prediction.ts:94,144`: interpolation starts at 4 ticks (two 30-Hz snapshots), adapting to at most 12. Ball/remote rendering can be substantially behind the locally predicted actor.

## Deterministic read-only experiment

Run with `node --import tsx --input-type=module` against the current modules:

1. Create `Simulation({cosmetics:false})`; clear left player's serving lock.
2. Create/reconcile left `Prediction` from tick 0.
3. Run authority for 24 fixed ticks, holding move=+1 with no hit/jump.
4. Call local `Prediction.apply` at every authority tick, or only every other tick.
5. Compare positions, then reconcile one tick-24 snapshot acknowledging all commands.

| Sampling | Elapsed | Commands | Authority x | Predicted x | Correction | Snap  |
| -------- | ------- | -------- | ----------- | ----------- | ---------- | ----- |
| 60 Hz    | 400 ms  | 24       | 240         | 240         | 0          | false |
| 30 Hz    | 400 ms  | 12       | 240         | 195         | 45         | true  |

This proves an elapsed-time mismatch under reduced sampling; it does not establish the user's actual sample rate or cause of every reported pullback. Existing prediction/core/service tests passed 59 cases before changes.

## Consequences for design

Merely sending more packets after a stall is invalid: the server coalesces them, and packet count must never accelerate gameplay. A local elapsed-time accumulator must continue previously accepted held input at 60-Hz fixed steps, consume press edges once, and bound catch-up/history. New unsent edges remain transactional. Prediction advances from the last known accepted logical input rather than inventing successful sends.

Correct replay needs more than replacing `1/60` with an arbitrary callback delta. Shared action clips and physics retain exact 60-Hz steps, and a sequence is not a simulation tick. A possible minimal server metadata addition is `ackTick`: the first completed room tick that consumed the current ack command. On a held step, ackTick stays fixed even as snapshot.tick advances. That lets replay account for already-simulated held frames instead of assuming one packet equals one tick. Reset/discard/reconnect behavior must be specified if this approach is selected.

An alternative is explicit monotonic input-time/server-clock alignment, but that introduces clock-offset estimation and must justify the larger protocol surface. Neither approach should trust a browser timestamp as authority or infer an input-to-display latency from RTT alone.

## Required behavioral checks

- Equal-duration held motion at 60/30/15-Hz sends with 60-Hz fixed local steps.
- A long callback gap: bounded fixed catch-up, no wire burst, no arbitrary-delta source physics.
- Ack after several authority-held ticks, burst coalescing, duplicate snapshots, and an ack command absent from retained history.
- One jump/hit edge across several local held steps; no restart/cancel of active original swings.
- Real send rejection retains edges/seq and does not introduce a predicted new command.
- Room/role/score/phase/status/focus/disconnect resets clear timing anchors and histories.

These belong in prediction/scheduler/input/service tests and in before/after opt-in diagnostics. Renderer/filter attribution and headless performance remain separately labeled.
