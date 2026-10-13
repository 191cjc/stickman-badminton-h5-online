# Attribution verdict — implementation paused

The user requested attribution first and paused repair/publication. No production release or restart has occurred in this investigation.

## Verdict

The reproduced AI-serve defect is present in upstream commit `1a8799e65a39f7dafab2075c9297d8e4965f1ecb` and inherited by the derived Simulation.

## Evidence

1. Targeted Chromium on the live online project's ordinary AI-practice UI shows a normal human serve followed by an AI serve that is re-hit downward and lands on the AI half near x1031. The browser was closed after collecting screenshots and Canvas trajectory/DOM score observations.
2. Run frozen upstream BadmintonGame(single, normal) and derived Simulation(single, normal) with the same legal right-server starting fixture and no receiving input. They have identical launch, second-contact and ground events: tick119 upward Power Serve, tick151 Edge smash/rallyHits=1 before crossing, tick169 own-half landing x1031 and human point. Flight velocities and serve diagnostics match exactly from launch onward.
3. Recomputed Git blob hashes for upstream AI, game, config, entities, flight and math match the verified provenance manifest. The comparison reference is unchanged.
4. Both AI implementations use the same incoming predicate: a ball on its own court counts as incoming even when lastTouchedBy is itself. Both racket-hit implementations lack a consecutive-side contact rejection. Thus an initially valid upward serve is overwritten by a second AI hit.

Evidence files: ignored `artifacts/ai-serve-repro/public-repro.json`, `right-serve-before.json`, `source-attribution.json` and screenshots. This verdict applies to the specified upstream commit and the reproduced serve behavior.

Implementation and deployment are paused until the user steers the next step. Task design and proposed regressions remain plans, not an implemented repair.
