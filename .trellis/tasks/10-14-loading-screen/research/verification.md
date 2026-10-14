# Final verification — first loading experience

Final build index-wsjtUqlH.js109.41kB and index-CMOCPJtZ.css7.88kB; server157.8kB byte-equal to production20261014T041900Z-smoothness. Full independent review/format/diff/lint/type/build and16files/196tests passed. Original source assets/filters, shared/server/protocol3 unchanged.

## HTTP before browser

Isolated18815/18816 served built HTML/JS/CSS200. All507source asset SHA/MIME checks pass; seven roles/eight sounds/schema2, CSP blob, valid guest Cookie. v1/v2reject1008 and v3hello; frozen/private source URLs404. No browser was launched before code and HTTP gates.

## Browser acceptance

HeadlessChromium1440×1000,DPR2; delayJS700ms and SVG35ms to expose stages. Static pre-script cover visible; six maximum SVG requests, actual499image count and8initial prewarm entries;514observable changes. Native progress/role lock/earlyWSidle preserve independent loading. Zero game.drawImage while cover visible. Cover hidden~6068ms, first ordinary game draw~6090ms from page clock. These are deliberately slowed isolated timings, not normal public load-time promises.

One308ms original-SVG raster/readback long task was observed beneath the visible cover. Batch paint opportunities are verified; an individual synchronous SVG can still block the main thread. Later animation/effect frames use normal bounded lazy cache.

Two independent Cookies:Toaster/Pirate matched,69identical corresponding authority snapshots, movement/jump/serve,leave/rematch pass. Reload retainedCookie while firstSVG was held: resumed same room under cover with zero input frames; reveal restores scene and sampling, no idle reset. Blur stops inputs, focus neutral. InjectedSVG404 shows enabled reload with menu/roles locked; remove injected failure then reload succeeds.320×568failure/retry and320×568/812×375loading screenshots inspected; progress/retry fit, no page execution errors. Natural full seven-point matches remain covered by unchanged authority/service tests and prior acceptance, not rerun in this short browser regression.

Raw loading-browser-results.json and screenshots/scripts remain ignored artifacts/flash-versus-verification. Headless/shared-host checks do not establish real dual-computer key latency, touch/other-browser rendering, or zero visual freezing. Independent reviewer records all49role-pair maximum-bucket initial sets within64MiB cache budget (largest32,626,068estimated RGBA bytes); not total browser memory.

## Release

Published20261014T060938Z-loading after196tests/lint/type/build and Nginx validation. Script exit0; first loopback curl preceded server bind and existing retry succeeded. Own service restarted2026-10-14 14:10:34CST,PID2704927,active/running; Nginx reloaded. Public HTML/JS/CSS and release metadata/server byte-equal to final build. All507asset SHA/MIME, seven roles/eight sounds/CSP, productionCookie and v1/v2reject1008/v3hello pass. Private references404, old three entrances200. Public healthrooms0/queued0.

Shared config/old snippets/community core hashes and other cloud/flash-global-data PID/start unchanged; production env SHA/mode0600 unchanged without secret output. previous/rollback target20261014T041900Z-smoothness; no production rollback drill. Local18815/18816fixture stopped. HTTP/public protocol checks did not start a browser. Raw release/public results and isolation snapshots remain ignored artifacts; public-loading-http-results.json, public-loading-bytes.json, production-loading-ready/after.json and deploy-20261014T060938Z-loading.log retain final records.
