# Repair commit plan

The user explicitly requested Git integration and continued development, then confirmed creation and continuation of these four fixes. The project baseline was committed as `a7a314b`; this commit records the independently reviewed local repair under the same authorization.

## Work commit

`fix: validate commands and align reconnect expiry`

Exact file scope:

- `.trellis/spec/backend/identity-and-input.md`
- `.trellis/spec/backend/rooms.md`
- `.trellis/spec/deployment/operations.md`
- `.trellis/spec/shared/protocol.md`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/check.jsonl`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/commit-plan.md`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/design.md`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/final-validation.json`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/implement.jsonl`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/implement.md`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/implementation-report.md`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/prd.md`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/research/source-findings.md`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/review.md`
- `.trellis/tasks/10-12-protocol-reconnect-fixes/task.json`
- `docs/deployment.md`
- `scripts/publish.sh`
- `src/server/service.ts`
- `src/shared/protocol.ts`
- `tests/protocol.test.ts`
- `tests/service.test.ts`

After the work commit, archive this task and record the journal, in that order. Only current-task archive/journal bookkeeping follows the repair. No production release or remote push belongs to this repair.
