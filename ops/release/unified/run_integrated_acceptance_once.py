#!/usr/bin/env python3
"""Run a bounded, non-deploying ASSPS single-train verification pass.

Only source tests, synthetic browser tests, and the existing read-only gate
are invoked. A green test suite never overrides a release hold.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path('/root/workspace/assps-unified-one-train-exam9v2-20261019')
PRIVATE_RECEIPTS = Path('/root/secure-archive/assps-unified-one-run-evidence-20261020')
BACKEND = 'al-siddique-backend/src/tests/'
FRONTEND = 'al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/tests/'
CORE_TESTS = (
    'timetable-write-failclosed-20261019.test.cjs',
    'timetable-save-http-failclosed-20261019.test.cjs',
    'timetable-save-transaction-http-isolated-20261019.test.cjs',
    'lesson-planning-engine.test.js',
    'lesson-publication-guard.test.js',
    'lesson-private-review-failclosed-http.test.js',
    'lesson-principal-source-bundle-http.test.js',
    'attendance-pool-failure-http.test.cjs',
)
INTEGRATION_TESTS = (
    'ops/tests/lesson-diary-cognitive-contract.test.js',
    'ops/tests/attendance-scope-data-truth.test.js',
    'ops/tests/teacher-attendance-scope-contract.test.js',
    'ops/tests/attendance-runtime-contract.test.js',
    'ops/tests/marks-sheet-data-truth.test.js',
    'ops/tests/examination-data-truth.test.js',
    'al-siddique-frontend/src/Modules/Paper-Generator/tests/lessonWeeklyEngine.test.js',
    'al-siddique-frontend/src/Modules/examination/resultSubjectState.test.mjs',
    'al-siddique-frontend/src/Modules/Paper-Generator/tests/printMarksLedgerParity.test.mjs',
    FRONTEND + 'dailyDiaryLateLessonSaveScope.test.js',
)
BROWSER_TESTS = (
    'dailyDiarySaveResponseValidationBrowser.test.js',
    'dailyDiarySaveStatusRaceBrowser.test.js',
    'dailyDiaryReturnedDateBrowser.test.js',
    'dailyDiaryReturnedSectionBrowser.test.js',
    'dailyDiaryReturnedScopeBrowser.test.js',
    'dailyDiarySaveIdTypeBrowser.test.js',
    'dailyDiarySaveErrorScopeBrowser.test.js',
    'dailyDiarySaveIdentityBrowser.test.js',
    'dailyDiaryPutResponseIdentityBrowser.test.js',
    'dailyDiaryRevisitScopeBrowser.test.js',
    'dailyDiaryLateSuccessScopeBrowser.test.js',
    'dailyDiaryNewDraftScopeBrowser.test.js',
    'dailyDiaryExplicitReopenBrowser.test.js',
    'dailyDiaryWorkspaceBrowserAcceptance.test.js',
    'lessonPlanningWorkspaceBrowserAcceptance.test.js',
)

def node_summary(output):
    stats = {}
    for line in output.splitlines():
        match = re.match(r'^# (tests|pass|fail|cancelled|skipped) (\d+)\s*$', line)
        if match:
            stats[match.group(1)] = int(match.group(2))
    return stats

def suite_success(exitcode, stats):
    return exitcode == 0 and stats.get('tests', 0) > 0 and stats.get('pass', 0) > 0 and stats.get('fail') == 0 and stats.get('cancelled', 0) == 0

def execute(name, args, timeout_seconds, env):
    try:
        process = subprocess.run(args, cwd=ROOT, env=env, capture_output=True, text=True, timeout=timeout_seconds)
        output = process.stdout + '\n' + process.stderr
        stats = node_summary(output) if args[0] == 'node' and '--test' in args else {}
        if args[0] == 'node' and '--test' in args:
            ok = suite_success(process.returncode, stats)
        elif name == 'unified_python':
            match = re.search(r'Ran (\d+) tests? in', output)
            stats = {'tests': int(match.group(1)) if match else 0}
            ok = process.returncode == 0 and stats['tests'] > 0 and bool(re.search(r'(?m)^OK\s*$', output))
        else:
            ok = process.returncode == 0 and 'Production safety check passed.' in output
        return {'name': name, 'pass': ok, 'exit_code': process.returncode, 'counts': stats}
    except subprocess.TimeoutExpired:
        return {'name': name, 'pass': False, 'error': 'TIMEOUT', 'counts': {}}
    except (OSError, ValueError):
        return {'name': name, 'pass': False, 'error': 'PROCESS_UNAVAILABLE', 'counts': {}}

def record_receipt(record):
    PRIVATE_RECEIPTS.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(PRIVATE_RECEIPTS, 0o700)
    payload = (json.dumps(record, indent=2, sort_keys=True) + '\n').encode()
    digest = hashlib.sha256(payload).hexdigest()
    immutable = PRIVATE_RECEIPTS / ('integrated-' + digest + '.json')
    # Every run retains an immutable, unique private receipt; latest is only an index.
    if immutable.exists():
        if immutable.read_bytes() != payload:
            raise RuntimeError('Immutable receipt digest mismatch')
    else:
        with immutable.open('xb') as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(immutable, 0o600)
    fd, tmp = tempfile.mkstemp(dir=PRIVATE_RECEIPTS, prefix='.integrated-')
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(tmp, 0o600)
        final = PRIVATE_RECEIPTS / 'latest-integrated-readonly-acceptance.json'
        os.replace(tmp, final)
        return {'sha256': hashlib.sha256(payload).hexdigest(), 'saved': final.is_file()}
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

@contextmanager
def browser_dependency_scope(enabled):
    """Use already installed build dependencies; no install, network or deployment."""
    if not enabled:
        yield
        return
    link = ROOT / 'al-siddique-frontend' / 'node_modules'
    existing = Path('/root/workspace/assps-core-prod-release-candidate-20261016/al-siddique-frontend/node_modules')
    if not existing.is_dir():
        raise RuntimeError('Pinned offline browser dependencies unavailable')
    created = False
    if link.is_symlink():
        if link.resolve() != existing.resolve():
            raise RuntimeError('Existing browser dependencies do not match pinned location')
    elif link.exists():
        raise RuntimeError('Unexpected frontend dependency directory; refusing to mutate')
    else:
        link.symlink_to(existing, target_is_directory=True)
        created = True
    try:
        yield
    finally:
        if created and link.is_symlink() and link.resolve() == existing.resolve():
            link.unlink()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='store_true', help='Run synthetic Chromium cases, never live user sessions')
    opt = parser.parse_args()
    env = os.environ.copy()
    env.update({'PYTHONDONTWRITEBYTECODE': '1', 'NODE_ENV': 'test', 'CI': '1',
                'NODE_PATH': '/var/www/apex-backend/node_modules',
                'VITE_API_URL': 'http://127.0.0.1:59999'})
    head = subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,capture_output=True,text=True,check=True).stdout.strip()
    dirty = subprocess.run(['git','status','--porcelain','-uno'],cwd=ROOT,capture_output=True,text=True,check=True).stdout.strip()
    checks = [
       execute('unified_python',['python3','-B','-m','unittest','discover','-s','ops/release/unified','-p','test_*.py','-q'],35,env),
       execute('production_source_safety',['node','ops/production-safety-check.js'],25,env),
       execute('timetable_lesson_attendance',['node','--test',*[BACKEND+x for x in CORE_TESTS]],35,env),
       execute('diary_exam_result_print',['node','--test',*INTEGRATION_TESTS],35,env),
    ]
    if opt.browser:
        try:
            with browser_dependency_scope(True):
                def run_browser(name):
                    return execute('synthetic_browser_'+name,
                                   ['node','--test',FRONTEND+name],18,env)
                # Each fixture owns a distinct synthetic localhost port. Bounded
                # concurrency makes one-shot acceptance finish without hiding a
                # timeout, missing test or individual failing exit code.
                with ThreadPoolExecutor(max_workers=3) as pool:
                    checks.extend(pool.map(run_browser, BROWSER_TESTS))
        except (RuntimeError, OSError):
            checks.append({'name':'synthetic_browser_dependency_setup','pass':False,'error':'OFFLINE_DEPENDENCY_UNAVAILABLE','counts':{}})
    try:
        live = subprocess.run(['python3','-B','ops/release/unified/assps_unified_readiness_readonly.py'],cwd=ROOT,env=env,capture_output=True,text=True,timeout=50)
        data = json.loads(live.stdout)
        decision = data.get('verdict',{})
        gate = {'verdict':decision.get('status','UNKNOWN'), 'unresolved_gate_count':len(decision.get('unresolved_release_gates',[])),
                'operational_evidence_groups':len(data.get('evidence',{})),
                'readiness_exit': live.returncode,
                'pass':live.returncode in (0,2) and decision.get('status') in ('RELEASE_HOLD','RELEASE_READY')}
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError):
        gate = {'pass': False, 'verdict':'UNVERIFIED','unresolved_gate_count':None}
    all_tests_pass = all(item['pass'] for item in checks)
    final = 'RELEASE_HOLD' if gate['pass'] and gate['verdict']=='RELEASE_HOLD' and all_tests_pass else 'VERIFICATION_FAILED'
    if gate['pass'] and gate['verdict']=='RELEASE_READY' and all_tests_pass:
        # Source-only tests never certify real authenticated actors, physical print or offhost restore.
        final = 'CERTIFICATION_NOT_INFERRED_FROM_TESTS'
    receipt = {'schema':'ASSPS_UNIFIED_NONDEPLOYING_ACCEPTANCE_V1',
      'timestamp_utc':dt.datetime.now(dt.timezone.utc).isoformat(),
      'canonical_head':head,'canonical_tracked_clean':not bool(dirty),
      'tests':checks,'read_only_live_gate':gate,'overall':final,
      'production_deployed':False, 'database_writes':0,
      'evidence_limits':'Synthetic/source-only tests cannot certify authenticated actor isolation, offhost decrypt, printer or academic approvals.'}
    saved = record_receipt(receipt)
    print(json.dumps({'head':head[:12], 'checks':len(checks), 'passed':sum(x['pass'] for x in checks),
       'node_test_cases_passed':sum(x.get('counts',{}).get('pass',0) for x in checks),
       'python_test_cases':next((x['counts'].get('tests') for x in checks if x['name']=='unified_python'),0),
       'gate':gate,'overall':final,'receipt':saved},sort_keys=True))
    return 2 if final=='RELEASE_HOLD' else 1

if __name__=='__main__':
    sys.exit(main())
