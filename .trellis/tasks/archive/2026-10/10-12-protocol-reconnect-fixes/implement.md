# Implementation and verification

- [x] Track project/static Trellis tooling as baseline `a7a314b`.
- [x] Obtain task consent and explicit authorization for the four repairs.
- [x] Inspect source, tests, specs and deployment evidence.
- [x] Converge PRD/design and curate implementation/review manifests.
- [x] Start task and dispatch scoped `trellis-implement`.
- [x] Add parser/real-WS/expired-upgrade regressions and capture baseline failure evidence.
- [x] Correct validation/expiry and operation text; run targeted tests and shell syntax.
- [x] Dispatch independent `trellis-check`; complete lint/types/full tests/build/local HTTP checks.
- [x] Main updates executable specs and validates links/indexes.
- [x] Commit repair, archive task and record journal.

Commands: `npm run lint`, `npm run typecheck`, targeted Vitest parser/service cases, `npm test`, `npm run build`, `bash -n scripts/publish.sh scripts/rollback.sh`. HTTP/WS tests use ephemeral loopback ports; optionally check built HTML/assets via local Vite preview. Never launch a browser. Repeat green checks only after relevant changes/findings.

Implementer owns protocol/service, relevant tests, publisher diagnostic and deployment documentation. Reviewer may fix local issues within this scope. Main owns specs, lifecycle and Git. Workers must not commit, deploy or recursively dispatch agents.
