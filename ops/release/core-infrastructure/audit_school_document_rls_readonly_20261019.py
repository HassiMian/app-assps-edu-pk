#!/usr/bin/env python3
"""ASSPS Core school-document RLS catalog risk audit. READ ONLY, NEVER A RELEASE CERTIFICATE."""
import json
import os
import subprocess
import sys

EXPECTED = {"school_documents", "school_document_events", "school_document_revisions"}
SQL = """
SELECT COALESCE(json_agg(json_build_object(
  'table', c.relname,
  'forced', c.relforcerowsecurity,
  'enabled', c.relrowsecurity,
  'app_can_select', has_table_privilege('apex_app_runtime',c.oid,'SELECT'),
  'fallback_public', COALESCE((SELECT bool_or('public'=ANY(p.roles))
       FROM pg_policies p WHERE p.schemaname='public'
       AND p.tablename=c.relname AND p.policyname LIKE '%tenant_fallback'),false),
  'fallback_missing_flag_allows', COALESCE((SELECT bool_or(
       p.permissive='PERMISSIVE'
       AND p.qual LIKE '%app.rls_enabled%'
       AND p.qual LIKE '%IS DISTINCT FROM%'
       ) FROM pg_policies p WHERE p.schemaname='public'
       AND p.tablename=c.relname AND p.policyname LIKE '%tenant_fallback'),false),
  'app_runtime_policy_unscoped_flag', COALESCE((SELECT bool_or(
       p.permissive='PERMISSIVE' AND 'apex_app_runtime'=ANY(p.roles)
       AND p.qual LIKE '%app.tenant_id%' AND p.qual NOT LIKE '%app.rls_enabled%'
       ) FROM pg_policies p WHERE p.schemaname='public'
       AND p.tablename=c.relname AND p.policyname LIKE '%_app_runtime'),false)
  )), '[]'::json)::text
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
AND c.relname IN ('school_documents','school_document_events','school_document_revisions');
"""

def verdict(rows):
    if not isinstance(rows, list):
        return {"status": "HOLD", "risks": ["MALFORMED_CATALOG"], "releaseAuthorized": False}
    by_name = {r.get("table"): r for r in rows if isinstance(r, dict)}
    risks = []
    missing = sorted(EXPECTED - by_name.keys())
    if missing:
        risks.append("MISSING_TABLE_CATALOG:" + ",".join(missing))
    for name in sorted(EXPECTED.intersection(by_name)):
        r = by_name[name]
        if not r.get("enabled") or not r.get("forced"):
            risks.append(name + ":RLS_DISABLED")
        if (r.get("app_can_select") and r.get("fallback_public")
                and r.get("fallback_missing_flag_allows")):
            risks.append(name + ":UNSCOPED_APP_RUNTIME_FALLBACK")
        if r.get("app_can_select") and r.get("app_runtime_policy_unscoped_flag"):
            risks.append(name + ":APP_RUNTIME_POLICY_OMITS_RLS_CONTEXT")
    return {"status": "HOLD" if risks else "CATALOG_PASS_NOT_RELEASE",
            "risks": risks, "readOnly": True, "releaseAuthorized": False,
            "realTenantDenialCertified": False}

def read_catalog():
    env = os.environ.copy()
    env["PGOPTIONS"] = "-c default_transaction_read_only=on -c statement_timeout=10000"
    command = ["runuser", "-u", "postgres", "--", "psql", "-X", "-A", "-t",
               "-v", "ON_ERROR_STOP=1", "-p", "5432", "-d", "apexos", "-c", SQL]
    result = subprocess.run(command, capture_output=True, text=True, timeout=18, env=env)
    if result.returncode:
        raise RuntimeError("READ_ONLY_CATALOG_QUERY_FAILED")
    return json.loads(result.stdout.strip())

def main():
    result = verdict(read_catalog())
    print(json.dumps({"schema": "ASSPS_SCHOOL_DOCUMENT_RLS_READONLY_V1", **result},
                     sort_keys=True))
    return 0 if result["status"] == "CATALOG_PASS_NOT_RELEASE" else 2

if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, RuntimeError, subprocess.TimeoutExpired):
        print(json.dumps({"status": "HOLD", "readOnly": True,
                          "releaseAuthorized": False, "error": "CATALOG_QUERY_ERROR"}))
        sys.exit(2)
