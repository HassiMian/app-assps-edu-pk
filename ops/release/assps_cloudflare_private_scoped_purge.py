#!/usr/bin/env python3
"""Cloudflare private-media exact-URL purge; fail-closed, no public URL output.
Requires actual zone-scoped Cache Purge token; dry-run by default.
Never purges by prefix, hostname, tags or purge_everything.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.parse import urlsplit, unquote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

DEFAULT_MANIFEST=Path('/root/workspace/assps-lesson-certification-20261026/CLOUDFLARE_SCOPED_PRIVATE_PURGE.RESTRICTED.json')
DEFAULT_INVENTORY=Path('/var/uploads/branding')
DEFAULT_RECEIPT=Path('/root/workspace/assps-lesson-certification-20261026/CLOUDFLARE_AUTH_PURGE_RECEIPT.RESTRICTED.json')
PERMITTED_PREFIXES=('assps_receipt_','birthday_','clean_student')
EXTS=('.png','.jpg','.jpeg','.webp')
API='https://api.cloudflare.com/client/v4/zones/{}/purge_cache'

def validated_manifest(raw, inventory):
    if not isinstance(raw,dict) or set(raw)!= {'files'} or not isinstance(raw['files'],list):
        raise ValueError('INVALID_PURGE_BODY')
    paths=raw['files']
    if not 1 <= len(paths) <= 30 or len(paths)!=len(set(paths)):
        raise ValueError('INVENTORY_COUNT_OR_DUPLICATES')
    fs=sorted(p.name for p in inventory.iterdir()
      if p.name.lower().startswith(PERMITTED_PREFIXES) and p.suffix.lower() in EXTS)
    if len(fs)!=29 or any(not (inventory/n).is_file() or (inventory/n).is_symlink() for n in fs):
        raise ValueError('PRIVATE_INVENTORY_DRIFT')
    requested=[]
    for value in paths:
        if not isinstance(value,str):raise ValueError('NON_URL_ENTRY')
        u=urlsplit(value)
        if (u.scheme!='https' or u.netloc!='app.assps.edu.pk' or u.query or u.fragment
           or not u.path.startswith('/uploads/branding/')):
            raise ValueError('NONEXACT_URL')
        n=unquote(u.path.removeprefix('/uploads/branding/'))
        if '/' in n or '\\' in n or n not in fs:raise ValueError('UNTRUSTED_FILE')
        requested.append(n)
    if sorted(requested)!=fs:raise ValueError('INVENTORY_MISMATCH')
    return paths

def save_receipt(path, rec):
    fd,temp=tempfile.mkstemp(prefix='.cloudflare_purge_',dir=path.parent)
    try:
        with os.fdopen(fd,'w') as f:
            os.fchmod(f.fileno(),0o600)
            json.dump(rec,f,sort_keys=True,indent=2)
            f.write('\n');f.flush();os.fsync(f.fileno())
        os.replace(temp,path)
    finally:
        if os.path.exists(temp):os.unlink(temp)

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--manifest',type=Path,default=DEFAULT_MANIFEST)
    p.add_argument('--inventory',type=Path,default=DEFAULT_INVENTORY)
    p.add_argument('--receipt',type=Path,default=DEFAULT_RECEIPT)
    p.add_argument('--execute',action='store_true')
    p.add_argument('--expect-manifest-sha256')
    p.add_argument('--authorize-scoped-purge',action='store_true')
    args=p.parse_args()
    try:
        if args.manifest.is_symlink() or args.inventory.is_symlink() or not args.inventory.is_dir():
            raise ValueError('UNTRUSTED_MANIFEST_PATH')
        original=args.manifest.read_bytes()
        sha=hashlib.sha256(original).hexdigest()
        urls=validated_manifest(json.loads(original),args.inventory)
        status={'selected_private_count':len(urls),'manifest_sha256':sha,'executed':False,
                'private_urls_disclosed':False,'status':'DRY_RUN_OK'}
        if not args.execute:
            print(json.dumps(status));return 0
        if not args.authorize_scoped_purge or args.expect_manifest_sha256!=sha:
            raise ValueError('EXPLICIT_SHA_AND_SCOPED_AUTHORIZATION_REQUIRED')
        token=os.environ.get('CF_API_TOKEN','')
        zone=os.environ.get('CF_ZONE_ID','')
        if not token or not re.fullmatch(r'[0-9a-fA-F]{32}',zone):
            raise ValueError('CLOUDFLARE_ZONE_SCOPED_TOKEN_UNAVAILABLE')
        req=Request(API.format(zone),data=json.dumps({'files':urls}).encode(),
          headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','Accept':'application/json'},
          method='POST')
        with urlopen(req,timeout=20) as response:
            data=json.loads(response.read(10240))
            if response.status!=200 or data.get('success') is not True:
                raise ValueError('CLOUDFLARE_DID_NOT_ACCEPT_PURGE')
        receipt={'accepted_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
                 'manifest_sha256':sha,'private_file_count':len(urls),
                 'cloudflare_success_acknowledged':True,
                 'anonymous_cdn_denial_verified':False,
                 'production_app_or_db_modified':False,
                 'status':'PURGE_ACCEPTED_PRIVACY_RECHECK_REQUIRED'}
        save_receipt(args.receipt,receipt)
        print(json.dumps({k:v for k,v in receipt.items() if k!='accepted_utc'}));return 0
    except (OSError,ValueError,TypeError,RuntimeError,HTTPError,URLError) as error:
        print(json.dumps({'status':'HOLD','reason':str(error)[:90],'executed':False,
                          'private_urls_disclosed':False}));return 3

if __name__=='__main__':sys.exit(main())
