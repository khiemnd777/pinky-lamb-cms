"""Prepared synthetic in-memory unit cases; execution requires separate pool admission."""
import copy
import hashlib
import importlib.util
import io
import json
import tarfile
import unittest
import zipfile
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("pdf_reader", Path(__file__).resolve().parent.parent / "scripts/media-pdf-package-reader.py")
READER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(READER)


def encoded(value):
    return json.dumps(value, sort_keys=True).encode()


def tar_bytes(entries):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for name, kind, value in entries:
            member = tarfile.TarInfo(name)
            member.mode = 0o644
            member.type = kind
            if kind == tarfile.REGTYPE:
                member.size = len(value)
                archive.addfile(member, io.BytesIO(value))
            else:
                member.linkname = value
                archive.addfile(member)
    return stream.getvalue()


def fixture(alias=True, notice=True):
    row = {"filename": "sample-1.0-build_0.conda", "build": "build_0", "subdir": "osx-arm64", "bytes": 42,
           "url": "https://conda.anaconda.org/conda-forge/osx-arm64/sample-1.0-build_0.conda", "sha256": "0" * 64, "license": "MIT"}
    body = b"owned synthetic library bytes"
    paths = [{"_path": "lib/libsample.1.dylib", "path_type": "hardlink", "size_in_bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()}]
    entries = [("lib/libsample.1.dylib", tarfile.REGTYPE, body)]
    if alias:
        paths.append({"_path": "lib/libsample.dylib", "path_type": "softlink", "size_in_bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()})
        entries.append(("lib/libsample.dylib", tarfile.SYMTYPE, "libsample.1.dylib"))
    path_data = {"paths_version": 1, "paths": paths}
    index = {"name": "sample", "version": "1.0", "build": "build_0", "subdir": "osx-arm64"}
    metadata = {**index, "url": row["url"], "sha256": row["sha256"], "size": 42, "license": "MIT", "paths_data": copy.deepcopy(path_data)}
    raw = encoded(metadata)
    proof = {"filename": row["filename"], "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
    info = [("info/index.json", tarfile.REGTYPE, encoded(index)), ("info/paths.json", tarfile.REGTYPE, encoded(path_data)),
            ("info/recipe/build.sh", tarfile.REGTYPE, b"retained recipe only; never executed")]
    if notice:
        info.append(("info/licenses/LICENSE", tarfile.REGTYPE, b"Synthetic permissive test notice"))
    return row, raw, proof, info, entries, body


class PackageReaderTests(unittest.TestCase):
    def assert_refused(self, code, function, *args):
        with self.assertRaisesRegex(ValueError, code):
            function(*args)

    def test_frozen_closed_twelve_tuple(self):
        data = READER.frozen_inputs()
        self.assertEqual(len(data["rows"]), 12)
        self.assertEqual(sum(r["bytes"] for r in data["rows"]), 4069885)
        self.assertEqual(data["tupleSha256"], READER.TUPLE_SHA)

    def test_positive_regular_and_contained_alias_without_materialization(self):
        row, raw, proof, info, payload, body = fixture()
        result = READER.validate_package(row, raw, proof, tar_bytes(info), tar_bytes(payload))
        self.assertEqual(result["regularCopies"], {"lib/libsample.1.dylib": body, "lib/libsample.dylib": body})
        self.assertEqual(result["payload"][1]["resolvedTo"], "lib/libsample.1.dylib")
        self.assertEqual(result["licenseLegalAssessment"], "UNKNOWN")
        self.assertEqual(result["publisherSignature"], "NOT_VERIFIED")
        self.assertIn("info/recipe/build.sh", result["rawInfo"])

    def test_positive_regular_without_alias(self):
        row, raw, proof, info, payload, body = fixture(alias=False)
        self.assertEqual(READER.validate_package(row, raw, proof, tar_bytes(info), tar_bytes(payload))["regularCopies"]["lib/libsample.1.dylib"], body)

    def test_positive_conda_softlink_without_raw_sha_uses_original_target(self):
        row, raw, proof, info, payload, body = fixture()
        metadata = json.loads(raw)
        paths = json.loads(info[1][2])
        for data in [metadata["paths_data"], paths]:
            data["paths"][1].pop("sha256")
        raw = encoded(metadata)
        proof.update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
        info[1] = ("info/paths.json", tarfile.REGTYPE, encoded(paths))
        self.assertEqual(READER.validate_package(row, raw, proof, tar_bytes(info), tar_bytes(payload))["regularCopies"]["lib/libsample.dylib"], body)

    def test_metadata_byte_provenance_tamper(self):
        row, raw, proof, info, payload, _ = fixture()
        self.assert_refused("PROVENANCE_PIN", READER.validate_package, row, raw + b" ", proof, tar_bytes(info), tar_bytes(payload))

    def test_wrong_index_build(self):
        row, raw, proof, info, payload, _ = fixture()
        info[0] = ("info/index.json", tarfile.REGTYPE, encoded({"name": "sample", "version": "1.0", "build": "wrong", "subdir": "osx-arm64"}))
        self.assert_refused("INDEX_IDENTITY", READER.validate_package, row, raw, proof, tar_bytes(info), tar_bytes(payload))

    def test_payload_digest_tamper(self):
        row, raw, proof, info, payload, _ = fixture()
        payload[0] = (payload[0][0], tarfile.REGTYPE, b"tampered")
        self.assert_refused("PAYLOAD_DIGEST", READER.validate_package, row, raw, proof, tar_bytes(info), tar_bytes(payload))

    def test_extra_and_missing_payload(self):
        row, raw, proof, info, payload, _ = fixture()
        for entries in [payload + [("extra", tarfile.REGTYPE, b"x")], payload[:-1]]:
            self.assert_refused("PAYLOAD_SET", READER.validate_package, row, raw, proof, tar_bytes(info), tar_bytes(entries))

    def test_notice_required(self):
        row, raw, proof, info, payload, _ = fixture(notice=False)
        self.assert_refused("LICENSE_NOTICE_MISSING", READER.validate_package, row, raw, proof, tar_bytes(info), tar_bytes(payload))

    def test_paths_traversal_absolute_backslash(self):
        for name in ["../escape", "/absolute", "lib/../escape", "lib\\escape", "lib//x"]:
            self.assert_refused("PATH_ESCAPE", READER.decoded_tar, tar_bytes([(name, tarfile.REGTYPE, b"x")]))

    def test_duplicate_tar_names(self):
        self.assert_refused("TAR_DUPLICATE", READER.decoded_tar, tar_bytes([("x", tarfile.REGTYPE, b"a"), ("x", tarfile.REGTYPE, b"b")]))

    def test_actual_tar_hardlinks_devices_fifo_refused(self):
        for kind in [tarfile.LNKTYPE, tarfile.CHRTYPE, tarfile.BLKTYPE, tarfile.FIFOTYPE]:
            self.assert_refused("TAR_TYPE", READER.decoded_tar, tar_bytes([("x", kind, "y")]))

    def test_alias_cycle_absolute_and_parent_escape(self):
        for target in ["libsample.dylib", "/outside", "../../outside"]:
            row, raw, proof, info, payload, _ = fixture()
            payload[1] = (payload[1][0], tarfile.SYMTYPE, target)
            self.assert_refused("ALIAS_(CYCLE|ESCAPE)", READER.validate_package, row, raw, proof, tar_bytes(info), tar_bytes(payload))

    def test_decoded_stream_cap_and_truncated_or_trailing_data(self):
        self.assert_refused("TAR_STREAM_LIMIT", READER.decoded_tar, b"x" * (READER.STREAM_MAX + 1))
        valid = tar_bytes([("x", tarfile.REGTYPE, b"x")])
        self.assert_refused("TAR_STREAM_LIMIT", READER.decoded_tar, valid[:-1])
        self.assert_refused("TAR_TRAILING_OR_EOF", READER.decoded_tar, valid + b"x" * 512)

    def test_duplicate_json_and_paths(self):
        self.assert_refused("JSON_DUPLICATE", READER.strict_json, b'{"x":1,"x":2}')
        entry = {"_path": "lib/x", "path_type": "hardlink"}
        self.assert_refused("PATHS_DUPLICATE_TYPE", READER.path_rows, {"paths_version": 1, "paths": [entry, entry]})

    def test_declared_tar_bomb_refused_before_allocating_payload(self):
        member = tarfile.TarInfo("bomb")
        member.size = READER.STREAM_MAX + 1
        self.assert_refused("TAR_SIZE", READER.decoded_tar, member.tobuf(format=tarfile.USTAR_FORMAT) + b"\0" * 1024)

    def test_sparse_and_invalid_tar_refuse(self):
        member = tarfile.TarInfo("sparse")
        member.type = tarfile.GNUTYPE_SPARSE
        for data in [member.tobuf(format=tarfile.GNU_FORMAT) + b"\0" * 1024, b"x" * 1536]:
            with self.assertRaises((ValueError, tarfile.ReadError)):
                READER.decoded_tar(data)

    def test_missing_alias_and_orphan_directory_refuse(self):
        self.assert_refused("ALIAS_MISSING", READER.regular_alias, {"x": {"type": "softlink", "target": "absent"}}, "x")
        row, raw, proof, info, payload, _ = fixture()
        self.assert_refused("PAYLOAD_ORPHAN_DIRECTORY", READER.validate_package, row, raw, proof, tar_bytes(info), tar_bytes(payload + [("orphan", tarfile.DIRTYPE, "")]))

    def test_package_set_duplicate_and_aggregate_cap(self):
        row, raw, proof, info, payload, _ = fixture()
        package = (row, raw, proof, tar_bytes(info), tar_bytes(payload))
        self.assert_refused("PACKAGE_DUPLICATE", READER.validate_package_set, [package, package])
        buffer = b"x" * READER.STREAM_MAX
        oversized = (row, raw, proof, buffer, buffer)
        self.assert_refused("DECODED_SET_LIMIT", READER.validate_package_set, [oversized] * 5)

    def test_outer_zip_exact_v2_pin_and_duplicate_or_wrong_version(self):
        for duplicate, version in [(False, 2), (True, 2), (False, 1)]:
            stream = io.BytesIO()
            with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_STORED) as archive:
                archive.writestr("metadata.json", encoded({"conda_pkg_format_version": version}))
                archive.writestr("info-sample-1.0-build_0.tar.zst", b"\x28\xb5\x2f\xfdsynthetic-info")
                archive.writestr("pkg-sample-1.0-build_0.tar.zst", b"\x28\xb5\x2f\xfdsynthetic-pkg")
                if duplicate:
                    archive.writestr("metadata.json", b"{}")
            data = stream.getvalue()
            row = fixture()[0]
            row.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
            if duplicate:
                self.assert_refused("ZIP_MEMBERS", READER.validate_outer_zip, data, row)
            elif version != 2:
                self.assert_refused("ZIP_VERSION", READER.validate_outer_zip, data, row)
            else:
                self.assertEqual(len(READER.validate_outer_zip(data, row)), 2)
                self.assert_refused("ARCHIVE_PIN", READER.validate_outer_zip, data + b"x", row)

    def test_zip_symlink_and_unknown_member_refused(self):
        for alias in [False, True]:
            stream = io.BytesIO()
            with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_STORED) as archive:
                archive.writestr("metadata.json", encoded({"conda_pkg_format_version": 2}))
                member = zipfile.ZipInfo("info-sample-1.0-build_0.tar.zst" if alias else "../unknown")
                member.create_system = 3
                member.external_attr = (0o120777 if alias else 0o100644) << 16
                archive.writestr(member, b"\x28\xb5\x2f\xfdsynthetic")
                archive.writestr("pkg-sample-1.0-build_0.tar.zst", b"\x28\xb5\x2f\xfdsynthetic")
            data = stream.getvalue()
            row = fixture()[0]
            row.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
            self.assert_refused("ZIP_TYPE_LIMIT" if alias else "ZIP_MEMBERS", READER.validate_outer_zip, data, row)


if __name__ == "__main__":
    unittest.main(verbosity=2)
