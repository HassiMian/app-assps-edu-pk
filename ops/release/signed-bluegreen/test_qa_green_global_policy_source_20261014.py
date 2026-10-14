"""Static adversarial tests for QA-only, fail-closed green runtime source."""
from pathlib import Path
import re
import unittest

BASE = Path(__file__).parent
STAGE = (BASE/'qa-green-global-rls-stage-20261014.sql').read_text()
ROLLBACK = (BASE/'qa-green-global-rls-rollback-20261014.sql').read_text()
RUNNER = (BASE/'run-six-global-qa-20261014.sh').read_text()
TABLES = ('admin_block_audit_log', 'ai_jobs', 'ai_queue_events',
          'ai_queue_state', 'campuses', 'organizations')

class SixGlobalPolicyContract(unittest.TestCase):
    def test_exact_global_table_set(self):
        for name in TABLES:
            self.assertIn("'"+name+"'", STAGE)
            self.assertIn("'"+name+"'", ROLLBACK)
        self.assertEqual(len(set(TABLES)),6)
    def test_stage_isolation_port_required(self):
        self.assertIn("current_setting('port') <> '55483'", STAGE)
        self.assertIn("current_database() <> 'apexos'", STAGE)
        self.assertIn("inet_server_addr()", STAGE)
    def test_rollback_isolation_port_required(self):
        self.assertIn("current_setting('port')<>'55483'", ROLLBACK)
        self.assertIn("current_database()<>'apexos'", ROLLBACK)
        self.assertIn("inet_server_addr()", ROLLBACK)
    def test_guard_is_restrictive_false_not_bypass(self):
        self.assertRegex(STAGE,r'AS RESTRICTIVE FOR ALL TO assps_core_green_runtime USING \(false\) WITH CHECK \(false\)')
        self.assertNotRegex(STAGE,r'\bBYPASSRLS\b')  # NOBYPASSRLS is mandatory
        self.assertNotIn('DISABLE ROW LEVEL SECURITY', STAGE)
    def test_legacy_path_keeps_explicit_policy(self):
        self.assertIn("TO apex_app_runtime,apexos_user USING (true) WITH CHECK (true)",STAGE)
        self.assertIn("FORCE ROW LEVEL SECURITY", STAGE)
    def test_exact_rollback_removes_test_policies(self):
        self.assertIn("DROP POLICY assps_qa_green_unscoped_deny_v1", ROLLBACK)
        self.assertIn("DROP POLICY assps_qa_legacy_global_service_v1", ROLLBACK)
        self.assertIn("NO FORCE ROW LEVEL SECURITY", ROLLBACK)
        self.assertIn("DISABLE ROW LEVEL SECURITY", ROLLBACK)
    def test_runner_uses_passwordless_socket_clone(self):
        self.assertIn("pg_restore -p55483 -d apexos --exit-on-error",RUNNER)
        self.assertIn("CREATE ROLE %I NOLOGIN;", RUNNER)
        self.assertIn("-h ''", RUNNER)
        self.assertNotIn('pg_dumpall',RUNNER)
    def test_runner_negative_write_and_legacy_rollback(self):
        self.assertIn("QA_GREEN_INSERT_REJECTED_PASS", RUNNER)
        self.assertIn("QA_LEGACY_QUEUE_SYNTHETIC_DML_ROLLBACK_PASS", RUNNER)
        self.assertIn("ALL_SIX_QA_ROLLBACK_PASS", RUNNER)
        self.assertIn("OFFICIAL_MARKS_CLONE_INTACT_PASS", RUNNER)
    def test_global_worker_is_non_login_and_separately_scoped(self):
        self.assertIn('CREATE ROLE assps_qa_global_job_worker NOLOGIN',STAGE)
        for table in ('ai_jobs','ai_queue_events','ai_queue_state'):
            self.assertIn('ON public.'+table+' TO assps_qa_global_job_worker',STAGE)
        for table in ('organizations','campuses','admin_block_audit_log'):
            self.assertNotIn('ON public.'+table+' TO assps_qa_global_job_worker',STAGE)
        self.assertIn('QA_WORKER_SCOPED_DML_AND_UNAUTHORIZED_TABLE_DENIAL_PASS',RUNNER)
    def test_global_worker_role_is_removed_during_exact_rollback(self):
        self.assertIn('DROP POLICY assps_qa_global_worker_service_v1',ROLLBACK)
        self.assertIn('DROP ROLE assps_qa_global_job_worker;',ROLLBACK)
    def test_live_prod_port_not_used_for_staging(self):
        self.assertIn("-p5432 -d postgres -c", RUNNER)  # role name inventory ONLY
        self.assertNotIn("-p5432 -d apexos", RUNNER)
        self.assertIn("-p55483 -d apexos",RUNNER)

if __name__=='__main__':
    unittest.main()
