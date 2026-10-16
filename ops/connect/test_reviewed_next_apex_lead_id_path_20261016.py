"""Offline SHA-pinned Connect lead ID path boundary regression proof.

Never reads live lead records or exercises SaaS authentication.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
from test_reviewed_next_csv_formula_20261016 import sections, new_file_content

ROOT=Path(__file__).resolve().parent/'recovery'
PATCH=ROOT/'reviewed-next-apex-lead-id-path-20261016.patch'
MANIFEST=ROOT/'reviewed-next-apex-lead-id-path-20261016.manifest.json'
EXPECTED_SHA='ff60ac0f1ce147061799bc974432f584e36f31207b80d0d46408d38a3f15dff1'
STORAGE='src/lib/server/apex-leads-storage.ts'
STATUS='src/app/api/saas-admin/apex-leads/[leadId]/status/route.ts'
FOLLOW='src/app/api/saas-admin/apex-leads/[leadId]/follow-up/route.ts'
TEST='tests/apex-lead-id-boundary.test.cjs'
FILES={STORAGE,STATUS,FOLLOW,TEST}

def sha(raw:bytes)->str:
 return hashlib.sha256(raw).hexdigest()

class PinnedLeadIdBoundary(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=PATCH.read_bytes()
  cls.parts=sections(cls.raw.decode())
  cls.manifest=json.loads(MANIFEST.read_text())

 def test_exact_immutable_patch_sha(self):
  self.assertEqual(sha(self.raw),EXPECTED_SHA)
  self.assertEqual(self.manifest['patchSha256'],EXPECTED_SHA)

 def test_scope_restricted_to_four_connect_files(self):
  self.assertEqual(set(self.parts),FILES)
  self.assertEqual(set(self.manifest['reviewedFiles']),FILES)

 def test_exact_baseline_and_fixed_commit(self):
  self.assertEqual(self.manifest['baseGitCommit'],'cecdcebd8e244cc73b784abaafc250f8ee8955cd')
  self.assertEqual(self.manifest['fixedGitCommit'],'e0073349d2fc1ae1bda294b9b48f99392695f9b9')

 def test_storage_file_reads_writes_behind_validation(self):
  part=self.parts[STORAGE]
  self.assertIn('+export function isApexLeadId(value: unknown): value is string {',part)
  self.assertIn('+  return typeof value === "string" && /^LEAD-[0-9A-F]{8}$/.test(value);',part)
  self.assertIn('+  if (!isApexLeadId(leadId)) {',part)
  self.assertIn('+  const raw = await fs.readFile(leadFilePath(leadId), "utf8");',part)
  self.assertIn('+  const filePath = leadFilePath(leadId);',part)

 def test_both_routes_guard_before_file_access(self):
  for file in (STATUS,FOLLOW):
   part=self.parts[file]
   self.assertIn('+    if (!isApexLeadId(leadId)) {',part,file)
   self.assertIn('+        { success: false, message: "Invalid lead ID" },',part,file)
   self.assertIn('+        { status: 400, headers: { "Cache-Control": "no-store" } },',part,file)
  self.assertIn('+    const lead = await readApexLeadById(leadId);',self.parts[FOLLOW])
  self.assertIn('-    const filePath = path.join(process.cwd()',self.parts[FOLLOW])

 def test_added_synthetic_regression_is_byte_exact(self):
  source=new_file_content(self.parts[TEST])
  self.assertEqual(sha(source),self.manifest['reviewedFiles'][TEST])
  self.assertIn(b'path traversal and malformed IDs cannot reach',source)
  self.assertIn(b'valid lead status and follow-up remain functional',source)
  self.assertIn(b'both handlers still enforce auth',source)

 def test_canonical_id_pattern_accepts_only_generated_shape(self):
  # Use Node 22 to execute exact regex string recovered from pinned storage diff.
  import re
  m=re.search(r'\^LEAD-\[0-9A-F\]\{8\}\$',self.parts[STORAGE])
  self.assertIsNotNone(m)
  js="""
const assert=require('node:assert/strict');
const valid=new RegExp(process.argv[1]);
for(const s of ['LEAD-ABCDEF12','LEAD-00000000']) assert.ok(valid.test(s));
for(const s of ['../file','LEAD-ABCDEF12/../x','LEAD-ABCDEF12.json','lead-abcdef12','LEAD-ABCDEF12%2F..','LEAD-ABCDEF123'])
 assert.ok(!valid.test(s));
"""
  p=subprocess.run(['node','-e',js,m.group(0)],capture_output=True,text=True,timeout=10)
  self.assertEqual(p.returncode,0,p.stderr)

 def test_private_build_is_not_public_release(self):
  self.assertEqual(self.manifest['buildExitCode'],0)
  self.assertEqual(self.manifest['generatedStaticPages'],103)
  self.assertEqual(self.manifest['nodeFocusedTestsPassed'],37)
  self.assertEqual(self.manifest['compiledBuildId'],'lUM1_k0Kvh-ThJnvNv3ew')
  self.assertFalse(self.manifest['productionModified'])
  self.assertFalse(self.manifest['releaseAuthorized'])
  self.assertRegex(self.manifest['buildLogSha256'],r'^[a-f0-9]{64}$')

if __name__=='__main__':unittest.main()
