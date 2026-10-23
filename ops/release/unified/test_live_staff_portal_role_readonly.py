import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_live_staff_portal_role_readonly import inspect
PORTAL="PORTAL_ROLE_NOT_ELIGIBLE_FOR_SELF_SERVICE new Set(['teacher','accountant','student','parent']) PORTAL_EXISTING_ROLE_MISMATCH"
EMPLOYEE="STAFF_ROLE_ESCALATION_DENIED ['teacher','accountant'].includes(role)"
class StaffPortalChecks(unittest.TestCase):
 def test_missing_low_level_policy_fails(self):
  self.assertFalse(inspect(portal_code='',employee_code=EMPLOYEE,syntax_pass=True)['pass'])
 def test_missing_route_guard_fails(self):
  self.assertFalse(inspect(portal_code=PORTAL,employee_code='',syntax_pass=True)['pass'])
 def test_both_statically_present_does_not_claim_live_signed_actor(self):
  a=inspect(portal_code=PORTAL,employee_code=EMPLOYEE,syntax_pass=True)
  self.assertTrue(a['pass'])
  self.assertFalse(a['authenticated_live_actor_test'])
