import importlib.util
import unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
s=importlib.util.spec_from_file_location('audit',HERE/'audit_teacher_delivery_readonly.py')
m=importlib.util.module_from_spec(s)
s.loader.exec_module(m)
BASE={'scheduled_user_ids':12,'cross_checked_user_employee_links':12,
 'formally_assigned_teacher_accounts':0,'active_teacher_accounts':19,
 'saved_lesson_plans':3,'student_parent_shared_plan_records':0,
 'formal_active_assignments':0,'daywise_teaching_slots':336}
class TeacherReadinessTest(unittest.TestCase):
 def test_current_delivery_blocks(self):
  r=m.decision(BASE)
  self.assertIn('NO_VERIFIED_TEACHER_CLASS_ASSIGNMENTS',r['blockers'])
  self.assertIn('NO_ELIGIBLE_ASSIGNED_TEACHER_ACCOUNTS',r['blockers'])
  self.assertFalse(r['can_auto_assign_or_publish'])
 def test_no_module_grant_even_with_complete_synthetic_links(self):
  d={**BASE,'formal_active_assignments':12,
     'formally_assigned_teacher_accounts':12,
     'student_parent_shared_plan_records':12}
  r=m.decision(d)
  self.assertEqual(r['status'],'HOLD')
  self.assertTrue(r['academic_approval_required'])
  self.assertFalse(r['can_auto_assign_or_publish'])
 def test_user_employee_link_gap(self):
  d={**BASE,'cross_checked_user_employee_links':5}
  self.assertIn('TIMETABLE_USER_EMPLOYEE_LINK_GAP',m.decision(d)['blockers'])
 def test_missing_saved_plans(self):
  d={**BASE,'saved_lesson_plans':0}
  self.assertIn('NO_SAVED_LESSON_PLANS',m.decision(d)['blockers'])
 def test_bad_numbers_denied(self):
  for n in [-1,'10',None]:
   d={**BASE,'scheduled_user_ids':n}
   with self.assertRaises(ValueError):m.decision(d)
 def test_sql_read_only_and_no_student_details(self):
  self.assertIn('BEGIN READ ONLY',m.SQL)
  self.assertIn('COMMIT',m.SQL)
  for op in ['INSERT INTO','UPDATE public.','DELETE FROM','TRUNCATE']:
   self.assertNotIn(op,m.SQL)
  for key in ['password_hash','student_name','email']:
   self.assertNotIn(key,m.SQL)
if __name__=='__main__':unittest.main()
