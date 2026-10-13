# Execution

1. [x] Record scope, provenance boundaries and acceptance ledger.
2. [x] Redownload SWF and retain page/HTTP evidence. Compare frozen bytes, SHA256 and decompressed declared length.
3. [x] Export all AS, Embed assets, pcodehex, resource categories, complete XML and reconstructed XFL to staging, no filters. Record commands and errors.
4. [x] Inspect all external loaders/URLs and save available dependencies with responses and limits.
5. [x] Implement independent lossless raw tag/ABC extraction, ID/frame coverage ledger, per-file hashes, deterministic bundle and verification tool. Investigate all mismatches before claiming coverage.
6. [x] Update reference README and archive manifest; ensure source freeze and production boundary unchanged.
7. [x] Trellis full-scope check: rerun archive verification/existing source tests, lint/typecheck, check Git diff and no deployed files changed.
8. [x] Capture archive contract in provenance spec, commit task deliverables, journal/archive task.

Validation includes python3 tools/flash-archive/archive.py --help (exact CLI to be documented), archive verify, npx vitest run tests/classic/assets.test.ts, npm run lint, npm run typecheck. Export completeness is checked against original XML/raw tags, not exporter exit alone. No publish or browser command.
