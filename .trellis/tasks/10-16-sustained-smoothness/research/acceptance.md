# Sustained acceptance evidence

## Comparable600s run

Baseline `4cf4570` and final reviewed source use the unchanged driver `artifacts/flash-versus-verification/sustained-soak.mjs` (SHA256 `9480dd784c9f60c590c19a0659669ba53b84a104679bf56fc84c4afd5206b3d1`). Both run after code/build/isolated HTTP checks, using two independent local headless Chromium guests,1440×1000/DPR2, Toaster/Pirate, original filters,50ms DOM-input bot and4s natural-result dwell/rematch. The source game state, wire stream and physics are not modified. This is mixed active/result/rematch work, not one continuous rally or human reaction measurement.

Baseline:600.456s,61observations,18rooms/17natural results,15,861matching authority states,0browser errors. After:600.204s,61observations,19rooms/18natural results,15,855matching authority states,0browser errors. Raster/color/interpolation bounds and no rewind passed throughout. Higher render/input throughput changes match timings; do not imply frame-identical replay or a perfectly controlled host.

| Measurement, left/right | Baseline early | Baseline late | After early | After late |
| --- | --- | --- | --- | --- |
| Frame gap mean(ms) |50.21/50.90|61.07/61.24|21.18/21.21|17.92/17.88|
| Frame gap p95(ms) |83.4/83.4|133.3/133.3|33.4/49.9|33.3/33.2|
| Largest frame gap(ms) |533.4/516.6|616.6/600.0|666.5/650.1|116.7/133.3|
| Long-task p95(ms) |107/94|199/215|232/173|73/77|
| Accepted input rolling rate(Hz) |10.32–12.73/8.86–12.22|9.22–10.35/9.21–10.59|13.09–60.22/9.92–60.05|58.53–61.02/58.27–61.29|
| Sampled JS heap(MiB) |3.65–11.54/3.85–7.82|4.83–8.27/4.39–6.27|4.17–17.09/4.22–9.41|5.30–23.56/6.72–23.88|

Windows retain actual driver predicates: end label<=120s and>=480s. Drained entering intervals make late span about130s; counts are not equal-duration rates. Late long-task observations fell from640/633 to4/8, but small after samples make percentiles less stable. Early maxima/conditional long-task p95 were worse after: cold transitions still produce stalls. Do not claim all freezing removed.

Sampled JS heap ranges are higher after and vary with GC/greater throughput/instrumentation; this is not a JS-memory improvement claim or proof of leak absence. No comparable full-process/GPU-memory after run was collected. Cache bytes are bounded RGBA estimates, not browser memory. The separate synthetic event regression fixes a proven retained-ID lifetime, without attributing baseline degradation to it.

## Density and raster work

CSS court stays1272×846. At10s sampling resolution, both pages show world caps2.8 at30s,2 at40s,1.4 at70s; left reaches1 at120s, right at220s. Each has exactly4useful decreases, no increase across rematches; backing changes2544×1692→1793×1193→1281×852→897×596→641×426. Lower sharpness is the user-approved trade-off, not a source-art/effect deletion.

Within adjacent unchanged-room `playing` endpoints, baseline left320s has4902misses/4784evictions (~15.32/14.95per second), right310s4817/4734 (~15.54/15.27). After both320s: left1144/554 (~3.57/1.73), right1130/554 (~3.53/1.73). Restricting after to unchanged density too gives310s left891/340 and right865/324. Explicit scene clears and density invalidations remain in cumulative totals; do not label every eviction as capacity churn.

Final main cache: baseline57entries/66,112,444bytes and50/66,944,656; after98/17,508,416 and120/22,646,600. Final misses8386/8627→3139/3328, allocation failures0 throughout. Effects remain source-filtered; cache64MiB and separate confetti32MiB limits unchanged.

## Other acceptance

Default-debug-off two-page DPR2 checks passed: all seven choices retain aria-pressed selection; no diagnostic global is installed. Research-only80ms busy work before each RAF triggers finite decreases to641×426 while CSS remains1272×846. Original spark/tail/smoke SVGs and tinted-confetti draws were recorded through actual Canvas calls; original AudioBuffer sources started on both pages. Both pages reach a natural result, retain their density through the next native rematch and remain at the floor after5s without forced load. Zero page/console errors; screenshot inspected for unchanged scene/layout with the accepted softer detail.

The first research probe used2.5s result dwell/75s deadline and only reached2.8 before its floor assertion failed. That transient-heavy workload did not provide the required stable observation/grace/cooldown windows. The final fixture holds the first natural result45s, retaining actual source effects and server lifecycle, and passes at about94.3s. No product threshold/code was changed to make the fixture pass. Raw probe log is retained separately.

Ordered-network browser check passed:65..155ms snapshot delay,35ms input/release, one450ms ordered stream stall. Both guests receive737identical corresponding full authority states and natural7:0 result, with zero page/console errors. Actual blur releases input/stops sends until focus, retained-Cookie reconnect clears held movement, native rematch enters a new room and Esc ends it. Input payload shape and ackTick, finite/frozen debug diagnostics and default API absence passed. This is TCP ordering/delay/stall, not real packet-loss or physical latency evidence.

The short native two-page filtered regression also passed atDPR1 and2. Frame-gap p95 was16.8/16.7ms atDPR1 (zero long tasks),33.4/33.4ms atDPR2 (one285/292ms long task). This shorter workload is not another sustained A/B comparison and does not eliminate the cold-raster limitation. No product source changed after the independent review/build.

Deterministic continuous-segment blocked-sampling/batched-receipt recovery, scheduler cadence and effect lifetime evidence is in [timing implementation](timing-implementation.md) and the269-test full quality gate. Actual publication is recorded separately.

Raw comparison JSON/logs and driver remain in ignored `artifacts/flash-versus-verification/`. Real dual-computer/cross-browser/input-to-photon measurement and subjective sharpness remain external acceptance. No latency/FPS guarantee follows from this shared-host result.

## Publication and isolation

Published `20261016T061913Z-sustained-smoothness`; previous is `20261015T065916Z-hit-timing`, both protocol4. Own service restarted2026-10-16 14:20:54Asia/Shanghai,PID3432452,active/running. Publication-required lint/types/269tests/build and Nginx validation passed. First loopback bind check retried successfully. Final public fetch closed remotely with `UND_ERR_SOCKET`, making publish.sh exit1 after switch/restart/reload; independently rerunning the official HTTP checker passed (exit0), without another restart. Byte comparison confirms public HTML/JS/CSS and release metadata/server match the accepted build. Do not hide this operational recovery as an initial successful script exit.

Before/after resource fingerprints confirm unchanged shared HTTPS config, three old snippets, original community source, cloud/flash-global-data service PIDs/start times and production env hash/0600mode. Public health4/60/30,rooms0/queued0; all three existing entrances200. No public matchmaking/browser run or production rollback drill was performed. The isolated server and its own backend stopped;18815/18816are free. Rollback command and actual release details are in `docs/deployment.md` / `docs/validation.md`.
