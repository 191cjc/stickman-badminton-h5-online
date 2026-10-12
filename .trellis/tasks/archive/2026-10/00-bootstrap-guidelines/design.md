# Spec organization

This repository has one `package.json`. Its source boundaries are `src/client`, `src/server`, and `src/shared`, with deployment in `ops` and `scripts`. Use top-level Trellis spec layers `frontend`, `backend`, `shared`, and `deployment`; retain the `guides` cross-layer entry point. No package configuration change is required.

Frontend owns static DOM UI, input collection, network callbacks, prediction/interpolation, and Canvas presentation. Rename `hook-guidelines.md` to `event-lifecycle.md` because this application uses native event listeners and persistent controller classes.

Backend owns signed Cookie sessions, WS identity/Origin checks, in-memory queue/rooms, authoritative fixed-step orchestration, and cleanup. Shared owns data contracts, movement, flight, collision, score, and AI. Deployment owns the exclusive subpath, systemd unit, release directories, logs, and rollback.

Populate each index with a pre-development checklist and navigation. Write English spec documents, reference files with relative Markdown links, and use short excerpts only for useful contracts. Keep implementation limitations explicit: inbound client `ServerMessage` is asserted after JSON parsing, some cadence constants are repeated as literals, and public protocol scripts do not verify rendered browser behavior.

Use `README.md`, `docs/design.md`, `docs/deployment.md`, and `docs/validation.md` as product constraints. GitNexus/ABCoder are not callable in this session; source inspection and TypeScript tooling are the analysis basis.

The plan was reviewed against source ownership and existing documentation before activation. Findings about product code are evidence to document, not authorization to expand this task beyond specifications and task bookkeeping.
