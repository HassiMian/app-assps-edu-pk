#!/usr/bin/env python3
"""Offline immutable SHA and import closure gate for A224 source candidate."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,json,re,sys
SOURCE=Path(__file__).resolve().parents[2]
EXPECTED=SOURCE/'docs/saas-core/A224_ATTENDANCE_MODULE_SHA_MANIFEST.json'
ROOT=SOURCE/'al-siddique-backend/src'
MODULE_REQUIRE=re.compile(r"""require\s*\(\s*['"](\.[^'"]+)['"]\s*\)""")
EXTERNAL_REQUIRE=re.compile(r"""require\s*\(\s*['"]([^.][^'"]*)['"]\s*\)""")
SAFE_EXTERNAL={'dotenv','pg','async_hooks','node:crypto','crypto','jsonwebtoken','express','twilio'}
PIN='b47941ac7867af1b96664c53fd4428a59ccd5055'
def sha(b):return hashlib.sha256(b).hexdigest()
def verify():
 manifest=json.loads(EXPECTED.read_text())
 assert manifest['canonicalMainBase']==PIN
 assert manifest['release']=='HOLD'
 assert not manifest['backendBuildAndRealDbIntegrationSignedOff']
 assert not manifest['ownerApprovedProductionDeploy']
 modules={m['file']:m for m in manifest['candidateModules']}
 assert len(modules)==manifest['candidateModuleCount']==11
 visited=set();edges=[];external=set()
 queue=['routes/attendanceRoutes.js']
 while queue:
  rel=queue.pop(0)
  if rel in visited:continue
  assert rel in modules,'untracked dependency '+rel
  visited.add(rel)
  file=(ROOT/rel).resolve()
  assert file.is_relative_to(ROOT) and file.is_file()
  content=file.read_bytes()
  assert sha(content)==modules[rel]['expectedCandidateSha256'], 'SHA drift: '+rel
  text=content.decode('utf8')
  for imp in MODULE_REQUIRE.findall(text):
   target=(file.parent/imp)
   if not target.suffix:target=target.with_suffix('.js')
   target=target.resolve()
   assert target.is_relative_to(ROOT),'require escaped allowed root'
   assert target.is_file(),'relative require missing'
   dependency=str(target.relative_to(ROOT))
   assert dependency in modules,'transitive dependency not pinned'
   queue.append(dependency);edges.append([rel,dependency])
  for external_import in EXTERNAL_REQUIRE.findall(text):
   assert external_import in SAFE_EXTERNAL,'new unapproved external import'
   external.add(external_import)
 assert visited==set(modules),'manifest contains missing or unreachable modules'
 assert len(edges)==16,(len(edges),edges)
 pkg=json.loads((ROOT/'package.json').read_text())
 package_deps=pkg.get('dependencies',{})
 builtins={'async_hooks','node:crypto','crypto'}
 assert all(n in builtins or n in package_deps for n in external)
 route=(ROOT/'routes/attendanceRoutes.js').read_text()
 assert 'resolveAuthenticatedAttendanceMarker(req.user)' in route
 assert 'Number.isInteger(Number(marked_by))' not in route.split("router.post('/mark',",1)[1].split("router.post('/mark-by-gr',",1)[0]
 assert 'teacherStudentScopeClause' in route and 'persistableRecords' in route and 'skippedInactiveIds' in route
 tenant=(ROOT/'middleware/tenant.js').read_text()
 assert "predicates.join(' AND ')" in tenant
 teacher=(ROOT/'services/teacherAssignmentService.js').read_text()
 assert "tca.teacher_user_id" in teacher and "tca.section" in teacher
 db=(ROOT/'config/database.js').read_text()
 assert 'DB_SIGNED_TENANT_DEPENDENCY_REQUIRED' in db
 return {'status':'PASS','sourceCandidate':'A224','moduleCount':len(visited),
   'relativeImportEdges':len(edges),'externalImports':sorted(external),
   'allHashesPinned':True,'backendProdDeployCertified':False,
   'productionWrites':0,'release':'HOLD'}
if __name__=='__main__':
 try:print(json.dumps(verify(),sort_keys=True))
 except Exception as err:
  print('A224_SOURCE_CLOSURE_FAIL: '+type(err).__name__+': '+str(err),file=sys.stderr)
  sys.exit(2)
