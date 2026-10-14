#!/usr/bin/env python3
"""Source guard contracts, independent of actual live role/tenant acceptance."""
from pathlib import Path
import unittest
D=Path(__file__).resolve().parent
M=(D/'production-six-global-leastpriv-20261014.sql').read_text()
R=(D/'production-six-global-leastpriv-rollback-20261014.sql').read_text()
Q=(D/'rehearse-prod-six-global-55489-20261014.sh').read_text()
SIX=['admin_block_audit_log','ai_jobs','ai_queue_events','ai_queue_state','campuses','organizations']
class TestLeastPrivilege(unittest.TestCase):
    def test_database_and_admin_guard(self):
        self.assertIn("current_database() <> 'apexos'",M)
        self.assertIn("current_setting('port') <> '5432'",M)
        self.assertIn("current_user <> 'postgres'",M)
    def test_exact_signed_guard_count(self): self.assertIn('n <> 77',M)
    def test_blue_parent_unchanged(self):
        self.assertIn('REVOKE apex_app_runtime FROM assps_core_green_runtime',M)
        self.assertNotIn('REVOKE SELECT ON ALL TABLES',M)
        self.assertNotIn('REVOKE ALL ON SCHEMA public FROM apex_app_runtime',M)
    def test_worker_separation(self):
        for r in ['assps_core_ai_worker','assps_core_directory_reader','assps_core_audit_writer']:
            self.assertIn('CREATE ROLE '+r+' NOLOGIN',M)
        self.assertNotIn('CREATE ROLE assps_ai_worker_login',M)
    def test_no_school_table_dml(self):
        for sql in [M,R]:
            for banned in ['UPDATE exam_results','DELETE FROM exam_results','TRUNCATE','INSERT INTO exam_results','ALTER ROLE postgres']:
                self.assertNotIn(banned.upper(),sql.upper())
    def test_global_relationships_exact(self):
        for t in SIX:self.assertIn(t,M);self.assertIn(t,R)
    def test_rollback_parent_options(self):
        self.assertIn('GRANT apex_app_runtime TO assps_core_green_runtime WITH INHERIT TRUE, SET FALSE',R)
        self.assertIn('Signed policy catalog changed; rollback aborted',R)
    def test_rollback_restores_table_acl(self):
        self.assertIn('REVOKE SELECT,INSERT,UPDATE,DELETE ON TABLE',R)
        self.assertIn('Direct grants remain; rollback transaction refused',R)
    def test_active_connections_block(self):
        self.assertIn('Active signed Green sessions',M)
        self.assertIn('Active signed or worker session',R)
    def test_private_clone_only(self):
        self.assertIn('P=55489',Q)
        self.assertIn('CLONE_PORT_OCCUPIED',Q)
        self.assertIn('QA_CLEANUP',Q) if 'QA_CLEANUP' in Q else self.assertIn('trap cleanup EXIT',Q)
    def test_no_qa_role_in_prod_sql(self):
        self.assertNotIn('assps_core_qa_',M)
        self.assertNotIn('assps_core_qa_',R)
if __name__=='__main__':unittest.main(verbosity=2)
