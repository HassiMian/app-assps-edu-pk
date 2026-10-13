#!/usr/bin/env node
'use strict'
// Consumes a private, read-only observation supplied by the Core owner workflow.
// This is historical telemetry, NEVER an authenticated Core release certificate.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const REPO=path.resolve(__dirname,'../..')
const fail=x=>{throw Error('GRADE910_CORE_OBSERVATION_'+x)}
const SHA=/^[0-9a-f]{64}$/
function inspect(file,now=new Date()){
 if(typeof file!=='string'||!path.isAbsolute(file))fail('PRIVATE_ABSOLUTE_SOURCE_REQUIRED')
 const resolved=path.resolve(file),rel=path.relative(REPO,resolved)
 if(rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)))
  fail('SOURCE_CANNOT_BE_REPO_FILE')
 const st=fs.lstatSync(resolved)
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.uid!==process.getuid()||
   (st.mode&0o077)!==0||st.size<80||st.size>64*1024)
  fail('SOURCE_MUST_BE_OWNER_ONLY_REGULAR_FILE')
 const src=fs.readFileSync(resolved)
 const x=JSON.parse(src)
 if(x.schemaVersion!=='assps-academic-external-core-live-readonly-observation-v1'||
  !SHA.test(String(x.sourceVerifierSha256||''))||
  !SHA.test(String(x.observedJsonSha256||''))||
  x.sourceOwner!=='SaaS Core & Production Master'||
  x.authorizesDeployment!==false||
  x.coreOwnerCertifiedProductionRelease!==false||
  x.paperOwnerApprovedPickerRelease!==false||
  x.schoolStaffSessionAccepted!==false)
  fail('NOT_VALID_READONLY_STATUS_SOURCE')
 const observed=Date.parse(x.capturedAt)
 if(!Number.isFinite(observed)||Math.abs(now.getTime()-observed)>24*60*60*1000)
  fail('STALE_CORE_OBSERVATION_ONLY')
 const core=x.verifierPayload,stats=core?.facts
 if(!core||typeof stats!=='object'||!stats||
  ![0,2].includes(x.sourceVerifierExitCode)||
  ![0,77].includes(stats.green_signed_guards)||
  !Number.isInteger(stats.legacy_app_signed_guards)||
  typeof stats.legacy_bypass_still_active!=='boolean'||
  core.authenticated_real_staff!==false||core.prod_app_switched!==false||
  core.production_release_certified!==false)
  fail('UNTRUSTED_LIVE_CORE_VERIFIER_PAYLOAD')
 const digest=crypto.createHash('sha256').update(src).digest('hex')
 return {schemaVersion:'assps-grade910-oct13-core-live-observation-v1',
  observedAt:x.capturedAt,verifiedPrivateObservationFileSha256:digest,
  coreVerifierScriptSha256:x.sourceVerifierSha256,
  coreSourceBranchObservedCommit:x.sourceVerifierGit,
  verifierSourceExitCode:x.sourceVerifierExitCode,
  coreSourceStatus:core.status,
  currentLiveSignedMarksGuards:stats.marks_signed_guards,
  greenCoreSignedStagedGuards:stats.green_signed_guards,
  activeLegacyCoreSignedGuards:stats.legacy_app_signed_guards,
  activeLegacyDbLoginHasBypassRls:stats.legacy_bypass_still_active,
  legacyCoreVerifierExpectedBypassFlagNowOutdated:
   stats.legacy_bypass_still_active===false&&
   Array.isArray(core.issues)&&core.issues.includes('legacy_bypass_still_active'),
  greenRuntimeHasActualAuthenticatedStaffSession:core.authenticated_real_staff,
  productionAppSwitchedToGreenRuntime:core.prod_app_switched,
  coreOwnerCertifiedRelease:core.production_release_certified,
  paperStudioOwnerAcceptedAcademicPickerRelease:false,
  certifiedAcademicPublication:false,
  observationOnlyNotIndependentlySignedOwnerAuthority:true,
  decision:'HOLD_UNTIL_REAL_AUTHENTICATED_SCHOOL_STAFF_AND_CORE_CERTIFIED_SWITCH'}
}
if(require.main===module){
 try{
  const p=process.env.ASSPS_QBANK_CORE_READONLY_OBSERVATION_PATH
  console.log(JSON.stringify(p?inspect(p):{coreObservationAvailable:false,
   productionCertification:'UNVERIFIED',academicPublication:false,releaseDecision:'HOLD'}))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={inspect}
