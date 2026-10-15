'use strict';
// Independent, safe production SQL *read-only* acceptance of the reviewed
// restricted AI-queue worker adapter staged from the current running backend.
// This NEVER deploys, starts the backend, writes database rows, reads credentials
// from disk, signs receipts, or authenticates a school staff member.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const STAGE='/root/assps-release-candidates/apex-backend-core-laptop-consolidated-20261015';
const LIVE='/var/www/apex-backend';
const WORKER=[
  'services/ai/aiQueueWorkerDatabase.js',
  'services/ai/paperAiQueue.js',
  'routes/opsRoutes.js'
];
const PRESERVE=['routes/lessonPlanRoutes.js','server.js'];
const PINNED_ADAPTER_SHA='9b76d09747a03dbfb85083acaf0d7facf129b31b3ae53fcaeb8b78acbc17a21f';
function digest(f){return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}
function preflight(env, exists=(p)=>fs.existsSync(p), hash=digest){
 const e=[];
 if(env.ASSPS_SCOPED_WORKER_READONLY_ACCEPTANCE!=='yes')e.push('explicit_opt_in_missing');
 if(env.DB_SIGNED_TENANT_RLS_ENABLED!=='true')e.push('signed_green_off');
 const p=(env.DB_AI_WORKER_HOST||'')+':'+(env.DB_AI_WORKER_PORT||'');
 if(p!=='127.0.0.1:5432')e.push('local_worker_target_required');
 if(env.DB_AI_WORKER_NAME!=='apexos'||
    env.DB_AI_WORKER_USER!=='assps_ai_worker_login'||
    env.DB_AI_WORKER_ROLE!=='assps_core_ai_worker'||
    typeof env.DB_AI_WORKER_PASSWORD!=='string'||
    env.DB_AI_WORKER_PASSWORD.length<45 ||
    env.DB_AI_WORKER_USER===env.DB_USER)e.push('restricted_worker_identity_required');
 try{
  const adapter=path.join(STAGE,'src',WORKER[0]);
  if(!exists(adapter)||hash(adapter)!==PINNED_ADAPTER_SHA)e.push('adapter_hash_mismatch');
  for(const f of WORKER.slice(1)){
   const staged=path.join(STAGE,'src',f);
   const reviewed=path.resolve(__dirname,'../../../al-siddique-backend/src',f);
   if(!exists(staged)||!exists(reviewed)||hash(staged)!==hash(reviewed)){
    e.push('reviewed_worker_source_drift_'+f.replaceAll('/','_'));
   }
  }
  for(const f of PRESERVE){
   const staged=path.join(STAGE,'src',f),active=path.join(LIVE,'src',f);
   if(!exists(staged)||!exists(active)||hash(staged)!==hash(active)){
    e.push('concurrent_live_source_drift_'+f.replaceAll('/','_'));
   }
  }
 }catch{e.push('artifact_read_failed')}
 return e;
}
async function main(){
 const errors=preflight(process.env);
 if(errors.length) {
  console.error(JSON.stringify({gate:'CURRENT_REVIEWED_AI_WORKER_REAL_NODE_READONLY',status:'HOLD',blocked:errors}));
  process.exitCode=2;return;
 }
 const db=require(path.join(STAGE,'src',WORKER[0]));
 const deadline=setTimeout(()=>{console.error('WORKER_TEST_TIMEOUT');process.exit(2)},18000);
 try {
  const allowed=await db.query('SELECT count(*)::int AS tally FROM public.ai_jobs');
  if(!Number.isInteger(allowed.rows?.[0]?.tally)){
   throw Error('restricted_queue_read_incomplete');
  }
  for(const table of ['organizations','campuses','admin_block_audit_log']){
   try{
    await db.query('SELECT count(*) FROM public.'+table);
    throw Error('FORBIDDEN_GLOBAL_ACCESS_'+table);
   }catch(e){
    if(e.code!=='42501')throw e;
   }
  }
  console.log(JSON.stringify({
    gate:'CURRENT_REVIEWED_AI_WORKER_REAL_NODE_READONLY',
    status:'PASS_ISOLATED_ADAPTER_REAL_RESTRICTED_PRODUCTION_DB',
    checkedWorkerAdapterSha256:PINNED_ADAPTER_SHA,
    actualSignedWorkerQueueRead:true,
    forbiddenGlobalTablesDenied:3,
    sqlDataWrites:0,productionBackendPromoted:false,
    genuineSchoolTeacherAcceptance:false,productionReleaseCertified:false
  }));
 }catch(e){
  console.error(JSON.stringify({gate:'CURRENT_REVIEWED_AI_WORKER_REAL_NODE_READONLY',status:'HOLD',reason:String(e.code||e.message)}));
  process.exitCode=2;
 }finally{
  clearTimeout(deadline);
  // Adapter owns an internal pool with no public close API; end the one-shot
  // verification process, never keep a background worker running.
  process.exit(process.exitCode||0);
 }
}
if(require.main===module)main().catch(e=>{console.error('WORKER_GATE_UNEXPECTED_'+String(e.code||e.message));process.exit(2)});
module.exports={preflight};
