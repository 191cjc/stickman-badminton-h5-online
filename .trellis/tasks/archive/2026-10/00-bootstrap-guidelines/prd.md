# Bootstrap project development guidelines

## Goal

Make Trellis guidance describe the implemented stickman badminton H5 online project so future implementation and review sessions follow its real contracts.

The user initialized Trellis, asked whether it was discoverable, and requested continuation. Continue this existing bootstrap task; creating another task is unnecessary.

## Scope

- Replace frontend scaffolding with source-backed TypeScript/DOM/Canvas guidance.
- Cover the Node.js HTTP/WebSocket service, shared simulation/protocol, and independent deployment resources.
- Keep one npm package; describe runtime layers rather than inventing workspace packages.
- Preserve upstream attribution/version/license constraints and isolation of existing game entrances.
- Record validation and task completion in Trellis.

Product source, gameplay behavior, dependency changes, production publishing, service restarts, and browser testing are outside this documentation task.

## Acceptance criteria

- [x] Frontend guidelines describe current modules and include real examples.
- [x] Backend, shared, and deployment guidance covers actual ownership boundaries.
- [x] Unsupported framework templates are removed or replaced with applicable topics.
- [x] Every important contract links to real source, tests, or project documentation.
- [x] No unfilled template text or broken local navigation remains in `.trellis/spec/`.
- [x] Guidance distinguishes observed implementation, conventions, and known limitations.
- [x] Documentation checks pass and independent review finds no unresolved scope defects.
- [x] The task is archived and a developer journal records the result.

## Completion evidence

See [independent review](review.md) and [final validation](final-validation.json). The user approved the [commit plan](commit-plan.md) with "继续". The work was committed as `3b6881b`, the task was archived, and [session 1](../../../../workspace/chenjiachun/journal-1.md) records the result and follow-up boundaries.
