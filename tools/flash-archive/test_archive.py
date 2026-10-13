"""Boundary checks for lossless recovery; no Flash runtime is invoked."""

import gzip
import importlib.util
import json
import struct
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import zlib
from pathlib import Path


SPEC = importlib.util.spec_from_file_location("flash_archive", Path(__file__).with_name("archive.py"))
archive = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(archive)


def tag(code, payload=b"", long=False):
    if long or len(payload) >= 63:
        return struct.pack("<HI", (code << 6) | 63, len(payload)) + payload
    return struct.pack("<H", (code << 6) | len(payload)) + payload


def example(compressed=False):
    # One sprite with one frame; preserve an unknown long tag in the root.
    sprite = struct.pack("<HH", 5, 1) + tag(1) + tag(0)
    body = b"\0" + struct.pack("<HH", 60 * 256, 1)
    body += tag(255, b"\x02" * 64, long=True) + tag(39, sprite) + tag(1) + tag(0)
    header = (b"CWS" if compressed else b"FWS") + b"\x0f" + struct.pack("<I", len(body) + 8)
    return header + (zlib.compress(body) if compressed else body)


class RecoveryBoundaryTests(unittest.TestCase):
    def test_cws_and_fws_recover_identical_movie_and_nested_records(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for compressed in (False, True):
                source = root / "input.swf"
                source.write_bytes(example(compressed))
                movie = archive.swf_read(source)
                tags = archive.parse_tags(movie["data"], movie["tags_offset"], len(movie["data"]))
                inventory = archive.raw_extract(root, movie, tags, write=True)
                # Reassemble independent exact top-level records to recover the
                # source bytes, including unknown payload/long header and End.
                records = [entry for entry in inventory["tags"] if entry["timeline"] == "root"]
                restored = (root / "raw/movie-header.bin").read_bytes()
                restored += b"".join((root / entry["record"]["path"]).read_bytes() for entry in records)
                self.assertEqual(restored, example(False))
                self.assertEqual(tags[1]["children"][0]["code"], 1)
                self.assertEqual(inventory["tags"][0]["payload"]["bytes"], 64)
                archive.raw_extract(root, movie, tags, write=False)

    def test_truncated_compressed_stream_and_trailing_bytes_fail(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "bad.swf"
            for data in (example(True)[:-1], example(True) + b"\0", example(False)[:-1]):
                path.write_bytes(data)
                with self.subTest(size=len(data)), self.assertRaises(archive.ArchiveError):
                    archive.swf_read(path)

    def test_tag_payload_cannot_cross_its_timeline(self):
        # Long header claims a length larger than the enclosing buffer.
        source = struct.pack("<HI", (255 << 6) | 63, 4096) + b"\x02" + tag(0)
        with self.assertRaisesRegex(archive.ArchiveError, "boundary"):
            archive.parse_tags(source, 0, len(source))
        # An End must not silently hide bytes after it.
        with self.assertRaisesRegex(archive.ArchiveError, "terminate"):
            archive.parse_tags(tag(0) + b"extra", 0, 7)

    def test_raw_tampering_is_detected_independently_of_manifest(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "input.swf"
            source.write_bytes(example())
            movie = archive.swf_read(source)
            tags = archive.parse_tags(movie["data"], movie["tags_offset"], len(movie["data"]))
            archive.raw_extract(root, movie, tags, write=True)
            raw = root / "raw/tags/root/0000-tag-255.payload.bin"
            raw.write_bytes(b"x" * 64)
            with self.assertRaisesRegex(archive.ArchiveError, "Raw bytes missing/different"):
                archive.raw_extract(root, movie, tags, write=False)

    def test_symbol_exports_resolve_exact_character_ids(self):
        payload = struct.pack("<HH", 1, 278) + b"symbol278\0"
        data = tag(56, payload) + tag(0)
        tags = archive.parse_tags(data, 0, len(data))
        self.assertEqual(archive.symbols_from_tags(tags, data), {"symbol278": 278})

    def test_source_xml_digest_is_checked_before_structural_coverage(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = example()
            (root / "original.swf").write_bytes(source)
            (root / "original.xml").write_text('<swf frameCount="1" version="15"/>')
            with patch.object(archive, "EXPECTED_SOURCE_SHA256", archive.sha256(source)):
                with self.assertRaisesRegex(archive.ArchiveError, "Original XML differs"):
                    archive.analyze(root)

    def test_embed_requires_a_downloaded_source_and_a_resolved_symbol(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            script = root / "export/scripts/fx/BigSpark.as"
            script.parent.mkdir(parents=True)
            script.write_text('[Embed(source="/_assets/assets.swf",symbol="symbol278")]')
            scripts = {"fx.BigSpark": "export/scripts/fx/BigSpark.as"}
            with self.assertRaisesRegex(archive.ArchiveError, "Missing/empty export"):
                archive.embed_coverage(root, scripts)
            # A complete SWF with a different exported name cannot satisfy an Embed.
            payload = struct.pack("<HH", 1, 278) + b"wrongSymbol\0"
            body = b"\0" + struct.pack("<HH", 60 * 256, 1)
            body += tag(56, payload) + tag(1) + tag(0)
            embedded = b"FWS\x0f" + struct.pack("<I", len(body) + 8) + body
            target = root / "export/scripts/_assets/assets.swf"
            target.parent.mkdir()
            target.write_bytes(embedded)
            with self.assertRaisesRegex(archive.ArchiveError, "Unresolved Embed symbol symbol278"):
                archive.embed_coverage(root, scripts)
            # Even the correct exported name needs its actual character definition.
            payload = struct.pack("<HH", 1, 278) + b"symbol278\0"
            body = b"\0" + struct.pack("<HH", 60 * 256, 1)
            body += tag(56, payload) + tag(1) + tag(0)
            target.write_bytes(b"FWS\x0f" + struct.pack("<I", len(body) + 8) + body)
            with self.assertRaisesRegex(archive.ArchiveError, "has no character definition"):
                archive.embed_coverage(root, scripts)

    def test_archive_path_traversal_is_rejected_before_extracting(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            package = root / "malicious.tar.gz"
            with package.open("wb") as out:
                with gzip.GzipFile(filename="", fileobj=out, mode="wb", mtime=0) as compressed:
                    with tarfile.open(fileobj=compressed, mode="w") as bundle:
                        info = tarfile.TarInfo("../outside")
                        info.mode = 0o644
                        bundle.addfile(info)
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({"schema": 1, "archive": {"bytes": package.stat().st_size,
                "sha256": archive.file_digest(package)}, "files": [{"path": "../outside", "bytes": 0,
                "sha256": archive.sha256(b"")}], "file_count": 1, "unpacked_bytes": 0}))
            with self.assertRaisesRegex(archive.ArchiveError, "Unsafe archive entry"):
                archive.verify_package(package, manifest)
            self.assertFalse((root / "outside").exists())


if __name__ == "__main__":
    unittest.main()
