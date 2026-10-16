#!/usr/bin/env python3
"""Read-only live PostgreSQL role-membership/privilege-graph audit. NEVER a signed release approval."""
import json
import os
import subprocess
import sys

ACTORS = {
    "assps_ai_worker_login": ("assps_core_ai_worker", True, False),
    "assps_core_green_login": ("assps_core_green_runtime", False, True),
    "assps_marks_signed_login": ("assps_marks_signed_runtime", False, True),
}
ROLES = tuple(sorted(set(ACTORS) | {v[0] for v in ACTORS.values()}))
SENSITIVE = ("students", "exam_results", "organizations", "campuses", "admin_block_audit_log")
QUEUES = ("ai_jobs", "ai_queue_events", "ai_queue_state")
TABLES = tuple(sorted(SENSITIVE + QUEUES))
EXPECTED_QUEUE = {"ai_jobs": "SIUD", "ai_queue_events": "SID", "ai_queue_state": "SIU"}
LIST_ROLES = ",".join("'" + r + "'" for r in ROLES)
LIST_TABLES = ",".join("'" + t + "'" for t in TABLES)
SQL = """
SELECT json_build_object(
'roles',(SELECT COALESCE(json_agg(json_build_object(
  'name',rolname,'login',rolcanlogin,'super',rolsuper,
  'bypass',rolbypassrls,'create_role',rolcreaterole,
  'create_db',rolcreatedb,'replicate',rolreplication
) ORDER BY rolname),'[]'::json) FROM pg_roles WHERE rolname IN (ROLE_NAMES)),
'edges',(SELECT COALESCE(json_agg(json_build_object(
  'member',m.rolname,'granted',r.rolname,
  'inherit',a.inherit_option,'set',a.set_option,'admin',a.admin_option
) ORDER BY m.rolname,r.rolname),'[]'::json) FROM pg_auth_members a
JOIN pg_roles m ON m.oid=a.member JOIN pg_roles r ON r.oid=a.roleid
WHERE m.rolname IN (ROLE_NAMES)),
'grants',(SELECT COALESCE(json_agg(json_build_object(
  'role',p.rolname,'table',c.relname,
  'rights',concat(
  CASE WHEN has_table_privilege(p.rolname,c.oid,'SELECT') THEN 'S' ELSE '' END,
  CASE WHEN has_table_privilege(p.rolname,c.oid,'INSERT') THEN 'I' ELSE '' END,
  CASE WHEN has_table_privilege(p.rolname,c.oid,'UPDATE') THEN 'U' ELSE '' END,
  CASE WHEN has_table_privilege(p.rolname,c.oid,'DELETE') THEN 'D' ELSE '' END)
) ORDER BY p.rolname,c.relname),'[]'::json)
FROM pg_roles p CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE p.rolname IN (ROLE_NAMES) AND n.nspname='public'
AND c.relkind IN ('r','p') AND c.relname IN (TABLE_NAMES)),
'protected',(SELECT COALESCE(json_agg(json_build_object(
 'table',c.relname,'rls',c.relrowsecurity,'force',c.relforcerowsecurity
) ORDER BY c.relname),'[]'::json)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('students','exam_results'))
)
""".replace("ROLE_NAMES",LIST_ROLES).replace("TABLE_NAMES",LIST_TABLES)


def evaluate(evidence):
    """Pure, exact-set validation. Intentionally fails closed on privilege/membership drift."""
    issues = []
    roles = evidence.get("roles")
    edges = evidence.get("edges")
    grants = evidence.get("grants")
    protected = evidence.get("protected")
    if not all(isinstance(v, list) for v in (roles, edges, grants, protected)):
        return ["MALFORMED_EVIDENCE"]
    by_role = {r.get("name"): r for r in roles if isinstance(r, dict)}
    if len(roles) != len(ROLES) or set(by_role) != set(ROLES):
        issues.append("MISSING_OR_DUPLICATE_ROLE")
    for name in ROLES:
        role = by_role.get(name, {})
        login = name in ACTORS
        expected = {"login":login, "super":False, "bypass":False,
                    "create_role":False, "create_db":False, "replicate":False}
        for field, value in expected.items():
            if type(role.get(field)) is not bool or role.get(field) != value:
                issues.append("UNSAFE_ROLE_ATTRIBUTE:" + name + ":" + field)
    expected_edges = {(name, granted, inherit, can_set) for name,(granted,inherit,can_set) in ACTORS.items()}
    observed = set()
    for edge in edges:
        if not isinstance(edge, dict):
            issues.append("MALFORMED_MEMBERSHIP")
            continue
        observed.add((edge.get("member"),edge.get("granted"),edge.get("inherit"),edge.get("set")))
        if edge.get("admin") is not False:
            issues.append("UNEXPECTED_ROLE_ADMIN_OPTION")
    if observed != expected_edges or len(edges) != len(expected_edges):
        issues.append("ROLE_MEMBERSHIP_DRIFT")
    actual = {}
    for row in grants:
        if not isinstance(row, dict):
            issues.append("MALFORMED_GRANT")
            continue
        key=(row.get("role"),row.get("table"))
        if key in actual:
            issues.append("DUPLICATE_GRANT")
        actual[key]=row.get("rights")
    expected = {}
    for role in ROLES:
        for table in TABLES:
            if role in ("assps_ai_worker_login","assps_core_ai_worker"):
                rights = EXPECTED_QUEUE.get(table,"")
            elif role in ("assps_marks_signed_runtime","assps_core_green_runtime"):
                rights = "SIUD" if table in ("students","exam_results") else ""
            else:
                rights = ""
            expected[(role,table)] = rights
    if set(actual) != set(expected):
        issues.append("MISSING_OR_EXTRA_GRANT_ROW")
    for key, rights in expected.items():
        if actual.get(key) != rights:
            issues.append("EFFECTIVE_GRANT_DRIFT:" + ":".join(key))
    rls = {x.get("table"):(x.get("rls"),x.get("force")) for x in protected if isinstance(x,dict)}
    if len(protected) != 2 or rls != {"students":(True,True),"exam_results":(True,True)}:
        issues.append("RESULT_STUDENT_FORCE_RLS_DRIFT")
    return sorted(set(issues))


def read_production():
    env=dict(os.environ)
    env["PGOPTIONS"]="-c default_transaction_read_only=on -c statement_timeout=12000"
    p=subprocess.run(["runuser","-u","postgres","--","psql","-X","-A","-t",
      "-v","ON_ERROR_STOP=1","-h","/var/run/postgresql","-p","5432",
      "-d","apexos","-c",SQL],env=env,capture_output=True,text=True,timeout=20)
    if p.returncode:
        raise RuntimeError("READONLY_CATALOG_QUERY_FAILED")
    return json.loads(p.stdout.strip())


def main():
    try:
        evidence=read_production()
        issues=evaluate(evidence)
    except (OSError,RuntimeError,ValueError,subprocess.TimeoutExpired,json.JSONDecodeError):
        issues=["READONLY_PROBE_ERROR"]
    passed = not issues
    print(json.dumps({
       "schema":"ASSPS_LIVE_ROLE_MEMBERSHIP_GRANTS_V1",
       "status":"ROLE_GRAPH_PASS_UNSIGNED_NOT_RELEASE" if passed else "HOLD",
       "issue_codes":issues,
       "roles_checked":len(ROLES),"direct_membership_edges_expected":len(ACTORS),
       "effective_table_grants_checked":len(ROLES)*len(TABLES),
       "liveSignedExternalAcceptance":False,
       "authenticatedSchool2UserTest":False,
       "productionChanged":False,"releaseAuthorized":False},sort_keys=True))
    return 0 if passed else 2


if __name__=="__main__":
    sys.exit(main())
