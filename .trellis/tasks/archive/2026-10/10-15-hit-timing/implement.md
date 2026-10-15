# Implementation and verification plan

## Activation gate

- [x] Task creation approved after the user requested optimization.
- [x] Scope and constraints captured in prd.md; technical evidence inspected before asking any repository-answerable question.
- [x] Complete authority-timing research and final PRD convergence pass.
- [x] Curate real spec/research context in both manifests and validate the task.
- [x] Present final planning summary; receive a subsequent explicit approval (user: “开始吧”).
- [x] Only then run task.py start and dispatch implementation.

## Ordered work

### 1. Freeze behavioral baseline

- [x] Confirm clean product tree at a9a0a88; use an isolated feature branch for implementation (`feat/hit-timing`).
- [x] Preserve the59-case baseline already obtained and promote synthetic sampling/contact findings into meaningful regression fixtures.
- [x] Capture a targeted debug-enabled client baseline with identical roles/viewport/render scale and ordered transport delays if browser measurement is needed. Do not publish or change production during diagnosis.

### 2. Server-owned replay anchor and compatibility

- [x] Add protocol4/SUBPROTOCOL4 and snapshot ackTick contract while preserving the exact outgoing logical-input shape.
- [x] Track first completed command-consumption tick; retain it during held-only ticks and null it on clear/discard/reset paths.
- [x] Update legacy handshake rejection, session/health expectations, scripts and fixtures together.
- [x] Real-service tests prove ack after simulation, unchanged ack across held ticks, burst coalescing, null discarded metadata, legacy refusal before identity/seat binding and preserved ranges/ownership.

### 3. Elapsed-time own-player prediction

- [x] Separate accepted-command registration from fixed-time advancement using shared stepClassicPlayer.
- [x] Record separate bounded command/step ledgers; reconcile confirmed-held time with snapshot tick/ackTick instead of input count. Preserve coalesced one-shot edges and never prune seq>ack using a time boundary.
- [x] Explicitly reset on null/missing/expired/coalesced-away anchors and existing semantic/lifecycle boundaries; cap catch-up and history as designed.
- [x] Reproduce400-ms regular/reduced-rate equivalence and test delayed/held acknowledgements,120-Hz command changes, bursts, long stalls and exact original action latches. For inconsistent anchors/asymmetric uplink stalls, test the bounded fallback generation, edge retention, no repeated rebasing and eventual recovery rather than asserting exact pose.

### 4. Logical-change delivery

- [x] Add input notifications only after actual logical/edge changes, covering native keyboard and touch cancellation semantics.
- [x] Add one-timer coalesced expedited scheduler attempts with global minimum spacing, periodic retiming and no inactive resurrection.
- [x] Keep peek/send/commit/seq atomic; test actual send false/throw/backpressure and rapid press/release/combined actions.
- [x] Confirm no packet-count-driven local/server movement and safe message rate below the existing server policy.

### 5. Shorter authority presentation buffer

- [x] Use one-snapshot minimum consistently in initialization/reset/adaptation; retain bounded jitter adaptation and real-state hold behavior.
- [x] Drive actual presentation and input traces on source-valued legal/illegal return fixtures for mirrored sides/seven roles.
- [x] Include original timing-window counterexamples, collision/contact/score transitions, jitter/bursts/stalls and effect ordering. Record changed starvation/holding behavior.

### 6. Integrate and verify

- [x] Connect monotonic predictor advance to main render/input/snapshot processing and all reset paths without a duplicate clock/controller.
- [x] Extend existing opt-in diagnostics with finite bounded timing counters; default UI/debug absence unchanged.
- [x] Implementation agent runs focused tests plus lint/typecheck, writes research/implementation-report.md and returns changed-file/risk evidence.
- [x] Dispatch an independent trellis-check agent over the full diff and all task artifacts; self-fix findings and write research/check-report.md.
- [x] Run final checks once on the final reviewed tree: npm run lint; npm run typecheck; npm test; npm run build; targeted formatting/diff checks.
- [x] Use an isolated backend/static prefix for HTTP/protocol checks, then authorized targeted browser validation: two independent guests, matching, incoming legal returns, seven-point result, release, reconnect, leave/rematch, default/debug API boundaries.
- [x] Write research/verification.md and docs/validation.md with exact before/after evidence and headless/transport-model limitations. Physical two-computer feel remains pending external verification.

## Release, spec and completion

- [x] Main reviews full-scope quality and updates affected shared/frontend/backend specs, design and compatibility docs.
- [x] Record the actual production release and relevant config/service checks before any authorized project-only publish; do not touch other entrances/services/routes.
- [x] Build/publish only after quality gates; run HTTP/health/legacy/current handshake checks and inspect project logs. Public match smoke only when production queue/rooms permit isolated guests.
- [x] Record new release, restart outcome and atomic rollback command; old protocol pages refresh. Do not claim a code change is already public before this succeeds.
- [x] Review dirty ownership, obtain any required commit confirmation, commit only recognized task changes, then archive/journal through finish-work. No remote push or amend.

## Rollback and scope stops

- A protocol/ack mismatch rolls back the entire isolated build/release; never hotpatch just the browser or server.
- If replay cannot satisfy held-time/coalescing fixtures, return to design; do not hide corrections by increasing snap thresholds or use seq as tick.
- If a contact A/B does not improve under actual trace sampling, keep the original mechanics, inspect sample phase/cue and document the result before changing scope.
- Historical hit tests, local ball extrapolation, full rollback, widened hitboxes and provisional scoring remain deferred; implementing them requires a separately reviewed design.
- Server restart clears rooms; baseline release20261014T064853Z-fisoonline was verified before publish; current20261015T065916Z-hit-timing and previous link are recorded in research/verification.md.
