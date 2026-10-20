"""Pure metadata-only lesson matching and zero-guessing coverage tests."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_lesson_coverage_readonly as checker

DATA='''GRANT|Five|Blue|Social Studies
GRANT|Six|Blue|Science
GRANT|Nine|Usman|Computer Science
PLAN|5|Social Studies|false|term
PLAN|6|مطالعہ پاکستان|false|term
PLAN|Primary|Urdu / General Curriculum|false|term'''

class LessonCoverageTests(unittest.TestCase):
 def test_current_metadata_matching_is_not_approval(self):
  g,p=checker.parse(DATA)
  r=checker.classify(g,p)
  self.assertEqual(r['official_active_subject_groups'],3)
  self.assertEqual(r['exact_class_subject_candidate_matches'],1)
  self.assertEqual(r['without_exact_class_subject_plan'],2)
  self.assertEqual(r['unmapped_or_broad_plan_headings'],2)
  self.assertEqual(r['published_plan_rows'],0)
  self.assertFalse(r['lesson_coverage_certified'])
  self.assertFalse(r['section_level_coverage_certified'])
 def test_all_matching_plans_still_need_academic_approval(self):
  g,p=checker.parse('GRANT|Five|Blue|Social Studies\nPLAN|5|social studies|true|term')
  r=checker.classify(g,p)
  self.assertEqual(r['without_exact_class_subject_plan'],0)
  self.assertEqual(r['published_plan_rows'],1)
  self.assertFalse(r['academic_content_approval_certified'])
  self.assertFalse(r['lesson_coverage_certified'])
 def test_class_aliases_and_whitespace(self):
  self.assertEqual(checker.class_key('Class Five'),'5')
  self.assertEqual(checker.class_key('Grade 6'),'6')
  self.assertEqual(checker.class_key('Pre-Nine'),'pre-nine')
  self.assertEqual(checker.subject_key('Social  Studies'),'social studies')
 def test_broad_primary_plan_not_assumed_to_cover_each_class(self):
  g,p=checker.parse('GRANT|Five|Blue|Urdu\nPLAN|Primary|Urdu|false|term')
  self.assertEqual(checker.classify(g,p)['exact_class_subject_candidate_matches'],0)
 def test_plan_has_no_section_cannot_certify_section(self):
  g,p=checker.parse('GRANT|Five|Blue|Urdu\nGRANT|Five|Green|Urdu\nPLAN|5|Urdu|false|term')
  r=checker.classify(g,p)
  self.assertEqual(r['exact_class_subject_candidate_matches'],2)
  self.assertFalse(r['section_level_coverage_certified'])
 def test_unauthorized_or_malformed_metadata_rejected(self):
  for raw in ('','PLAN|5|English|false|term','GRANT|Five||Urdu',
              'GRANT|Five|Blue|Urdu\nGRANT|Five|Blue|Urdu',
              'GRANT|Five|Blue|Urdu\nPLAN|Five|Urdu|unknown|term',
              'GRANT|Five|Blue|Urdu\nSOMETHING|x'):
   with self.assertRaises(ValueError):checker.parse(raw)
 def test_sql_is_explicitly_read_only(self):
  self.assertIn('BEGIN TRANSACTION READ ONLY;',checker.SQL)
  self.assertIn("school_id=1",checker.SQL)
  for unsafe in ('UPDATE PUBLIC.','DELETE FROM ','TRUNCATE ','INSERT INTO ','ALTER TABLE '):
   self.assertNotIn(unsafe,checker.SQL.upper())

if __name__=='__main__':unittest.main()
