#!/usr/bin/env python3
"""Pure verifier contract tests: do not generate/login as real school users."""
import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

SOURCE = Path(__file__).with_name('certify-genuine-staff-login-20261013.py')
spec = importlib.util.spec_from_file_location('staff_gate', SOURCE)
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)


class StaffGateContract(unittest.TestCase):
    def test_valid_school_scoped_user(self):
        self.assertEqual(app.identity({'id': 77, 'role': 'teacher', 'school_id': 10}),
                         ('teacher', '77', '10'))

    def test_missing_role_school_or_id_rejected(self):
        for payload in ({'id': 3, 'role': 'teacher'}, {'id': 3, 'school_id': 10},
                        {'role': 'admin', 'school_id': 10}):
            with self.assertRaises(app.GateError):
                app.identity(payload)

    def test_supported_results_containers(self):
        for envelope in ({'data': [1]}, {'results': [1]},
                         {'data': {'results': [1]}}):
            self.assertEqual(app.array_data(envelope), [1])
        self.assertIsNone(app.array_data({'success': True}))

    def test_no_credential_tty_fails_closed(self):
        with patch.object(app.sys.stdin, 'isatty', return_value=False):
            with self.assertRaisesRegex(app.GateError, 'INTERACTIVE_STAFF_LOGIN_REQUIRED'):
                app.run(require_peer=True)

    def test_actual_token_only_auth_contract(self):
        src = SOURCE.read_text()
        self.assertIn("'/api/auth/login'", src)
        self.assertIn("'/api/auth/me'", src)
        self.assertIn('DEMO_FALLBACK_IS_NOT_GENUINE_STAFF_LOGIN', src)
        self.assertNotIn('jwt.sign', src)
        self.assertNotIn('JWT_SECRET', src)
        self.assertNotIn('DB_SIGNED_TENANT_HMAC_KEY', src)


if __name__ == '__main__':
    unittest.main()
