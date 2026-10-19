# Self-left perspective: source investigation

## Existing ownership and evidence

- `src/client/main.ts:46` stores actual `side`, room, latest snapshot and Prediction. `:320` obtains the authenticated seat on matched. `:392` compares the actual winner to this side. Never replace actual side with a display side.
- `src/client/main.ts:198` peeks input, synchronously sends, commits on success, advances seq and accepts that same command into Prediction. Mirror only move before this transaction; preserve jump/hit/seq and failed-send behavior. `src/client/input.ts:106` produces screen-direction intent; `:119` commits only edge booleans.
- `src/client/main.ts:137` stops sampling, releases keys, clears Prediction and optionally sends release. Opening settings can reuse this lifecycle. `src/client/prediction.ts:285` clears ledgers/held state without changing seat; `:319` draws a detached player. No need to modify player stepping or reconciliation math.
- `src/client/main.ts:267` labels actual sides today; `:420` displays raw scores. Matched position, result score text and hidden accessible DOM scores need consistent display mapping too. Winner/server identity comparisons remain actual.
- `src/client/main.ts:516` retains the displayed state in backdrop; result-to-idle room cleanup may clear latest/room while retaining side/result. Derive mirroring from retained actual side, never latest alone. True idle/queued clears side; view becomes ordinary.
- `src/client/main.ts:545` renders sampled authority with only own player replaced by actual-side prediction; `:572` prepares startup rasters. Both must receive the same presentation selection.

## Original art is already separable

`src/client/renderer.ts:170` draws background, net, score, markers, smoke, players, tail, shuttle, courtBrand, then intro/sparks/finish/confetti. `:260` chooses score/winner frames; `:278`, `:285`, `:293` draw dynamic player/effect transforms. Preserve this order, including sparks before/after finish.

The source extraction in `tools/flash-assets/extract.py:233` exports the paired floor markers as a static SVG. They are brown dashed floor lines, with no lettering (confirmed from `public/classic/markers/markers-01.svg`). They can mirror with the world. `tools/flash-assets/README.md:110` calls them P1/P2 markers, but they are not P1/P2 text in the exported artwork.

Manifest evidence (`public/classic/manifest.json`):

| Layer | Frame selection / registration | Presentation treatment |
| --- | --- | --- |
| background | x=-115.25, y=-59.5, 870.6×580.95 | Mirror with world, clipped to640×426 |
| net / markers | Actual animation/position | Mirror with world |
| players, attached shuttle | Actual actor body/swing frame and side orientation | Mirror existing drawing transform; attached ball already belongs to source serve art |
| independent shuttle, spark, tail, smoke, confetti | Actual position/rotation/order | Mirror existing transforms, keep state and event ownership |
| score | `${left}-${right}`, plus p1wins/p2wins, x=248.05, y=15 | Choose by displayed sides; draw unmirrored |
| courtBrand | x=470.85, y=-27.3; source Logo separate | Keep readable at existing screen registration/depth |
| intro / finish | Relative to320,213 | Keep readable at existing registration/depth |
| introNames | Seven roles × left/right; left x=-203, right x=5 | Select actual right role's left artwork and actual left role's right artwork when mirrored |

Existing screenshot `artifacts/flash-versus-verification/intro-toaster-pirate.png` was inspected for composition: separate central red score, top-right readable Logo, and separate left/right role names. This is prior visual evidence, not a new browser test or proof of the future feature.

Do not flip the entire Canvas with CSS: it reverses glyphs. Do not deep-copy/mirror GameState each frame: authority/prediction/effects retain real coordinates. Use a world-only Canvas transform and readable presentation layers. World reflection is x'=640-x, with original source offsets left intact inside the transform.

## Raster and loading compatibility

`src/client/renderer.ts:95` prepares the same frame selectors at viewport dpr×scale; actor density×1.25. Mirroring has determinant sign change but the same scale magnitudes. Reuse source SHA/backing-size identity and the64MiB main/32MiB confetti cache budgets. No cache invalidation or live-effect reset is needed for a perspective change. Prepare must select the same displayed score/intro names as render. Loading has an inert gate for court actions; add settings there so it cannot change perspective during prewarm.

## UI and lifecycle constraints

- `index.html:64` has page-owned `.court-actions` outside the menu overlay. Add settings there so online play can access it.
- `src/client/style.css:537` makes the actions a row; `:591` reserves176px from compact scoreboard width. A third button needs deliberate compact layout, not only insertion.
- Input keydown skips BUTTON/INPUT/SELECT/TEXTAREA (`src/client/input.ts:25`); keyup still clears held game controls. Use native button+checkbox; keep Space default and panel Escape behavior. Keyboard/pointer cancellation/focus scenarios need real browser coverage.
- Opening settings must call clearInput and gate canSampleInput until close. A match continues on the server; no new pause protocol. Close/focus policy must leave keyboard navigation usable; close explicitly returns to the canvas only when appropriate.
- New preference is page-owned and browser-local. Catch both localStorage property-access and get/set failures. An invalid or absent value means false. Failed persistence must not revert the live choice or disable matchmaking.

## Boundary and validation

Expected product files: index.html, src/client/style.css, main.ts, renderer.ts; one focused client perspective/preference helper. Input may need a narrowly scoped adjustment only if held-key repeat/native settings tests demonstrate it is necessary; do not change bindings or protocol. Prediction, Effects, shared mechanics, protocol/server, assets and reference stay unchanged.

Meaningful tests: actual render matrix/art selections and authority immutability; prepare/render selection parity/cache reuse; mirrored input through accepted/rejected send transaction; safe storage failures and lifecycle. Use existing test fixtures rather than copying renderer or gameplay behavior. Run code checks/build and isolated HTTP before browser; then use two independent guests with different settings, asymmetric score, real keyboard/touch DOM input, focus/reconnect/rematch and compact layout. Source-filter/effect acceptance and real dual-computer limits remain distinct. No full10-minute optimization rerun unless new timing/cache behavior or regression warrants it.
