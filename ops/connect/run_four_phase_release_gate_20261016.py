#!/usr/bin/env python3
"""One-shot APEX Connect phased, fail-closed release readiness evidence.

All operations read-only. This tool cannot approve itself or deploy Nginx.
Never prints sensitive SQL rows or credentials. SaaS Core exclusively promotes.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
from verify_public_anonymous_sensitive_api_denial_20261016 import run as check_public_anonymous_denial

CONNECT_OPS=Path(__file__).resolve().parent
DEFAULT_CORE=Path('/root/workspace/assps-core-unified-p5-20261016')
DEFAULT_NEXT=Path('/root/workspace/apex-connect-eslint-full-source-reconcile-20261016')
DEFAULT_LIVE=Path('/var/www/assps-resultcards-owner-accepted-20261016')
NEXT_BUILD='SAsg3cC_el5cq2_nN2a46'
LIVE_HTML='760b232b493c300fe78908704aef4989c24c25028faac1821dd41f6480210f3c'
CORE_INTEGRATION='b53bf123cfff54cb5413b472667ed8bf55e0a854'
# Exact independently verified descendant; both compiled frontend digests match.
APPROVED_CORE_DIST_SHA={
    CORE_INTEGRATION:'68ad0a2359d84d627ab8055ab28166baa4a43058d38c5fef052ed7f7073c0b89',
    '017d51060349e39150ebd508d0d670c10eb15f5f':'68ad0a2359d84d627ab8055ab28166baa4a43058d38c5fef052ed7f7073c0b89',
    # Independently rebuilt clean Core+Paper+RLS+worker successor; no wildcard refs.
    'e6911732ff52df240390b28b37e531535c58a915':'07f14dad2bd55e0e3104681174925ac5425c6371c179a294ae319ada8672a01e',
    # Independently rebuilt newest approved Core+Paper authored-teacher candidate.
    'a2ff445a492e914e0988b2751da58000bd02b16e':'01805309fef95c61a39088569ae4727bba8a44d80fc8e14d4353c2a793ac30d6',
}
OFFICIAL=Path('/root/workspace/assps-core-connect-gate-exit-hardening-20261015/ops/release/signed-bluegreen/verify-connect-login-only-core-20261014.py')
JOINT_CORE=OFFICIAL.with_name('verify-joint-current-candidates-20261015.py')
NGINX=Path('/etc/nginx/sites-enabled/apex-app-ssl')
PUBLIC_NEXT=Path('/var/www/apex-connect')
RESULT_COUNTS='1763|213'
REQUIRED_OFFICIAL_CHECKS=frozenset((
    'current_blue_rollback_archive_verified',
    'exact_reviewed_ai_worker_adapter_deployed',
    'global_worker_separated_and_authenticated',
    'independent_offhost_current_recovery_certified',
    'isolated_previously_reviewed_full_acl_backup',
    'live_worker_role_and_inherited_grants_verified',
    'original_school_marks_integrity_preserved',
    'production_nginx_configuration_valid',
    'production_restricted_signed_transport_enabled',
    'production_signed_catalog_safe',
    'real_signed_peer_school_and_subject_denial',
    'release_id_pinned',
    'trusted_external_owner_pinned_key',
))

def command(args:list[str],timeout=120)->tuple[int,str]:
    try:
        p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                         text=True,timeout=timeout,check=False)
        return p.returncode,p.stdout.strip()
    except (OSError,subprocess.TimeoutExpired):
        return 255,''

def sha(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as inp:
        for data in iter(lambda:inp.read(1024*1024),b''):
            h.update(data)
    return h.hexdigest()

def approved_core_artifact(core:Path, source_sha:str)->bool:
    pinned=APPROVED_CORE_DIST_SHA.get(source_sha)
    if not pinned:
        return False
    try:
        return sha(core/'al-siddique-frontend/dist/index.html')==pinned
    except OSError:
        return False

def verifier_exit_passed(exits:dict,key:str)->bool:
    # bool is an int subclass in Python: False must never impersonate exit 0.
    code=exits.get(key)
    return type(code) is int and code==0

def make_phase_decisions(live:dict,compiled:dict,joint:dict,official:dict,verifier_exits:dict)->dict:
    p1=(live.get('source_sha')==LIVE_HTML and live.get('nginx_root_correct') is True
        and live.get('https_ok') is True and live.get('result_counts')==RESULT_COUNTS
        and live.get('pg_transaction_read_only') is True
        and live.get('anonymous_private_apis_denied') is True)
    p2=(verifier_exit_passed(verifier_exits,'optimized_build')
        and verifier_exit_passed(verifier_exits,'joint_candidate')
        and compiled.get('decision')=='OPTIMIZED_NEXT_BUILD_PROVENANCE_PASS'
        and compiled.get('optimized_build_exit_observed') is True
        and compiled.get('production_release_authorized') is False
        and joint.get('technical_candidate_status')=='PASS'
        and joint.get('production_modified') is False
        and joint.get('next_candidate_build_id')==NEXT_BUILD)
    checks=official.get('checks')
    p3=(p1 and p2 and verifier_exit_passed(verifier_exits,'official_release')
        and official.get('status')=='READY_FOR_LOGIN_ONLY_CORE'
        and isinstance(checks,dict) and set(checks)==REQUIRED_OFFICIAL_CHECKS
        and all(v is True for v in checks.values())
        and official.get('signed_runtime_security_certified') is True)
    return {
        'phase_1_readonly_production_integrity':'PASS' if p1 else 'HOLD',
        'phase_2_compiled_connect_core_integration':'PASS' if p2 else 'HOLD',
        'phase_3_independent_signed_core_authorization':'PASS' if p3 else 'HOLD',
        # Even a genuine 13/13 requires the separately authorized Core owner
        # execution and witnessed acceptance; this Connect QA tool never deploys.
        'phase_4_protected_production_cutover':'CORE_ONLY_PENDING' if p3 else 'HOLD',
        'public_release_authorized_by_this_tool':False,
        'production_changed':False,
    }

def read_live(live:Path)->dict:
    facts={'source_sha':None,'nginx_root_correct':False,
           'https_ok':False,'result_counts':None,'pg_transaction_read_only':False,
           'anonymous_private_apis_denied':False,
           'current_next_build_id':None}
    try:
        facts['source_sha']=sha(live/'index.html')
        config=NGINX.read_text()
        roots=re.findall(r'^\s*root\s+(/var/www/[^;\s]+);',config,flags=re.MULTILINE)
        facts['nginx_root_correct']=(len(roots)==1 and Path(roots[0]).resolve()==live.resolve())
        facts['current_next_build_id']=(PUBLIC_NEXT/'.next/BUILD_ID').read_text().strip()
    except OSError:
        pass
    statuses=[]
    for url in ('https://app.assps.edu.pk/exams/results',
                'https://api.assps.edu.pk/health',
                'https://apex.assps.edu.pk/apex'):
        rc,out=command(['curl','--silent','--show-error','--output','/dev/null',
                        '--write-out','%{http_code}','--max-time','8',url],timeout=11)
        statuses.append(rc==0 and out=='200')
    facts['https_ok']=all(statuses)
    # Select only two aggregate numbers. No student details/passwords exposed.
    sql=("BEGIN READ ONLY; SELECT count(*)::text||'|'||"
         "(count(*) FILTER (WHERE marks_obtained=0))::text FROM exam_results;ROLLBACK;")
    rc,out=command(['runuser','-u','postgres','--','psql','-d','apexos','-X','-qAt',
                    '-v','ON_ERROR_STOP=1','-c',sql],timeout=20)
    if rc==0 and out.splitlines()==[RESULT_COUNTS]:
        facts['result_counts']=RESULT_COUNTS
        facts['pg_transaction_read_only']=True
    # Additional anonymous-negative gate is live read-only network only.
    # It never certifies signed runtime, RLS or peer-school isolation.
    try:
        denial=check_public_anonymous_denial(timeout=8)
        facts['anonymous_private_apis_denied']=(
            denial.get('decision')=='ANONYMOUS_PRIVATE_API_DENIAL_PASS'
            and denial.get('passed')==6 and denial.get('total')==6
            and denial.get('production_modified') is False)
    except (OSError, ValueError, TypeError):
        facts['anonymous_private_apis_denied']=False
    return facts

def main()->int:
    a=argparse.ArgumentParser()
    a.add_argument('--core',type=Path,default=DEFAULT_CORE)
    a.add_argument('--next-stage',type=Path,default=DEFAULT_NEXT)
    a.add_argument('--live',type=Path,default=DEFAULT_LIVE)
    a.add_argument('--release-id',default='connect-four-phase-b53bf123-20261016')
    x=a.parse_args()
    out={'schema':'assps-connect-four-phase-gate-20261016-v1','scope':'READ_ONLY_NO_AUTOMATED_CUTOVER',
         'core_sha':None,'staged_build_id':None,'live':{},'optimized_build':{},
         'joint_candidate':{},'official_release':{},'phases':{}}
    rc,source=command(['git','-C',str(x.core),'rev-parse','HEAD'],timeout=9)
    if rc==0:
        out['core_sha']=source
    live=read_live(x.live)
    out['live']=live
    comp_rc,comp=command([sys.executable,str(CONNECT_OPS/'verify_successful_next_build_20261016.py'),
                          '--stage',str(x.next_stage)],timeout=40)
    try: compiled=json.loads(comp)
    except (ValueError,TypeError): compiled={}
    out['optimized_build']={'decision':compiled.get('decision','HOLD'),
                            'optimized_build_exit_observed':compiled.get('optimized_build_exit_observed',False),
                            'production_release_authorized':compiled.get('production_release_authorized')}
    joint={}
    joint_rc=255
    if rc==0 and approved_core_artifact(x.core,source) and live.get('source_sha')==LIVE_HTML:
        joint_args=[
            sys.executable,str(CONNECT_OPS/'verify_joint_frontend_connect_core_20261015.py'),
            '--paper-repo',str(x.core),'--paper-dist',str(x.core/'al-siddique-frontend/dist'),
            '--connect-ops',str(CONNECT_OPS),'--next-stage',str(x.next_stage),
            '--live-grade-root',str(x.live),'--core-verifier',str(JOINT_CORE),
            '--expected-live-html-sha',LIVE_HTML,'--nginx-site-config',str(NGINX)]
        joint_rc,output=command(joint_args,timeout=240)
        try: joint=json.loads(output)
        except (ValueError,TypeError):joint={}
    out['joint_candidate']={
        'technical_candidate_status':joint.get('technical_candidate_status','HOLD'),
        'production_modified':joint.get('production_modified'),
        'next_candidate_build_id':joint.get('next_candidate_build_id'),
        'checks_passed':sum(v is True for v in joint.get('checks',{}).values()),
        'checks_total':len(joint.get('checks',{})),
        'public_only_failures':[k for k,v in joint.get('checks',{}).items() if not v],
    }
    out['staged_build_id']=joint.get('next_candidate_build_id')
    official={}
    off_rc=255
    try:
        proxy=sha(PUBLIC_NEXT/'.next/server/middleware.js')
        public_id=(PUBLIC_NEXT/'.next/BUILD_ID').read_text().strip()
        off_rc,result=command([sys.executable,str(OFFICIAL),
                              '--release-id',x.release_id,
                              '--approved-proxy-sha256',proxy,
                              '--approved-build-id',public_id],timeout=150)
        try:official=json.loads(result)
        except (ValueError,TypeError):official={}
    except OSError:pass
    out['official_release']={
        'status':official.get('status','HOLD'),
        'checks':official.get('checks',{}),
        'failed_keys':official.get('blocked',[]),
        'signed_runtime_security_certified':official.get('signed_runtime_security_certified',False)
    }
    out['verifier_exit_codes']={
        'optimized_build':comp_rc,
        'joint_candidate':joint_rc,
        'official_release':off_rc,
    }
    out['phases']=make_phase_decisions(
        live,compiled,joint,{**official,'checks':official.get('checks')},
        out['verifier_exit_codes'])
    out['decision']='PROTECTED_CORE_RELEASE_PENDING' if out['phases']['phase_3_independent_signed_core_authorization']=='PASS' else 'HOLD_NO_PRODUCTION_CUTOVER'
    print(json.dumps(out,indent=2,sort_keys=True))
    # Exit 2 means release not certified, not a silent success.
    return 0 if out['phases']['phase_3_independent_signed_core_authorization']=='PASS' else 2

if __name__=='__main__':
    sys.exit(main())
