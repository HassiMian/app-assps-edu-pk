#!/usr/bin/env python3
"""Content-addressed Employees lazy chunk cache-bypass using browser import map.

No JS entry rewrites, Nginx restart, Paper/Marks deployments or DB operations.
"""
import argparse,hashlib,json,os,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path('/var/www/assps-resultcards-class-isolation-8b5d370e')
ASSETS=ROOT/'assets'
OLD=ASSETS/'EmployeesModule-ru6u2UO4.js'
NEW=ASSETS/'EmployeesModule-c649e289.js'
HTML=ROOT/'index.html'
META=ROOT/'release-meta.json'
BACKUP=Path('/var/backups/assps-employees-access-20261013')
BASE_HTML_SHA='8fc3dcbb5bc973562b3d886bf4f65ba3ca4fd9917e52b44b4addb0ef0b949e38'
PATCH_SHA='c649e289bfb95415e9b6163ded97a0abe8e977c96a66b7d82095f97144e49355'
STAGE_COMMIT='f0307d092d263d9e10670e881e2fc10cc2a62f69'
ENTRY='<script type="module" crossorigin src="/assets/index-DNRtetyK.js"></script>'
MAP='<script type="importmap">{"imports":{"/assets/EmployeesModule-ru6u2UO4.js":"/assets/EmployeesModule-c649e289.js"}}</script>'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def require(ok,why):
 if not ok:raise RuntimeError(why)
def atomic(path,raw):
 fd,tmp=tempfile.mkstemp(prefix='.assps-employees-importmap-',dir=path.parent)
 try:
  os.fchmod(fd,0o644)
  with os.fdopen(fd,'wb') as f:f.write(raw);f.flush();os.fsync(f.fileno())
  os.replace(tmp,path)
 except Exception:
  try:os.unlink(tmp)
  except OSError:pass
  raise

def preflight():
 require(os.geteuid()==0,'requires root operator')
 require(sha(OLD.read_bytes())==PATCH_SHA,'patched origin Employees chunk drift')
 require(not NEW.exists(),'versioned Employees chunk already present')
 require(sha(HTML.read_bytes())==BASE_HTML_SHA,'active shell changed from reviewed baseline')
 require(sha((BACKUP/'index.before.html').read_bytes())==BASE_HTML_SHA,'original shell backup invalid')
 require(HTML.read_text().count(ENTRY)==1,'entry markup changed')
 require(HTML.read_text().count('type="importmap"')==0,'another importmap already active')
 require(json.loads(META.read_text())['frontend_commit']==STAGE_COMMIT,'frontend release metadata moved')
 root=subprocess.run(['nginx','-T'],capture_output=True,text=True,timeout=12)
 require(root.returncode==0 and 'root /var/www/assps-resultcards-class-isolation-8b5d370e;' in root.stdout,'active Nginx docroot changed')
 return HTML.read_text().replace(ENTRY,'    '+MAP+'\n    '+ENTRY,1).encode()
def apply(commit):
 require(len(commit)==40 and all(x in '0123456789abcdef' for x in commit),'invalid source SHA')
 repo=Path(__file__).resolve().parents[3]
 actual=subprocess.run(['git','-C',str(repo),'rev-parse','HEAD'],capture_output=True,text=True,timeout=5)
 require(actual.returncode==0 and actual.stdout.strip()==commit,'git source mismatch')
 planned=preflight()
 require(sha(planned)!=BASE_HTML_SHA,'cache bust produced no change')
 atomic(NEW,OLD.read_bytes())
 require(sha(NEW.read_bytes())==PATCH_SHA,'versioned asset bytes differ')
 atomic(HTML,planned)
 require(MAP in HTML.read_text(),'import map not present')
 metadata=json.loads(META.read_text())
 metadata['frontend_commit']=commit
 metadata['previous_frontend_commit']=STAGE_COMMIT
 metadata['employees_access_versioned_asset']=NEW.name
 atomic(META,(json.dumps(metadata,indent=2)+'\n').encode())
 receipt={'status':'PASS_VERSIONED_EMPLOYEES_IMPORTMAP_PUBLISHED',
   'frontend_commit':commit,'old_origin_chunk_preserved':True,'new_asset_sha256':PATCH_SHA,
   'index_js_unchanged':True,'app_backends_unchanged':True,'paper_unchanged':True,
   'original_html_sha256':BASE_HTML_SHA,'importmap_html_sha256':sha(planned)}
 file=BACKUP/'importmap-receipt.json';fd=os.open(file,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as out:json.dump(receipt,out,indent=2)
 print(json.dumps(receipt))
def rollback():
 require(os.geteuid()==0,'requires root operator')
 r=json.loads((BACKUP/'importmap-receipt.json').read_text())
 require(sha(HTML.read_bytes())==r['importmap_html_sha256'],'shell changed; refuse rollback')
 require(sha(NEW.read_bytes())==PATCH_SHA,'versioned bundle changed; refuse rollback')
 orig=(BACKUP/'index.before.html').read_bytes()
 require(sha(orig)==BASE_HTML_SHA,'rollback HTML corrupt')
 atomic(HTML,orig)
 # Newly published asset is harmless, intentionally retained to avoid breaking already-open pages.
 print(json.dumps({'status':'PASS_IMPORTMAP_REVERTED','original_html_restored':True,'new_asset_retained_for_open_tabs':True}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('action',choices=['verify','apply','rollback']);p.add_argument('--commit',default='');a=p.parse_args()
 try:
  if a.action=='verify':
   html=preflight();print(json.dumps({'status':'PASS_CACHE_BUST_PREFLIGHT','patched_html_sha256':sha(html),'live_unchanged':True}))
  elif a.action=='apply':apply(a.commit)
  else:rollback()
 except Exception as e:
  print(json.dumps({'status':'HOLD','issue':str(e)[:160]}));sys.exit(2)
