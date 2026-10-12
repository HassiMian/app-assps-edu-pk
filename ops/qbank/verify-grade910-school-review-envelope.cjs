#!/usr/bin/env node
'use strict'
// Offline read-only authenticated *evidence* ingestion; NO production import or publication.
// The institutional trust root/fingerprint must be provisioned out of band by ASSPS.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const original=require('./attest-grade910-all-original-candidate-revisions.cjs')
const auth=require('./verify-grade910-institutional-signatures.cjs')
const physical=require('./verify-grade910-physical-evidence-objects.cjs')
const ROOT=path.resolve(__dirname,'../..')
const reject=x=>{throw Error('GRADE910_SCHOOL_REVIEW_ENVELOPE_'+x)}
function inside(a,b){const rel=path.relative(b,a);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))}
function verifyExternalFile(p,{sensitive=false,maxBytes=32*1024*1024}={}){
 if(typeof p!=='string'||!path.isAbsolute(p))reject('SCHOOL_TRUST_FILE_MUST_BE_ABSOLUTE')
 const full=path.resolve(p)
 if(inside(full,ROOT))reject('SCHOOL_AUTHORITY_EVIDENCE_MUST_BE_OUTSIDE_GIT_WORKTREE')
 const resolved=fs.realpathSync(full)
 if(resolved!==full)reject('SCHOOL_REVIEW_SYMLINK_OR_ALIAS_NOT_ALLOWED')
 const stat=fs.lstatSync(full)
 if(!stat.isFile()||stat.isSymbolicLink()||stat.uid!==process.getuid()||
  stat.size<1||stat.size>maxBytes||(stat.mode&0o022)!==0||
  (sensitive&&(stat.mode&0o077)!==0))reject('SCHOOL_TRUST_FILE_UNSAFE_OWNER_MODE_OR_SIZE')
 if(sensitive){
  const parent=path.dirname(full),parentStat=fs.lstatSync(parent)
  if(!parentStat.isDirectory()||parentStat.isSymbolicLink()||
   parentStat.uid!==process.getuid()||(parentStat.mode&0o077)!==0)
   reject('SCHOOL_REVIEW_PARENT_FOLDER_NOT_PRIVATE')
 }
 return full
}
function loadExternal({rootPublicKeyFile,reviewBundleFile,rootFingerprint,tenantId,at,evidenceObjectDirectory}){
 if(!rootPublicKeyFile||!reviewBundleFile||!rootFingerprint||!tenantId||!at)
  reject('MISSING_OUT_OF_BAND_SCHOOL_AUTHORITY_CONFIGURATION')
 const full=verifyExternalFile(reviewBundleFile,{sensitive:true,maxBytes:32*1024*1024})
 const pk=verifyExternalFile(rootPublicKeyFile,{sensitive:false,maxBytes:128*1024})
 const bytes=fs.readFileSync(full)
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
 if(!evidenceObjectDirectory)reject('SCHOOL_REVIEW_EVIDENCE_OBJECT_DIRECTORY_REQUIRED')
 const proof=physical.verify({directory:evidenceObjectDirectory,records:signed.records})
 if(!proof.sha256MatchesAll||proof.schoolAdoptionAuthorityVerifiedByByteCheck!==false)
  reject('EVIDENCE_BYTE_ATTESTATION_INCORRECTLY_GRANTS_AUTHORITY')
 if(result.publisherSelectable!==false||result.academicallyPublished!==0)
  reject('UNAUTHENTICATED_RELEASE_DOWNGRADE')
 return{reviewEvidencePackets:result.reviewEvidencePackets,verifiedSignatureReceipts:result.receipts,
  verifiedSignedBundleFileSha256:crypto.createHash('sha256').update(bytes).digest('hex'),
  physicalEvidenceSha256ObjectsVerified:proof.uniquePhysicalEvidenceObjectsVerified,
  schoolAdoptionAuthorityStillRequiresIndependentHumanCertification:true,
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
   at:process.env.ASSPS_ACADEMIC_REVIEW_VERIFICATION_AT,
   evidenceObjectDirectory:process.env.ASSPS_ACADEMIC_EVIDENCE_OBJECT_DIR
  })
  console.log(JSON.stringify(r,null,2))
 }catch(e){
  console.error('ACADEMIC_SIGNATURE_EVIDENCE_DENIED',e.message)
  process.exitCode=2
 }
}
module.exports={loadExternal,inside,verifyExternalFile}
