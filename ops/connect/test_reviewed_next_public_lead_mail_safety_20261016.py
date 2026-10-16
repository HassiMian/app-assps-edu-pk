"""Offline source-bound proof of the reviewed public APEX lead mail fix.

This verifies exact SHA-pinned Next source and executes only a pure HTML helper
in an isolated temporary directory. Never sends email or touches production.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_reviewed_next_csv_formula_20261016 import sections, new_file_content

ROOT=Path(__file__).resolve().parent/'recovery'
PATCH=ROOT/'reviewed-next-public-lead-mail-safety-20261016.patch'
MANIFEST=ROOT/'reviewed-next-public-lead-mail-safety-20261016.manifest.json'
PIN='85839bc4781513c98684a5d9c57f2e96b1d669296ff7f59ccb183569c08abeec'
HELPER='src/lib/server/apex-lead-html.ts'
TEST='tests/apex-public-lead-mail-safety.test.cjs'
MAIL='src/lib/server/mail.ts'
ROUTE='src/app/api/apex/leads/route.ts'
FILES={HELPER,TEST,MAIL,ROUTE}
def digest(data):
 return hashlib.sha256(data).hexdigest()

class ReviewedPublicLeadEmail(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=PATCH.read_bytes()
  cls.patch=sections(cls.raw.decode())
  cls.manifest=json.loads(MANIFEST.read_text())

 def test_immutable_patch_sha(self):
  self.assertEqual(digest(self.raw),PIN)
  self.assertEqual(self.manifest['patchSha256'],PIN)

 def test_exact_scope(self):
  self.assertEqual(set(self.patch),FILES)
  self.assertEqual(set(self.manifest['sourceFileSha256']),FILES)

 def test_source_commit_parent_and_child_exact(self):
  self.assertEqual(self.manifest['baseCommit'],'e0073349d2fc1ae1bda294b9b48f99392695f9b9')
  self.assertEqual(self.manifest['fixedCommit'],'9c2e34c2fe988cf01dd1a679f42654e278473f07')
  self.assertFalse(self.manifest['productionModified'])
  self.assertFalse(self.manifest['releaseAuthorized'])

 def test_new_html_helper_and_synthetic_test_byte_exact(self):
  for name in (HELPER,TEST):
   content=new_file_content(self.patch[name])
   self.assertEqual(digest(content),self.manifest['sourceFileSha256'][name],name)

 def test_admin_and_auto_reply_html_are_encoded(self):
  delta=self.patch[MAIL]
  for clause in ('escapeApexLeadHtml(name)', 'escapeApexLeadHtml(leadId)',
                 'escapeApexLeadHtml(type)', 'escapeApexLeadHtml(email)',
                 'escapeApexLeadHtml(phone)', 'escapeApexLeadHtml(schoolName)',
                 'escapeApexLeadHtml(notes)'):
   self.assertIn('+' if clause else '',delta)
   self.assertIn(clause,delta)

 def test_public_error_redaction_and_saved_lead_reliability(self):
  delta=self.patch[ROUTE]
  self.assertIn('const message = error instanceof Error ? error.message',delta)
  self.assertIn('message: "Unable to submit request"',delta)
  self.assertIn('message: "Invalid JSON request"',delta)
  self.assertIn('"APEX_LEAD_NOTIFICATION_FAILED"',delta)
  self.assertIn('Cache-Control',delta)
  self.assertIn('try {',delta)

 def test_pure_recovered_typescript_escaper_real_node(self):
  source=new_file_content(self.patch[HELPER])
  js="""
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {escapeApexLeadHtml:esc}=await import(pathToFileURL(process.argv[1]).href);
assert.equal(esc('<img src=x onerror="evil()">&'), '&lt;img src=x onerror=&quot;evil()&quot;&gt;&amp;');
assert.equal(esc('مدرسہ AL SIDDIQUE'),'مدرسہ AL SIDDIQUE');
assert.equal(esc("Tom's school"),"Tom&#39;s school");
"""
  with tempfile.TemporaryDirectory() as tmp:
   file=Path(tmp)/'apex-lead-html.ts'
   file.write_bytes(source)
   run=subprocess.run(['node','--experimental-strip-types','--input-type=module','-e',js,str(file)],
                      capture_output=True,text=True,timeout=20)
   self.assertEqual(run.returncode,0,run.stderr[-1200:])

 def test_build_provenance_is_qa_only(self):
  self.assertEqual(self.manifest['buildExitCode'],0)
  self.assertEqual(self.manifest['generatedStaticPages'],103)
  self.assertEqual(self.manifest['focusedNodeTestsPassed'],44)
  self.assertRegex(self.manifest['buildLogSha256'],r'^[a-f0-9]{64}$')
  self.assertRegex(self.manifest['privateBuildId'],r'^[A-Za-z0-9_-]{12,32}$')
  self.assertFalse(self.manifest['productionModified'])
  self.assertFalse(self.manifest['releaseAuthorized'])

if __name__=='__main__':
 unittest.main()
