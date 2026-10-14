import importlib.util
from pathlib import Path
import unittest
path=Path(__file__).with_name('verify_exam9_active_roster_coverage_20261014.py')
spec=importlib.util.spec_from_file_location('roster_coverage',path)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class RosterCoverageTests(unittest.TestCase):
    def test_zero_marks_saved_is_not_missing(self):
        self.assertEqual(m.status(20,20),'ALL_CURRENT_ENROLLED_HAVE_SAVED_MARKS')
    def test_empty_subject_is_pending_not_numeric_zero(self):
        self.assertEqual(m.status(11,0),'NO_SAVED_MARKS_PENDING_REVIEW')
    def test_partial_offering(self):
        self.assertEqual(m.status(20,19),'PARTIAL_SAVED_MARKS_PENDING_REVIEW')
    def test_historic_empty_cohort_does_not_invent_missing_scores(self):
        self.assertEqual(m.status(0,0),'NO_CURRENT_ENROLLMENT_NOT_A_MISSING_SCORE')
    def test_bad_excess_rows_review(self):
        self.assertEqual(m.status(11,12),'EXCESS_SAVED_ROWS_REVIEW')
    def test_query_transaction_scoped_to_read_only_school_exam(self):
        self.assertIn('REPEATABLE READ READ ONLY',m.QUERY)
        self.assertIn('r.school_id=1 AND r.exam_id=9',m.QUERY)
        self.assertNotIn('UPDATE exam_results',m.QUERY)
        self.assertNotIn('INSERT INTO exam_results',m.QUERY)

if __name__=='__main__':unittest.main()
