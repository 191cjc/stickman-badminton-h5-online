# Final verification — network smoothness

Baseline332b06e / production20261013T110500Z-versus. Final JS index-DKa9Z-SC.js104.83kB, unchanged CSS index-CDPOmVno.css6.80kB. Backend157.8kB is byte-equal to the previous production release. Final independent review, lint/typecheck/build/diff/format passed;14files/185tests passed. Shared/server/public/reference/upstream runtime and assets unchanged; no framework/dependency/protocol migration.

## Final-build HTTP and source

Loopback18815/18816: HTML +2built assets200, all507classic SHA-256/MIME correct, seven roles/eight sounds/schema2, CSP blob images, protocol3/60Hz simulation/30Hz snapshots. Same Cookie v1/v2reject1008 before v3success; private reference/source URLs404. Final HTTP preceded final browser work.

## Rendering comparison

Same isolated headless Chromium executable/flags, two independent Cookie pages,1440×1000,Toaster/Pirate,move/jump/serve,2s initial warmup then~8.3s observation. Both baseline and final acceptance retain original SVG filters. Test-only no-filter response rewriting was attribution, never a product change.

| DPR / side | old frame interval p95 | final p95 | old/final long-task count |
| --- | --- | --- | --- |
| 1 / left |116.7ms|16.8ms|83 /0|
| 1 / right |116.7ms|16.8ms|79 /0|
| 2 / left |433.3ms|50.0ms|27 /3|
| 2 / right |450.1ms|50.0ms|26 /3|

Final warmed DPR2 long-task max58/62ms. Raw baseline right DPR2 p95 is450.1ms (corrected an earlier research-table transcription466.6). RAF JS duration(~1ms before) omitted deferred browser raster work. First implementation index-D_1GqhSC also passed performance16.7/50ms; final scheduler grid/rounding follow-up was rebuilt and rerun rather than assuming those first-build results still apply.

## Presentation and ordered network

Fixed old/new timeline trace: uniform held frames3→1, jitter26→4, ordered450ms stall47→32; stall rewind1→0 (old1.32ticks maximum), zero beyond-latest-authority observations. Algorithm unchanged by final pacing follow-up.

Final Playwright routeWebSocket preserves order, snapshots65..155ms delay, input/release35ms, one450ms stream stall window. Baseline natural7:0 and853identical corresponding authority states; final natural7:0 and693identical states, both diagnostic rewinds0, no page/console/protocol errors. Same injected delay profile; variable state-pair counts/window loads are not a latency metric. This models TCP stream delay/pause/burst, not actual packet loss. Initial baseline run timed out without checkpoint and was inconclusive; rerun saved raw wire checkpoint and passed.

Final routed/headless diagnostic accepted sample rates~38/45Hz, despite configured60Hz; do not promise constant observed input cadence.

## Final browser regression

Independent Cookies,Toaster/Pirate natural7:0,804identical states. Seven choices/queue lock,move/jump/Space,M mute,original spark/star trail/smoke/filtered colored confetti drawn,24WebAudio plays. Red/Red rematch/new room,old Blob revocation; blur release and input stop, focus neutral resume, retained Cookie reconnect restores room/role,Esc leave.320px/812×375 captures,start reachable; no browser/console/resource errors. Default diagnostic API absent; debug API frozen, finite bounded summaries. Screenshots inspected for original trail/smoke/result confetti/compact actions. Scripted opponent does not return serves; physical rallies and key-to-display measurement remain external.

A final blur assertion read input count and dispatched blur in separate evaluate calls, allowing one legitimate input between them. Combined those operations synchronously, retained the strict no-post-blur-input assertion and reran the full regression successfully. No application release change.

## Final DPR2 cache/export/reset

Debug guests: warm→steady eviction count16→16 both (initial16are scene resets), hits3034→8053 /1823→6760. Zero allocation failures. Steady backing54,573,372 /48,590,824bytes,53/47entries. Resize66,839,560bytes<67,108,864budget,55entries. Next queue releases every55old entry (evictions20→75); idle redraw9entries/20,826,276bytes. Results retain current court until idle/queue/matched reset. Separate confetti LRU final weak-network result78entries/1,123,200bytes, source colors64 (pending1). Every exported number finite; histories/cache bounds hold.

This distinct cold/debugDPR2 workload recorded initial rasterization long-task max409/405ms and frame p95~50ms. Over measured~6s warmed→steady windows accepted inputs88/80, rates14.7/13.4Hz. Previous pacing build observed~10..12Hz rolling averages and cold max394/458ms; traces are not a controlled statistical comparison and do not establish a stable input-rate gain. The deterministic grid/rounding tests prove removal of avoidable deadline wait/early retry; browser main-thread/paint limits remain. Cache RGBA budget96MiB excludes source images/browser/GPU copies.

The first cleanup harness assertion wrongly included resize evictions; replaced by exact next-queue full-release assertion. A temporary fixture expired before rerun; restarted same build and repeated HTTP first. These harness corrections do not alter product behavior.

## Publish-gate test race and final review

First publish attempt stopped at tests before any release directory/symlink/service change:30separate WS frames can cross an authority tick, yielding one legitimate Joe225/60=3.75move rather than an atomic batch. Final test-only timing control: freeze service intervals/Date, explicitly spy imported node:perf_hooks performance.now to fake Date elapsed; retain actual HTTP/WS and real setTimeout plus the captured original bound pollingNow. Ordered pong barrier precedes two40ms advances; assert imported clock0/40/80 and exact room ticks2/4. The first fixture fix only replaced global.performance and left the service clock real, so its apparent20passes did not establish deterministic control. All original exact x150/airborne/serve/swing/latch assertions remain, plus exact tick/ack.20/20targeted repetitions and full suite pass. No runtime API/server change.

Final input follow-up preserves original deadline grid, rounds timer delay upward, skips next target when <period/4(~4.17ms), at most one input per callback/no backlog burst.3phase regressions added;185tests and final independent full-scope review/build pass. Specs capture cache/timeline/transactional input/diagnostics plus real-network test receipt barriers;199Markdown targets validated by reviewer before final record updates.

Raw scripts/JSON/screenshots are ignored artifacts/flash-versus-verification. Headless/shared-host results, ordered transport injection and protocol checks do not establish native Flash pixel parity, user-device FPS, real dual-computer latency, touch/other-browser or physical packet-loss behavior.

## Production release

Published `20261014T041900Z-smoothness` after the required185test/type/lint/build gates passed. Own service restarted2026-10-14 12:19:36CST,PID2676399,active,127.0.0.1:8794; Nginx validated/reloaded. Initial loopback connection preceded binding once; existing retry succeeded, publish exit0.

Public HTML/JS/CSS byte-equal to final dist; metadata and server bundle byte-equal to release. All507source-derived resource hashes/MIME correct, original7roles/8sounds/CSP blob, production secure guest Cookie, v1/v2reject1008/v3hello, private references404. Old three entrances200. Shared HTTPS config/three old snippets/community core SHA-256 unchanged; cloud/flash-global-data PID+start unchanged. Production env hash/0600unchanged. Current points to new release; previous/rollback target20261013T110500Z-versus. No rollback drill or physical public-browser pair run.

Public protocol check ran after healthrooms0/queued0:2independent Cookies,natural7:0,695corresponding states identical,move/jump,rematch and leave passed. After cleanuprooms0/queued0; service logs show only normal create/finish/reclaim. This script did not start a browser or establish physical input latency. Isolated verification fixture stopped.
