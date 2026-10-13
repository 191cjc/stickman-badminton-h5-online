# AI serve self-hit repair

## Goal

Fix AI practice serves that fall onto the AI's own court, and explain whether the defect is inherited from upstream. The user explicitly authorized browser testing and selected creation and continuation of this repair task.

## Confirmed evidence

- Public Chromium reproduction: first human serve crosses the net normally; the subsequent AI serve changes into a downward shot and lands on the AI half (x≈1031), giving the human a point. No page errors were observed.
- Both frozen upstream `BadmintonGame` and derived `Simulation` reproduce the same right-side serve: tick 119 launches upward with valid predicted net clearance ≈104; tick 151 records `Edge smash`, rallyHits=1 before crossing; tick 169 lands at x≈1031.
- `src/shared/ai-controller.ts` treats any ball on the AI half as incoming, including its own outgoing shot. `Simulation.tryHitWithPlayer` does not reject a consecutive hit by `lastTouchedBy`.

## Requirements

- R1: AI must not queue swings or attacking jumps against its own outgoing shuttle. Normal and boss difficulties still serve and receive opponent shots.
- R2: Shared authoritative collision logic must reject a consecutive racket contact by the same side, covering AI practice and human online play. A fresh attached serve and a return after the opponent's contact remain legal.
- R3: Retain existing serve launch calculation, physics, movement, input, scoring and seven-point result flow; preserve the frozen upstream and provenance record.
- R4: Add meaningful regression evidence for the AI self-hit and both-side human duplicate-hit behavior, while retaining upstream comparison coverage for unchanged mechanics.
- R5: Use the user's browser authorization for local/public functional verification. Publish the validated fix through the independent release procedure and check only the owned service plus existing entrance isolation.

## Acceptance criteria

- AC1 (R1–R2): With no receiving input, an AI serve crosses the net into the receiving half without AI recontact; normal and boss pass. Same-side repeated swing inputs cannot overwrite an outgoing shot; opponent returns remain possible.
- AC2 (R3–R4): Regression tests fail against the prior defect and pass after repair. Relevant mechanics, prediction and HTTP/WS tests, lint/types and build pass without editing the frozen upstream to hide drift.
- AC3 (R5): Browser evidence records actual Canvas trajectories and visible results before/after, including right-side AI serves. Independent HTTP/WS checks pass after publication, previous release is retained, and other game services/routes remain unaffected.
- AC4: Report verified Chromium behavior separately from real dual-computer latency, other browsers and weak-network feel, which this task does not establish.

## Scope limits

Change AI incoming-shot eligibility and shared racket-contact eligibility, with focused tests and documentation. Do not retune flight/serve angles, redesign AI difficulty, alter UI layout, wire payloads or client prediction ownership, add product dependencies, modify old game code/services/routes, or change upstream license claims.
