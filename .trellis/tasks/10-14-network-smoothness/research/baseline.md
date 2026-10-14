# Baseline evidence and current hot paths

Baseline application:332b06e / release20261013T110500Z-versus,
client index-Dpe_Jw8n.js and index-CDPOmVno.css. Production service unchanged
during these isolated measurements. Port18815 backend,18816 static/WS proxy;
server harness preserves production CSP. Two independentCookie Chromium pages,
1440×1000,DPR1 then2,Toaster/Pirate,move/jump/serve and7s observation. Source SVG
filters intact in baseline; raw ignored scripts/data at
artifacts/flash-versus-verification/performance-baseline.mjs/json.

| Variant | DPR | left frame interval mean/p95 | right mean/p95 | long tasks |
| --- | --- | --- | --- | --- |
| Original filtered SVG | 1 | 107.3 /116.7ms |109.5 /116.7ms |83/79 |
| Original filtered SVG | 2 |386.0 /433.3ms |390.0 /450.1ms |27/26 |
| Test-only removed filter attrs |1|34.0 /50.0ms|34.7 /50.0ms|0/0|
| Test-only removed filter attrs |2|103.9 /116.7ms|111.0 /116.8ms|82/78|

RAF callback CPU ~1ms in all variants. Deferred raster work is not measured by
drawImage call duration. Removing filters only in browser route fulfillment has
a large effect but is not approved product behavior; preserve original source
filters by raster reuse instead. Raw source/public files were not changed.

Snapshot sizes ~2.7KB mean,~3.7KBp95,30Hz. On loopback the filteredDPR2 browser
observed long delivery gaps (p95~354ms) and messages processed in bursts while
rendering blocked. This is not proof of network-path loss or server overload;
rendering can inflate app-level RTT/gap measurements. Baseline indicates a client
raster bottleneck and supports optimizing current transport before migration.
Headless/shared-host paint performance does not predict any user's FPS or latency.

Code hot paths:

- src/client/renderer.ts:load stores HTMLImageElements for499SVGs; draw passes
  those directly to drawImage for background,filtered branding and sprites each
  frame; particles can invoke filteredSVG many times with changing scale.
- src/client/main.ts:frame drives input/prediction,cosmetics and painting; up to6
  fresh inputs can be sent per stalledRAF,server coalesces them into latest held.
- src/client/input.ts:read consumes press edges before Network.send accepts;
  failed send under64KiB client buffer limit loses an edge.
- src/client/prediction.ts:Interpolation anchors target on latest receipt,minus4
  ticks; missing snapshots clamp tolast,subsequent burst can reanchor backward.
- src/server/service.ts:fixed60Hz,current held input/coalesced edges,30Hz full
  authority/effect JSON;256KiB server-output cutoff. No framework replacement or
  binary protocol change is justified by these initial2.7KB snapshots alone.
- Current tests assert interpolation in uniform arrivals but not jitter/monotonic
  time/cache/scheduler/backpressure. Existing161 tests are regression baseline.

Original source reference/assets/physics remain the parity oracle. Filter-only
attribution source responses must never be used for final release verification.
