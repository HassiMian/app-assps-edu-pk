"""Offline pinned integrity & behavior proof for the reviewed Next status validation fix.

No live requests; this does not authorize a Connect/Core production release.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_reviewed_next_csv_formula_20261016 import sections, new_file_content

ROOT = Path(__file__).resolve().parent / "recovery"
PATCH = ROOT / "reviewed-next-csv-status-filter-20261016.patch"
MANIFEST = ROOT / "reviewed-next-csv-status-filter-20261016.manifest.json"
PIN = "2f1d716f8650d8dd576a4f4e428ddbf4f0af70b4c46fc9ca97a6e9aa6082555d"
ROUTES = {
    "src/app/api/saas-admin/apex-leads/export/route.ts",
    "src/app/api/saas-admin/subscription-requests/export/route.ts",
}
ADDED = {
    "src/lib/server/admin-export-status.ts",
    "tests/admin-export-route-security.test.cjs",
    "tests/admin-export-status.test.mjs",
}

def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

class StatusPatch(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.patch = PATCH.read_bytes()
        cls.manifest = json.loads(MANIFEST.read_text())
        cls.sections = sections(cls.patch.decode())

    def test_patch_immutable_and_exact_five_files(self):
        self.assertEqual(digest(self.patch), PIN)
        self.assertEqual(self.manifest["sourcePatchSha256"], PIN)
        self.assertEqual(set(self.sections), ROUTES | ADDED)
        self.assertEqual(set(self.manifest["reviewedFiles"]), ROUTES | ADDED)

    def test_source_lineage_and_hold(self):
        self.assertEqual(self.manifest["baseGitCommit"], "44cfef3e2162d61ebff4374dab62fcc4b84689d0")
        self.assertEqual(self.manifest["fixedGitCommit"], "2b749aee8a21b460e099e4bdbf608e1b997427c0")
        self.assertIs(self.manifest["releaseAuthorized"], False)
        self.assertIs(self.manifest["productionModified"], False)

    def test_new_files_recover_byte_exact(self):
        for file in ADDED:
            actual = new_file_content(self.sections[file])
            self.assertEqual(digest(actual), self.manifest["reviewedFiles"][file], file)

    def test_both_routes_validate_after_authentication(self):
        for file in ROUTES:
            section = self.sections[file]
            self.assertIn("+    const statusParam = parseAdminExportStatus(searchParams.get(\"status\"),", section)
            self.assertIn("+    if (statusParam === null) {", section)
            self.assertIn("+        { status: 400, headers: { \"Cache-Control\": \"no-store\" } },", section)
            self.assertIn("-    const statusParam = searchParams.get(\"status\") || \"ALL\";", section)
            self.assertIn("await requireSaasAdminUser();", section)

    def test_only_documented_statuses_are_accepted(self):
        helper = new_file_content(self.sections["src/lib/server/admin-export-status.ts"])
        js = """
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {parseAdminExportStatus: parse}=await import(pathToFileURL(process.argv[1]).href);
for(const status of ['ALL','NEW','CONTACTED','ARCHIVED']){
 assert.equal(parse(status.toLowerCase(),'apex-leads'),status);
}
for(const status of ['ALL','PENDING','PAYMENT_CONFIRMED','APPROVED','REJECTED']){
 assert.equal(parse(status.toLowerCase(),'subscription-requests'),status);
}
for(const raw of ['',' ', '\\t', 'ALL/../hidden', 'APPROVED?x=1','ALL\";filename=\"fake.csv','NEW\\u0000']){
 assert.equal(parse(raw,'apex-leads'),null);
 assert.equal(parse(raw,'subscription-requests'),null);
}
assert.equal(parse('CONTACTED','subscription-requests'),null);
assert.equal(parse('PENDING','apex-leads'),null);
assert.equal(parse(null,'apex-leads'),'ALL');
"""
        with tempfile.TemporaryDirectory() as d:
            temp = Path(d) / "admin-export-status.ts"
            temp.write_bytes(helper)
            run = subprocess.run(
                ["node", "--experimental-strip-types", "--input-type=module",
                 "-e", js, str(temp)],
                capture_output=True, text=True, timeout=15, check=False,
            )
            self.assertEqual(run.returncode, 0, run.stderr[-1800:])

    def test_private_build_proof_is_not_prod_certification(self):
        self.assertEqual(self.manifest["observedOptimizedBuildExit"], 0)
        self.assertEqual(self.manifest["observedGeneratedPages"], 103)
        self.assertEqual(self.manifest["nodeFocusedTestsPassed"], 16)
        self.assertEqual(self.manifest["observedBuildId"], "OS4cW8dj-TjhMP5tGmtlR")
        self.assertRegex(self.manifest["observedBuildLogSha256"], r"^[a-f0-9]{64}$")

if __name__ == "__main__":
    unittest.main()
