# Full Flash source archive

## 1. Scope / Trigger

Use when obtaining/recovering/verifying Flash90302, or changing source archival tools. The public release binary is the lossless reference; selected runtime assets are not evidence of source completeness. [Reference](../../../reference/flash-90302/README.md) is outside public/dist, not a runtime dependency. Preserve frozen original.swf, original.xml.gz, SOURCE.json and scripts byte-for-byte. No open-source licence or author editable project is inferred from bytecode recovery.

## 2. Signatures

```bash
python3 tools/flash-archive/archive.py inspect --root artifacts/flash-full-archive
python3 tools/flash-archive/archive.py package --root artifacts/flash-full-archive --archive reference/flash-90302/full-export.tar.xz --manifest reference/flash-90302/ARCHIVE.json
python3 tools/flash-archive/archive.py verify --archive reference/flash-90302/full-export.tar.xz --manifest reference/flash-90302/ARCHIVE.json
```

Only Python standard library is required for archival verification. Recovery additionally uses isolated JPEXS26.3.0/Java21 as documented in [tool README](../../../tools/flash-archive/README.md); no SWF execution is required.

## 3. Contracts

Stage full original.swf + original.xml, unfiltered export/ (with AS Embed assets), pcodehex/, reconstructed-xfl/, logs and source/download/external evidence. JPEXS `-onerror abort -exportembed -export all` without select/selectid/selectclass is required for full export; additionally recover pcodehex, XML and labelled reconstructed XFL. Keep unknown tags and exact ABC in raw/. The bundle excludes profile directories and generated Python cache. COVERAGE.json is derived from original data, not arbitrary declared counts. ARCHIVE.json records every bundled file's size/hash and bundle digest; verifier re-derives source coverage.

Both original SWF and full XML are pinned to their frozen SHA256 before structural inspection. For XML, matching tags/IDs/counts alone cannot establish that shape data and method bodies are unchanged. The XML digest is `3c6172e89a9d540fdf976484cc3765190368cdf5f49838fb6f82e9b4bb6861d0`, as recorded in frozen SOURCE.json; a new recovery tool/version must not silently replace that reference.

Current source:112 AS/script identities and P-code files,2 ABC/867 bodies,169 shapes,2 morphs,16 bitmap,7 fonts,105 texts,12 sounds,191 sprites/1363 frames+104 root frames,31 buttons/124 states,75 resolved Embed annotations. The original and raw/XML retain bytecode and timeline behavior beyond static SVG/XFL conversion.

## 4. Validation & Error Matrix

| Condition | Outcome |
| --- | --- |
| Declared decompressed length/stream/tag boundary mismatch | Fail; retain staging for investigation |
| Frozen SWF/XML digest differs despite matching IDs/counts | Fail; do not overwrite the reference |
| Missing resource ID, frame, script identity or Embed file/symbol/character definition | Fail; do not silently ignore/satisfy with unrelated files |
| Bundle digest, any file length/hash or raw source record differs | Fail verification |
| Unrecognized/unsupported tag | Retain raw tag and original/XML; record representation limits |
| External service unavailable | Save exact URL/error/evidence; do not treat server implementations as embedded game code |
| Successful archive verification | Establishes saved content coverage; does not establish H5 parity or original Flash runtime behavior |

## 5. Good / Base / Bad Cases

Good: original hash is unchanged, every ID/frame/Embed resolves and source-derived verification passes. Base: full public binary+raw/XML are retained even when a readable conversion has limits. Bad: exporting only Joe/SVG assets or relying only on exporter success/global totals to claim all characters/effects/code are saved.

## 6. Tests Required

Run archive verify, source/asset tests, lint and typecheck for changed tools/docs. Inspect raw tag/ABC roundtrip and meaningful corruption/omitted-frame/Embed-symbol probes in temporary copies. Check Git diff excludes src/public/ops/deployment and frozen source edits. Archive-only work requires no browser or production restart.

## 7. Wrong vs Correct

Wrong: “all code downloaded” means all selected H5 features are implemented, or reconstructed XFL is the author's original FLA. Correct: explicitly distinguish unchanged public release, recovered code/resources, unavailable private/remote-service source, and currently implemented H5 scope. Preserve full effects/characters in the source archive even before runtime migration.
