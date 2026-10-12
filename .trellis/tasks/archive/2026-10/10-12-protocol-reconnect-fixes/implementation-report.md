# Implementation and regression evidence

## Scope and changes

- `src/shared/protocol.ts`: reject non-string discriminators before command membership; remove string coercion without changing valid version-1 messages or exact-key validation.
- `src/server/service.ts`: share `expireReconnect` between upgrade and collector. A bound opposite socket wins, otherwise winner is null; both paths finish with `disconnect` and reclaim immediately.
- `tests/protocol.test.ts`: 16 focused cases cover all four valid commands, extra keys, array/nested-array commands, other discriminator values, missing type, malformed JSON and non-object payloads.
- `tests/service.test.ts`: 12 actual authenticated HTTP/WS cases require 1008/`invalid_message`; two expired-upgrade cases cover online/absent opponents, matching result and score, idle/reclamation, no resumed `matched` for the expired room, and immediate queue reuse. Existing normal resume and collector expiry remain exercised.
- `scripts/publish.sh`: only replace the Nginx-validation failure diagnostic with project snippet/include inspection and removal of only an include newly added by this release; warn against overwriting shared config with an old backup. Exit remains before current switch, restart or reload.
- `docs/deployment.md`: align the publish paragraph with resource/environment/include setup, Nginx validation, current/previous switch, systemd restart/local health, Nginx reload and public checks.

## Deterministic expiry scheduling

Expired-upgrade tests recreate their ephemeral loopback service after partially enabling Vitest fake timers for `Date`, `setInterval`, and `clearInterval`. Real socket events, fetch, `setTimeout`, and monotonic `performance.now()` polling remain active. The server observes the left close via the opponent's reconnecting snapshot, and the absent-opponent case additionally waits for the existing right-disconnect log event.

`vi.setSystemTime(Date.now() + 701)` passes the configured 700 ms deadline without executing any interval. Immediately before the returning authenticated upgrade, both cases assert **rooms = 1** and **no `room_reclaimed` event**. This isolates the upgrade branch from the 100 ms collector instead of racing it. Service teardown clears the fake service/heartbeat intervals before `vi.useRealTimers()` in `finally`.

## Baseline reproduction

Run after adding regressions but before editing product code:

```bash
npx vitest run tests/protocol.test.ts tests/service.test.ts -t 'logical command validation|closes authenticated malformed|expires reconnect during upgrade' --reporter=verbose
```

Result: **13 failed, 17 passed, 7 skipped**, two failed files; duration 8.73 s.

- Four parser array tests received `{ type: [command] }` instead of null.
- Eight actual WS array/nested-array messages timed out with `Malformed command was not closed`.
- Absent-opponent expired upgrade received `winner: "right"` rather than null, with matching `disconnect` reason and zero score.
- The online-opponent expired upgrade passed, including pre-upgrade room/no-reclaim assertions.

## Targeted checks after repair

```bash
npx vitest run tests/protocol.test.ts tests/service.test.ts -t 'logical command validation|closes authenticated malformed|expires reconnect during upgrade|pauses, resumes' --reporter=verbose
bash -n scripts/publish.sh scripts/rollback.sh
git diff --check
```

Result: **31 passed, 6 skipped**, two passed files; duration 1.63 s. This includes ordinary same-Cookie resume and real collector expiry. Shell syntax and diff whitespace checks passed. Modified TypeScript files were formatted with Prettier.

## Remaining verification and boundaries

Independent reviewer owns lint, typecheck, full tests, build and local HTTP checks. Main owns spec synchronization, acceptance checklists and task/Git lifecycle. No deployment, production service restart, browser launch, dependency/port/route change or frozen-upstream edit occurred. These tests do not establish physical two-computer rendering or response latency.
