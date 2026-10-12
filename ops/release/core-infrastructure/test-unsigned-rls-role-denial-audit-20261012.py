#!/usr/bin/env python3
"""Pure in-memory security decision tests, no SQL connections."""
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('unsigned-rls-role-denial-audit-20261012.py')
spec=importlib.util.spec_from_file_location('unsigned_rls_audit',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class RoleDenialTests(unittest.TestCase):
    def classify(self, **kwargs):
        facts={'table_rows':318, 'granted':True,'rls':True,'forced':True,
               'actual':0,'role_bypass':False,'role_super':False}
        facts.update(kwargs)
        return m.classify(**facts)
    def test_secure_negative_role_read(self):
        self.assertEqual(self.classify(),'PASS_UNSIGNED_DENY')
    def test_bypass_role_must_fail(self):
        self.assertEqual(self.classify(role_bypass=True),'HOLD_SECURITY')
    def test_superuser_role_must_fail(self):
        self.assertEqual(self.classify(role_super=True),'HOLD_SECURITY')
    def test_table_without_force_rls_must_fail(self):
        self.assertEqual(self.classify(forced=False),'HOLD_SECURITY')
    def test_missing_select_grant_blocks_route_acceptance(self):
        self.assertEqual(self.classify(granted=False,actual=None),'HOLD_GRANT_GAP')
    def test_unsigned_visibility_blocks_release(self):
        self.assertEqual(self.classify(actual=1),'HOLD_UNSIGNED_ROWS_VISIBLE')
    def test_empty_clone_cannot_prove_row_denial(self):
        self.assertEqual(self.classify(table_rows=0),'UNPROVEN_EMPTY_BASELINE')

if __name__=='__main__':unittest.main()
