# Proposed migration work commits

Implementation, assets, browser verification and final quality gates are complete. The user approved this concrete Phase3.4 plan with “继续” on 2026-10-23, authorizing both work commits and the subsequent task archive/journal. Both work commits are complete: implementation `5573394dabe264632f08c048bbd0f854bb25a45e` and documentation `7c723f5b068b2d35bb36de0200ce0e1d5622a485`. Original Canvas rollback tag/commit/bundle remain available. No remote exists and no production deployment occurred.

## 1. feat: migrate classic rendering to PixiJS WebGL

Runtime renderer/loading/quality, reproducible lossless atlases, dependencies, regressions and local verification tools. Exact paths (68):

- `index.html`
- `package-lock.json`
- `package.json`
- `public/classic-atlas/dom/image-21e6cb92905a01fad27f40878752d9f5b69548c9ddbc314379d0bd1188f6c8f6.png`
- `public/classic-atlas/dom/image-2608d8204526816d7ba42a5b9884a6f96a938164c463c00f063418451b116c9b.png`
- `public/classic-atlas/dom/image-6ae6726572ce243da71b0fac99b0dee387d7219aa4030fcd3161ef5986b5404b.png`
- `public/classic-atlas/dom/image-783e06447ae13329cfffc11eb8087f25e86bb21ab961e6759c5ed8427cf191e0.png`
- `public/classic-atlas/dom/image-79da8aabb0db08a861189e46c7ecb5e094d60badf0ec0f5f8aabca57dc48562c.png`
- `public/classic-atlas/dom/image-a5dc771400fbdbad1bc52e5394155f659fde2a901d05858e0288d7a086873cec.png`
- `public/classic-atlas/dom/image-b0d63a82b641caa38e12300ee4bc6e240be9020f36fa64e653651733e6b17a7b.png`
- `public/classic-atlas/dom/image-bb6246f89300ce41f6584171341935854592a850b390cb93e1155ec1421ea121.png`
- `public/classic-atlas/dom/image-bd4017072d785f26f1a5e2164ead9ebeca655b0334a834b2bb5a329f41580360.png`
- `public/classic-atlas/hd/body-harry-1254f13de3e6dc68d02d309369457a47d4ac2fb56453236b67342a3d57557bbc.png`
- `public/classic-atlas/hd/body-joe-de95e6f61e6ae29393559e69caecadaa6ee3ccdee5e9563f2ca626e0dc0ae9dc.png`
- `public/classic-atlas/hd/body-nadia-1cdbf8da460c321436d2e8d51120b5d359fa0aa85bfc8191ce19ccec9b2a0fa1.png`
- `public/classic-atlas/hd/body-pirate-feca4c76f2474d6c6f39925b45b3586c01c888b2a3285d31ae749548efa5e0d1.png`
- `public/classic-atlas/hd/body-red-a29781c1cb5d4b9dfc1c0ba3bf6b2a6afd3c0b65e7fdc1dce653239202684766.png`
- `public/classic-atlas/hd/body-toaster-809bff6820e8c9a0795b101dd1c5b00de0780aa203745e7020bd98a58e759910.png`
- `public/classic-atlas/hd/body-top-hat-c3562589d263770432b7e497545f7d9c3774ac678847fc29379ec686bd9d1ae8.png`
- `public/classic-atlas/hd/common-179056302d3376fadbf3546fcbeec33f24095aec2ca3432aa3cb6331a0a1c65a.png`
- `public/classic-atlas/hd/common-e5f867980578979c59599496ef12e115c370f6ff56109fb0537b9dac3a85dab2.png`
- `public/classic-atlas/hd/court-9444a5f2aad3a99efd58a58a06a8b9a1145e417083981fff398277996dcfa792.png`
- `public/classic-atlas/hd/court-e701e804f9e9d79210b12e2fe49a903dedbe32d0fa9c148c332fd32a74e42f07.png`
- `public/classic-atlas/hd/court-fc0e7133bcba6775e9d00394e50a1ad3f9741e4ff1d458957159e78461096357.png`
- `public/classic-atlas/hd/swing-adult-a1c3699a513651a63868d89851530fe7a2c207b7e36163d12dd1929448da67ae.png`
- `public/classic-atlas/hd/swing-toaster-893ea0ae453fdc7617e549982f37475e89b45ca4c7a02fddfc11516e8bf78d79.png`
- `public/classic-atlas/manifest.json`
- `public/classic-atlas/report.json`
- `public/classic-atlas/sd/body-harry-5e3c63369e684e8eb958aaccdca9f7b711488e776948e71967dc3598b5c3cea7.png`
- `public/classic-atlas/sd/body-joe-5d9e7ec375848a1c007692be7d7a39fb5f3180d57fede7883b5a22b9727b737c.png`
- `public/classic-atlas/sd/body-nadia-069fa1cfb90c3faa990c30fda0e652f3f1dc05f03875795373164aafdcb9e344.png`
- `public/classic-atlas/sd/body-pirate-841268216c933d243dc099528f7b92053813400d06f9949f734c85abf20eb62e.png`
- `public/classic-atlas/sd/body-red-eda62798400ad448c2e7679abb4fc1f85e2929ba84e316f42870919ae53a66e7.png`
- `public/classic-atlas/sd/body-toaster-a6defd116548c7f055948ff0283fee02847268b22be70e423dfdb4980753d5bb.png`
- `public/classic-atlas/sd/body-top-hat-5a23ce02d5eadc1ddb57babc601d0f841c1a2098466387b2e8fada6ec9cfa8b6.png`
- `public/classic-atlas/sd/common-f71eb86a4d9e745c228201bfb9680959c944e3d5d60db2277264071610c9ea86.png`
- `public/classic-atlas/sd/court-da3b6e9c382642beb36de541a94480f665e8630e90d12f76ff58414dbe35dc66.png`
- `public/classic-atlas/sd/swing-adult-9c11812462a1dffeb8a5fb7a4ed9063343d049c88def32cfcaf541cf3b308689.png`
- `public/classic-atlas/sd/swing-toaster-6e2d93397e72aa0c6a05fa1e3f4d559b1980ab2e129e3605758828d7fb16cbdd.png`
- `src/client/atlas-loader.ts`
- `src/client/atlas-manifest.ts`
- `src/client/confetti-images.ts`
- `src/client/confetti-mesh.ts`
- `src/client/main.ts`
- `src/client/raster-cache.ts`
- `src/client/render-quality.ts`
- `src/client/renderer.ts`
- `tests/classic/atlas.test.ts`
- `tests/confetti-images.test.ts`
- `tests/raster-cache.test.ts`
- `tests/render-quality.test.ts`
- `tests/renderer-loading.test.ts`
- `tools/flash-assets/atlas-utils.d.mts`
- `tools/flash-assets/atlas-utils.mjs`
- `tools/flash-assets/bake.mjs`
- `tools/flash-assets/verify-atlas.mjs`
- `tools/render-validation/acceptance.mjs`
- `tools/render-validation/benchmark.mjs`
- `tools/render-validation/fixture.css`
- `tools/render-validation/fixture.html`
- `tools/render-validation/fixture.ts`
- `tools/render-validation/lifecycle.mjs`
- `tools/render-validation/loading-retry.mjs`
- `tools/render-validation/server.mjs`
- `tools/render-validation/snapshot-canvas.mjs`
- `tools/render-validation/visibility.mjs`
- `tools/render-validation/visual-compare.mjs`
- `tools/render-validation/visual-server.mjs`

## 2. docs: record PixiJS design and local validation

Design/build/run instructions, comparable performance/visual/behavior evidence, maintained contracts and approved task/research records. Exact paths (51):

- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/event-lifecycle.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/rendering.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/tasks/10-22-pixi-renderer/check.jsonl`
- `.trellis/tasks/10-22-pixi-renderer/commit-plan.md`
- `.trellis/tasks/10-22-pixi-renderer/design.md`
- `.trellis/tasks/10-22-pixi-renderer/implement.jsonl`
- `.trellis/tasks/10-22-pixi-renderer/implement.md`
- `.trellis/tasks/10-22-pixi-renderer/prd.md`
- `.trellis/tasks/10-22-pixi-renderer/research/atlas-pipeline.md`
- `.trellis/tasks/10-22-pixi-renderer/research/canvas-baseline.json`
- `.trellis/tasks/10-22-pixi-renderer/research/integration-contract.md`
- `.trellis/tasks/10-22-pixi-renderer/research/performance.md`
- `.trellis/tasks/10-22-pixi-renderer/research/pixi-renderer.md`
- `.trellis/tasks/10-22-pixi-renderer/research/review.md`
- `.trellis/tasks/10-22-pixi-renderer/task.json`
- `README.md`
- `docs/deployment.md`
- `docs/design.md`
- `docs/pixi-evidence/acceptance.json`
- `docs/pixi-evidence/canvas.json`
- `docs/pixi-evidence/compression-court.json`
- `docs/pixi-evidence/compression.json`
- `docs/pixi-evidence/environment.json`
- `docs/pixi-evidence/joe-serve-density4-contact.png`
- `docs/pixi-evidence/lifecycle.json`
- `docs/pixi-evidence/loading-retry.json`
- `docs/pixi-evidence/nadia-serve-frame1-density2-contact.png`
- `docs/pixi-evidence/pirate-confetti-mirrored-density2-contact.png`
- `docs/pixi-evidence/pirate-confetti-mirrored-density4-contact.png`
- `docs/pixi-evidence/pirate-finish-right-mirrored-density4-contact.png`
- `docs/pixi-evidence/pirate-intro-mirrored-density4-contact.png`
- `docs/pixi-evidence/pirate-layers-density2-contact.png`
- `docs/pixi-evidence/pirate-layers-density4-contact.png`
- `docs/pixi-evidence/pixi-pre70-repeat.json`
- `docs/pixi-evidence/pixi-pre70.json`
- `docs/pixi-evidence/pixi.json`
- `docs/pixi-evidence/red-underhand-frame-1-density2-contact.png`
- `docs/pixi-evidence/toaster-serve-density2-contact.png`
- `docs/pixi-evidence/top-hat-forward-mirrored-density2-contact.png`
- `docs/pixi-evidence/visibility.json`
- `docs/pixi-evidence/visual-final.json`
- `docs/pixi-evidence/visual.json`
- `docs/pixi-migration.md`
- `docs/validation.md`
- `tools/flash-assets/README.md`
- `tools/render-validation/README.md`

## Unrecognized dirty files

None. All dirty paths belong to this migration; generated assets and evidence are intentionally included. Ignored baseline builds, Git bundle, exploratory artifacts, browser caches and dist are excluded.

## Verification before confirmation

- Final typecheck/lint/build passed;24 files/455 tests passed after the70ms policy change.
- Independent36-file atlas bake is byte-identical; all34 decoded images and geometry/groups are unchanged by PNG compression.
- Final75s cold/warm report complete;202+26 visual cases, final four-tier natural matches and genuine hidden/resume passed. Remaining performance/device limits are explicit in docs/pixi-migration.md.
- 23 changed Markdown files/133 relative links checked; frozen sources/shared/server unchanged; git diff whitespace check passes.

The two approved work commits were created in order with exactly the planned paths and a clean working tree. Task archive and session journal follow as standard Trellis bookkeeping commits. No amend or deployment was performed. Backup push still needs the missing repository URL.
