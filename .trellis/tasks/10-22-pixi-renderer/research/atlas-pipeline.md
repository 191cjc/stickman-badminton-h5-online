# Research: Reproducible filtered SVG atlas pipeline

- Query: Propose a lossless, deterministic baked-atlas replacement for runtime SVG filtering, preserving registration, actor loading, original effects and confetti body recoloring.
- Scope: mixed — local source/tooling/manifest analysis, in-memory Chromium pixel experiments, official PixiJS texture API references.
- Date: 2026-10-22

## Findings

### Existing source and build contracts

- `tools/flash-assets/build.py:21` verifies frozen SWF/XML digests, runs extraction and pinned JPEXS **26.3.0**, then normalization. Do not replace or write to frozen inputs. `tools/flash-assets/finalize.py:88` deletes and replaces generated `public/classic/`; a subsequent atlas step must therefore run **after** finalize and preferably output to a separate generated `public/classic-atlas/` directory. Original SVG manifest stays available for provenance/tests, not product drawing.
- `tools/flash-assets/finalize.py:41` reads original image bounds/anchor; `:47` adds conservative `ceil(4σ + max(abs(offset)) + 1)` filter overflow, updates registration and SVG viewport, and retains complete filters. `:58` marks only shape279's path `data-confetti-body="true"`. `:126` hashes every resource.
- `public/classic/manifest.json` schema2 has **499 SVGs, 8 MP3s**, source 640×426/60fps, per-frame `{path,x,y,width,height,filterPadding}` and hashes. `src/shared/classic/manifest.ts:4` is the current draw contract. Preserve it as source metadata rather than confusing sprite trim coordinates with game origins.
- `src/client/renderer.ts:185` strictly clips to world `[0,640] × [0,426]`, including reflected background. Therefore a special background-only viewport crop is valid. Current background is `x=-115.25,y=-59.5,width=870.6,height=580.95,padding=22`; everything outside world viewport is always discarded. Do not generalize that crop to moving actors/effects.
- `src/client/renderer.ts:292` selects 1-based swing/body frames from game state. `:303` places characters at `(player.x - .05, player.y)`, applies ±1.25 horizontal and +1.25 vertical scale, draws swing then body. Atlas generation does not own frames/timing.
- `src/client/raster-cache.ts:4` currently limits runtime density to4 and side4096, with64MiB main/32MiB confetti caches. Cache misses invoke filtered `drawImage` at `:107`; `prepare()` synchronizes only current first-screen frames using a pixel read at `:137`. New animation frames can still incur SVG/filter work later.
- `src/client/confetti-images.ts:3` rewrites only the marked fill; fixed filter flood colors remain. Current per-color SVG Blob construction at `:36` must disappear from product rendering.

### Recommended groups, resolutions and dependency ownership

Use transparent PNG (lossless RGBA8), stable path/hash identities, two independently selectable quality variants, and **strict 2048 maximum page dimensions**. No GPU-compressed/lossy format is required for this migration.

| Group                          | Entries                                                                   | Dependencies / lifecycle                                     |
| ------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `court`                        | background viewport tiles, all net frames, markers, court brand           | Persistent current court                                     |
| `common`                       | score frames, intro/finish art, shuttle, spark/tail/smoke, confetti bases | Persistent current scene                                     |
| `swing-adult`, `swing-toaster` | Family action frames                                                      | Only families used by current two actors                     |
| `body-<id>`                    | Body frames per each of seven characters                                  | Only selected/current two actors                             |
| `preview-<id>`                 | Standalone PNG menu previews                                              | DOM/menu only, small native density; no game GPU page needed |

Do not ship original unused rematch/more button artwork into common GPU groups if no runtime renderer references it; accessible DOM controls remain. Intro names may be moved into corresponding body groups if renderer dependencies remain explicit. Initial idle loads Joe court/common/body/family; matching loads exact two actors/families behind actual progress. Keep server state updating, gate input/drawing until the required pages are uploaded. Exit/rematch releases unused role/family groups before loading new ones; shared pages have explicit retain counts. Retain decoded page pixels needed for context recovery or refetch verified versioned PNGs under the same real loading gate.

| Class                                                         | `hd` pixels per source coordinate | `sd` | Rationale                                                                        |
| ------------------------------------------------------------- | --------------------------------- | ---- | -------------------------------------------------------------------------------- |
| Court, scores, UI, body, family actions, shuttle, tail, smoke | 4                                 | 2    | Preserve old raster maximum4 at desktop DPR2; lower tier reduces RGBA by about4× |
| Spark                                                         | 2                                 | 1    | Original draw scale0.3; world density4 requires only1.2 source density           |
| Confetti bases                                                | 4                                 | 2    | Tiny source; arbitrary RGB without per-color textures                            |
| Menu previews                                                 | 1                                 | 1    | Source160×169 / Toaster195×196, displayed much smaller; do not upscale all seven |

Select variant before loading from actual DPR × world scale (and actor1.25 where relevant), GPU limit and declared memory budget. Presentation backing resolution still follows existing lower-only adaptive quality. Avoid repeatedly replacing atlas tiers on resize; an explicit lower-quality transition can release hd first, load sd and preserve live Effects. Both tiers may be generated without both being loaded.

### Reproducible baker

Pin local dev `playwright` **1.62.0** and its Chromium revision **1234**, browser **151.0.7922.34** (the installed browser used in experiments). Browser reproducibility must use lockfile + browser version check, not an absolute path into another checkout. Existing installed Playwright is `/home/ubuntu/stickman-badminton-online/node_modules/playwright`; this is research infrastructure only. Python Pillow/numpy and local `sharp` are absent. No `sharp`/libvips substitution is recommended: SVG filter semantics may differ from the browser version whose visuals are being preserved. Node24 and built-in zlib can encode/decode PNG if needed; Chromium canvas can produce lossless PNG directly.

Proposed command after implementation: `npm run assets:atlas`; complete source rebuild: `python3 tools/flash-assets/build.py && npm run assets:atlas`. The atlas command reads source SVGs + manifest, launches pinned Chromium, decodes each unique SVG, draws it to transparent canvas at chosen backing dimensions, synchronizes pixel data, scans alpha and packs. It writes only derived outputs; no SWF/XML/archived/reference writes. Headless launch/render flags, platform, color space, premultiplication behavior and browser version must be recorded in the generated manifest. Determinism means same pinned build environment plus input bytes produces identical manifest and PNG bytes; cross-platform bit identity is a separate unproven claim.

Use integer backing dimensions `ceil(width*density)`, `ceil(height*density)` (or deliberately retain old floor policy; record either). Destination mapping **must use actual backing dimensions**, not just requested density: source widths are fractional. For each source render, preserve alpha values down to1 (trim iff alpha is exactly0). Empty frames get a1×1 transparent texel and an explicit empty flag. Do not introduce alpha thresholds that crop faint original glows.

Background cropping should render the full SVG with its original filter context, then crop the world640×426 rectangle; rendering a newly narrowed SVG viewBox can change filter/clipping behavior. Fractional source registration requires exact mapping when sampling/copying. The final background cropped logical destination is `(0,0,640,426)`, and its baked pixels should match full-source rendering at that destination before accepting the optimization.

Pack unique content within dependency groups, preserving every original source-path alias. Deduplicate by source SHA256 + actual backing dimensions (+ confetti basis selector / crop). Never merge identities only because frame index/name matches. Sort entries by descending height, descending width, then stable path/hash lexical order. A deterministic MaxRects/best-short-side algorithm reduces holes; a stable shelf packer is acceptable with measured page costs. Disable rotated packing initially. Emit tight non-power-of-two page dimensions rounded up to4, ≤2048; linear sampling, clamp-to-edge, **no automatic mipmaps** allow NPOT and avoid atlas mip bleeding. Full power-of-two pages unnecessarily inflate memory.

Each packed rectangle reserves **2 pixels of gutter on each edge**. Extrude source boundary RGBA into that gutter, excluding gutter from Texture.frame. For background split fragments, the internal gutter must contain the real neighboring original pixels (overlap), not repeated edge colors: otherwise linear sampling can create a seam. Split cores ≤2044 to allow 2-pixel gutters. Transparent outer-border texels stay transparent. Atlas rectangles must never share gutter texels. Compare rendered adjacent tiles at fractional world scales, mirrored and DPR1/2.

PNG files should be content-addressed (`court-hd-<sha256>.png`) or requested with manifest hashes. JSON itself must use a versioned build identity and revalidation/no-cache semantics. Validate local path grammar, page dimensions, positive finite values, frame bounds and hash formatting before any partial scene is exposed. Bound parallel fetch/decode, timeout body/decode/upload stages and surface retry. Advertise exact resource/page counts and estimated decoded RGBA before match entry; progress tracks completed tasks/bytes actually observed, without artificial timer percentages.

### Concrete atlas manifest and registration contract

Keep source manifest immutable and add a separate atlas schema, for example:

```ts
interface AtlasBuild {
  schema: 1;
  sourceManifestSha256: string;
  generator: {
    chromiumVersion: string;
    playwrightVersion: string;
    algorithm: string;
  };
  variants: Record<
    "hd" | "sd",
    {
      pages: Record<
        string,
        {
          path: string;
          sha256: string;
          width: number;
          height: number;
          rgbaBytes: number;
          group: string;
        }
      >;
      frames: Record<
        string,
        {
          sourceSha256: string;
          pixelWidth: number;
          pixelHeight: number;
          fragments: Array<{
            page: string;
            frame: { x: number; y: number; width: number; height: number };
            // Region position in the original, untrimmed baked image, in pixels.
            trim: { x: number; y: number; width: number; height: number };
          }>;
        }
      >;
      groups: Record<string, string[]>;
    }
  >;
}
```

Logical source `DrawFrame { x,y,width,height }` is still authoritative for registration. For a fragment `(tx,ty,tw,th)` from backing dimensions `(pw,ph)`, draw at:

```text
position = (source.x + tx * source.width / pw,
            source.y + ty * source.height / ph)
size = (tw * source.width / pw, th * source.height / ph)
```

This mapping remains correct with ceil rounding, filter padding, aliasing, mirroring, rotation and split background. Do not add filterPadding again: it is already included in source coordinates. Easiest Pixi implementation uses a cropped `Texture({source,frame})` and explicit fragment position/size. Alternatively `Texture.orig/trim` or Spritesheet `sourceSize/spriteSourceSize` can preserve untrimmed bounds, but each source's fractional logical dimensions still need scaling; avoid double trim compensation. Separate registration metadata per original path remains necessary when one texture is shared by several draws.

### Measured deduplication, alpha-trim and memory estimates

Read-only/in-memory Chromium experiment: decoded every byte-unique SVG from the current manifest, used hd density4 (spark2, preview1), scanned all alpha pixels, then simulated deterministic descending-height shelf packing with2-pixel gutters and POT rounded pages ≤2048. This is a **measured pixel area** plus a **calculated RGBA/page estimate**, not GPU/process-memory measurement. No output assets were written.

- 499 source SVG paths → **339 byte-unique SVGs**.
- Each adult body:34 logical paths →18 byte-unique; Toaster4→1.
- Adult actions69→68; Toaster73→46; effects28→12; net24→7.

| Group                                             | Unique SVG count | Measured trimmed RGBA MiB | Conservative POT shelf pages | Calculated allocated MiB |
| ------------------------------------------------- | ---------------: | ------------------------: | ---------------------------- | -----------------------: |
| Joe body                                          |               18 |                     2.885 | 2048×1024                    |                        8 |
| Nadia body                                        |               18 |                     2.913 | 2048×1024                    |                        8 |
| Harry body                                        |               18 |                     2.950 | 2048×1024                    |                        8 |
| Pirate body                                       |               18 |                     4.480 | 2048×1024                    |                        8 |
| Top Hat body                                      |               18 |                     3.513 | 2048×1024                    |                        8 |
| Red body                                          |               18 |                     2.957 | 2048×1024                    |                        8 |
| Toaster body                                      |                1 |                     0.098 | 256×256                      |                     0.25 |
| Adult actions                                     |               68 |                    11.021 | 2048×2048                    |                       16 |
| Toaster actions                                   |               46 |                     3.689 | 2048×1024                    |                        8 |
| Common (includes unused button art and all names) |               99 |                    15.102 | 2048×2048 +2048×256          |                       18 |
| Court excluding background                        |                9 |                     1.910 | 2048×512                     |                        4 |
| Full source background                            |                1 |                    27.152 | 2048² +2048² +2048×256       |                       34 |
| All DOM previews                                  |                7 |                     0.171 | 1024×128 if packed           |                      0.5 |

Full-background hd scan: backing3483×2324, nonzero alpha trim `[87,86,3309,2151]`, no alpha on source viewport outer boundary. Only known already-edge-filled source art touched source boundaries: spark01/spark14, rematchUp/Over, markers. These are source shape extents, not newly clipped filters; the baker must retain them unchanged. Do not mistakenly assert every SVG edge is transparent.

Conservative active Toaster/Pirate pair with full source background =34+4+18+16+8+8+.25 = **88.25MiB**, two adult actors =**88MiB**. This is intentionally wasteful POT shelf packing, excludes GPU framebuffer/browser copies/JS heap, and includes every score/name/unused original button art. NPOT pages, MaxRects and clipped background lower it. Clipped background hd pixel area alone is640×426×16×4 = **16.641MiB** before gutters/packing, rather than27.152MiB alpha-trimmed full source. Splitting before NPOT packing can approach17MiB rather than34MiB POT overhead. A **96MiB estimated active GPU RGBA cap** is feasible for hd with these conservative assumptions; enforce from exact generated page dimensions, not this table. Transitions must unload old unused groups before new allocation. If budget fails, choose sd (~4× less area) and display real preparation progress. Decoded PNG/CPU image storage and context recovery copies need separate diagnostics;96MiB is not total memory.

### Confetti: affine RGB basis is valid for the actual filter graph

Source: `public/classic/effects/confetti-01.svg`; only shape279 is colored. Its filter graph uses fixed red/blue floods, offsets, alpha-only `in/out` composites, color-matrix alpha scaling, black flood, Gaussian blur, matrix, nonlinear component-transfer tables, `atop SourceGraphic`, black shadow, then over.

The nonlinear table does **not** invalidate a basis decomposition here:

1. `filterResult0/5` are translated SourceGraphic; each is used only as `in2` alpha of an `out` against a fixed flood. Thus results2..17 depend on **source alpha and fixed flood colors**, not source RGB.
2. Result17 is atop SourceGraphic at result18. Premultiplied `atop` produces `F_rgb * A_source + Source_rgb * (1 - A_F)`. Here F and all alpha terms are RGB-independent. Result18 alpha is source alpha.
3. The result19..22 shadow removes RGB with a color matrix before blur; its alpha depends only on alpha. The final `over` therefore leaves output alpha independent of body RGB, and output premultiplied RGB is an affine function of each input channel, with nonnegative slope.

Bake original graph twice by changing **only** the marked path fill to black and white. Let both outputs have common alphaA. Store base black RGBA `(B,A)` and delta RGBA `(W-B,A)`; both should be sampled as premultiplied RGB. A single shader/mesh evaluates:

```glsl
vec4 base = texture(uBase, uv);
vec4 delta = texture(uDelta, uv);
outColor = vec4(base.rgb + delta.rgb * particleColor, base.a) * globalAlpha;
```

Delta alpha is ignored by shader but preserves premultiplication semantics in PNG upload. RGB subtraction for encoding delta is done in straight color before upload; assert every channel W−B≥0. Shared alpha premultiplies both bases on upload, making interpolation correct. Do not tint base/highlights/shadow, combine alpha twice, use additive alpha blending, or use ordinary2-sprite normal blending. A single mesh with per-vertex colors and ≤768 quads avoids per-particle filters/offscreen targets and preserves the final foreground layer order. `Mesh` integration needs official Pixi v8 buffer/shader API confirmation by renderer owner.

Pixel experiment: Chromium151.0.7922.34, native SVG rasterization into ceil(30.1×density) square, body black/white and seven target colors (`ff0000`, `00ff00`, `0000ff`, `12ab45`, `808080`, `fdfdfd`, `010203`). Results below compare direct target SVG pixels with endpoint reconstruction in straight sRGB; tiny differences are quantization, not exact bit parity.

| Density | Backing | Maximum alpha difference | Maximum straight RGB error /255 | Maximum premultiplied RGB error /255 | Mean straight channel error /255 | Nonzero alpha bounds |
| ------- | ------- | -----------------------: | ------------------------------: | -----------------------------------: | -------------------------------: | -------------------- |
| 1       | 31²     |                        0 |                          1.3412 |                               1.0303 |                         0.004743 | [13,13]..[17,17]     |
| 2       | 61²     |                        0 |                          1.6236 |                               1.1785 |                         0.002860 | [24,24]..[36,36]     |
| 4       | 121²    |                        0 |                          1.3412 |                               1.1308 |                         0.001464 | [47,47]..[73,73]     |

All tested alpha boundary pixels were0; all white−black RGB differences nonnegative. Device reported MAX_TEXTURE_SIZE8192; this says nothing about other devices and does not relax chosen2048 pages. Shader acceptance must compare actual uploaded/rendered bases against original direct SVG at several backgrounds, fractional coordinates and scales, with a small explicit byte tolerance (proposed max3/255). The above confirms the basis algebra and source raster behavior, not the completed Pixi shader.

### Official references and related specs

- PixiJS v8 texture guide: https://pixijs.com/8.x/guides/components/textures — TextureSource owns pixels/upload; Texture views carry frame/orig/trim; Prepare uploads ahead of display; source.unload frees GPU while preserving source memory; destroy/unload lifecycle.
- Current release Texture API: https://pixijs.download/release/docs/rendering.Texture.html — constructor `{source, frame, orig, trim}`, Texture frame/view bounds, trim/orig semantics, `destroy(destroySource=false)`.
- Spritesheet reference source (must pin to chosen release when implementing): https://github.com/pixijs/pixijs/blob/dev/src/spritesheet/Spritesheet.ts — sourceSize/spriteSourceSize path. Do not assume `meta.scale` handles fractional source DrawFrame dimensions automatically.
- PixiJS compressed-texture guide: https://pixijs.com/8.x/guides/components/assets/compressed-textures — optional loaders, not a requirement for lossless PNG delivery.
- Relevant specs: `.trellis/spec/frontend/component-guidelines.md` (source registration/layers/filter integrity, cache/quality/loading); `.trellis/spec/frontend/quality-guidelines.md` (headless limits, same-condition performance evidence, default diagnostics off); `.trellis/spec/shared/simulation.md` (do not alter authority/presentation frames); `.trellis/spec/guides/cross-layer-thinking-guide.md` (new source→atlas→loader contracts).

## Caveats / Not Found

- Research does not implement atlas encoding/packing, runtime loader, shader or disposal; estimates must be replaced by generated exact page byte counts and runtime ownership checks.
- Cropped-background fractional mapping and tile-gutter seams need screenshot/pixel regression; preserving current SVG registration mathematically does not prove browser sampling parity.
- The browser raster itself can differ from native Flash; preserving Chromium output retains the current source/filter conversion, not native Flash conformance.
- Pinning browser build is necessary but CPU/platform differences could change raster or PNG bytes. Verify two clean consecutive local builds before claiming deterministic assets.
- ImageSource premultiplication/color-space settings and renderer shader output conventions must be checked against the exact installed Pixi version. The confetti proof assumes opaque body color, unchanged source alpha/filter tree and sRGB fixed filters; a future source graph change must fail basis-contract checks and trigger re-evaluation.
- Physical phones/GPUs, Safari/Firefox, total process/GPU memory, energy use and physical touch/gamepad latency remain unmeasured.
