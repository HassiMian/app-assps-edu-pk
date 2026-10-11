#!/usr/bin/env python3
"""One-command integrated ASSPS Marks+9 Results+Paper source and live release gate.

It never deploys, migrates, deletes, changes DB roles, rotates passwords,
reads actual student records or restarts a service. --full runs source tests
before the final readonly production security probes. Production GO is always
conditional on independently signed live actor/printer/backups acceptance.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[2]
F=ROOT/'al-siddique-frontend'
B=ROOT/'al-siddique-backend'
# Blue/green keeps the legacy login alive; auditing only the legacy backend
# DB_USER would forever fail even after a safe, independent signed marks cutover.
# Check the *dedicated* protected role and policy catalog separately.
LIVE_SIGNED_PROBE=ROOT/'ops/release/signed-bluegreen/verify-live-signed-precutover-20261011.py'
MIGRATION_CONTRACT=ROOT/'ops/release/signed-bluegreen/test-migration-static-contract-20261011.py'
NGINX_CHECK=Path('/root/workspace/assps-core-marks-teacher-assignment-security-20261010/ops/security/check-nginx-private-uploads.sh')
FRONT_SOURCE='bfc7806f9a2ac08dc1f5ccf5845436ac5a3056cb'
BACK_SOURCE='580111e8ee92fa13ee672578461927294cfada6b'
FRONT_EXPECTED=['al-siddique-frontend/src/Modules/examination/MarksSheet.jsx','al-siddique-frontend/src/Modules/examination/ResultCards.jsx','al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/PaperEditorMain.jsx']
BACK_EXPECTED=['al-siddique-backend/src/config/database.js','al-siddique-backend/src/routes/examRoutes.js','al-siddique-backend/src/middleware/auth.js']

def call(argv,cwd,timeout=90,env=None):
    try: return subprocess.run(argv,cwd=str(cwd),text=True,capture_output=True,timeout=timeout,env=env)
    except subprocess.TimeoutExpired:return None

def committed_sha(filename):
    r=call(['git','show','HEAD:'+filename],ROOT,15)
    return hashlib.sha256(r.stdout.encode()).hexdigest() if r and r.returncode==0 else None

def check_provenance():
    for source,paths in [(FRONT_SOURCE,FRONT_EXPECTED),(BACK_SOURCE,BACK_EXPECTED)]:
        for p in paths:
            remote=call(['git','show',source+':'+p],ROOT,15)
            actual=ROOT/p
            ok=bool(remote and remote.returncode==0 and actual.is_file() and remote.stdout==actual.read_text())
            print('SOURCE_PROVENANCE_'+p.rsplit('/',1)[-1].upper()+('_PASS' if ok else '_FAIL'),flush=True)
            if not ok:return False
    return True

SUITES=[
 ('backend_security',B,['node','--test','src/tests/bluegreen-signed-policy-role-binding.test.cjs','src/tests/signed-runtime-catalog-contract.test.js','src/tests/core-signed-envelope-contract.test.js','src/tests/exam-marks-teacher-http-isolated.test.js','src/tests/exam-marks-teacher-scope.test.js','src/tests/database-tenant-context.test.js'],75),
 ('marks_firstday',F,['node','scripts/test-marks-entry-first-term-recovery.mjs'],45),
 ('marks_zero',F,['node','scripts/test-marks-zero-state-and-blank-print.mjs'],45),
 ('marks_nine',F,['node','scripts/test-marks-to-nine-cards-firstday.mjs'],50),
 ('nine_grades',F,['node','scripts/test-nine-premium-mark-accuracy.mjs'],60),
 ('original_template_integrity',F,['npm','run','verify:templates'],40),
 ('firstday_browser',F,['node','scripts/test-marks-entry-firstterm-browser.mjs'],95),
 ('results_browser',F,['node','scripts/test-result-designer-real-browser.mjs'],85),
 ('early_years_browser',F,['node','--test','src/Modules/Paper-Generator/PaperEditor/tests/earlyYearsBrowserAcceptance.test.js'],100),
 ('urdu_paper_browser',F,['node','--test','src/Modules/Paper-Generator/PaperEditor/tests/paperWorkspaceUrduBrowserAcceptance.test.js'],125),
 ('twentyfive_a4',F,['node','scripts/test-result-batch-pdf-a4.mjs'],100),
]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--full',action='store_true',help='Re-run full synthetic/sandbox source acceptance before release probe')
    args=parser.parse_args()
    print('ASSPS_FIRSTTERM_MISSION_START '+('FULL' if args.full else 'PREFLIGHT'),flush=True)
    print('LIVE_DB_AND_STUDENT_DATA_WRITES=DISABLED BY DESIGN',flush=True)
    ok=check_provenance()
    if args.full and ok:
        for name,cwd,cmd,timeout in SUITES:
            suite_env={**os.environ,'CARDS':'25'} if name=='twentyfive_a4' else None
            test=call(cmd,cwd,timeout,env=suite_env)
            success=bool(test and test.returncode==0 and ('# fail 0' in test.stdout if 'browser' in name and name not in ('firstday_browser','results_browser') else True))
            if name=='firstday_browser':success=success and 'MARKS_BROWSER_ZERO_PASS first real zero saved' in test.stdout
            if name=='results_browser':success=success and 'RESULT_DESIGNER_BROWSER_PASS' in test.stdout
            if name=='twentyfive_a4':success=success and 'BATCH_PDF_PAGE_COUNT 25' in test.stdout
            if not success and name in ('firstday_browser','results_browser','early_years_browser','urdu_paper_browser','twentyfive_a4'):
                # Browser renderer/port contention from concurrent owner suites is
                # transient. Retry once without modifying any actual assertion.
                print('SOURCE_'+name.upper()+'_FIRST_ATTEMPT_FAILED_RETRY_ONCE',flush=True)
                time.sleep(2)
                test=call(cmd,cwd,timeout,env=suite_env)
                success=bool(test and test.returncode==0 and ('# fail 0' in test.stdout if name in ('early_years_browser','urdu_paper_browser') else True))
                if name=='firstday_browser':success=success and 'MARKS_BROWSER_ZERO_PASS first real zero saved' in test.stdout
                if name=='results_browser':success=success and 'RESULT_DESIGNER_BROWSER_PASS' in test.stdout
                if name=='twentyfive_a4':success=success and 'BATCH_PDF_PAGE_COUNT 25' in test.stdout
            print('SOURCE_'+name.upper()+('_PASS' if success else '_FAIL'),flush=True)
            if not success:
                print('SOURCE_TEST_SHORT_FAILURE '+name+' '+str(test.returncode if test else 'TIMEOUT'),flush=True)
                if test:
                    print('FAILURE_STDERR_END '+test.stderr[-350:].replace('\n',' '),flush=True)
                    print('FAILURE_STDOUT_END '+test.stdout[-350:].replace('\n',' '),flush=True)
                ok=False
                break
    if NGINX_CHECK.exists():
        check=call(['bash',str(NGINX_CHECK),'/etc/nginx/sites-enabled'],ROOT,20)
        nginx=bool(check and check.returncode==0 and 'NGINX_PRIVATE_UPLOAD_ALIAS_GATE_PASS' in check.stdout)
    else:nginx=False
    print('LIVE_PRIVATE_MEDIA_'+('PASS' if nginx else 'FAIL'),flush=True)
    # This static contract is required even when --full is not requested.
    contract=call(['python3',str(MIGRATION_CONTRACT)],ROOT,15) if MIGRATION_CONTRACT.is_file() else None
    contract_pass=bool(contract and contract.returncode==0 and 'Ran 4 tests' in contract.stderr and 'OK' in contract.stderr)
    print('V2_ISOLATED_MIGRATION_SOURCE_CONTRACT_'+('PASS' if contract_pass else 'FAIL'),flush=True)
    ok=ok and contract_pass
    if LIVE_SIGNED_PROBE.is_file():
        probe=call(['python3',str(LIVE_SIGNED_PROBE)],ROOT,30)
        signed=bool(probe and probe.returncode==0 and 'SECURITY_PRECUTOVER=PASS' in probe.stdout)
        if probe:
            for line in probe.stdout.splitlines():
                if line.startswith(('SIGNED_RESTRICTIVE_POLICIES_', 'SIGNED_PERMISSIVE_POLICIES_',
                     'SIGNED_PROTECTED_SCHEMA=', 'SIGNED_RESTRICTED_RUNTIME=',
                     'SIGNED_LOGIN_NONBYPASS=', 'UNPROTECTED_PUBLIC_TABLES_DENIED=')):
                    print('CORE_SECURITY_'+line,flush=True)
    else:signed=False
    print('LIVE_SIGNED_BLUEGREEN_PRECUTOVER_'+('PASS' if signed else 'FAIL'),flush=True)
    print('SOURCE_CANDIDATE_'+('PASS' if ok else 'FAIL'),flush=True)
    # The signed green bootstrap must be explicitly routed: new NOINHERIT
    # login intentionally cannot query public.users before verifying a JWT.
    # Preserve old /auth routes or provide independently reviewed alternative.
    print('LIVE_MARKS_ONLY_AUTH_INGRESS_SEPARATION=UNVERIFIED',flush=True)
    # Never claim automatic certification after an identity probe. Real live
    # authorized school JWT negative matrix and restoration verification are
    # an independent release authority, not discoverable from synthetic tests.
    print('LIVE_AUTHENTICATED_SCHOOL_ROLE_ACCEPTANCE=UNVERIFIED',flush=True)
    print('LIVE_DEPLOYMENT_ROLLBACK_SIGNOFF=UNVERIFIED',flush=True)
    print('RELEASE_CERTIFIED=FALSE; PRODUCTION_DEPLOYMENT=HOLD',flush=True)
    return 2
if __name__=='__main__':
    try:sys.exit(main())
    except Exception as exc:
        print('GATE_FAIL_CLOSED '+type(exc).__name__,flush=True)
        sys.exit(2)
