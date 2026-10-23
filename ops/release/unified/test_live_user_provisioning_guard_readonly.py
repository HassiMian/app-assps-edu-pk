import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_live_user_provisioning_guard_readonly import inspect
class StaticAuthGuardTests(unittest.TestCase):
 def test_unprotected_live_generic_user_creation_fails(self):
  self.assertFalse(inspect(source="router.post('/users', protect)",syntax_ok=True)['pass'])
 def test_live_guard_source_does_not_prove_signed_actor_verification(self):
  src="allowedNewRoles PRIVILEGED_ACCOUNT_PROVISIONING_DENIED ['admin','school_admin','principal','teacher','accountant','parent','student'] passwordRoleScope AND role IN ('teacher','accountant','parent','student')"
  r=inspect(source=src,syntax_ok=True)
  self.assertTrue(r['pass'])
  self.assertFalse(r['authenticated_user_test_verified'])
