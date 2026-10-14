"""Negative-only source tests; synthetic Ed25519 keys are never deployed."""
import importlib.util
import base64
import json
from datetime import datetime,timezone,timedelta
from pathlib import Path
import unittest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

PATH=Path(__file__).with_name('verify-connect-login-only-core-20261014.py')
SPEC=importlib.util.spec_from_file_location('login_core',PATH)
M=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
RID='CONNECT_LOGIN_ONLY_20261014'
SOURCE='2d4d9be579952c780d09f8ed66f9981a6c6fef40af4042fb842ca9aa38414193'
BUILD='ONDwxEIZlx5onDIKY7wYf'

class LoginOnlyCoreFailClosed(unittest.TestCase):
    def setUp(self):
        self.private=Ed25519PrivateKey.generate()
        self.pub=self.private.public_key()
        self.now=datetime.now(timezone.utc)
        self.common={
          'issuer':'SAAS_CORE','environment':'production',
          'release_scope':'CONNECT_LOGIN_ONLY',
          'release_id':RID,'source_sha256':SOURCE,'build_id':BUILD,
          'school_id':1,'status':'PASS',
          'academic_results_published':False,'evidence_digest':'a'*64,
          'observed_at':self.now.isoformat(),
        }
        self.peer={**self.common,'kind':'signed_peer_tenant_denial',
          'actor_role':'security_reviewer','origin':'https://api.assps.edu.pk',
          'cross_tenant_denial_tested':True,'unassigned_subject_denial_tested':True}
        self.worker={**self.common,'kind':'verified_separate_worker_transport',
          'actor_role':'core_security_reviewer',
          'authenticated_worker_sql_role':'assps_core_ai_worker',
          'separate_worker_login_verified':True,
          'global_queue_transaction_verified':True,
          'global_worker_org_and_audit_denied':True,
          'tenant_role_worker_impersonation_denied':True}
        self.facts={
          'backup_good':True,'offhost_recovery':True,
          'catalog':'PASS_WITH_INDEPENDENT_LIVE_ACCEPTANCE_REQUIRED',
          'signed_transport':True,'global_worker_ready':True,
          'worker_catalog':True,'worker_code_parity':True,
          'peer_school_denial':True,'marks_preserved':True,
          'rollback_good':True,'nginx_valid':True,'owner_key':True}
    def sign(self,c,private=None):
        data=json.dumps(c).encode()
        return {'payload_b64':base64.b64encode(data).decode(),
                'signature_b64':base64.b64encode((private or self.private).sign(data)).decode()}
    def check_peer(self,c,key=None):
        return M.verify_signed_peer_tenant_receipt({'receipts':[self.sign(c)]},key or self.pub,RID,SOURCE,BUILD,self.now)
    def check_worker(self,c,key=None):
        return M.verify_signed_worker_receipt({'receipts':[self.sign(c)]},key or self.pub,RID,SOURCE,BUILD,self.now)
    def test_pure_fixture_ready_only_if_all_fields_genuine(self):
        r=M.evaluate(self.facts,RID)
        self.assertEqual(r['status'],'READY_FOR_LOGIN_ONLY_CORE')
        self.assertFalse(r['production_deployment_performed'])
    def test_deployed_backend_must_match_reviewed_worker_adapter(self):
        result=M.evaluate({**self.facts,'worker_code_parity':False},RID)
        self.assertIn('exact_reviewed_ai_worker_adapter_deployed',result['blocked'])
    def test_actual_deployed_backend_adapter_missing(self):
        self.assertFalse(M.deployed_worker_source_parity())
    def test_real_live_must_have_signed_runtime(self):
        self.assertEqual(M.evaluate({**self.facts,'signed_transport':False},RID)['status'],'HOLD')
    def test_offhost_backup_absent_requires_hold(self):
        result=M.evaluate({**self.facts,'offhost_recovery':False},RID)
        self.assertIn('independent_offhost_current_recovery_certified',result['blocked'])
    def test_valid_synthetic_recovery_receipt(self):
        receipt={**self.common,'kind':'offhost_encrypted_recovery_certified',
            'actor_role':'disaster_recovery_reviewer',
            'backup_includes_all_current_marks':True,
            'complete_acl_restore_verified':True,
            'offsite_encrypted_copy_verified':True,
            'offsite_decryption_rehearsed':True,
            'application_blue_restore_verified':True}
        self.assertTrue(M.verify_signed_recovery_receipt(
            {'receipts':[self.sign(receipt)]},self.pub,RID,SOURCE,BUILD,self.now))
        self.assertFalse(M.verify_signed_recovery_receipt(
            {'receipts':[self.sign({**receipt,'offsite_decryption_rehearsed':False})]},
            self.pub,RID,SOURCE,BUILD,self.now))
    def test_six_table_current_catalog_holds(self):
        self.assertIn('production_signed_catalog_safe',
          M.evaluate({**self.facts,'catalog':'HOLD'},RID)['blocked'])
    def test_live_worker_catalog_absent_even_with_signed_receipts_holds(self):
        r=M.evaluate({**self.facts,'worker_catalog':False},RID)
        self.assertIn('live_worker_role_and_inherited_grants_verified',r['blocked'])
    def test_worker_config_rejects_same_school_user(self):
        e={'DB_AI_WORKER_USER':'apexos_user', 'DB_USER':'apexos_user',
            'DB_AI_WORKER_PORT':'5432','DB_AI_WORKER_NAME':'apexos',
            'DB_AI_WORKER_HOST':'localhost','DB_AI_WORKER_PASSWORD':'test-only'}
        self.assertFalse(M.worker_config_present(e))
    def test_worker_config_rejects_qa_database_target(self):
        e={'DB_AI_WORKER_USER':'assps_core_ai_login', 'DB_USER':'apexos_user',
            'DB_AI_WORKER_PORT':'55477','DB_AI_WORKER_NAME':'apexos',
            'DB_AI_WORKER_HOST':'localhost','DB_AI_WORKER_PASSWORD':'test-only'}
        self.assertFalse(M.worker_config_present(e))
    def test_worker_config_rejects_empty_credentials(self):
        e={'DB_AI_WORKER_USER':'assps_core_ai_login', 'DB_USER':'apexos_user',
            'DB_AI_WORKER_PORT':'5432','DB_AI_WORKER_NAME':'apexos',
            'DB_AI_WORKER_HOST':'localhost','DB_AI_WORKER_PASSWORD':''}
        self.assertFalse(M.worker_config_present(e))
    def test_worker_config_accepts_separate_synthetic_qa_fixture(self):
        e={'DB_AI_WORKER_USER':'assps_core_ai_login', 'DB_USER':'apexos_user',
            'DB_AI_WORKER_PORT':'5432','DB_AI_WORKER_NAME':'apexos',
            'DB_AI_WORKER_HOST':'localhost','DB_AI_WORKER_PASSWORD':'synthetic_fixture'}
        self.assertTrue(M.worker_config_present(e))
    def test_catalog_reader_rejects_arbitrary_role_sql_injection(self):
        self.assertFalse(M.inspect_worker_catalog('postgres;DROP TABLE students'))
        self.assertFalse(M.inspect_worker_catalog('apexos_user'))
    def test_read_only_actual_catalog_absent_worker_fails(self):
        self.assertFalse(M.inspect_worker_catalog('assps_core_ai_login_nonexistent'))
    def test_no_authenticated_worker_receipt_holds(self):
        self.assertIn('global_worker_separated_and_authenticated',
          M.evaluate({**self.facts,'global_worker_ready':False},RID)['blocked'])
    def test_no_core_owner_pinned_key_holds(self):
        self.assertIn('trusted_external_owner_pinned_key',
          M.evaluate({**self.facts,'owner_key':False},RID)['blocked'])
    def test_missing_rollback_blocks(self):
        self.assertIn('current_blue_rollback_archive_verified',
          M.evaluate({**self.facts,'rollback_good':False},RID)['blocked'])
    def test_valid_fixture_peer_receipt_signing(self):
        self.assertTrue(self.check_peer(self.peer))
    def test_peer_claim_school_tampering_denied(self):
        self.assertFalse(self.check_peer({**self.peer,'school_id':2}))
    def test_peer_claim_replayed_stale_denied(self):
        self.assertFalse(self.check_peer({**self.peer,
          'observed_at':(self.now-timedelta(days=3)).isoformat()}))
    def test_peer_signature_from_wrong_owner_denied(self):
        other=Ed25519PrivateKey.generate()
        self.assertFalse(self.check_peer(self.peer,key=other.public_key()))
    def test_valid_worker_fixture_signing(self):
        self.assertTrue(self.check_worker(self.worker))
    def test_worker_queue_without_denial_denied(self):
        self.assertFalse(self.check_worker({**self.worker,'global_worker_org_and_audit_denied':False}))
    def test_worker_does_not_reuse_school_tenant_role(self):
        self.assertFalse(self.check_worker({**self.worker,
          'authenticated_worker_sql_role':'assps_core_green_runtime'}))
    def test_worker_without_real_queue_transaction_denied(self):
        self.assertFalse(self.check_worker({**self.worker,'global_queue_transaction_verified':False}))
    def test_receipt_wrong_environment_denied(self):
        self.assertFalse(self.check_worker({**self.worker,'environment':'qa'}))
    def test_academic_publication_flag_never_authorized(self):
        self.assertFalse(self.check_peer({**self.peer,'academic_results_published':True}))
        self.assertFalse(M.evaluate(self.facts,RID)['academic_results_published'])

if __name__=='__main__':unittest.main()
