import unittest
from verify_teacher_auth_metadata_20261014 import interpret

BASE=dict(employee_count=1,employee_school_id=1,user_school_id=1,user_id=1,employee_active=True,
          portal_active=True,user_active=True,employee_role='teacher',user_role='teacher',
          school_tenant='school1',user_tenant='school1',portal_username_matches=True,
          login_match_count=1,user_password_present=True,must_change_password=True)

class TeacherAuthMetadata(unittest.TestCase):
 def test_ready_is_not_session_certified(self):
  a=interpret(BASE);self.assertEqual(a['status'],'ACCOUNT_METADATA_READY_FOR_GENUINE_LOGIN');self.assertFalse(a['authenticated_existing_staff_login_verified']);self.assertTrue(a['temporary_password_challenge_expected'])
 def test_duplicate_identifier_denied(self):self.assertEqual(interpret({**BASE,'login_match_count':2})['status'],'ACCOUNT_METADATA_HOLD')
 def test_tenant_mismatch_denied(self):self.assertEqual(interpret({**BASE,'user_tenant':'peer-school'})['status'],'ACCOUNT_METADATA_HOLD')
 def test_disabled_user_denied(self):self.assertEqual(interpret({**BASE,'user_active':False})['status'],'ACCOUNT_METADATA_HOLD')
 def test_non_teacher_denied(self):self.assertEqual(interpret({**BASE,'user_role':'parent'})['status'],'ACCOUNT_METADATA_HOLD')
 def test_unlinked_denied(self):self.assertEqual(interpret({**BASE,'user_id':None})['status'],'ACCOUNT_METADATA_HOLD')
 def test_no_temporary_change_does_not_block_auth(self):
  a=interpret({**BASE,'must_change_password':False});self.assertEqual(a['status'],'ACCOUNT_METADATA_READY_FOR_GENUINE_LOGIN');self.assertFalse(a['temporary_password_challenge_expected'])
 def test_bad_username_mapping_denied(self):self.assertEqual(interpret({**BASE,'portal_username_matches':False})['status'],'ACCOUNT_METADATA_HOLD')
if __name__=='__main__':unittest.main(verbosity=2)
