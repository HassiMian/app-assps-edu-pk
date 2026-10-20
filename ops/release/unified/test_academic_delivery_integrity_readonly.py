"""Hermetic tests that never contact the school's PostgreSQL data."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_academic_delivery_integrity_readonly as checker

EXPECTED={'official_grants':54,'unauthorized_grants':0,'duplicate_grants':0,
 'timetable_subject_groups':64,'granted_subject_groups':54,'grant_timetable_matches':54,
 'matched_null_teacher_groups':11,'mismatched_nonnull_teacher_groups':0,
 'unmatched_blank_section_subject_groups':8,'unmatched_nonblank_teaching_groups':0,
 'unmatched_schoolwide_groups':2,'lesson_plans':3,'published_lesson_plans':0}

class AcademicDeliveryTests(unittest.TestCase):
    def lines(self, values=EXPECTED):
        return '\n'.join(f'{key}|{value}' for key,value in values.items())
    def test_sql_fence_is_explicitly_read_only(self):
        self.assertIn('BEGIN TRANSACTION READ ONLY;',checker.SQL)
        for unsafe in ('UPDATE ', 'DELETE ', 'TRUNCATE ', 'INSERT INTO ', 'CREATE TABLE ', 'ALTER TABLE '):
            self.assertNotIn(unsafe,checker.SQL.upper())

    def test_production_like_counts_are_evidence_not_certification(self):
        report=checker.classify(checker.parse(self.lines()))
        self.assertTrue(report['pass'])
        self.assertFalse(report['teacher_identity_complete'])
        self.assertFalse(report['teaching_sections_complete'])
        self.assertFalse(report['lesson_publication_observed'])
        self.assertFalse(report['lesson_coverage_certified'])
    def test_complete_teacher_reference_requires_no_nulls(self):
        values=dict(EXPECTED, matched_null_teacher_groups=0)
        self.assertTrue(checker.classify(values)['teacher_identity_complete'])
    def test_unapproved_and_duplicate_grants_fail(self):
        for key in ('unauthorized_grants','duplicate_grants','mismatched_nonnull_teacher_groups'):
            values=dict(EXPECTED, **{key:1})
            self.assertFalse(checker.classify(values)['pass'])
    def test_malformed_or_missing_report_rejected(self):
        for raw in ('bad record', self.lines()+'\nunknown|1',
                    self.lines()+'\nofficial_grants|54',
                    self.lines().replace('official_grants|54','official_grants|-1'),
                    self.lines().replace('published_lesson_plans|0','')):
            with self.assertRaises(ValueError):checker.parse(raw)
    def test_wrong_join_totals_rejected(self):
        values=dict(EXPECTED,timetable_subject_groups=63)
        with self.assertRaises(ValueError):checker.parse(self.lines(values))
    def test_extra_classes_without_section_must_hold(self):
        values=dict(EXPECTED,unmatched_blank_section_subject_groups=0,
                    unmatched_nonblank_teaching_groups=8)
        r=checker.classify(values)
        self.assertTrue(r['pass']);self.assertFalse(r['teaching_sections_complete'])
    def test_publication_not_academic_approval(self):
        values=dict(EXPECTED,published_lesson_plans=3)
        r=checker.classify(values)
        self.assertTrue(r['lesson_publication_observed'])
        self.assertFalse(r['lesson_coverage_certified'])

if __name__=='__main__':unittest.main()
