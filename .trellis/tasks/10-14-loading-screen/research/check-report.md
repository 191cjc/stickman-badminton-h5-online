# Loading-screen independent check

## Scope

Independent final review of all current-task frontend/HTML/CSS/test changes and
the new startup contracts in frontend component/directory specs. Read the full
native hook context saved under `/tmp/hook_outputs`, task PRD/design/implementation
plan and implementation report. No implementation/check sub-agent was spawned.
Main retains ownership of HTTP/browser/deployment/docs/task/Git actions.

## Findings (fixed)

- File: `.trellis/spec/frontend/component-guidelines.md`
  - Issue: the pre-existing raster paragraph implied cache clearing on every idle
    and reconnect-pause notification, while the current startup behavior preserves
    repeated already-empty idle and already-paused snapshots.
  - Fix: describe clearing when returning from a prior scene to idle, on
    queue/matched and on entering reconnect pause; explicitly preserve repeated
    empty idle/paused snapshots.
- File: `.trellis/spec/frontend/component-guidelines.md`
  - Issue: “retry ... at most three times” could imply four total attempts.
  - Fix: specify at most three preparation attempts total, matching `prepareCourt`.

No source/test correction was needed after the independent review.

## Findings (not fixed)

No blocking or in-scope unresolved code findings identified. The accepted design
limits below remain explicit and do not warrant an unrelated rendering redesign.

## Verified code paths

- Static HTML has a separate visible loading cover, indeterminate native progress,
  stage status and reload action before startup JavaScript. Menu/action/touch
  parents start inert and Canvas is outside the tab order. The cover is above
  menu/score/actions and is not altered by the normal overlay helper.
- All roster/start/cancel/leave paths have readiness guards. Ordinary Canvas and
  presentation clocks return before readiness; `canSampleInput` gates the existing
  scheduler. Keyboard state accumulated during loading is cleared before reveal.
- WS can initialize idle or resume a retained room under the cover. Initial idle
  is initialized before art loading; successful load never invokes idle. Current
  room/side/latest authority remain intact at reveal, then focus/input clocks sync.
  Cache generations invalidate work on room/reset changes; viewport change also
  invalidates the pass, with a finite three-total-attempt bound.
- `loadImages` uses six workers and reports actual successful unique completion.
  Error/timeout aborts remaining image work, removes handlers/src/timers and blocks
  late callbacks from publishing progress. `fetchAsset` bounds request plus body
  consumption through the same AbortController and clears its deadline in finally.
- `yieldForPaint` uses a RAF then a task for visible-page paint opportunity, with
  a 50ms fallback when RAF is suspended. Preparation yields before every job and
  after the last. Cache `prepare` reads one pixel once for each prepared entry,
  frees/suppresses failed readbacks and retains original-image fallback.
- Normal rendering and preparation share the same net/score/body/swing selectors.
  Source frame order/registration and attached-shuttle handling are unchanged.
  Preparation uses DPR × world scale and actor scale1.25; mirrored actors use
  the same backing-density bucket. Original filters/assets remain untouched.
- Prewarm deduplicates the current first-draw set rather than preparing all
  animations. Normal64MiB/256 and confetti32MiB/768 budgets are unchanged.
  One-off source-driven budget calculation over all49 role pairs at maximum
  raster bucket4 found the largest initial court at Pirate/Toaster:9 entries,
  32,626,068 RGBA-estimated bytes, below the67,108,864-byte normal cache limit.
  This calculation excludes browser/GPU copies and is not process-memory data.
- CSS keeps the loading cover scrollable, uses compact sizing and reduced-motion
  styling. Failure preserves readiness/inert gates and enables only reload.
  Reachability/layout/actual paint remain browser acceptance work for main.

## Verification

- Lint: pass (`npm run lint`).
- TypeCheck: pass (`npm run typecheck`; also build prerequisite).
- Tests: pass (`npm test`),16 files /196 tests.
- Build: pass (`npm run build`); JS `index-wsjtUqlH.js`109.41kB,
  CSS `index-CMOCPJtZ.css`7.88kB, server157.8kB.
- Targeted Prettier check: pass for all changed HTML/client/test implementation
  files. `git diff --check`: pass.
- `git diff --numstat -- src/shared src/server public/classic`: empty; gameplay,
  server and source assets have no task changes. HTTP/hash-byte checks are still
  performed by main against this final build before browser verification.

## Evidence limits

This check did not run browser, publish, restart, commit or public matchmaking.
Cold/slow/failure/reload/compact/retained-Cookie restoration and short two-player
regression belong to main's authorized HTTP-then-browser verification. A single
filtered SVG/readback can still block the main thread; no claim of uninterrupted
animation or user-device load time is made. Live restored-room animation may
advance during bounded preparation, so later frames still use ordinary lazy
caching. The fallback removes mandatory RAF dependence but cannot override hidden
tab timer throttling. Repeated scene/viewport changes beyond the attempt bound
show explicit retry rather than silently accepting an unstable prepared view.
