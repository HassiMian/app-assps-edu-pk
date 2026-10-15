#!/usr/bin/env python3
"""Read-only: attest a current-live-derived worker candidate; NEVER authorize promotion.

- Existing production DB records and logins are never mutated.
- Real separate SCRAM worker is probed by the existing vetted verifier.
- Live public backend promotion must be certified separately by SaaS Core.
"""
import importlib.util
import hashlib
import json
from pathlib import Path

OPS = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[3]
LIVE = Path('/var/www/apex-backend/src')
STAGE = Path('/root/assps-release-candidates/apex-backend-live-merged-ai-worker-20261015/src')
WORKER_FILES = ('services/ai/aiQueueWorkerDatabase.js',
                'services/ai/paperAiQueue.js','routes/opsRoutes.js')
PRESERVE_FILES = ('server.js','routes/lessonPlanRoutes.js')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def attest_overlay(source=ROOT/'al-siddique-backend/src', live=LIVE, stage=STAGE):
    tests = {}
    for f in WORKER_FILES:
        tests['reviewed_overlay_'+f] = (source/f).is_file() and (stage/f).is_file() and sha(source/f)==sha(stage/f)
    for f in PRESERVE_FILES:
        tests['concurrent_live_preserved_'+f] = (live/f).is_file() and (stage/f).is_file() and sha(live/f)==sha(stage/f)
    tests['public_running_adapter_not_falsely_promoted'] = not (live/WORKER_FILES[0]).exists()
    return tests

def main():
    tests=attest_overlay()
    if not all(tests.values()):
        print(json.dumps({'gate':'CURRENT_LIVE_MERGED_WORKER','status':'HOLD',
                          'checks':tests,'production_deployed':False},sort_keys=True,indent=2))
        return 2
    spec=importlib.util.spec_from_file_location(
        'reviewed_worker_verifier', OPS/'verify-live-restricted-ai-worker-20261015.py')
    m=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    m.CANARY=STAGE
    print('REUSED_CORE_AUTHENTICATED_WORKER_READ_ONLY_VERIFIER:')
    rc=m.main()
    print(json.dumps({'gate':'CURRENT_LIVE_MERGED_WORKER','staging_reconciled':True,
                      'core_read_only_worker_technical_gate': 'PASS' if rc==0 else 'HOLD',
                      'production_cutover':'HOLD',
                      'real_staff_and_peer_school_signed_acceptance':'NOT_CERTIFIED',
                      'offsite_current_restore_signed_review':'NOT_CERTIFIED',
                      'checks':tests},indent=2,sort_keys=True))
    return rc

if __name__=='__main__':raise SystemExit(main())
