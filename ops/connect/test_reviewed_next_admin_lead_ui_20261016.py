"""Offline immutable protection for reviewed APEX admin-lead stale-UI fixes."""
import hashlib,json
from pathlib import Path
import unittest
from test_reviewed_next_csv_formula_20261016 import sections,new_file_content
ROOT=Path(__file__).resolve().parent/'recovery'
PATCH=ROOT/'reviewed-next-admin-lead-ui-20261016.patch'
MANIFEST=ROOT/'reviewed-next-admin-lead-ui-20261016.manifest.json'
PIN='6cbb1d25ebca72885e4a1bbf614eb3668911548f7fdb25b4257f9a164534214e'
PAGE='src/app/saas-admin/apex-leads/page.tsx'
HELPER='src/lib/client/apex-lead-list-request.ts'
TEST='tests/apex-admin-lead-ui-failclosed.test.cjs'

class ImmutableLeadUI(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=PATCH.read_bytes();cls.sections=sections(cls.raw.decode());cls.m=json.loads(MANIFEST.read_text())
 def test_pin_scope_three_files_only(self):
  self.assertEqual(hashlib.sha256(self.raw).hexdigest(),PIN)
  self.assertEqual(self.m['patchSha256'],PIN)
  self.assertEqual(set(self.sections),{PAGE,HELPER,TEST})
  self.assertEqual(set(self.m['changedFiles']),{PAGE,HELPER,TEST})
 def test_source_exact_ancestry(self):
  self.assertEqual(self.m['baseCommit'],'4fe2c2ecad355e784868bee325f4d31f11e8eb4d')
  self.assertEqual(self.m['fixedCommit'],'9a605e2e4c94ddb0f10bf7d4d93da43c01b1747e')
 def test_strict_http_and_shape_requirements(self):
  h=new_file_content(self.sections[HELPER]).decode()
  for token in ('if (!response.ok) throw new Error','result.success !== true',
                '!Array.isArray(result.data)','encodeURIComponent(status)',
                'cache: "no-store"'):
   self.assertIn(token,h)
 def test_monotonic_old_response_cannot_override_newer(self):
  h=new_file_content(self.sections[HELPER]).decode()
  for token in ('private revision = 0','return ++this.revision','this.revision++',
                'return revision === this.revision'):
   self.assertIn(token,h)
 def test_explicit_ui_error_retry_and_no_previous_lead_on_failure(self):
  page=self.sections[PAGE]
  for token in ('setLeads([])','setLoadError(true)','setLoading(true)',
                'requests.current.isCurrent(revision)', 'requests.current.invalidate()',
                'role="alert"','Retry loading','activeStatus.current = status',
                'fetchValidatedLeadList<LeadItem>(selectedStatus, fetch)'):
   self.assertIn(token,page)
 def test_auth_and_real_saved_data_not_modified(self):
  page=self.sections[PAGE]
  self.assertNotIn('-import { requireSaasAdminUser',page)
  self.assertNotIn('-export async function createApexLead',page)
  self.assertFalse(self.m['productionModified'])
 def test_exact_regression_suite_content(self):
  suite=new_file_content(self.sections[TEST])
  self.assertEqual(hashlib.sha256(suite).hexdigest(),self.m['sourceFileSha256'][TEST])
  for text in ('fast two-filter responses','authentication/storage failure',
               'HTTP200 application failure','network fetch','explicit loading/failure'):
   self.assertIn(text,suite.decode())
  self.assertEqual(self.m['focusedRequestsPassed'],9)
  self.assertEqual(self.m['allNodePassed'],82)
 def test_independently_certified_release_remains_off(self):
  self.assertFalse(self.m['signedCutoverAuthorized'])
  self.assertEqual(self.m['releaseStatus'],'NOT_PROMOTED')
  self.assertTrue(self.m['buildVerified'])
  self.assertEqual(self.m['buildExitCode'],0)
  self.assertEqual(self.m['privateBuildId'],'EssVp4cjPiD8Gtm8sSJtv')
  self.assertRegex(self.m['buildLogSha256'],r'^[a-f0-9]{64}$')
  self.assertTrue(self.m['typecheckAnd103Pages'])
  self.assertEqual(self.m['privateHttpPass'],8)
  self.assertRegex(self.m['privateHttpReceiptSha256'],r'^[a-f0-9]{64}$')
  self.assertEqual(self.m['latestCoreSource'],'2a3d5bac57decb4f9dc32fb97728b2403f82c7b6')
  self.assertEqual(self.m['latestCoreCompiledIndexSha256'],'d0de50ad2011ee3dc5532352788e1e1795a94cc6f49b90a84ed7c08994748d05')
  self.assertEqual(self.m['fullConnectPythonPass'],285)
  self.assertEqual(self.m['fullConnectPythonFailed'],0)
  self.assertTrue(self.m['baselinePageFailureConfirmed'])
  self.assertEqual(self.m['jointTechnicalPass'],13)
  self.assertEqual(self.m['jointTechnicalTotal'],15)
  self.assertEqual(self.m['independentSignedPass'],6)
  self.assertEqual(self.m['independentSignedTotal'],13)
  self.assertRegex(self.m['fourPhaseReceiptSha256'],r'^[a-f0-9]{64}$')
if __name__=='__main__':unittest.main()
