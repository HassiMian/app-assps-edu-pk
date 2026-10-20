"""Hermetic collision scope rules. Never opens the live timetable."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_timetable_collision_scope_readonly as checker

GOOD={
 'active_session_groups':42,'active_session_rows':336,'incomplete_day_sessions':0,
 'unscoped_active_rows':0,'active_null_teacher_rows':0,'invalid_period_labels':0,
 'all_multi_class_teacher_slots':12,'known_four_five_shared_slots':12,
 'unapproved_teacher_collisions':0,
}

class TimetableCollisionTests(unittest.TestCase):
 def data(self,d=GOOD):return '\n'.join(f'{key}|{value}' for key,value in d.items())
 def test_structural_counts_are_not_full_certification(self):
  r=checker.classify(checker.parse(self.data()))
  self.assertTrue(r['structural_timetable_valid'])
  self.assertIn('NOT_LIVE_TEACHER_OR_ACADEMIC_SIGNOFF',r['interpretation'])
 def test_synthetic_cross_class_collision_holds(self):
  x=dict(GOOD,all_multi_class_teacher_slots=13,unapproved_teacher_collisions=1)
  self.assertFalse(checker.classify(checker.parse(self.data(x)))['structural_timetable_valid'])
 def test_incomplete_daily_periods_hold(self):
  for col in ('incomplete_day_sessions','unscoped_active_rows','active_null_teacher_rows','invalid_period_labels'):
   x=dict(GOOD,**{col:1})
   self.assertFalse(checker.classify(x)['structural_timetable_valid'],col)
 def test_fewer_rows_or_sessions_hold(self):
  for col,val in [('active_session_rows',335),('active_session_groups',41)]:
   self.assertFalse(checker.classify(dict(GOOD,**{col:val}))['structural_timetable_valid'])
 def test_incoherent_collision_split_fails(self):
  x=dict(GOOD,known_four_five_shared_slots=11)
  with self.assertRaises(ValueError):checker.parse(self.data(x))
 def test_invalid_and_duplicate_evidence_fails(self):
  for raw in ('',self.data()+'\nunknown|1',self.data()+'\nactive_session_rows|336',self.data().replace('42','-1',1)):
   with self.assertRaises(ValueError):checker.parse(raw)
 def test_sql_no_mutations_and_null_safe_exception(self):
  sql=checker.SQL.upper()
  self.assertIn('BEGIN TRANSACTION READ ONLY;',sql)
  self.assertIn("COALESCE(SECTION='BLUE',FALSE)",sql)
  self.assertIn('COUNT(DISTINCT',sql)
  self.assertIn("CLASS_NAME IN ('FOUR','FIVE')",sql)
  for unsafe in ('UPDATE ','DELETE ','TRUNCATE ','INSERT INTO ','ALTER TABLE '):
   self.assertNotIn(unsafe,sql)

if __name__=='__main__':unittest.main()
