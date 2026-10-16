# Baseline: sustained two-page online play

## Scope and reproducibility

Date2026-10-16, baseline commit `4cf4570`, task status planning. No product code, service configuration, source artwork, protocol or deployed release was changed. Only this task's planning/research files and ignored local verification artifacts were written.

Before browser collection: `npm run lint`, `npm test` (18files/229tests), and `npm run build` (includes typecheck) passed. An isolated subset of the existing HTTP checker verified page200, both build assets, health protocol4/60Hz/30Hz, manifest source/schema/507file entries, four original SVG hashes, Cookie flags and current WS greeting. Existing production entrances were not routed through the isolated server and were not falsely claimed as checked locally.

Temporary server: `node artifacts/flash-versus-verification/server.mjs`, serving the unchanged build on loopback18816 with its own development backend18815 and isolated guest cookies. Chromium came from the existing local research installation; no dependency/package changes were made. Both ports were stopped after the run, with the server's own shutdown handler stopping its backend. No production guest was queued and no production/systemd service restarted.

Run command: `node artifacts/flash-versus-verification/sustained-soak.mjs baseline` (default600seconds). Driver SHA256: `9480dd784c9f60c590c19a0659669ba53b84a104679bf56fc84c4afd5206b3d1`.

Environment/workload:

- Two independent headless Chromium contexts on the same shared host, viewport1440×1000, DPR2, original SVG filters intact, Toaster/Pirate selected.
- Actual CSS Canvas1272×846, backing2544×1692; world density is about3.97device pixels per world unit. DPR1 alone would still leave roughly1.986world density at this CSS size.
- A50ms research-only DOM keyboard-event bot invokes the product's actual input listeners: repeated6s movement pattern,2.4s jump period,600ms hit period. It never writes player/ball/score/clock state, bypasses input ownership or alters wire delivery.
- Natural results dwell4s before the native rematch button's click handler is invoked. This is a mixed active-play/result/rematch workload, not one continuous human rally. DOM synthetic inputs establish integration/resource behavior, not human reaction latency or trusted physical-key behavior.
- Diagnostics enabled via `?debug=1`; bounded research frame/long-task windows and CDP JS heap/node counters sampled every10s. Original game controllers and protocol remain unchanged. Instrumentation and shared-host software rendering affect absolute numbers.

## Results

The driver exited0 after about600.46seconds with61observations,18matched rooms,17natural completed results,15,861corresponding authoritative state comparisons equal and0browser errors. The source-defined game still functions during this workload; it does not establish that presentation is smooth.

| Observation | Left early | Left late | Right early | Right late |
| --- | --- | --- | --- | --- |
| Frame gap mean |50.21ms|61.07ms|50.90ms|61.24ms|
| Frame gap p95 |83.4ms|133.3ms|83.4ms|133.3ms|
| Largest frame gap |533.4ms|616.6ms|516.6ms|600ms|
| Collected frame gaps |2390|2128|2357|2123|
| Long-task count |510|640|535|633|
| Long-task p95 |107ms|199ms|94ms|215ms|
| Observed JS heap range |3.65–11.54MiB|4.83–8.27MiB|3.85–7.82MiB|4.39–6.27MiB|
| Rolling accepted-input rate range |10.32–12.73Hz|9.22–10.35Hz|8.86–12.22Hz|9.21–10.59Hz|

Window definition is the unchanged driver's actual predicate: early samples have end label<=120s; late samples end>=480s. Each drain includes frames since the previous observation, so the late collection includes its entering10swindow and spans roughly130s rather than an exact120s. Do not compare long-task/frame **counts** as equal-duration rates. Percentiles describe this mixed lifecycle workload, and phase/host variance prevents claiming a universal deterioration curve. After comparison must retain the same driver/window semantics or explicitly document a correction.

Final main-raster counters:

| Client | Entries / estimated bytes | Hits | Misses | Evictions | Allocation failures |
| --- | --- | --- | --- | --- | --- |
| Left |57 /66,112,444|353,302|8,386|8,329|0|
| Right |50 /66,944,656|346,825|8,627|8,577|0|

Both remain inside256entries/64MiB. Evictions include explicit scene clearing, so totals alone cannot attribute churn. Restricting adjacent observations to unchanged match count and both endpoints `playing` still gives:

| Client | Eligible adjacent windows | Approx duration | Raster miss delta | Raster eviction delta |
| --- | --- | --- | --- | --- |
| Left |32|320s|4,902|4,784|
| Right |31|310s|4,817|4,734|

These within-room windows establish continued raster rebuilding without room replacement, although they do not isolate the exact individual source/frame or prove that all frame stalls come from the cache. Source frames/cadence and current working-set inventory make content sharing and adaptive density justified next measurements.

Confetti raster caches finished empty after the newest room reset; cumulative misses/evictions were2,258left and2,251right. All recorded raster allocations stayed within existing bounds, color cache<=64, pending color URLs<=768, interpolation snapshots<=32 and no interpolation rewind was reported.

An additional read-only OS sampler observed only the isolated browser process tree partway through the run:13samples over361.5s, aggregate PSS1,640.7–1,706.5MiB. This includes browser/render/GPU/source-image storage rather than just JS or the64MiB application cache. It is not a whole-run memory baseline or proof of a browser leak. It demonstrates why cache RGBA estimates cannot be advertised as total process memory. Sampled JS heap did not show monotonic growth; garbage collection and unmeasured GPU resources prevent declaring all memory behavior solved.

## Interpretation and limits

The isolated workload exhibits worse late frame-gap statistics and continued within-room cache churn, while authorities agree and JS heap stays in a similar range. This supports reducing raster work/internal density and fixing proven stall-recovery behavior. It does **not** identify the user's hardware/network cause, prove a normal-play unbounded memory leak, establish physical key-to-photon latency or predict a guaranteed FPS improvement on another device.

Separate timing research proves a long blocked main thread can leave up to roughly1s of old presentation and recover slowly; the browser's target interpolation delay alone does not expose that gap. Separate Effects stress research proves suppression metadata retention under deliberately starved synthetic journals; the baseline did not attribute its frame degradation to that path.

Next acceptance: run the same600s driver after implementation, compare matching metrics with original effect contents and actual backing density recorded, and add targeted DPR1/default-debug-off, source visual/effect, focus/reconnect/leave/rematch checks. Keep physical dual-machine and other-browser feel explicitly pending.

Ignored raw artifacts retained locally:

- `artifacts/flash-versus-verification/sustained-soak.mjs`
- `artifacts/flash-versus-verification/sustained-baseline.json`
- `artifacts/flash-versus-verification/sustained-baseline-process-memory.json`
