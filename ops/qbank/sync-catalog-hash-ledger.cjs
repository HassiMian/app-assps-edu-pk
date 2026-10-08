#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const ROOT=path.resolve(__dirname,'../..')
const MANIFEST=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const LEDGER=path.join(ROOT,'ops/qbank/catalog-hash-ledger-20261008.json')
function sync({apply=false}={}){
 const manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8'))
 const ledger=JSON.parse(fs.readFileSync(LEDGER,'utf8'))
 const lm=new Map(ledger.entries.map(e=>[e.recordId,e])); const changes=[]; const conflicts=[]
 for(const src of manifest.entries){
   const dst=lm.get(src.recordId); if(!dst) continue
   const mh=String(src.pdfSha256||'').toLowerCase(), lh=String(dst.pdfSha256||'').toLowerCase()
   if(mh && lh && mh!==lh){conflicts.push({recordId:src.recordId,manifest:mh,ledger:lh});continue}
   if(mh && !lh){changes.push({recordId:src.recordId,pdfSha256:mh}); if(apply)dst.pdfSha256=mh}
 }
 if(conflicts.length) throw new Error('CATALOG_HASH_CONFLICT:'+JSON.stringify(conflicts))
 if(apply)fs.writeFileSync(LEDGER,JSON.stringify(ledger,null,2)+'\n')
 return {apply,changes,conflicts,ledgerHashReferencePreserved:ledger.sourceSha256}
}
if(require.main===module)console.log(JSON.stringify(sync({apply:process.argv.includes('--apply')}),null,2))
module.exports={sync}
