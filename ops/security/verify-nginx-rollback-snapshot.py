#!/usr/bin/env python3
"""Read-only live Nginx source and staged rollout provenance/restore rehearsal."""
import argparse,hashlib,json,os,shutil,sys,tempfile
from pathlib import Path

def digest(b): return hashlib.sha256(b).hexdigest()
def fail(msg): raise RuntimeError(msg)
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--enabled',type=Path,required=True)
 ap.add_argument('--global-conf',type=Path,required=True)
 ap.add_argument('--candidate',type=Path,required=True)
 ap.add_argument('--snapshot',type=Path,required=True)
 a=ap.parse_args()
 if a.snapshot.exists(): fail('snapshot path exists: refusing overwrite')
 sources=sorted(a.enabled.iterdir())
 if len(sources)!=7 or not (a.candidate/'nginx.conf').is_file(): fail('expected seven sites and staged global conf')
 a.snapshot.mkdir(mode=0o700)
 (a.snapshot/'enabled').mkdir(mode=0o700)
 (a.snapshot/'resolved').mkdir(mode=0o700)
 manifest={'global_sha256':digest(a.global_conf.read_bytes()),'sites':{}}
 shutil.copy2(a.global_conf,a.snapshot/'nginx.conf')
 for site in sources:
  if not site.is_file(): fail('non-file enabled site')
  resolved=site.resolve(strict=True)
  data=resolved.read_bytes()
  link=os.readlink(site) if site.is_symlink() else None
  manifest['sites'][site.name]={'link':link,'resolved':str(resolved),'sha256':digest(data)}
  (a.snapshot/'resolved'/site.name).write_bytes(data)
  if link is not None: (a.snapshot/'enabled'/site.name).symlink_to(link)
  else: (a.snapshot/'enabled'/site.name).write_bytes(site.read_bytes())
  if not (a.candidate/'sites'/site.name).is_file(): fail('candidate site missing: '+site.name)
 (a.snapshot/'manifest.json').write_text(json.dumps(manifest,indent=2,sort_keys=True)+'\n')
 # Prove scratch recovery bytes against the live original files without touching live paths.
 with tempfile.TemporaryDirectory(prefix='assps-nginx-rollback-') as temp:
  scratch=Path(temp)
  shutil.copy2(a.snapshot/'nginx.conf',scratch/'nginx.conf')
  assert digest((scratch/'nginx.conf').read_bytes())==manifest['global_sha256']
  for name,record in manifest['sites'].items():
   shutil.copy2(a.snapshot/'resolved'/name,scratch/name)
   if digest((scratch/name).read_bytes())!=record['sha256']: fail('restore checksum mismatch')
   if digest(Path(record['resolved']).read_bytes())!=record['sha256']: fail('live drift detected')
   current=a.enabled/name
   if (os.readlink(current) if current.is_symlink() else None)!=record['link']: fail('symlink drift detected')
  print('NGINX_ROLLBACK_RESTORE_REHEARSAL_PASS files=8 sites=7 symlink_and_bytes=verified')
 print('NGINX_ROLLBACK_SNAPSHOT_PASS manifest_sha256='+digest((a.snapshot/'manifest.json').read_bytes()))
if __name__=='__main__':
 try: main()
 except Exception as e: print('NGINX_ROLLBACK_GATE_FAIL '+str(e),file=sys.stderr);sys.exit(2)
