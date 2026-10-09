#!/usr/bin/env python3
"""Read-only live-source reconciliation → private Nginx staging candidate.

Never writes to the source config or reloads Nginx. Fail closed when active
site layout differs from the exact reviewed five-location ASSPS baseline.
The output directory must not exist; all copied live config remains 0700/0600.
"""
from __future__ import annotations
import argparse
import os
from pathlib import Path
import re
import shutil
import sys

EXPECT = {'apex-api-ssl': 1, 'apex-app-ssl': 1, 'apex-gateway': 2, 'apex-web-ssl': 1}
GENERIC = re.compile(r'(?m)^([ \t]*)location\s+/uploads/\s*\{([^{}]*)\}')
SSL_MARK = 'include /etc/nginx/sites-enabled/*;'
LOG = []
def fail(reason: str) -> None:
    raise ValueError('NGINX_CANDIDATE_BLOCKED: '+reason)

def build(source: Path, out: Path, parent_nginx: Path, policy: Path) -> None:
    if out.exists():
        fail('output path already exists; never overwrite an existing candidate')
    if not source.is_dir() or not parent_nginx.is_file() or not policy.is_file():
        fail('source sites, global nginx or versioned policy unavailable')
    baseline = policy.read_text()
    if len(re.findall(r'(?m)^location\s+\^~\s+/uploads/branding/\s*\{',baseline)) != 1 or len(re.findall(r'(?m)^location\s+\^~\s+/uploads/\s*\{',baseline)) != 1:
        fail('missing or duplicate exact branding-only policy locations')
    if 'alias /var/uploads/branding/;' not in baseline or 'disable_symlinks on;' not in baseline:
        fail('policy does not constrain branding to non-symlink assets')
    if 'return 404;' not in baseline:
        fail('policy does not reject unknown/private upload paths')
    if 'if ($uri !~* ^/uploads/branding/[a-z0-9][a-z0-9_.-]*' not in baseline or 'Content-Security-Policy "sandbox"' not in baseline:
        fail('public branding lacks raster-only and passive media security controls')
    site_paths = sorted(x for x in source.iterdir() if x.is_file())
    if len(site_paths) < len(EXPECT):
        fail('too few enabled site files')
    contents = {}
    counts = {}
    for site in site_paths:
        original = site.read_text()
        found = list(GENERIC.finditer(original))
        expected = EXPECT.get(site.name,0)
        if len(found) != expected:
            fail(f'{site.name}: expected {expected} generic aliases, found {len(found)}')
        for m in found:
            body = m.group(2)
            if len(re.findall(r'\balias\s+/var/uploads/;',body)) != 1:
                fail(f'{site.name}: generic upload location lacks exact reviewed filesystem alias')
            if 'try_files $uri =404;' not in body:
                fail(f'{site.name}: unreviewed current upload try_files behavior')
            # Do not discard other new access restrictions or more locations.
            if re.search(r'\b(auth_request|allow|deny|proxy_pass|root|rewrite|return|internal)\b',body):
                fail(f'{site.name}: unreviewed upload authorization directive')
        if expected:
            # Inline versioned location blocks inside each original server.
            # The indent is cosmetic; preserve unrelated host/SSL/proxy content verbatim.
            proposed = GENERIC.sub(lambda m: '\n'.join(m.group(1)+line if line else '' for line in baseline.splitlines()), original)
        else:
            proposed = original
        if GENERIC.search(proposed):
            fail(f'{site.name}: generic alias unexpectedly remains')
        # Strictly preserve all unrelated file bytes after removing the 5 expected blocks.
        contents[site.name] = proposed
        counts[site.name] = len(found)
    if set(EXPECT)-set(contents):
        fail('one or more required production ingress sites are missing')
    parent = parent_nginx.read_text()
    if parent.count(SSL_MARK) != 1:
        fail('live global nginx configuration has unexpected site include')
    # No privileged PID or live logs touched by a subsequent nginx -t.
    planned_parent = parent.replace(SSL_MARK, f'include {out / "sites"}/*;')
    if planned_parent == parent:
        fail('global nginx include not reconciled')
    # All inspection complete: only now create the locked staging output.
    out.mkdir(mode=0o700,parents=False)
    (out/'sites').mkdir(mode=0o700)
    for name, proposed in contents.items():
        file = out/'sites'/name
        file.write_text(proposed)
        file.chmod(0o600)
    global_conf = out/'nginx.conf'
    global_conf.write_text(planned_parent)
    global_conf.chmod(0o600)
    (out/'candidate-counts.txt').write_text('\n'.join(f'{k}={v}' for k,v in sorted(counts.items()))+'\n')
    (out/'candidate-counts.txt').chmod(0o600)
    print(f'NGINX_RC_STAGE_PASS site_files={len(site_paths)} rewritten={sum(counts.values())} output={out}')
    for name, number in sorted(counts.items()):
        if number:
            print(f'RECONCILED {name}: generic_locations={number}')

if __name__=='__main__':
    arg=argparse.ArgumentParser()
    arg.add_argument('--sites',type=Path,required=True)
    arg.add_argument('--global-conf',type=Path,required=True)
    arg.add_argument('--policy',type=Path,required=True)
    arg.add_argument('--out',type=Path,required=True)
    args=arg.parse_args()
    try:
        build(args.sites,args.out,args.global_conf,args.policy)
    except (ValueError,OSError) as error:
        print(str(error),file=sys.stderr)
        sys.exit(2)
