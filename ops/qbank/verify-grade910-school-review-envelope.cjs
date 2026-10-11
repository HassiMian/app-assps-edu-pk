#!/usr/bin/env node
'use strict'
// Offline read-only authenticated *evidence* ingestion; NO production import or publication.
// The institutional trust root/fingerprint must be provisioned out of band by ASSPS.
const fs=require('node:fs'),path=require('node:path')
const original=require('./attest-grade910-all-original-candidate-revisions.cjs')
const auth=require('./verify-grade910-institutional-signatures.cjs')
const ROOT=path.resolve(__dirname,'../..')
const reject=x=>{throw Error('GRADE910_SCHOOL_REVIEW_ENVELOPE_'+x)}
function inside(a,b){const rel=path.relative(b,a);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))}
function loadExternal({rootPublicKeyFile,reviewBundleFile,rootFingerprint,tenantId,at}){
 if(!rootPublicKeyFile||!reviewBundleFile||!rootFingerprint||!tenantId||!at)
  reject('MISSING_OUT_OF_BAND_SCHOOL_AUTHORITY_CONFIGURATION')
 const full=path.resolve(reviewBundleFile),pk=path.resolve(rootPublicKeyFile)
 // Never put signed faculty credentials, names, review papers or live security material in git.
 if(inside(full,ROOT)||inside(pk,ROOT))reject('SCHOOL_AUTHORITY_EVIDENCE_MUST_BE_OUTSIDE_GIT_WORKTREE')
 const bytes=fs.readFileSync(full)
 if(bytes.length>32*1024*1024)reject('INSTITUTIONAL_REVIEW_BATCH_EXCEEDS_LIMIT')
 let signed
 try{signed=JSON.parse(bytes.toString('utf8'))}catch(_){reject('REVIEW_BUNDLE_NOT_JSON')}
 if(signed?.schemaVersion!=='assps-grade910-signed-faculty-batch-v1'||
  !signed?.roster||!signed?.rosterSignature||!Array.isArray(signed.records))
  reject('INSTITUTIONAL_BUNDLE_SCHEMA_MISMATCH')
 const inp=original.loadInputs(),frozen=original.assertFrozen(inp)
 const originalsIndex=auth.indexForInstitutionalSignatures(frozen,inp.documents)
 const result=auth.verifyBatch({roster:signed.roster,rosterSignature:signed.rosterSignature,
  schoolRootPublicKeyPem:fs.readFileSync(pk,'utf8'),
  trustedSchoolRootFingerprint:rootFingerprint,expectedTenantId:tenantId,at,
  originalsIndex,records:signed.records})
 if(result.publisherSelectable!==false||result.academicallyPublished!==0)
  reject('UNAUTHENTICATED_RELEASE_DOWNGRADE')
 return{reviewEvidencePackets:result.reviewEvidencePackets,verifiedSignatureReceipts:result.receipts,
  releaseDecision:'HOLD_PENDING_SCHOOL_REVIEW_AND_PAPER_STUDIO_SAAS_CORE_CERTIFICATION',
  schoolRootPublicKeyFingerprint:rootFingerprint,schoolTenantId:tenantId,
  paperStudioPublisherSelectable:false,productionChanged:false}
}
if(require.main===module){
 try{
  const r=loadExternal({
   rootPublicKeyFile:process.env.ASSPS_ACADEMIC_SCHOOL_ROOT_PUBKEY_PATH,
   reviewBundleFile:process.env.ASSPS_ACADEMIC_SIGNED_REVIEW_BUNDLE_PATH,
   rootFingerprint:process.env.ASSPS_ACADEMIC_TRUSTED_ROOT_SPKI_SHA256,
   tenantId:process.env.ASSPS_ACADEMIC_SCHOOL_TENANT_ID,
   at:process.env.ASSPS_ACADEMIC_REVIEW_VERIFICATION_AT
  })
  console.log(JSON.stringify(r,null,2))
 }catch(e){
  console.error('ACADEMIC_SIGNATURE_EVIDENCE_DENIED',e.message)
  process.exitCode=2
 }
}
module.exports={loadExternal,inside}
