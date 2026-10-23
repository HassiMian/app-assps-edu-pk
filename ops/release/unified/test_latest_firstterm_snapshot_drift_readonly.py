import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_latest_firstterm_snapshot_drift_readonly import inspect
def row(mark='0',grade='F'):
    return {'id':'101','marks_obtained':mark,'total_marks':'50','grade':grade,'result_status':'SCORED'}
class RollingOriginalResultProtectionTests(unittest.TestCase):
 def test_identical_saved_rows_pass(self):
  d=inspect(backup={101:row()},live={101:row()},verified_backup_digest=True)
  self.assertTrue(d['pass'])
  self.assertFalse(d['immutable_approved_baseline'])
 def test_zero_to_positive_always_holds(self):
  d=inspect(backup={101:row()},live={101:row('25')},verified_backup_digest=True)
  self.assertFalse(d['pass'])
  self.assertEqual(d['zero_to_positive'],1)
 def test_grade_only_change_holds(self):
  d=inspect(backup={101:row()},live={101:row('0','B')},verified_backup_digest=True)
  self.assertFalse(d['pass'])
  self.assertEqual(d['grade_only'],1)
 def test_missing_verified_backup_never_passes(self):
  self.assertFalse(inspect(backup={101:row()},live={101:row()},verified_backup_digest=False)['pass'])
 def test_row_deletion_never_passes(self):
  self.assertFalse(inspect(backup={101:row()},live={},verified_backup_digest=True)['pass'])
