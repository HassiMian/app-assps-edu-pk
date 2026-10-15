'use strict';
// Live anonymous preflight only: tested private candidate build; NOT an authorized release or staff/tenant security certificate.
const fs=require('node:fs');
const path=require('node:path');
const {URL}=require('node:url');
const EXPECTED_BUILD='bHxqXQ_9RXKfTeWRZ0lCs';
const LIVE_BUILD='/var/www/apex-connect/.next/BUILD_ID';
const HOST='https://api.assps.edu.pk';
const paths=['/login','/dashboard','/dashboard/history','/teacher','/api/auth/me'];
const allowedStatus=[200,302,307,308,401,403];
function localPath(location){
  if(!location)return null;
  try {
    const u=new URL(location,HOST);
    if(u.origin!==HOST)return null;
    return {path:u.pathname,next:u.searchParams.get('next')};
  }catch{return null}
}
function evaluate(result,liveBuild){
  const checks=[];
  const add=(name,pass)=>checks.push({name,pass:pass===true});
  add('qa_candidate_build_live',liveBuild===EXPECTED_BUILD);
  const get=p=>result[p];
  const login=get('/login'),dash=get('/dashboard'),nested=get('/dashboard/history');
  const teacher=get('/teacher'),self=get('/api/auth/me');
  add('anonymous_login_200',login?.status===200);
  for(const [name,item] of [['dashboard',dash],['nested_dashboard',nested]]) {
    const u=localPath(item?.location);
    add(name+'_unauthenticated_goes_only_to_login',
      [302,307,308].includes(item?.status) && u?.path==='/login' &&
      u.next===null);
  }
  const t=localPath(teacher?.location);
  add('unauthenticated_teacher_does_not_enter_admin',
      [302,307,308].includes(teacher?.status)&&t?.path==='/login'&&
      t.next==='/teacher');
  add('anonymous_identity_is_401',self?.status===401);
  const ok=checks.every(v=>v.pass);
  return {scope:'PUBLIC_ANONYMOUS_ONLY',status:ok?'ANONYMOUS_ROUTES_PASS':'HOLD',
      checks,blocked:checks.filter(c=>!c.pass).map(c=>c.name),
      authenticatedTeacherAccepted:false,
      independentCrossTenantDenied:false,
      realTrafficRollbackCertified:false,
      productionReleaseCertified:false};
}
async function fetchStatus(route) {
  const response=await fetch(HOST+route,{
    redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(7000),
    headers:{'Cache-Control':'no-store','User-Agent':'ASSPS-connect-read-only-public-routing-qa'},
  });
  if(!allowedStatus.includes(response.status))throw Error('UNEXPECTED_HTTP_STATUS');
  return {status:response.status,location:response.headers.get('location')};
}
async function main() {
  let build='';
  try{build=fs.readFileSync(LIVE_BUILD,'utf8').trim()}catch {}
  const records={};
  const errors=[];
  for(const route of paths){
    try{records[route]=await fetchStatus(route);}
    catch(e){errors.push(route+':'+(e?.name||'ERROR'));}
  }
  const report=evaluate(records,build);
  if(errors.length){report.blocked.push('HTTPS_NETWORK_OR_TLS_FAILURE');report.status='HOLD'}
  console.log(JSON.stringify({...report,errors,checkedPaths:paths},null,2));
  process.exitCode=report.status==='ANONYMOUS_ROUTES_PASS'?0:2;
}
if(require.main===module)main().catch(e=>{console.error('ROUTING_PUBLIC_HOLD '+e.message);process.exitCode=2;});
module.exports={evaluate,localPath,EXPECTED_BUILD};
