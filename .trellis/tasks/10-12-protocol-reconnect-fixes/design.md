# Repair design

`parseClientMessage(raw: string): ClientMessage | null` remains the untrusted JSON boundary. Require a string discriminator before command membership. Keep valid wire shapes, exact keys, input/ping checks and existing WS null-parser close handling. Intended version-1 messages remain compatible.

Inside `createGameService`, unify expiry outcome for an expired side: choose the opposite side only if its guest has a bound socket, otherwise null. Finish with `disconnect` and reclaim through existing helpers. Upgrade assigns the incoming guest's socket before the deadline check, so the regression must isolate that branch with the opposite socket present/absent and observe the result on the returning socket. Scheduling control belongs in tests; avoid new production timing knobs.

Change only the publisher's failed-Nginx diagnostic, maintaining exit before release switch/restart/reload. Match the deployment paragraph to resource/env/include installation and Nginx validation before current switch, service restart, local health, reload and public checks. Keep the existing secret stable.

This is a local repair, not a production release. Reverting the repair commit restores baseline behavior. Valid reconnect, leave/score/timeouts, frozen upstream/provenance and other game entrances keep their existing owners.
