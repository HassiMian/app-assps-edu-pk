#!/usr/bin/env python3
"""Read-only Connect + Paper + Core candidate compatibility preflight.

This is a cross-owner *technical* candidate check, never a release signer.
No deploy, SQL writes, staff session minting, receipt creation or Nginx reload.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as inp:
        for part in iter(lambda: inp.read(1024 * 1024), b''):
            h.update(part)
    return h.hexdigest()


def run_json(args: list[str], *, env: dict | None = None, max_sec: int = 45, accepted: tuple[int, ...] = (0,)):
    p = subprocess.run(args, text=True, capture_output=True, env=env, timeout=max_sec)
    if p.returncode not in accepted:
        raise ValueError('CHECK_PROCESS_EXIT_' + str(p.returncode))
    try:
        return json.loads(p.stdout), p.returncode
    except json.JSONDecodeError as exc:
        raise ValueError('CHECK_INVALID_JSON') from exc


def run_source_test(file: Path, stage: Path):
    env = os.environ.copy()
    env['CONNECT_STAGE_ROOT'] = str(stage)
    p = subprocess.run(['node', str(file)], env=env, capture_output=True, text=True, timeout=40)
    if p.returncode:
        return False, 0
    lines = [s for s in p.stdout.splitlines() if s.startswith('PASS ')]
    return True, len(lines)


def check(args) -> dict:
    out = {'schema':'assps-connect-cross-owner-release-candidate-v1',
           'scope':'READ_ONLY_SOURCE_AND_ARTIFACT_PROVENANCE',
           'production_modified':False,
           'staff_or_peer_credential_verified':False,
           'signed_human_release_certified':False,
           'public_worker_adapter_deployed_verified':False,
           'production_release_authorized':False,
           'checks':{}, 'failure_reasons':[]}
    results = out['checks']
    try:
        paper = args.paper_repo.resolve(strict=True)
        dist = args.paper_dist.resolve(strict=True)
        ops = args.connect_ops.resolve(strict=True)
        next_root = args.next_stage.resolve(strict=True)
        live = args.live_grade_root.resolve(strict=True)
        if not all(p.is_dir() for p in (paper,dist,ops,next_root,live)):
            raise ValueError('EXPECTED_DIRECTORY_MISSING')

        out['live_grade_html_sha256'] = sha(live/'index.html')
        out['paper_candidate_html_sha256'] = sha(dist/'index.html')
        out['next_candidate_build_id'] = (next_root/'.next/BUILD_ID').read_text().strip()
        if not out['next_candidate_build_id']:
            raise ValueError('MISSING_NEXT_BUILD')
        results['live_hash_not_changed_since_review'] = (
            out['live_grade_html_sha256'] == args.expected_live_html_sha)

        paper_guard = paper/'ops/release/verify-diary-controls-in-active-bundle-20261015.cjs'
        candidate_diary, _ = run_json(['node',str(paper_guard),'--dist',str(dist)])
        results['paper_candidate_diary_11_controls'] = (
            candidate_diary.get('prePromotionDecision') ==
                'PASS_DIARY_ACTIVE_CONTROLLER_PRESERVATION_ONLY'
            and len(candidate_diary.get('verifiedControllerSignals',[]))==11)
        out['candidate_active_diary_module'] = candidate_diary.get('activeDiaryModule')

        planner, _ = run_json(['python3',str(paper/'ops/release/check-lesson-planner-ui.py'),
                                '--dist',str(dist),'--repo',str(paper),'--no-source'])
        results['paper_candidate_lesson_plan_contract'] = (
            planner.get('result')=='PASS' and planner.get('pass') is True)

        companion, _ = run_json(['python3',str(paper/'ops/release/check-preserved-companion-features.py'),
                                  '--dist',str(dist),'--repo',str(paper)])
        results['paper_candidate_diary_earlyyears_companions'] = (
            companion.get('result')=='PASS'
            and companion.get('public_release_authorized') is False)

        rollout, _ = run_json(['python3',str(paper/'ops/release/guarded-lesson-planner-rollout.py'),
                               '--dist',str(dist),'--repo',str(paper),
                               '--expected-live-html-sha',args.expected_live_html_sha])
        results['paper_candidate_rollout_nonapply_readiness'] = (
            rollout.get('decision')=='READY_FOR_CORE_GATE'
            and rollout.get('production_changed') is False
            and rollout.get('new_html_sha') == out['paper_candidate_html_sha256'])

        # A public regression does not invalidate the improved candidate; record it.
        try:
            live_diary, _ = run_json(['node',str(paper_guard),'--dist',str(live)])
            out['public_diary_active_graph_status'] = 'PASS' if len(live_diary.get('verifiedControllerSignals',[]))==11 else 'FAIL'
        except (ValueError, subprocess.TimeoutExpired):
            out['public_diary_active_graph_status'] = 'FAIL'
        results['public_diary_healthy'] = out['public_diary_active_graph_status']=='PASS'

        out['connect_auth_source_tests'] = {}
        tests = [
            ('role_neutral', 'test-current-live-role-neutral-20261015.cjs',13),
            ('first_login_401', 'test-current-live-firstlogin-401-boundary-20261015.cjs',7),
            ('password_boundary', 'test-current-live-temporary-login-20261015.cjs',6)
        ]
        for name, filename, minimum in tests:
            ok, count = run_source_test(ops/filename, next_root)
            results['connect_'+name] = ok and count>=minimum
            out['connect_auth_source_tests'][name] = count

        # The source-only public guard's adversarial tests never need live credentials.
        guard = subprocess.run(['node',str(ops/'test-current-live-public-guard-20261015.cjs')],
                               capture_output=True,text=True,timeout=30)
        results['connect_public_guard_negative_tests'] = (
            guard.returncode==0 and guard.stdout.count('PASS ')>=10)

        core, rc = run_json(['python3',str(args.core_verifier),'--with-core-gate'],
                             max_sec=90,accepted=(0,2))
        out['core_source_checks'] = str(sum(bool(v) for v in core.get('checks',{}).values())) + '/' + str(len(core.get('checks',{})))
        out['official_core_release_status'] = core.get('core_official_gate',{}).get('status','UNKNOWN')
        out['official_core_exit_code'] = rc
        out['official_core_blockers'] = core.get('core_official_gate',{}).get('blocked',[])
        results['official_core_evidence_schema_consistent'] = (
            core.get('overall_production_release') == out['official_core_release_status']
            and rc in (0,2))
        results['official_core_source_checks_complete'] = (
            len(core.get('checks',{})) >= 20
            and all(v is True for v in core.get('checks',{}).values()))
        out['release_requires_core_approval'] = True

        # Current full-release gate can never be replaced by this technical report.
        out['technical_candidate_status'] = 'PASS' if all(
            v for k,v in results.items() if k!='public_diary_healthy') else 'HOLD'
        out['release_decision'] = 'HOLD_REQUIRES_INDEPENDENT_CORE_SIGNED_ACCEPTANCE'
        out['failure_reasons'] = [k for k,v in results.items() if not v]
    except (OSError, ValueError, subprocess.TimeoutExpired, KeyError) as exc:
        out['technical_candidate_status']='HOLD'
        out['release_decision']='HOLD_ERROR'
        out['failure_reasons'].append(type(exc).__name__ + ':' + str(exc)[:100])
    return out


def main():
    ap=argparse.ArgumentParser()
    for key in ('paper-repo','paper-dist','connect-ops','next-stage','live-grade-root','core-verifier'):
        ap.add_argument('--'+key, type=Path, required=True)
    ap.add_argument('--expected-live-html-sha',required=True)
    ap.add_argument('--production-release-gate',action='store_true')
    args=ap.parse_args()
    result=check(args)
    print(json.dumps(result,indent=2,sort_keys=True))
    # Even when technical PASS, no self-authorized production release.
    if args.production_release_gate:
        return 2
    return 0 if result['technical_candidate_status']=='PASS' else 2

if __name__=='__main__':
    sys.exit(main())
