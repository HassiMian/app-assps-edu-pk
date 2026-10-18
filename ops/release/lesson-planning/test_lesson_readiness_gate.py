#!/usr/bin/env python3
"""Pure source-policy tests; synthetic counts only; no production connections."""
import importlib.util
import pathlib
import unittest

ROOT=pathlib.Path(__file__).parent
spec=importlib.util.spec_from_file_location('lesson_readiness_gate',ROOT/'lesson_readiness_gate.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class GateTests(unittest.TestCase):
 def source(self,blocked=59,signed=0):
  return {'source_candidates':59,'blocked_candidates':blocked,
   'signed_candidates':signed,'review_required_candidates':blocked,'class_one_image_weeks':18}
 def database(self,saved=3,shared=0,active=19,access=17,links=0,reviewed=0,scheduled_without=0):
  return {'saved':saved,'shared':shared,'teacher_owned':saved,
   'active_teachers':active,'paper_access_teachers':access,
   'scheduled_distinct_teachers':12,'scheduled_teachers_without_paper':scheduled_without,
   'active_teacher_class_assignments':links,'linked_teacher_accounts':links,
   'teaching_slots':56,'mapped_teacher_slots':43,'reviewed_teacher_slots':reviewed,
   'reference_only_evidence':56}
 def http(self,branding=404,lesson=401):
  return {'branding':branding,'lesson_anonymous':lesson}
 def test_actual_shape_hold_and_five_blockers(self):
  r=mod.evaluate(self.source(),self.database(),self.http())
  self.assertEqual(r['status'],'HOLD')
  self.assertEqual(len(r['blockers']),5)
  self.assertFalse(r['can_auto_publish'])
 def test_all_green_is_still_not_automatic_publication(self):
  r=mod.evaluate(self.source(0,59),self.database(shared=3,access=19,links=19,reviewed=56),self.http(200))
  self.assertEqual(r['status'],'REQUIRES_AUTHENTICATED_ACCEPTANCE')
  self.assertFalse(r['can_auto_publish'])
  self.assertTrue(r['requires_teacher_school2_browser_acceptance'])
 def test_unauthorized_anonymous_access_is_explicit_blocker(self):
  r=mod.evaluate(self.source(0,59),self.database(shared=3,access=19,links=19,reviewed=56),self.http(200,200))
  self.assertIn('ANONYMOUS_LESSON_ACCESS_UNEXPECTED',r['blockers'])
 def test_scheduled_teacher_missing_permission_blocks_without_grant(self):
  r=mod.evaluate(self.source(0,59),self.database(shared=3,access=18,links=18,reviewed=56,scheduled_without=1),self.http(200))
  self.assertIn('SCHEDULED_TEACHER_PAPER_PERMISSION_MISSING',r['blockers'])
  self.assertNotIn('teacher_account_ids',r)
 def test_unscheduled_teacher_missing_permission_is_not_release_blocker(self):
  r=mod.evaluate(self.source(0,59),self.database(shared=3,access=17,links=19,reviewed=56,scheduled_without=0),self.http(200))
  self.assertNotIn('SCHEDULED_TEACHER_PAPER_PERMISSION_MISSING',r['blockers'])
  self.assertEqual(r['status'],'REQUIRES_AUTHENTICATED_ACCEPTANCE')
 def test_schedule_reference_only_is_not_employee_authorization(self):
  r=mod.evaluate(self.source(0,59),self.database(shared=3,access=19,links=19,reviewed=0),self.http(200))
  self.assertIn('TIMETABLE_STAFF_IDENTITY_NOT_CERTIFIED',r['blockers'])
  self.assertEqual(r['reference_only_evidence'],56)
 def test_zero_active_teacher_assignments_is_a_release_blocker(self):
  r=mod.evaluate(self.source(0,59),self.database(shared=3,access=19,links=0,reviewed=56),self.http(200))
  self.assertIn('TEACHER_CLASS_ASSIGNMENTS_MISSING',r['blockers'])
  self.assertEqual(r['linked_teacher_accounts'],0)
 def test_unsigned_academic_candidates_fail_closed(self):
  r=mod.evaluate(self.source(0,0),self.database(shared=3,access=19,links=19,reviewed=56),self.http(200))
  self.assertIn('ACADEMIC_PUBLICATION_HOLD',r['blockers'])
 def test_sql_is_read_only_and_no_private_rows(self):
  sql=mod.QUERY.lower()
  self.assertIn('begin read only',sql)
  self.assertIn('count(*)',sql)
  self.assertNotIn('select *',sql)
  for verb in ['insert into','update public.','delete from','truncate ','grant ']:
   self.assertNotIn(verb,sql)
if __name__=='__main__':unittest.main(verbosity=2)
