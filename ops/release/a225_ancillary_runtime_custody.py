#!/usr/bin/env python3
"""Read-only custody gate for executable CJS/MJS and schema/config runtime assets.

Exclude credential/env and student CSV files. This gate is advisory and NEVER authorizes deploy.
"""
from pathlib import Path
import argparse,collections,hashlib,json,os,sys
from datetime import datetime,timezone

EXTS={'.cjs','.mjs','.sql','.prisma','.json','.yaml','.yml','.sh','.ts'}
EXEC={'.cjs','.mjs'}
SCHEMA={'.sql','.prisma'}
IGNORED={'node_modules','.git','.cache','__pycache__','coverage','dist','.next'}
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for x in iter(lambda:f.read(256*1024),b''):h.update(x)
 return h.hexdigest()
def scan(root):
 root=root.resolve(strict=True)
 found={}
 for p in root.rglob('*'):
  if any(name in IGNORED for name in p.relative_to(root).parts):continue
  if p.is_symlink():raise ValueError('SYMLINKED_CUSTODY_ASSET')
  if not p.is_file() or p.suffix not in EXTS:continue
  if p.stat().st_size > 32*1024*1024:raise ValueError('OVERSIZED_UNEXPECTED_CUSTODY_ASSET')
  rel=p.relative_to(root).as_posix()
  found[rel]={'sha256':sha(p),'bytes':p.stat().st_size,'extension':p.suffix}
 return dict(sorted(found.items()))
def evaluate(live_root,candidate_root):
 live=scan(live_root);can=scan(candidate_root)
 missing=sorted(set(live)-set(can))
 different=sorted(k for k in set(live)&set(can) if live[k]['sha256']!=can[k]['sha256'])
 exact=sorted(k for k in set(live)&set(can) if live[k]['sha256']==can[k]['sha256'])
 suffix=lambda items:dict(sorted(collections.Counter(Path(s).suffix for s in items).items()))
 summary={
 'checkedUtc':datetime.now(timezone.utc).isoformat(),
 'gate':'A225_NON_JS_BACKEND_RUNTIME_CONFIG_SCHEMA_CUSTODY',
 'sourceExtensions':sorted(EXTS),
 'liveAssetCount':len(live),'candidateAssetCount':len(can),
 'liveCountsByExt':suffix(live),
 'candidateCountsByExt':suffix(can),
 'missingAssets':len(missing),'differentAssets':len(different),
 'exactAssets':len(exact),
 'missingByExt':suffix(missing),'differentByExt':suffix(different),
 'missingExecutableCjsMjs':sum(Path(p).suffix in EXEC for p in missing),
 'missingSchemaSqlPrisma':sum(Path(p).suffix in SCHEMA for p in missing),
 'missingPaths':missing,'differentPaths':different,
 'candidateOnlyPaths':sorted(set(can)-set(live)),
 'liveAssetManifest':live,
 'credentialEnvCsvContentsScanned':False,
 'allProductionDataMigrated':False,
 'actualDependencyGraphExecuted':False,
 'fullBackendReadyForRelease':False,
 'productionWrites':0,'release':'HOLD',
 }
 return summary
def main():
 a=argparse.ArgumentParser()
 a.add_argument('--live-root',required=True,type=Path)
 a.add_argument('--candidate-root',required=True,type=Path)
 a.add_argument('--out',required=True,type=Path)
 opt=a.parse_args()
 out=opt.out.resolve(strict=False)
 if out.is_relative_to(opt.live_root.resolve()) or out.is_relative_to(opt.candidate_root.resolve()):
  raise ValueError('WRITE_TO_SOURCE_DENIED')
 result=evaluate(opt.live_root,opt.candidate_root)
 out.parent.mkdir(parents=True,exist_ok=True)
 t=out.with_name(out.name+'.tmp')
 t.write_text(json.dumps(result,indent=2)+'\n');os.chmod(t,0o600);os.replace(t,out)
 print(json.dumps({key:result[key] for key in ('liveAssetCount','candidateAssetCount',
  'missingAssets','differentAssets','missingExecutableCjsMjs','missingSchemaSqlPrisma','release')}))
 return 3
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as ex:
  print(f'A225 ancillary custody gate failed closed: {type(ex).__name__}: {ex}',file=sys.stderr);sys.exit(2)
