"""Immutable offline review of public-Connect admin stats error/privacy behavior."""
import hashlib, json, unittest
from pathlib import Path
from test_reviewed_next_csv_formula_20261016 import sections, new_file_content

ROOT=Path(__file__).resolve().parent/'recovery'
PATCH=ROOT/'reviewed-next-admin-lead-stats-20261016.patch'
MANIFEST=ROOT/'reviewed-next-admin-lead-stats-20261016.manifest.json'
PIN='b53f4efd7ed73a5cf6f2e3fa539f551e1b6386f65ee28072fd338da5bf90381e'
HELPER='src/lib/client/apex-lead-list-request.ts'
ROUTE='src/app/api/saas-admin/apex-leads/stats/route.ts'
PAGE='src/app/saas-admin/apex-leads/page.tsx'
TEST='tests/apex-admin-lead-stats-failclosed.test.cjs'
class CheckedLeadStats(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=PATCH.read_bytes()
  cls.parts=sections(cls.raw.decode())
  cls.m=json.loads(MANIFEST.read_text())
 def test_literal_patch_sha_and_changed_scope(self):
  self.assertEqual(hashlib.sha256(self.raw).hexdigest(),PIN)
  self.assertEqual(self.m['patchSha256'],PIN)
  self.assertEqual(set(self.parts),{HELPER,ROUTE,PAGE,TEST})
  self.assertEqual(set(self.m['changedFiles']),{HELPER,ROUTE,PAGE,TEST})
 def test_exact_parent_and_successor(self):
  self.assertEqual(self.m['baseCommit'],'9a605e2e4c94ddb0f10bf7d4d93da43c01b1747e')
  self.assertEqual(self.m['fixedCommit'],'d2875c2fbcbc15df0da44eb966d32fd34dd04033')
 def test_validated_no_store_stats_rejects_forgery(self):
  s=self.parts[HELPER]
  for token in ('export async function fetchValidatedLeadStats(', 'APEX_LEAD_STATS_UNAVAILABLE',
   'APEX_LEAD_STATS_MALFORMED', 'Number.isSafeInteger(value)', 'Object.values(types)', 'KNOWN_LEAD_TYPES',
   'cache: "no-store"'):
   self.assertIn(token,s)
 def test_admin_stats_route_headers_error_redaction(self):
  s=self.parts[ROUTE]
  self.assertIn('"Cache-Control": "no-store"',s)
  self.assertNotIn('-    await requireSaasAdminUser();',s)
 def test_ui_clears_stale_counts_guards_latest_response_and_retry(self):
  s=self.parts[PAGE]
  for token in ('statsRequests.current.begin()', 'statsRequests.current.isCurrent(revision)',
    'statsRequests.current.invalidate()', 'setLeadStats(null)', 'setStatsError(true)',
    'fetchValidatedLeadStats(fetch)', 'Retry statistics', 'Enquiry statistics are temporarily unavailable.'):
   self.assertIn(token,s)
 def test_real_route_and_validation_tests_pinned(self):
  raw=new_file_content(self.parts[TEST])
  self.assertEqual(hashlib.sha256(raw).hexdigest(),self.m['sourceFileSha256'][TEST])
  for case in ('auth/permission/transport failures','negative fractional or nonfinite counts',
    'slow old status response', 'HTTP 401 403 are uncached', 'backend stats storage faults'):
   self.assertIn(case,raw.decode())
  self.assertEqual(self.m['focusedTestsPassed'],11)
  self.assertEqual(self.m['fullNodeTestsPassed'],93)
 def test_private_next_build_and_latest_core_exact_review(self):
  m=self.m
  self.assertTrue(m['isolatedNextBuildVerified'])
  self.assertEqual(m['isolatedNextBuildExitCode'],0)
  self.assertEqual(m['isolatedNextBuildId'],'udGhPGWHuNh3ABKAIOSuH')
  self.assertRegex(m['isolatedNextBuildLogSha256'],r'^[a-f0-9]{64}$')
  self.assertTrue(m['typescriptBuildAnd103PagesPass'])
  self.assertEqual(m['loopbackPrivateHttpPassed'],9)
  self.assertRegex(m['loopbackPrivateHttpReceiptSha256'],r'^[a-f0-9]{64}$')
  self.assertEqual(m['latestCoreCommit'],'86a675890620ebb315af17dcd063cc09b0eed89e')
  self.assertEqual(m['latestCoreCompiledIndexSha256'],'db0ef46c9922c049f0b150a1a2b00323c15c67967483cd02ccdafa48d0134237')
  self.assertEqual(m['latestCoreIndependentBuildExitCode'],0)
  self.assertRegex(m['latestCoreBuildLogSha256'],r'^[a-f0-9]{64}$')
  self.assertEqual(m['fourPhaseGateExitCode'],2)
  self.assertEqual(m['jointChecksPassed'],13)
  self.assertEqual(m['jointChecksTotal'],15)
  self.assertEqual(m['independentSignedCoreChecksPassed'],6)
  self.assertEqual(m['independentSignedCoreChecksTotal'],13)
  self.assertRegex(m['latestFourPhaseGateReceiptSha256'],r'^[a-f0-9]{64}$')
  self.assertEqual(m['preFixFocusedFailed'],3)
  self.assertEqual(m['preFixFocusedPassed'],8)
 def test_production_release_not_promoted(self):
  self.assertFalse(self.m['productionModified'])
  self.assertFalse(self.m['schoolRecordsTouched'])
  self.assertFalse(self.m['releaseAuthorized'])
  self.assertEqual(self.m['deploymentStatus'],'SOURCE_ONLY_NOT_PROMOTED')
if __name__=='__main__':unittest.main()
