#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const DEFAULT_REPORT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_AUTHORING_CROSSFILE_QA_20261008.json')
function normalizedText(q) {
 const text=q.question_text||q.questionText||q.stem||q.content?.en?.stem||q.content?.ur?.stem||''
 return String(text).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}]+/gu,' ').replace(/\s+/gu,' ').trim()
}
function collectDocuments(directory=STAGING){
 return fs.readdirSync(directory).filter(n=>n.endsWith('.json')).sort().map(file=>{
  try{return{file,data:JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'))}}catch{return{file,data:null}}
 })
}
function auditAuthoring(documents,manifest) {
 const records=Array.isArray(manifest?.entries)?manifest.entries:[]
 const sources=new Map(records.map(x=>[x.recordId,x]))
 const rows=[], idMap=new Map(), normalizedMap=new Map(), topicMap=new Map(), flags={
  missingSourceIdentity:0,unresolvedOfficialRecord:0,sourceHashMismatch:0,
  missingSourceHash:0,missingPageClaim:0,pageClaimPresent:0,
  missingChapterNumber:0,missingTopicIdentity:0,placeholderEdition:0
 }
 const files=[]
 for(const {file,data} of documents) {
  if(!data||typeof data!=='object')continue
  let used=false
  for(const key of ['drafts','items']) {
   if(!Array.isArray(data[key]))continue
   for(const q of data[key]) {
    if(!q||typeof q!=='object'||!q.id||!normalizedText(q))continue
    used=true
    const id=String(q.id)
    const sourceId=String(q.source?.catalogRecordId||q.sourceRecordId||data.sourceRecordId||'').trim()
    const source=sources.get(sourceId)
    const hash=String(q.source?.pdfSha256||q.sourcePdfSha256||data.sourcePdfSha256||'').trim()
    const grade=String(q.curriculum?.grade||q.grade||data.grade||source?.grade||'unknown')
    const subject=String(q.curriculum?.subjectId||q.subjectId||q.subject||data.subject||source?.subject||'unknown').toLowerCase()
    const medium=String(q.medium||q.language||data.medium||source?.medium||'unspecified').toLowerCase()
    const type=String(q.type||q.questionType||'unknown').toLowerCase()
    const chapter=String(q.chapter?.number||q.chapterNo||data.chapterNo||'').trim()
    const topic=String(q.topicId||q.topic?.id||q.topic||'').trim()
    const edition=String(q.curriculum?.edition||q.edition||data.edition||'').trim()
    if(!sourceId)flags.missingSourceIdentity++
    else if(!source)flags.unresolvedOfficialRecord++
    if(!hash)flags.missingSourceHash++
    else if(source?.pdfSha256&&hash!==source.pdfSha256) flags.sourceHashMismatch++
    if(Number.isInteger(q.source?.page)&&q.source.page>0)flags.pageClaimPresent++
    else flags.missingPageClaim++
    if(!chapter)flags.missingChapterNumber++
    if(!topic)flags.missingTopicIdentity++
    if(!/^[12][0-9]{3}(-[0-9]{2,4})?$/.test(edition))flags.placeholderEdition++
    const row={id,file,grade,subject,medium,type,chapter,topic,sourceId,edition}
    rows.push(row)
    const seenId=idMap.get(id)||[];seenId.push(row);idMap.set(id,seenId)
    const norm=normalizedText(q)
    // Candidate-only duplicate: exact normalized stem, same grade/subject/medium/type.
    const normKey=[grade,subject,medium,type,norm].join('\u001f')
    const other=normalizedMap.get(normKey)||[];other.push(row);normalizedMap.set(normKey,other)
    if(chapter){
      const mapKey=[grade,subject,medium,chapter].join('|')
      const x=topicMap.get(mapKey)||{grade,subject,medium,chapter,questions:0,types:{},sourceIds:new Set(),topics:new Set()}
      x.questions++;x.types[type]=(x.types[type]||0)+1
      if(sourceId)x.sourceIds.add(sourceId);if(topic)x.topics.add(topic)
      topicMap.set(mapKey,x)
    }
   }
  }
  if(used)files.push(file)
 }
 const duplicateIds=[...idMap.entries()].filter(([,list])=>list.length>1).map(([id,list])=>({id,files:list.map(x=>x.file)}))
 const exactTextGroups=[...normalizedMap.values()].filter(x=>x.length>1).map(x=>({
   grade:x[0].grade,subject:x[0].subject,medium:x[0].medium,type:x[0].type,
   questions:x.map(v=>({id:v.id,file:v.file,chapter:v.chapter})),
 }))
 const coverage=[...topicMap.values()].map(x=>({...x,topics:[...x.topics].sort(),sourceIds:[...x.sourceIds].sort()}))
 coverage.sort((a,b)=>Number(a.grade)-Number(b.grade)||a.subject.localeCompare(b.subject)||a.medium.localeCompare(b.medium)||Number(a.chapter)-Number(b.chapter))
 const types={};for(const r of rows)types[r.type]=(types[r.type]||0)+1
 return{
  schemaVersion:'assps-grade910-authoring-crossfile-qa-v1',
  scope:'READ_ONLY_CANDIDATE_AUTHORING_NO_TEXT_REPRODUCTION_NO_APPROVAL',
  totals:{files:files.length,instances:rows.length,uniqueIds:idMap.size,
   draftChapterGroups:coverage.length,duplicateIdGroups:duplicateIds.length,
   normalizedSameStemGroups:exactTextGroups.length,types},
  flags,
  duplicateIds,exactTextGroups,
  coverage,
  publication:{sourceVerified:0,independentlyReviewed:0,approved:0,published:0,
    notes:'No reviewer signatures or revision-bound independent source-page proof checked by this offline inventory; do not infer approval from source hash/page claims.'}
 }
}
if(require.main===module){
 const manifest=JSON.parse(fs.readFileSync(path.join(STAGING,'officialSourceManifest.json'),'utf8'))
 const result=auditAuthoring(collectDocuments(),manifest)
 if(process.argv.includes('--write'))fs.writeFileSync(DEFAULT_REPORT,JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify({totals:result.totals,flags:result.flags,duplicateExamples:result.duplicateIds.slice(0,5),textDuplicateExamples:result.exactTextGroups.slice(0,5),reportFile:process.argv.includes('--write')?DEFAULT_REPORT:null,publication:result.publication},null,2))
 if(process.argv.includes('--strict')&&(result.totals.duplicateIdGroups||result.flags.unresolvedOfficialRecord))process.exitCode=1
}
module.exports={normalizedText,collectDocuments,auditAuthoring}
