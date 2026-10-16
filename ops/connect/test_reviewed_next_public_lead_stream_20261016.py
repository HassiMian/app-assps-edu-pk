"""Fail-closed offline review of exact public APEX lead streaming boundary patch.

Source integrity only; production release still requires independent signed gates.
"""
import hashlib
import json
from pathlib import Path
import unittest
from test_reviewed_next_csv_formula_20261016 import sections

REC=Path(__file__).resolve().parent/'recovery'
PATCH=REC/'reviewed-next-public-lead-stream-20261016.patch'
MANIFEST=REC/'reviewed-next-public-lead-stream-20261016.manifest.json'
PIN='868b5d79390192d339d9cf6f2c9b400e3723f1ed787ca9a8419d8b75f658adc4'
ROUTE='src/app/api/apex/leads/route.ts'
TEST='tests/apex-public-lead-mail-safety.test.cjs'

class ReviewedPublicLeadStream(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw=PATCH.read_bytes()
        cls.patch=sections(cls.raw.decode())
        cls.manifest=json.loads(MANIFEST.read_text())

    def test_pin_and_source_scope(self):
        self.assertEqual(hashlib.sha256(self.raw).hexdigest(),PIN)
        self.assertEqual(self.manifest['patchSha256'],PIN)
        self.assertEqual(set(self.patch),{ROUTE,TEST})
        self.assertEqual(set(self.manifest['changedFiles']),{ROUTE,TEST})
        self.assertEqual(set(self.manifest['sourceFileSha256']),{ROUTE,TEST})

    def test_exact_standalone_source_parent_and_commit(self):
        self.assertEqual(self.manifest['baseCommit'],'c47edc0c8bf18d93a7b4daecd15ffc12f1ba47b9')
        self.assertEqual(self.manifest['fixedCommit'],'b5b5e904e8e00aa5cfaf88aa00dc395047e24a7f')

    def test_byte_cap_and_decoder(self):
        route=self.patch[ROUTE]
        for expected in ('MAX_PUBLIC_LEAD_BODY_BYTES = 65_536',
                         'req.body.getReader()', 'value.byteLength',
                         'reader.cancel()', 'TextDecoder("utf-8", { fatal: true })',
                         'readBoundedPublicLeadJson(req)', 'PublicLeadPayloadTooLarge'):
            self.assertIn(expected,route)
        self.assertEqual(self.manifest['streamBodyBytesMax'],65_536)

    def test_reject_before_storage(self):
        route=self.patch[ROUTE]
        self.assertIn('throw new PublicLeadPayloadTooLarge()',route)
        self.assertIn('rejectPublicLead("Request too large", 413)',route)
        self.assertIn('throw new SyntaxError("Invalid JSON request")',route)
        self.assertIn('"content-length"',route)

    def test_relevant_synthetic_negative_cases(self):
        suite=self.patch[TEST]
        for expected in ('raw upload larger', 'declared large content-length',
                         'incorrectly declared short length', 'malformed content-length',
                         'multipart chunk transport', 'malformed UTF-8',
                         'valid streamed JSON with multilingual'):
            self.assertIn(expected,suite)
        self.assertIn('assert.equal(h.calls.save,0)',suite)
        self.assertEqual(self.manifest['focusedNodeTestsPassed'],47)

    def test_absence_of_false_release_attestation(self):
        m=self.manifest
        self.assertFalse(m['productionModified'])
        self.assertFalse(m['protectedDataTouched'])
        self.assertFalse(m['releaseAuthorized'])
        self.assertTrue(m['optimizedBuildVerified'])
        self.assertEqual(m['optimizedBuildExitCode'],0)
        self.assertTrue(m['scopedESLintRerunVerified'])
        self.assertEqual(m['generatedStaticPages'],103)
        self.assertEqual(m['fullConnectPythonPassed'],251)
        self.assertEqual(m['fullConnectPythonFailed'],0)
        self.assertRegex(m['privateBuildId'], r'^[A-Za-z0-9_-]{12,32}$')
        self.assertRegex(m['buildLogSha256'], r'^[a-f0-9]{64}$')
        self.assertTrue(m['loopbackPrivateHttpVerified'])
        self.assertEqual(m['privateHttpCasesPassed'],8)
        self.assertRegex(m['privateHttpReceiptSha256'],r'^[a-f0-9]{64}$')
        self.assertEqual(m['newestPinnedCoreCommit'],'4397a1836fedff3cba6a1062ed85b7c25e5388c6')
        self.assertEqual(m['newestPinnedCoreDistHtmlSha256'],'1097d23897e1bc507a111c4c202aba47a54960e27cf62f34234f95e32e0c26e3')
        self.assertEqual(m['newestCoreIndependentBuildExitCode'],0)
        self.assertEqual(m['coreOfficialSecurityCheckPass'],6)
        self.assertEqual(m['coreOfficialSecurityCheckTotal'],13)
        self.assertFalse(m['protectedReleaseAuthorized'])
        self.assertEqual(m['deploymentStatus'],'SOURCE_ONLY_QA_NOT_PROMOTED')

if __name__=='__main__':
    unittest.main()
