#!/usr/bin/env python3
"""Strict read-only database acceptance. Scope tests are NOT signed-actor certification."""
import subprocess
import sys

checks = (
    ("unscoped_staff_permissions", "apex_app_runtime", "", "SELECT count(*) FROM public.teacher_class_assignments", 0),
    ("school2_staff_permissions", "apex_app_runtime",
     "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='false'; SET LOCAL app.tenant_id='2';",
     "SELECT count(*) FROM public.teacher_class_assignments", 0),
    ("school1_staff_permissions", "apex_app_runtime",
     "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='false'; SET LOCAL app.tenant_id='1';",
     "SELECT count(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active", 54),
    ("unscoped_documents", "apexos_user", "", "SELECT count(*) FROM public.school_documents", 0),
    ("school2_documents", "apexos_user",
     "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='false'; SET LOCAL app.tenant_id='2';",
     "SELECT count(*) FROM public.school_documents", 0),
    ("school1_documents", "apexos_user",
     "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='false'; SET LOCAL app.tenant_id='1';",
     "SELECT count(*) FROM public.school_documents", 18),
)
for name, role, context, query, expected in checks:
    sql = f"BEGIN READ ONLY; SET LOCAL ROLE {role}; {context} {query}; ROLLBACK;"
    process = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-X", "-v", "ON_ERROR_STOP=1", "-d", "apexos", "-Atq"],
        input=sql, text=True, capture_output=True, timeout=15,
    )
    if process.returncode != 0:
        sys.exit(f"FAIL {name}: SQL/permission error (no migration or DML executed)")
    records = [s for s in process.stdout.splitlines() if s.isdecimal()]
    if len(records) != 1 or int(records[0]) != expected:
        sys.exit(f"FAIL {name}: count {records!r} expected {expected}")
    print(f"PASS {name}: {expected}")
forced_sql = """
BEGIN READ ONLY;
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity
AND c.relforcerowsecurity AND c.relname <> 'student_class_movement_audit';
ROLLBACK;
"""
result = subprocess.run(
    ["sudo", "-u", "postgres", "psql", "-X", "-v", "ON_ERROR_STOP=1", "-d", "apexos", "-Atq"],
    input=forced_sql, text=True, capture_output=True, timeout=15,
)
if result.returncode or result.stdout.strip() != "85":
    sys.exit("FAIL forced-RLS catalog: expected 85 excluding historical audit table")
print("PASS forced-RLS catalog: 85 (historical audit excluded)")
print("This tests read-only tenant scoping ONLY: signed-actor/HMAC production certification remains HOLD.")
