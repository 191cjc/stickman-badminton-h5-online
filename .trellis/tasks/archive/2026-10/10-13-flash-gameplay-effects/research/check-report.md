# Independent whole-task check

Active task: `.trellis/tasks/10-13-flash-gameplay-effects`.

Review performed directly by the dispatched Trellis check agent; no nested
implement/check agents, commits, publication or production restart. Read task
check context, PRD/design/implementation plan, source research and implementation
report, plus affected shared/frontend/backend/deployment Quality Check guidance.
The main session independently owns HTTP/browser evidence, docs/spec final sync
and release verification.

## Findings (fixed)

- `src/client/audio.ts`, `src/client/main.ts`, `tests/audio.test.ts`: match music
  started at full volume, omitting original instruction scene
  `§_-R§.handleStageAdd`'s `backgroundmusic.mp3,0,1,2` call and sound manager
  `§_-3h§` ENTER_FRAME fade. Added a separate music gain starting at0 and fixed
  60Hz callbacks adding `1/(2*30)` each, with independent global mute, repeated
  snapshot idempotence and node/clock reset on scene exit. Tests cover 30/60/144Hz
  display stepping, mixer mute, fade saturation and new-scene reset. This ports
  source callback arithmetic to the existing online scene boundary; it does not
  claim a native Flash measured two-second fade or restore an instruction scene.
- `tools/flash-assets/{extract,finalize}.py`, generated `public/classic/`,
  `src/shared/classic/manifest.ts`, `src/client/renderer.ts`, asset tests and
  `scripts/http-check.mjs`: original visible court branding at depth38 was
  omitted from the background-only selection. Added standalone `courtBrand`
  from source button343 (default Up text340/filter records), at the original
  `(565.9,12.95)` scene transform. Art-only button actions are stripped; output
  remains flattened SVG with no sponsor click, external links, ads or telemetry.
  Draw it above the shuttle and below appended foreground effects. Source
  registration/filter/security witnesses and HTTP hash checking include it.
- `src/client/style.css`: native corner actions covered the original logo;
  moved them to top8% while retaining in-court native controls. Per main-session
  decision, result menu background/border are transparent with text shadow,
  reducing the double-panel overlap while preserving rematch and seven-role
  selection. This remains an accessible online menu adaptation, not a recreation
  of every original menu screen.
- `src/client/input.ts`, `tests/input.test.ts`: Space keyup always prevented the
  default, including native buttons whose keydown was correctly ignored. This
  suppressed keyboard Space activation. Keep releasing any held game key while
  allowing native button/input/select/textarea defaults; regression checks both
  events on button focus and release of an already held Space game input.
- `src/server/service.ts`, existing v1/v2 service regressions: a legacy page
  sharing an active v3 guest received HTTP409 before protocol-mismatch feedback.
  Legacy sockets now receive `protocol_mismatch`/1008 before guest/seat binding,
  including this case. Current v3 duplicate connection still gets409. Real WS
  tests verify the existing socket and its queued character remain intact.
- `src/client/effects.ts`, `tests/effects.test.ts`: terminal player copies only
  advanced grounded Toaster bob. An airborne Toaster stayed in midair and never
  resumed bob; adult outgoing clips/landing also froze. Per main-session scope
  decision, reuse `stepClassicPlayer` on these deep copies at the existing60Hz
  result clock, with empty input and `pointActive:false`. This completes source
  gravity/landing/outgoing clips and Toaster bob/smoke without ball contacts,
  scoring or authority events. Regression checks both airborne character types,
  stopped outgoing actions, ongoing bounded smoke/bob, and unchanged original
  snapshot/gameplay/event journal. The first test compared positions across a
  full bob period; it was corrected to observe position variation throughout the
  interval, avoiding a false failure when the periodic bob returns to its start.

## Scope reviewed

- Exactly seven source human-versus roles and movement/jump/power semantics;
  family-specific geometry, serve23/7 versus Toaster27/8, unscaled servePoint,
  Pirate attachment, mirrored contact geometry, source action latches,
  independent/hidden clip clocks, Toaster human jump and pre-final-bob contact.
- Authority input coalescing, completed-step ack, role freeze and duplicate
  choice behavior, Cookie/Origin/socket/seat validation, protocol3/statev2,
  reconnect deadline/expiry, finished-room detach and cleanup; no live AI,
  campaign, Robot, Timmy or old community gameplay imports.
- Own-role prediction initialization/replay; authority-only ball/score/results;
  snapshot interpolation uses actual discrete states and does not interpolate
  across role/score/phase/room transitions or invent attachment/contact states.
- Independent cosmetic RNG,128-event/30-tick journal, source pre-collision
  tail pairs, smoke positions, no fabricated impact effects/sounds, event cursor
  dedup/late-gap/reconnect policy, source particle shrink/removal, result ordering
  and separate fixed cosmetic clock, bounded particle/Blob/cache/audio resources.
- Source spark frame22/scale0.3, intro/finish rules, layer order and padded
  original SVG filters; nested confetti tint leaves outer filters intact.
- Original MP3 payload hashes, overlapping audio, gesture/autoplay/decoder
  failure isolation, early-unlock/late-download decode, mute/M, Esc server leave,
  native controls and input release. Audio has no dependency on authority replay.

## Verification

- `python3 tools/flash-assets/build.py`: pass, source-checked regeneration now
  produces507 resources (499SVGs +8MP3s), plus manifest;6,544,941 total bytes.
- `npm test`: pass,11 test files /161 tests in the final whole-suite run after
  the terminal-copy regression correction. Includes all seven roles/two sides,
  source assets, effects/audio/input, prediction/network/parser, and real HTTP/WS
  Cookie/role/burst/expiry/rematch/seven-point result behavior.
- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm run build`: pass, final Vite client and esbuild backend rebuild after the
  terminal-copy correction. Built client assets are `index-CDPOmVno.css` and
  `index-Dpe_Jw8n.js`; backend bundle157.8KB.
- `bash -n scripts/publish.sh scripts/rollback.sh`, `node --check` on both
  verification scripts, Python generator AST syntax, `git diff --check`: pass.
- `git diff --name-only -- reference upstream`: no changes. Original SWF digest
  remains `cab8a824c54af3a0b9454ef30fcbcabc532931f2a96717239fabd58f57e59912`;
  full archive remains
  `73c26baea166485903a880882871a0ecd138399d1f0ba4ec413f901c31c5a42a`.
  Asset tests also verify unchanged decompressed XML digest.

## Findings (not fixed) and evidence boundary

- No unresolved implementation finding remains after the main session confirmed
  terminal-copy continuation as part of the approved result contract.
- Existing intentional online differences remain: server gameplay freezes on
  terminal score, next rally uses fixed simulation1.5s, rematch finds a new
  opponent/room, inputs are shared across computers, native Chinese online menus
  overlay source court/result art. Source title/campaign/instruction flows and
  platform actions are excluded. Do not describe the product as full original
  menu/campaign/runtime identity.
- Cosmetic RNG is isolated; continuous inclusive256 color packing follows the
  recovered AS shift/OR behavior. Browser SVG/JPEXS filter conversion, numeric
  draw rounding, MP3 seek/decoder behavior and original native scheduling are
  not proved pixel/audio-identical by code tests.
- Main-session final-build HTTP/resource/WS and authorized H5/unchanged-SWF
  browser checks remain separate evidence. The checker did not start a browser
  or perform publication. Physical dual-computer input-to-render responsiveness,
  weak networks, touch and other browsers remain external acceptance.

## Required main-session documentation sync

Update actual build/test counts, `courtBrand`/static-marking layer and art-only
button security boundary, `Audio.advance` source callback fade semantics,
  native result-menu adaptation and source terminal-player copy policy. Remove the
implementation report's now-superseded music-fade omission from current-status
claims while preserving it as historical implementation handoff evidence.
