"""Immutable-source-only proof for Connect lead admin status atomic replacement."""
import hashlib
import json
from pathlib import Path
import unittest
from test_reviewed_next_csv_formula_20261016 import sections, new_file_content

ROOT=Path(__file__).resolve().parent/'recovery'
PATCH=ROOT/'reviewed-next-atomic-status-20261016.patch'
MANIFEST=ROOT/'reviewed-next-atomic-status-20261016.manifest.json'
PIN='5b9106afa7e99e2af6d5baf77cd58d806b97d731adaa379c8bb797d5bca28d81'
STORAGE='src/lib/server/apex-leads-storage.ts'
ROUTE='src/app/api/saas-admin/apex-leads/[leadId]/status/route.ts'
LEGACY='tests/apex-lead-id-boundary.test.cjs'
NEW='tests/apex-lead-atomic-status.test.cjs'

class AtomicStatusContract(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=PATCH.read_bytes();cls.parts=sections(cls.raw.decode());cls.m=json.loads(MANIFEST.read_text())
 def test_exact_sha_and_four_file_scope(self):
  self.assertEqual(hashlib.sha256(self.raw).hexdigest(),PIN)
  self.assertEqual(self.m['patchSha256'],PIN)
  self.assertEqual(set(self.parts),{STORAGE,ROUTE,LEGACY,NEW})
  self.assertEqual(set(self.m['changedFiles']),{STORAGE,ROUTE,LEGACY,NEW})
 def test_source_parent_and_exact_commit(self):
  self.assertEqual(self.m['baseCommit'],'3a4d7ab664168607317eec040891292747636598')
  self.assertEqual(self.m['fixCommit'],'4fe2c2ecad355e784868bee325f4d31f11e8eb4d')
 def test_private_exclusive_sibling_and_rename(self):
  s=self.parts[STORAGE]
  for needle in ('const temporaryPath = `${filePath}.${uuid()}.tmp`','flag: "wx"','mode: 0o600',
                 'await fs.rename(temporaryPath, filePath)','await fs.unlink(temporaryPath)'):
   self.assertIn(needle,s)
  self.assertNotIn('+  await fs.writeFile(filePath, JSON.stringify(next',s)
 def test_collision_does_not_unlink_other_request(self):
  self.assertIn('code !== "EEXIST"',self.parts[STORAGE])
  self.assertIn('throw error;',self.parts[STORAGE])
 def test_no_store_authorized_status_response(self):
  s=self.parts[ROUTE]
  self.assertIn('"Cache-Control": "no-store"',s)
  self.assertNotIn('-    await requireSaasAdminUser()',s)
 def test_unchanged_read_create_list_routes(self):
  s=self.parts[STORAGE]
  for needle in ('-export async function createApexLead','-export async function listApexLeads',
                 '-export async function readApexLeadById'):
   self.assertNotIn(needle,s)
 def test_exact_real_filesystem_test_fails_before_passes_after(self):
  suite=new_file_content(self.parts[NEW])
  self.assertEqual(hashlib.sha256(suite).hexdigest(),self.m['sourceFileSha256'][NEW])
  for term in ('partial candidate write','atomic rename failure','temporary-name EEXIST',
               'admin unauthorized','missing old lead'):
   self.assertIn(term,suite.decode())
  self.assertEqual(self.m['beforeFocusedPass'],4)
  self.assertEqual(self.m['beforeFocusedFail'],5)
  self.assertEqual(self.m['afterFullNodePass'],73)
 def test_fail_closed_release_separation(self):
  self.assertFalse(self.m['productionModified'])
  self.assertFalse(self.m['protectedDataTouched'])
  self.assertFalse(self.m['signedReleaseAuthorized'])
  self.assertEqual(self.m['releaseStatus'],'SOURCE_ONLY_NOT_DEPLOYED')
  self.assertTrue(self.m['isolatedNextBuildVerified'])
  self.assertEqual(self.m['isolatedNextBuildExit'],0)
  self.assertEqual(self.m['isolatedNextBuildId'],'HYiWHiCuGMYLnPKNZhpt9')
  self.assertRegex(self.m['isolatedNextBuildLogSha256'],r'^[a-f0-9]{64}$')
  self.assertTrue(self.m['typescriptAnd103PagesVerified'])
  self.assertEqual(self.m['scopedESLintExit'],0)
  self.assertEqual(self.m['isolatedHttpPassed'],8)
  self.assertRegex(self.m['isolatedHttpReceiptSha256'],r'^[a-f0-9]{64}$')
  self.assertEqual(self.m['latestReviewedCoreCommit'],'2a3d5bac57decb4f9dc32fb97728b2403f82c7b6')
  self.assertEqual(self.m['latestReviewedCoreIndexSha256'],'d0de50ad2011ee3dc5532352788e1e1795a94cc6f49b90a84ed7c08994748d05')
  self.assertEqual(self.m['coreRebuildExit'],0)
  self.assertEqual(self.m['jointChecksPassed'],13)
  self.assertEqual(self.m['jointChecksTotal'],15)
  self.assertEqual(self.m['independentSignedChecksPassed'],6)
  self.assertEqual(self.m['independentSignedChecksTotal'],13)
  self.assertRegex(self.m['fourPhaseGateSha256'],r'^[a-f0-9]{64}$')
if __name__=='__main__':unittest.main()
