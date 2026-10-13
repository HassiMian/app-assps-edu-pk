#!/usr/bin/env python3
"""Exact-artifact additive P0 fix for an active Employees SPA chunk; no broad redeploy.

Precheck and backup all affected bytes. Never touch authentication, RLS, database,
Nginx routing or unrelated bundled assets. Only root operator may apply/rollback.
"""
import argparse, hashlib, json, os, re, subprocess, sys, tempfile
from pathlib import Path
ROOT=Path('/var/www/assps-resultcards-class-isolation-8b5d370e')
ASSET=ROOT/'assets/EmployeesModule-ru6u2UO4.js'
STYLES=ROOT/'assets/moduleStyles-W-dCuXHa.js'
INDEX=ROOT/'assets/index-DNRtetyK.js'
HTML=ROOT/'index.html'
METADATA=ROOT/'release-meta.json'
SOURCE_BASE='8b5d370e0a91e86f5c7c136bbf49521ab1e15147'
ASSET_BEFORE_SHA='597b9cae6066eb8b89ea24a4ce98dd1926538e433fbf0aefb2ccebde5155e107'
STYLE_SHA='11cc4e970c1f847d3d0fe731d15609a374543c04ac20bb7d091feb781ecaf0a3'
INDEX_SHA='5e3f16834888a1be554626bbfad085bbb31e091a93f69fc3d41ce30e7fc4085d'
HTML_SHA='8fc3dcbb5bc973562b3d886bf4f65ba3ca4fd9917e52b44b4addb0ef0b949e38'
BACKUP=Path('/var/backups/assps-employees-access-20261013')
FRONT=Path(__file__).resolve().parents[3]
PREFIX='import{n as btnPrimary,r as btnSecondary}from"./moduleStyles-W-dCuXHa.js";'
OLD_INIT='var S=e(n(),1),C=t()'
NEW_INIT='var S=e(n(),1),useCallback=S.useCallback,C=t()'
def sha(b):return hashlib.sha256(b).hexdigest()
def check(cond,reason):
 if not cond:raise RuntimeError(reason)
def run(*args):return subprocess.run(args,text=True,capture_output=True,timeout=20)
def fixed(old):
 s=old.decode('utf8')
 check(s.count(OLD_INIT)==1,'unexpected React import/initializer')
 check(s.count('useCallback(')==2 and s.count('btnPrimary')==2 and s.count('btnSecondary')==8,'unexpected pre-fix crash signatures')
 return (PREFIX+s.replace(OLD_INIT,NEW_INIT,1)).encode()
def preflight():
 check(ASSET.exists() and STYLES.exists() and INDEX.exists() and HTML.exists(),'missing live artifacts')
 check(sha(STYLES.read_bytes())==STYLE_SHA,'shared style module changed')
 check(sha(INDEX.read_bytes())==INDEX_SHA,'application chunk index changed')
 check(sha(HTML.read_bytes())==HTML_SHA,'application html changed')
 style=STYLES.read_text()
 check('n={minHeight:40' in style and 'r={minHeight:40' in style and 'n,o,r,s,e as t' in style,'button exports differ')
 check(INDEX.read_text().count(ASSET.name)==2,'employees lazy chunk reference changed')
 check('assets/index-DNRtetyK.js' in HTML.read_text(),'unexpected served index')
 nginx=run('nginx','-T')
 check(nginx.returncode==0 and 'root /var/www/assps-resultcards-class-isolation-8b5d370e;' in nginx.stdout,'active Nginx release does not match expected')
 meta=json.loads(METADATA.read_text())
 check(meta['frontend_commit'] in (SOURCE_BASE,os.environ.get('ASSPS_HOTFIX_SHA')),'release metadata drift')
 current=ASSET.read_bytes()
 before=sha(current)==ASSET_BEFORE_SHA
 after=sha(current)==sha(fixed_bytes_from_known_original()) if not before else False
 check(before or after,'Employees chunk changed; fail closed')
 return before,meta,current
def fixed_bytes_from_known_original():
 check((BACKUP/'EmployeesModule.before.js').exists(),'original backup missing')
 orig=(BACKUP/'EmployeesModule.before.js').read_bytes()
 check(sha(orig)==ASSET_BEFORE_SHA,'stored original checksum mismatch')
 return fixed(orig)
def atomic_write(dest,payload):
 fd,tmp=tempfile.mkstemp(prefix='.assps-employee-hotfix-',dir=dest.parent)
 try:
  os.fchmod(fd,0o644)
  with os.fdopen(fd,'wb') as f: f.write(payload);f.flush();os.fsync(f.fileno())
  os.replace(tmp,dest)
 except Exception:
  try:os.unlink(tmp)
  except OSError:pass
  raise
def do_verify():
 check(sha(ASSET.read_bytes())==ASSET_BEFORE_SHA,'live original differs')
 check(sha(STYLES.read_bytes())==STYLE_SHA,'styles changed')
 check(sha(INDEX.read_bytes())==INDEX_SHA,'import map changed')
 check(sha(HTML.read_bytes())==HTML_SHA,'index changed')
 expected=fixed(ASSET.read_bytes())
 fd,tmp=tempfile.mkstemp(suffix='.mjs')
 try:
  with os.fdopen(fd,'wb') as out:out.write(expected)
  c=run('node','--check',tmp)
  check(c.returncode==0,'patched chunk failed module syntax validation')
 finally:os.unlink(tmp)
 return expected
def apply(commit):
 check(os.geteuid()==0,'root operator required')
 check(re.fullmatch('[0-9a-f]{40}',commit) is not None,'exact audited git SHA required')
 g=run('git','-C',str(FRONT),'rev-parse','HEAD')
 check(g.returncode==0 and g.stdout.strip()==commit,'source hotfix git SHA differs')
 ancestry=run('git','-C',str(FRONT),'merge-base','--is-ancestor',SOURCE_BASE,commit)
 check(ancestry.returncode==0,'hotfix is not based on deployed source')
 changed=run('git','-C',str(FRONT),'diff','--name-only',SOURCE_BASE,commit,'--','al-siddique-frontend/src')
 check(changed.stdout.strip()=='al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx','hotfix changes unrelated application code')
 check(not (BACKUP/'EmployeesModule.before.js').exists(),'hotfix backup already exists; no reapply')
 expected=do_verify()
 BACKUP.mkdir(parents=True,mode=0o700,exist_ok=True)
 os.chmod(BACKUP,0o700)
 for source,dest in [(ASSET,'EmployeesModule.before.js'),(METADATA,'release-meta.before.json'),(INDEX,'index.before.js'),(HTML,'index.before.html')]:
  p=BACKUP/dest
  with p.open('xb') as f:f.write(source.read_bytes())
  os.chmod(p,0o600)
 newmeta=json.loads(METADATA.read_text());check(newmeta['frontend_commit']==SOURCE_BASE,'source metadata changed')
 newmeta.update({'frontend_commit':commit,'previous_frontend_commit':SOURCE_BASE,
   'scope':'Employees Credentials / Login Access undefined import P0 repair (frontend asset only)',
   'employees_access_hotfix':True,'release_certified':False})
 new_meta=(json.dumps(newmeta,indent=2)+'\n').encode()
 # Prepare both bytes before changing production; never modify other chunks.
 atomic_write(ASSET,expected)
 atomic_write(METADATA,new_meta)
 check(sha(ASSET.read_bytes())==sha(expected),'deployed employee chunk checksum failed')
 (BACKUP/'post-apply.json').write_text(json.dumps({'original_sha256':ASSET_BEFORE_SHA,'fixed_sha256':sha(expected),'source_sha':commit,
    'metadata_sha256':sha(new_meta),'index_untouched_sha256':INDEX_SHA},indent=2)+'\n')
 os.chmod(BACKUP/'post-apply.json',0o600)
 print(json.dumps({'status':'PASS_DEPLOYED_EMPLOYEE_ASSET_ONLY','hotfix_commit':commit,'artifact_sha256':sha(expected),
 'index_untouched':True,'backend_unchanged':True,'db_unchanged':True,'rollback_backup':str(BACKUP)}))
def rollback():
 check(os.geteuid()==0,'root operator required')
 receipt=json.loads((BACKUP/'post-apply.json').read_text())
 check(sha(ASSET.read_bytes())==receipt['fixed_sha256'],'asset changed since deployment')
 check(sha(INDEX.read_bytes())==INDEX_SHA,'index changed since deployment')
 old=(BACKUP/'EmployeesModule.before.js').read_bytes()
 check(sha(old)==ASSET_BEFORE_SHA,'original backup invalid')
 oldmeta=(BACKUP/'release-meta.before.json').read_bytes()
 atomic_write(ASSET,old)
 atomic_write(METADATA,oldmeta)
 print(json.dumps({'status':'ROLLBACK_DONE','asset_sha256':sha(ASSET.read_bytes())}))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('action',choices=['verify','apply','rollback']);a.add_argument('--commit');args=a.parse_args()
 try:
  if args.action=='verify':
   v=do_verify();print(json.dumps({'status':'VERIFIED_PATCH_READY','new_sha256':sha(v),'live_unchanged':True}))
  elif args.action=='apply':apply(args.commit or '')
  else:rollback()
 except Exception as e:
  print(json.dumps({'status':'HOLD','issue':str(e)[:160]}));sys.exit(2)
