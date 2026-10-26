#!/usr/bin/env python3
"""Offline ASSPS legacy Vite asset compatibility overlay, NEVER deploys.
May stage only old public hashed JS/CSS assets into a NEW local preview tree.
Keeps active index and backups intact. No Nginx or school record writes.
"""
import argparse
import hashlib
import json
import pathlib
import re
import shutil
import sys

HASHED=re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]*-[A-Za-z0-9_-]{8,}\.(?:js|css)$')
BOOT=re.compile(r'(?:src|href)=["\'](/assets/[^"\']+)')
LIMIT_FILES=800
LIMIT_BYTES=80*1024*1024
def sha(f):
 h=hashlib.sha256()
 with f.open('rb') as src:
  for block in iter(lambda:src.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def snapshot(root):
 if not root.is_dir() or root.is_symlink() or not (root/'index.html').is_file():
  raise ValueError('MISSING_ROOT_OR_INDEX')
 files={}
 for f in (root/'assets').iterdir():
  if f.is_symlink() or (not f.is_file() and not f.is_dir()):
   raise ValueError('UNSAFE_OR_SYMLINK_ASSET')
  if f.is_file():files[f.name]=f
 return files
def assess(live,candidate,expected_live,expected_candidate):
 if sha(live/'index.html')!=expected_live or sha(candidate/'index.html')!=expected_candidate:
  raise ValueError('SIGNED_INDEX_DRIFT')
 older=snapshot(live);newer=snapshot(candidate)
 fallback={}
 conflict=[]
 unsupported=[]
 for name,f in older.items():
  if name in newer:
   if sha(f)!=sha(newer[name]):conflict.append(name)
  elif HASHED.fullmatch(name):
   fallback[name]=f
  else:unsupported.append(name)
 if conflict:raise ValueError('IMMUTABLE_ASSET_PATH_COLLISION')
 if len(fallback)>LIMIT_FILES or sum(f.stat().st_size for f in fallback.values())>LIMIT_BYTES:
  raise ValueError('FALLBACK_ASSET_VOLUME_UNBOUNDED')
 urls=set(BOOT.findall((live/'index.html').read_text(errors='replace')))
 misses=[u for u in urls if pathlib.Path(u).name not in newer and pathlib.Path(u).name not in fallback]
 if misses:raise ValueError('CACHED_INDEX_REFERENCES_UNAVAILABLE')
 return {'fallback':fallback,'unsupported':unsupported,
         'live_assets':len(older),'candidate_assets':len(newer),
         'current_index_asset_urls':len(urls)}
def execute(live,candidate,out,expected_live,expected_candidate,stage=False):
 x=assess(live,candidate,expected_live,expected_candidate)
 if out.exists() or out.is_symlink():raise ValueError('DESTINATION_ALREADY_EXISTS')
 # Caller must select fresh private preview directory; production /var/www denied.
 resolved=out.resolve()
 if not str(resolved).startswith('/root/workspace/assps-lesson-fasttrack-preview-'):
  raise ValueError('DESTINATION_MUST_BE_ISOLATED_PREVIEW')
 if stage:
  for f in candidate.rglob('*'):
   if f.is_symlink():raise ValueError('CANDIDATE_SYMLINK_BLOCKED')
  shutil.copytree(candidate,out,symlinks=False)
  for name,old in x['fallback'].items():
   target=out/'assets'/name
   if target.exists():raise ValueError('COLLIDING_OVERLAY_ASSET')
   shutil.copy2(old,target)
   if sha(old)!=sha(target):raise ValueError('FALLBACK_COPY_CHECKSUM_MISMATCH')
  if sha(candidate/'index.html')!=sha(out/'index.html'):
   raise ValueError('CANDIDATE_INDEX_MUTATED')
 return {'preview_only':True,'staged':bool(stage),'candidate_index_unchanged':True,
         'hashed_js_css_fallback_count':len(x['fallback']),
         'unsupported_legacy_asset_count':len(x['unsupported']),
         'current_index_asset_urls':x['current_index_asset_urls'],
         'cached_index_bootstrap_compatible':True,
         'production_modified':False,
         'certified_for_release':False}
def main():
 p=argparse.ArgumentParser()
 p.add_argument('--live',required=True,type=pathlib.Path)
 p.add_argument('--candidate',required=True,type=pathlib.Path)
 p.add_argument('--output',required=True,type=pathlib.Path)
 p.add_argument('--expected-live-index-sha256',required=True)
 p.add_argument('--expected-candidate-index-sha256',required=True)
 p.add_argument('--stage',action='store_true')
 a=p.parse_args()
 try:
  r=execute(a.live,a.candidate,a.output,a.expected_live_index_sha256,
            a.expected_candidate_index_sha256,a.stage)
  print(json.dumps(r,sort_keys=True));return 0
 except (OSError,ValueError,shutil.Error) as e:
  print(json.dumps({'status':'HOLD','reason':str(e)[:100],
           'production_modified':False,'certified_for_release':False}));return 3
if __name__=='__main__':sys.exit(main())
