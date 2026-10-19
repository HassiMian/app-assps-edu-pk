#!/usr/bin/env python3
"""Non-mutating FORCE-RLS catalog drift evidence, including verified Oct19 three-document delta; NOT release authorization."""
import json
import os
import subprocess
import sys

DB = "apexos"
PORT = "5432"

SQL = {
 "original_guards": """SELECT count(*) FROM pg_policies p JOIN pg_class c ON c.relname=p.tablename AND c.relnamespace='public'::regnamespace WHERE p.schemaname='public' AND p.policyname='core_signed_tenant_guard' AND p.permissive='RESTRICTIVE' AND p.cmd='ALL' AND 'assps_marks_signed_runtime'=ANY(p.roles) AND c.relrowsecurity AND c.relforcerowsecurity AND p.qual IN ('core_security.signed_school_allowed(school_id)','core_security.signed_school_allowed(id)','core_security.signed_tenant_key_allowed((tenant_id)::text)')""",
 "green_guards": """SELECT count(*) FROM pg_policies p JOIN pg_class c ON c.relname=p.tablename AND c.relnamespace='public'::regnamespace WHERE p.schemaname='public' AND p.policyname='core_signed_tenant_guard' AND p.permissive='RESTRICTIVE' AND p.cmd='ALL' AND 'assps_core_green_runtime'=ANY(p.roles) AND c.relrowsecurity AND c.relforcerowsecurity AND p.qual IN ('core_security.signed_school_allowed(school_id)','core_security.signed_school_allowed(id)','core_security.signed_tenant_key_allowed((tenant_id)::text)')""",
 "original_allows": """SELECT count(*) FROM pg_policies p JOIN pg_class c ON c.relname=p.tablename AND c.relnamespace='public'::regnamespace WHERE p.schemaname='public' AND p.policyname='core_signed_tenant_allow' AND p.permissive='PERMISSIVE' AND 'assps_marks_signed_runtime'=ANY(p.roles) AND c.relrowsecurity AND c.relforcerowsecurity AND p.qual IN ('core_security.signed_school_allowed(school_id)','core_security.signed_school_allowed(id)','core_security.signed_tenant_key_allowed((tenant_id)::text)')""",
 "unpaired": """WITH guards AS (SELECT tablename FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'), allows AS (SELECT tablename FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_allow') SELECT count(*) FROM guards g FULL JOIN allows a USING(tablename) WHERE g.tablename IS NULL OR a.tablename IS NULL""",
 "forced_total": """SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relforcerowsecurity AND relname<>'student_class_movement_audit'""",
 "document_three_forced": """SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r'
 AND relname IN ('school_documents','school_document_events','school_document_revisions')
 AND relrowsecurity AND relforcerowsecurity""",
 "document_three_restrictive_guards": """SELECT count(*) FROM pg_policies
 WHERE schemaname='public'
 AND tablename IN ('school_documents','school_document_events','school_document_revisions')
 AND policyname=tablename||'_failclosed_20261019'
 AND permissive='RESTRICTIVE' AND cmd='ALL' AND 'public'=ANY(roles)
 AND qual LIKE '%app.rls_enabled%' AND qual LIKE '%app.tenant_id%'
 AND qual LIKE '%AND%'
 AND with_check LIKE '%app.rls_enabled%' AND with_check LIKE '%app.tenant_id%'
 AND with_check LIKE '%AND%'""",
 "document_six_legacy_policies": """SELECT count(*) FROM pg_policies
 WHERE schemaname='public'
 AND tablename IN ('school_documents','school_document_events','school_document_revisions')
 AND policyname IN (tablename||'_app_runtime',tablename||'_tenant_fallback')""",
 "five_new": """SELECT count(DISTINCT c.relname) FROM pg_class c JOIN pg_policies p ON p.schemaname='public' AND p.tablename=c.relname WHERE c.relnamespace='public'::regnamespace AND c.relname IN ('grade910_human_signoff_evidence','grade910_personal_signature_assets','grade910_supporting_evidence_objects','grade910_verified_paper_publications','school_academic_approval_events') AND c.relrowsecurity AND c.relforcerowsecurity AND p.permissive='PERMISSIVE' AND p.qual='core_security.signed_school_allowed(school_id)'""",
 "five_policy_count": """SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('grade910_human_signoff_evidence','grade910_personal_signature_assets','grade910_supporting_evidence_objects','grade910_verified_paper_publications','school_academic_approval_events')""",
 "five_unscoped": """SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('grade910_human_signoff_evidence','grade910_personal_signature_assets','grade910_supporting_evidence_objects','grade910_verified_paper_publications','school_academic_approval_events') AND (permissive<>'PERMISSIVE' OR qual IS DISTINCT FROM 'core_security.signed_school_allowed(school_id)')""",
 "four_new": """SELECT count(DISTINCT c.relname) FROM pg_class c JOIN pg_policies p ON p.schemaname='public' AND p.tablename=c.relname WHERE c.relnamespace='public'::regnamespace AND c.relname IN ('assps_grade_revision_audit_20261014','employee_teaching_subject_evidence','school_class_promotion_plans','school_class_promotion_source_roster') AND c.relrowsecurity AND NOT c.relforcerowsecurity AND pg_get_userbyid(c.relowner)='postgres' AND p.permissive='PERMISSIVE' AND p.cmd='SELECT' AND p.qual='core_security.signed_school_allowed(school_id)'""",
 "four_unscoped_policies": """SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('assps_grade_revision_audit_20261014','employee_teaching_subject_evidence','school_class_promotion_plans','school_class_promotion_source_roster') AND (permissive<>'PERMISSIVE' OR cmd<>'SELECT' OR qual IS DISTINCT FROM 'core_security.signed_school_allowed(school_id)')""",
 "four_app_acl_exposure": """SELECT count(*) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relname IN ('assps_grade_revision_audit_20261014','employee_teaching_subject_evidence','school_class_promotion_plans','school_class_promotion_source_roster') AND (has_table_privilege('apexos_user',c.oid,'SELECT') OR has_table_privilege('apexos_user',c.oid,'INSERT') OR has_table_privilege('apexos_user',c.oid,'UPDATE') OR has_table_privilege('apexos_user',c.oid,'DELETE'))""",
 "runtime_roles_safe": """SELECT count(*) FROM pg_roles WHERE rolname IN ('apexos_user','assps_marks_signed_runtime','assps_core_green_runtime') AND NOT rolbypassrls AND NOT rolsuper""",
}

EXPECTED = dict(original_guards=77, green_guards=77, original_allows=77, unpaired=0, forced_total=85, document_three_forced=3, document_three_restrictive_guards=3, document_six_legacy_policies=6,
                five_new=5, five_policy_count=5, five_unscoped=0, four_new=4, four_unscoped_policies=0,
                four_app_acl_exposure=0, runtime_roles_safe=3)

def verdict(facts):
    failures = [key for key, expected in EXPECTED.items() if facts.get(key) != expected]
    return {"status": "CATALOG_PASS_NOT_RELEASE" if not failures else "HOLD",
            "failures": failures, "readOnly": True, "productionChanged": False,
            "securityCertification": False, "releaseAuthorized": False}

def sql_readonly(statement):
    env = os.environ.copy()
    env["PGOPTIONS"] = "-c default_transaction_read_only=on -c statement_timeout=10000"
    process = subprocess.run(["runuser","-u","postgres","--","psql","-X","-A","-t","-v","ON_ERROR_STOP=1",
          "-p",PORT,"-d",DB,"-c",statement], env=env, capture_output=True, text=True, timeout=15)
    if process.returncode: raise RuntimeError("read-only catalog query failed")
    return int(process.stdout.strip())

def main():
    facts = {name:sql_readonly(q) for name,q in SQL.items()}
    result = verdict(facts)
    print(json.dumps({"schema":"ASSPS_SIGNED_RLS_DRIFT_AUDIT_V1","facts":facts, **result},sort_keys=True))
    return 0 if result["status"] == "CATALOG_PASS_NOT_RELEASE" else 2

if __name__=="__main__":
    try: sys.exit(main())
    except (RuntimeError,ValueError,subprocess.TimeoutExpired) as e:
        print(json.dumps({"status":"HOLD","error":type(e).__name__,"releaseAuthorized":False}))
        sys.exit(2)
