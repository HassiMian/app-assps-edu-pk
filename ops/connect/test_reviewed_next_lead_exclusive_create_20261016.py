"""SHA-pinned source-only regression contract; no live student/lead data."""
import hashlib,json
from pathlib import Path
import unittest
from test_reviewed_next_csv_formula_20261016 import sections,new_file_content

ROOT=Path(__file__).resolve().parent/'recovery'
PATCH=ROOT/'reviewed-next-apex-lead-collision-20261016.patch'
MANIFEST=ROOT/'reviewed-next-apex-lead-collision-20261016.manifest.json'
PIN='dfafd7da274a7c9bcdafcd9c2bbfbacc1d1b37e735faf5ed6c1f7fd7021c457d'
STORAGE='src/lib/server/apex-leads-storage.ts'
EXISTING='tests/apex-lead-id-boundary.test.cjs'
NEW='tests/apex-lead-exclusive-create.test.cjs'
class CheckedCollisionGuard(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=PATCH.read_bytes();cls.sections=sections(cls.raw.decode());cls.data=json.loads(MANIFEST.read_text())
 def test_exact_patch_hash_and_scope(self):
  self.assertEqual(hashlib.sha256(self.raw).hexdigest(),PIN)
  self.assertEqual(self.data['patchSha256'],PIN)
  self.assertEqual(set(self.sections),{STORAGE,EXISTING,NEW})
  self.assertEqual(set(self.data['changedFiles']),{STORAGE,EXISTING,NEW})
 def test_existing_source_ancestry(self):
  self.assertEqual(self.data['baseCommit'],'b5b5e904e8e00aa5cfaf88aa00dc395047e24a7f')
  self.assertEqual(self.data['fixedCommit'],'7c3e26cb3626f2eeed0cc38a2dcb7b629b7d9e5c')
 def test_atomic_create_cap_and_private_mode(self):
  s=self.sections[STORAGE]
  for text in ('MAX_LEAD_CREATE_ATTEMPTS = 8','flag: "wx"','mode: 0o600','uuid().slice(0, 8).toUpperCase()','await fs.mkdir(leadsDir()'):
   self.assertIn(text,s)
  self.assertEqual(self.data['exclusiveCreateFlag'],'wx')
  self.assertEqual(self.data['maxCreateAttempts'],8)
 def test_only_genuine_id_collision_is_retried(self):
  s=self.sections[STORAGE]
  self.assertIn('code !== "EEXIST") throw error',s)
  self.assertIn('APEX_LEAD_ID_COLLISION_RETRY_EXHAUSTED',s)
 def test_existing_apis_remain_unchanged(self):
  s=self.sections[STORAGE]
  self.assertNotIn('-export async function readApexLeadById',s)
  self.assertNotIn('-export async function updateApexLeadStatus',s)
  self.assertIn('options.flag===\'wx\'',self.sections[EXISTING])
 def test_new_fixture_contents_are_sha_pinned(self):
  b=new_file_content(self.sections[NEW])
  self.assertEqual(hashlib.sha256(b).hexdigest(),self.data['sourceFileSha256'][NEW])
  for keyword in ('collision','concurrent creates','EACCES','8 attempts','0o600'):
   self.assertIn(keyword,b.decode())
  self.assertEqual(self.data['failBeforeSyntheticTestsFailed'],6)
  self.assertEqual(self.data['focusedNodeTestsPassed'],53)
 def test_private_qa_is_not_release_authorization(self):
  m=self.data
  self.assertTrue(m['buildVerified']);self.assertEqual(m['buildExitCode'],0)
  self.assertEqual(m['staticPagesGenerated'],103)
  self.assertEqual(m['privateBuildId'],'-1n6XzSCRe2rjHFa4h7ms')
  self.assertEqual(m['privateHttpTestsPassed'],8)
  self.assertRegex(m['buildLogSha256'],r'^[a-f0-9]{64}$')
  self.assertFalse(m['productionModified']);self.assertFalse(m['releaseAuthorized'])
  self.assertFalse(m['canonicalSchoolRecordsTouched'])
  self.assertEqual(m['publicDeploymentStatus'],'NOT_PROMOTED')
if __name__=='__main__':unittest.main()
