#!/usr/bin/env python3
"""One-shot, fail-closed APEX Connect / ASSPS SaaS Core release acceptance.

No DB writes, no staff impersonation, no release-promotion, no secret reading,
no credential collection. Independent actor-signed receipt verification is
delegated to the pinned-source verifier; missing receipt => HOLD.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BACKEND = ROOT / 'al-siddique-backend'
FRONTEND = ROOT / 'al-siddique-frontend'
STANDALONE_SHADOW = Path('/root/workspace/assps-school-admin-approval-workflow-20261014/ops/release/academic-admin-approval/verify-live-signed-shadow-current-20261014.py')
NODE_TESTS = [
    'grade-band-assignment-20261014.test.js',
    'exam-result-status-20261013.test.js',
    'exam-marks-subject-maximum.test.js',
    'exam-marks-teacher-scope.test.js',
    'exam-marks-teacher-http-isolated.test.js',
    'approved-exam-subject-policy-http.test.js',
    'teacher-marks-cohort-security-20261013.test.js',
]

def run(command, *, cwd=None, env=None, timeout=90):
    try:
        result = subprocess.run(command, text=True, capture_output=True,
                                cwd=cwd, env=env, timeout=timeout, check=False)
        return result.returncode, result.stdout, result.stderr
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 127, '', type(exc).__name__

def http_code(url):
    # Exact live ingress probe: curl behaves like the normal HTTPS browser
    # through Cloudflare; Python's default urllib UA returned misleading 403.
    code, out, _ = run(['curl','-sS','-o','/dev/null','-w','%{http_code}',
                        '--max-time','8',
                        '-H','Cache-Control: no-store',url],timeout=12)
    return int(out.strip()) if code == 0 and out.strip().isdigit() else 0

def run_mission(database='apexos', port=5432, receipt_bundle=None, with_tests=True):
    if database!='apexos' or port!=5432:
        raise ValueError('Production mission is explicitly scoped to apexos:5432')
    rc,head,_=run(['git','rev-parse','HEAD'],cwd=ROOT)
    rc2,dirty,_=run(['git','status','--porcelain'],cwd=ROOT)
    version=head.strip() if rc==0 else None
    source_clean=rc2==0 and dirty.strip()==''
    base=[sys.executable,str(HERE/'verify_exam9_release_gate_20261014.py'),
          '--port','5432','--database','apexos','--school','1','--exam','9']
    if receipt_bundle:
        base.extend(['--receipt-bundle',str(receipt_bundle)])
    g_rc,g_out,g_err=run(base,timeout=40)
    try:
        preflight=json.loads(g_out)
    except (ValueError,TypeError):
        preflight={'verdict':'HOLD','gates':{},'error':(g_err or 'verification not JSON')[:150]}
    if STANDALONE_SHADOW.exists():
        s_rc,s_out,s_err=run([sys.executable,str(STANDALONE_SHADOW)],timeout=35)
        try:
            shadow=json.loads(s_out)
        except (ValueError,TypeError):
            shadow={'status':'HOLD','error':(s_err or 'not JSON')[:150]}
    else:
        s_rc=127
        shadow={'status':'NOT_VERIFIED','error':'Independent signed active-role verifier unavailable'}
    ingress={
        'school_saas':http_code('https://app.assps.edu.pk/'),
        'timetable':http_code('https://app.assps.edu.pk/timetable/regular'),
        'connect_report_cards_anonymous':http_code('https://api.assps.edu.pk/teacher/assessments/report-cards'),
        'scoped_admin_approval_anonymous':http_code('https://app.assps.edu.pk/api/academic-approvals/teacher-assignments'),
    }
    tests={}
    if with_tests:
        commands={
          'python_signed_evidence_and_preflight':[sys.executable,'-m','unittest','discover','-p','test_*20261014.py'],
          'backend_grades_teacher_and_subject_policy':['node','--test',*[str(BACKEND/'src/tests'/name) for name in NODE_TESTS]],
          'frontend_class_passing':['node','--test',
             str(FRONTEND/'src/Modules/examination/classPassingThreshold.test.js'),
             str(FRONTEND/'src/Modules/examination/classPassingThreshold.ui.test.js')],
        }
        env=os.environ.copy()
        if not env.get('NODE_PATH') and Path('/var/www/apex-backend/node_modules').is_dir():
            env['NODE_PATH']='/var/www/apex-backend/node_modules'
        for name,command in commands.items():
            cwd=HERE if name.startswith('python') else ROOT
            code,out,err=run(command,cwd=cwd,env=env,timeout=90)
            tests[name]={'pass':code==0,'exit_code':code,
                         'summary':next((ln for ln in reversed(out.splitlines()) if
                                         ln.startswith('# tests ') or ln.startswith('Ran ')), next((ln for ln in reversed(err.splitlines()) if ln.startswith('Ran ')), ''))}
            if code:
                tests[name]['error']=(err or out)[-180:]
    else:
        tests={'not_run':{'pass':False,'reason':'Source tests explicitly skipped'}}
    gates=preflight.get('gates') or {}
    expected_gates=[
      'original_exam_scores_preserved','current_exam9_rows_integrity',
      'original_grade_snapshot_unchanged_or_signed_revision',
      'pass40_F_grade_conflicts_reviewed',
      'exact_active_teacher_assignments','all_offerings_independently_approved',
      'grade_policy_explicitly_configured','active_app_runtime_signed',
      'genuine_teacher_session_and_save_reload_print',
      'independent_real_peer_school_http_denial','traffic_rollback_evidence_attached',
    ]
    # The old shadow-only verifier intentionally hardcodes production flags
    # false. It cannot act as the eventual active-traffic release authority.
    # The actual Core DB active signed guard + pinned ED25519 principal/teacher/
    # peer-school/traffic receipt gates above are the real independent gates.
    # Merely synthesizing fixture results without a bundle must NEVER certify.
    live_ready=(receipt_bundle is not None and g_rc==0
        and all(gates.get(k) is True for k in expected_gates)
        and all(v.get('pass') is True for v in tests.values())
        and source_clean
        and ingress['school_saas']==200 and ingress['timetable']==200
        and ingress['connect_report_cards_anonymous'] in (302,307)
        and ingress['scoped_admin_approval_anonymous'] in (401,403))
    return {
      'status':'READY_FOR_CORE_FINAL_RELEASE' if live_ready else 'HOLD',
      'production_deployment_performed':False,
      'exam_id':9,'school_id':1,'database':'apexos','port':5432,
      'source_sha':version,'source_clean':source_clean,
      'authenticated_receipt_bundle_supplied':receipt_bundle is not None,
      'gates':{k:bool(gates.get(k) is True) for k in expected_gates},
      'blocked':sorted(k for k in expected_gates if gates.get(k) is not True),
      'current_metrics':preflight.get('metrics',{}),
      'source_tests':tests,
      'signed_runtime_verifier':shadow,
      'ingress':ingress,
      'note':'Full production release is not certified by green shadow, anonymous HTTP, or synthetic role fixtures. Requires actual source-pinned production signed session/traffic/rollback evidence.'
    }

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--receipts',type=Path)
    parser.add_argument('--without-source-tests',action='store_true')
    args=parser.parse_args()
    try:
        out=run_mission(receipt_bundle=args.receipts,with_tests=not args.without_source_tests)
        print(json.dumps(out,sort_keys=True,indent=2))
        sys.exit(0 if out['status']=='READY_FOR_CORE_FINAL_RELEASE' else 2)
    except Exception as exc:
        print(json.dumps({'status':'HOLD','reason':type(exc).__name__},sort_keys=True))
        sys.exit(2)
