# Reproduction and root cause

## Browser

Read-only environment tooling: Playwright from `/home/ubuntu/stickman-badminton-online/node_modules/playwright/index.mjs`, Chromium executable `/home/ubuntu/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`. These are test tools, not application imports/dependencies. User explicitly permits browser testing.

Public page: click `#practice`, press S once, allow the AI return to score, then observe its next serve. Trace Canvas shuttle draw translations and rotation without product debug hooks. The initial human serve flies up and over the net. AI's next serve is re-hit on the AI side and lands near x1031. Saved evidence is in ignored `artifacts/ai-serve-repro/`: `public-repro.json`, screenshots, `simulation-before.json`, `right-serve-before.json`.

## Frozen upstream comparison

Construct upstream BadmintonGame(single, normal) and derived Simulation(single, normal). Seed only a right-server scenario using a test/research fixture (server=right and attached shuttle at right player); give neither player input and step at 1/120. Both implementations produce:

| Tick | Event | vx / vy | Result |
| --- | --- | --- | --- |
| 119 | Power Serve | -848 / -729 | valid prediction, net clearance 104, no rally contact |
| 151 | Edge smash | -1198 / +745 | AI re-hits its own serve before crossing, rallyHits=1 |
| 169 | Ground | -1157 / +911 | x1031, left awarded point |

The real browser reached the same AI-own-half landing through ordinary game play. The targeted fixture isolates the cause deterministically; it is not a new production API.

## Owners and fix direction

- `src/shared/ai-controller.ts`: incoming currently accepts direction*vx<70 OR ballOnOwnSide; lastTouchedBy is ignored, causing swings/jumps on own outgoing shots.
- `src/shared/simulation.ts`: tryHitWithPlayer checks swing active, per-swing contact and geometry, but not lastTouchedBy. Recovery cancellation enables a second swing to hit the same-side shot.
- Original files under `upstream/src/game/` contain the same logic. Do not edit them.
- Serve launch is upward and predicts a legal trajectory. Do not tune serve angles/drag to compensate for an illegal subsequent contact.
