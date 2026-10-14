import pathlib
import unittest

SQL = (pathlib.Path(__file__).parent / '005_reviewed_reference_identity_link_20261014.sql').read_text()

class TimetableReferenceGuardTests(unittest.TestCase):
    def test_exact_original_and_current_year_provenance(self):
        self.assertIn("263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589", SQL)
        self.assertIn("e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724", SQL)
        self.assertIn("2026–27", SQL)
        self.assertIn("2024-25", SQL)
        self.assertIn("n_all<>58 OR n_photo<>42 OR n_ix<>16", SQL)

    def test_incomplete_staff_unapproved_and_homonyms_blocked(self):
        self.assertIn("unique_active_givenname", SQL)
        self.assertIn("unique_active_fullname", SQL)
        self.assertNotIn("'provisional_active_name_inactive_homonym'", SQL)
        self.assertIn("u.role='teacher'", SQL)
        self.assertIn("u.is_active=true", SQL)
        self.assertIn("e.is_active=true", SQL)
        self.assertIn("t.teacher_id IS NULL", SQL)
        self.assertNotIn("SET staff_identity_reviewed=true", SQL)
        self.assertNotIn("UPDATE public.teacher_class_assignments", SQL)
        self.assertNotIn("INSERT INTO public.teacher_class_assignments", SQL)

    def test_sections_and_unmapped_pre_nine_preserved(self):
        self.assertIn("class_name IN ('Four','Five','Six','Seven')", SQL)
        self.assertIn("min(section)='Blue'", SQL)
        self.assertIn("n_blue<>32 OR n_linked<>43 OR n_reviewed<>0 OR n_grants<>0 OR n_preserved<>8", SQL)
        self.assertIn("class_name='Pre-Nine'", SQL)
        self.assertNotIn("UPDATE public.students", SQL)

    def test_transaction_aborts_on_changed_live_data(self):
        self.assertIn("BEGIN;", SQL)
        self.assertIn("SET LOCAL lock_timeout", SQL)
        self.assertIn("SET LOCAL statement_timeout", SQL)
        self.assertIn("RAISE EXCEPTION", SQL)
        self.assertTrue(SQL.rstrip().endswith("COMMIT;"))

if __name__ == '__main__':
    unittest.main()
