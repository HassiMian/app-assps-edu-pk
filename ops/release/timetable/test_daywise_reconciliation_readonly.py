#!/usr/bin/env python3
"""Synthetic-only live-day timetable comparison checks; never contacts DB."""
import importlib.util
import pathlib
import unittest

SCRIPT=pathlib.Path(__file__).with_name('audit_daywise_reconciliation_readonly.py')
spec=importlib.util.spec_from_file_location('day_audit',SCRIPT)
audit=importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

def fixture():
 rows=[]
 for day in audit.DAYS:
  bells=audit.SOURCE['friday_bells'] if day=='Friday' else audit.SOURCE['regular_bells']
  for cohort in audit.SOURCE['allocations']:
   for period in cohort['periods']:
    b=next(x for x in bells if x['label']==f"Period {period['period']}")
    rows.append({'day_name':day,'class_name':cohort['class_name'],
      'section':cohort['section'],'period_label':f"Period {period['period']}",
      'subject':period['subject'],'teacher_display_name':period['teacher_display_name'],
      'start_time':b['start'],'end_time':b['end'],
      'source_sha256':audit.SOURCE['source_pdf_sha256'],
      'has_teacher_id':True,'reviewed':False})
  for name in ('Assembly',) if day=='Friday' else ('Assembly','Break'):
   b=next(x for x in bells if x['label']==name)
   rows.append({'day_name':day,'class_name':'School-wide','section':None,
    'period_label':name,'subject':name,'teacher_display_name':'',
    'start_time':b['start'],'end_time':b['end'],
    'source_sha256':audit.SOURCE['source_pdf_sha256'],
    'has_teacher_id':False,'reviewed':False})
 return rows
class DaywiseTests(unittest.TestCase):
 def test_correct_six_day_source_has_zero_mismatches(self):
  r=audit.evaluate(fixture(),0)
  self.assertEqual(r['new_day_rows'],347)
  self.assertEqual(r['missing_day_slots'],0)
  self.assertEqual(r['content_mismatches'],0)
  self.assertEqual(r['bell_mismatches'],0)
  self.assertEqual(r['source_hash_mismatches'],0)
  self.assertEqual(r['structure_anomalies'],0)
  self.assertFalse(r['permission_grants_authorized'])
 def test_school_friday_is_break_free(self):
  r=audit.evaluate(fixture(),0)
  self.assertEqual(r['days']['Friday']['school_wide_rows'],1)
  self.assertEqual(r['days']['Monday']['school_wide_rows'],2)
 def test_print_source_teacher_display_deviation_is_detected(self):
  x=fixture()
  row=next(z for z in x if z['day_name']=='Friday' and z['class_name']=='Nine'
           and z['section']=='Fatima' and z['period_label']=='Period 7')
  row['teacher_display_name']='OTHER_LABEL'
  r=audit.evaluate(x,0)
  self.assertEqual(r['content_mismatches'],1)
 def test_source_hash_drift_and_timing_errors_are_detected(self):
  x=fixture()
  z=next(z for z in x if z['day_name']=='Monday' and z['period_label']=='Period 1')
  z['source_sha256']='OLD_SHA';z['start_time']='08:15'
  r=audit.evaluate(x,0)
  self.assertEqual(r['source_hash_mismatches'],1)
  self.assertEqual(r['bell_mismatches'],1)
 def test_no_auto_release_even_if_reference_equals_source(self):
  r=audit.evaluate(fixture(),56)
  self.assertEqual(r['status'],'HOLD_UNTIL_SOURCE_AND_ASSIGNMENT_CERTIFICATION')
  self.assertFalse(r['production_mutation_authorized'])
if __name__=='__main__':unittest.main(verbosity=2)
