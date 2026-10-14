#!/usr/bin/env node
'use strict'
/**
 * Reconcile moved PDF cache references ONLY against SHA-256-verified local files.
 * Does not alter any PDF, source hash, chapter or exercise status, or academic approval.
 * Defaults to dry-run. --apply updates only the isolated worktree manifest.
 */
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {scan}=require('./audit-cached-pdf-inventory.cjs')
const MANIFEST=path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')

function chooseCacheRef(entry,inventoryRow){
 const matches=[...(inventoryRow?.matchingCachedPdfs||[])].sort()
 if(!entry.pdfSha256)return {status:'SOURCE_UNRESOLVED'}
 if(!matches.length)return {status:'MISSING_HASH_MATCH'}
 if(entry.sourceCacheRef && matches.includes(entry.sourceCacheRef))return {status:'VALID',ref:entry.sourceCacheRef}
 const id=entry.recordId
 // Prefer a record-specific filename, then a catalog-style recovered copy, then lexical order.
 const recordSpecific=matches.filter(p=>path.basename(p).includes(id))
 const candidates=recordSpecific.length?recordSpecific:matches
 const ref=candidates.find(p=>p.includes('/official-verified/'))||candidates[0]
 return {status:'RECONCILE',ref,previousRef:entry.sourceCacheRef||null,duplicateCopies:matches.length}
}
function reconcile(manifest,inventory,{apply=false}={}){
 const lookup=new Map((inventory.catalog||[]).map(r=>[r.recordId,r]))
 const report={scope:'HASH_MATCHED_LOCAL_CACHE_REFS_ONLY_NO_ACADEMIC_APPROVAL',apply,verifiedRecords:0,valid:0,updated:0,unresolved:0,missing:0,changes:[]}
 for(const entry of manifest.entries){
  const v=chooseCacheRef(entry,lookup.get(entry.recordId))
  if(v.status==='SOURCE_UNRESOLVED'){report.unresolved++;continue}
  if(v.status==='MISSING_HASH_MATCH'){report.missing++;report.changes.push({recordId:entry.recordId,status:v.status});continue}
  report.verifiedRecords++
  if(v.status==='VALID'){report.valid++;continue}
  report.updated++
  report.changes.push({recordId:entry.recordId,status:'HASH_MATCHED_RELOCATION',from:v.previousRef,to:v.ref,identicalHashCopies:v.duplicateCopies})
  if(apply){
   if(v.previousRef){const history=Array.isArray(entry.sourceCacheRefHistory)?entry.sourceCacheRefHistory:[];entry.sourceCacheRefHistory=[...new Set([...history,v.previousRef])]}
   entry.sourceCacheRef=v.ref
   entry.sourceCacheRefReconciledOn='2026-10-08'
  }
 }
 report.academicApprovalGranted=false
 return report
}
async function run({cacheRoot,apply=false}={}){
 if(!cacheRoot||!fs.existsSync(cacheRoot)||!fs.statSync(cacheRoot).isDirectory())throw Error('EXPLICIT_SOURCE_CACHE_REQUIRED')
 const bytes=fs.readFileSync(MANIFEST),originalHash=crypto.createHash('sha256').update(bytes).digest('hex')
 const manifest=JSON.parse(bytes)
 const inventory=await scan(cacheRoot)
 const report=reconcile(manifest,inventory,{apply})
 if(report.missing)throw Error('FAIL_CLOSED_MISSING_MATCHES:'+report.missing)
 if(report.verifiedRecords!==inventory.catalogHashMatches)throw Error('INVENTORY_CATALOG_COUNT_MISMATCH')
 if(apply){
  const latestHash=crypto.createHash('sha256').update(fs.readFileSync(MANIFEST)).digest('hex')
  if(latestHash!==originalHash)throw Error('MANIFEST_CHANGED_DURING_RECONCILIATION')
  const tmp=MANIFEST+'.reconcile-tmp-'+process.pid
  try{fs.writeFileSync(tmp,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});fs.renameSync(tmp,MANIFEST)}
  finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
 }
 return report
}
if(require.main===module){
 const args=process.argv.slice(2),idx=args.indexOf('--source-cache')
 run({cacheRoot:idx>=0?path.resolve(args[idx+1]||''):null,apply:args.includes('--apply')})
  .then(r=>console.log(JSON.stringify(r,null,2)))
  .catch(e=>{console.error('SOURCE_REF_RECONCILIATION_BLOCKED',e.message);process.exitCode=2})
}
module.exports={chooseCacheRef,reconcile,run}
