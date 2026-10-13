# Archive design

The behavior gap is independently exported source coverage, not runtime gameplay. The unchanged original SWF and full XML are the lossless source. JPEXS exports are readable/convenient recovery representations and must not replace them.

Acquisition and JPEXS commands run under ignored artifacts/flash-full-archive. Export all without select/class/id filters using 26.3.0 and abort on failures. Include AS + Embed outputs, pcodehex, full XML, reconstructed XFL, all resource exports and source-page/download evidence. Preserve raw ABC and raw tag payloads independently from the decompressed source so unsupported tags remain inspectable.

Add tools/flash-archive for archive creation/verification. Inspect SWF/XML definitions, character IDs, root/nested frame counts and expected resource output coverage. Aggregate missing export entries explicitly and fail unexplained omissions. Store a deterministic full-export.tar.xz and ARCHIVE.json with per-file digest and coverage ledger under reference/flash-90302; retain existing frozen files unmodified. The ledger can distinguish non-convertible items (still in raw original/XML) from a successfully exported representation. Exported Embed SWF symbol names must resolve for every embed annotation.

External Loader files are supplementary dependencies, not game-internal art. Record exact URLs and callers; download available public static content without executing SWFs or sending stats/API writes. Record unavailable services and parameterized APIs. Do not infer access to author source projects or third-party service implementations.

Only tools/reference/task/spec/journal files change. No src/public/ops/scripts deployment changes. If an archive fails verification, keep staging for diagnosis and never replace frozen files. Download and archiving are already explicitly authorized; no new product or deployment approval is needed for this scope.

Full SVGs repeat large embedded image data between frames. The first complete gzip bundle was253MB because DEFLATE cannot deduplicate across its32KB window. Use deterministic tar.xz with a64MB LZMA2 dictionary to retain every file while keeping the Git archive practical; the ledger verifies identical uncompressed file bytes regardless of compressor. No files are removed to reduce archive size.
