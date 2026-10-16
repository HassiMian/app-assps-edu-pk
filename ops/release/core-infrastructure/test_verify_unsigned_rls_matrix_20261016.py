#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name("verify_unsigned_rls_matrix_20261016.py")
spec=importlib.util.spec_from_file_location("matrix",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class NegativeMatrixTests(unittest.TestCase):
    def test_valid_allow_zero(self):
        self.assertEqual(m.classify("r",0,"r\n0\n",""),"DENIED_RLS_ZERO")
    def test_valid_permission_denied(self):
        self.assertEqual(m.classify("r",3,"r\n","ERROR: 42501 permission denied"),"DENIED_PRIVILEGE")
    def test_unauthorized_role_is_rejected(self):
        self.assertEqual(m.classify("r",0,"postgres\n0\n",""),"HOLD_IDENTITY")
    def test_nonzero_rows_are_fail_closed(self):
        self.assertEqual(m.classify("r",0,"r\n1\n",""),"HOLD_VISIBILITY_OR_ERROR")
    def test_unrelated_error_is_fail_closed(self):
        self.assertEqual(m.classify("r",3,"r\n","ERROR: 42P01 unknown table"),"HOLD_VISIBILITY_OR_ERROR")
    def test_no_role_output_is_fail_closed(self):
        self.assertEqual(m.classify("r",3,"","ERROR: 42501 permission denied"),"HOLD_IDENTITY")
    def test_exact_protected_scope(self):
        self.assertEqual(m.EXPECTED_SIGNED,77)
        self.assertEqual(len(m.NEW_TABLES),9)
        self.assertEqual(len(set(m.NEW_TABLES)),9)
    def test_identifiers_no_sql_injection(self):
        for text in ('x";DROP TABLE students;--','public.exam_results','Uppercase','', 'foo bar'):
            self.assertFalse(m.safe_identifier(text))
        self.assertTrue(m.safe_identifier('exam_results'))
if __name__=="__main__":unittest.main()
