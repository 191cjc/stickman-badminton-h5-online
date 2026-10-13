# Flash effects: conversion and synchronization evidence

This is the continuation of `effects.md`; original trigger/audio/depth evidence stays there. Confirmed product scope is original-versus seven human characters, no AI practice/campaign. This file preserves converter and transport findings without truncation during Trellis context injection.

### Executable visual asset path mappings

The following complete-export directories exist and can be resolved with `Path(...).glob('DefineSprite_<id>_*')`, avoiding obfuscated pathname assumptions. SVG `<g>` anchor offsets retain original registration and must survive normalization.

| Effect/UI | Existing full-export path (under`artifacts/flash-full-archive/export/sprites/`) | Frames and intrinsic details |
| --- | --- | --- |
| BigSpark278 | `DefineSprite_278_fx.BigSpark/{1..25}.svg` |25 files; original intrinsic386.5×134.2; registration offset(-195.5,-131.85); runtime scale0.3; remove22 |
| SmallSpark129 | `DefineSprite_129_fx.SmallSpark/{1..10}.svg` |10 files, unused; remove10 if ever instantiated |
| Birdie tail245 | `DefineSprite_245_fx.ParticleBirdie/1.svg` |3.8×2.55 raw body bounds; offset(-1.25,-1.25); blur present |
| Smog242 | `DefineSprite_242_fx.ParticleSmog/1.svg` |20.1×13.55 raw body bounds; offset(-10.05,-6.75); blur present |
| Confetti282 | `DefineSprite_282_fx.ParticleConfetti/1.svg` |4.1×4.1 raw body bounds; offset(-2.05,-2.05); inner body color and outer bevel/glow |
| Speech97 | `DefineSprite_97__-2g.var/1.svg` |Source bubble and default text; dynamic text must be substituted |
| Intro255 | `DefineSprite_255__-2g._-2P/1.svg` |Source Exhibition/round panel and defaults; dynamic names/title needed |
| Finish269 | `DefineSprite_269_ui.FinishOverlay/{1..2}.svg` |Frame1 rematch; frame2 next round; current full export contains embedded large button art |
| Win94 | `DefineSprite_94_ui.WinOverlay/{1..53}.svg` |53 source frames, but nested paper body92 selects1..9 at runtime; unchanged exporter defaults alone do not restore selected character newspaper |
| Death309 | `DefineSprite_309_ui.DeathScreen/1.svg` |Nested characterSet301 has9 variants selected at runtime; exporter default is only one variant |

The complete effect SVG export sizes are modest (BigSpark all25≈91.8KB; tail2816 bytes; smog2739 bytes; confetti9651 bytes); full WinOverlay frames≈24.5MB and FinishOverlay2≈2.58MB. Selected UI art extraction is preferable to serving every archived default/nested frame. These are observed file bytes, not browser performance measurements.

### Current gaps and minimum converter extension plan

Current `extract.py:183` creates an **art-only whitelist** closure with no bytecode, actions or original root document. Its entry symbols at`:201` include Joe actions/body, court/net and birdie only. Manifest export specs at`:209` have no effects/audio/UI. `build.py:33` selects only100 and synthetic1001–1021. `finalize.py:64` hardcodes schema1,body/swings; renderer's schema1 check (`renderer.ts:39`) and preload list(`:46`) reject/ignore new schema resources. `ClassicSimulation` keeps a private contact ring(`simulation.ts:301`) that is not in snapshots(`:342`); `stepClassicBirdie` reports wall/net/ground only. There is no accepted-swing audio signal, event ID or renderer particle clock.

Minimum reproducible production changes, to be implemented by the assigned implementer:

1. Extend the original-art dependency closure and export specs to278,245,242,282 (optional archived129) with original frame counts. Keep shader/filter trees, depth transforms and symbol IDs. Export BigSpark25 for provenance if useful, while runtime uses remove frame22. Extend selected character resources separately; never modify frozen source/reference.
2. Keep standalone SVG security validation from `finalize.py:45`; add manifest effects/sounds and explicit frame/removal/layer/registration metadata. Bump schema in producer and renderer together. Derive JPEXS `-selectid` from the specs, not another manually diverging list. Record SHA-256 for sounds as well as SVGs; remove stale generated outputs deterministically.
3. **Pad filter bounds.** Current normalizer uses raw `width/height` and sets viewBox0,0,width,height(`finalize.py:39`, `:54`). Complete-export tail/smog/confetti SVGs retain filter regionsx=-100%,width300%, but their outer SVG viewport is only geometric body bounds. Copying them unmodified can crop blur/glow in an Image→Canvas draw. Compute tested original-filter overflow padding, adjust anchor/draw bounds together, and compare visible extents. Do not remove filters to hide clipping. Existing original JPEXS filter conversion is an approximation and needs visual inspection under permitted browser verification.
4. Preserve confetti's **nested** color replacement before outer bevel/glow. Options include normalized SVG template color substitution at shape279, validated prebuilt palette variants, or a tested compositing split of source body and filter overlay. Palette restriction changes original continuous color coverage and must be documented; blanket final-image tint is not source-equivalent. This research makes no new substitute art recommendation.
5. Produce the relevant original MP3 files directly from verified XML DefineSound `soundData[2:]`, using the explicit ID/name mapping above; all12 archived files match the complete-export bytes. Online-versus battle effects use38/45/40/43/47; background/title music46/41 and local button feedback19/20 belong to their applicable scenes. Do not expose unused39/44 or campaign-only42 as active battle sounds. Keep original seek metadata, original filenames/logical IDs and hashes. Do not start a Flash runtime, emit executable SWFs or carry original ads/analytics into public assets.
6. For original multiplayer score/Exhibition intro/FinishOverlay.frame1 art, extend the art-only definition whitelist to necessary `DefineFont*`, `DefineText*`, `DefineEditText*` and script-free selected button glyphs/poses, then replace dynamic text from state. Current `definitions` intentionally only supports shapes/sprites/morphs/bitmaps (`extract.py:231`), so treating UI as another effect path will currently fail. Preserve native accessible actions and project rematch authority even when decorating them with original art. Exclude speech97, FinishOverlay.frame2, WinOverlay94, DeathScreen309, campaign newspaper/unlocks and advertising behavior from the confirmed implementation.

### Synchronization and RNG recommendations

Original cosmetic initialization, emission, AI choices and random net-top bounce all call the same global `Math.random()` (`§_-3e§.as:39`,`:217`). Therefore adding cosmetics to the current seeded gameplay RNG(`simulation.ts:104`) would change AI/network gameplay replay by consuming extra draws. Isolate a **cosmetic RNG** for emissions/parameters, retaining source distributions and cadence; state explicitly that this changes random-stream coupling and cannot reproduce the exact nondeterministic original playthrough. Never let browser cosmetic randomness decide a contact, ball bounce or score.

Use authority-owned monotonic presentation event IDs/ticks for accepted swing, successful serve/contact (position/direction/kind), point/result and net triggers. Repeated30Hz snapshots should carry a bounded recent event journal or separately reliable event message; do not derive one-shot hit flash from lastShotLabel, packet arrival, interpolated collision, or pressed input. Predictor replays must have no global side effects. If playing predicted local whoosh immediately, key/deduplicate by acknowledged input/action identity so server confirmation and history replay cannot play it again; simpler first-stage authoritative whoosh is faithful but less immediate feedback.

For exact source-cadence particle evidence, generate compact authority/cosmetic events at each60Hz step, grouping the **two tail particles** as one emission with seed, position and tick. Smoke uses authoritative character locations and correct source layer; trail source coordinates are sampled before collision resolution. Emitting from only30Hz snapshots loses half of source opportunities; per-RAF emission makes frame rate change density/shrink. A browser-local60Hz reconstruction from interpolated state is viable for bandwidth but should be labeled a presentation approximation because it cannot recover exact intermediate source positions/contact ordering. The choice belongs in design.md and tests.

The bounded event stream should separate core battle events from high-volume particles (pair tail up to60 groups/sec, smoke up to60 groups/sec per emitting character; confetti one per60Hz callback with chance70). Recent ring capacity/retention must be chosen against these upper bounds, not private32-contact-ring size. A shared event sequence per room/epoch allows repeat deduplication; never accept client-injected effects/positions. Drop expired spark/particle events on reconnect and **never replay old score/result audio**. Initial reconnect can restore surviving visual particles via a state/cursor without replaying history; room change/rematch resets cursors, caches and cosmetics. Pause/reconnect cleanup needs an explicit cosmetic clock policy, and result rendering must continue even when gameplay tick is terminal.

Useful verification is source-backed: successful contact creates exactly one spark at original launch position/direction and scale0.3; missed accepted swing creates whoosh but no spark/birdiehit; Toaster emits pop+spark without birdiehit; duplicated snapshot yields no duplicate flash/audio; ring gap/reconnect skips stale audio; net/wall create no inventedSmallSpark; cosmetic RNG changes cannot alter gameplay snapshots/replay; paired source trail and25/70 chance deterministic witness cases; original particle shrink/removal at60Hz; terminal cosmetic continuation; multiplayer FinishOverlay.frame1 fade and single terminal cheer; normalized filter bounds/color hierarchy; source WAV/MP3 ID/hash mapping. Code/HTTP checks establish contracts, while browser visual parity and real two-computer responsiveness remain separate evidence.

### Related specs and external references

- `.trellis/spec/shared/simulation.md`: original60Hz mechanics, fixed clip clocks, numeric authority, frozen-source boundary; terminal authority currently stops.
- `.trellis/spec/shared/protocol.md`:60Hz simulation/input,30Hz snapshots, room-scoped seq/ack, strict input validation, coordinated wire deployment.
- `.trellis/spec/frontend/state-management.md`: local-player-only prediction, authoritative shuttle/score, interpolation/room resets.
- `.trellis/spec/frontend/component-guidelines.md`: Canvas world640×426, source registration, swing/body order, accessible in-court actions.
- `.trellis/spec/frontend/event-lifecycle.md`: reconnect/focus and listener ownership.
- `.trellis/spec/deployment/source-archive.md`: unchanged original reference and full-archive integrity, conversion/runtime boundary.
- `.trellis/spec/guides/code-reuse-thinking-guide.md` and`cross-layer-thinking-guide.md`: derive from one shared owner; trace producer→authority→consumer.
- Current production converter pins JPEXS26.3.0 and Java21 (`tools/flash-assets/README.md:11`); official tool release recorded there is`https://github.com/jindrapetrik/jpexs-decompiler/releases/download/version26.3.0/ffdec_26.3.0.zip`. No external web claims were used in this research.

## Caveats / Not Found

- Recovered script and timeline inspection is executable-source evidence, not a native Flash timing or pixel-perfect measurement. Complete export ≠ all runtime features already integrated.
- No fifth actively instantiated fx class, no SmallSpark call/placement, no hard-hit/whip audio trigger, and no separate score-popup animation were found. Do not create these and describe them as original behavior.
- Browser SVG filters, font/layout, MP3 decoder delay/seek behavior and ColorTransform256 edge require measured compatibility checks. The source's raw filtered SVG viewport cropping is a conversion concern, not a missing downloaded asset.
- Opening campaign speech, five-round newspaper win/loss screens, unlock progression, title/menu/sponsor audio and original ad interactions are identified boundaries; restoring online battle effects does not automatically authorize claiming complete campaign/UI parity.
- Existing H5 uses1.5s fixed simulation point delay and terminal authoritative freeze. Original uses wall-clock setTimeout and continuing callback-driven effects. Result presentation must be designed around this distinction without restarting game authority or introducing additional point awards.
- No deployment, tests or browser were run by this research agent; findings are based on read-only code/XML/asset inspection and in-memory byte comparisons.
