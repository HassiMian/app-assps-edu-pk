#!/usr/bin/env python3
"""Private, read-only ASSPS current-frontend source build and extra-file audit.

Never deletes or changes an active frontend. Never prints sensitive filenames.
Exit: 2 = exact current build yet extra/stale files HOLD; 3 = failed verification.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tarfile
from datetime import datetime, timezone
from urllib.parse import quote

BASE=Path('/root/secure-archive/assps-unified-20261019/immutable-source-front-candidate-3f7fbfa4-20261019T1717Z')
LIVE=Path('/var/www/assps-resultcard-nazra-purged-20261019')
TARGET_SHA='3c74d3be652b41549ef2129eaacec4c341c05c2118597e308edffd17a33726a9'
CHECKSUM_LINE=re.compile(r'^([0-9a-f]{64})  \./(.+)$')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def safe_member_name(name):
    if name.startswith('./'): name=name[2:]
    p=Path(name)
    if not name or name.startswith('/') or '\\' in name or '..' in p.parts or str(p)!=name or '\x00' in name:
        raise ValueError('Unsafe artifact path')
    return name

def read_manifest(path):
    entries={}
    for line in path.read_text().splitlines():
        m=CHECKSUM_LINE.fullmatch(line)
        if not m:
            raise ValueError('Malformed source build manifest')
        filename=safe_member_name(m.group(2))
        if filename in entries:
            raise ValueError('Duplicate source build manifest path')
        entries[filename]=m.group(1)
    if not entries or 'index.html' not in entries:
        raise ValueError('Source build manifest missing index')
    return entries

def verify_tar(tarpath, manifest):
    verified=set()
    with tarfile.open(tarpath, mode='r:gz') as tar:
        for member in tar:
            if member.isdir():
                safe_member_name(member.name.rstrip('/'))
                continue
            name=safe_member_name(member.name)
            if not member.isfile() or name not in manifest or name in verified or member.size>15*1024*1024:
                raise ValueError('Unreviewed, duplicate, or unsafe archive member')
            fp=tar.extractfile(member)
            if fp is None or sha(fp.read())!=manifest[name]:
                raise ValueError('Source tar file hash differs from manifest')
            verified.add(name)
    if verified!=set(manifest):
        raise ValueError('Source archive file set differs from manifest')
    return len(verified)

def verify_live(manifest, root):
    if not root.is_dir() or root.is_symlink():
        raise ValueError('Live target is not a trusted directory')
    live_names=set()
    for p in root.rglob('*'):
        if p.is_symlink():
            raise ValueError('Unexpected live symbolic link')
        if p.is_file():
            live_names.add(str(p.relative_to(root)))
    missing=set(manifest)-live_names
    mismatched=[]
    for relative, expected in manifest.items():
        if relative in missing:
            continue
        p=root/relative
        h=hashlib.sha256()
        with p.open('rb') as f:
            for block in iter(lambda:f.read(1024*1024),b''):
                h.update(block)
        if h.hexdigest()!=expected:
            mismatched.append(relative)
    extras=live_names-set(manifest)
    return missing,mismatched,extras

def inventory_extra(root, extras):
    counter=Counter()
    risky=0
    for rel in extras:
        p=root/rel
        counter[p.suffix.lower() or '(other)']+=1
        # Exact private name is not logged. Block public preview of recognized sensitive media.
        if any(term in rel.lower() for term in ('signature','secret','private','credential','.env')):
            risky+=1
    return dict(sorted(counter.items())),risky

def probe_public_orphan(extras):
    # HEAD only, benign already-public hashed legacy JS; only the HTTP status is recorded.
    options=sorted(f for f in extras if re.fullmatch(r'assets/[A-Za-z0-9_][A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8}\.js',f))
    if not options:
        return 'not_checked_no_safe_candidate'
    target='https://app.assps.edu.pk/'+quote(options[0],safe='/')
    r=subprocess.run(['curl','-ksS','-I','--max-time','9','-o','/dev/null','-w','%{http_code}',target],
                     capture_output=True,text=True,timeout=12,check=False)
    return r.stdout.strip() if r.returncode==0 and r.stdout.strip().isdigit() else 'probe_unavailable'

def audit(base=BASE, root=LIVE, probe=False):
    archived=base/'verified-source-build.tar.gz'
    receipt=(base/'ARCHIVE.sha256').read_text()
    digest=hashlib.sha256(archived.read_bytes()).hexdigest()
    if digest not in receipt:
        raise ValueError('Source archive external SHA receipt mismatch')
    manifest=read_manifest(base/'BUILT_ASSET_SHA256SUMS')
    verified=verify_tar(archived,manifest)
    missing,mismatched,extras=verify_live(manifest,root)
    types,suspicious=inventory_extra(root,extras)
    live_index=sha((root/'index.html').read_bytes())
    complete=verified==len(manifest) and not missing and not mismatched and live_index==TARGET_SHA
    return {
        'source_packaged_file_count':verified,
        'manifest_file_count':len(manifest),
        'active_matching_file_count':len(manifest)-len(missing)-len(mismatched),
        'active_missing_file_count':len(missing),
        'active_mismatched_file_count':len(mismatched),
        'active_live_index_matches_canonical_rebuild':live_index==TARGET_SHA,
        'active_extra_file_count':len(extras),
        'active_extra_by_extension':types,
        'active_extra_sensitive_filename_indicators':suspicious,
        'sample_extra_legacy_js_head_status':probe_public_orphan(extras) if probe else 'not_requested',
        'trusted_packaged_source_build_pass':complete,
        'immutable_artifact_go':complete and not extras,
        'release_status':'SOURCE_BUNDLE_HOLD_EXTRA_FILES' if complete else 'FAILED_ARTIFACT_INTEGRITY',
        'active_files_deleted':False,
        'live_http_content_requested':False,
    }

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--probe-public-orphan',action='store_true')
    opts=parser.parse_args()
    try:
        result=audit(probe=opts.probe_public_orphan)
        report={'schema':'ASSPS_CURRENT_FRONTEND_PACKAGE_CLOSURE_V1',
                'observed_at_utc':datetime.now(timezone.utc).isoformat(), 'evidence':result}
        print(json.dumps(report,sort_keys=True,indent=2))
        raise SystemExit(2 if result['trusted_packaged_source_build_pass'] else 3)
    except (OSError,ValueError,tarfile.TarError,subprocess.SubprocessError):
        print(json.dumps({'schema':'ASSPS_CURRENT_FRONTEND_PACKAGE_CLOSURE_V1',
                          'release_status':'FAILED_ARTIFACT_INTEGRITY','exit_code':3}))
        raise SystemExit(3)
if __name__=='__main__':
    main()
