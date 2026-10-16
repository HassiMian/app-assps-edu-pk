#!/usr/bin/env python3
"""Operator-assisted self-upload intake for independently SIGNED evidence.

NO signing, key creation, approval, teacher impersonation or release. Accepts
owner-provided bundle, verifies pinned official Core validator and the three
cryptographic claims, optionally stages it privately. Core still controls the
separate official intake and public deployment.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import sys

TRUSTED_CORE = Path('/root/workspace/assps-core-real-actor-acceptance-handoff-20261015/ops/release/signed-bluegreen/verify-connect-login-only-core-20261014.py')
PRIVATE_STAGE = Path('/root/assps-release-candidates/owner-supplied-signed-evidence')


def load_trusted_core(path=TRUSTED_CORE):
    path=Path(path)
    meta=path.lstat()
    if not stat.S_ISREG(meta.st_mode) or meta.st_uid != 0 or meta.st_mode & 0o022:
        raise ValueError('CORE_VERIFIER_NOT_TRUSTED')
    spec=importlib.util.spec_from_file_location('assps_pinned_official_core',path)
    if not spec or not spec.loader:
        raise ValueError('OFFICIAL_VERIFIER_UNAVAILABLE')
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def inspect_bundle(source, release_id, proxy_sha, build_id, core):
    if not re.fullmatch(r'[A-Za-z0-9_-]{8,140}',release_id):
        raise ValueError('INVALID_RELEASE_ID')
    if not re.fullmatch(r'[0-9a-f]{64}',proxy_sha):
        raise ValueError('INVALID_CORE_MIDDLEWARE_DIGEST')
    if not re.fullmatch(r'[A-Za-z0-9_-]{8,128}',build_id):
        raise ValueError('INVALID_BUILD_ID')
    source=Path(source)
    st=source.lstat()
    if not stat.S_ISREG(st.st_mode) or st.st_size<50 or st.st_size>65536:
        raise ValueError('UNTRUSTED_OR_OVERSIZE_BUNDLE')
    data=source.read_bytes()
    if len(data)>65536:
        raise ValueError('BUNDLE_TOO_LARGE')
    try:
        bundle=json.loads(data)
    except (ValueError,UnicodeDecodeError):
        raise ValueError('INVALID_JSON_BUNDLE') from None
    if not isinstance(bundle,dict) or not isinstance(bundle.get('receipts'),list):
        raise ValueError('MALFORMED_RECEIPTS_ARRAY')
    if len(bundle['receipts'])>12:
        raise ValueError('TOO_MANY_RECEIPTS')
    if any(not isinstance(x,dict) or set(x)!={'payload_b64','signature_b64'} for x in bundle['receipts']):
        raise ValueError('MALFORMED_RECEIPT_ENTRY')
    key=core.verified_owner_key()
    if key is None:
        raise ValueError('OFFICIAL_PUBLIC_KEY_NOT_TRUSTED')
    checks={
        'independent_offhost_recovery_signature':bool(
            core.verify_signed_recovery_receipt(bundle,key,release_id,proxy_sha,build_id,
                core.APPROVED_BACKUP_SHA256,core.APPROVED_BLUE_ARCHIVE_SHA256)),
        'independent_worker_signature':bool(
            core.verify_signed_worker_receipt(bundle,key,release_id,proxy_sha,build_id)),
        'independent_peer_school_denial_signature':bool(
            core.verify_signed_peer_tenant_receipt(bundle,key,release_id,proxy_sha,build_id)),
    }
    return data, {
        'schema':'ASSPS_OWNER_SUPPLIED_SIGNED_RECEIPTS_INTAKE_V1',
        'bundle_sha256':hashlib.sha256(data).hexdigest(),
        'cryptographic_claims':checks,
        'decision':'VALIDATED_FOR_PRIVATE_STAGING' if all(checks.values()) else 'HOLD_MISSING_OR_INVALID_SIGNED_EVIDENCE',
        'signedReceiptsInvented':False,
        'installedInOfficialCoreIntake':False,
        'productionChanged':False,
    }


def private_stage(data, digest, directory=PRIVATE_STAGE):
    if os.geteuid()!=0:
        raise ValueError('ROOT_REQUIRED_TO_STAGE')
    directory=Path(directory)
    if directory.exists():
        st=directory.lstat()
        if not stat.S_ISDIR(st.st_mode) or st.st_mode & 0o077 or st.st_uid!=0:
            raise ValueError('UNTRUSTED_STAGE_DIRECTORY')
    else:
        directory.mkdir(mode=0o700,parents=False)
    dest=directory/('owner-validated-'+digest[:24]+'.json')
    flags=os.O_CREAT | os.O_EXCL | os.O_WRONLY | getattr(os,'O_NOFOLLOW',0)
    fd=os.open(dest,flags,0o600)
    try:
        with os.fdopen(fd,'wb') as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
    except BaseException:
        try:dest.unlink()
        except OSError:pass
        raise
    return dest


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',required=True,help='Owner-uploaded JSON bundle; never a private signing key')
    parser.add_argument('--release-id',required=True)
    parser.add_argument('--approved-proxy-sha256',required=True)
    parser.add_argument('--approved-build-id',required=True)
    parser.add_argument('--stage',action='store_true',help='Root-only PRIVATE staging; never official deployment')
    args=parser.parse_args()
    try:
        core=load_trusted_core()
        data,result=inspect_bundle(args.source,args.release_id,args.approved_proxy_sha256,args.approved_build_id,core)
        if args.stage and result['decision']=='VALIDATED_FOR_PRIVATE_STAGING':
            private_stage(data,result['bundle_sha256'])
            result['privateStagingPerformed']=True
        else:
            result['privateStagingPerformed']=False
    except (OSError,ValueError,ImportError) as error:
        result={'schema':'ASSPS_OWNER_SUPPLIED_SIGNED_RECEIPTS_INTAKE_V1','decision':'HOLD',
                'failureCode':str(error)[:90],'signedReceiptsInvented':False,
                'installedInOfficialCoreIntake':False,'productionChanged':False}
    print(json.dumps(result,sort_keys=True,separators=(',',':')))
    return 0 if result['decision']=='VALIDATED_FOR_PRIVATE_STAGING' else 2


if __name__=='__main__':
    sys.exit(main())
