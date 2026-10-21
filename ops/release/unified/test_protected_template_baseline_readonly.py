"""Hermetic protected template fingerprint and path security unit tests."""
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_protected_template_baseline_readonly as subject

class ProtectedTemplateBaselineTests(unittest.TestCase):
 def test_parse_manifest_accepts_valid_digest(self):
  raw='a'*64+'  al-siddique-frontend/src/a.jsx'
  self.assertEqual(len(subject.parse_manifest(raw)),1)
 def test_reject_empty_duplicate_and_untrusted_paths(self):
  valid='a'*64+'  al-siddique-frontend/src/a.jsx'
  for raw in ('',valid+'\n'+valid,'garbage',
              'a'*64+'  /var/backups/file',
              'a'*64+'  al-siddique-frontend/../../etc/passwd',
              'a'*64+'  backend/file'):
   with self.assertRaises(ValueError):subject.parse_manifest(raw)
 def test_matches_known_file_without_changing_source(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);file=root/'al-siddique-frontend/src/template.jsx'
   file.parent.mkdir(parents=True)
   file.write_text('verified unchanged source')
   digest=hashlib.sha256(file.read_bytes()).hexdigest()
   manifest=root/'checks.txt'
   manifest.write_text(f'{digest}  al-siddique-frontend/src/template.jsx\n')
   r=subject.inspect(root,manifest)
   self.assertTrue(r['protected_template_baseline_intact'])
   self.assertEqual(r['unchanged_protected_files'],1)
 def test_changed_source_must_be_held_not_rebaselined(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);file=root/'al-siddique-frontend/src/template.jsx'
   file.parent.mkdir(parents=True)
   file.write_text('new layout')
   manifest=root/'checks.txt'
   manifest.write_text('a'*64+'  al-siddique-frontend/src/template.jsx\n')
   r=subject.inspect(root,manifest)
   self.assertFalse(r['protected_template_baseline_intact'])
   self.assertEqual(r['changed_paths'],['al-siddique-frontend/src/template.jsx'])
   self.assertEqual(file.read_text(),'new layout')
 def test_missing_template_does_not_pass(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);manifest=root/'checks.txt'
   manifest.write_text('a'*64+'  al-siddique-frontend/src/missing.jsx\n')
   r=subject.inspect(root,manifest)
   self.assertEqual(len(r['missing_paths']),1)
   self.assertFalse(r['protected_template_baseline_intact'])
 def test_missing_manifest_is_not_a_clean_baseline(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(RuntimeError):subject.inspect(Path(d))

if __name__=='__main__':unittest.main()
