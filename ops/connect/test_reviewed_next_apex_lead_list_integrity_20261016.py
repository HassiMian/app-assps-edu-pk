"""Immutable-only Connect lead-admin storage/CSV integrity source attestation."""
import hashlib,json
from pathlib import Path
import unittest
from test_reviewed_next_csv_formula_20261016 import sections,new_file_content
ROOT=Path(__file__).resolve().parent/'recovery'
PATCH=ROOT/'reviewed-next-apex-lead-list-integrity-20261016.patch'
MANIFEST=ROOT/'reviewed-next-apex-lead-list-integrity-20261016.manifest.json'
PIN='98be604a39ca3a094ebe80ba87b92ddaae64aff10fb1dbf9b8cbd6264c9aa7b9'
STORAGE='src/lib/server/apex-leads-storage.ts'
ROUTE='src/app/api/saas-admin/apex-leads/route.ts'
NEW='tests/apex-lead-list-integrity.test.cjs'
class ListIntegrity(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=PATCH.read_bytes();cls.parts=sections(cls.raw.decode());cls.m=json.loads(MANIFEST.read_text())
 def test_exact_patch_sha_and_scope(self):
  self.assertEqual(hashlib.sha256(self.raw).hexdigest(),PIN)
  self.assertEqual(self.m['patchSha256'],PIN)
  self.assertEqual(set(self.parts),{STORAGE,ROUTE,NEW})
  self.assertEqual(set(self.m['changedFiles']),{STORAGE,ROUTE,NEW})
 def test_exact_source_ancestry(self):
  self.assertEqual(self.m['baseCommit'],'7c3e26cb3626f2eeed0cc38a2dcb7b629b7d9e5c')
  self.assertEqual(self.m['fixedCommit'],'3a4d7ab664168607317eec040891292747636598')
 def test_access_denial_propagates_not_fake_empty(self):
  s=self.parts[STORAGE]
  self.assertIn('if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];',s)
  self.assertIn('throw error;',s)
  self.assertIn('error instanceof SyntaxError',s)
 def test_filename_and_record_validation(self):
  s=self.parts[STORAGE]
  self.assertIn('validStoredApexLead(value: unknown, filename: string)',s)
  self.assertIn('filename !== `${record.leadId}.json`',s)
  self.assertIn('Date.parse(record.created_at)',s)
  self.assertIn('items.push(parsed)',s)
 def test_admin_success_is_explicitly_no_store(self):
  self.assertIn('"Cache-Control": "no-store"',self.parts[ROUTE])
  self.assertNotIn('-    await requireSaasAdminUser()',self.parts[ROUTE])
 def test_existing_authorized_record_paths_unchanged(self):
  s=self.parts[STORAGE]
  self.assertNotIn('-export async function createApexLead',s)
  self.assertNotIn('-export async function updateApexLeadStatus',s)
  self.assertNotIn('-export async function readApexLeadById',s)
 def test_new_synthetic_suite_is_byte_identical(self):
  b=new_file_content(self.parts[NEW]);self.assertEqual(hashlib.sha256(b).hexdigest(),self.m['sourceFileSha256'][NEW])
  for literal in ('unauthenticated actors','malformed JSON','EACCES','EIO','permission-denied','status filtered'):
   self.assertIn(literal,b.decode())
  self.assertEqual(self.m['priorBaselineFocusedFailed'],7)
  self.assertEqual(self.m['focusedTestsPassed'],10)
  self.assertEqual(self.m['allNodeTestsPassed'],63)
 def test_release_unconditionally_stays_hold(self):
  self.assertFalse(self.m['productionModified']);self.assertFalse(self.m['signedReleaseAuthorized'])
  self.assertEqual(self.m['deploymentStatus'],'QA_SOURCE_ONLY_NOT_DEPLOYED')
  self.assertTrue(self.m['privateBuildVerified'])
  self.assertEqual(self.m['privateBuildExitCode'],0)
  self.assertEqual(self.m['privateBuildId'],'j2H5SSD63AnRhCWoSCEw5')
  self.assertEqual(self.m['staticPagesGenerated'],103)
  self.assertEqual(self.m['scopedLintExitCode'],0)
  self.assertEqual(self.m['loopbackHttpPassed'],8)
  self.assertRegex(self.m['privateBuildLogSha256'],r'^[a-f0-9]{64}$')
  self.assertRegex(self.m['loopbackHttpReceiptSha256'],r'^[a-f0-9]{64}$')
  self.assertEqual(self.m['latestReviewedCoreSha'],'6a9d48af16ae7e57881ce5251bcc8b75c138aaac')
  self.assertEqual(self.m['latestCoreDistIndexSha256'],'e4ae29640eeb756518b825f0fac4e2e950fbf12a2c6560c1d55c8a51548b7611')
  self.assertEqual(self.m['latestCoreCompiledBuildExitCode'],0)
  self.assertEqual(self.m['phase2JointChecksPassed'],13)
  self.assertEqual(self.m['phase2JointChecksTotal'],15)
  self.assertEqual(self.m['officialSignedChecksPassed'],6)
  self.assertEqual(self.m['officialSignedChecksTotal'],13)
if __name__=='__main__':unittest.main()
