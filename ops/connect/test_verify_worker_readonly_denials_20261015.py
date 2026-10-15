#!/usr/bin/env python3
"""Synthetic, read-only negative tests. No external databases, credentials or sockets."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

TARGET = Path(__file__).with_name("verify_worker_readonly_denials_20261015.py")
spec = importlib.util.spec_from_file_location("worker_denials", TARGET)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def safe_sql(sql, config):
    if "FROM pg_roles" in sql:
        return 0, "assps_ai_worker_login|t|f|f|f|t|f", ""
    if "has_table_privilege" in sql:
        protected = any(f"public.{table}" in sql for table in module.PROTECTED)
        return 0, "f" if protected else "t", ""
    if "SELECT count(*) FROM public." in sql:
        return 1, "", "ERROR: permission denied for relation"
    raise AssertionError("SQL escaped read-only test allowlist")

class WorkerTests(unittest.TestCase):
    def check(self, sql_fn=safe_sql):
        with patch.object(module,"reviewed_credentials",return_value={"DB_AI_WORKER_PASSWORD":"not-used"}):
            with patch.object(module,"sql_readonly",side_effect=sql_fn):
                return module.verify()

    def test_real_sql_allowlist_synthetic(self):
        r=self.check()
        self.assertEqual(r["technical_status"],"PASS")
        self.assertEqual((r["passed"],r["checked"]),(20,20))
        self.assertFalse(r["release_authorized"])
        self.assertFalse(r["private_credentials_exposed"])

    def test_bad_root_credential_config_is_hold(self):
        with patch.object(module,"reviewed_credentials",side_effect=ValueError("private_bad_credentials")):
            r=module.verify()
        self.assertEqual(r["technical_status"],"HOLD")
        self.assertNotIn("private_bad_credentials",json.dumps(r))

    def test_unexpected_superuser_fails(self):
        def sql(q,cfg):
            if "FROM pg_roles" in q:return 0,"assps_ai_worker_login|t|t|f|f|t|f",""
            return safe_sql(q,cfg)
        self.assertEqual(self.check(sql)["technical_status"],"HOLD")

    def test_bypass_rls_fails(self):
        def sql(q,cfg):
            if "FROM pg_roles" in q:return 0,"assps_ai_worker_login|t|f|t|f|t|f",""
            return safe_sql(q,cfg)
        self.assertEqual(self.check(sql)["technical_status"],"HOLD")

    def test_unreviewed_worker_role_fails(self):
        def sql(q,cfg):
            if "FROM pg_roles" in q:return 0,"postgres|t|t|t|t|t|t",""
            return safe_sql(q,cfg)
        self.assertEqual(self.check(sql)["technical_status"],"HOLD")

    def test_queue_read_revoked_fails(self):
        def sql(q,cfg):
            if "has_table_privilege" in q and "public.ai_jobs" in q:return 0,"f",""
            return safe_sql(q,cfg)
        r=self.check(sql)
        self.assertFalse(r["checks"]["authorized_ai_jobs_select"])
        self.assertEqual(r["technical_status"],"HOLD")

    def test_protected_table_read_granted_fails(self):
        def sql(q,cfg):
            if "has_table_privilege" in q and "public.campuses" in q and "'SELECT'" in q:return 0,"t",""
            return safe_sql(q,cfg)
        self.assertEqual(self.check(sql)["technical_status"],"HOLD")

    def test_protected_table_write_granted_fails(self):
        def sql(q,cfg):
            if "has_table_privilege" in q and "public.admin_block_audit_log" in q and "'UPDATE'" in q:return 0,"t",""
            return safe_sql(q,cfg)
        self.assertEqual(self.check(sql)["technical_status"],"HOLD")

    def test_protected_real_query_succeeds_fails(self):
        def sql(q,cfg):
            if "SELECT count(*) FROM public.organizations" in q:return 0,"0",""
            return safe_sql(q,cfg)
        self.assertEqual(self.check(sql)["technical_status"],"HOLD")

    def test_protected_real_denial_wrong_reason_fails(self):
        def sql(q,cfg):
            if "SELECT count(*) FROM public.campuses" in q:return 1,"","network unavailable"
            return safe_sql(q,cfg)
        self.assertEqual(self.check(sql)["technical_status"],"HOLD")

    def test_query_timeout_holds(self):
        def sql(q,cfg):
            raise subprocess.TimeoutExpired(["psql"],12)
        self.assertEqual(self.check(sql)["technical_status"],"HOLD")

    def test_pure_config_schema_leak_avoided(self):
        with patch.object(module,"reviewed_credentials",side_effect=OSError("secret: TEST_HIDDEN_PASSWORD")):
            r=module.verify()
        self.assertNotIn("TEST_HIDDEN_PASSWORD",json.dumps(r))

    def test_credential_parser_bad_user_fails(self):
        # Core-owned parser must check identity; the Connect tool must never
        # silently switch to an arbitrary PGUSER or interactive shell.
        self.assertEqual(module.EXPECTED_ROLE,"assps_ai_worker_login")
        self.assertEqual(module.EXPECTED_DB,"apexos")

    def test_production_exit_always_two_in_source(self):
        source=TARGET.read_text()
        self.assertIn("return 2 if opts.production_release_gate",source)

    def test_no_mutating_sql_in_queries(self):
        lines=TARGET.read_text()
        self.assertNotIn(" -c 'UPDATE ",lines)
        self.assertNotIn("DROP TABLE",lines)
        self.assertNotIn("DELETE FROM public.",lines)

if __name__=="__main__":
    unittest.main()
