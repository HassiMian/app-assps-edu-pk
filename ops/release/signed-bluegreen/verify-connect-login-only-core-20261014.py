#!/usr/bin/env python3
"""SaaS Core login-ONLY PRE-cutover: read-only, signed & fail closed.

Independent of academic max-mark/publication gates. This only authorizes
review of a *future* atomic Connect+Nginx cutover. It does not execute one.
No credentials, signing keys, student rows or staff passwords are read.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from datetime import datetime, timezone, timedelta

ROOT=Path(__file__).resolve().parents[3]
TRUST=Path('/etc/assps/release-evidence-ed25519.pub')
RECEIPTS=Path('/etc/assps/connect-login-precutover-core-receipts.json')
BACKUP=Path('/root/assps-release-backups/connect-full-recovery-20261014T170713Z/apexos-full.dump')
ROLLBACK=Path('/var/backups/apex-connect-build-XI7EvxpUMkKOxK5ByM2BH.tar.gz')
CATALOG=ROOT/'ops/release/signed-bluegreen/audit-current-signed-catalog-20261014.py'
MARKS=ROOT/'ops/release/exam9-status-20261013/verify_exam9_active_roster_coverage_20261014.py'


def run(args, timeout=30):
    try:
        p=subprocess.run(args,capture_output=True,text=True,timeout=timeout,check=False)
        return p.returncode,p.stdout.strip()
    except (OSError,subprocess.TimeoutExpired):
        return 127,''

def verified_owner_key():
    try:
        from cryptography.hazmat.primitives.serialization import load_pem_public_key
        st=TRUST.lstat()
        if not TRUST.is_file() or st.st_uid!=0 or (st.st_mode & 0o022):return None
        x=load_pem_public_key(TRUST.read_bytes())
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        return x if isinstance(x,Ed25519PublicKey) else None
    except (OSError,ImportError,ValueError):
        return None

def verify_signed_peer_tenant_receipt(bundle, key, release_id, source_sha, build_id, now=None):
    if key is None or not isinstance(bundle,dict):return False
    now=now or datetime.now(timezone.utc)
    for item in bundle.get('receipts',[]):
        try:
            data=base64.b64decode(item['payload_b64'],validate=True)
            signature=base64.b64decode(item['signature_b64'],validate=True)
            if len(data)>16384 or len(signature)!=64:continue
            key.verify(signature,data)
            claim=json.loads(data)
            observed=datetime.fromisoformat(claim['observed_at'].replace('Z','+00:00'))
            if observed.tzinfo is None or observed>now+timedelta(minutes=5) or observed<now-timedelta(hours=24):continue
            if (claim.get('kind')=='signed_peer_tenant_denial' and
                claim.get('issuer')=='SAAS_CORE' and
                claim.get('environment')=='production' and
                claim.get('release_scope')=='CONNECT_LOGIN_ONLY' and
                claim.get('release_id')==release_id and
                claim.get('source_sha256')==source_sha and
                claim.get('build_id')==build_id and
                claim.get('origin')=='https://api.assps.edu.pk' and
                claim.get('school_id')==1 and
                claim.get('actor_role')=='security_reviewer' and
                claim.get('status')=='PASS' and
                claim.get('academic_results_published') is False and
                claim.get('cross_tenant_denial_tested') is True and
                claim.get('unassigned_subject_denial_tested') is True and
                re.fullmatch('[0-9a-f]{64}',claim.get('evidence_digest',''))):
                return True
        except (KeyError,ValueError,TypeError):
            continue
        except Exception:
            continue
    return False

def verify_signed_worker_receipt(bundle, key, release_id, source_sha, build_id, now=None):
    """Genuine Core-signed worker separation proof; no fake QA staff/session."""
    if key is None or not isinstance(bundle,dict):return False
    now=now or datetime.now(timezone.utc)
    for item in bundle.get('receipts',[]):
        try:
            data=base64.b64decode(item['payload_b64'],validate=True)
            sig=base64.b64decode(item['signature_b64'],validate=True)
            if len(data)>16384 or len(sig)!=64:continue
            key.verify(sig,data)
            claim=json.loads(data)
            observed=datetime.fromisoformat(claim['observed_at'].replace('Z','+00:00'))
            if observed.tzinfo is None or observed>now+timedelta(minutes=5) or observed<now-timedelta(hours=1):continue
            if (claim.get('kind')=='verified_separate_worker_transport' and
                claim.get('issuer')=='SAAS_CORE' and
                claim.get('environment')=='production' and
                claim.get('release_scope')=='CONNECT_LOGIN_ONLY' and
                claim.get('release_id')==release_id and
                claim.get('source_sha256')==source_sha and
                claim.get('build_id')==build_id and
                claim.get('school_id')==1 and
                claim.get('actor_role')=='core_security_reviewer' and
                claim.get('status')=='PASS' and
                claim.get('authenticated_worker_sql_role')=='assps_core_ai_worker' and
                claim.get('separate_worker_login_verified') is True and
                claim.get('global_queue_transaction_verified') is True and
                claim.get('global_worker_org_and_audit_denied') is True and
                claim.get('tenant_role_worker_impersonation_denied') is True and
                claim.get('academic_results_published') is False and
                re.fullmatch('[0-9a-f]{64}',claim.get('evidence_digest',''))):
                return True
        except (KeyError,TypeError,ValueError):
            continue
        except Exception:
            continue
    return False

def verify_signed_recovery_receipt(bundle, key, release_id, source_sha, build_id, now=None):
    """Require independently signed off-VPS encrypted recovery and rollback."""
    if key is None or not isinstance(bundle,dict):return False
    now=now or datetime.now(timezone.utc)
    for item in bundle.get('receipts',[]):
        try:
            data=base64.b64decode(item['payload_b64'],validate=True)
            sig=base64.b64decode(item['signature_b64'],validate=True)
            if len(data)>16384 or len(sig)!=64:continue
            key.verify(sig,data)
            c=json.loads(data)
            ts=datetime.fromisoformat(c['observed_at'].replace('Z','+00:00'))
            if ts.tzinfo is None or ts>now+timedelta(minutes=5) or ts<now-timedelta(hours=2):continue
            if (c.get('kind')=='offhost_encrypted_recovery_certified' and
                c.get('issuer')=='SAAS_CORE' and
                c.get('environment')=='production' and
                c.get('release_scope')=='CONNECT_LOGIN_ONLY' and
                c.get('release_id')==release_id and
                c.get('source_sha256')==source_sha and
                c.get('build_id')==build_id and
                c.get('school_id')==1 and
                c.get('actor_role')=='disaster_recovery_reviewer' and
                c.get('status')=='PASS' and
                c.get('backup_includes_all_current_marks') is True and
                c.get('complete_acl_restore_verified') is True and
                c.get('offsite_encrypted_copy_verified') is True and
                c.get('offsite_decryption_rehearsed') is True and
                c.get('application_blue_restore_verified') is True and
                c.get('academic_results_published') is False and
                re.fullmatch('[0-9a-f]{64}',c.get('evidence_digest',''))):return True
        except (KeyError,ValueError,TypeError):continue
        except Exception:continue
    return False

def deployed_worker_source_parity():
    """Read-only exact backend adapter and caller bytes, not just claimed SHA.

    An old production service may have worker DB credentials/roles without
    actually running the reviewed fail-closed adapter. That MUST remain HOLD.
    """
    reviewed=ROOT/'al-siddique-backend/src'
    deployed=Path('/var/www/apex-backend/src')
    required=('services/ai/aiQueueWorkerDatabase.js',
              'services/ai/paperAiQueue.js',
              'routes/opsRoutes.js')
    try:
        for rel in required:
            source=reviewed/rel
            active=deployed/rel
            if (not source.is_file() or not active.is_file() or
                    hashlib.sha256(source.read_bytes()).digest()!=
                    hashlib.sha256(active.read_bytes()).digest()):
                return False
        return True
    except OSError:
        return False


def worker_config_present(env):
    """Boolean-only validation: never return/print connection credentials."""
    worker=str(env.get('DB_AI_WORKER_USER') or '')
    dbuser=str(env.get('DB_USER') or '')
    if not re.fullmatch('[a-z_][a-z0-9_]{0,62}',worker):return False
    if worker in ('postgres','apexos_user','assps_core_green_login',dbuser):return False
    if (str(env.get('DB_AI_WORKER_ROLE') or 'assps_core_ai_worker')!=
            'assps_core_ai_worker'):return False
    if str(env.get('DB_AI_WORKER_PORT'))!='5432':return False
    if str(env.get('DB_AI_WORKER_NAME'))!='apexos':return False
    return all(bool(str(env.get(k) or '').strip()) for k in
        ('DB_AI_WORKER_HOST','DB_AI_WORKER_PASSWORD'))


def inspect_worker_catalog(worker_login):
    """READ-ONLY effective role privileges; no worker login/password attempted.

    This supplements but NEVER replaces the genuinely authenticated signed
    Core worker receipt. No live role or ACL is modified by this function.
    """
    if not re.fullmatch('[a-z_][a-z0-9_]{0,62}',worker_login):return False
    if worker_login in ('postgres','apexos_user','assps_core_green_login'):
        return False
    # Every effective privilege is checked, not only SELECT. Otherwise an
    # unauthorized Green user could retain UPDATE/DELETE on an invisible row.
    global_tables=('admin_block_audit_log','ai_jobs','ai_queue_events',
                   'ai_queue_state','campuses','organizations')
    denied_to_green=''.join(
        "AND NOT has_table_privilege('assps_core_green_runtime',"+
        "'public."+table+"','"+priv+"') "
        for table in global_tables for priv in ('SELECT','INSERT','UPDATE','DELETE'))
    denied_worker_global=''.join(
        "AND NOT has_table_privilege(worker.oid,'public."+table+
        "','"+priv+"') "
        for table in ('organizations','campuses','admin_block_audit_log')
        for priv in ('SELECT','INSERT','UPDATE','DELETE'))
    # The role identifier is character-class validated before SQL literal use.
    sql=(
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;'
      "SELECT EXISTS (SELECT 1 FROM pg_roles worker, pg_roles account "
      "WHERE worker.rolname='assps_core_ai_worker' "
      "AND account.rolname='"+worker_login+"' "
      'AND NOT worker.rolcanlogin AND NOT worker.rolsuper '
      'AND NOT worker.rolbypassrls AND NOT worker.rolinherit '
      'AND account.rolcanlogin AND NOT account.rolsuper '
      'AND NOT account.rolbypassrls '
      "AND pg_has_role(account.oid,worker.oid,'USAGE') "
      "AND NOT pg_has_role('assps_core_green_runtime','assps_core_ai_worker','USAGE') "
      "AND NOT pg_has_role('assps_core_green_runtime','assps_core_ai_worker','MEMBER') "
      "AND NOT pg_has_role('assps_core_green_login','assps_core_ai_worker','MEMBER') "
      "AND has_table_privilege(worker.oid,'public.ai_jobs','SELECT') "
      "AND has_table_privilege(worker.oid,'public.ai_queue_events','INSERT') "
      "AND has_table_privilege(worker.oid,'public.ai_queue_state','UPDATE') "
      "AND NOT has_table_privilege(worker.oid,'public.organizations','SELECT') "
      "AND NOT has_table_privilege(worker.oid,'public.campuses','SELECT') "
      "AND NOT has_table_privilege(worker.oid,'public.admin_block_audit_log','SELECT') "
      "AND NOT has_table_privilege('assps_core_green_runtime','public.ai_jobs','SELECT') "
      "AND NOT has_table_privilege('assps_core_green_runtime','public.ai_queue_events','SELECT') "
      "AND NOT has_table_privilege('assps_core_green_runtime','public.ai_queue_state','SELECT') "
      "AND NOT has_table_privilege('assps_core_green_runtime','public.organizations','SELECT') "
      "AND NOT has_table_privilege('assps_core_green_runtime','public.campuses','SELECT') "
      "AND NOT has_table_privilege('assps_core_green_runtime','public.admin_block_audit_log','SELECT') "
      +denied_to_green+denied_worker_global+
      ');COMMIT;')
    rc,text=run(['runuser','-u','postgres','--','psql','-p5432','-d','apexos',
      '-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-c',sql],timeout=18)
    # Transaction's SELECT returns only one isolated boolean line.
    return rc==0 and text.splitlines()==['t']


def evaluate(facts, release_id):
    checks={
      'release_id_pinned':bool(re.fullmatch('[a-zA-Z0-9._-]{8,160}',release_id)),
      'isolated_previously_reviewed_full_acl_backup':facts.get('backup_good') is True,
      'independent_offhost_current_recovery_certified':facts.get('offhost_recovery') is True,
      'production_signed_catalog_safe':facts.get('catalog') == 'PASS_WITH_INDEPENDENT_LIVE_ACCEPTANCE_REQUIRED',
      'production_restricted_signed_transport_enabled':facts.get('signed_transport') is True,
      'exact_reviewed_ai_worker_adapter_deployed':facts.get('worker_code_parity') is True,
      'global_worker_separated_and_authenticated':facts.get('global_worker_ready') is True,
      'live_worker_role_and_inherited_grants_verified':facts.get('worker_catalog') is True,
      'real_signed_peer_school_and_subject_denial':facts.get('peer_school_denial') is True,
      'original_school_marks_integrity_preserved':facts.get('marks_preserved') is True,
      'current_blue_rollback_archive_verified':facts.get('rollback_good') is True,
      'production_nginx_configuration_valid':facts.get('nginx_valid') is True,
      'trusted_external_owner_pinned_key':facts.get('owner_key') is True,
    }
    ok=all(checks.values())
    return {'status':'READY_FOR_LOGIN_ONLY_CORE' if ok else 'HOLD',
      'exact_release_id':release_id,
      'signed_runtime_security_certified':ok,
      'academic_results_published':False,
      'production_deployment_performed':False,
      'checks':checks,
      'blocked':[x for x,y in checks.items() if not y]}

def current_facts(release_id,sha,build):
    valid_backup=False
    try:
        st=BACKUP.stat();valid_backup=st.st_size>1000000 and st.st_mode & 0o077 == 0
        if valid_backup:
            with BACKUP.open('rb') as stream:
                h=hashlib.file_digest(stream,'sha256').hexdigest()
            valid_backup=h=='a357602e36ddb58fa24b2eb6584c4291942444c179bbfa2ea787be7f13655877'
    except OSError:pass
    cat_rc,cat=run([sys.executable,str(CATALOG)],timeout=35)
    try:cat_state=json.loads(cat).get('catalog_preflight') if cat_rc==0 else 'HOLD'
    except (ValueError,TypeError):cat_state='HOLD'
    rc,raw=run(['pm2','jlist'],timeout=15)
    signed=False
    worker_env={}
    try:
        for node in json.loads(raw) if rc==0 else []:
            if node.get('name')=='apex-backend' and node.get('pm2_env',{}).get('status')=='online':
                env=node['pm2_env']
                # Keep only boolean/username-safe worker metadata, not secrets.
                worker_env=env
                signed=(env.get('DB_SIGNED_TENANT_RLS_ENABLED')=='true' and
                        env.get('DB_AUTH_USE_SIGNED_TENANT_CONTEXT')=='true' and
                        env.get('DB_ENFORCE_LEAST_PRIVILEGE_LOGIN')=='true')
    except (ValueError,TypeError,KeyError):pass
    rc,roles=run(['runuser','-u','postgres','--','psql','-p5432','-d','apexos','-X','-t','-A',
      '-c',"SELECT count(*) FROM pg_roles WHERE rolname='assps_core_ai_worker' AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper"],timeout=10)
    # Creating only a NOLOGIN worker role is not proof of real authenticated
    # separated service transport, so this condition alone NEVER turns ready.
    isolated_worker_role=(rc==0 and roles.strip()=='1')
    # Actual signed Green worker adapter must already be safely deployed and
    # genuinely provisioned/accepted by Core, never inferred from QA role.
    global_worker_ready=False
    marks_rc,mark_text=run([sys.executable,str(MARKS)],timeout=35)
    try:
        m=json.loads(mark_text)
        marks=(marks_rc==0 and m.get('original_score_snapshot_intact') is True and
            m.get('integrity',{}).get('duplicate_student_subject')==0 and
            m.get('integrity',{}).get('invalid_bounds')==0)
    except (ValueError,TypeError):marks=False
    rollback=False
    try:
        st=ROLLBACK.stat();rollback=st.st_size>5000000 and st.st_mode&0o077==0
        if rollback:
            rc,_=run(['tar','-tzf',str(ROLLBACK)],timeout=25)
            rollback=rc==0
    except OSError:pass
    rc,_=run(['nginx','-t'],timeout=10)
    public_key=verified_owner_key()
    try: receipts=json.loads(RECEIPTS.read_text())
    except (OSError,ValueError):receipts=None
    worker_login=str(worker_env.get('DB_AI_WORKER_USER') or '')
    worker_catalog=worker_config_present(worker_env) and inspect_worker_catalog(worker_login)
    global_worker_ready=(isolated_worker_role and worker_catalog and
        verify_signed_worker_receipt(receipts,public_key,release_id,sha,build))
    return {
      'backup_good':valid_backup,
      'offhost_recovery':verify_signed_recovery_receipt(receipts,public_key,release_id,sha,build),
      'catalog':cat_state,'signed_transport':signed,
      'worker_code_parity':deployed_worker_source_parity(),
      'global_worker_ready':global_worker_ready,
      'worker_catalog':worker_catalog,
      'peer_school_denial':verify_signed_peer_tenant_receipt(receipts,public_key,release_id,sha,build),
      'marks_preserved':marks,'rollback_good':rollback,'nginx_valid':rc==0,
      'owner_key':public_key is not None,
    }

def main():
    import argparse
    a=argparse.ArgumentParser()
    a.add_argument('--release-id',required=True)
    a.add_argument('--approved-proxy-sha256',required=True)
    a.add_argument('--approved-build-id',required=True)
    x=a.parse_args()
    if not re.fullmatch('[0-9a-f]{64}',x.approved_proxy_sha256) or not re.fullmatch('[A-Za-z0-9_-]{8,128}',x.approved_build_id):
        raise SystemExit('HOLD: valid reviewed candidate provenance required')
    result=evaluate(current_facts(x.release_id,x.approved_proxy_sha256,x.approved_build_id),x.release_id)
    print(json.dumps(result,indent=2,sort_keys=True))
    raise SystemExit(0 if result['status']=='READY_FOR_LOGIN_ONLY_CORE' else 2)
if __name__=='__main__':main()
