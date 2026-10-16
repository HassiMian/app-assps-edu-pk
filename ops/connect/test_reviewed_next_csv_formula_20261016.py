#!/usr/bin/env python3
"""Hermetic, immutable-source tests for recovered Connect CSV export hardening.

These tests never open production APIs or school data. The actual Next build and
source patch-apply were separately observed on the isolated VPS worktree.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

OPS = Path(__file__).resolve().parent
ROOT = OPS / "recovery"
PATCH = ROOT / "reviewed-next-admin-csv-formula-20261016.patch"
MANIFEST = ROOT / "reviewed-next-admin-csv-formula-20261016.manifest.json"
EXPECTED = {
    "src/lib/server/apex-leads-export.ts",
    "src/lib/server/csv-cell.ts",
    "src/lib/server/subscription-request-export.ts",
    "tests/csv-formula-hardening.test.mjs",
}
NEW_FILES = {"src/lib/server/csv-cell.ts", "tests/csv-formula-hardening.test.mjs"}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sections(patch: str) -> dict[str, str]:
    found: dict[str, str] = {}
    chunks = re.split(r"(?=^diff --git a/)", patch, flags=re.MULTILINE)
    for part in chunks:
        if not part.strip():
            continue
        m = re.match(r"diff --git a/([^ \n]+) b/([^ \n]+)", part)
        if not m or m.group(1) != m.group(2):
            raise ValueError("unexpected file diff")
        path = m.group(1)
        if path in found:
            raise ValueError("duplicate file diff")
        found[path] = part
    return found


def new_file_content(section: str) -> bytes:
    if "new file mode 100644" not in section:
        raise ValueError("not a newly introduced file")
    after = section.split("@@ ", 1)
    if len(after) < 2:
        raise ValueError("no hunks")
    hunk = "@@ " + after[1]
    lines = []
    for line in hunk.splitlines():
        if line.startswith("+++") or line.startswith("@@"):
            continue
        if line.startswith("+"):
            lines.append(line[1:])
        elif line and not line.startswith("\\"):
            raise ValueError("unexpected non-added line in new file")
    return ("\n".join(lines) + "\n").encode()


class CsvFormulaPatchProof(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = PATCH.read_bytes()
        cls.patch = cls.raw.decode()
        cls.manifest = json.loads(MANIFEST.read_text())
        cls.parts = sections(cls.patch)

    def test_pinned_base_and_commit(self):
        self.assertEqual(self.manifest["sourceGitBase"], "2de3c39224b12385be0ab46a1e6c53328a7eeafc")
        self.assertEqual(self.manifest["sourceGitCommit"], "44cfef3e2162d61ebff4374dab62fcc4b84689d0")
        self.assertFalse(self.manifest["releaseAuthorized"])
        self.assertFalse(self.manifest["productionModified"])

    def test_immutable_patch_digest(self):
        self.assertEqual(digest(self.raw), self.manifest["patchSha256"])

    def test_affected_files_exactly_scoped(self):
        self.assertEqual(set(self.parts), EXPECTED)
        self.assertEqual(set(self.manifest["reviewedModifiedFiles"]), EXPECTED)

    def test_new_source_and_node_test_hashes(self):
        for path in NEW_FILES:
            self.assertEqual(digest(new_file_content(self.parts[path])),
                             self.manifest["reviewedModifiedFiles"][path])

    def test_both_administrative_exports_use_shared_safe_encoder(self):
        for path in EXPECTED - NEW_FILES:
            hunk = self.parts[path]
            self.assertIn('+import { escapeCsvCell } from "@/lib/server/csv-cell";', hunk)
            self.assertIn("+      .map(escapeCsvCell)", hunk)
            self.assertIn("-function escapeCsv(value: unknown) {", hunk)

    def test_isolated_optimized_build_evidence_not_release(self):
        self.assertEqual(self.manifest["observedOptimizedBuildExit"], 0)
        self.assertEqual(self.manifest["observedStaticPages"], 103)
        self.assertEqual(self.manifest["observedCsvNodeTestsPassed"], 5)
        self.assertEqual(self.manifest["testedBuildId"], "6P6T_rpCWPP-p5da2Ye_u")
        self.assertRegex(self.manifest["isolatedBuildLogSha256"], r"^[0-9a-f]{64}$")

    def test_runtime_formula_literals_from_exact_patch_source(self):
        js = r"""
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const {escapeCsvCell} = await import(pathToFileURL(process.argv[1]).href);
for (const x of ['=2+2', ' +3', '-4+2', '@SUM(1)', '\t=4', '\ufeff=2', '＝4']) {
  assert.ok(escapeCsvCell(x).startsWith("'") || escapeCsvCell(x).startsWith('"\''));
}
assert.equal(escapeCsvCell(-25), '-25');
assert.equal(escapeCsvCell('a,b'), '"a,b"');
assert.equal(escapeCsvCell('a"b'), '"a""b"');
assert.equal(escapeCsvCell('Urdu عِلم'), 'Urdu عِلم');
assert.equal(escapeCsvCell('=SUM(1,2)'), '"\'=SUM(1,2)"');
"""
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "csv-cell.ts"
            path.write_bytes(new_file_content(self.parts["src/lib/server/csv-cell.ts"]))
            process = subprocess.run(
                ["node", "--experimental-strip-types", "--input-type=module",
                 "-e", js, str(path)], capture_output=True, text=True, timeout=20,
                check=False
            )
            self.assertEqual(process.returncode, 0, process.stderr[-1500:])


if __name__ == "__main__":
    unittest.main()
