# Final archive review

Status: PASS. Core/archive/tool checks pass; supplemental external device-font
limits are explicitly documented in the final verified bundle. No unresolved
source preservation or coverage finding remains.

## Fixed findings

- `tools/flash-archive/archive.py`: structural XML tag/ID/count comparison could
  accept changes to other XML data during a future repack. Pin the complete XML
  SHA256 to frozen SOURCE.json before inspection. A regression test and a real
  source XML mutation with unchanged tag/count meaning both reject the change.
- `tools/flash-archive/archive.py`: an Embed symbol name could exist while its
  character ID had no definition in the exported assets SWF. Require the actual
  character definition; regression coverage includes a dangling exported name.
- `tools/flash-archive/README.md`: add executable unfiltered JPEXS recovery
  commands, isolated Java/profile paths, abort/stop behavior and the distinction
  between reconstructed XFL and the author's editable FLA. Sync the XML/Embed
  integrity contract into the source-archive spec.

## Independent verification

- Original compressed SWF, full recovered XML and all 112 AS files were compared
  byte-for-byte with frozen reference files; each AS also matches SOURCE.json.
- The CLI successfully reverified all 11,586 bundle files, every file hash, raw
  tag/ABC bytes, SWF/XML structures, resource IDs, script QNames, frames/states
  and Embed references after the tool fixes and external-documentation rebuild.
  Final bundle: 54,339,800 bytes; unpacked: 434,244,255 bytes; SHA256
  `73c26baea166485903a880882871a0ecd138399d1f0ba4ec413f901c31c5a42a`.
- Source-derived totals: 112 AS/P-code pairs, 2 ABC, 867 method bodies, 4,398 raw
  tags, 169 shapes, 2 morphshapes, 16 bitmaps, 7 fonts, 105 texts, 12 sounds,
  191 sprites/1,363 frames, 104 root frames, 31 buttons/124 states and 75 Embed
  annotations. Core conversion exceptions are empty.
- All eight character sliders, BigSpark and ParticleBirdie retain their script,
  symbol and sprite coverage. Every exported assets SWF symbol resolves to an
  actual character definition (522 symbols/522 definitions).
- All 1,762 main-game SVG exports parse as SVG XML (169 shape, 2 morphshape,
  104 root frames, 1,363 sprite frames and 124 button states); all 7 font files
  have valid TTF/OTF signatures. This checks format integrity, not visual parity.
- Nine corruption/omission probes ran on disposable copies without mutating
  staging: missing root frame104; missing nested sprite533 frame144; missing
  shapeID1; missing BigSpark AS; unresolved Embed name; absent Embed SWF; XML
  change with identical tags/counts; changed raw tag69 payload; changed manifest
  file hash. All failed for the intended reason.
- Downloaded external body sizes/hashes match request evidence. The six direct
  loader snapshots and one watermark SWF pass structural source checks; these
  are seven copies, not seven unique SDK implementations. Kongregate has 29
  recovered AS3 identities, CPMStar has 2, and the watermark has 10 AS1/2 action
  blocks, with matching AS/P-code and source XML evidence.
- Supplemental per-resource/frame coverage is recorded in
  [external-coverage.json](external-coverage.json). The watermark has 3 shapes,
  3 texts, 1 button/4 states, 6 sprites/43 frames and 1 root frame. Its fonts2/6
  have no glyphs or code table: device-font placeholders have no standalone TTF
  export. Their original SWF/XML remain complete; explicit conversion limits
  are recorded in EXTERNAL.md, external/RECOVERY.json and reference README.
  The bundled independent_coverage ledger equals this reviewer's evidence.
  One sprite has zero frames,
  so no frame file/empty directory is needed in the file-only tar.

## Checks

- `PYTHONDONTWRITEBYTECODE=1 python3 tools/flash-archive/test_archive.py`: 8 pass.
- `npm run lint`: pass after review fixes.
- `npm run typecheck`: pass after review fixes.
- `npx vitest run tests/classic/assets.test.ts`: 7 pass.
- CLI help and `git diff --check`: pass. No generated Python cache tracked.
- Reviewed edits are restricted to tools/reference/Trellis task/spec documents;
  frozen SOURCE/scripts/SWF/XML and src/public/ops/deployment scripts unchanged.
  No browser, publishing command or service restart was run.

## Limits

This establishes preservation and readable recovery of the public release, not
author original FLA/AS availability or H5 runtime/visual parity. External loader
files are current snapshots and cannot prove exact 2012 versions. Playtomic DNS
failure and dynamic advertisement/service boundaries are documented; private
server implementations are not claimed. The saved effects/characters still
need a separate H5 integration task. No remaining core-source omission was found.
