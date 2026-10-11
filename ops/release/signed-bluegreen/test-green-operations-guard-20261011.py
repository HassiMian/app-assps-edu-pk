#!/usr/bin/env python3
"""Green production operations' nonmutating fail-closed source checks."""
import subprocess,sys,unittest
from pathlib import Path
BASE=Path(__file__).resolve().parent
class GreenOps(unittest.TestCase):
 def test_private_green_supervisor_inspection(self):
  p=subprocess.run([sys.executable,str(BASE/'start-green-managed-20261011.py'),'--inspect'],
   text=True,capture_output=True,timeout=8)
  self.assertEqual(p.returncode,0,p.stderr)
  for marker in ('PROTECTED_GREEN_CONFIG_OWNER_MODE_PASS','GREEN_SIGNED_RUNTIME_ENV_CONTRACT_PASS',
    'GREEN_LOOPBACK_PORT_5091_ONLY_PASS','NO_SERVICE_RESTART_OR_PRODUCTION_MUTATION'):
   self.assertIn(marker,p.stdout)
 def test_supervisor_has_no_shell_secret_interpolation(self):
  content=(BASE/'start-green-managed-20261011.py').read_text()
  self.assertIn('os.execvpe',content)
  self.assertNotIn('shell=True',content)
  self.assertNotIn('print(env',content)
  self.assertIn('stat.S_IMODE(metadata.st_mode)!=0o600',content)
 def test_live_fixture_default_denied_before_reads_or_writes(self):
  # Node will throw BEFORE getFixture() or any psql/HTTP call.
  p=subprocess.run(['node',str(BASE/'test-green-backend-acceptance-20261011.cjs')],
   capture_output=True,text=True,timeout=8)
  self.assertNotEqual(p.returncode,0)
  self.assertIn('Production marks fixture writes require separately approved DBA test window',p.stderr)
 def test_fixture_must_not_delete_existing_assignment(self):
  content=(BASE/'test-green-backend-acceptance-20261011.cjs').read_text()
  self.assertIn("assert.equal(existing,'0|0'",content)
  self.assertIn('RETURNING id;',content)
  self.assertIn('if(insertedAssignmentId)',content)
  self.assertIn('WHERE id=${insertedAssignmentId}',content)
if __name__=='__main__':unittest.main()
