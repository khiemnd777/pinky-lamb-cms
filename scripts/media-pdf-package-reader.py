"""Bounded Conda v2 envelope and already-decoded TAR validation. No extraction/decoder.

Format sources: conda-build package-spec.rst; conda-package-handling conda_fmt.py,
as reviewed in B v3. An envelope result is not decompression or closure proof.
"""
import hashlib
import io
import json
import os
import posixpath
import stat
import sys
import tarfile
import uuid
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT_SHA = "78bbef256ac0714bfee2e4020286d4809211627b78efa7392743b1b27bb56f54"
TUPLE_SHA = "e970d5dd6fb9c1dc55ed7bfbd99191f7a024c46c52769dc2aa4674ccfd356c8d"
ARCHIVE_MAX = 64 * 1024**2
STREAM_MAX = 32 * 1024**2
SET_MAX = 256 * 1024**2
JSON_MAX = 2 * 1024**2
ENTRY_MAX = 10000


def refuse(code):
    raise ValueError(code)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def strict_json(data):
    if len(data) > JSON_MAX:
        refuse("JSON_LIMIT")

    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                refuse("JSON_DUPLICATE")
            result[key] = value
        return result

    return json.loads(data.decode("utf-8"), object_pairs_hook=pairs,
                      parse_constant=lambda _: refuse("JSON_NONFINITE"))


def path_name(name, directory=False):
    if not isinstance(name, str) or len(name) > 1024 or any(ord(c) < 32 for c in name):
        refuse("PATH_INVALID")
    value = name[:-1] if directory and name.endswith("/") else name
    if not value or value.startswith("/") or "\\" in value or ":" in value:
        refuse("PATH_ESCAPE")
    if any(part in ("", ".", "..") for part in value.split("/")):
        refuse("PATH_ESCAPE")
    return value


def identity(row):
    stem = row["filename"].removesuffix(".conda")
    name, version, build = stem.rsplit("-", 2)
    if build != row["build"] or row["subdir"] != "osx-arm64":
        refuse("IDENTITY")
    return {"name": name, "version": version, "build": build, "subdir": "osx-arm64"}


def read_regular(path, maximum, private_root=None):
    path = Path(path)
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current /= part
        ancestor = current.lstat()
        if stat.S_ISLNK(ancestor.st_mode):
            refuse("PATH_LINK")
        if current != path and not stat.S_ISDIR(ancestor.st_mode):
            refuse("ANCESTOR_TYPE")
        if private_root is not None and (current == private_root or private_root in current.parents):
            if ancestor.st_uid != os.getuid() or ancestor.st_mode & 0o077:
                refuse("PRIVATE_CUSTODY")
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_size > maximum:
        refuse("FILE_CUSTODY")
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        first = os.fstat(fd)
        signature = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_mode, s.st_uid, s.st_nlink)
        if signature(first) != signature(before):
            refuse("FILE_CHANGED")
        chunks = []
        total = 0
        while True:
            chunk = os.read(fd, min(1024 * 1024, maximum + 1 - total))
            if not chunk:
                break
            total += len(chunk)
            if total > maximum:
                refuse("FILE_LIMIT")
            chunks.append(chunk)
        if signature(first) != signature(os.fstat(fd)) or total != first.st_size:
            refuse("FILE_CHANGED")
        return b"".join(chunks)
    finally:
        os.close(fd)


def frozen_inputs():
    raw = read_regular(ROOT / "contracts/media-pdf-recovery-inputs.json", JSON_MAX)
    if digest(raw) != INPUT_SHA:
        refuse("INPUT_PIN")
    value = strict_json(raw)
    rows = value["rows"]
    encoded = json.dumps(rows, sort_keys=True, separators=(",", ":")).encode()
    if len(rows) != 12 or digest(encoded) != TUPLE_SHA or sum(r["bytes"] for r in rows) != 4069885:
        refuse("INPUT_TUPLE")
    return value


def validate_outer_zip(data, row):
    """Verify pinned archive and return compressed streams only; never decode zstd."""
    identity(row)
    if len(data) > ARCHIVE_MAX or len(data) != row["bytes"] or digest(data) != row["sha256"]:
        refuse("ARCHIVE_PIN")
    stem = row["filename"][:-6]
    expected = {"metadata.json", "info-" + stem + ".tar.zst", "pkg-" + stem + ".tar.zst"}
    if not data.startswith(b"PK\x03\x04") or data[-22:-18] != b"PK\x05\x06":
        refuse("ZIP_STRUCTURE")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        members = archive.infolist()
        if len(members) != 3 or len({m.filename for m in members}) != 3 or {m.filename for m in members} != expected:
            refuse("ZIP_MEMBERS")
        output = {}
        for member in members:
            path_name(member.filename)
            mode = member.external_attr >> 16
            if member.flag_bits & 1 or member.compress_type != zipfile.ZIP_STORED or member.is_dir():
                refuse("ZIP_TYPE")
            if stat.S_IFMT(mode) not in (0, stat.S_IFREG) or member.file_size > ARCHIVE_MAX:
                refuse("ZIP_TYPE_LIMIT")
            body = archive.read(member)  # CRC/local-name validation, bounded stored members.
            if len(body) != member.file_size:
                refuse("ZIP_SIZE")
            output[member.filename] = body
        meta = strict_json(output.pop("metadata.json"))
        if meta != {"conda_pkg_format_version": 2}:
            refuse("ZIP_VERSION")
        if any(not body.startswith(b"\x28\xb5\x2f\xfd") for body in output.values()):
            refuse("ZSTD_SIGNATURE")
        return output


def decoded_tar(data):
    """Only already-decoded bytes. No tar extraction or subprocess anywhere."""
    if len(data) > STREAM_MAX or len(data) % 512 or not data:
        refuse("TAR_STREAM_LIMIT")
    records = {}
    end = 0
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:") as archive:
        for member in archive:
            if len(records) >= ENTRY_MAX:
                refuse("TAR_ENTRY_LIMIT")
            name = path_name(member.name, member.isdir())
            if name in records:
                refuse("TAR_DUPLICATE")
            if member.sparse is not None or any(k.startswith("GNU.sparse") for k in member.pax_headers):
                refuse("TAR_SPARSE")
            if set(member.pax_headers) - {"path", "linkpath", "mtime", "atime", "ctime"}:
                refuse("TAR_PAX")
            if member.size < 0 or member.size > STREAM_MAX or member.offset_data + member.size > len(data):
                refuse("TAR_SIZE")
            if member.islnk() or member.isdev() or member.isfifo():
                refuse("TAR_TYPE")
            if member.mode & 0o6000:
                refuse("TAR_MODE")
            if member.isdir():
                if member.size:
                    refuse("TAR_DIRECTORY_SIZE")
                records[name] = {"type": "directory"}
            elif member.issym():
                if member.size:
                    refuse("TAR_LINK_SIZE")
                records[name] = {"type": "softlink", "target": member.linkname}
            elif member.isreg():
                body = archive.extractfile(member).read(member.size + 1)
                if len(body) != member.size:
                    refuse("TAR_TRUNCATED")
                records[name] = {"type": "hardlink", "bytes": body}  # Conda metadata term, regular TAR.
            else:
                refuse("TAR_TYPE")
            end = member.offset_data + ((member.size + 511) // 512) * 512
    if len(data) - end < 1024 or any(data[end:]):
        refuse("TAR_TRAILING_OR_EOF")
    return records


def regular_alias(records, name):
    visited = set()
    current = name
    while True:
        if current in visited or len(visited) >= 64:
            refuse("ALIAS_CYCLE")
        visited.add(current)
        value = records.get(current)
        if not value or value["type"] == "directory":
            refuse("ALIAS_MISSING")
        if value["type"] == "hardlink":
            return current, value["bytes"]
        target = value["target"]
        if not isinstance(target, str) or target.startswith("/") or "\\" in target or ":" in target or any(ord(c) < 32 for c in target):
            refuse("ALIAS_ESCAPE")
        try:
            current = path_name(posixpath.normpath(posixpath.join(posixpath.dirname(current), target)))
        except ValueError as error:
            if error.args == ("PATH_ESCAPE",):
                raise ValueError("ALIAS_ESCAPE") from error
            raise


def path_rows(value):
    if value.get("paths_version") != 1 or not isinstance(value.get("paths"), list):
        refuse("PATHS_VERSION")
    result = {}
    for row in value["paths"]:
        name = path_name(row["_path"])
        if name in result or row.get("path_type") not in ("hardlink", "softlink"):
            refuse("PATHS_DUPLICATE_TYPE")
        result[name] = row
    if not result or len(result) > ENTRY_MAX:
        refuse("PATHS_LIMIT")
    return result


def validate_package(row, metadata_bytes, proof, info_bytes, pkg_bytes):
    if proof["filename"] != row["filename"] or len(metadata_bytes) != proof["bytes"] or digest(metadata_bytes) != proof["sha256"]:
        refuse("PROVENANCE_PIN")
    metadata = strict_json(metadata_bytes)
    wanted = identity(row)
    if any(metadata.get(k) != v for k, v in wanted.items()) or metadata.get("url") != row["url"] or metadata.get("sha256") != row["sha256"] or metadata.get("size") != row["bytes"] or metadata.get("license") != row["license"]:
        refuse("PROVENANCE_IDENTITY")
    info, payload = decoded_tar(info_bytes), decoded_tar(pkg_bytes)
    if any(not p.startswith("info/") and p != "info" for p in info):
        refuse("INFO_NAMESPACE")
    if any(p.startswith("info/") for p in payload):
        refuse("PAYLOAD_NAMESPACE")
    def info_file(name):
        value = info.get(name)
        if not value or value["type"] != "hardlink":
            refuse("INFO_REQUIRED")
        return value["bytes"]
    index = strict_json(info_file("info/index.json"))
    if any(index.get(k) != v for k, v in wanted.items()):
        refuse("INDEX_IDENTITY")
    declared = path_rows(strict_json(info_file("info/paths.json")))
    frozen = path_rows(metadata["paths_data"])
    if set(declared) != set(frozen) or set(declared) != {p for p, v in payload.items() if v["type"] != "directory"}:
        refuse("PAYLOAD_SET")
    for name, value in payload.items():
        if value["type"] == "directory" and not any(p.startswith(name + "/") for p in declared):
            refuse("PAYLOAD_ORPHAN_DIRECTORY")
        for parent in list(Path(name).parents)[:-1]:
            ancestor = payload.get(str(parent))
            if ancestor and ancestor["type"] != "directory":
                refuse("PAYLOAD_ANCESTOR_TYPE")
    copies, records = {}, []
    for name, entry in declared.items():
        if name.endswith(("-post-link.sh", "-pre-link.sh", "-pre-unlink.sh")):
            refuse("INSTALL_SCRIPT")
        expected = frozen[name]
        for key in ("path_type", "sha256", "size_in_bytes"):
            if entry.get(key) != expected.get(key):
                refuse("PATHS_PROVENANCE")
        if payload[name]["type"] != entry["path_type"]:
            refuse("PAYLOAD_TYPE")
        target, body = regular_alias(payload, name)
        target_expected = frozen.get(target)
        if not target_expected or target_expected["path_type"] != "hardlink" or target_expected.get("sha256") != digest(body) or target_expected.get("size_in_bytes") != len(body):
            refuse("PAYLOAD_DIGEST")
        # Conda softlink metadata may omit raw SHA. Anchor to the final regular
        # target's ORIGINAL SHA, never sha256_in_prefix or a managed dylib read.
        if entry.get("sha256") is not None and entry["sha256"] != digest(body):
            refuse("PAYLOAD_DIGEST")
        if entry.get("size_in_bytes") != len(body):
            refuse("PAYLOAD_DIGEST")
        copies[name] = body
        records.append({"path": name, "type": entry["path_type"], "resolvedTo": target, "bytes": len(body), "sha256": digest(body)})
    notices = [p for p, v in info.items() if p.startswith("info/licenses/") and v["type"] == "hardlink"]
    if not notices:
        refuse("LICENSE_NOTICE_MISSING")
    for p in notices:
        if not info[p]["bytes"].decode("utf-8").strip() or b"\0" in info[p]["bytes"]:
            refuse("LICENSE_NOTICE_INVALID")
    return {"identity": wanted, "payload": records, "regularCopies": copies,
            "rawInfo": {p: v["bytes"] for p, v in info.items() if v["type"] == "hardlink"},
            "noticePaths": notices, "declaredLicense": row["license"],
            "publisherSignature": "NOT_VERIFIED", "licenseLegalAssessment": "UNKNOWN",
            "decodedProvenance": "BUFFER_VALIDATION_ONLY_PINNED_DECODER_LINEAGE_STILL_REQUIRED"}


def validate_package_set(packages):
    if sum(len(p[3]) + len(p[4]) for p in packages) > SET_MAX:
        refuse("DECODED_SET_LIMIT")
    if len({p[0]["filename"] for p in packages}) != len(packages):
        refuse("PACKAGE_DUPLICATE")
    return [validate_package(*p) for p in packages]


def main():
    if len(sys.argv) != 4 or sys.argv[1] != "validate-owned-zip":
        refuse("CLI_ARGUMENTS")
    run_id, filename = sys.argv[2:]
    if str(uuid.UUID(run_id)) != run_id:
        refuse("RUN_ID")
    selected = next((r for r in frozen_inputs()["rows"] if r["filename"] == filename), None)
    if selected is None:
        refuse("PACKAGE_SELECTOR")
    path = ROOT / ".local/test-outputs/m3/tool-recovery-01/b-v3/B1a" / run_id / "archives" / filename
    data = read_regular(path, ARCHIVE_MAX, path.parent.parent)
    components = validate_outer_zip(data, selected)
    print(json.dumps({"archive": filename, "sha256": digest(data), "components": {p: {"bytes": len(b), "sha256": digest(b)} for p, b in components.items()}, "decoded": False}))


if __name__ == "__main__":
    main()
