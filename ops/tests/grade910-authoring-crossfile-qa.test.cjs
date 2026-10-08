'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {auditAuthoring,collectDocuments,normalizedText}=require('../qbank/audit-authoring-crossfile-qa.cjs')
const root=path.resolve(__dirname,'../..')
const staging=path.join(root,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const manifest=JSON.parse(fs.readFileSync(path.join(staging,'officialSourceManifest.json'),'utf8'))
const actual=auditAuthoring(collectDocuments(staging),manifest)
test('entire 73-file original authoring corpus is reconciled without adding generated and revision2 derivative records',()=>{
 assert.equal(actual.totals.files,73)
 assert.equal(actual.totals.instances,2581)
 assert.equal(actual.totals.uniqueIds,2581)
 assert.equal(actual.totals.duplicateIdGroups,0)
 assert.equal(actual.totals.normalizedSameStemGroups,0)
 assert.equal(actual.totals.types.mcq,875)
 assert.equal(actual.totals.draftChapterGroups,557)
})
test('a claimed textbook page or source hash is never certified as physical or academic verification',()=>{
 assert.equal(actual.flags.missingPageClaim,1188)
 assert.equal(actual.flags.pageClaimPresent,1393)
 assert.equal(actual.flags.placeholderEdition,921)
 assert.equal(actual.flags.missingSourceIdentity,0)
 assert.equal(actual.flags.sourceHashMismatch,0)
 assert.deepEqual([actual.publication.sourceVerified,actual.publication.independentlyReviewed,actual.publication.approved,actual.publication.published],[0,0,0,0])
})
test('cross-file duplicate IDs and same-medium identical stems are candidates, never deleted',()=>{
 const data={sourceRecordId:'SRC-1',sourcePdfSha256:'h'.repeat(64),
    drafts:[{id:'Q1',type:'mcq',questionText:'What is Biology?',curriculum:{grade:9,subjectId:'biology',edition:'2025-26'},medium:'english',chapter:{number:1},topicId:'1.1',
      source:{catalogRecordId:'SRC-1',pdfSha256:'h'.repeat(64),page:5}}]}
 const clone=JSON.parse(JSON.stringify(data))
 clone.drafts[0].questionText='What is biology!'
 const catalog={entries:[{recordId:'SRC-1',grade:9,subject:'Biology',medium:'English',pdfSha256:'h'.repeat(64)}]}
 const x=auditAuthoring([{file:'a.json',data},{file:'b.json',data:clone}],catalog)
 assert.equal(x.totals.instances,2)
 assert.equal(x.totals.uniqueIds,1)
 assert.equal(x.totals.duplicateIdGroups,1)
 assert.equal(x.totals.normalizedSameStemGroups,1)
 assert.equal(x.flags.pageClaimPresent,2)
 assert.equal(x.publication.approved,0)
 assert.equal(data.drafts.length,1)
})
test('different mediums and types are not merged merely because the normalized text matches',()=>{
 const doc={sourceRecordId:'SRC-1',drafts:[
   {id:'A',questionText:'Life?',curriculum:{grade:9,subjectId:'biology'},medium:'english',type:'mcq'},
   {id:'B',questionText:'Life?',curriculum:{grade:9,subjectId:'biology'},medium:'urdu',type:'mcq'},
   {id:'C',questionText:'Life?',curriculum:{grade:9,subjectId:'biology'},medium:'english',type:'short'}
 ]}
 const r=auditAuthoring([{file:'case.json',data:doc}],{entries:[{recordId:'SRC-1'}]})
 assert.equal(r.totals.instances,3)
 assert.equal(r.totals.normalizedSameStemGroups,0)
 assert.equal(r.flags.missingPageClaim,3)
 assert.equal(normalizedText({questionText:'What is BIOLOGY?'}),'what is biology')
})
