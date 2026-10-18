'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {assess}=require('../release/verify-unified-lesson-live-preflight-20261018.cjs');
function scenario(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-lesson-preflight-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const roots=['candidateBackend','liveBackend','candidateFrontend','liveFrontend'];
 const map=Object.fromEntries(roots.map(key=>[key,path.join(dir,key)]));
 const put=(key,rel,text)=>{const p=path.join(map[key],rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text)};
 for(const f of ['src/routes/noticesRoutes.js','src/routes/dailyDiaryRoutes.js','src/routes/examRoutes.js']){
  put('candidateBackend',f,'protected-'+f);put('liveBackend',f,'protected-'+f);
 }
 put('candidateBackend','src/routes/brandingRoutes.js',"router.get('/public-branding', async()=>{})");
 put('liveBackend','src/routes/brandingRoutes.js','old-branding');
 put('candidateFrontend','index.html','candidate-html');
 put('liveFrontend','index.html','live-html');
 return {map,put};
}
test('new branding endpoint does not magically become live by green source CI',t=>{
 const x=scenario(t),r=assess(x.map);
 assert.equal(r.deployAuthorized,false);
 assert.ok(r.blockers.includes('PUBLIC_BRANDING_NOT_YET_LIVE'));
 assert.equal(r.candidateBrandingRoute,true);
});
test('uninstalled signed exam-mark migration and revision service hard-block release',t=>{
 const x=scenario(t);
 x.put('candidateBackend','src/services/examOfficialMarksRevision.js','signed-only');
 x.put('candidateBackend','migrations/034_exam_marks_revision_history.js','signed-only');
 x.put('candidateBackend','src/routes/examRoutes.js','changed-marks-route');
 const r=assess(x.map);
 assert.ok(r.blockers.some(x=>x.includes('UNDEPLOYED_SIGNED_MARKS_DEPENDENCY')));
 assert.ok(r.blockers.includes('LIVE_MARKS_ROUTE_DELTA_REQUIRES_INDEPENDENT_SECURITY_REVIEW'));
});
test('notice/diary protected drift never produces a green release',t=>{
 const x=scenario(t);
 x.put('candidateBackend','src/routes/noticesRoutes.js','unsafe-change');
 x.put('candidateBackend','src/routes/dailyDiaryRoutes.js','unsafe-change');
 const r=assess(x.map);
 assert.ok(r.blockers.includes('NOTICE_AUDIENCE_GUARD_MISMATCH'));
 assert.ok(r.blockers.includes('DIARY_PROTECTED_ROUTE_MISMATCH'));
});
test('equal hashes cannot substitute real signed School2 and physical Urdu print',t=>{
 const x=scenario(t);
 x.put('liveBackend','src/routes/brandingRoutes.js',"router.get('/public-branding', async()=>{})");
 assert.deepEqual(assess(x.map).protectedDifferences,[]);
 assert.equal(assess(x.map).deployAuthorized,false);
 assert.ok(assess(x.map).blockers.includes('PHYSICAL_URDU_PRINT_WITNESS'));
});
test('missing compiled frontend always stops promotion',t=>{
 const x=scenario(t);
 fs.rmSync(path.join(x.map.candidateFrontend,'index.html'));
 assert.ok(assess(x.map).blockers.includes('FRONTEND_BUILD_ARTIFACT_MISSING'));
});
