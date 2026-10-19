# Self-left perspective execution plan

Status: final summary approved by user (“开始”, 2026-10-19); proceed with implementation.

## Before implementation

- [x] User authorized task creation (2026-10-19 “创建”).
- [x] Research actual input/render/lifecycle ownership and original art composition.
- [x] Converge prd.md; write design.md and this plan.
- [x] Validate curated implement/check context manifests (11 real entries each; passed).
- [x] Present final defaults, live behavior, scope and acceptance to the user; user approved with “开始”.
- [x] Create feat/self-left-view from clean feat/sustained-smoothness, record task branch, then task.py start (in_progress).

## Ordered implementation

1. Dispatch trellis-implement using this task's artifacts and curated context. Ownership: expected frontend files, focused tests and feature-facing docs. Tell it it is already the implement agent, to implement directly and not spawn, and not to revert other changes. Primary owns task/spec/release integration.
2. Add typed perspective/preference helpers with guarded storage and default-off behavior. Cover the four combinations, zero/inverted input, invalid values and storage exceptions.
3. Add accessible settings panel and compact styles; compose its input gate/release/focus lifecycle in main. Preserve the transactional send/commit/prediction order and actual seat.
4. Update DOM label/score/matched/result presentation, including retained result text when room/latest have expired.
5. Add world-only renderer reflection and shared prepare/render art selectors. Preserve original append order, filter assets, attached shuttle, fixed clip and cache identities. Test actual matrices/destinations/readable frame choices and frozen authority inputs; existing renderer-loading fixture may be extended.
6. Run type/lint/appropriate tests, then full required suite/build once final code is stable. Dispatch trellis-check with full task scope, same no-recursion/direct-review guard; review/fix spec or acceptance drift and repeat only checks invalidated by actual changes.
7. Start isolated built frontend/backend on unoccupied local ports; run HTTP/protocol checks, then authorized focused two-guest Chromium acceptance. Stop isolated services afterward. Do not enter production matchmaking.
8. Record actual results/limits, update relevant specs and usage docs, follow existing authorized Git/release workflow and record the concrete release/rollback outcome. Do not push remote. Archive/journal only after completion.

## Validation commands and evidence

```bash
python3 .trellis/scripts/task.py validate .trellis/tasks/10-19-self-left-view
npm run typecheck
npm run lint
npm test
npm run build
```

HTTP: use the existing isolated static/proxy harness and HTTP subset under ignored artifacts with new self-left filenames. Check base-path HTML/assets, health protocol4, Cookie handshake and WS hello before launching Chromium. Official scripts/http-check.mjs also probes legacy public paths and is for post-release public checks, not the isolated harness.

Browser acceptance: independent guest contexts; real matched sides; both preference values and asymmetric score; actual keyboard/touch input movement and serve/hit; panel Space/Escape and held-input toggle; blur/reconnect/rematch, refresh persistence and storage failure; readable score/Logo/intro/finish and original tail/spark/smoke/confetti; desktop,320×568,812×375. Compare raw authority snapshots at matching ticks while views differ. Do not mutate production authority or count invented snapshots as an end-to-end gameplay result.

Cache/performance guard: same-scale perspective toggle should reuse already loaded world frames and common rasters without full invalidation. Source-name/score selection may legitimately load a newly selected bounded frame. Check64/32MiB budgets and live effects survive. Existing adaptive quality tests remain valid. Do not rerun the prior full10-minute study unless changed behavior or an observed regression warrants it.

## Risk and rollback points

- Highest-risk files: main.ts actual/display distinction and input transaction; renderer.ts art readability/depth; style.css action width at compact sizes.
- Never edit frozen original/reference assets to make mirror tests pass; do not introduce a second physics/prediction state representation.
- Settings can be toggled off immediately in the page. Deployment rollback is the previous independent release via existing scripts; no schema/protocol migration or storage cleanup is needed.

## Completion record

- [x] Implement sub-agent delivered scoped frontend/README and meaningful tests.
- [x] Independent full-scope check fixed bound repeated-key browser-default handling; final lint/typecheck and291 tests/21 files pass.
- [x] Final build and isolated HTTP before browser; separate main/retained-result/foreground UI probes cover acceptance, with automation limits recorded in research/verification.md and docs/validation.md.
- [x] Source-backed perspective/input/render/cache contracts written into frontend specs; links checked.
- [x] Published20261019T070111Z-self-left-view; own service restarted; official public HTTP, public bytes and exclusive-resource audit pass. Prior release is20261016T061913Z-sustained-smoothness.
- [x] Isolated verification servers stopped; no public matching or remote Git push.
- [ ] Record work commit, archive task and journal.
