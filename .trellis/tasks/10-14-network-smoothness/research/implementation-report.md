# Implementation report — network smoothness

## Implemented scope

Application changes preserve protocol3, authority, seven source characters, shared
player/ball simulation, audio, original SVG assets/filters and source registration.
No dependency/framework migration, source regeneration, server service change,
production operation or Git commit is performed by this implementer.

- `src/client/raster-cache.ts`: lazy raster LRU of the unchanged SVG/image source;
  floor-rounded integer backing sizes, half-octave scale buckets0.25..4 using the
  actual Canvas transform (DPR/world/player/particle scale, rotation and mirroring).
  Destination source x/y/width/height and existing filtered padding remain intact.
  Oversized images reduce raster density to bound allocation rather than remove
  their art. Cache catches allocation/context/draw failures, preserves the original
  image fallback, and avoids repeating failed allocations each frame.
- `renderer.ts`: all Canvas source layers use the raster path, including source
  tinted confetti. Static/actor/effect cache:256entries/64MiB. Colored-confetti
  cache is separate:768entries/32MiB, protecting the court's hot working set from
  unique colors. Maximum backing side4096 and individual24MiB. Scene/role/room
  clears release all raster backing stores and confetti Blob ownership.
- `prediction.ts`: monotonic render cursor,32snapshots,60arrival-jitter samples.
  Server clock corrections are bounded per arrival (-0.5..2ticks); a cursor rate
  of0.85..1.15 slews presentation rather than reanchoring it backward. Healthy
  target delay remains4ticks(66.7ms);p90 receive/server interval variation adapts
  it up to12ticks(200ms), with slower reduction. Latest authority is held under
  starvation; no shuttle extrapolation. Score/phase/role/room/status boundaries
  immediately reset; stale same-room ticks are rejected before boundary handling.
  Actual action/contact fields still select real snapshots. Prediction retains
  local-only shared stepping; diagnostics measure real correction magnitude,
  snap/reset classification and oldest pending accepted-input age.
- `input-scheduler.ts`/`main.ts`: one page-owned60Hz paced timer replaces RAF
  input catch-up. Callback stalls produce at most one new accepted input and skip
  stale deadlines; no burst of delayed simulation steps. Blur/hidden/pagehide,
  disconnect, leave, result and room transitions stop/clear it; focus/visible
  connected-online snapshots restart it with a fresh deadline. RAF retains audio,
  particles, local visual-offset decay and drawing ownership.
- `input.ts`/`network.ts`: synchronous peek/send/commit preserves jump/hit edges
  on false/throwing sends, commits once only after accepted delivery, and advances
  sequence/prediction history only then. Existing native button Space handling and
  touch releases remain intact.
- `diagnostics.ts`: opt-in bounded numeric rolling observations; no uploads,
  identities, Cookie values, IPs, room IDs or diagnostic gameplay commands.

## Diagnostic API for browser verification

Open the ordinary entrance with `?debug=1`. Only then the read-only property
`window.badmintonDiagnostics` exists. Its frozen API contains one operation:
`window.badmintonDiagnostics.snapshot()`. Returned data are detached snapshots;
mutating an exported object cannot alter gameplay owners.

Every rolling numeric summary has `{samples,mean,p95,max}`; samples<=240.

```
{
 version:1, sampleLimit:240,
 frame:{fps,gapMs,cpuMs,longTaskMs},
 network:{snapshotGapMs,snapshotBytes,rttMs},
 predictionSamples:{correction,ackAgeMs},
 input:{accepted,rejected,rateHz,gapMs},
 renderer:{
   raster:{entries,bytes,hits,misses,evictions,failures,limits},
   confettiRaster:{entries,bytes,hits,misses,evictions,failures,limits},
   colors:{cached,pending}
 },
 interpolation:{renderTick,latestTick,snapshots,delayMs,availableMs,
                starved,underruns,ignored,resets,rewinds},
 prediction:{correction,snapped,pendingInputs,ackAgeMs},
 scheduler:{active,ticks,skipped,latenessMs}
}
```

`prediction` is undefined outside a room. `renderTick` is null before sampling.
`input.accepted/rejected`, cache stats and scheduler counts are page-lifetime
cumulative numbers; interpolation stats are per interpolation owner/new match.
`underruns` counts entries into hold-latest starvation, not every stalled frame.
`availableMs` is authority buffer ahead of the sampled tick, not network RTT.
`input.rateHz` is the rate of accepted logical samples over bounded observed gaps.
Transport gap anchors reset on idle/matched, retaining prior rolling summaries.
Long-task entries are collected only in diagnostic mode and only when supported.

## Tests and results

- Targeted timing/input/cache/network/prediction/diagnostic tests passed27/27 before
  the final origin-drawing case was added.
- Final `npm test`:14files,179tests passed (baseline161). New meaningful checks
  cover filtered source raster reuse, original registration/padding under mirrored
  rotation, scale buckets, oversized backing stores, byte+count LRU eviction,
  reset/allocation failure, independent15/30/60/144Hz renderer input cadences,
  timer stalls/stop/restart/callback release, transactional edges and focus
  releases, bounded metric export, jitter/burst/stall monotonic interpolation,
  stale/duplicate/semantic boundaries, actual correction and pending age.
- `npm run lint`, `npm run typecheck`, `npm run build`:passed.
- Build:client `index-D_1GqhSC.js`104.77kB/CSS `index-CDPOmVno.css` unchanged;
  server157.8kB, shared server gameplay and extracted assets unchanged.
- Main-owned independent `timeline-comparison.ts` run against old baseline332b06e
  and this implementation:uniform held3→1frames; jitter26→4; ordered450ms stream
  stall47→32, rendered-time rewinds1→0 (old maximum1.32ticks). All profiles stayed
  at or behind latest available authority. This is deterministic presentation
  evidence, not a physical input-latency measurement.

## Remaining validation / limits

Main owns final-build isolated HTTP, identical two-pageDPR1/2 browser/filter
comparison, ordered WS delay/burst/stall test, complete natural result/rematch/
retained-Cookie reconnect/layout checks, independent reviewer, docs/specs and
release. Browser performance evidence is pending; these code tests alone do not
establish a user-device FPS or latency improvement.

Input timers cannot run while the browser main thread is blocked; eliminating
repeat filtered drawing is necessary for their opportunity to run. Timer pacing
prevents catch-up acceleration, so a long stalled page can temporarily lag the
server and reconcile its local player. Server still owns ball/collision/score.
Raster budgets estimate RGBA backing pixel bytes (96MiB combined maximum), not
all browser/GPU copies or the pre-existing499loaded source SVG images. Max scale4
and oversized density reduction can soften unusually large displays; original
shape, layer, filter/color and registration remain. Allocation failure falls back
to drawing original art and can retain the old browser raster bottleneck.
Adaptive interpolation deliberately holds newest authority during a stream pause;
it cannot invent absent flight/collision information. Real dual computers,
weak-network paths, touch/other browsers and physical key-to-display latency need
separate external validation. Frozen reference/upstream/public art are untouched.
