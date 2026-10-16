"""Immutable safety contract for reviewed APEX SMTP fallback and delivery truth."""
import hashlib,json
from pathlib import Path
import unittest
from test_reviewed_next_csv_formula_20261016 import sections,new_file_content

ROOT=Path(__file__).resolve().parent/'recovery'
PATCH=ROOT/'reviewed-next-mail-privacy-20261016.patch'
MANIFEST=ROOT/'reviewed-next-mail-privacy-20261016.manifest.json'
PIN='814c7e296dcae6ca218a285b358d518a97200259ae73357918a586f950f70b38'
MAIL='src/lib/server/mail.ts'
APPROVAL='src/lib/server/subscription-request-approve.ts'
ROUTE='src/app/api/saas-admin/apex-leads/[leadId]/follow-up/route.ts'
TEST='tests/apex-smtp-fallback-secret-guard.test.cjs'

class MailPrivacyReview(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=PATCH.read_bytes();cls.parts=sections(cls.raw.decode());cls.manifest=json.loads(MANIFEST.read_text())
 def test_exact_sha_and_four_path_scope(self):
  self.assertEqual(hashlib.sha256(self.raw).hexdigest(),PIN)
  self.assertEqual(self.manifest['patchSha256'],PIN)
  self.assertEqual(set(self.parts),{MAIL,APPROVAL,ROUTE,TEST})
  self.assertEqual(set(self.manifest['changedFiles']),{MAIL,APPROVAL,ROUTE,TEST})
 def test_exact_source_chain(self):
  self.assertEqual(self.manifest['baseCommit'],'d2875c2fbcbc15df0da44eb966d32fd34dd04033')
  self.assertEqual(self.manifest['fixedCommit'],'1c6551241c9d04057c63e20cdd9c6283029ff5b8')
 def test_no_credentials_or_identity_in_fallback(self):
  s=self.parts[MAIL]
  self.assertIn('logEmailFallback("SMTP_NOT_CONFIGURED")',s)
  self.assertIn('MailFallbackReason',s)
  self.assertIn('mode: 0o700',s)
  self.assertIn('mode: 0o600',s)
  self.assertNotIn('+    logEmailFallback(subject,',s)
  self.assertNotIn('+    logEmailFallback("APEX LEAD",',s)
  self.assertNotIn('+    logEmailFallback("PAYMENT CONFIRMED",',s)
 def test_delivery_must_fail_when_smtp_unavailable(self):
  self.assertIn('throw new Error("APEX_CREDENTIAL_EMAIL_NOT_DELIVERED")',self.parts[MAIL])
  self.assertIn('if (!delivered)',self.parts[MAIL])
  s=self.parts[APPROVAL]
  self.assertIn('console.error("[approve] credentials email failed")',s)
  self.assertNotIn('+      console.error("[approve] credentials email failed:", emailErr)',s)
 def test_followup_reports_truth_and_no_store(self):
  s=self.parts[ROUTE]
  self.assertIn('success: sent',s)
  self.assertIn('emailSent: sent',s)
  self.assertIn('Follow-up email not sent: SMTP is not configured',s)
  self.assertIn('"Cache-Control": "no-store"',s)
 def test_exact_mocked_delivery_test_bytes(self):
  b=new_file_content(self.parts[TEST])
  self.assertEqual(hashlib.sha256(b).hexdigest(),self.manifest['sourceFileSha256'][TEST])
  for key in ('SMTP missing fails credentials', 'configured mocked SMTP','missing payment admin recipient',
              'follow-up no SMTP truthfully reports', 'follow-up invalid ID/unauthorized actor'):
   self.assertIn(key,b.decode())
  self.assertEqual(self.manifest['preFixFocusedFailed'],9)
  self.assertEqual(self.manifest['focusedTestPassed'],10)
  self.assertEqual(self.manifest['allNextNodeTestsPassed'],103)
 def test_never_self_certify_or_touch_real_logs(self):
  self.assertFalse(self.manifest['actualProductionChanged'])
  self.assertFalse(self.manifest['releaseAuthorized'])
  self.assertFalse(self.manifest['historicEmailLogInspected'])
  self.assertFalse(self.manifest['liveSchoolCredentialsUsed'])
  self.assertEqual(self.manifest['fallbackPrivacyMode'],'metadata_only')
  self.assertTrue(self.manifest['optimizedPrivateBuildVerified'])
  self.assertEqual(self.manifest['optimizedPrivateBuildExit'],0)
  self.assertEqual(self.manifest['privateBuildId'],'0A9A6B-nhFBzGnUTHvnMx')
  self.assertRegex(self.manifest['privateBuildLogSha256'],r'^[0-9a-f]{64}$')
  self.assertTrue(self.manifest['typecheckAnd103StaticPages'])
  self.assertTrue(self.manifest['postbuildNormalized'])
  self.assertEqual(self.manifest['actualPrivateHttpPassed'],9)
  self.assertRegex(self.manifest['privateHttpReceiptSha256'],r'^[0-9a-f]{64}$')
  self.assertEqual(self.manifest['completePythonTestsPassed'],301)
  self.assertEqual(self.manifest['latestGateCoreCommit'],'86a675890620ebb315af17dcd063cc09b0eed89e')
  self.assertEqual(self.manifest['jointCandidateChecksPassed'],13)
  self.assertEqual(self.manifest['jointCandidateChecksTotal'],15)
  self.assertEqual(self.manifest['independentSignedChecksPassed'],6)
  self.assertEqual(self.manifest['independentSignedChecksTotal'],13)
  self.assertEqual(self.manifest['latestGateResult'],'HOLD_NO_PRODUCTION_CUTOVER')
  self.assertFalse(self.manifest['liveDataModified'])
if __name__=='__main__':unittest.main()
