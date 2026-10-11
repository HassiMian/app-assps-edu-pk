#!/usr/bin/env python3
"""Source and non-privileged guard checks; NEVER executes isolated migration."""
import subprocess
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parent
RUNNER=ROOT/'authorized-clone-rehearsal-20261011.py'

class AuthorizedCloneDriver(unittest.TestCase):
    def test_readonly_plan_has_no_database_connect(self):
        p=subprocess.run([sys.executable,str(RUNNER)],capture_output=True,text=True,timeout=8)
        self.assertEqual(p.returncode,0)
        self.assertIn('PLAN_ONLY; NO_DATABASE_CONNECTION_OR_MUTATION',p.stdout)
        self.assertNotIn('CLONE_PHASE_PASS',p.stdout)
    def test_explicit_flag_cannot_authorize_automatically(self):
        p=subprocess.run([sys.executable,str(RUNNER),'--run-clone'],
                         capture_output=True,text=True,timeout=8)
        self.assertEqual(p.returncode,2)
        self.assertIn('CLONE_EXECUTION_REFUSED',p.stderr)
        self.assertNotIn('CLONE_PHASE_PASS',p.stdout)
    def test_no_public_or_live_database_target(self):
        source=RUNNER.read_text()
        self.assertIn("CLONE='assps_backup_restore_check_20261011'",source)
        self.assertIn("PORT='55432'",source)
        self.assertNotIn("'-p','5432'",source)
        self.assertIn('EXACT_CLONE_VS_LIVE_SCHEMA_AND_POLICY_PARITY_PASS',source)
    def test_secrets_not_in_process_arguments(self):
        source=RUNNER.read_text()
        self.assertIn("input=payload,text=True,capture_output=True",source)
        self.assertIn("input=fixture,text=True,capture_output=True",source)
        self.assertIn('secrets.token_hex(32)',source)
        self.assertIn("child_env['ASSPS_CLONE_INPUT_STDIN']='1'",source)
        self.assertNotIn("'-v CORE_SIGNING_KEY=",source)
    def test_rollback_requires_complete_restored_baseline(self):
        source=RUNNER.read_text()
        self.assertIn("phase('login_rollback'",source)
        self.assertIn("phase('schema_rollback'",source)
        self.assertIn("snapshot()!='212|0|0|0'",source)
        self.assertIn('Rollback incomplete: manual DBA recovery required',source)

if __name__=='__main__':unittest.main()
