#!/usr/bin/env python3
"""Source-pinned UNSIGNED acceptance request. Does not authenticate or sign for humans."""
import datetime,hashlib,importlib.util,json,os,pathlib,sys
BASE=pathlib.Path(__file__).resolve().parent
DEFAULT=pathlib.Path('/root/assps-release-evidence/20261015-genuine-actor-handoff')
def construct(mod):
    checks=mod.current_releases()
    return {'kind':'UNSIGNED_HUMAN_ACCEPTANCE_REQUEST','status':'HOLD',
      'actor_authenticated':False,'independent_human_signed':False,'public_deployed':False,
      'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'core_base':mod.CORE_BASE,'connect_commit':mod.CONNECT_SHA,
      'worker_sha256':mod.WORKER_SHA,'reviewed_connect_build':mod.CONNECT_BUILD,
      'reviewed_connect_proxy_sha256':mod.CONNECT_PROXY_SHA,
      'current_blue_build':mod.BLUE_BUILD,'current_blue_sha256':mod.BLUE_ARCHIVE_SHA,
      'current_database_sha256':mod.DB_DUMP_SHA,
      'technical_stage_checks':checks,'technical_stage_pass':all(checks.values()),
      'tasks':[
        {'actor':'Muhammad Imran personally','id':'teacher','status':'NOT_VERIFIED',
         'action':'School-issued temporary password login -> own password change -> fresh login and assigned teacher portal. Never capture credential/token/cookie.'},
        {'actor':'independently authorized School1 and School2 reviewer','id':'peer_security','status':'NOT_VERIFIED',
         'action':'Real existing sessions, read-only cross-tenant denial, safe non-writing unassigned-subject denial, SHA-digested redacted evidence. No fixture-signed JWT.'},
        {'actor':'independent Core security reviewer','id':'worker','status':'NOT_VERIFIED',
         'action':'Verify actually deployed restricted worker, signed tenant transport and global-table denial before independently signing actual evidence.'},
        {'actor':'independent disaster recovery reviewer','id':'offsite','status':'NOT_VERIFIED',
         'action':'Examine genuine 4/4 laptop X25519/AES-GCM checks and DB/Blue restore against exact hashes, then independently sign observed facts.'},
        {'actor':'SaaS Core release authority','id':'traffic','status':'HOLD',
         'action':'Only after genuine authenticated receipt gates, promote latest live-derived worker and Connect atomically, verify and rehearse real rollback.'}],
      'warning':'UNSIGNED REQUEST ONLY: NEVER feed this file to production as a reviewer-signed receipt.'}
def main():
    spec=importlib.util.spec_from_file_location('joint',BASE/'verify-joint-current-candidates-20261015.py')
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    data=construct(mod);DEFAULT.mkdir(parents=True,exist_ok=True,mode=0o700)
    if DEFAULT.stat().st_mode&0o077:raise SystemExit('Fail closed: evidence directory is not owner-private')
    out=DEFAULT/'unsigned-human-request.json'
    if out.exists():raise SystemExit('Fail closed: do not overwrite existing handoff')
    raw=(json.dumps(data,indent=2,sort_keys=True)+'\n').encode()
    fd=os.open(out,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    with os.fdopen(fd,'wb') as f:f.write(raw)
    print(json.dumps({'status':'HOLD','source_stage':data['technical_stage_pass'],
      'unsigned_actor_tasks':len(data['tasks']),'request_sha256':hashlib.sha256(raw).hexdigest()}))
    return 0 if data['technical_stage_pass'] else 2
if __name__=='__main__':sys.exit(main())
