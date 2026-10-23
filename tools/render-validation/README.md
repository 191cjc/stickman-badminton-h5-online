# Local renderer verification

These standalone tools use local pinned Playwright/Chromium and PNG dependencies.
They are outside the production build. Run from the repository root on Node24+.
Do not run browsers/benchmarks concurrently with atlas baking or other browser
work: software WebGL and SVG filtering compete for this shared host's CPU.
No script contacts production or changes gameplay authority.

## Comparable two-client measurements

```bash
node tools/render-validation/server.mjs --dist dist
node tools/render-validation/benchmark.mjs pixi
```

The server binds only127.0.0.1, frontend18926/backend18925. It accepts `--port`,
`--backend-port`, `--dist` (or `BADMINTON_VERIFY_DIST_ROOT`) and supports PNG,
baseline CSP, API and WebSocket proxying. Stop it before changing the build root.
Use `--dist artifacts/pixi-migration/canvas-dist` for the untouched baseline.
It deliberately sends no Cache-Control, matching the formal baseline's HTTP
policy; this is not an immutable-cache demonstration.

Benchmark options: positional report variant, `--seconds 75`, `--output DIR`,
`--url URL` (must include `?debug=1`), `--executable PATH` or
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`. `BENCH_SECONDS` remains supported.
The default75s cold +75s warm workload and measurement predicates retain the
formal baseline script (SHA256
`97a80313b62aea50e011efcfbba8c081eda38f62f0205c80c4aec18a352cbe9b`):
two1440×1000/DPR2 guests, Toaster/Pirate,50ms logical KeyboardEvents,5s samples,
movement/jump/serve/swings and natural results/rematch. Warm clears cookies then
reloads the same contexts, retaining their HTTP cache. Each run writes raw JSON,
intro/end screenshots, frame-gap mean/p95/max and long-task statistics.

`readyMs` measures navigation→observed readiness after polling, **not** the exact
loading-cover hide time. ResourceTiming uses the baseline's default buffer;
recorded bytes are a **subtotal**, potentially truncated, and must not be called
total network transfer. CDP JSHeapUsedSize is measured JS heap; renderer RGBA
numbers are estimates that exclude framebuffers, driver/browser copies and total
process/GPU memory. Whole-window p95 includes mixed play/result/rematch and actual
quality/backbuffer changes; it is not a continuous-rally or native-device FPS claim.

## Fixed-state visual pairs

```bash
node tools/render-validation/snapshot-canvas.mjs
node tools/render-validation/visual-server.mjs
node tools/render-validation/visual-compare.mjs --boundaries
```

The snapshot helper reads the pre-Pixi Git tag into ignored artifacts without
checking out or resetting files. The fixture server uses independent18927
(`--port`), with no backend. The runner accepts `--url`, `--output`, `--densities
2,4`, `--roles joe,pirate`, `--actions forward,serve`, `--boundaries` and
`--executable`. Every density gets new renderer instances so tier selection is
SD at2 and HD at4. Browser DPR1 and canvas backing2/4 give equal source-world
density in both renderers; these fixed-density results are separate from A/B's
adaptive backing policy.

The fixture calls the original checkpoint Canvas renderer and actual current
WebGL renderer against the same seeded Simulation snapshot and Effects. It
freezes state and verifies Effects stay unchanged across repeated draws. It
covers all seven roles on both sides, forward/backward/jump, serve/overhand/
underhand, mirrored worlds, distinct intro names,2:1 mirrored score, both winner
images, smoke/tails/rotated shuttle, spark before/after finish and eight confetti
colors (including the original256 carry). `--boundaries` adds start/final swing
frames. Source manifest selectors and transformed source corners form an
independent registration/name/score oracle; image metrics alone do not prove
registration correctness.

Outputs include full PNG pairs, four-times amplified RGB differences, full-pixel
actor/overlay/effect crops, and contact sheets ordered **Canvas | Pixi | diff×4**.
`comparison.json` gives global and region mean/p95/max channel errors and pixels
with any RGB channel differing by more than3. These are evidence for inspection,
not automatic acceptance thresholds: sampling/bake density can change edges.
Inspect the pairs before claiming visual fidelity or a fixed filter/trim seam.
The fixture serves ignored checkpoint files only on localhost; never deploy it.

## Online behavior and failure acceptance

With the built server above running:

```bash
node tools/render-validation/acceptance.mjs
node tools/render-validation/loading-retry.mjs
node tools/render-validation/lifecycle.mjs
xvfb-run -a node tools/render-validation/visibility.mjs
```

Both accept `--url`, `--output`, `--executable`. Online acceptance reuses the
existing proven native control driver: two clients, default J/K/W/S keys,
modifier/held-edge behavior, mirrored synthetic standard gamepad/touch controls,
settings migration/compact layouts, reconnect, all four speed tiers' natural
seven-point results and same-tick authority equality. It adds default-off
diagnostics and actual `WEBGL_lose_context` recovery while retaining the room.
Synthetic Gamepad API and Playwright pointer/key events do not establish physical
hardware behavior, mobile browser performance or two-computer latency.

Failure acceptance aborts real atlas PNG requests, uses the native reload retry,
then fails a new opponent's role page after matching. It checks continuing
authority snapshots, gated input and the reachable native loading-exit action.
Expected failed requests are recorded separately from unexpected page exceptions.
Reports retain partial results if a check fails; a report without `complete:true`
must not be presented as passed.

The supplemental lifecycle runner uses DPR1 and debug diagnostics, retaining real
two-client server authority. It probes CDP freeze/resume without overriding
`document.hidden`; the report says whether a genuine hidden visibility event was
observed. A freeze without that event does not establish hidden/resume acceptance.
It checks held-input release when the browser actually hides, native resize and
mirrored HUD order, stable SD tier/backbuffer sizing, exact active group/page
ownership and RGBA estimates, a natural seven-point result through the server's
real30s room reclaim, and a different pair replacing old role pages on rematch.
Winner-plate crops before/after reclaim expose actual Canvas output; a broad
pixel difference limit permits animated confetti and sampling changes, with raw
crops retained for inspection.

Its final case delays a real new opponent PNG, loses WebGL during preparation,
uses the native loading-exit button, then completes/restores graphics. The result
must stay a result with input gated and current pages uploaded. The combined
delayed-new-role request spanning natural result and reclaim is explicitly not
covered by this browser runner: the15s resource deadline expires before the30s
room retention. Separate real browser scenarios cover those transitions individually. The combined main transition was source-reviewed and has no direct automated coverage; no server state or browser gameplay clock is fabricated.

The focused visibility runner starts two independent external **headed** Chromium processes under Xvfb, with temporary profiles and `connectOverCDP({noDefaults:true})` default contexts. This avoids Playwright focus emulation, which otherwise keeps background tabs visible, while retaining independent guest cookies. It tries a
real same-context tab switch, then a native window minimize/restore fallback
(`--strategy auto|tab|minimize`). It requires `document.hidden` and a trusted
browser `visibilitychange`, proves no renderer draws while hidden, checks ongoing
room snapshots and held-input release, then resumes with the synthetic standard
pad still held. Input must stay neutral until a fresh neutral observation and new
press. It records quality grace and draw/scheduler recovery without claiming to
read the private elapsed delta. If neither browser strategy produces actual
hidden visibility it fails with the unverified limit recorded. `--bfcache` adds
back/forward navigation and reports `persisted:true` only when actually observed;
otherwise BFCache remains unverified. This virtual display evidence does not
replace physical-device background/foreground testing.
