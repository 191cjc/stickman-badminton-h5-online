# Flash 90302 asset extraction

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
It is never served to a browser. Only validated standalone SVGs and a JSON
manifest are generated into `public/classic/`.

## Numeric contracts

`extract.py` resolves `PlaceObject`/`RemoveObject` updates by depth, retaining
matrix and symbol/name when a move does not replace them. It follows the actual
`Joe -> currentSwing -> racket -> body -> hitbox2 -> shape109` hierarchy.

`src/shared/classic/assets.ts` exports:

- `classicGeometry.servePoint`: actual Joe-local display-object origin.
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
- `racketPose(kind, frame)`: original `racket.rotation` in currentSwing-local
  degrees, plus `hitbox` axis-aligned bounds after all nested transforms,
  relative to Joe foot at scale +1. The authority applies the original runtime
  ±1.25 horizontal and +1.25 vertical character scale.
- `classicAnimation`: 60 fps; serve23 frames/release7; overhead27/contactEnd15;
  underhand19/contactEnd10. The original recovered frame scripts are verified
  independently in the tests.

The generated numeric module also records full matrices, source shape/symbol
IDs, source XML digest and curve tolerance. SVG export rounds matrix text to
four decimals; numerical authority retains the original SWF precision.

## Rendering manifest

`public/classic/manifest.json` schema1 contains `body`, `swings`, `shuttle`,
`background`, `net`, optional `netFrames`, coordinate system640×426, source
record and SHA-256 of every image.

Each draw entry is `{path, x, y, width, height}`. `path` is relative to `classic/`.
`x/y` are original bounds relative to the source registration origin, and image
width/height are pixel dimensions. Browser URLs use the project base path.

Draw active swing **before** body, preserving original Joe depth order. Draw at
Joe foot with the runtime character scale. Exactly one of serve/overhead/
underhand is visible; the other siblings and transparent selection zones are
removed from body exports. The serve action itself draws the attached shuttle
on frames1..6 and removes it on release7. The independent moving shuttle starts
at release. Shuttle rotation0 points upward in the original coordinate system.

Normal/jump visuals are static (one draw frame each), despite nominal stopped
MovieClip timelines. Walking nested clips have16 frames, eight leg poses held
for two frames each, starting at1 when the parent body label changes. The core
owns `bodyFrameIndex`. Swings use 1-based frames and clamp at the last frame.

Background contains only scene344 depths1/3/6/8/10. It excludes original score,
menu, sponsor button, invisible triggers and player placeholder instances. Net
is a separate world-positioned layer with its original24-frame bounce timeline;
no runtime character scaling is applied to background/net. The exported scene
extends beyond640×426; the game Canvas clips it to the original viewport.

## Evidence boundary

Source hashes, frame scripts, matrices, draw-layer selection, nested walking
frames and internal-only SVG resources are covered by asset tests. Static SVG
extraction does not establish original Flash runtime event order, browser
rendering fidelity, dual-computer latency or network feel. Those are separate
migration/runtime acceptance checks.
