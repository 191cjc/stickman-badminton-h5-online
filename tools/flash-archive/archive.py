#!/usr/bin/env python3
"""Inspect, bundle and independently verify recovered Flash release contents.

Only the Python standard library is needed. No SWF is executed. Resource
exports are conveniences; original SWF, XML, tag records and ABC are retained.
"""

import argparse
import collections
import gzip
import hashlib
import json
import lzma
import re
import struct
import sys
import tarfile
import tempfile
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path, PurePosixPath


SCHEMA = 1
EXPECTED_SOURCE_SHA256 = "cab8a824c54af3a0b9454ef30fcbcabc532931f2a96717239fabd58f57e59912"
EXPECTED_SOURCE_XML_SHA256 = "3c6172e89a9d540fdf976484cc3765190368cdf5f49838fb6f82e9b4bb6861d0"
TAG_NAMES = {
    0: "EndTag", 1: "ShowFrameTag", 2: "DefineShapeTag", 6: "DefineBitsTag",
    8: "JPEGTablesTag", 9: "SetBackgroundColorTag", 10: "DefineFontTag",
    11: "DefineTextTag", 14: "DefineSoundTag", 15: "StartSoundTag", 17: "DefineButtonSoundTag",
    20: "DefineBitsLosslessTag", 21: "DefineBitsJPEG2Tag", 22: "DefineShape2Tag",
    26: "PlaceObject2Tag", 28: "RemoveObject2Tag", 32: "DefineShape3Tag",
    33: "DefineText2Tag", 34: "DefineButton2Tag", 35: "DefineBitsJPEG3Tag",
    36: "DefineBitsLossless2Tag", 37: "DefineEditTextTag", 39: "DefineSpriteTag",
    43: "FrameLabelTag", 45: "SoundStreamHead2Tag", 46: "DefineMorphShapeTag",
    48: "DefineFont2Tag", 56: "ExportAssetsTag", 69: "FileAttributesTag", 70: "PlaceObject3Tag", 72: "DoABCTag",
    73: "DefineFontAlignZonesTag", 74: "CSMSettingsTag", 75: "DefineFont3Tag",
    76: "SymbolClassTag", 82: "DoABC2Tag", 83: "DefineShape4Tag",
    84: "DefineMorphShape2Tag", 86: "DefineSceneAndFrameLabelDataTag",
    88: "DefineFontNameTag", 90: "DefineBitsJPEG4Tag", 91: "DefineFont4Tag",
}
CATEGORY_CODES = {
    "shapes": {2, 22, 32, 83}, "morphshapes": {46, 84},
    "images": {6, 20, 21, 35, 36, 90}, "fonts": {10, 48, 75, 91},
    "texts": {11, 33, 37}, "sounds": {14}, "buttons": {7, 34},
    "sprites": {39},
}
XML_ID_KEYS = {
    "shapes": "shapeId", "morphshapes": "characterId", "images": "characterID",
    "fonts": "fontID", "texts": "characterID", "sounds": "soundId",
    "buttons": "buttonId", "sprites": "spriteId",
}


class ArchiveError(Exception):
    """A malformed source or incomplete/mutated archive."""


def require(condition, message):
    if not condition:
        raise ArchiveError(message)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def file_digest(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def category(code):
    return next((name for name, codes in CATEGORY_CODES.items() if code in codes), None)


def u16(data, offset):
    require(offset + 2 <= len(data), f"Truncated UI16 at {offset}")
    return struct.unpack_from("<H", data, offset)[0]


def swf_read(path):
    original = path.read_bytes()
    require(len(original) >= 12, f"SWF too short: {path}")
    signature = original[:3]
    declared = struct.unpack_from("<I", original, 4)[0]
    require(signature in (b"FWS", b"CWS"), f"Unsupported SWF signature: {signature!r}")
    if signature == b"CWS":
        dec = zlib.decompressobj()
        body = dec.decompress(original[8:]) + dec.flush()
        require(dec.eof and not dec.unused_data and not dec.unconsumed_tail,
                "SWF compressed stream truncated or has trailing data")
    else:
        body = original[8:]
    data = b"FWS" + original[3:8] + body
    require(len(data) == declared, f"SWF declared length {declared} != {len(data)}")
    require(body, "SWF has no movie header")
    rect_size = (5 + (body[0] >> 3) * 4 + 7) // 8
    tags_offset = 8 + rect_size + 4
    require(tags_offset <= len(data), "Truncated RECT/movie header")
    return {
        "original": original, "data": data, "tags_offset": tags_offset,
        "signature": signature.decode(), "version": original[3],
        "declared_length": declared, "frame_count": u16(data, tags_offset - 2),
        "frame_rate": u16(data, tags_offset - 4) / 256,
    }


def parse_tags(data, start, end, timeline="root"):
    tags = []
    offset = start
    while offset < end:
        record_offset = offset
        packed = u16(data, offset)
        offset += 2
        code, length = packed >> 6, packed & 63
        if length == 63:
            require(offset + 4 <= end, f"Truncated long tag header in {timeline}")
            length = struct.unpack_from("<I", data, offset)[0]
            offset += 4
        require(offset + length <= end, f"Tag {code} exceeds {timeline} boundary")
        tag = {
            "code": code, "offset": record_offset, "payload_offset": offset,
            "length": length, "timeline": timeline, "index": len(tags),
            "children": [],
        }
        kind = category(code)
        if kind:
            require(length >= 2, f"Definition {code} has no character ID")
            tag["category"] = kind
            tag["id"] = u16(data, offset)
        if code == 39:
            require(length >= 4, "Truncated sprite header")
            tag["frame_count"] = u16(data, offset + 2)
            tag["children"] = parse_tags(data, offset + 4, offset + length,
                                          f"{timeline}/sprite-{tag['id']}")
        tags.append(tag)
        offset += length
        if code == 0:
            require(length == 0 and offset == end, f"End tag does not terminate {timeline}")
            break
    require(tags and tags[-1]["code"] == 0, f"No End tag in {timeline}")
    return tags


def walk_tags(tags):
    for tag in tags:
        yield tag
        yield from walk_tags(tag["children"])


def symbols_from_tags(tags, data):
    result = {}
    for tag in walk_tags(tags):
        if tag["code"] not in (56, 76):
            continue
        payload = data[tag["payload_offset"]:tag["payload_offset"] + tag["length"]]
        offset = 2
        for _ in range(u16(payload, 0)):
            ident = u16(payload, offset)
            offset += 2
            stop = payload.find(b"\0", offset)
            require(stop >= 0, "Unterminated SymbolClass name")
            name = payload[offset:stop].decode("utf-8")
            require(name not in result, f"Duplicate SymbolClass name {name}")
            result[name] = ident
            offset = stop + 1
        require(offset == len(payload), "SymbolClass trailing bytes")
    return result


def normalize_script_path(path, suffix):
    value = path.as_posix()
    require(value.endswith(suffix), f"Unexpected script suffix {path}")
    return value[:-len(suffix)].replace("/", ".").replace("§", "")


def xml_inspect(path, raw_tags, swf):
    tree = ET.parse(path).getroot()
    require(int(tree.get("frameCount")) == swf["frame_count"], "XML root frame count mismatch")
    require(int(tree.get("version")) == swf["version"], "XML SWF version mismatch")
    require(float(tree.get("frameRate")) == swf["frame_rate"], "XML frame rate mismatch")
    scripts, abc_counts = [], []

    def check_tags(items, tags, timeline):
        non_end = [tag for tag in tags if tag["code"] != 0]
        require(len(items) == len(non_end), f"XML tag count differs in {timeline}")
        for item, tag in zip(items, non_end):
            expected = TAG_NAMES.get(tag["code"], "UnknownTag")
            require(item.get("type") == expected,
                    f"XML tag differs at {timeline}/{tag['index']}: {item.get('type')} != {expected}")
            if expected == "UnknownTag":
                require(int(item.get("tagId")) == tag["code"], "Unknown tag ID differs")
                require(bytes.fromhex(item.get("unknownData", "")) ==
                        swf["data"][tag["payload_offset"]:tag["payload_offset"] + tag["length"]],
                        "Unknown tag bytes differ")
            if "category" in tag:
                key = XML_ID_KEYS[tag["category"]]
                require(int(item.get(key)) == tag["id"], f"XML character ID differs: {tag['id']}")
            if tag["code"] == 39:
                require(int(item.get("frameCount")) == tag["frame_count"], "XML sprite frame mismatch")
                check_tags(list(item.find("subTags")), tag["children"], f"sprite-{tag['id']}")
            if tag["code"] in (72, 82):
                abc = item.find("abc")
                constants = abc.find("constants")
                strings = list(constants.find("constant_string"))
                namespaces = list(constants.find("constant_namespace"))
                multinames = list(constants.find("constant_multiname"))
                info = list(abc.find("script_info"))
                count = {"scripts": len(info), "classes": len(abc.find("class_info")),
                         "method_bodies": len(abc.find("bodies"))}
                abc_counts.append(count)
                for script_index, script in enumerate(info):
                    names = []
                    for trait in script.findall("traits/traits/item"):
                        mn = multinames[int(trait.get("name_index"))]
                        require(mn.get("kind") in ("7", "13"), "Unsupported script QName")
                        name = strings[int(mn.get("name_index"))].text or ""
                        ns = namespaces[int(mn.get("namespace_index"))]
                        prefix = strings[int(ns.get("name_index"))].text or ""
                        names.append(f"{prefix}.{name}" if prefix else name)
                    require(len(names) == 1, "Expected one script pack per script; inspect multi-trait pack")
                    scripts.append({"abc": len(abc_counts) - 1, "index": script_index, "name": names[0]})

    check_tags(list(tree.find("tags")), raw_tags, "root")
    require(len({s["name"] for s in scripts}) == len(scripts), "Duplicate XML script names")
    return scripts, abc_counts


def raw_extract(root, swf, tags, write):
    """Write/compare exact record bytes including headers; preserve unknown tags."""
    data = swf["data"]
    files, entries, abc_entries = [], [], []

    def preserve(relative, value):
        path = root / relative
        if write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(value)
        else:
            require(path.is_file() and path.read_bytes() == value, f"Raw bytes missing/different: {relative}")
        files.append(relative)
        return {"path": relative, "bytes": len(value), "sha256": sha256(value)}

    preserve("raw/original.uncompressed.swf", data)
    preserve("raw/movie-header.bin", data[:swf["tags_offset"]])
    for tag in walk_tags(tags):
        base = f"raw/tags/{tag['timeline']}/{tag['index']:04d}-tag-{tag['code']}"
        end = tag["payload_offset"] + tag["length"]
        record = preserve(base + ".record.bin", data[tag["offset"]:end])
        payload = preserve(base + ".payload.bin", data[tag["payload_offset"]:end])
        entry = {key: value for key, value in tag.items() if key != "children"}
        entry["record"] = record
        entry["payload"] = payload
        entries.append(entry)
        if tag["code"] in (72, 82):
            abc_start = tag["payload_offset"]
            flags, name = None, None
            if tag["code"] == 82:
                require(tag["length"] >= 5, "Truncated DoABC2")
                flags = struct.unpack_from("<I", data, abc_start)[0]
                name_end = data.find(b"\0", abc_start + 4, end)
                require(name_end >= 0, "DoABC2 name is unterminated")
                name = data[abc_start + 4:name_end].decode("utf-8")
                abc_start = name_end + 1
            abc = preserve(f"raw/abc/{len(abc_entries):02d}.abc", data[abc_start:end])
            abc_entries.append({**abc, "tag_offset": tag["offset"], "flags": flags, "name": name})
    inventory = {"tags": entries, "abc": abc_entries,
                 "uncompressed_sha256": sha256(data), "uncompressed_bytes": len(data)}
    if write:
        json_write(root / "raw/INDEX.json", inventory)
    else:
        require(json.loads((root / "raw/INDEX.json").read_text()) == inventory, "Raw tag INDEX differs")
    return inventory


def exported_scripts(root, folder, suffix):
    result = {}
    for path in sorted((root / folder).rglob(f"*{suffix}")):
        name = normalize_script_path(path.relative_to(root / folder), suffix)
        require(name not in result, f"Duplicate exported script name: {name}")
        result[name] = path.relative_to(root).as_posix()
    return result


def files_by_id(root, folder, suffixes):
    result = collections.defaultdict(list)
    for path in sorted((root / folder).glob("*")):
        match = re.match(r"^(\d+)(?:[_\.]|$)", path.name)
        if path.is_file() and match and path.suffix.lower() in suffixes:
            result[int(match.group(1))].append(path.relative_to(root).as_posix())
    return result


def numbered_directory(root, folder, prefix, ident):
    candidates = [path for path in (root / folder).glob(f"{prefix}_{ident}*")
                  if path.is_dir() and re.match(rf"^{prefix}_{ident}(?:_|$)", path.name)]
    require(len(candidates) == 1, f"Expected one {folder} export directory for ID{ident}, got {len(candidates)}")
    return candidates[0]


def expected_file(root, path):
    require(path.is_file() and path.stat().st_size > 0, f"Missing/empty export: {path.relative_to(root)}")
    return path.relative_to(root).as_posix()


def embed_coverage(root, script_files):
    ledger, parsed_swfs = [], {}
    for script in script_files.values():
        text = (root / script).read_text(encoding="utf-8")
        for annotation in re.findall(r"\[Embed\((.*?)\)\]", text, re.S):
            attributes = dict(re.findall(r'(\w+)\s*=\s*"([^\"]*)"', annotation))
            require("source" in attributes, f"Embed annotation has no source: {script}")
            source = attributes["source"]
            relative = PurePosixPath(source.lstrip("/"))
            require(".." not in relative.parts, f"Unsafe Embed source: {source}")
            target = root / "export/scripts" / relative
            entry = {"script": script, "source": source, "file": expected_file(root, target)}
            if "symbol" in attributes:
                if target not in parsed_swfs:
                    swf = swf_read(target)
                    tags = parse_tags(swf["data"], swf["tags_offset"], len(swf["data"]))
                    symbols = symbols_from_tags(tags, swf["data"])
                    definitions = {tag["id"] for tag in walk_tags(tags) if "id" in tag}
                    parsed_swfs[target] = (symbols, definitions)
                symbol = attributes["symbol"]
                symbols, definitions = parsed_swfs[target]
                require(symbol in symbols, f"Unresolved Embed symbol {symbol} in {source}")
                require(symbols[symbol] in definitions,
                        f"Embed symbol {symbol} has no character definition in {source}")
                entry.update({"symbol": symbol, "character_id": symbols[symbol]})
            ledger.append(entry)
    return ledger


def analyze(root, write_raw=False):
    swf = swf_read(root / "original.swf")
    require(sha256(swf["original"]) == EXPECTED_SOURCE_SHA256,
            "Original SWF differs from the user-confirmed frozen90302 release")
    require(file_digest(root / "original.xml") == EXPECTED_SOURCE_XML_SHA256,
            "Original XML differs from the complete frozen90302 recovery")
    tags = parse_tags(swf["data"], swf["tags_offset"], len(swf["data"]))
    scripts, counts = xml_inspect(root / "original.xml", tags, swf)
    raw = raw_extract(root, swf, tags, write_raw)
    definitions = collections.defaultdict(dict)
    for tag in walk_tags(tags):
        if "category" in tag:
            require(tag["id"] not in definitions[tag["category"]], f"Duplicate character ID{tag['id']}")
            definitions[tag["category"]][tag["id"]] = tag
    character_ids = [ident for items in definitions.values() for ident in items]
    require(len(character_ids) == len(set(character_ids)), "Duplicate IDs across definition categories")
    as_files = exported_scripts(root, "export/scripts", ".as")
    pcode_files = exported_scripts(root, "pcodehex/scripts", ".pcode")
    script_names = {script["name"] for script in scripts}
    require(set(as_files) == script_names,
            f"AS script coverage mismatch: missing={sorted(script_names-set(as_files))}, extra={sorted(set(as_files)-script_names)}")
    require(set(pcode_files) == script_names,
            f"Pcode script coverage mismatch: missing={sorted(script_names-set(pcode_files))}, extra={sorted(set(pcode_files)-script_names)}")
    for script in scripts:
        script.update({"as": expected_file(root, root / as_files[script["name"]]),
                       "pcodehex": expected_file(root, root / pcode_files[script["name"]])})
    ledger = {}
    formats = {
        "shapes": {".svg"}, "morphshapes": {".svg"}, "images": {".png", ".gif", ".jpg", ".jpeg"},
        "fonts": {".ttf"}, "texts": {".txt"}, "sounds": {".mp3", ".wav", ".flv"},
    }
    for kind, suffixes in formats.items():
        outputs = files_by_id(root, f"export/{kind}", suffixes)
        expected_ids = set(definitions[kind])
        require(set(outputs) == expected_ids,
                f"{kind} ID coverage differs: missing={sorted(expected_ids-set(outputs))}, extra={sorted(set(outputs)-expected_ids)}")
        ledger[kind] = [{"id": ident, "tag_code": definitions[kind][ident]["code"],
                         "outputs": [expected_file(root, root / path) for path in outputs[ident]]}
                        for ident in sorted(expected_ids)]
    root_frames = [expected_file(root, root / f"export/frames/{frame}.svg")
                   for frame in range(1, swf["frame_count"] + 1)]
    observed_root = sum(tag["code"] == 1 for tag in tags)
    require(observed_root == swf["frame_count"], "SWF root declared/observed frames differ")
    require(set((root / "export/frames").glob("*.svg")) == {root / path for path in root_frames},
            "Unexpected root frame export")
    ledger["sprites"] = []
    for ident, tag in sorted(definitions["sprites"].items()):
        observed = sum(child["code"] == 1 for child in tag["children"])
        require(observed == tag["frame_count"], f"Sprite{ident} declared/observed frames differ")
        directory = numbered_directory(root, "export/sprites", "DefineSprite", ident)
        outputs = [expected_file(root, directory / f"{frame}.svg") for frame in range(1, observed + 1)]
        require(set(directory.glob("*.svg")) == {root / path for path in outputs}, f"Unexpected sprite{ident} frame")
        ledger["sprites"].append({"id": ident, "frames": observed, "outputs": outputs})
    ledger["buttons"] = []
    for ident, tag in sorted(definitions["buttons"].items()):
        directory = numbered_directory(root, "export/buttons", "DefineButton2" if tag["code"] == 34 else "DefineButton", ident)
        states = ["1_up", "2_over", "3_down", "4_hittest"]
        outputs = {state: expected_file(root, directory / f"{state}.svg") for state in states}
        require(set(directory.glob("*.svg")) == {root / path for path in outputs.values()},
                f"Unexpected button{ident} state")
        ledger["buttons"].append({"id": ident, "states": outputs})
    require(set(definitions) == set(CATEGORY_CODES), "Source category set differs from expected archive")
    xfl_documents = sorted((root / "reconstructed-xfl").rglob("DOMDocument.xml"))
    require(len(xfl_documents) == 1, "Expected one reconstructed XFL DOMDocument.xml")
    xfl_document = expected_file(root, xfl_documents[0])
    embeds = embed_coverage(root, as_files)
    symbols = symbols_from_tags(tags, swf["data"])
    effects = ["fx.BigSpark", "fx.ParticleBirdie"]
    sliders = sorted(name for name in symbols if name.startswith("sliders.Slider"))
    require(len(sliders) == 8, "Expected all8 character sliders")
    for name in effects + sliders:
        require(name in script_names and name in symbols, f"Missing source feature {name}")
        require(symbols[name] in definitions["sprites"], f"Feature symbol not retained: {name}")
    summary = {kind: len(entries) for kind, entries in ledger.items()}
    summary.update({"as_scripts": len(scripts), "pcodehex_scripts": len(pcode_files),
                    "abc": len(raw["abc"]), "method_bodies": sum(c["method_bodies"] for c in counts),
                    "root_frames": observed_root,
                    "sprite_frames": sum(entry["frames"] for entry in ledger["sprites"]),
                    "all_timeline_frames": observed_root + sum(entry["frames"] for entry in ledger["sprites"]),
                    "button_states": sum(len(entry["states"]) for entry in ledger["buttons"]),
                    "embed_annotations": len(embeds), "raw_tags": len(raw["tags"])})
    unknown = [{"code": tag["code"], "payload": tag["payload"]}
               for tag in raw["tags"] if tag["code"] not in TAG_NAMES]
    external = []
    for path in sorted((root / "external").glob("*.swf")):
        dependency = swf_read(path)
        dependency_tags = parse_tags(dependency["data"], dependency["tags_offset"], len(dependency["data"]))
        external.append({"path": path.relative_to(root).as_posix(), "bytes": len(dependency["original"]),
                         "sha256": sha256(dependency["original"]),
                         "declared_uncompressed_bytes": dependency["declared_length"],
                         "raw_tags": sum(1 for _ in walk_tags(dependency_tags)),
                         "abc": sum(tag["code"] in (72, 82) for tag in walk_tags(dependency_tags))})
    return {
        "schema": SCHEMA, "source": {"path": "original.swf", "bytes": len(swf["original"]),
        "sha256": sha256(swf["original"]), "compression": swf["signature"],
        "version": swf["version"], "declared_uncompressed_bytes": swf["declared_length"],
        "uncompressed_sha256": raw["uncompressed_sha256"]},
        "summary": summary, "scripts": scripts, "abc": [{**entry, **count} for entry, count in zip(raw["abc"], counts)],
        "resources": ledger, "root_frames": root_frames, "symbols": dict(sorted(symbols.items())),
        "embeds": embeds, "features": {name: symbols[name] for name in effects + sliders},
        "unknown_tags": unknown, "conversion_exceptions": [], "reconstructed_xfl": xfl_document,
        "external_swf_headers": external,
        "representation_limits": [
            "Recovered AS, pcode, SVG, text, font, sound and reconstructed XFL are conversions, not the author's editable project.",
            "Original SWF, full XML, all raw tag records and ABC remain the source for dynamic behavior, font metadata, tweens, masks and timeline dependencies.",
            "Export coverage checks IDs, frame/state presence and bytes; it does not assert rendered/runtime parity.",
        ],
    }


def included_files(root):
    files = []
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if relative.parts[0].startswith("profile") or "__pycache__" in relative.parts:
            continue
        require(not path.is_symlink(), f"Archive input has a symlink: {relative}")
        if path.is_file():
            files.append(path)
    return files


def manifest_files(root, paths):
    return [{"path": path.relative_to(root).as_posix(), "bytes": path.stat().st_size,
             "sha256": file_digest(path)} for path in paths]


def create_package(root, archive, manifest):
    root = root.resolve()
    require(not archive.resolve().is_relative_to(root), "Archive output must be outside staging")
    require(not manifest.resolve().is_relative_to(root), "Manifest output must be outside staging")
    coverage = analyze(root, write_raw=True)
    json_write(root / "COVERAGE.json", coverage)
    paths = included_files(root)
    entries = manifest_files(root, paths)
    if archive.name.endswith(".tar.xz"):
        compression = "deterministic-tar-xz-lzma2-dict64MiB"
    elif archive.name.endswith(".tar.gz"):
        compression = "deterministic-tar-gzip-mtime0"
    else:
        raise ArchiveError("Archive output must end with .tar.xz or .tar.gz")
    archive.parent.mkdir(parents=True, exist_ok=True)
    temporary = archive.with_name(archive.name + ".tmp")
    with temporary.open("wb") as output:
        compressor = (lzma.LZMAFile(output, mode="wb", format=lzma.FORMAT_XZ,
                      filters=[{"id": lzma.FILTER_LZMA2, "preset": 6, "dict_size": 64 * 1024 * 1024}])
                      if archive.name.endswith(".tar.xz") else
                      gzip.GzipFile(filename="", mode="wb", fileobj=output, mtime=0, compresslevel=6))
        with compressor as compressed:
            with tarfile.open(fileobj=compressed, mode="w", format=tarfile.PAX_FORMAT) as bundle:
                for path, entry in zip(paths, entries):
                    info = tarfile.TarInfo(entry["path"])
                    info.size = entry["bytes"]
                    info.mtime = 0
                    info.mode = 0o644
                    info.uid = info.gid = 0
                    info.uname = info.gname = ""
                    with path.open("rb") as stream:
                        bundle.addfile(info, stream)
    temporary.replace(archive)
    result = {"schema": SCHEMA, "archive": {"filename": archive.name, "bytes": archive.stat().st_size,
              "sha256": file_digest(archive), "format": compression},
              "file_count": len(entries), "unpacked_bytes": sum(entry["bytes"] for entry in entries),
              "files": entries, "coverage": coverage,
              "exclusions": ["top-level profile* (isolated Java preferences/cache)", "__pycache__"]}
    json_write(manifest, result)
    return result


def verify_package(archive, manifest):
    result = json.loads(manifest.read_text(encoding="utf-8"))
    require(result.get("schema") == SCHEMA, "Unsupported archive manifest schema")
    metadata = result["archive"]
    require(archive.stat().st_size == metadata["bytes"], "Archive byte count differs")
    require(file_digest(archive) == metadata["sha256"], "Archive SHA256 differs")
    expected = {entry["path"]: entry for entry in result["files"]}
    require(len(expected) == len(result["files"]) == result["file_count"], "Manifest has duplicate/count mismatch")
    require(sum(entry["bytes"] for entry in expected.values()) == result["unpacked_bytes"], "Manifest unpacked bytes differ")
    with tempfile.TemporaryDirectory(prefix="flash-archive-verify-") as temporary:
        root = Path(temporary)
        seen = set()
        with tarfile.open(archive, "r:*") as bundle:
            for member in bundle:
                relative = PurePosixPath(member.name)
                require(not relative.is_absolute() and ".." not in relative.parts and
                        relative.as_posix() == member.name and member.isfile(), f"Unsafe archive entry: {member.name}")
                require(member.name in expected and member.name not in seen, f"Unexpected/duplicate archive entry: {member.name}")
                entry = expected[member.name]
                require(member.size == entry["bytes"], f"File byte count differs: {member.name}")
                require(member.uid == member.gid == member.mtime == 0 and member.mode == 0o644,
                        f"Non-deterministic metadata: {member.name}")
                target = root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                digest = hashlib.sha256()
                with bundle.extractfile(member) as source, target.open("wb") as output:
                    for chunk in iter(lambda: source.read(1024 * 1024), b""):
                        digest.update(chunk)
                        output.write(chunk)
                require(digest.hexdigest() == entry["sha256"], f"File SHA256 differs: {member.name}")
                seen.add(member.name)
        require(seen == set(expected), f"Archive files missing: {sorted(set(expected)-seen)}")
        coverage = analyze(root, write_raw=False)
        require(coverage == result["coverage"], "Manifest coverage differs from independently parsed source")
        require(json.loads((root / "COVERAGE.json").read_text()) == coverage, "Bundled coverage differs")
    return {"verified": True, "files": len(expected), "archive_sha256": metadata["sha256"],
            "summary": result["coverage"]["summary"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    inspect = commands.add_parser("inspect", help="Inspect IDs/scripts/frames and write lossless raw records + coverage")
    inspect.add_argument("--root", required=True, type=Path, help="Staging root with documented export layout")
    package = commands.add_parser("package", help="Inspect and create deterministic complete archive + file manifest")
    package.add_argument("--root", required=True, type=Path)
    package.add_argument("--archive", required=True, type=Path)
    package.add_argument("--manifest", required=True, type=Path)
    verify = commands.add_parser("verify", help="Verify archive/file hashes, raw records, IDs/scripts/frames and Embed symbols")
    verify.add_argument("--archive", required=True, type=Path)
    verify.add_argument("--manifest", required=True, type=Path)
    args = parser.parse_args()
    try:
        if args.command == "inspect":
            coverage = analyze(args.root, write_raw=True)
            json_write(args.root / "COVERAGE.json", coverage)
            value = {"coverage": str(args.root / "COVERAGE.json"), "summary": coverage["summary"]}
        elif args.command == "package":
            result = create_package(args.root, args.archive, args.manifest)
            value = {"archive": str(args.archive), "manifest": str(args.manifest),
                     "files": result["file_count"], "archive_bytes": result["archive"]["bytes"],
                     "summary": result["coverage"]["summary"]}
        else:
            value = verify_package(args.archive, args.manifest)
        print(json.dumps(value, ensure_ascii=False, indent=2))
    except (ArchiveError, OSError, ValueError, ET.ParseError, zlib.error, lzma.LZMAError, tarfile.TarError) as error:
        print(f"Archive verification failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
