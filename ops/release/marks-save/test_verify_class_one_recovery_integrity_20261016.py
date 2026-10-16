import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('p0',Path(__file__).with_name('verify_class_one_recovery_integrity_20261016.py'))
p0=importlib.util.module_from_spec(spec)
spec.loader.exec_module(p0)

def baseline():
 return {k:{'saved_rows':38,'genuine_zero_rows':int(k=='English'),'integrity_sha256':'a'*64} for k in p0.EXPECTED_SUBJECTS}

class IntegrityTests(unittest.TestCase):
 def test_unchanged(self):self.assertEqual(p0.verdict(baseline(),baseline()),'CLASS_ONE_EXISTING_MARKS_INTACT_NOT_RECOVERED')
 def test_score_changed(self):
  x=baseline();x['English']['integrity_sha256']='b'*64
  self.assertEqual(p0.verdict(baseline(),x),'HOLD_EXISTING_MARKS_CHANGED_REVIEW_REQUIRED')
 def test_row_deleted(self):
  x=baseline();x['English']['saved_rows']=37
  self.assertEqual(p0.verdict(baseline(),x),'HOLD_EXISTING_MARKS_CHANGED_REVIEW_REQUIRED')
 def test_genuine_zero_changed(self):
  x=baseline();x['English']['genuine_zero_rows']=2
  self.assertEqual(p0.verdict(baseline(),x),'HOLD_EXISTING_MARKS_CHANGED_REVIEW_REQUIRED')
 def test_missing_subject(self):
  x=baseline();del x['Science']
  self.assertEqual(p0.verdict(baseline(),x),'HOLD_INCOMPLETE_BASELINE')
 def test_valid_parse(self):
  lines='\n'.join(f"{k}|38|1|{'a'*64}" for k in sorted(p0.EXPECTED_SUBJECTS))
  self.assertEqual(len(p0.parse_snapshot(lines)),4)
 def test_rejects_untrusted_output(self):
  with self.assertRaises(ValueError):p0.parse_snapshot('English|38|1|fake\n')
 def test_rejects_duplicate(self):
  line=f"English|38|1|{'a'*64}"
  with self.assertRaises(ValueError):p0.parse_snapshot(line+'\n'+line)
 def test_rejects_extra_subject(self):
  line=f"Foreign|38|1|{'a'*64}"
  with self.assertRaises(ValueError):p0.parse_snapshot(line)
 def test_sql_is_read_only(self):
  upper=p0.SQL.upper()
  self.assertTrue(upper.strip().startswith('WITH NAMED AS'))
  for forbidden in (' INSERT ',' UPDATE ',' DELETE ',' DROP ',' ALTER ',' TRUNCATE '):
   self.assertNotIn(forbidden,upper)

if __name__=='__main__':unittest.main()
