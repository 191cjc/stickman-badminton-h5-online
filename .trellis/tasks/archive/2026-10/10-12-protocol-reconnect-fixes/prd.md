# Protocol and reconnect correctness fixes

## Goal

Reject malformed logical commands and make reconnect-expiry results consistent, while keeping publication instructions safe and accurate. The user requested committing the project and continuing development, then explicitly selected "创建任务并继续修复（推荐）" for the four previously reviewed findings.

## Background

The game and static Trellis tooling are tracked in baseline `a7a314b`. The [bootstrap review](../00-bootstrap-guidelines/review.md) identified these four defects. Existing deployment documentation already states that an expired disconnected player's connected opponent wins, and neither player wins when both are disconnected. This task restores that contract.

## Requirements

1. **R1 — Strict command discriminator.** At baseline `src/shared/protocol.ts:65`, `String(v.type)` accepts array-wrapped command types that dispatch silently ignores. Require an actual string; preserve valid messages and exact-key checks. Invalid messages must close authenticated WS with 1008 and `invalid_message`.
2. **R2 — Consistent expiry verdict.** At baseline `src/server/service.ts:382–386`, expired reconnect always awards the opposite side, while the collector at `service.ts:543` checks the opposite guest's bound socket. Both paths must award a connected opponent, otherwise return `winner: null`, finish with `disconnect`, and reclaim the room. Expired reconnect must not emit resumed `matched` for that reclaimed room.
3. **R3 — Safe publish failure guidance.** At baseline `scripts/publish.sh:40`, the error suggests restoring a shared backup. Replace it with guidance to inspect the project's snippet/include and, if necessary, remove only the include newly added by the release. Preserve exit-before-switch/restart behavior.
4. **R4 — Accurate deployment ordering.** At baseline `docs/deployment.md:25`, `current` is incorrectly described as switching before resource installation/Nginx validation. Document executable order: build/release, resources/environment/include, validation, current switch, this service restart/local health, Nginx reload, public checks.

## Acceptance criteria

- [x] Parser regressions reject array/nested-array/non-string command types and preserve valid commands.
- [x] Real authenticated WS regressions observe close 1008/`invalid_message` for malformed commands.
- [x] Deterministic HTTP/WS tests cover expired upgrade with an online opponent and with an absent opponent, without collector cleanup masking the branch.
- [x] Expiry tests assert reason/winner, reclamation and no stale `matched`; collector and ordinary resume remain covered.
- [x] Publication diagnostic and ordering match the script; shell syntax passes.
- [x] Lint, typecheck, applicable/full tests, build and local HTTP checks pass; independent review completes.
- [x] Specs describe corrected contracts and remove the obsolete limitations.

## Boundaries

Product edits: `src/shared/protocol.ts`, `src/server/service.ts`, parser/service tests, `scripts/publish.sh`, `docs/deployment.md`. Main-session spec/task/journal updates accompany them. Frozen upstream, mechanics, browser input/prediction, identity/seat model, ports/routes/services and dependencies are outside the repair. No production publication/restart or browser automation; physical two-computer responsiveness remains external acceptance.

## Technical notes

Use a minimal shared expiry-verdict path so upgrade/collector cannot diverge. Prefer existing real sockets, service duration options and test timer control over a new public testing API. Tests must deliberately hold collector execution while advancing expiry, rather than hope to win a 100 ms race.

The original development instruction and explicit four-fix selection authorize this concrete implementation scope. No additional product decision remains unresolved.

## Evidence

See [implementation report](implementation-report.md), [independent review](review.md), and [final validation](final-validation.json). All acceptance criteria pass. Repair commit `8edc074`, archive metadata and [session 2](../../../../workspace/chenjiachun/journal-1.md) record completion.
