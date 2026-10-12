# Independent bootstrap review

Reviewed the complete saved native hook output, every `check.jsonl` entry, PRD/design/implementation plan, and all 20 specification documents against representative client/server/shared source, tests, configuration, ops, and scripts. Documentation acceptance passes after the corrections below. Product files and running services were not changed.

## Findings (fixed)

- File: `.trellis/spec/frontend/quality-guidelines.md`
  - Issue: Prediction-test coverage was described as testing stale packets; the tests actually cover stale prediction reset and holding the latest interpolation sample when delivery stops.
  - Fix: Describe the existing assertions accurately.
- File: `.trellis/spec/deployment/operations.md`
  - Issue: Release symlink location was ambiguous, the unit was called committed despite the initial untracked repository, and the script/backup-instruction mismatch was implicit.
  - Fix: Place `current`/`previous` at the deploy root, refer to the unit source, and explicitly direct readers to the safe include-removal procedure.
- Files: `.trellis/spec/backend/identity-and-input.md`, `.trellis/spec/shared/protocol.md`
  - Issue: Validation guidance overstated command-type rejection.
  - Fix: Document the command-coercion exception and distinguish the intended string command contract from the parser's current behavior.
- File: `.trellis/spec/backend/rooms.md`
  - Issue: Disconnect-result wording did not explicitly identify the upgrade/collector difference; match timeout wording hid the reconnect-first branch.
  - Fix: Describe each actual branch and the playing-room wall-clock timeout check without declaring them equivalent.

## Findings (not fixed)

These are outside the documentation task's read-only product boundary. They do not leave an unresolved specification acceptance defect.

1. `src/shared/protocol.ts:65` checks command membership using `String(v.type)`. A local parser reproduction accepted both `{"type":["queue"]}` and `{"type":[["leave"]]}`. `src/server/service.ts:328` ignores these values because strict dispatch comparisons do not match them; they do not execute a command, but they are not rejected as invalid messages. Recommend requiring a string discriminator and adding malformed-command parser/real-WS rejection regressions in a separate fix.
2. `src/server/service.ts:382`–`386` awards the opposite side on an expired reconnect during upgrade without checking that side's socket. The collector at `src/server/service.ts:543` instead uses a connected-opponent check and otherwise returns null. Recommend confirming the intended behavior for an expired reconnect whose opponent is absent, aligning the branches, and covering that path with a deterministic lifecycle regression. This finding comes from source inspection; no live race test was run.
3. `scripts/publish.sh:40` advises restoring the shared Nginx backup on validation failure, conflicting with the safe procedure in `docs/deployment.md:27`. Recommend changing only that diagnostic to inspect the new snippet/include and remove only the current include addition, preserving unrelated shared-vhost edits.
4. `docs/deployment.md:25` describes switching `current` before installing the unit/snippet and validating Nginx. Actual `scripts/publish.sh:19`–`44` installs resources and validates Nginx before switching `current`. The new Trellis operations spec follows the script. Recommend correcting the existing deployment-document ordering separately; that document was read-only for this review.

## Verification

- `npm run lint`: PASS, exit 0.
- `npm run typecheck`: PASS, exit 0.
- Markdown link/index/content check (read-only Python): PASS. **20 documents, 6 indexes, 163 relative links; all 20 spec documents reachable from the root index.** Zero broken links, unreachable documents, scaffold placeholders, or indexes missing their pre-development checklist.
- `python3 .trellis/scripts/get_context.py --mode packages`: PASS; discovers backend, deployment, frontend, shared for the single-repository project, with guides linked separately.
- `python3 .trellis/scripts/task.py validate .trellis/tasks/00-bootstrap-guidelines`: PASS, exit 0; validates 3 implementation-context entries and 10 review-context entries. It reports the pre-existing warning that recorded branch `main` has no local ref in the repository before its initial commit.
- Read-only parser smoke via installed `tsx`: confirmed the command-coercion evidence above; did not change product code or add a test suite.
- Tests/build/public checks: not rerun. This is a documentation-only change; earlier product verification remains separately recorded in `docs/validation.md`.
- Browser tests, publication, service restarts, commits, archive, and journals: not performed by this reviewer.

The specs correctly preserve signed guest identity, authenticated seats, 120/60/30 nominal cadence, burst coalescing, distinct ack/tick meanings, local-player-only prediction, lifecycle cleanup, independent deployment, and upstream/version/license boundaries. Existing client JSON assertions and edge loss during client output backpressure are explicitly documented limitations, not claimed guarantees.
