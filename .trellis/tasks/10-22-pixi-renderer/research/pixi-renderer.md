# Research: PixiJS renderer integration and behavioral contracts

- Query: Determine exact PixiJS 8.22.0 APIs, existing rendering/state ownership, ordered scene graph, resource readiness/lifetime boundaries, and meaningful migration regressions.
- Scope: mixed; read-only product/source inspection and official versioned API/package references. No dependencies installed and no product files changed.
- Date: 2026-10-22

## Findings

### Files found and relevant specifications

| File                                              | Role / source evidence                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/client/renderer.ts:37`                       | Current SVG loading, first-frame preparation, Canvas composition and registration.                                               |
| `src/client/main.ts:44`                           | Owns canvas/context, global scene, loading gate, network callbacks, input and single RAF.                                        |
| `src/client/loading.ts:1`                         | Progress/error contracts; six image workers; 15s image/fetch+body timeout; cancellable batch and paint yield.                    |
| `src/client/render-quality.ts:1`                  | Existing lower-only backing density policy, independent from debug. Keep timing/eligibility.                                     |
| `src/client/raster-cache.ts`                      | Obsolete runtime filtered-SVG raster mechanism; bounds/identity tests document prior behavior, not required Pixi implementation. |
| `src/client/confetti-images.ts:1`                 | Recolors ONLY the marked nested body path before applying unchanged original filter.                                             |
| `src/client/effects.ts:104`                       | Sole presentation clock/cursors, particles/sparks, natural result clones, finish ordering.                                       |
| `src/shared/classic/manifest.ts:4`                | `DrawFrame` fractional registration and bounds; schema2 source manifest.                                                         |
| `src/shared/classic/animation.ts:17`              | Authority clip clock with frame script execution; do not replace with AnimatedSprite.                                            |
| `src/shared/classic/assets.ts:4`                  | Family-aware source-derived animation and racket geometry.                                                                       |
| `src/shared/classic/presentation.ts:8`            | Authority cosmetic events, independent IDs/ticks/cosmetic RNG.                                                                   |
| `tests/renderer-loading.test.ts:119`              | Existing real-manifest loading/preparation and Canvas recording tests, including transform/depth assertions.                     |
| `tests/loading.test.ts:37`                        | Meaningful image/fetch timeout, failure cancellation, progress and background yield tests to retain.                             |
| `tests/classic/assets.test.ts`                    | Frozen-source digests, role/family/depth/filter registration witnesses. Preserve these source contracts.                         |
| `tools/flash-assets/README.md:77`                 | Reproducible schema2 export; source registration/filter padding; depth and timeline explanation.                                 |
| `docs/design.md:50`                               | Startup gate and known deferred-raster limitations; design must be updated for new pipeline.                                     |
| `docs/design.md:98`                               | Existing source order and nested-body tint constraints.                                                                          |
| `docs/validation.md:146`                          | Prior DPR1/2 two-client measurements and explicit headless/shared-host limitations.                                              |
| `package.json`, `tsconfig.json`, `vite.config.ts` | Node >=24, TypeScript6.0.3, Vite8.0.16, ES2022/ES modules, strict bundler resolution, existing production base path.             |

Relevant specs read: `.trellis/workflow.md`; `.trellis/spec/frontend/index.md`, `component-guidelines.md`, `state-management.md`, `event-lifecycle.md`, `quality-guidelines.md`, `type-safety.md`, `directory-structure.md`; `.trellis/spec/shared/index.md`, `simulation.md`, `protocol.md`; `.trellis/spec/guides/index.md`. Their Canvas-specific implementation descriptions need revision after migration, while authority, input, original source, loading, diagnostics and view contracts remain requirements.

### Stable dependency and exact official APIs

Pin `pixi.js` to `8.22.0`, then commit the application lockfile through the implementation owner. Registry metadata confirms this published non-prerelease version exports ESM `lib/index.mjs`, declarations `lib/index.d.ts` and a separate `types@<6.0` compatibility declaration. The project's TypeScript6/bundler setup matches the main declaration path. This is compatibility research, not a completed compile test.

Official sources retrieved successfully on 2026-10-22:

1. <https://registry.npmjs.org/pixi.js/8.22.0> — exact version, package exports/declarations.
2. <https://pixijs.com/8.x/guides/components/renderers> — direct `new WebGLRenderer(); await renderer.init(options)` and manual `.render({container: stage})`; describes WebGL as stable/recommended.
3. <https://pixijs.com/8.x/guides/components/application> — async init; `autoStart:false` alone does not stop a shared ticker already running. Avoid Application entirely for this project.
4. <https://pixijs.com/8.x/guides/components/assets> — Assets caches/promise identity and explicit unload; useful reference, but does not promise this project's bounded request/body timeout.
5. <https://pixijs.com/8.x/guides/components/textures> — `TextureSource` owns backing data/upload, multiple `Texture` views share it; `source.unload()` frees GPU resources but retains image/source.
6. <https://pixijs.download/v8.22.0/docs/rendering.WebGLRenderer.html> — `new WebGLRenderer()`, async `.init(options)`, `.resize(cssWidth, cssHeight, resolution?)`, `.render(...)`, `.destroy(options?: RendererDestroyOptions)`.
7. <https://pixijs.download/v8.22.0/docs/rendering.GlTextureSystem.html> — public `initSource(source: TextureSource): void`, `bindSource(source, location?)`, `getGlSource(source)`; **direct per-page upload can avoid a preparation ticker**.
8. <https://pixijs.download/v8.22.0/docs/rendering.PrepareBase.html> — `.upload(resource?): Promise<void>`, default `uploadsPerFrame=4`. It is an alternative, not necessary when zero Pixi ticker activity is desired.
9. <https://pixijs.download/v8.22.0/docs/rendering.Texture.html> and <https://pixijs.download/v8.22.0/docs/rendering.TextureOptions.html> — `new Texture({source, frame, orig?, trim?, rotate?})`; `.destroy(destroySource=false)`.
10. <https://pixijs.download/v8.22.0/docs/rendering.TextureSource.html> and <https://pixijs.download/v8.22.0/docs/rendering.TextureSourceOptions.html> — `.destroy()`, `.unload()`, `resolution`, `pixelWidth/pixelHeight`, resource ownership, linear sampling/wrap/mipmap options.
11. <https://pixijs.download/v8.22.0/docs/rendering.ImageSource.html> — image-backed texture source.
12. <https://pixijs.download/v8.22.0/docs/rendering.GlContextSystem.html> — `renderer.context.isLost`, `forceContextLoss()` and WebGL system responsibilities. Use actual browser context loss/restoration events for application readiness.
13. <https://pixijs.download/v8.22.0/docs/scene.Sprite.html> — trimmed texture's original/trim distinction; scale and visual bounds.
14. <https://pixijs.download/v8.22.0/docs/rendering.ViewSystemOptions.html>, <https://pixijs.download/v8.22.0/docs/rendering.ContextSystemOptions.html>, <https://pixijs.download/v8.22.0/docs/rendering.RendererOptions.html> — existing-canvas initialization, optional `preferWebGLVersion:1|2`, backing resolution and `autoDensity` semantics. These pages were retrieved after the first research draft.

Versioned references are the API authority; generic 8.x guide pages can change. Several GitHub raw tag requests timed out; the one successful `v8.22.0/src/rendering/renderers/autoDetectRenderer.ts` fetch confirms `preference` supports `'webgl'|'webgpu'|'canvas'` and arrays. No need to depend on auto-detection: choose direct WebGLRenderer, preferably WebGL2 with WebGL1 fallback allowed by its option, and surface an understandable loading failure if initialization is unavailable. Do not claim an implemented/tested Canvas fallback.

Recommended initialization shape (design, not applied code):

```typescript
const gpu = new WebGLRenderer<HTMLCanvasElement>();
await gpu.init({
  canvas,
  width: view.width,
  height: view.height,
  resolution: view.dpr,
  autoDensity: false,
  background: 0x101722,
  backgroundAlpha: 1,
  antialias: false,
  roundPixels: false,
});
// Existing RAF only; after updating retained display objects:
gpu.render({ container: stage });
// Only when CSS size / effective density changed:
gpu.resize(view.width, view.height, view.dpr);
// After decoding a real page and yielding to paint:
gpu.texture.initSource(pageSource);
```

`autoDensity:false` keeps CSS dimensions owned by existing layout; manual canvas.width assignments from main must be removed, as Pixi owns backing resize. Keep fractional transforms (`roundPixels:false`) to avoid jitter/parity changes. A first visible render of the prepared retained scene under the cover can also compile ordinary sprite/mask shaders; upload completion alone does not prove no first draw shader cost. Time both upload and first render in validation.

### Existing animation ownership (must remain)

`main.ts:667` schedules the next RAF once, clamps presentation dt, advances local Prediction/audio, samples Interpolation, advances Effects at authority presentation tick and then renders. Input pacing/gamepad sampling have their own existing owners and are not driven by sprite rendering.

`renderer.ts:267` selects the 1-based clamped net frame. `renderer.ts:292` chooses the action frame from the actor's family and the 1-based swing frame, and chooses the body label/frame from state (`(bodyFrameIndex-1)%length`). `effects.ts:210` owns particle/spark/natural-result timelines; result-player deep clones continue their source callbacks. Renderer must only read them. Repeated Pixi renders with identical frozen state/effects must not change any clip, RNG, particle, presentation cursor or state.

Use `Sprite.texture = ...` for state-selected frames. Do not construct/start `AnimatedSprite`, register `Ticker` callbacks, or introduce a renderer wall-clock frame counter. Page recovery must not advance missed gameplay or replay old audio.

### Ordered scene graph and transforms

Use a retained stage with letterbox background clear color, a court viewport container at `(offsetX, offsetY)` with scale `(view.scale, view.scale)`, and a fixed 640×426 rectangular mask. A rectangular Pixi Graphics mask is acceptable; include it in preparation and ensure mask transforms are not accidentally multiplied twice. **Do not mirror the whole court/root or CSS canvas.**

Make separate world-transformed containers where required by depth, all sharing either identity or `T(640,0) S(-1,1)`; readable layers remain siblings at identity:

| Order | Layer                                            | Transform / special rule                                                      |
| ----- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| 1     | Background then current net                      | World mirror.                                                                 |
| 2     | Score or P1/P2 win image                         | Readable; select content by displayed sides, not real authority side.         |
| 3     | P1/P2 ground markers                             | World mirror, including source glyph orientation (existing behavior).         |
| 4     | Smoke particles in existing array order          | World mirror; particle local transform below.                                 |
| 5     | Left real actor, then right real actor           | World mirror, independent actor mirror; swing before body.                    |
| 6     | Tail particles                                   | World mirror.                                                                 |
| 7     | Standalone shuttle                               | World mirror; absent while state is attached.                                 |
| 8     | Original courtBrand                              | Readable; depth38 source art, bounds may extend beyond stage and are clipped. |
| 9     | Intro decoration then displayed left/right names | Readable; translate `(320,213)`, alpha=`introAlpha`.                          |
| 10    | Sparks with `order < effects.finishOrder`        | World mirror. Intro is already behind these.                                  |
| 11    | Finish decoration                                | Readable; translate `(320,213)`, alpha=`finishAlpha`.                         |
| 12    | Sparks with `order >= finishOrder`               | World mirror.                                                                 |
| 13    | Confetti particles                               | World mirror; always above finish and sparks in current implementation.       |

Source: `renderer.ts:178-247`. A single global `fx` container over/under all UI cannot preserve this ordering. Set `sortableChildren:false` and use explicit child insertion/order. Pool sprites/containers by the maximum current scene demand, hide/reuse them, and clear stale visibility each frame; avoid constructing/destroying all sprites every RAF or retaining unbounded historic particles. `MAX_PARTICLES=768` (`effects.ts:36`) bounds simulation objects.

Exact local transforms:

- Actor: `T(player.x-0.05, player.y) * S(classicDirection(player.side)*1.25, 1.25)` (`renderer.ts:303`). Both swing and body are siblings in this order. Pirate's depth21 attachment is already inside its exported body, above swing; **do not invent a separate attachment** without splitting the source export.
- Shuttle: `T(shuttle.x-0.05, shuttle.y) * R(rotationDegrees)`; source rotation0 points upward. Attached shuttle is already in the serve image until source release.
- Spark: `T(spark.x,spark.y) * R(dirDegrees) * S(0.3,0.3)`, source selected `frames[spark.frame-1]`.
- Any particle: `T(x,y) * R(rotationDegrees) * S(scale,scale)`; alpha currently comes from source image (no new lifetime fade).
- World mirror: background/net/markers/actors/world FX only. Score content, winner image and name variants use `displaySide(...)` (`renderer.ts:273-290`). `mirrored()` itself depends on stored preference plus true side (`main.ts:189`); leave its input inversion behavior unchanged.

### Atlas registration, trim, filtering and identity

Keep the schema2 source manifest and DrawFrame coordinates available to audio, DOM previews and source tests. A separately versioned atlas manifest maps source-path identity/hash to a PNG page rectangle and full-raster/trim data. The frozen SWF/XML/reference archives must remain read-only. The pipeline owner should decide the output directory to avoid `build.py` deleting derivative atlases when it replaces generated `public/classic/`.

Two valid registration implementations:

1. Standard Pixi trim: Texture `frame` is the cropped atlas rect, `orig` is the full pre-trim raster rectangle, `trim` is its cropped area relative to full raster; Sprite anchor0 position remains `(DrawFrame.x, DrawFrame.y)`, and independent x/y scale map full raster dimensions to exact DrawFrame.width/height. Do not set cropped dimensions as original logical dimensions.
2. Simpler explicit compensation: Source resolution1, Texture `frame` only, Sprite anchor0; with full raster `(RW,RH)` and trimmed `(tx,ty,tw,th)`, set local position `(f.x + tx*f.width/RW, f.y + ty*f.height/RH)` and local display size `(tw*f.width/RW, th*f.height/RH)`. This exactly accounts for `ceil(width*density)` asymmetry and fractional logical sizes. Parent actor/world transforms apply outside this.

Do not use `trimX/bakeDensity` alone if ceil-rounded dimensions were rescaled to exact source width. Do not change anchor to0.5 or re-center each frame; feet, racket and filter padding would drift. Preserve empty animation frames as transparent rects so array/frame timing never changes. Dedupe texture pixels by source content, but keep each DrawFrame's separate registration. Existing aliases can share GPU image data without sharing logical x/y.

Use transparent lossless PNGs, linear filtering, clamp-to-edge and at least1–2 extruded edge texels plus transparent separation. Disable mipmaps for tightly packed atlas pages unless padding is generated for all mip levels; clamp applies to page boundary, not sprite subrects. Preserve full filter alpha tails in trimming, and compare enlarged rotated/mirrored spark/tail/smoke edges for bleeding. Query `gpu.gl.getParameter(gpu.gl.MAX_TEXTURE_SIZE)` after init; emitted pages should conservatively fit2048 by default and be checked before upload. Do not silently upload oversized pages. No single4x atlas of every role.

The real source manifest has507 resources (499SVG/8MP3). Content dedupe is valuable: measured unique source counts from manifest SHA256 are Joe18/34 body paths, Pirate18/34, Toaster1/4; adult swing68/69; Toaster46/73; net7/24; spark9/25. Untrimmed unique world-size RGBA estimates are adult swings8.02MiB, Toaster swings5.17MiB, spark1.78MiB and all scores1.27MiB. **These are source-area estimates before bake density, packing, trim, browser and GPU copies**, not resident memory measurements. Density2 multiplies area by4; blanket density4 would multiply by16.

Suggested resource groups: base court/net/markers/brand/shuttle/scores/intro/finish/effect pages, adult action family, Toaster action family, each role body set, optional displayed name/preview pages. Retain only current scene/selected pair families and roles, plus a small explicitly bounded warm set if measured useful. Authoritative frame selectors must always find every animation frame of a loaded role, avoiding first-use SVG work.

### Dynamic confetti color

Original `confetti-01.svg` marks only the4.1×4.1 body (`data-confetti-body=true`); full filtered image is30.1×30.1 with13padding and original origin(-15.05,-15.05). The effect includes bevel and black blurred shadow. Whole-sprite `sprite.tint` would color the bevel and violates the nested-body contract (`confetti-images.ts:1`). Prebaking one arbitrary red image and tinting it cannot reproduce other channels.

The current filter chain's alpha/offset/composite/bevel shape depends on SourceGraphic alpha, and body RGB enters only the later `atop` composition. Therefore a two-bake basis is a promising exact GPU method: bake unchanged full filter with body black and body white, use the same full dimensions/trim union, sample both as premultiplied textures, and reconstruct `rgb = black.rgb + (white.rgb-black.rgb)*bodyRGB`, `alpha=white.a`, using premultiplied normal blending. Preserve black bevel/shadow; only source-color contribution varies. Verify black/white alpha equality and several colors/edge pixels against direct recolored SVGs; 8-bit PNG and linear filtering introduce quantization, so **exact pixel equivalence is a hypothesis until measured**. A tiny shared geometry/shader with per-particle color is more appropriate than a full-screen filter per particle. Keep resulting draw order in the confetti layer. No per-color SVG/Blob image generation in runtime.

### Proposed Renderer boundary and integration entry points

Minimal new public shape:

```typescript
new Renderer(canvas: HTMLCanvasElement, onContextChange?: (ready: boolean) => void)
load(onProgress?: (p: LoadingProgress) => void): Promise<AssetManifest>
prepare(view: Viewport, state: GameState, fx: Effects | undefined,
        onProgress: (p: LoadingProgress) => void, mirrored?: boolean): Promise<boolean>
readyFor(state: GameState): boolean
render(view: Viewport, state: GameState, fx?: Effects, mirrored?: boolean): void
clearEffectsImages(): void
resize(view: Viewport): void
destroy(): void
diagnostics(): Readonly<RendererDiagnostics>
```

This matches the main-session agreed integration direction: main owns asynchronous UI/RAF and calls `readyFor` before presenting a changed pair. `clearEffectsImages()` clears pooled scene ownership and inactive actor data, with a pending/current pair pin so matched/queue cleanup cannot delete data required by in-flight prepare. `readyFor` checks base+both body/family groups and current context generation, never advances clocks, and does not perform asynchronous work from render.

`prepare` means: select needed base + role/family groups, fetch/decode bounded pages, construct shared TextureSources/rect views, upload each newly needed page with real completed/total progress, prepare first scene, and check generation immediately before success. It should cover **all frames for active characters and effects**, rather than current pose only. Keep current `loadImages` request control but extend the path format to png; custom ImageSource/Texture construction gives explicit resource ownership. If Assets is used instead, add equivalent timeout/late-result cleanup; `Promise.race` alone does not cancel the actual loader or its cache entries.

Call sites requiring changes:

1. `main.ts:44-49`: do not call canvas.getContext('2d') first; a canvas cannot later become a WebGL canvas after a2D context exists. Renderer owns async WebGL initialization.
2. `main.ts:66`: construct Renderer with the existing DOM canvas; do not replace it (input/focus/accessibility listeners refer to it).
3. `main.ts:775`: load source+atlas manifests, start audio independently, set DOM preview URLs as today, then prepare current scene.
4. `main.ts:115` selection handler: optionally prefetch selected role in bounded background work, but do not claim room readiness from selection alone.
5. `main.ts:447` matched: capture actual pair/families from message, start scene asset gate; do not rely on first subsequent snapshot to discover missing roles. Keep authority snapshots flowing behind loading UI.
6. `main.ts:476`: after snapshot handling, synchronize input only when current scene resources/context are ready.
7. `main.ts:717-733`: retain RenderQuality.observe policy, replace raster invalidation with renderer.resize; remove manual canvas.width/height and ctx.setTransform. Call render(view,state,fx,mirrored).
8. `main.ts:347/434/464/504`: scene resets currently invalidate rasters. New cleanup should reset pooled scene sprites and release obsolete role pages without needlessly dropping shared court textures or same-role pair still being prepared. Reconnect pause can clear transient effect sprites while keeping current role resources for fast resume.
9. Visibility handler/blur: preserve existing release/effects suspend/audio baseline behavior; visibility restore resets lastTime/quality observation and rechecks view/context. Do not mutate authority to recover graphics.
10. pagehide/HMR cleanup: distinguish persisted bfcache pagehide (suspend) from final disposal; remove GPU/context/resize listeners and destroy unique texture views/sources/pooled nodes once. Do not leave a WebGL context and uploaded role pages alive after HMR.

`clearEffectsImages`/`invalidateRasters` may temporarily remain adapters to reduce main churn, but their old memory semantics must not be copied literally: reducing backing density should retain live effect objects and already decoded atlas pages, and normally requires only backbuffer resize. Update diagnostics/scripts/tests so obsolete raster counters do not masquerade as GPU memory.

### Asynchronous room/selection/loading hazards

Current startup allows WS to restore a retained room before load completes and intentionally never calls `idle()` after readiness (`main.ts:750-800`). Preserve this and add a **generation tied to actual scene/room/role-set/context**, not changing snapshot ticks.

Required behavior:

- matched A → slow role download → leave/idle or matched B: completion of A can cache only bounded data still owned; it must not hide B's cover, restore A focus, unlock input, unload B's pages or paint A's players.
- matched arrives while startup load/prepare is in flight: derive required groups from the newest scene and retry only due actual group/context/viewport generation change. Arrival of every snapshot must not invalidate preparation or a live room will never become ready.
- queued/matched resets should not destroy already prepared shared groups or create two simultaneous loaders for the same page. Track in-flight promise identity and refcounts/desired generation.
- result/no-room message during load: preserve current result/backdrop and load the retained visible pair; don't switch to selected next-match preview role until the next court actually needs it.
- preload failure: retain a categorized readable error and an enabled retry/exit action. All ordinary game commands remain gated; stale worker callbacks cannot advance progress. A retry must create a fresh promise/token, not reuse a rejected cached promise forever.
- role gate and global startup readiness should be distinguishable. Simply setting `assetsReady=false` for room loading makes existing `leaveMatch()` return early (`main.ts:218`), disables settings/start and can trap a failed live room. Prefer `startupReady` plus `sceneReady/contextReady` for sampling/rendering, with explicit court action behavior; keep Leave reachable for an online resource failure.
- reveal clears held input exactly once, resets input clock, and focuses canvas only if still online and settings are closed. Do not reset Prediction/Interpolation/Effects/Audio or replay sounds because an atlas arrived.
- image request/file-hash URLs include current atlas build hash and page SHA; validate manifest/source hash association, path traversal/type/hash/rect bounds/page sizes, required frames/groups and schema before decoding/uploading. Do not accept a source manifest from one release plus atlases from another.

### Context loss, resize and cleanup

Attach `webglcontextlost` and `webglcontextrestored` listeners to the existing canvas. On lost: prevent default to permit restoration, gate presentation/input and clear held commands via main, invalidate preparation generation, show a real restoring status, stop issuing uploads/draws, retain current authority/room and decoded pages. Context loss is a graphics event, not a network reconnect.

On restored: allow Pixi's context systems to recreate themselves, yield to the next task/frame before application reupload, read current capabilities, resize to current view/quality, reupload the **latest required group set**, draw/prewarm under cover, then reveal only after generation checks. Keep same role pages, mirror preference, quality stage, result art and effect data; let existing Effects resume/baseline rules suppress historical audio. Include bounded failure/retry if repeated restore fails; don't spin forever. Verify actual events with `WEBGL_lose_context` in browser; unit tests can only prove gate/lifetime state transitions.

Resize uses existing viewport() math including width/height/scale/offset/DPR. `gpu.resize(width,height,dpr)` handles backing allocation; retained root/mask transform is updated. No CSS scale or world coordinate changes. A quality downgrade no longer needs to discard textures, regenerate SVGs or clear particles. Make texture source ownership explicit: destroying individual view textures with `destroy(false)` must not destroy a shared source; destroy each released page source once and remove image references/close ImageBitmaps if owned. Estimates use actual decoded page pixelWidth×pixelHeight×4 plus known mip overhead, not compressed PNG bytes, JS heap or total GPU/process memory.

### Meaningful regression structure

Retain existing non-rendering input/protocol/prediction/core/effects/audio tests. Replace obsolete `drawCachedFrame`/RasterCache-specific renderer assertions rather than retaining dead runtime caching solely to satisfy tests.

Recommended coverage:

1. **Atlas/source contract tests** with actual generated manifests and PNG metadata: every source DrawFrame resolves, frame order/counts unchanged, page dimensions/crop bounds and source hash association, empty frames, alpha padding, source registration including fractional ceil-density mapping, deduped images retain different alias x/y, role/family group membership and no unnecessary roles.
2. **Real Pixi scene graph tests**, using actual Container/Sprite/Texture/Rectangle objects with fake image-backed page sources and a narrow injected GPU backend adapter (init/resize/upload/render/destroy). No need for Node WebGL. Update transforms through a supported render/transform path; verify world transforms via Sprite.toGlobal at source registration and bounds corners. Avoid testing private Pixi fields.
3. Port `renderer-loading.test.ts:419` high-value fixture: Pirate/Toaster, offset viewport, rotated shuttle/sparks, smoke/tail/confetti, frozen state, intro and finish simultaneously, sparks on both sides of finishOrder. Flatten actual child traversal and compare source paths, positions/corners and determinant signs against independent expected matrices; assert score2-1, swapped intro names, P2/P1 wins in mirrored view. Assert swing precedes body and actor origins/family frame semantics on both sides. Deep freeze original game state and compare effects before/after repeated renders.
4. **Loader/gate state tests**: real page completions counted exactly once,6-worker bound, total includes decode/upload steps, errors/timeouts abort outstanding jobs, late callbacks don't revive state, source-version mismatch rejects before upload, retry after rejection, and stale matched A completion cannot reveal B/idle. Page sharing/refcount release and same-role rematch reuse should be observable.
5. **Lifecycle/quality tests**: resize calls backend once per changed triple; quality downgrade keeps current textures/Effects; loss gates uploads/render/input; restore reuploads latest group once, retains active state; destroy/HMR removes listeners and releases sources once; no Application/AnimatedSprite/ticker owner is constructed.
6. **Confetti visual numerical regression**: representative source colors black/white/red/green/blue/mixed plus256-carry color contract; compare direct SVG raster to basis reconstruction before GPU, preserving bevel/shadow and same alpha. Browser screenshot exercises actual shader/blending/rotation.
7. Browser acceptance remains required for real GPU behavior: first open/new action, all seven roles/body+actions, DPR1/2, actual two-client room authority equality, view toggle, touch/gamepad/settings, loss/restore, resize, natural7-point result/rematch and no stale textures. Screenshot source Canvas checkpoint vs Pixi under fixed inputs/state, with both baseline PNG/raster differences and subjective full-scene inspection.

Use deterministic source selectors/matrix expectations as oracles, not a test that simply repeats the new renderer's implementation or counts calls to a no-op mock. If a pure render-command builder is introduced for testing, actual Pixi binding still needs integration assertions and browser evidence.

### Measurements and acceptance interpretation

Record Canvas baseline **before** dependency/product implementation, same browser binary, software/hardware GPU configuration, machine contention, two-page setup, viewport/DPR, roles, commands, cold profile/caches and stable duration. Existing docs contain historical values but those are not this migration's same-condition baseline. Preserve actual quality/backbuffer stages in each measurement, as adaptive lowering can otherwise produce a misleading comparison.

Record navigation→source manifest, atlas fetch/decode, GPU upload, first covered render, reveal/ready; resource transfer/decoded image/page counts; frame-gap p95/window+sample count; count/duration/max of long tasks; JS heap only when supported; upload/page RGBA **estimates** separately. Include cold startup, first selected new role/action and warmed continuous/result/rematch segments. Stats gathered by debug scripts are not a product always-on diagnostic requirement. Keep default `?debug=1` observer/export gating, detached bounded counters, no identity/room/Cookie export.

Improvement expectation is removal of runtime SVG filter raster cost and per-color Blob work; shader compilation, decode/upload/backbuffer allocation, network/authority scheduling and low-end GPU fill cost can remain. Do not claim60FPS, native Flash pixel parity, total GPU memory or physical-device latency from headless data.

## Caveats / Not Found

- This research produced no implementation, dependency install, asset build, baseline run, screenshots or performance results.
- Official versioned API pages were available; multiple raw GitHub source fetches timed out. API source-internal event ordering was not fully inspected, so actual loss/restore behavior must be checked in the selected version/browser.
- Generic8.x guide text and versioned API signatures differ in details (for example evolving GC terminology); compile against installed8.22.0 declarations rather than copy an old option blindly.
- Lossless PNGs preserve baked pixels, but bake density, browser SVG-filter implementation, sampling/quantization and source Flash filters can still change visible detail. Confetti basis reconstruction needs measurement before acceptance.
- Application fallback browsers, physical phones, Safari/Firefox/Edge, weak devices and real hardware gamepads have not been verified by this planning work. Scope them accurately in delivery documents.
