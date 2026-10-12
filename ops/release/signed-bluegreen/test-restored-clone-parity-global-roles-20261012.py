#!/usr/bin/env python3
"""Isolated regression: shared clone role presence must not falsely fail parity."""
import importlib.util
import io
from contextlib import redirect_stdout
from pathlib import Path
import unittest

TARGET=Path(__file__).with_name('verify-restored-clone-parity-20261011.py')
spec=importlib.util.spec_from_file_location('assps_restore_parity',TARGET)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class GlobalRoleParityTests(unittest.TestCase):
    def run_case(self, local, unsafe):
        calls=[]
        def fake_read(clone, statement):
            self.assertEqual(clone, ('55432','safe_disposable_clone'))
            calls.append(statement)
            return [local] if 'pg_namespace' in statement else [unsafe]
        with redirect_stdout(io.StringIO()):
            module.assert_restore_security_baseline(fake_read,('55432','safe_disposable_clone'))
        self.assertEqual(len(calls),2)
        self.assertIn('pg_roles',calls[1])
        self.assertIn('rolbypassrls',calls[1])
        self.assertIn('rolsuper',calls[1])
        self.assertIn('rolcanlogin',calls[1])

    def test_clean_restore_even_if_shared_cluster_has_safe_global_roles(self):
        self.run_case('0|0','0')

    def test_existing_but_nonprivileged_role_is_allowed(self):
        self.run_case('0|0','0')

    def test_v2_policy_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError,'database contains V2-local'):
            self.run_case('154|0','0')

    def test_v2_schema_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError,'database contains V2-local'):
            self.run_case('0|1','0')

    def test_cluster_global_unsafe_role_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError,'unsafe signed role'):
            self.run_case('0|0','1')

if __name__=='__main__':
    unittest.main()
