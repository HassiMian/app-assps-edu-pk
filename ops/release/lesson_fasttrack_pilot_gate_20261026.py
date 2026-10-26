#!/usr/bin/env python3
"""Read-only ASSPS Lesson Planning fast-track operational gate.
Does not deploy, purge cache, authenticate as staff, touch DB, or fabricate signoffs.
Use for independent *feature* pilot readiness, separately from full SaaS release.
"""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys

DEFAULT_EVIDENCE=Path('/root/workspace/assps-lesson-certification-20261026')
DEFAULT_LIVE=Path('/var/www/apex-backend/src')
DEFAULT_REPO=Path(__file__).resolve().parents[2]
GUARD='services/lessonPlanningPublicationGuard.js'
ROUTE='routes/lessonPlanRoutes.js'
ROUTE_REQUIRED=('mustHoldLessonPublication','privateLessonMutationAllowed',
                'LESSON_PLAN_ACADEMIC_APPROVAL_REQUIRED',
                'LESSON_PLAN_ACADEMIC_SOURCE_LOCKED')
def digest(p):
    try: return hashlib.sha256(p.read_bytes()).hexdigest()
    except (OSError, ValueError): return None

def evidence_json(path):
    try:
        if path.is_symlink() or not path.is_file():return {}
        return json.loads(path.read_text())
    except (OSError,ValueError,TypeError):
        return {}

def evaluate(*,guard_parity, route_protected, backup, cdn, real_actor=False,
             independent_peer=False, print_witness=False, offhost=False,
             reviewed_core=False, rollback=False, academic_approval=False):
    # These are independent evidence requirements; never infer missing human evidence.
    checks={
      'running_backend_guard_parity':guard_parity is True,
      'academic_route_protected':route_protected is True,
      'current_two_cluster_isolated_restore':(
        isinstance(backup,dict) and
        backup.get('archive_sha256_manifest_verified') is True and
        backup.get('restore_from_current_backup')=='PASS' and
        all(isinstance(backup.get(k),dict) and
            backup[k].get('status')=='PASS' and
            backup[k].get('app_catalog')=='PASS'
            for k in ('main','signed'))),
      'no_cached_anonymous_private_media':(
        isinstance(cdn,dict) and cdn.get('sustained_evidence_pass') is True and
        cdn.get('cached_private_exposure_observed_in_any_round') is False and
        cdn.get('sample_rounds',0)>=3),
      'authenticated_cloudflare_scoped_purge':(
        isinstance(cdn,dict) and cdn.get('provider_authenticated_purge') is True),
      'real_school1_teacher_principal_acceptance': real_actor is True,
      'real_independent_school2_denial': independent_peer is True,
      'urdu_a4_physical_print_witness': print_witness is True,
      'current_independent_encrypted_offhost_restore': offhost is True,
      'reviewed_signed_core_release': reviewed_core is True,
      'rollback_witness': rollback is True,
      'approved_pilot_academic_content': academic_approval is True,
    }
    return {
      'scope':'LESSON_PLANNING_CONTROLLED_PILOT_ONLY',
      'source_safety_pass':checks['running_backend_guard_parity'] and checks['academic_route_protected'],
      'all_pilot_evidence_pass':all(checks.values()),
      'decision':'PILOT_GO' if all(checks.values()) else 'PILOT_HOLD',
      'checks':checks,
      'blockers':[k for k,v in checks.items() if not v],
      'production_changed':False,
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--repo',type=Path,default=DEFAULT_REPO)
    p.add_argument('--live-backend-src',type=Path,default=DEFAULT_LIVE)
    p.add_argument('--evidence-dir',type=Path,default=DEFAULT_EVIDENCE)
    args=p.parse_args()
    repo=args.repo
    candidate=repo/'al-siddique-backend/src'
    active=args.live_backend_src
    a,b=candidate/GUARD,active/GUARD
    route=active/ROUTE
    is_live_guard=(digest(a) is not None and digest(a)==digest(b))
    route_text=route.read_text(errors='replace') if route.is_file() else ''
    route_ok=all(s in route_text for s in ROUTE_REQUIRED)
    backup=evidence_json(args.evidence_dir/'DUAL_CLUSTER_CURRENT_ISOLATED_RESTORE_20261026.RESTRICTED.json')
    cdn=evidence_json(args.evidence_dir/'CDN_SUSTAINED_PRIVACY_20261026.RESTRICTED.json')
    result=evaluate(guard_parity=is_live_guard,route_protected=route_ok,backup=backup,cdn=cdn)
    # No flags to set human approvals, offsite, CDN purge or signed Core release.
    # Those require separate genuine independently verifiable controls.
    result.update({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
       'source_sha_prefix':digest(a)[:16] if digest(a) else None,
       'live_sha_prefix':digest(b)[:16] if digest(b) else None,
       'evidence_inputs_present':{'current_restore':bool(backup),'sustained_cdn':bool(cdn)}})
    print(json.dumps(result,indent=2,sort_keys=True))
    return 0 if result['all_pilot_evidence_pass'] else 3

if __name__=='__main__':
    sys.exit(main())
