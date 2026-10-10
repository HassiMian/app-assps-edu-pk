#!/usr/bin/env python3
"""Deterministic ASSPS Marks Entry release gate; does NOT deploy anything."""
import hashlib, json, os, pathlib, subprocess, sys
OPS=pathlib.Path('/root/workspace/assps-core-marks-teacher-assignment-security-20261010')
FRONT=pathlib.Path('/root/workspace/assps-core-marks-nine-results-livebase-20261010')
BACK=pathlib.Path('/root/workspace/assps-marks-backend-livebase-20261010')
ARCH=pathlib.Path('/root/secure-archive/assps-marks-predeploy-20261010')
RESTORED=pathlib.Path('/var/tmp/assps-marks-rollback-rehearsal-20261010')
DEPLOYED_F='24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92'
DEPLOYED_B='16ab8f346ba27aa6b2e29a8f03c68db32a326cb9'
CANDIDATE_F='2ec5ae597e9f50772cf443b0392b442b7fa037db'
CANDIDATE_B='322c8262dbad947df8b54b0145d431b65983aad8'
def call(label,cmd,cwd=None):
    p=subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,timeout=45,
        env={**os.environ,'ASSPS_TEST_BACKEND_SOURCE':str(BACK/'al-siddique-backend/src/routes/examRoutes.js')})
    if p.returncode:
        raise RuntimeError(label+' exit='+str(p.returncode)+' '+(p.stdout+' '+p.stderr)[-500:])
    print('PREFLIGHT_PASS '+label,flush=True)
    return p.stdout
def check_branch(path,branch,candidate,base):
    head=call(branch+'_HEAD',['git','rev-parse','HEAD'],path).strip()
    if head!=candidate: raise RuntimeError(branch+' HEAD_CHANGED')
    if call(branch+'_WORKTREE',['git','status','--porcelain'],path).strip():
        raise RuntimeError(branch+' DIRTY_WORKTREE')
    if call(branch+'_REMOTE',['git','ls-remote','origin','refs/heads/'+branch],path).split()[0]!=candidate:
        raise RuntimeError(branch+' REMOTE_DIVERGENCE')
    call(branch+'_ANCESTRY',['git','merge-base','--is-ancestor',base,candidate],path)
def check_live_meta(path,expected,label):
    meta=json.loads(path.read_text())
    if meta.get('commit')!=expected: raise RuntimeError(label+' LIVE_RELEASE_CHANGED')
    print('PREFLIGHT_PASS '+label+'_RELEASE_METADATA',flush=True)
def main():
    phase=sys.argv[1] if len(sys.argv)>1 else 'all'
    if phase not in ('static','functional','premium','all'):
        raise RuntimeError('UNKNOWN_CHECK_PHASE')
    if phase in ('static','all'):
        check_live_meta(pathlib.Path('/var/www/apex-os/release-meta.json'),DEPLOYED_F,'FRONTEND')
        check_live_meta(pathlib.Path('/var/www/apex-backend/release-meta.json'),DEPLOYED_B,'BACKEND')
        check_branch(FRONT,'release/core-marks-nine-results-livebase-20261010',CANDIDATE_F,DEPLOYED_F)
        check_branch(BACK,'release/marks-firstterm-backend-livebase-20261010',CANDIDATE_B,DEPLOYED_B)
        call('ARTIFACT_BACKUPS_SHA256',['sha256sum','-c',str(ARCH/'sha256sums.txt')])
        call('FRONTEND_RESTORE_REHEARSAL_BYTES',['diff','-qr','/var/www/apex-os',str(RESTORED/'apex-os')])
        # Argus monitoring writes this single JSON state file during normal runtime.
        # Original bytes are backed up and SHA verified. Permit ONLY this exact
        # current-runtime drift, never blanket-exclude other app/backend changes.
        source=pathlib.Path('/var/www/apex-backend')
        copy=RESTORED/'apex-backend'
        diff=subprocess.run(['diff','-qr',str(source),str(copy)],capture_output=True,text=True,timeout=35)
        if diff.returncode not in (0,1): raise RuntimeError('BACKEND_ARTIFACT_COMPARE_ERROR')
        allowed={
            'Files '+str(source/'runtime'/name)+' and '+str(copy/'runtime'/name)+' differ'
            for name in ('argus_monitoring_state.json','argus_market_watches.json')
        }
        unknown=[line for line in diff.stdout.splitlines() if line not in allowed]
        if unknown: raise RuntimeError('UNKNOWN_BACKEND_ARTIFACT_DRIFT '+str(unknown[:3]))
        print('PREFLIGHT_PASS BACKEND_RESTORE_REHEARSAL_BYTES_WITH_TWO_EXACT_ARGUS_RUNTIME_FILES',flush=True)
        call('LIVE_NGINX_SYNTAX',['nginx','-t'])
        call('LIVE_NGINX_MEDIA_POLICY',['sh',str(OPS/'ops/security/check-nginx-private-uploads.sh'),'/etc/nginx/sites-enabled'])
        call('LIVE_HTTPS_CERT_AND_32_PRIVATE_PROBES',['python3',str(OPS/'ops/security/verify-live-private-uploads-tls-matrix-20261010.py')])
        call('LIVE_ANONYMOUS_7_PROTECTED_API_ROUTES',['python3',str(OPS/'ops/release/verify-live-anonymous-authorization-20261010.py')])
        call('REAL_RESTRICTED_SIGNED_DISPOSABLE_POSTGRES_13_TESTS',['python3',str(OPS/'ops/security/run-isolated-signed-actor-acceptance-20261010.py'),'db'])
        sql=OPS/'ops/security/verify-signed-marks-transaction-clone-20261010.sql'
        # Script resides in Core's protected worktree. Stream code through stdin
        # so postgres does not need filesystem access to the Core checkout.
        marks=subprocess.run(['runuser','-u','postgres','--','psql',
            '-X','-v','ON_ERROR_STOP=1','-p','55432','-d','assps_core_signed_p7_20261008'],
            input=sql.read_text(),text=True,capture_output=True,timeout=25)
        if marks.returncode!=0 or 'ROLLBACK' not in marks.stdout or 'ERROR' in marks.stderr:
            raise RuntimeError('SIGNED_MARKS_SQL_FAIL '+marks.stderr[-250:])
        print('PREFLIGHT_PASS SIGNED_MARKS_CLONE_READ_UPDATE_ISOLATION',flush=True)
        call('REAL_SIGNED_JWT_MARKS_HTTP_CLONE',['python3',str(OPS/'ops/security/run-isolated-signed-actor-acceptance-20261010.py'),'marks'])
        # Actual production DB_USER must be an explicit NOBYPASS login and
        # signed tenant flags enabled. Source/clone PASS does not waive this.
        call('REAL_PRODUCTION_RUNTIME_NONBYPASS_SIGNED_GATE',['python3',str(OPS/'ops/release/verify-prod-signed-runtime-identity-20261010.py')])
    if phase=='static':
        print('STATIC_PREFLIGHT_PASS; RELEASE_CERTIFICATION_NOT_GRANTED',flush=True)
        return 0
    if phase in ('functional','all'):
        call('BACKEND_14_FOCUSED_CONTRACT_TESTS',['node','--test',
          'tests/database-tenant-context.test.js','tests/exam-marks-teacher-scope.test.js',
          'tests/exam-marks-teacher-http-isolated.test.js','tests/exam-workflow-v1.test.js'],
          BACK/'al-siddique-backend/src')
        f=FRONT/'al-siddique-frontend'
        call('FRONTEND_OFFICIAL_FIRST_TERM_75_PAPERS',['node','scripts/test-marks-entry-first-term-recovery.mjs'],f)
        call('FRONTEND_CHROMIUM_AUTH_SHAPED_SYNTHETIC',['node','scripts/test-marks-entry-firstterm-browser.mjs'],f)
        call('PROTECTED_RESULT_TEMPLATES',['npm','run','verify:templates'],f)
        call('FRONTEND_FOCUSED_LINT',['npx','eslint','src/Modules/examination/MarksSheet.jsx',
             'src/Modules/examination/marksEntryModel.js',
             'src/Modules/examination/officialFirstTerm2026Subjects.js',
             'scripts/test-marks-entry-first-term-recovery.mjs',
             'scripts/test-marks-entry-firstterm-browser.mjs'],f)
        call('FRONTEND_OPTIMIZED_BUILD',['npm','run','build'],f)
        call('FRONTEND_FOCUSED_NINE_CARD_MODULE_LINT',['npx','eslint',
            'src/Modules/examination/ResultCards.jsx','src/Modules/examination/premiumResultCardTemplates.jsx',
            'src/Modules/examination/premiumResultCardData.js','src/Modules/examination/premiumResultCardPrint.js',
            'src/Modules/examination/resultStudentIdentity.js'],f)
        call('FIRSTDAY_NINE_RESULT_CARD_INTEGRATION',['node','scripts/test-marks-to-nine-cards-firstday.mjs'],f)
        call('RESULT_STUDENT_IDENTITY_COMPANION_BACKEND',['node','scripts/test-result-student-identity.mjs'],f)
    if phase=='premium':
        f=FRONT/'al-siddique-frontend'
        call('NINE_CARD_RENDER_AND_REFERENCE',['node','scripts/test-premium-result-cards.mjs'],f)
        call('NINE_CARD_MARKS_ACCURACY',['node','scripts/test-nine-premium-mark-accuracy.mjs'],f)
        call('NINE_CARD_PDF_PAGE_LAYOUT',['node','scripts/test-premium-result-a4.mjs'],f)
        call('NINE_CARD_REAL_CHROMIUM_DESIGNER',['node','scripts/test-result-designer-real-browser.mjs'],f)
        call('NINE_CARD_PRINT_OVERFLOW_GUARD',['node','scripts/test-nine-result-print-overflow-guard.mjs'],f)
        print('PREMIUM_SOURCE_GATE_PASS; PRODUCTION_ROLE_RELEASE_NOT_CERTIFIED',flush=True)
        return 0
    print('PREFLIGHT_HOLD ACTUAL_SCHOOL_AUTHENTICATED_PROD_TEACHER_JWT_RLS_NOT_CERTIFIED',flush=True)
    print('PREFLIGHT_HOLD ASSESSMENT_RESULTS_CLONE_HTTP_FIXTURES_MISSING',flush=True)
    print('PREFLIGHT_HOLD PAPER_STUDIO_SIGNED_HTTP_TIMEOUT_NOT_CLOSED',flush=True)
    print('PREFLIGHT_HOLD LIVE_MARKS_ENTRY_AFTER_DEPLOYMENT_NOT_YET_TESTABLE',flush=True)
    print('NO_DEPLOYMENT_EXECUTED; RELEASE_CERTIFIED=FALSE',flush=True)
    return 2
if __name__=='__main__':
    try: sys.exit(main())
    except Exception as exc:
        print('PREFLIGHT_FAIL '+str(exc),file=sys.stderr,flush=True)
        print('NO_DEPLOYMENT_EXECUTED; RELEASE_CERTIFIED=FALSE',file=sys.stderr,flush=True)
        sys.exit(2)
