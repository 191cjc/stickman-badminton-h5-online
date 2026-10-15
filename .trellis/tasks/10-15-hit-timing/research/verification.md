# Hit timing verification

## Frozen baseline

- Source baseline: a9a0a88. Production frozen release: 20261014T064853Z-fisoonline (protocol3).
- Before changes, prediction/core/service:59 tests passed. Equal400ms rightward movement at30Hz packet sampling advanced authority24steps to x240, but v3 prediction12steps to x195;45-unit correction triggered snap. At60Hz both were x240. This is a deterministic sampling discrepancy, not an observation of the user's network.
- Baseline browser served the frozen release on backend18815/static proxy18816 after HTTP200 page/session and health protocol3 checks. Production8794 and its queue were not used.
- Two guests, Toaster/Pirate,1440x1000, original filters: scripted DPR1/2 before/after workload. Before frame gap p95:33.4/33.4ms atDPR1,50.1/50.0ms atDPR2; RAF CPU p95:3.1/3.0ms and6.7/6.2ms. Headless shared-host measurements are a regression guard, not physical player FPS or delay.
- Frozen protocol3 ordered stream model: server snapshot delay65..155ms, client input/release35ms, one450ms pause. Natural7:0 result,691 same-tick full states compared identical,0 page/console errors. Both continuous presentation clocks reported0 rewinds. This is ordered TCP-style delay/stall injection, not arbitrary WS message loss or a UDP packet-loss test.
- Raw, ignored evidence: artifacts/flash-versus-verification/performance-hit-timing-before.json and network-hit-timing-before*.json. Full per-tick raw states are not Git artifacts.

## Implemented regression evidence

- Implementation focused set:10files/133tests passed, including native logical-change scheduling, actual Network false/throw/backpressure transaction, real-service ackTick/legacy/seat/lifecycle and source-mechanics cases; lint/typecheck passed before independent review.
- Equal400ms held motion at60/30/15Hz accepted commands now runs24steps and reaches x240 with correction0;120Hz changes or100same-time commands cannot accelerate it.
- Actual frozen-v3/current Interpolation comparison uses identical30Hz snapshots, two-tick downlink/uplink, one reaction tick plus next60Hz sample. A180tick stable pre-roll establishes the clock before selected source-law flight. Both sides/all7roles/even snapshot phase: same displayed-flying cue, old consumes d8/miss, new d6/legal return. Odd phase adult zero-lead remains d9miss/d7miss; equal1tick anticipation yields d8miss/d6hit. Odd phase Toaster zero-lead restores d9miss/d7hit. This fixture is not a recorded native-SWF rally, Canvas timing or public latency measurement.
- Counterexamples preserved: low-return Joe d2hit/d4miss; Toaster d2miss/d4hit; out-of-reach remains miss. Ball authority, original geometry/timing and score are not relaxed. Details in implementation-report.md and tests/hit-timing.test.ts.

## Final verification

- Independent full-scope review: no unresolved application blockers; fixed only causal cue-test sweep/explicit enqueue/source numeric expectations and test formatting. Review report records focused91 plus final targeted13tests, lint/typecheck/format/diff passed.
- Root final lint/typecheck exit0; full18files/229tests passed in24.10s; Vite/esbuild build passed. Client JS index-CmSNjPiL.js, CSS index-CMOCPJtZ.css.
- Final isolated HTTP page+two hashed assets/manifest/four SVG hashes/Cookie/current handshake passed. Legacy1/2/3 returned mismatch/1008 without binding the guest; same-cookie4 then greeted normally. Old private reference directories are not served by the isolated prefix proxy.
- Two independent real Chromium guests, Joe/Joe: native left serve and right S return accepted by authority at tick90, rallyHits1/right touch;48 corresponding full states identical,0 browser errors. This integration check uses the received server state to cue the automated keypress, not a human-visible reaction policy or delay claim. Screenshot retains original scene/filter/tail. End by native Esc/leave.

- Same two-page1440x1000 Toaster/Pirate native-control workload after build, original filters intact: frame gap p95 before→after DPR1left33.4→16.8ms/right33.4→16.8ms;DPR2left50.1→50.0ms/right50.0→50.1ms. Long tasks before→after0→0/3→0/3→4/3→5. Rendering is untouched; shared-host short-run variance cannot be attributed to a guaranteed FPS improvement. HighDPR still stalls.

- Full final ordered65..155ms snapshot/35ms input-release/450ms stream-pause run:732 corresponding complete authority states identical, both peers natural7:0,0 page/console errors. Default diagnostics absent, debug API frozen and finite, input logical shape unchanged and all observed ackTick values valid. Synthetic blur stops/releases input and focus resumes, actual routed transport closure pauses/resumes the retained Cookie seat with no residual velocity, new room/rematch and native Esc/leave pass. Raw report includes rematchAndLeave:true.
- Earlier close injection directly closed the native socket behind Playwright's routed WebSocket mock. The mock remained OPEN temporarily and forwarded a delayed send to that closing native transport, producing a console message from the injected wrapper. Short isolated reproduction traced this instrumentation issue; closing both sides through Playwright route APIs and cancelling pending fault timers gives0errors, then the full scenario was rerun successfully. No application fix or error suppression was used. Failed first harness report retained as network-hit-timing-after-harness-probe.json.
- Actual debug input cadence under the heavy routed scenario was about28..29Hz, not constant60Hz. Predictor time no longer depends on that count. Final interpolation starvation entries left/right18/34 (old baseline17/13, with different lifecycle/reconnect workload);0 rewinds and no ball extrapolation. Reduced buffering has less jitter margin and can hold more often. Do not infer universal smoothness/physical-latency gains from these counters. Approximate prediction fallbacks and bounded stall expirations occurred and remain exported in raw diagnostics.
- Final isolated backend/proxy were stopped after rooms0/queued0. Public pre-release health still protocol3,60/30Hz,rooms0/queued0. Production release preparation started only after all preceding gates.

## Production publication

- Current release:20261015T065916Z-hit-timing. Previous/rollback:20261014T064853Z-fisoonline. Both frontend/backend switched; project service restarted2026-10-15 15:00:30CST, PID3070473,active/running; Nginx syntax/reload successful. Health protocol4,SIM60,SNAPSHOT30.
- Publish repeated npmci/lint/types/229tests/build successfully. Initial loopback health preceded bind and retry passed. Final public HTTP connection closed with UND_ERR_SOCKET after the switch, so publish script exit1. The service was not restarted again: separate public HTTP checker, all legacy/current handshake checks, exact final-build index/JS/CSS comparison and public match all subsequently exited0. This operational recovery is explicit, not represented as a clean exit0 of the original publish invocation.
- Public old1/2/3 mismatch/1008 did not bind the guest; same-cookie4 hello valid. HTML/JS/CSS match final build, manifest/four source SVG hashes valid, production Cookie secure attributes present; private reference/upstream URLs404.
- Empty rooms/queue confirmed before public match. Two protocol guests (no browser) completed7:0,614 equal full same-tick states, movement/jump/rematch/leave passed. Final rooms0/queued0; journal has normal startup/create/finish/reclaim entries, no observed service errors.
- Fingerprints unchanged for shared HTTPS config, three old snippets and production environment; env remains0600. Cloud/flash-global-data service PIDs/start times unchanged. Deployed dist equals final local files. Project-only current/previous correct. Raw before/after fingerprints and publish/match reports stay ignored; no credential output or commit.
- Isolated18815/18816 listeners stopped. Production rollback was not exercised. Recovery command: `bash scripts/rollback.sh 20261014T064853Z-fisoonline`; refresh both pages and verify protocol3 using that revision's checker (current checker intentionally expects4).

## External acceptance still pending

Physical separate computers/public networks, real key-to-display timing, subjective repeated return rhythm, touch and other browsers. Lower configured wait is not a public latency promise; highDPR rendering and ordered-stream stalls can still pause. No original ball physics/action range/art/effect change, full rollback, local ball prediction or provisional score was introduced.
