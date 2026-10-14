#!/usr/bin/env node
'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const ROOT=path.resolve(__dirname,'../..')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_BILINGUAL_STRUCTURAL_QA_20261008.json')
const hash=q=>crypto.createHash('sha256').update(JSON.stringify(q)).digest('hex')
const hasText=v=>typeof v==='string'&&v.trim().length>0
const normalize=v=>String(v??'').normalize('NFKC').trim().toLocaleLowerCase()
function inspect(q){
 const issues=[],en=q.content?.en,ur=q.content?.ur
 if(!en||!ur)return null
 for(const [code,part] of [['en',en],['ur',ur]]){
  if(!hasText(part.stem))issues.push(code+':STEM_MISSING')
  if(!hasText(part.answer))issues.push(code+':ANSWER_MISSING')
 }
 const type=String(q.type||'').toLowerCase()
 if(type==='mcq'){
  const key=String(q.correctOptionId||'').toUpperCase()
  if(!/^[A-D]$/.test(key))issues.push('MCQ_CORRECT_OPTION_ID_INVALID')
  for(const [code,part] of [['en',en],['ur',ur]]){
   const opts=part.options
   if(!Array.isArray(opts)||opts.length!==4){issues.push(code+':OPTION_COUNT_NOT_FOUR');continue}
   const labels=opts.map(o=>String(o?.id||'').toUpperCase())
   if(labels.join('')!=='ABCD')issues.push(code+':OPTIONS_NOT_ABCD')
   const texts=opts.map(o=>String(o?.text||'').trim())
   if(texts.some(t=>!t)||new Set(texts.map(normalize)).size!==4)issues.push(code+':OPTION_EMPTY_OR_DUPLICATE')
   const correct=opts.find(o=>String(o?.id||'').toUpperCase()===key)
   if(correct&&normalize(part.answer)!==normalize(correct.text).replace(/[.!؟۔]+$/u,'')){
    if(normalize(part.answer).replace(/[.!؟۔]+$/u,'')!==normalize(correct.text).replace(/[.!؟۔]+$/u,''))
      issues.push(code+':ANSWER_NOT_IDENTICAL_TO_SELECTED_OPTION')
   }
  }
 } else if(type!=='short'&&type!=='long')issues.push('UNSUPPORTED_BILINGUAL_QUESTION_TYPE')
 return{questionId:q.id,questionContentSha256:hash(q),type,grade:q.curriculum?.grade??null,sourceRecordId:q.source?.catalogRecordId||null,
  medium:q.medium,structuralIssues:issues,structuralCheckPassed:issues.length===0,
  equivalentTranslationHumanVerified:false,scientificAnswerHumanVerified:false,
  independentReviewerId:null,academicApproved:false,published:false}
}
function audit(documents){
 const records=[],ids=new Set()
 for(const {file,data} of documents){
  for(const q of [...(data?.drafts||[]),...(data?.items||[])]){
   if(!q?.id||!q?.content?.en||!q?.content?.ur)continue
   if(ids.has(q.id))throw Error('DUPLICATE_BILINGUAL_ID:'+q.id)
   ids.add(q.id)
   records.push({...inspect(q),sourceFile:file})
  }
 }
 records.sort((a,b)=>a.questionId.localeCompare(b.questionId))
 const issueCounts={}
 for(const x of records)for(const tag of x.structuralIssues)issueCounts[tag]=(issueCounts[tag]||0)+1
 return{schemaVersion:'assps-grade910-bilingual-structural-qa-v1',
 scope:'STRUCTURAL_CHECK_ONLY_NOT_INDEPENDENT_TRANSLATION_OR_SOURCE_VERIFICATION',
 totalBilingual:records.length,mcqs:records.filter(x=>x.type==='mcq').length,
 short:records.filter(x=>x.type==='short').length,long:records.filter(x=>x.type==='long').length,
 structuralPass:records.filter(x=>x.structuralCheckPassed).length,
 structuralFail:records.filter(x=>!x.structuralCheckPassed).length,
 issueCounts,independentlyEquivalent:0,independentlyReviewed:0,approved:0,published:0,records}
}
if(require.main===module){
 const res=audit(collectDocuments())
 if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(res,null,2)+'\n')
 console.log(JSON.stringify({totalBilingual:res.totalBilingual,mcqs:res.mcqs,short:res.short,long:res.long,structuralPass:res.structuralPass,structuralFail:res.structuralFail,issueCounts:res.issueCounts,approved:0},null,2))
 if(process.argv.includes('--strict')&&res.structuralFail)process.exitCode=2
}
module.exports={inspect,audit}
