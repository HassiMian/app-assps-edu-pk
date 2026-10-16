"""Offline immutable-source and negative-security QA for Connect admin 500 redaction.

The standalone Next source is scoped/pinned; this is not a Core release signer.
"""
import hashlib
import json
from pathlib import Path
import re
import unittest
from test_reviewed_next_csv_formula_20261016 import sections, new_file_content

ROOT=Path(__file__).resolve().parent/'recovery'
PATCH=ROOT/'reviewed-next-admin-api-500-redaction-20261016.patch'
MANIFEST=ROOT/'reviewed-next-admin-api-500-redaction-20261016.manifest.json'
EXPECTED={
 'src/app/api/saas-admin/apex-leads/[leadId]/follow-up/route.ts',
 'src/app/api/saas-admin/apex-leads/[leadId]/status/route.ts',
 'src/app/api/saas-admin/apex-leads/route.ts',
 'src/app/api/saas-admin/apex-leads/stats/route.ts',
 'src/app/api/saas-admin/gateway-sandbox/route.ts',
 'src/app/api/saas-admin/gateway-setup/route.ts',
 'src/app/api/saas-admin/subscription-requests/[id]/approve/route.ts',
 'src/app/api/saas-admin/subscription-requests/bulk-approve/route.ts',
 'src/app/api/saas-admin/subscription-requests/stats/route.ts',
}
TEST='tests/admin-api-error-boundary.test.cjs'
SHA='64d28006fff3ef470bcfb93a8436d425ec5a90045205943bc308c7e8154b873b'
def digest(data:bytes)->str:
 return hashlib.sha256(data).hexdigest()
class ReviewedAdminApiBoundaryTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=PATCH.read_bytes()
  cls.sections=sections(cls.raw.decode())
  cls.manifest=json.loads(MANIFEST.read_text())
 def test_exact_byte_pin(self):
  self.assertEqual(digest(self.raw),SHA)
  self.assertEqual(self.manifest['patchSha256'],SHA)
 def test_source_lineage_and_release_hold(self):
  self.assertEqual(self.manifest['baseCommit'],'eb007ae1d2c539b6f20095ebc832605c0b5ac6e2')
  self.assertEqual(self.manifest['fixCommit'],'cecdcebd8e244cc73b784abaafc250f8ee8955cd')
  self.assertFalse(self.manifest['productionModified'])
  self.assertFalse(self.manifest['releaseAuthorized'])
 def test_only_nine_admin_routes_and_one_synthetic_test(self):
  self.assertEqual(set(self.sections),EXPECTED|{TEST})
  self.assertEqual(set(self.manifest['sourceFileSha256']),EXPECTED|{TEST})
 def test_nine_raw_error_leaks_replaced(self):
  for route in EXPECTED:
   diff=self.sections[route]
   self.assertIn('-    return NextResponse.json({ success: false, message }, { status: 500 });',diff,route)
   self.assertIn('+      { success: false, message: "Administrative request temporarily unavailable" },',diff,route)
   self.assertIn('+      { status: 500, headers: { "Cache-Control": "no-store" } },',diff,route)
   self.assertNotIn('+    return NextResponse.json({ success: false, message }, { status: 500 });',diff,route)
 def test_new_synthetic_test_source_unchanged(self):
  actual=new_file_content(self.sections[TEST])
  self.assertEqual(digest(actual),self.manifest['sourceFileSha256'][TEST])
  content=actual.decode()
  self.assertIn('Unauthorized',content)
  self.assertIn('Forbidden',content)
  self.assertIn('PRIVATE_SQL_CREDENTIALS_AND_FILESYSTEM_PATH',content)
  self.assertIn('assert.equal(m.counts.backend,0)',content)
 def test_optimized_private_build_is_not_release(self):
  self.assertEqual(self.manifest['optimizedBuildExit'],0)
  self.assertEqual(self.manifest['compiledStaticPages'],103)
  self.assertEqual(self.manifest['focusedNodeTestsPassed'],31)
  self.assertRegex(self.manifest['privateBuildId'],r'^[A-Za-z0-9_-]{12,32}$')
  self.assertRegex(self.manifest['buildLogSha256'],r'^[a-f0-9]{64}$')
if __name__=='__main__':
 unittest.main()
