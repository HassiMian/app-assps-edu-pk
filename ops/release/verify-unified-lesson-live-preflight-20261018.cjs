'use strict'
// Read-only release evidence gate. No service, git, DB, or filesystem mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const DEFAULT_APP_NGINX='/etc/nginx/sites-enabled/apex-app-ssl';
function configuredAppRoot(configFile){
 const config=fs.readFileSync(configFile,'utf8').replace(/^\s*#.*$/gm,'');
 if(!/\bserver_name\s+app\.assps\.edu\.pk\s*;/.test(config))
   throw new Error('APP_SERVER_NAME_NOT_FOUND');
 const roots=[...config.matchAll(/^\s*root\s+([^;\s]+)\s*;/gm)].map(match=>match[1]);
 if(roots.length!==1||roots[0].includes('$'))throw new Error('APP_ROOT_NOT_UNAMBIGUOUS');
 return fs.realpathSync(roots[0]);
}
function assess({candidateBackend,liveBackend,candidateFrontend,liveFrontend,nginxConfigFile}){
 const missing=[],changes=[],matches=[],blockers=[];
 const guarded=['src/routes/noticesRoutes.js','src/routes/dailyDiaryRoutes.js','src/routes/examRoutes.js'];
 for(const f of guarded){
  const a=path.join(candidateBackend,f),b=path.join(liveBackend,f);
  if(!fs.existsSync(a)||!fs.existsSync(b)){missing.push(f);blockers.push('MISSING_PROTECTED_FILE:'+f);continue;}
  const same=hash(a)===hash(b);
  (same?matches:changes).push(f);
 }
 // These are genuine signed-school ledger/authorization integrations, not
 // eligible for an unreviewed teaching-template or logo hotfix deployment.
 for(const f of ['src/services/examOfficialMarksRevision.js',
                 'migrations/034_exam_marks_revision_history.js']){
  const a=path.join(candidateBackend,f),b=path.join(liveBackend,f);
  if(fs.existsSync(a)&&!fs.existsSync(b))blockers.push('UNDEPLOYED_SIGNED_MARKS_DEPENDENCY:'+f);
 }
 if(changes.includes('src/routes/examRoutes.js'))
   blockers.push('LIVE_MARKS_ROUTE_DELTA_REQUIRES_INDEPENDENT_SECURITY_REVIEW');
 if(changes.includes('src/routes/noticesRoutes.js'))
   blockers.push('NOTICE_AUDIENCE_GUARD_MISMATCH');
 if(changes.includes('src/routes/dailyDiaryRoutes.js'))
   blockers.push('DIARY_PROTECTED_ROUTE_MISMATCH');
 const newBrand=path.join(candidateBackend,'src/routes/brandingRoutes.js');
 const oldBrand=path.join(liveBackend,'src/routes/brandingRoutes.js');
 const candidatePublic=fs.existsSync(newBrand)&&fs.readFileSync(newBrand,'utf8').includes("router.get('/public-branding'");
 const livePublic=fs.existsSync(oldBrand)&&fs.readFileSync(oldBrand,'utf8').includes("router.get('/public-branding'");
 if(!candidatePublic)blockers.push('CANDIDATE_BRANDING_API_MISSING');
 if(!livePublic)blockers.push('PUBLIC_BRANDING_NOT_YET_LIVE');
 // A stale /var/www/apex-os may NOT represent Nginx's currently configured
 // app.assps.edu.pk release. Fail closed if a caller supplies that old root.
 const configFile=nginxConfigFile || (fs.existsSync(DEFAULT_APP_NGINX)?DEFAULT_APP_NGINX:null);
 let nginxConfiguredRoot=null;
 if(configFile){
  try{
   nginxConfiguredRoot=configuredAppRoot(configFile);
   if(fs.realpathSync(liveFrontend)!==nginxConfiguredRoot)
     blockers.push('LIVE_FRONTEND_ROOT_NOT_CONFIGURED_APP_ROOT');
  }catch(error){
   blockers.push('ACTIVE_APP_NGINX_ROOT_NOT_VERIFIABLE');
  }
 }
 const liveIndex=path.join(liveFrontend,'index.html');
 const candidateIndex=path.join(candidateFrontend,'index.html');
 if(!fs.existsSync(liveIndex)||!fs.existsSync(candidateIndex))blockers.push('FRONTEND_BUILD_ARTIFACT_MISSING');
 // External signed acceptance may NEVER be inferred from mocked browser tests,
 // source CI, Nginx HTTP 200, or this read-only checker.
 const outstanding=['SIGNED_REAL_USER_SCHOOL2_AND_ROSTER_ACCEPTANCE',
                   'PHYSICAL_URDU_PRINT_WITNESS',
                   'OFF_HOST_RESTORE_AND_INDEPENDENT_RELEASE_PROVENANCE'];
 return {status:'HOLD_NOT_LIVE_CERTIFIED',deployAuthorized:false,
  protectedMatches:matches,protectedDifferences:changes,missingProtected:missing,
  candidateBrandingRoute: candidatePublic, liveBrandingRoute:livePublic,
  nginxConfiguredRoot,
  compiledIndexHash:fs.existsSync(candidateIndex)?hash(candidateIndex):null,
  liveIndexHash:fs.existsSync(liveIndex)?hash(liveIndex):null,
  blockers:[...new Set([...blockers,...outstanding])]};
}
if(require.main===module){
 const [candidateBackend,liveBackend,candidateFrontend,liveFrontend]=process.argv.slice(2);
 if([candidateBackend,liveBackend,candidateFrontend,liveFrontend].some(x=>!x)){
  console.error('USAGE: node verify-unified-lesson-live-preflight-20261018.cjs candidateBackend liveBackend candidateFrontendDist liveFrontendRoot');
  process.exitCode=64;
 }else{
  const r=assess({candidateBackend,liveBackend,candidateFrontend,liveFrontend});
  console.log(JSON.stringify(r,null,2));
  if(!r.deployAuthorized)process.exitCode=2;
 }
}
module.exports={assess};
