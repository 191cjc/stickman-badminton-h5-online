# Flash 90302 asset extraction

## PixiJS lossless atlases

The SVGs and schema2 manifest below remain the reproducible source representation.
The product renderer reads a separate generated `public/classic-atlas/manifest.json`
and transparent RGBA8 PNGs. Frozen SWF/XML/recovered archives are never modified.

```bash
npm ci
npx playwright install chromium
npm run assets:atlas
npm run assets:verify
npm run assets:atlas -- --check
```

The baker pins Playwright1.62.0 / Chromium151.0.7922.34, uses Node24+ and pngjs7.0.0,
renders the unchanged SVG filter graph in sRGB, and packs deterministic HD/SD
pages. `--check` performs an independent full bake and compares every generated
byte. Byte reproducibility is established only for the same pinned local platform;
other platforms are unverified. `assets:verify` is a browser-free source/hash/PNG/
manifest check, also run before production build. `report.json` records exact
page sizes, compressed bytes, alpha trimming, all49pair memory estimates and
confetti basis pixel errors.

PNG encoding compares zlib level9 strategies3 and0 with the same adaptive row
filters and RGBA8 pixels, selecting the smaller output (strategy3 on ties).
This retains lossless pixels and guarantees no larger PNG than the earlier
strategy3 encoder. The generated report records both totals and selected counts;
this extra compression runs only during asset builds.

Normal art is baked at4/2pixels per source coordinate; sparks at2/1 because the
original runtime scale is0.3. DOM previews/rematch graphics use native-density PNG.
Every GPU page fits2048×2048. Two-pixel gutters contain the actual neighboring
pixels across split-image boundaries, avoiding atlas bleed and tile seams.
Trimming removes only exactly-zero alpha. Byte-identical frames share a region
inside each dependency group; original paths, frame order and timing remain in
the source manifest. Pages are content-addressed and source-manifest SHA256 is
validated before loading.

Each fragment records its pixel rectangle and trim inside the full backing
raster. Draw at `source.x + trim.x * source.width / pixelWidth` (likewise y), with
size `trim.width * source.width / pixelWidth`. Use actual integer backing sizes,
not the requested density; source bounds are fractional. Filter padding is
already part of the source DrawFrame and must not be added a second time.

Groups separate court/common, adult/Toaster actions and each individual body.
Only current pair dependencies are decoded/uploaded; unused role pages are
released before the next pair. The96MiB limit is an estimated current atlas RGBA
allocation, excluding decoded browser copies, framebuffer, JS heap and total
GPU/process memory. HD/SD selection and existing backing-quality controls are
independent; resizing does not regenerate source SVGs.

Confetti uses baked black-body and white-minus-black contributions, evaluated in
one shared Pixi mesh. Only the marked shape279 body changes color; the original
bevel/flood/shadow colors and alpha remain. The baker compares nine representative
source colors and rejects a changed filter graph if alpha differs or premultiplied
channel error exceeds3/255. No per-particle SVG/Blob/Canvas filter work occurs at
runtime. Actual shader/sampling fidelity is a separate browser acceptance check.

For a complete source rebuild, run `python3 tools/flash-assets/build.py` first,
then `npm run assets:atlas`. Keep generated assets in review with their manifest.

These tools read the frozen `reference/flash-90302/original.xml.gz` and verify its
SHA-256 together with `original.swf` against `SOURCE.json`. They never overwrite
those inputs. Assets come from the compiled 4399 Flash game, not the abandoned
community renderer. No open-source license for the original work has been
verified; no MIT claim is made.

## Rebuild

Python 3 uses only its standard library. Java 21 and JPEXS **26.3.0** are external
build tools, not runtime/application dependencies. The investigated host has an
isolated JRE/JPEXS under the ignored `artifacts/flash-original-research/tools`.

```bash
python3 tools/flash-assets/build.py
npx vitest run tests/classic/assets.test.ts
```

On another checkout, provide paths explicitly:

```bash
python3 tools/flash-assets/build.py --java /path/to/java --ffdec /path/to/ffdec.jar
```

Obtain JPEXS 26.3.0 from its official release
`https://github.com/jindrapetrik/jpexs-decompiler/releases/download/version26.3.0/ffdec_26.3.0.zip`.
Verify the archive SHA-256 before extracting:
`35f4930eb7c380afe66f2117f90b006deac0631473ad7500bb39c78f68645ecd`.
Build checks the tool-reported version; the recorded archive digest is independent
of the jar path supplied to the command. No system installation is required.

Generated intermediates (`art-only.xml`, `art-only.swf`, exporter SVGs and logs)
remain under ignored `artifacts/flash-asset-build/`. The art-only intermediate
contains static definitions and synthetic selected timelines, with **no
ActionScript, root game/document class, ads, analytics or external actions**.
It is never served to a browser. Only validated standalone SVGs, original MP3
payloads and a JSON manifest are generated into `public/classic/`. Rebuilding
replaces this generated directory, removing stale first-version assets.

## Numeric contracts

`extract.py` resolves `PlaceObject`/`RemoveObject` updates by depth, retaining
matrix and symbol/name when a move does not replace them. It follows each actual
`character -> currentSwing -> racket -> body -> hitbox2 -> shape` hierarchy.
The adult actors are checked for identical numeric geometry before sharing one
family; Toaster has its own geometry and timelines. Seven separate body sets
preserve the original attachments, including Pirate shape220 at depth21.

`src/shared/classic/assets.ts` exports:

- `characterGeometry(id).servePoint`: actual character-local display-object
  origin, kept unscaled in the original release calculation. `classicGeometry`
  remains the Joe alias.
- `underhandZone` / `computerZone`: actual filled contours of shapes151/153.
  Quadratic curves are flattened with maximum chord error **0.01 Joe-local
  pixel**, before runtime scale. This is a small, explicit approximation to
  Flash `hitTestPoint(..., true)` rather than a rectangular replacement.
- `net.x`: visual net display-object origin in the scene, **317.25**, distinct
  from the nominal 320 world center.
- `net.side` / `net.top`: stage-axis bounding rectangles of the original
  transparent shape112 hit instances, for `hitTestPoint(..., false)`.
- `net.sideOrigin` / `net.topOrigin`: instance origins used by source swing
  selection; do not substitute the bounding rectangle origins for these.
- `racketPose(kind, frame, id="joe")`: original `racket.rotation` in currentSwing-local
  degrees, plus `hitbox` axis-aligned bounds after all nested transforms,
  relative to Joe foot at scale +1. The authority applies the original runtime
  ±1.25 horizontal and +1.25 vertical character scale.
- `characterAnimation(id)`: 60 fps; adult serve23/release7, Toaster
  serve27/release8; overhead27/contactEnd15; underhand19/contactEnd10.
  `classicAnimation` remains the Joe alias. The original recovered frame scripts
  are verified independently in the tests.

The generated numeric module also records full matrices, source shape/symbol
IDs, source XML digest and curve tolerance. SVG export rounds matrix text to
four decimals; numerical authority retains the original SWF precision.

## Rendering manifest

`public/classic/manifest.json` schema2 contains seven `characters` with body sets,
previews, source body symbol/depth witnesses, adult/Toaster `families`, `effects`,
`sounds`, `ui`, `uiSources`, `introNames`, `scores`, `shuttle`, `background`,
`markers`, `courtBrand`, `netFrames`, coordinate system640×426, source record and SHA-256 of
every resource. A current rebuild produces507 resources (499SVGs and8MP3s),
plus the manifest.

Each draw entry is `{path, x, y, width, height, filterPadding}`. `path` is relative to `classic/`.
`x/y` are original bounds relative to the source registration origin, and image
width/height are pixel dimensions. Filter overflow gets conservative4σ plus
offset padding, compensated in the registration origin and viewport; original
filter trees remain. Browser URLs use the project base path and manifest hashes
as cache queries.

Draw active swing **before** body, preserving original Joe depth order. Draw at
character foot with the runtime character scale. Exactly one of serve/overhead/
underhand is visible; the other siblings and transparent selection zones are
removed from body exports. The serve action itself draws the attached shuttle
before the family-specific release frame. The independent moving shuttle starts
at release. Shuttle rotation0 points upward in the original coordinate system.

Normal/jump visuals are static (one draw frame each), despite nominal stopped
MovieClip timelines. Walking nested clips have16 frames, eight leg poses held
for two frames each, starting at1 when the parent body label changes. The core
owns `bodyFrameIndex`. Swings use 1-based frames and clamp at the last frame.

Background contains only scene344 depths1/3/6/8/10. It excludes original score,
menu, sponsor button, invisible triggers and player placeholder instances. Net
is a separate world-positioned layer with its original24-frame bounce timeline;
no runtime character scaling is applied to background/net. Original score/font,
P1/P2 markers and Intro255/Finish269.frame1 decorations are separate layers.
The visible KONGREGATE court marking is exported separately from button343's
default Up artwork (text340 and original filters), at scene position
`(565.9, 12.95)`. Its button actions are stripped from the art-only intermediate;
the final SVG has no click handlers, external links or platform requests. Draw
it above the shuttle and below the appended foreground effects.
The exported scene
extends beyond640×426; the game Canvas clips it to the original viewport.

## Effects and sounds

BigSpark278 exports all25frames; runtime removal remains source frame22 at
scale0.3. Tail245, smoke242 and confetti282 preserve registration and filters.
Only the nested shape279 body is marked for dynamic confetti recoloring; the
outer bevel/glow stays intact. The manifest does not imply unused source
effects are gameplay triggers.

Eight active sounds are copied from verified XML DefineSound MP3
`soundData[2:]`: hover19, press20, whoosh38, toasterpop40, ding43, birdiehit45,
background music46, cheer47. The two-byte seek header is recorded as signed
`seekSamples`; each exact MP3 payload has its original symbol and SHA-256.
Audio decoder/SVG filter differences from native Flash remain runtime limits.

## Evidence boundary

Source hashes, frame scripts, matrices, draw-layer selection, nested walking
frames and internal-only SVG resources are covered by asset tests. Static SVG
extraction does not establish original Flash runtime event order, browser
rendering fidelity, dual-computer latency or network feel. Those are separate
migration/runtime acceptance checks.
