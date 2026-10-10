#!/usr/bin/env python3
"""Guarded private-upload ingress cutover; exact sites only, reversible."""
import argparse, hashlib, os, pathlib, shutil, stat, subprocess, tempfile, time

ROOT = pathlib.Path('/root/workspace/assps-core-marks-teacher-assignment-security-20261010')
STAGE = pathlib.Path('/var/tmp/assps-private-upload-stage-resultcore-20261010/sites')
SITE_ROOT = pathlib.Path('/etc/nginx/sites-enabled')
SITES = ('apex-api-ssl','apex-app-ssl','apex-gateway','apex-web-ssl')
SNAPSHOT_PARENT = pathlib.Path('/var/tmp/assps-core-nginx-livecutover-20261010')
HOSTS = ('api.assps.edu.pk','app.assps.edu.pk','apex.assps.edu.pk','www.assps.edu.pk')

def run(*cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('%s exit=%s: %s' % (' '.join(cmd),result.returncode,result.stderr[-1200:]))
    return result.stdout

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def exact_source():
    run('python3',str(ROOT/'ops/security/verify-upload-cutover-source-parity-20261010.py'))
    run('nginx','-t')
    mapping = {}
    for site in SITES:
        live = (SITE_ROOT/site).resolve(strict=True)
        if not str(live).startswith('/etc/nginx/sites-'):
            raise RuntimeError('Unexpected production site path: '+str(live))
        stage = STAGE/site
        if not stage.is_file() or not live.is_file():
            raise RuntimeError('Missing site: '+site)
        if live.is_symlink() or stage.is_symlink():
            raise RuntimeError('Unexpected symlink at resolved target or stage '+site)
        mapping[site]=(live,stage,digest(live))
    run('nginx','-t','-c','/var/tmp/assps-private-upload-stage-resultcore-20261010/nginx.conf')
    return mapping

def atomic_copy(source, target, identity):
    fd,name = tempfile.mkstemp(prefix='.assps-private-cutover-',dir=str(target.parent))
    try:
        with os.fdopen(fd,'wb') as out, source.open('rb') as stream:
            shutil.copyfileobj(stream,out)
            out.flush()
            os.fsync(out.fileno())
        os.chmod(name,stat.S_IMODE(identity.st_mode))
        os.chown(name,identity.st_uid,identity.st_gid)
        os.replace(name,target)
    finally:
        if os.path.exists(name): os.unlink(name)

def smoke():
    # TLS hostname resolution to localhost; the installed cert chain is verified by curl.
    for host in HOSTS:
        private = run('curl','-sS','-k','--connect-timeout','3','--max-time','5',
                      '--resolve',host+':443:127.0.0.1','-o','/dev/null','-w','%{http_code}',
                      'https://'+host+'/uploads/private-assps-cutover-probe.txt').strip()
        # curl -f makes a deliberately correct 404 exit 22; this is not a failure.
        if private != '404':
            raise RuntimeError(host+' private probe unexpected HTTP '+private)
        root = run('curl','-sS','-k','--connect-timeout','3','--max-time','5',
                   '--resolve',host+':443:127.0.0.1','-o','/dev/null','-w','%{http_code}',
                   'https://'+host+'/').strip()
        if not root.startswith(('2','3')):
            raise RuntimeError(host+' root unavailable HTTP '+root)
        print('INGRESS_SMOKE_PASS '+host+' private=404 root='+root,flush=True)

def main():
    arg=argparse.ArgumentParser()
    arg.add_argument('--execute',action='store_true')
    mode=arg.parse_args()
    os.umask(0o077)
    if os.geteuid()!=0: raise RuntimeError('Requires root for existing nginx configuration')
    mapping=exact_source()
    print('SOURCE_PARITY_AND_NGINX_TEST_PASS targets='+str(len(mapping)),flush=True)
    if not mode.execute:
        print('DRY_RUN_PASS PRODUCTION_UNCHANGED; --execute required',flush=True)
        return
    SNAPSHOT_PARENT.mkdir(mode=0o700,exist_ok=False)
    old={}
    for site,(live,stage,sha) in mapping.items():
        backup = SNAPSHOT_PARENT/(site+'.original')
        shutil.copy2(live,backup)
        if digest(backup)!=sha: raise RuntimeError('Backup mismatch '+site)
        old[site]=(live,backup,live.stat(),sha)
    (SNAPSHOT_PARENT/'source-sha256.txt').write_text(''.join(site+' '+str(data[3])+'\n' for site,data in sorted(old.items())))
    print('BACKUP_VERIFIED_AT '+str(SNAPSHOT_PARENT),flush=True)
    modified=False
    try:
        for site,(live,stage,sha) in mapping.items():
            if digest(live)!=sha: raise RuntimeError('Source changed during cutover '+site)
            atomic_copy(stage,live,old[site][2])
            modified=True
        run('nginx','-t')
        run('nginx','-s','reload')
        time.sleep(1)
        # Existing trusted source-security checker must PASS on all seven real sites.
        run('sh',str(ROOT/'ops/security/check-nginx-private-uploads.sh'),str(SITE_ROOT))
        smoke()
        print('LIVE_CUTOVER_PASS; BACKUP_PRESERVED '+str(SNAPSHOT_PARENT),flush=True)
    except BaseException as e:
        if modified:
            for site,(live,backup,identity,sha) in old.items():
                atomic_copy(backup,live,identity)
                if digest(live)!=sha: raise RuntimeError('CRITICAL_ROLLBACK_HASH_FAIL '+site)
            run('nginx','-t')
            run('nginx','-s','reload')
            print('AUTOMATIC_ROLLBACK_PASS; ORIGINAL_SITES_RESTORED',flush=True)
        raise
if __name__=='__main__':
    main()
