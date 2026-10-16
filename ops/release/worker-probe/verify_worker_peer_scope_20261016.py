#!/usr/bin/env python3
"""Strict READ ONLY real OS peer PostgreSQL worker scope probe. No release authority."""
import json
import os
import subprocess
import sys

ACTOR = "assps_ai_worker_login"
EXPECTED_MEMBERSHIPS = ["assps_core_ai_worker"]
EXPECTED_TABLE_RIGHTS = {
    "public.ai_jobs": "SIUD",
    "public.ai_queue_events": "SID",
    "public.ai_queue_state": "SIU",
}
EXPECTED_SEQUENCE_RIGHTS = {
    "public.ai_queue_events_id_seq": {"usage":True,"select":False,"update":False},
}
DENIED_TABLES = ("students","exam_results","organizations","campuses","admin_block_audit_log")
PROBE_SQL = """SELECT json_build_object(
'actor',current_user,'session',session_user,
'login',(SELECT rolcanlogin FROM pg_roles WHERE rolname=current_user),
'super',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user),
'bypass',(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user),
'memberships',COALESCE((SELECT json_agg(r.rolname ORDER BY r.rolname)
  FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid
  WHERE m.member=(SELECT oid FROM pg_roles WHERE rolname=current_user)),'[]'::json),
'tables',COALESCE((SELECT json_object_agg(n.nspname||'.'||c.relname,concat(
  CASE WHEN has_table_privilege(current_user,c.oid,'SELECT') THEN 'S' ELSE '' END,
  CASE WHEN has_table_privilege(current_user,c.oid,'INSERT') THEN 'I' ELSE '' END,
  CASE WHEN has_table_privilege(current_user,c.oid,'UPDATE') THEN 'U' ELSE '' END,
  CASE WHEN has_table_privilege(current_user,c.oid,'DELETE') THEN 'D' ELSE '' END))
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','v','m','f')
    AND (has_table_privilege(current_user,c.oid,'SELECT')
      OR has_table_privilege(current_user,c.oid,'INSERT')
      OR has_table_privilege(current_user,c.oid,'UPDATE')
      OR has_table_privilege(current_user,c.oid,'DELETE'))),'{}'::json),
'sequences',COALESCE((SELECT json_object_agg(n.nspname||'.'||c.relname,json_build_object(
   'usage',has_sequence_privilege(current_user,c.oid,'USAGE'),
   'select',has_sequence_privilege(current_user,c.oid,'SELECT'),
   'update',has_sequence_privilege(current_user,c.oid,'UPDATE')))
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE left(n.nspname,3)<>'pg_' AND n.nspname<>'information_schema' AND c.relkind='S'
 AND (has_sequence_privilege(current_user,c.oid,'USAGE')
 OR has_sequence_privilege(current_user,c.oid,'SELECT')
 OR has_sequence_privilege(current_user,c.oid,'UPDATE'))),'{}'::json)
)::text"""

def verdict(facts, denials):
    errors = []
    if not isinstance(facts,dict):
        errors.append("MISSING_DATABASE_IDENTITY")
        facts={}
    for key in ("actor","session"):
        if facts.get(key) != ACTOR: errors.append("BAD_"+key.upper())
    for key,value in (("login",True),("super",False),("bypass",False)):
        if facts.get(key) is not value: errors.append("INVALID_ROLE_"+key.upper())
    if facts.get("memberships") != EXPECTED_MEMBERSHIPS:
        errors.append("UNEXPECTED_INHERITED_ROLE")
    if facts.get("tables") != EXPECTED_TABLE_RIGHTS:
        errors.append("UNEXPECTED_TABLE_PRIVILEGE")
    if facts.get("sequences") != EXPECTED_SEQUENCE_RIGHTS:
        errors.append("UNEXPECTED_SEQUENCE_PRIVILEGE")
    if not isinstance(denials,dict) or set(denials) != set(DENIED_TABLES) or any(value != "42501" for value in denials.values()):
        errors.append("REAL_SENSITIVE_SQL_DENIAL_INCOMPLETE")
    return {"status":"PEER_WORKER_SCOPE_PASS_NOT_RELEASE" if not errors else "HOLD",
            "errors":errors,"actor":facts.get("actor","UNVERIFIED"),
            "effectiveQueueTableCount":len(EXPECTED_TABLE_RIGHTS) if not errors else 0,
            "sensitiveSqlDenials":len(DENIED_TABLES) if not errors else 0,
            "readOnly":True,"productionChanged":False,
            "signedWorkerTransportCertified":False,"signedIndependentSchool2Certified":False,
            "releaseAuthorized":False}

def execute(statement):
    env=dict(os.environ)
    env["PGOPTIONS"]="-c default_transaction_read_only=on -c statement_timeout=8000"
    return subprocess.run(["runuser","-u",ACTOR,"--","psql",
        "-X","-A","-t","-v","ON_ERROR_STOP=1","-v","VERBOSITY=verbose",
        "-h","/var/run/postgresql","-p","5432","-d","apexos","-c",statement],
        env=env,capture_output=True,text=True,timeout=15)

def main():
    try:
        p=execute(PROBE_SQL)
        if p.returncode !=0: raise ValueError("WORKER_PEER_PROBE_FAILED")
        facts=json.loads(p.stdout.strip())
        denials={}
        for table in DENIED_TABLES:
            p=execute("SELECT 1 FROM public."+table+" LIMIT 0")
            denials[table]="42501" if p.returncode!=0 and "42501" in p.stderr and "permission denied" in p.stderr.lower() else "FAILED"
        result=verdict(facts,denials)
    except (OSError,ValueError,subprocess.TimeoutExpired,json.JSONDecodeError) as exc:
        result={"status":"HOLD","errors":["PROBE_FAILURE_"+type(exc).__name__],
                "readOnly":True,"productionChanged":False,"releaseAuthorized":False}
    print(json.dumps({"schema":"ASSPS_WORKER_PEER_SCOPE_V1",**result},sort_keys=True))
    return 0 if result["status"]=="PEER_WORKER_SCOPE_PASS_NOT_RELEASE" else 2

if __name__=="__main__":sys.exit(main())
