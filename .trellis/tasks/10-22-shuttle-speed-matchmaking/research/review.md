# Independent review: shuttle speeds and manual swings

Date: 2026-10-22. Role: dispatched Trellis checker; no recursive delegation, production access, publication, browser run, or frozen-source edit.

## Findings fixed

- `src/client/main.ts`, `showResult`: a fresh page's expired-seat upgrade receives result/idle before any matched metadata. The new unconditional match-speed prefix rendered `undefinedx 场`. Render a speed prefix only for a server-confirmed `matchShuttleSpeed`; keep known-room results at their actual tier even after next-menu selection. No wire/schema or gameplay change. The main session owns isolated browser coverage for this incoming-message path; existing real-service tests cover expiry without stale matched delivery.
- `prd.md`: two planning-era sentences still said complete-plan approval was pending. Correct them to record the user's explicit “继续” approval and completed validate/start, consistent with implementation gates and task status.
- `.trellis/spec/frontend/state-management.md`: record the result-before-matched exception, requiring omission of an unknown speed rather than a fabricated menu/default value.

## Findings not fixed

None. No unresolved design, boundary, or out-of-scope defect was identified in this review. Physical keyboard rollover/gamepad hardware, real two-computer network feel, high-tier playability, other browsers and native Flash runtime parity remain external acceptance limits, not passing claims from automated verification.

## Scope reviewed

Read PRD/design/implementation plan, all three research files, curated check context and applicable shared/backend/frontend/deployment specs and indexes. Traced native controls and six-action preferences through bounded pending provenance, transactional send, strict protocol5 parsing, authenticated same-tier queue/room construction, authority simulation, snapshot configuration, own-actor prediction, interpolation and UI/result ownership. Reviewed current HTTP/match scripts, README, design/deployment instructions and spec synchronization.

Verified source gates and chronology: serve has priority; forced kinds bypass automatic selection only; latest hit supplies both swing and packet-time hitJump; small-dt latches retain both payloads; gamepad removal preserves other pending sources. High tiers step only the birdie twice, reuse returned pre-bob origins, process ground before midpoint contact, aggregate collision events and emit tail only on the last substep. Actor/animation/point clocks stay real60Hz. Same-tier FIFO/freezing/cleanup, v4 mismatch before socket/seat binding and retained-room speed follow the documented contracts. Result labels retain confirmed speed separately from the next selection.

Reviewed test coverage includes seven roles × both sides across four serve tiers, real-frame actor/point timing, same-side midpoint returns and moved/jumping Toaster origin, first-substep ground priority, net/wall/tail ordering, cosmetics isolation, strict speed/swing parsing, latest-hit bursts, sub-frame payload, v2 migration and pending-source bounds. `tests/service.test.ts` runs four actual HTTP/WS natural seven-point matches, compares both results/states/effect journals and exercises retained speed/rematch/lifecycle. These are real local services, not public matchmaking.

## Verification

- `npm run lint`: pass, including after the local UI fix.
- `npm run typecheck`: pass; repeated as part of the final build after the fix.
- `npm run build`: pass after the fix. Client `index-CFcJdbQm.js`, CSS `index-DyGQGYN-.css`; backend bundle rebuilt. Main notified that old browser/HTTP bytes must be rechecked.
- Full Vitest suite: implementation's completed run reports 25 files / 428 tests passing. Not redundantly rerun by this checker after the text-only UI branch; main owns the targeted isolated browser regression and final HTTP/matrix retest.
- Independent transient baseline replay: pass, **33,600 per-frame state and presentation comparisons** against Git HEAD `fce6e45bfaa36e08e68de928f2f74b202ae32b0c`. Used a temporary `/tmp/badminton-v4-review-*` extraction of only tracked shared source; seven mixed-role pairs, cosmetics on/off, seeded movement/jump/auto hits, 2,40060Hz calls per configuration. Only version/shuttleSpeed metadata was omitted for old/new state comparison; effects compared unchanged. This substantiates the unchanged1x/auto path for those traces, not exhaustive native Flash parity.
- `node --check scripts/http-check.mjs` and `node --check scripts/public-match-check.mjs`: pass.
- `git diff --check`: pass. Changed Markdown local-link scan: no missing links; indexes point to the relevant contracts. Frozen reference/upstream paths absent from changed files.

Review is clear for the main session to complete isolated validation and authorized publication of the rebuilt bytes. No production service was restarted by this reviewer.
