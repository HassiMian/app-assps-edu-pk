import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_firstterm_snapshot_drift_readonly import compare
def row(marks='0.00',grade='F',total='50',status='SCORED'):
 return {'marks_obtained':marks,'total_marks':total,'grade':grade,'result_status':status}
class DriftSafetyTests(unittest.TestCase):
 def test_identical_score_and_grade_passes(self):
  self.assertTrue(compare({1:row()},{1:row()})['pass'])
 def test_zero_to_positive_requires_attribution_not_auto_reversion(self):
  r=compare({1:row()},{1:row('48.00','A+')})
  self.assertFalse(r['pass']);self.assertEqual(r['changed_results'],1)
  self.assertEqual(r['zero_to_positive'],1)
 def test_grade_only_drift_caught_without_marks_change(self):
  r=compare({1:row('50','D')},{1:row('50','A+')})
  self.assertEqual(r['grade_only'],1);self.assertFalse(r['pass'])
 def test_record_removed_or_inserted_fails_closed(self):
  self.assertFalse(compare({1:row()},{}).get('pass'))
