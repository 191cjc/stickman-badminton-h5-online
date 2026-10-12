# Execution and verification

- [x] Read Trellis indexes, bootstrap skill, project docs, build configuration, and representative source/tests.
- [x] Review ownership boundaries and documentation-only scope.
- [x] Curate role context and activate the existing bootstrap task.
- [x] Replace frontend templates with module/UI/event/state/type/quality guidance.
- [x] Add backend session/room guidance, shared simulation/protocol guidance, and deployment operations guidance.
- [x] Replace generic Trellis-source thinking examples with project-relevant reuse and cross-layer guidance.
- [x] Check indexes, relative links, examples, scaffolding removal, and discovery of all layers.
- [x] Dispatch an independent Trellis review limited to spec/task changes; lint and type-check the project.
- [x] Update acceptance criteria and save independent review/final validation evidence.
- [x] Obtain the Phase 3.4 one-shot commit confirmation and resolve the effective Git author identity.
- [x] Commit only this task's spec/planning changes.
- [x] Archive the task and record the session journal.

Validation: Markdown link targets and index coverage, template scans, `task.py validate`, `get_context.py --mode packages`, `npm run lint`, and `npm run typecheck`. Product tests/build/public match checks already passed during project implementation; repeat them only if relevant code changes (which are outside this task's scope).

Rollback: revert the documentation commit; no production artifact, route, process, or runtime setting changes are part of this task.

Review corrections and deferred product observations are in [review.md](review.md). The approved work-commit scope and exclusions are in [commit-plan.md](commit-plan.md). The task is archived and [session 1](../../../../workspace/chenjiachun/journal-1.md) records completion; deferred product changes and external browser acceptance remain separate work.
