"""Prevent false Phase-1 security certification and privilege expansion."""
import pathlib
import re
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
PROBE=ROOT/'release/worker-probe/phase1-worker-readonly-probe.cjs'
UNIT=ROOT/'release/worker-probe/assps-phase1-worker-readonly-probe.service'

class WorkerReadOnlyReleaseBoundary(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.code=PROBE.read_text()
        cls.unit=UNIT.read_text()
    def test_nonroot_worker_identity_and_one_shot_not_timer(self):
        for item in ('Type=oneshot','User=assps_ai_worker_login','Group=assps_ai_worker_login',
                     'NoNewPrivileges=yes','PrivateNetwork=yes','ProtectSystem=strict',
                     'ProtectHome=yes','RestrictAddressFamilies=AF_UNIX'):
            self.assertIn(item,self.unit)
        self.assertNotIn('WantedBy=',self.unit)
        self.assertNotIn('Restart=',self.unit)
        self.assertNotIn('ExecStartPre=',self.unit)
    def test_worker_separate_identity_bound_to_peer_only(self):
        for item in ('DB_AI_WORKER_HOST=/var/run/postgresql','DB_AI_WORKER_PORT=5432',
                     'DB_AI_WORKER_USER=assps_ai_worker_login',
                     'DB_AI_WORKER_ROLE=assps_core_ai_worker'):
            self.assertIn(item,self.unit)
        self.assertIn('UNUSED_PEER_SOCKET_CONFIG_SENTINEL_NOT_A_CREDENTIAL',self.unit)
        self.assertNotIn('DB_AI_WORKER_HOST=127.0.0.1',self.unit)
    def test_readonly_queries_and_sensitive_acl_fail_closed(self):
        self.assertIn("['students', 'exam_results', 'organizations', 'campuses', 'admin_block_audit_log']",self.code)
        self.assertIn("['ai_jobs', 'ai_queue_events', 'ai_queue_state']",self.code)
        self.assertIn("e.code==='42501'",self.code)
        self.assertIn("assert.equal(refused, true",self.code)
        for prefix in ('await query(`INSERT','await query(`UPDATE','await query(`DELETE',
                       'await query(`ALTER','await query(`DROP','await query(`TRUNCATE'):
            self.assertNotIn(prefix,self.code)
        self.assertIn('production_data_modified:false',self.code)
    def test_never_forge_external_security_approval(self):
        self.assertIn('signed_tenant_or_offsite_receipt_issued:false',self.code)
        self.assertIn('backend_cutover_performed:false',self.code)
        self.assertNotIn('gen_random_uuid',self.code)
        self.assertNotIn('Ed25519',self.code)

if __name__=='__main__':unittest.main()
