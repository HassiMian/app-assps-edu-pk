#!/usr/bin/env python3
"""Execute real PostgreSQL RLS/grant boundaries on restored full-ACL QA only.

Never points at production, never signs genuine actor identity.
"""
import hashlib
import os
import subprocess
import sys

PORT = "55477"
DB = "apexos"
SIX = ("admin_block_audit_log", "ai_jobs", "ai_queue_events",
       "ai_queue_state", "campuses", "organizations")
AI = ("ai_jobs", "ai_queue_events", "ai_queue_state")


def sql(statement, *, fail_allowed=False):
    proc = subprocess.run(
        ["runuser", "-u", "postgres", "--", "psql", "-X", "-A", "-t",
         "-p", PORT, "-d", DB, "-v", "ON_ERROR_STOP=1", "-c", statement],
        text=True, capture_output=True, timeout=15)
    if proc.returncode and not fail_allowed:
        raise RuntimeError("Isolated PostgreSQL test failed: " + proc.stderr[:350])
    return proc.returncode, proc.stdout.strip()


def role_can_query(role, table):
    stmt = ("BEGIN READ ONLY; SET LOCAL ROLE " + role +
            "; SELECT 1 FROM public." + table + " LIMIT 0; ROLLBACK;")
    return sql(stmt, fail_allowed=True)[0] == 0


def main():
    check = []
    def test(title, truth):
        check.append((title, bool(truth)))
        print(("PASS " if truth else "FAIL ") + title, flush=True)

    _, facts = sql("SELECT current_database()||'|'||current_setting('port');")
    if facts != DB + "|" + PORT or os.geteuid() != 0:
        raise RuntimeError("QA-only port/database/root guard rejected test")

    _, numbers = sql("SELECT count(*)::text||'|'||count(*) FILTER(WHERE marks_obtained=0)::text"
                     " FROM exam_results WHERE school_id=1 AND exam_id=9;")
    test("full ACL clone preserves 1,762 real-snapshot scores and 213 numeric zeroes",
         numbers == "1762|213")

    _, baseline = sql(
        "SELECT md5(string_agg(concat_ws('|',id,exam_id,student_id,subject,marks_obtained,total_marks),"
        "E'\\n' ORDER BY id)) FROM exam_results WHERE school_id=1 AND exam_id=9 AND id<=306;")
    test("original 301-row fingerprint exact",
         baseline == "bcdc098a3e6cabb6f4c31736b14e39b9")

    _, source = sql(
        "SELECT count(*) FROM pg_auth_members m"
        " JOIN pg_roles child ON child.oid=m.member"
        " JOIN pg_roles parent ON parent.oid=m.roleid"
        " WHERE child.rolname='assps_core_green_runtime'"
        " AND parent.rolname='apex_app_runtime';")
    test("dangerous parent membership removed from green only", source == "0")

    test("all six global tables DENIED to signed Green role",
         all(not role_can_query("assps_core_green_runtime", t) for t in SIX))
    test("all six parent role reads preserved for unchanged Blue",
         all(role_can_query("apex_app_runtime", t) for t in SIX))
    test("all three AI queue objects readable by separate QA AI worker",
         all(role_can_query("assps_core_qa_ai_worker", t) for t in AI))
    test("AI worker DENIED campus/org/audit global information",
         all(not role_can_query("assps_core_qa_ai_worker", t)
                 for t in ("campuses", "organizations", "admin_block_audit_log")))
    test("directory reader can read only the two global directory tables",
         all(role_can_query("assps_core_qa_directory_reader", t)
             for t in ("campuses", "organizations")) and
         not role_can_query("assps_core_qa_directory_reader", "ai_jobs"))
    test("audit writer cannot read global audit records or queue",
         not role_can_query("assps_core_qa_audit_writer", "admin_block_audit_log") and
         not role_can_query("assps_core_qa_audit_writer", "ai_jobs"))

    _, guard = sql("""
    SELECT count(DISTINCT c.oid) FROM pg_class c JOIN pg_policies p
    ON p.schemaname='public' AND p.tablename=c.relname
    WHERE c.relnamespace='public'::regnamespace
    AND p.policyname='core_signed_tenant_guard'
    AND has_table_privilege('assps_core_green_runtime',c.oid,'SELECT')
    """)
    test("75 previously parent-readable FORCE-RLS tables retain Green reads",
         guard == "75")
    test("unsigned Green has zero school rows under signed school predicate",
         "0" in sql("BEGIN READ ONLY; SET LOCAL ROLE assps_core_green_runtime;"
             " SELECT count(*) FROM public.schools; ROLLBACK;")[1].splitlines())

    _, membership = sql("""
      SELECT count(*) FROM pg_auth_members m
      JOIN pg_roles child ON child.oid=m.member
      JOIN pg_roles parent ON parent.oid=m.roleid
      WHERE child.rolname IN ('assps_core_green_runtime','assps_core_green_login')
        AND parent.rolname IN ('assps_core_qa_ai_worker',
          'assps_core_qa_directory_reader','assps_core_qa_audit_writer')
    """)
    test("Green cannot inherit or SET ROLE any separate worker role", membership == "0")

    # Actual physical role membership rollback *inside a rolled-back QA transaction*:
    # prove restoring Blue grants all six, without changing the accepted Green test state.
    _, restore_check = sql(
        "BEGIN; GRANT apex_app_runtime TO assps_core_green_runtime"
        " WITH INHERIT TRUE, SET FALSE;"
        " SELECT count(*) FROM pg_class c WHERE"
        " c.relnamespace='public'::regnamespace AND"
        " c.relname IN ('admin_block_audit_log','ai_jobs','ai_queue_events',"
        "'ai_queue_state','campuses','organizations')"
        " AND has_table_privilege('assps_core_green_runtime',c.oid,'SELECT');"
        " ROLLBACK;")
    test("role rollback to previously working ACL restores all six in rehearsal",
         "6" in restore_check.splitlines())

    _, post = sql("SELECT count(*) FROM pg_auth_members m JOIN pg_roles r"
                  " ON r.oid=m.member JOIN pg_roles p ON p.oid=m.roleid"
                  " WHERE r.rolname='assps_core_green_runtime'"
                  " AND p.rolname='apex_app_runtime';")
    test("QA rollback rehearsal itself leaves Green isolated", post == "0")
    ok = sum(1 for _,v in check if v)
    print(f"ASSPS_SIX_GLOBAL_FULLACL_QA {ok}/{len(check)} PASS" if ok == len(check)
          else f"ASSPS_SIX_GLOBAL_FULLACL_QA {ok}/{len(check)} FAIL")
    return 0 if ok == len(check) else 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("ASSPS_QA_SAFE_STOP " + str(exc), file=sys.stderr)
        sys.exit(2)
