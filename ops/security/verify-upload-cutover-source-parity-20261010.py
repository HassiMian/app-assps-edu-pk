#!/usr/bin/env python3
"""Read-only, fail-closed source-parity gate for ASSPS private-upload Nginx hotfix.

No Nginx reload, source mutation, SQL or network calls. This does NOT close
the actual live private-media ingress vulnerability.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys

GENERIC = re.compile(r'(?m)^([ \t]*)location\s+/uploads/\s*\{([^{}]*)\}')
EXPECT = {'apex-api-ssl': 1, 'apex-app-ssl': 1, 'apex-gateway': 2, 'apex-web-ssl': 1}
BASELINE = 'a0bd6bcebb57f0b4831f49c15d38617f61b47bc7e8d95345a195da6445ea945a'
OLD_INCLUDE = 'include /etc/nginx/sites-enabled/*;'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def verify(enabled, globalconf, candidate, snapshot, policy):
    for p in (enabled, candidate / 'sites', snapshot / 'resolved'):
        if not p.is_dir(): raise ValueError('missing required directory: ' + str(p))
    manifestdata = (snapshot / 'manifest.json').read_bytes()
    if sha(manifestdata) != BASELINE:
        raise ValueError('independent rollback manifest mismatch')
    manifest = json.loads(manifestdata)
    if sha(globalconf.read_bytes()) != manifest['global_sha256']:
        raise ValueError('current global configuration drift')
    declared = manifest['sites']
    present = {p.name for p in enabled.iterdir()}
    if len(declared) != 7 or set(declared) != present:
        raise ValueError('current enabled-sites count or names drift')
    policy_lines = policy.read_text().splitlines()
    count = 0
    changes = []
    for name, entry in sorted(declared.items()):
        p = enabled / name
        link = os.readlink(p) if p.is_symlink() else None
        if link != entry['link'] or str(p.resolve(strict=True)) != entry['resolved']:
            raise ValueError('site link/source drift: ' + name)
        current = p.read_bytes()
        if sha(current) != entry['sha256'] or current != (snapshot/'resolved'/name).read_bytes():
            raise ValueError('site baseline bytes drift: ' + name)
        source = current.decode('utf-8')
        matches = GENERIC.findall(source)
        expected = EXPECT.get(name, 0)
        if len(matches) != expected:
            raise ValueError('unexpected generic upload block count: ' + name)
        for _, body in matches:
            if len(re.findall(r'\balias\s+/var/uploads/;', body)) != 1 or 'try_files $uri =404;' not in body:
                raise ValueError('unreviewed generic alias block: ' + name)
        prospective = GENERIC.sub(
            lambda m: '\n'.join(m.group(1) + line if line else '' for line in policy_lines),
            source
        ).encode()
        if (candidate / 'sites' / name).read_bytes() != prospective:
            raise ValueError('staged site differs outside reviewed upload replacement: ' + name)
        count += expected
        if expected: changes.append(name)
    if count != 5 or len(changes) != 4:
        raise ValueError('expected exactly five affected blocks across four sites')
    old = globalconf.read_text()
    if old.count(OLD_INCLUDE) != 1:
        raise ValueError('unexpected Nginx root include structure')
    planned = old.replace(OLD_INCLUDE, 'include ' + str(candidate/'sites') + '/*;')
    if (candidate/'nginx.conf').read_text() != planned:
        raise ValueError('staged nginx global differs outside include swap')
    print('UPLOAD_CUTOVER_SOURCE_PARITY_PASS sites=7 unsafe_original_blocks=5 staged_rewrites=4')
    print('SOURCE_MANIFEST_SHA256=' + BASELINE)
    print('VERIFIED_TARGETS=' + ','.join(changes))
    print('NO_LIVE_CHANGE_AND_NO_RELEASE_CERTIFICATION')
    return True

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--enabled', type=Path, default=Path('/etc/nginx/sites-enabled'))
    p.add_argument('--globalconf', type=Path, default=Path('/etc/nginx/nginx.conf'))
    p.add_argument('--candidate', type=Path, default=Path('/var/tmp/assps-core-live-reconciled-candidate-20261009'))
    p.add_argument('--snapshot', type=Path, default=Path('/var/tmp/assps-core-nginx-rollback-proof-20261010-owner'))
    p.add_argument('--policy', type=Path, default=Path('ops/security/nginx-uploads-public-only.locations.conf'))
    args = p.parse_args()
    try:
        verify(args.enabled, args.globalconf, args.candidate, args.snapshot, args.policy)
    except (ValueError, OSError, UnicodeError) as exc:
        print('UPLOAD_CUTOVER_PARITY_HOLD '+str(exc), file=sys.stderr)
        return 2
    return 0

if __name__ == '__main__':
    sys.exit(main())
