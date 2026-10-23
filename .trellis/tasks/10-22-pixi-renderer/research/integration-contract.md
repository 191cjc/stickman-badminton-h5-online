# Shared implementation contract (approved design refinement)

## Ownership

- Pipeline implementer: `tools/flash-assets/*` new atlas tools, `src/client/atlas-manifest.ts` pure types/manifest validation if desired, generated `public/classic-atlas/**`, pipeline-specific tests. Main owns package dependency edits/install/scripts and docs.
- Renderer implementer: `src/client/renderer.ts`, new `atlas-loader.ts`, `confetti-mesh.ts` and renderer/loader tests including replacement of obsolete Canvas renderer-loading tests. Do not edit main/package/pipeline files without coordination.
- Main: `main.ts`/loading integration, browser scripts, documentation/specs, final verification and cleanup.

No one is alone in the workspace; retain others' edits and coordinate contract changes before diverging.

## Manifest contract

`public/classic-atlas/manifest.json`, schema1:

```ts
interface AtlasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface AtlasFragment {
  page: string;
  frame: AtlasRect;
  trim: AtlasRect;
}
interface AtlasFrame {
  sourceSha256: string;
  pixelWidth: number;
  pixelHeight: number;
  fragments: AtlasFragment[];
}
interface AtlasPage {
  path: string;
  sha256: string;
  width: number;
  height: number;
  rgbaBytes: number;
  group: string;
}
interface AtlasVariant {
  pages: Record<string, AtlasPage>;
  frames: Record<string, AtlasFrame>;
  groups: Record<string, string[]>; // page ids
}
interface AtlasManifest {
  schema: 1;
  sourceManifestSha256: string;
  generator: {
    playwrightVersion: string;
    chromiumVersion: string;
    algorithm: string;
  };
  variants: Record<"hd" | "sd", AtlasVariant>;
  dom: Record<
    string,
    { path: string; sha256: string; width: number; height: number }
  >;
  confetti: { base: string; delta: string }; // keys into variants.frames
}
```

Frame keys normally original SVG path. Confetti keys `confetti:black`/`confetti:delta` use source confetti hash and common original DrawFrame mapping. Both basis fragments must share pixelWidth/Height and trim so mesh may sample different page rects at identical local UV. Groups: `court`, `common` (all score/intro-name/UI/FX/shuttle + confetti), `swing-adult`, `swing-toaster`, `body-${characterId}`. DOM map keyed by original preview/rematch source paths; only previews and rematchUp/Over required. `court` includes background, net, markers, brand. Exclude unused UI more buttons from GPU groups. Scene pages strictly≤2048, gutters2, no mipmaps; validated total current pages≤96MiB estimated RGBA. Select hd if world density>2, else sd; over budget choose sd. Do not load both tiers/all roles or upshift adaptively during ordinary rendering.

Logical mapping: x = DrawFrame.x + trim.x * DrawFrame.width / pixelWidth; width = trim.width * DrawFrame.width / pixelWidth; likewise y. Preserve full original background DrawFrame mapping and fragment coordinates; background crop is optional only if fractional equivalence verified. Source manifest hash uses exact existing manifest bytes; future SVG source edits require rebuild. Filenames are content-addressed relative to classic-atlas/. DOM previews must not keep product SVG paths. Pin playwright1.62.0 / Chromium151.0.7922.34 (installed revision1234) and pixi8.22.0; Node24+.

## Renderer/main API

```ts
new Renderer(canvas?:HTMLCanvasElement, onContextChange?:(available:boolean)=>void)
load(onProgress?):Promise<AssetManifest> // Pixi init + source/raster manifests + DOM art
prepare(viewport,state,effects,onProgress,mirrored=false):Promise<boolean>
readyFor(state:GameState):boolean // required role/family pages prepared
render(viewport,state,effects?,mirrored=false):void // no Canvas2D argument
domUrl(sourcePath:string):string // versioned baked PNG URL
clearEffectsImages():void // reset sprite/transient scene ownership, preserve reusable loaded pages if safe
diagnostics():object
destroy():void
```

`prepare` chooses one tier once (first actual viewport), loads exact court/common/body/family groups, releases unused old groups BEFORE allocating new, initializes TextureSources into GPU with paint yields and exact progress. Protect generation/cancellation. `readyFor` remains false until upload completes for exact pair; context loss returnsfalse. `prepare` must throw LoadingError on actual failure, returnfalse on invalidation. Main loops at most3 times for state/view changes, with one in-flight preparation. Main owns loading cover/assetsReady/input gates and snapshots continue throughout. Renderer doesn't own clocks, authority, DOM loading UI or input listeners.

On ordinary quality decrease, resize renderer using effective viewport.dpr and retain current sources/effects. `clearEffectsImages` is called on matched/queue/reconnect/exit; it must not cause repeated same-role re-fetch/upload churn. Explicit active-set replacement in prepare reclaims old pages. Context loss listener prevents default, callbackfalse gates main; restore callbacktrue triggers prepare/reupload latest scene through existing UI. Pagehide persisted=true retains valid ownership; terminal exit destroys.

## Regression / acceptance boundaries

Renderer implementer rewrites Canvas-specific renderer-loading tests around actual Pixi display transforms/scene order using a narrowly mocked WebGLRenderer, actual Container/Sprite/Texture types where practical. Preserve frozen state/effects, readable displayed score/names, body-after-swing, particles around overlays and source registration/trim. Loader tests cover malformed manifests/page bounds/version, exact group ownership, cancellation/failure/stale completions/disposal and context restoration as meaningful.

Runtime product must not create any SVG/Blob-per-color work. Old raster-cache/confetti-images code may be removed by main after tests are migrated; do not silently retain their product call paths. Build-stage helper tests should verify recolor restriction, no source mutation, gutter neighbors, exact source mappings and deterministic output.
