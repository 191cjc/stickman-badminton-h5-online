# Research: sustained input and presentation timing

- Query: Can main-thread stalls, input scheduling, batched snapshot receipt, or prediction recovery produce worsening interaction delay during a continuous rally? Which bounded fixes preserve protocol 4 and authority?
- Scope: internal; read-only inspection and deterministic in-memory execution of existing TypeScript modules, no browser or production actions
- Date: 2026-10-16

## Findings

### Evidence classification

Two reproducible timing behaviors exist in the current code: a long presentation pause leaves a much larger authority-to-render backlog than the configured interpolation delay, and scheduler callback cost can unnecessarily halve periodic input cadence. Repeated synthetic stalls reproduce a bounded deterioration over time. These are code-level reproductions, **not proof that the user's computer experiences these exact stalls or callback costs**. Rendering/cache/memory/device/network attribution requires the main session's sustained browser baseline.

No source, test, production, task metadata, or Git state was changed by this research. The only output is this file.

### Files found and related specs

| File | Responsibility / relevant lines |
| --- | --- |
| `src/client/input-scheduler.ts` | Single input timer, attempt spacing and late deadlines; lines 23–42 lifecycle/request, 49–55 early-fire protection, 57–89 successor deadline |
| `src/client/prediction.ts` | Local-only fixed-step prediction, commands and expiry; lines 69–157. `Interpolation` lives in this same file, lines 329–498 |
| `src/client/main.ts` | Input callback/send/accept at 192–204; snapshot receipt/push/reconcile at 332–369; RAF/sample/render at 464–509 |
| `src/client/network.ts` | Synchronous main-thread JSON parsing, receipt callback and message handling at 88–105; outgoing 64 KiB guard at 29–37 |
| `src/client/diagnostics.ts` | Bounded 240-value rolling measurements; frame/input/snapshot gaps and long tasks. Raw interpolation diagnostics are included through the supplied read callback |
| `tests/input-scheduler.test.ts` | Current no-burst/lifecycle/expedite tests; phase-grid assertions at 78–114 |
| `tests/prediction.test.ts` | Authority interpolation/monotonic jitter/stall tests at 113–221; current stream-pause case keeps RAF running |
| `tests/prediction-clock.test.ts` | Prediction ownership, acknowledgements, expiry and suspension; long callback gap at 239–265 |
| `tests/hit-timing.test.ts` | Legal visible-cue/hit timing and unchanged physics witnesses across all seven characters |
| `.trellis/spec/frontend/state-management.md` | Local player only, six-step/100 ms catch-up, bounded histories, monotonic authority interpolation, 0.25 s sample cap and 0.85–1.15 rate |
| `.trellis/spec/frontend/event-lifecycle.md` | One timer, attempts at least 1000/120 ms apart, no burst, transactional send, focus/reconnect lifecycle |
| `.trellis/spec/shared/protocol.md` | Protocol 4, 60 Hz simulation/input, 30 Hz snapshots, logical controls only, authority ownership |

### 1. Long main-thread stalls leave prolonged presentation backlog

`Interpolation.sample()` limits elapsed sample time to 0.25 s (`prediction.ts:424–427`) and limits clock catch-up to 1.15 normal speed (`428–433`). This is appropriate for ordinary jitter but means a blocked main thread cannot consume more than 17.25 ticks on the first resumed frame, even if a second of new authority is already buffered. The continuous cursor then recovers at at most nine excess ticks per second. Only the oldest retained frame imposes a lower bound (`437`), permitting up to 62 ticks / 1033.33 ms of retained backlog (32 snapshots at two ticks each).

The adaptive `delayMs` is a **target**, not the actual authority presentation gap. `diagnostics().availableMs` (`488–490`) is currently the actual latest tick minus render tick. A target under 67 ms can coexist with hundreds of milliseconds of old displayed ball state. Local player prediction is substituted separately in main (`481–490`), so the local character can react while the ball/remote character are visibly old.

Deterministic execution used a continuous playing segment, 3 s healthy warmup, 30 Hz immutable snapshots, 60 Hz sampling, then an interval in which neither receipt callbacks nor RAF were run. Every snapshot generated during the pause was delivered in order at the resume timestamp. No server delay, packet loss, transport reordering, physics change or boundary reset was introduced.

| Blocked duration | Actual gap immediately after resume | Actual gap one second later | Time until both actual gap and target delay are <=50 ms |
| --- | --- | --- | --- |
| none | 16.67 ms | 16.67 ms | healthy baseline |
| 300 ms | 45.83 ms | 48.21 ms | 2700 ms |
| 500 ms | 245.83 ms | 107.78 ms | 2700 ms |
| 1000 ms | 745.83 ms | 595.83 ms | 4683.33 ms |
| 2000 ms | 1033.33 ms | 883.33 ms | 6583.33 ms |

The 50 ms threshold here is a reproducible test threshold, not a physical latency target. On the healthy trace, authority gap alternates between zero and 16.67 ms due to packet/sample phase; target delay is 33.33 ms. All traces retained at most 32 snapshots, did not rewind, and eventually recovered.

Repeating a 500 ms blocked period every 2 s after the same warmup produced actual gaps of **231.89 ms at 6 s, 269.61 ms at 10 s, 307.93 ms at 20 s and 341.27 ms at 30 s**, while target delay stayed 66.67 ms. Repeating 1000 ms blocks reached the 1033.33 ms history floor. This proves a bounded accumulation mechanism consistent with the user's symptom, without requiring an unbounded leak. Whether any real rendering pattern causes comparable stalls is unknown.

#### Reproduction (stdin only; no repository writes)

```bash
node --import tsx --input-type=module <<'JS'
import { Interpolation } from './src/client/prediction.ts';
import { Simulation } from './src/shared/simulation.ts';
const base = new Simulation().snapshot(), period = 1000 / 60;
function snapshot(tick) {
  const state = structuredClone(base);
  state.phase = 'playing'; state.elapsed = tick / 60;
  state.players.right.x = tick;
  state.shuttle.state = 'flying'; state.shuttle.lastTouchedBy = 'left';
  state.shuttle.x = tick;
  return { type: 'snapshot', room: 'trace', ack: tick,
    ackTick: tick || null, tick, state, status: 'playing',
    reconnectRemainingMs: 0 };
}
for (const stalledFrames of [0, 18, 30, 60, 120]) {
  const buffer = new Interpolation(), queued = [], selected = [];
  let recovered = null;
  for (let frame = 0; frame <= 180 + stalledFrames + 600; frame++) {
    const now = frame * period;
    if (frame % 2 === 0) queued.push(snapshot(frame));
    if (frame >= 180 && frame < 180 + stalledFrames) continue;
    for (const value of queued.splice(0)) buffer.push(value, now);
    buffer.sample(now);
    const d = buffer.diagnostics(), after = frame - 180 - stalledFrames;
    if ([0, 60, 120, 300, 600].includes(after))
      selected.push({ afterMs: after * period,
        actualGapMs: d.availableMs, targetDelayMs: d.delayMs });
    if (after > 0 && recovered === null &&
        d.availableMs <= 50 && d.delayMs <= 50)
      recovered = after * period;
  }
  console.log({ stallMs: stalledFrames * period, recovered, selected,
    final: buffer.diagnostics() });
}
JS
```

For the repeated-stall trace, run frames 0..1800 and replace the `continue` condition with `frame >= 180 && (frame - 180) % 120 < stalledFrames`. Capture diagnostics at frames 360, 600, 1200 and 1800. Retain chronological receipt order and identical same-time batch timestamps.

### 2. Batched receipts inflate jitter and temporarily distort clock estimation

`push()` computes absolute receive-gap minus server-gap and inserts it into a 60-sample p90 (`prediction.ts:382–392`). A single 300+ ms pause has one long receive gap followed by several nearly zero receive gaps; each zero gap contributes about 33.33 ms of apparent jitter. The target therefore rises from two to about four ticks even though the simulated transport is perfectly regular. The coefficient 0.025 plus the 60-arrival rolling history makes that extra delay outlast the pause. This is expected under the current algorithm, not a newly established network fault.

Clock correction also slews once per queued receipt (`393–399`). Old snapshots processed at the same time can pull the estimated clock backwards relative to the latest packet by multiple half-tick corrections. A recovery fix that merely jumps the cursor to the old `desired` estimate may retain unnecessary backlog. Resume recovery should use actual buffered authority and reestablish a coherent clock reference if it performs a discontinuity rebase.

The browser WS API does not expose a reliable server-generation/local-delivery timestamp without a protocol extension. Main-thread delay and TCP/network batching cannot be fully separated from `performance.now()` calls inside message handlers alone. Correlate long tasks/frame gaps with receipt gaps rather than claiming causal classification.

### 3. Scheduler re-applies spacing after callback completion

The scheduler records attempt **start** as `lastAttempt = at` (`input-scheduler.ts:61`), but normal successor selection skips a complete period when the future grid is less than `minSpacingMs` after `afterStep` (`86–88`). That unnecessarily reserves another 8.33 ms after synchronous callback work, although the wire contract only requires 8.33 ms between attempt starts. A callback at 17 ms taking 9 ms finishes at 26 ms; the 33.33 ms grid is 16.33 ms after the attempt and therefore safe, yet the current code skips it because it is only 7.33 ms after callback completion.

A fake monotonic timer executing the actual current `InputScheduler` for one second produced:

| Simulated synchronous step cost | Late dispatch added to every timer | Attempts in 1000 ms |
| --- | --- | --- |
| 0, 4 or 7 ms | 0 ms | 60 |
| 8 ms | 0 ms | 40 |
| 9, 10 or 12 ms | 0 ms | 30 |
| 0 ms | 5 ms | 59 |
| 0 ms | 9 or 10 ms | 30 |

The cost cases demonstrate avoidable under-sampling. The late-dispatch cases are a related consequence of insisting on a phase grid: if a callback is late by more than half a period, the next grid is skipped altogether. A retimed deadline can maintain the global attempt spacing without discarding a whole additional period. Neither trace demonstrates the actual game's callback costs; main-thread rendering contention also delays timers without increasing measured `step()` cost.

Reproduction: temporarily override `globalThis.setTimeout/clearTimeout` in the stdin process with a map `{token: {fn, at: now+delay}}`; instantiate `InputScheduler(() => {attempts.push(now); now += cost}, () => now)`. Execute the next pending timer chronologically at `max(now, at+lateness)` until 1000 ms, then stop and restore globals in `finally`. For cost 9 ms first attempts are `[17, 50, 84, 117, 150, 184, 217, 250]`; cost 0 ms gives `[17, 34, 50, 67, 84, 101, 117, 134]`. Do not run this monkeypatch inside a browser/production process.

### 4. Prediction is bounded and intentionally suspends after large callback gaps

`Prediction.advance()` (`prediction.ts:69–157`) caps catch-up to six steps / 100 ms, expires old ledgers after two seconds, and suspends after a >100 ms gap. On expiration it clears commands, steps, held intent, accumulator and offset and restores the last actual authority. Reconciliation with the same acknowledgement keeps prediction suspended; advancing ack or an explicit lifecycle reset can recover it (`reconcile`, especially same-fallback generation handling). Existing prediction-clock tests cover no retroactive direction, no edge resurrection and acknowledgement recovery.

The command ledger (240), step ledger (120), interpolation snapshots (32), and jitter history (60) are bounded. Retaining a stale ack can suspend immediate local response but cannot by itself accumulate unlimited replay work. Frequent renderer stalls may repeatedly trigger bounded fallback/correction and visible pullback; this is a secondary effect to correlate with diagnostics. Do not relax expiry or replay stale edges merely to hide this symptom.

## Recommended bounded change and tests

1. **First confirm parent baseline metrics.** Compare actual presentation gap (`availableMs`) with target delay, callback/frame stalls, input start cadence and prediction expiry. Rolling metrics alone omit early data; persist early/late windows externally. Use same characters, viewport and DPR.
2. **Add explicit forward-only presentation recovery after an abnormal sampling pause**, or when actual backlog is clearly beyond the normal allowed buffer. Rebase to an actual point within the current compatible authority segment near the latest tick minus target delay, clamp between oldest/latest available authority and at least the previous cursor, and reestablish a coherent clock reference. Keep normal 0.85–1.15 jitter slew for ordinary frames. Avoid replaying seconds of obsolete visual trajectory simply to preserve a smooth slow catch-up. This is a bounded visual fast-forward, never client ball simulation or extrapolation.
3. Make the recovery threshold/allowed gap explicit and test it. Do not automatically rebase on every packet, every 30/60 Hz sample phase or a mere outlier; that would reintroduce uneven motion. A main pause criterion around the existing 250 ms sample cap is a candidate, not a finalized requirement. Preserve hold-last when authority is absent and semantic resets when score/room/phase/status/role changes.
4. **Measure and correct input cadence ownership** if included in scope: successor eligibility should respect actual attempt-start spacing; callback execution time already counts toward that spacing. When the grid is too near, retime to a safe future deadline instead of always losing another full period. Preserve one timer, ceiling waits, <=1 attempt per callback, no post-stall burst, expedited coalescing, transactional send, start/stop generation and global minimum spacing. Existing phase-grid tests at lines 97–114 intentionally require skipping a near grid and would need an explicit behavior-contract update if replacing that policy.
5. **Meaningful regressions:** add a paused-main-thread/batched-receipt trace distinct from the current stream-only pause. Assert bounded recovery after 300 ms/1 s/2 s, repeated stalls do not grow display backlog, sample never passes latest or rewinds, interpolation never crosses ball-contact/semantic boundaries, and unavailable authority still holds. Include no-stall identity/healthy cadence and lifecycle reset traces. Add scheduler synchronous-cost and late-dispatch cases, assert start gaps >=8.33 ms, no timers resurrect, no burst and improved actual cadence rather than private deadline assignments. Keep unchanged legal-hit tests and prediction ownership/expiry tests.

## Risks and compatibility

- Forward recovery visibly skips obsolete movement/particles after a real freeze. It is preferable to retaining hundreds of milliseconds of old ball state, but should happen only on an abnormal gap. Effects already follow presentation authority tick, so inspect event expiry/sound duplication when the cursor advances; do not independently replay all missed effects.
- Repeated severe stalls cannot be fixed by timing alone: frame time/input still stop during the block. Renderer/cache/asset changes remain necessary if the parent baseline identifies those costs.
- Lowering target interpolation delay globally, inventing predicted ball contacts, raising catch-up without a work bound, or switching WS frameworks does not address this proven backlog mechanism.
- Protocol 4, JSON wire payloads, server simulation/contact/score, original source physics/actions/assets and other services can remain unchanged.
- No external references were used: conclusions are derived from the current project code and deterministic Node execution. No browser profiling, network trace, physical input measurement or sustained user-device evidence was collected by this agent.

## Caveats / Not Found

- No evidence here of an unbounded timer/listener/history leak. Controller creation is page-scoped; input has one pending timer; snapshots and jitter remain bounded.
- The synthetic snapshots intentionally keep one continuous playing semantic segment; real score/phase changes reset interpolation and may conceal/reset the backlog. Real matches can still exhibit the mechanism within long rallies.
- Existing tests cover a 450 ms network stream pause while sampling continues, not a blocked browser main thread where sampling and receipts both stop. Passing those tests does not refute the reproduction above.
- Distinguishing main-thread and transport causes with certainty needs additional observation; receipt timestamps alone do not supply packet-generation time.
