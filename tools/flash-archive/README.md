# Full Flash release archive

This research-only tool creates and verifies the complete recovered archive of
the user-confirmed4399 release90302. It uses Python3.10+ standard-library modules,
never executes Flash and never touches the H5 runtime or deployment. The frozen
source SWF and complete XML SHA256 are checked before source inspection. Recovery outputs are neither
the author's original editable project nor a statement of an open-source license.

## Commands

From the project root, after the documented unfiltered JPEXS exports finish:

```bash
python3 tools/flash-archive/archive.py inspect --root artifacts/flash-full-archive
python3 tools/flash-archive/archive.py package \
  --root artifacts/flash-full-archive \
  --archive reference/flash-90302/full-export.tar.xz \
  --manifest reference/flash-90302/ARCHIVE.json
python3 tools/flash-archive/archive.py verify \
  --archive reference/flash-90302/full-export.tar.xz \
  --manifest reference/flash-90302/ARCHIVE.json
PYTHONDONTWRITEBYTECODE=1 python3 tools/flash-archive/test_archive.py
```

`inspect` writes `raw/` and `COVERAGE.json` in staging. `package` reruns inspection,
then bundles staging files with sorted paths, zero timestamps/ownership and fixed
0644 file permissions. The recommended `.tar.xz` output uses LZMA2 preset6 with
a64MiB dictionary so repeated frame/image content stays suitable for Git. A
`.tar.gz` output is also supported; its header has no filename and timestamp0.
The archive and manifest must be outside staging. Java `profile*` folders and
`__pycache__` files are excluded; all other staging files are included, including
HTTP evidence, logs, dependency downloads and recovery metadata. Additional
source/provenance metadata can be added to `ARCHIVE.json` without replacing its
generated `files`, `coverage` or `archive` fields.

`verify` checks archive bytes/hash, the complete per-file inventory and hashes,
safe file paths, then reparses the bundled SWF/XML in an isolated temporary
directory. It compares each raw tag's exact header/payload and each raw ABC to the
original source bytes, rebuilds the coverage ledger, and compares it to both
manifest and bundled `COVERAGE.json`. A missing or unexplained conversion causes
a nonzero exit; this archive currently needs no conversion exception.

## Reproduce the recovery

Use the isolated JPEXS26.3.0 distribution and OpenJDK21 already stored under
`artifacts/flash-original-research/tools/`; they are research tools, not project
dependencies. `recovery.json` in the bundle records their download URL/digests
and every command/exit code. Start with an empty staging directory and the
unchanged downloaded `original.swf`; retain the HTTP metadata and source page
alongside it. The reference SWF and XML must never be overwritten by recovery.

From the project root:

```bash
FLASH_ARCHIVE_JAVA="$PWD/artifacts/flash-original-research/tools/jre-local/usr/lib/jvm/java-21-openjdk-amd64/bin/java"
FLASH_ARCHIVE_JAR="$PWD/artifacts/flash-original-research/tools/ffdec/ffdec.jar"

(
  set -e
  cd artifacts/flash-full-archive
  flash_archive_ffdec() {
    "$FLASH_ARCHIVE_JAVA" -Djava.awt.headless=true -Duser.home="$PWD/profile-recovery" \
      -jar "$FLASH_ARCHIVE_JAR" "$@"
  }
  flash_archive_ffdec -onerror abort -exportembed \
    -format script:as,shape:svg,morphshape:svg,frame:svg,sprite:svg,button:svg,text:formatted,font:ttf,sound:mp3_wav_flv,image:png_gif_jpeg \
    -export all export original.swf
  flash_archive_ffdec -swf2xml original.swf original.xml
  flash_archive_ffdec -onerror abort -format script:pcodehex \
    -export script pcodehex original.swf
  flash_archive_ffdec -onerror abort -format xfl:cs6 \
    -export xfl reconstructed-xfl original.swf
)
```

Capture each command's output/exit code and stop on a failure; never add
`-select`, `-selectid`, `-selectclass` or `-onerror ignore`. Reconstructed XFL is
a supplementary representation of the binary, not the author's original FLA.
External loader recovery commands and download/error evidence are saved in
`external/RECOVERY.json`, `external/requests.json` and
`external/transitive-requests.json`; those current snapshots do not identify
historical2012 service content.

## Required staging layout

```text
original.swf                   original90302 release, byte-for-byte unchanged
original.xml                   full JPEXS26.3.0 swf2xml output
export/scripts/**/*.as         every recovered script pack, no filters
export/scripts/_assets/        Embed SWF and all embedded audio sources
export/{shapes,morphshapes,images,fonts,texts,sounds}/
export/frames/                 root frames1..104 as SVG
export/sprites/DefineSprite_ID[_name]/FRAME.svg
export/buttons/DefineButton2_ID[_name]/{1_up,2_over,3_down,4_hittest}.svg
export/symbolClass/symbols.csv  unfiltered exported source linkage
pcodehex/scripts/**/*.pcode    every recovered pcodehex script pack
reconstructed-xfl/**/DOMDocument.xml
external/                      public static dependencies and request evidence
```

The original compressed SWF's declared uncompressed length and exact stream
termination are checked. XML tags are matched in order against root and nested
raw timelines, including definition IDs, unknown bytes and sprite frame counts.
AS and pcode paths are matched individually to all XML script trait QNames, with
JPEXS `§` escaping removed for identity comparison. Each resource ID has a ledger
entry; every root/sprite frame and each of the four button states is required.
Every AS `Embed` source is checked, and its symbol resolves against the exported
SWF's `ExportAssets`/`SymbolClass` table to a character definition. BigSpark, ParticleBirdie and all eight
character sliders must retain scripts, original symbols and sprite definitions.
Downloaded external SWFs have structural length/tag/ABC checks and file hashes;
third-party network services are documented separately and are not acquired
through this tool.

`raw/` contains a full uncompressed SWF, movie header, exact records and payloads
for every root/nested tag, original ABC byte streams and an `INDEX.json` with
offsets, lengths and hashes. Unknown tags remain inspectable rather than silently
discarded. Original SWF/XML remain authoritative for timelines, masks, effects,
font metadata and dynamic behavior that may not survive a visual conversion.
Presence and hash verification do not establish rendered/gameplay parity with
Flash and do not claim that these resources are already connected to H5.

## Boundary tests

The small unittest suite covers compressed-stream truncation/trailing bytes,
tag boundary overruns, root/nested byte reconstruction, unknown long-tag
preservation, frozen XML integrity, tamper detection, exported symbol IDs,
missing Embed files/unresolved symbols and unsafe tar paths. Full
archive verification is the integration check against the actual90302 source.
