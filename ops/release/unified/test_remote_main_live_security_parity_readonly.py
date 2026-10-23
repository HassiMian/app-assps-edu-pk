import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_remote_main_live_security_parity_readonly import inspect
FULL='PRIVILEGED_ACCOUNT_PROVISIONING_DENIED AND role = ANY($3::text[]) SCHOOL_TENANT_SCHEMA_REQUIRED'
class RemoteMainParityTests(unittest.TestCase):
 def test_full_parity_is_a_source_guard_not_production_certificate(self):
  data=inspect(remote=FULL,bridge=FULL,live=FULL)
  self.assertTrue(data['pass'])
  self.assertFalse(data['production_deployment_performed'])
 def test_stale_remote_main_blocks_even_if_live_and_bridge_hardened(self):
  data=inspect(remote='',bridge=FULL,live=FULL)
  self.assertFalse(data['pass'])
  self.assertTrue(data['bridge_ready'])
  self.assertFalse(data['remote_main_security_parity'])
 def test_broken_review_branch_blocks_release(self):
  self.assertFalse(inspect(remote=FULL,bridge='',live=FULL)['pass'])
 def test_lost_live_guard_blocks_release(self):
  self.assertFalse(inspect(remote=FULL,bridge=FULL,live='')['pass'])
 def test_partial_password_sql_scope_blocks_release(self):
  self.assertFalse(inspect(remote='PRIVILEGED_ACCOUNT_PROVISIONING_DENIED SCHOOL_TENANT_SCHEMA_REQUIRED',
                           bridge=FULL,live=FULL)['pass'])
