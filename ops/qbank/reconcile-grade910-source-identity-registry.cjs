#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const MANIFEST=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const LEDGER=path.join(ROOT,'ops/qbank/catalog-hash-ledger-20261008.json')
const REGISTRY=path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')
const CACHE='/root/workspace/qbank-source-cache'
const hex=/^[a-f0-9]{64}$/
function compareIdentity(a,b){
 return ['recordId','grade','subject','medium','edition','pdfSha256'].every(key=>String(a?.[key]??'')===String(b?.[key]??''))
}
function build({manifest,ledger,prior,hasCacheRef}){
 if(manifest?.entries?.length!==111||ledger?.entries?.length!==111 ||
    !Array.isArray(prior?.entries)||prior.academicApproval!==false)throw Error('UNEXPECTED_SOURCE_BASELINE')
 const ledgerMap=new Map(ledger.entries.map(x=>[x.recordId,x]))
 const priorMap=new Map(prior.entries.map(x=>[x.recordId,x]))
 if(ledgerMap.size!==111||new Set(manifest.entries.map(x=>x.recordId)).size!==111)
  throw Error('DUPLICATE_SOURCE_IDENTITY')
 const entries=[],quarantine=[]
 for(const item of manifest.entries){
  const recorded=ledgerMap.get(item.recordId)
  if(!recorded||!compareIdentity(item,recorded))throw Error('SOURCE_LEDGER_IDENTITY_MISMATCH:'+item.recordId)
  const prev=priorMap.get(item.recordId)
  if(prev&&!compareIdentity(prev,item))throw Error('PRIOR_REGISTRY_REWRITING_BLOCKED:'+item.recordId)
  const cache=String(item.sourceCacheRef||'')
  if(!hex.test(String(item.pdfSha256||''))||!cache || !hasCacheRef(cache)){
    quarantine.push({recordId:item.recordId,reason:!hex.test(String(item.pdfSha256||''))?'SOURCE_BYTES_SHA_MISSING':'CACHED_SOURCE_NOT_FOUND'})
    continue
  }
  entries.push({
   recordId:item.recordId,grade:item.grade,subject:item.subject,medium:item.medium,
   pdfSha256:item.pdfSha256,edition:item.edition,academicApproval:false
  })
 }
 if(entries.length+quarantine.length!==111)throw Error('CATALOG_COUNT_MISMATCH')
 for(const record of prior.entries)if(!entries.some(x=>x.recordId===record.recordId))
   throw Error('PREVIOUSLY_ATTESTED_SOURCE_LOST:'+record.recordId)
 return {
  schemaVersion:'assps-source-identity-v1',
  catalogLedgerHash:ledger.sourceSha256,
  academicApproval:false,
  cacheBytesRehashedByThisBuilder:false,
  editionAdoptionCertification:false,
  questionPageExerciseVerification:false,
  scope:'IDENTITY_ONLY_FROM_HISTORICAL_LEDGER_AND_PRESENT_CACHE_NO_SCHOOL_APPROVAL',
  quarantinedSourceIds:quarantine.map(x=>x.recordId),
  entries,
  report:{manifestIdentities:111,identityOnlyRegistered:entries.length,
    priorIdentitiesRetained:prior.entries.length,additionalIdentityOnlyRecords:entries.length-prior.entries.length,
    quarantined:quarantine,approved:0,published:0}
 }
}
function main(){
 const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8'))
 const ledger=JSON.parse(fs.readFileSync(LEDGER,'utf8'))
 const prior=JSON.parse(fs.readFileSync(REGISTRY,'utf8'))
 const prefix=path.resolve(CACHE)+path.sep
 const hasCacheRef=relative=>{
  const absolute=path.resolve(CACHE,relative)
  return absolute.startsWith(prefix)&&fs.existsSync(absolute)&&fs.statSync(absolute).isFile()
 }
 const result=build({manifest,ledger,prior,hasCacheRef})
 if(process.argv.includes('--write')){
  if(!process.argv.includes('--identity-only'))throw Error('EXPLICIT_IDENTITY_ONLY_OPT_IN_REQUIRED')
  fs.writeFileSync(REGISTRY,JSON.stringify({
   schemaVersion:result.schemaVersion,catalogLedgerHash:result.catalogLedgerHash,
   academicApproval:result.academicApproval,
   cacheBytesRehashedByThisBuilder:result.cacheBytesRehashedByThisBuilder,
   editionAdoptionCertification:result.editionAdoptionCertification,
   questionPageExerciseVerification:result.questionPageExerciseVerification,
   scope:result.scope,quarantinedSourceIds:result.quarantinedSourceIds,
   entries:result.entries},null,2)+'\n')
 }
 console.log(JSON.stringify(result.report,null,2))
}
if(require.main===module)try{main()}catch(e){console.error('SOURCE_IDENTITY_RECONCILIATION_BLOCKED',e.message);process.exitCode=2}
module.exports={build,compareIdentity}
