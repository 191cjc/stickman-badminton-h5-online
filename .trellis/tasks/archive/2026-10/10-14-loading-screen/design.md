# Loading-screen design

## Boundary

Frontend-only startup UI and renderer resource preparation. main owns readiness and scenes; Renderer owns SVG loading and the original filtered-raster preparation; RasterCache remains the bounded source of cached drawing. Native HTML/CSS supplies a visible startup cover without JS, accessible progress and retry. No game simulation, protocol or deployment-config changes.

## Loading data flow

Static court cover → fetch/validate manifest → bounded image-loading workers with exact completion callbacks → initialize confetti source → batch current first-render frame raster preparation at the same viewport/DPR transform → readiness → reveal the existing scene.

Progress reports the actual stage and completed/total items, not fabricated time. Unknown manifest stage is indeterminate. Numbered stages may reset their own counters with an explicit new stage label. Render initialization and load/prewarm progress stay local. Image/fetch failure reaches a visible retry (reload is acceptable and preserves guest Cookie), with bounded timeouts where needed so a never-firing image cannot block permanently.

Prewarm only a deduplicated current first-render set: court background/markers/brand, current score/net, actual player body/swing and shuttle where applicable. Reuse frame mapping, rasterPlan/get and source registration; device scale must match normal drawing including±1.25actor scale. Yield before/between expensive raster jobs and force completion of deferred drawing when necessary so work is not merely deferred to first reveal. Do not prepare all role animations or all score/net frames and churn the64MiB LRU. Existing allocation-failure fallback remains valid. Some single SVG raster work can still block the main thread; CSS animation/progress communicates preparation, not a guarantee of zero long tasks.

## Scene and lifetime

Keep loading state independent of idle/queued/online/result. Server events may update real room state while the loading cover stays above the menu. Regular Renderer.render must not start cold raster work underneath that cover. Assets/first-render readiness gates role/start handlers and input scheduler. At completion do not reset a resumed room; reveal the real scene and synchronize sampling. Existing clearEffectsImages scene resets remain authoritative: avoid preparing then immediately clearing the same cache through idle initialization. A room event during preparation cannot falsely signal ready or leave the cover stuck; handle reset ordering locally and finitely. Audio still loads asynchronously.

## UI

Chinese concise stage labels, progress element + readable count, CSS-only spinner with reduced-motion support, aria-busy and stage/status updates without live announcement on every file. Separate loading cover guarantees overlay()/buttons() calls cannot replace it. Compact court layouts and keyboard focus remain usable; show one retry action on failure. No optional telemetry/framework/images added.

## Release

Use existing independent publish script after quality/HTTP/browser checks. Backend remains byte-equal; preserve env and other entrances/services. Rollback target is20261014T041900Z-smoothness. Record readiness/paint observation honestly; no synthetic loading duration.
