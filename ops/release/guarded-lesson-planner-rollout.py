#!/usr/bin/env python3
"""ASSPS Lesson Planner: check-first, atomic, rollback-capable frontend cutover.

Normal mode has NO side effects. --apply is disabled by real official Core HOLD;
it invokes Core's trusted signed-release verifier and requires actual READY plus
all signed runtime checks. No 'force', fake-signature or skip-check switch.

The UI contract is versioned; this script accepts any clean Git descendant
with both Grade IX-X and canonical Paper Studio ancestors. There is no SHA
freeze that would prevent genuine future deployments.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat as statmod
import subprocess
import sys
import tempfile
import fcntl

from importlib.util import module_from_spec, spec_from_file_location

HERE = Path(__file__).resolve().parent
CHECKER = HERE/'check-lesson-planner-ui.py'
CONTRACT = HERE/'lesson-planner-ui-contract-v3.json'
NGINX_SITE = Path('/etc/nginx/sites-enabled/apex-app-ssl')
APP_DOMAIN = 'app.assps.edu.pk'
CORE_VERIFIER = Path('/root/workspace/assps-core-real-actor-acceptance-handoff-20261015'
                     '/ops/release/signed-bluegreen/verify-connect-login-only-core-20261014.py')
LOCK = Path('/run/lock/assps-frontend-release.lock')
BACKUP_ROOT = Path('/root/assps-release-backups')
OUTPUT_ROOT = Path('/var/www')
RUNNING_BACKEND = Path('/var/www/apex-backend')
HTML_ROOT_RE = re.compile(r'^([ \t]*root[ \t]+)(/var/www/assps-[^\s;]+)(;[ \t]*)$', re.M)


def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()


def run(cmd):
    return subprocess.run(cmd,capture_output=True,text=True,check=False,timeout=30)


def check_core(args):
    """Trusted Core gate must verify genuine actors and signatures itself."""
    if not CORE_VERIFIER.is_file():
        raise RuntimeError('Trusted official Core signed gate unavailable')
    stat=CORE_VERIFIER.stat()
    if stat.st_uid!=0 or stat.st_mode & 0o022:
        raise RuntimeError('Core verifier is not trusted root-owned immutable-by-unprivileged')
    if not args.release_id or not args.core_proxy_sha or not args.core_build_id:
        raise RuntimeError('Provide exact reviewed Core release id, proxy digest and Next build id')
    p=run(['python3',str(CORE_VERIFIER),'--release-id',args.release_id,
           '--approved-proxy-sha256',args.core_proxy_sha,
           '--approved-build-id',args.core_build_id])
    try:result=json.loads(p.stdout)
    except ValueError:raise RuntimeError('Official Core returned no JSON readiness evidence')
    # READY_FOR_LOGIN_ONLY_CORE is necessary but not a claim of full cutover.
    if p.returncode!=0 or result.get('status')!='READY_FOR_LOGIN_ONLY_CORE' or result.get('blocked'):
        raise RuntimeError('Official Core gate is HOLD; frontend release rejected')
    checks=result.get('checks',{})
    essential=('production_signed_catalog_safe','real_signed_peer_school_and_subject_denial',
               'independent_offhost_current_recovery_certified',
               'exact_reviewed_ai_worker_adapter_deployed',
               'production_restricted_signed_transport_enabled',
               'global_worker_separated_and_authenticated')
    if not all(checks.get(item) is True for item in essential):
        raise RuntimeError('Signed school actors, rollback or runtime worker gate missing')
    return result



def check_running_backend_provenance(repo, backend=RUNNING_BACKEND):
    """Require the published private academic guard before exposing its UI.

    Pinned to the exact reviewed *candidate source*, not a historical fixed
    hash. A newer audited descendant is deployable through the same path.
    Other backend routes may evolve, so inspect guarded endpoint invariants
    instead of requiring a stale complete backend file hash.
    """
    reviewed=Path(repo)/'al-siddique-backend/src/services/lessonPlanningPublicationGuard.js'
    running=Path(backend)/'src/services/lessonPlanningPublicationGuard.js'
    if not reviewed.is_file() or not running.is_file():
        raise RuntimeError('Protected academic lesson backend guard is NOT live; Core must promote the reviewed guard first')
    if sha(reviewed)!=sha(running):
        raise RuntimeError('Running academic guard differs from candidate; reviewed backend parity required')
    route=Path(backend)/'src/routes/lessonPlanRoutes.js'
    if not route.is_file():
        raise RuntimeError('Running backend lesson plan route missing')
    text=route.read_text(encoding='utf-8',errors='replace')
    required=('lessonPlanningPublicationGuard',
              'mustHoldLessonPublication',
              'privateLessonMutationAllowed',
              'LESSON_PLAN_ACADEMIC_APPROVAL_REQUIRED',
              'LESSON_PLAN_ACADEMIC_SOURCE_LOCKED')
    if any(item not in text for item in required):
        raise RuntimeError('Running backend lacks the approved publication/update/delete protections')
    return True


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--dist',required=True)
    parser.add_argument('--repo',required=True)
    parser.add_argument('--expected-live-html-sha',required=True)
    parser.add_argument('--apply',action='store_true',help='Requires REAL certified Core gate')
    parser.add_argument('--release-id')
    parser.add_argument('--core-proxy-sha')
    parser.add_argument('--core-build-id')
    args=parser.parse_args()
    live_before=NGINX_SITE.read_text(encoding='utf-8')
    matches=HTML_ROOT_RE.findall(live_before)
    if len(matches)!=1:
        raise RuntimeError('Expected exactly one explicit app frontend root; refuse ambiguity')
    oldroot=Path(matches[0][1])
    if oldroot.is_symlink() or not oldroot.is_dir():
        raise RuntimeError('Current live root is not a regular directory')
    old_index_sha=sha(oldroot/'index.html')
    if old_index_sha!=args.expected_live_html_sha:
        raise RuntimeError('Newer live release has changed: rebase before promotion')
    repo=Path(args.repo).resolve()
    dist=Path(args.dist).resolve()
    if not str(dist).startswith(str(repo)+'/'):
        raise RuntimeError('Build must be produced from the exact reviewed Git worktree')
    git=run(['git','-C',str(repo),'rev-parse','HEAD'])
    status=run(['git','-C',str(repo),'status','--porcelain'])
    if git.returncode!=0 or status.returncode!=0 or status.stdout.strip():
        raise RuntimeError('Candidate Git state is not clean')
    commit=git.stdout.strip()
    spec=spec_from_file_location('lesson_ui',CHECKER)
    mod=module_from_spec(spec);spec.loader.exec_module(mod)
    contract=json.loads(CONTRACT.read_text())
    qa=mod.validate(dist,contract,repo)
    if not qa['pass']:raise RuntimeError('Built frontend FAILED actual reachable Lesson Planner contract')
    newroot=OUTPUT_ROOT/('assps-lesson-planner-'+commit[:12])
    expected_new=sha(dist/'index.html')
    plan={'decision':'READY_FOR_CORE_GATE' if not args.apply else 'CORE_GATE_CHECK_REQUIRED',
          'current_root':str(oldroot),'live_sha':old_index_sha,
          'candidate_root':str(newroot),'new_html_sha':expected_new,
          'candidate_git_sha':commit,'ui_contract':'PASS',
          'production_changed':False}
    if not args.apply:
        print(json.dumps(plan,indent=2))
        return 0
    # Gate before touching any /var/www or nginx production files.
    check_core(args)
    check_running_backend_provenance(repo)
    with LOCK.open('a+') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX | fcntl.LOCK_NB)
        now=NGINX_SITE.read_text(encoding='utf-8')
        if now!=live_before or sha(oldroot/'index.html')!=old_index_sha:
            raise RuntimeError('Concurrent production change detected under release lock')
        if newroot.exists():
            if newroot.is_symlink() or sha(newroot/'index.html')!=expected_new:
                raise RuntimeError('Destination exists with different content; preserve it')
        else:
            stage=OUTPUT_ROOT/('.stage-assps-lesson-'+commit[:12]+'-'+str(os.getpid()))
            if stage.exists():raise RuntimeError('Staging root name collision')
            stage.mkdir(mode=0o755)
            try:
                src=dist.resolve()
                shutil.copytree(src,stage,dirs_exist_ok=True,symlinks=False)
                if sha(stage/'index.html')!=expected_new:
                    raise RuntimeError('Stage checksum mismatch')
                os.rename(stage,newroot)
            except BaseException:
                # Preserve contents for examination, never delete previous app root.
                raise
        # Make dedicated recovery directory and preserve original config; no
        # existing school files/marks/DB/old static root are removed.
        backup=BACKUP_ROOT/('lesson-planner-'+commit[:12]+'-'+str(os.getpid()))
        backup.mkdir(mode=0o700)
        shutil.copy2(NGINX_SITE,backup/'apex-app-ssl.pre-change')
        (backup/'prechange-root.txt').write_text(str(oldroot)+'\n'+old_index_sha+'\n')
        newcfg=live_before.replace('root '+str(oldroot)+';', 'root '+str(newroot)+';')
        if newcfg==live_before or newcfg.count('root '+str(newroot)+';')!=1:
            raise RuntimeError('Cannot precisely replace one root directive')
        success=False
        try:
            target_config=NGINX_SITE.resolve(strict=True)
            original_mode=statmod.S_IMODE(target_config.stat().st_mode)
            tmp=target_config.with_name(target_config.name+'.lesson-staged-'+str(os.getpid()))
            tmp.write_text(newcfg)
            tmp.chmod(original_mode)
            # Preserve a sites-enabled symlink by atomically replacing its
            # resolved target, never by silently replacing the symlink.
            os.replace(tmp,target_config)
            if run(['nginx','-t']).returncode!=0:raise RuntimeError('Nginx syntax invalid')
            if run(['systemctl','reload','nginx']).returncode!=0:raise RuntimeError('Nginx reload failed')
            p=run(['curl','-fsS','--max-time','15','--resolve',
                   APP_DOMAIN+':443:127.0.0.1','https://'+APP_DOMAIN+'/'])
            if p.returncode!=0 or hashlib.sha256(p.stdout.encode()).hexdigest()!=expected_new:
                raise RuntimeError('Local TLS frontend postflight failed')
            success=True
            plan.update(decision='FRONTEND_ONLY_PROMOTED_CORE_VERIFIED',
                        production_changed=True,rollback_config=str(backup/'apex-app-ssl.pre-change'))
            print(json.dumps(plan,indent=2))
            return 0
        finally:
            if not success:
                shutil.copy2(backup/'apex-app-ssl.pre-change',NGINX_SITE.resolve(strict=True))
                run(['nginx','-t'])
                run(['systemctl','reload','nginx'])


if __name__=='__main__':
    try:sys.exit(main())
    except Exception as e:
        print(json.dumps({'decision':'HOLD_NO_RELEASE','error':str(e),
                          'status':'FAIL_CLOSED'}),file=sys.stderr)
        sys.exit(2)
