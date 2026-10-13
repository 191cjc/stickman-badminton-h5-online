# Independent deployment and operations

The public entry, backend port, unit, snippet, release tree, Cookie secret, and rollback belong to this project. Existing community-demo, original verification, and cloud-game resources are separate.

## Pre-development checklist

- Read [operations](operations.md) and the current task's deployment scope before changing infrastructure.
- Trace path/port/origin changes through shared protocol, Vite, server environment, Nginx, scripts, and documentation.
- Preserve the upstream source record and all existing game entry points.
- For source download/recovery, follow [full source archive](source-archive.md); selected production assets do not establish original completeness.
- Prepare and verify a concrete build before any authorized publication.
- Distinguish HTTP/protocol checks from manual browser and two-computer acceptance.

## Reference

[Operations](operations.md) records exact resource ownership, development commands, publish/rollback procedures, logging, verification, and provenance constraints. [Backend architecture](../backend/architecture.md) covers process lifetime; [cross-layer guidance](../guides/cross-layer-thinking-guide.md) covers coordinated configuration changes.

[Full source archive](source-archive.md) records unfiltered recovery, resource ID/frame/Embed coverage, lossless raw preservation and executable archive verification.

## Quality check

Check exclusive path/port/service/release ownership, secret handling, and rollback/build consistency against ops/scripts. Shell changes need `bash -n scripts/publish.sh scripts/rollback.sh`; runtime publication needs the authorized build/HTTP checks in [operations](operations.md). Spec-only changes require link/source verification and do not publish or invoke browser tests.

Source archive changes require the [archive checks](source-archive.md), freeze hash preservation and exclusion from public/dist. A passing archive check is separate from H5 feature parity.
