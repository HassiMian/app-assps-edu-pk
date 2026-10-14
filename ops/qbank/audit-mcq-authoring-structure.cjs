#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const {collectDocuments}=require('./audit-authoring-crossfile-qa.cjs')
const {inspectMcqs}=require('./audit-mcq-key-patterns.cjs')
const root=path.resolve(__dirname,'../..')
const pathOut=path.join(root,'docs/question-bank/ASSPS_GRADE910_MCQ_AUTHORING_QA_20261008.json')
const normalize=s=>String(s??'').normalize('NFKC').trim().toLowerCase().replace(/[.،۔!?؟]+$/g,'').trim()
function assessRecord(q){
 const flags=[]
 let key=String(q.correctOptionId||q.correctOption||'').trim().toUpperCase()
 let inferredFromAnswer=false
 // Older skill-draft documents store a textual answer rather than a letter;
 // finding its exact unique option is only a structural reconciliation.
 if(!key && Array.isArray(q.options)&&q.options.length===4&&typeof q.answer==='string'){
   const matches=q.options.map((opt,i)=>({i,value:normalize(opt)})).filter(o=>o.value===normalize(q.answer))
   if(matches.length===1){key='ABCD'[matches[0].i];inferredFromAnswer=true}
 }
 if(!/^[A-D]$/.test(key))flags.push('KEY_UNRESOLVED_REVIEW_REQUIRED')
 const langs=q.content&&typeof q.content==='object'?
   Object.entries(q.content).filter(([code,data])=>['en','ur'].includes(code)&&data&&typeof data==='object'):
   [['single',{options:q.options,answer:q.answer}]]
 for(const [lang,c] of langs){
   const options=c.options
   if(!Array.isArray(options)||options.length!==4){flags.push(lang+':INVALID_OPTION_LENGTH');continue}
   const labels=options.map((o,i)=>typeof o==='object'?String(o.id||'').toUpperCase():'ABCD'[i])
   const texts=options.map(o=>String(typeof o==='object'?(o.text||''):o||'').trim())
   if(labels.join('')!=='ABCD')flags.push(lang+':INVALID_OPTION_IDS')
   if(texts.some(x=>!x)||new Set(texts.map(normalize)).size!==4)flags.push(lang+':DUPLICATE_OR_EMPTY_OPTION')
   const selected=options.find((o,i)=>(typeof o==='object'?String(o.id||'').toUpperCase():'ABCD'[i])===key)
   if(selected!=null){
     const chosen=String(typeof selected==='object'?selected.text:selected).trim()
     // Differing text can be a valid synonym; flag for human editorial review.
     if(c.answer!=null&&normalize(c.answer)!==normalize(chosen))flags.push(lang+':ANSWER_OPTION_TEXT_NOT_EXACT')
   }
 }
 return{key,flags,inferredFromAnswer,langCount:langs.length}
}
function auditMcqs(documents){
 let total=0,bilingual=0,inferredFromAnswer=0
 const counts={},byFile=[],findings=[]
 for(const {file,data} of documents){
   if(!data)continue
   const qs=[...(data.drafts||[]),...(data.items||[])].filter(q=>q?.id&&q.type==='mcq')
   if(!qs.length)continue
   const converted=[]
   for(const q of qs){
     total++
     const x=assessRecord(q)
     counts[x.key]=(counts[x.key]||0)+1
     if(x.langCount>1)bilingual++
     if(x.inferredFromAnswer)inferredFromAnswer++
     for(const code of x.flags)findings.push({file,id:q.id,code})
     if(/^[A-D]$/.test(x.key))converted.push({type:'mcq',id:q.id,correctOption:x.key,options:['A','B','C','D']})
   }
   const patterns=inspectMcqs(converted).findings.filter(x=>x.type==='PREDICTABLE_MCQ_KEY_SEQUENCE')
   // Previously reported only as metadata, while flagCount incorrectly returned ZERO.
   for(const pattern of patterns){
     findings.push({file,id:pattern.firstQuestionId,code:'PREDICTABLE_MCQ_KEY_SEQUENCE',
       period:pattern.period,length:pattern.length,endingQuestionId:pattern.lastQuestionId})
   }
   byFile.push({file,mcqs:qs.length,editorialKeyPatterns:patterns})
 }
 const countsForFour='ABCD'.split('').map(k=>counts[k]||0)
 const dominantKeyTotal=Math.max(0,...countsForFour)
 const dominantKeyShare=total?dominantKeyTotal/total:0
 const globalEditorialRisk=total>=40&&dominantKeyShare>0.65
 if(globalEditorialRisk){
   findings.push({file:null,id:null,code:'EXCESSIVE_GLOBAL_CORRECT_OPTION_CONCENTRATION',
      dominantKey:'ABCD'[countsForFour.indexOf(dominantKeyTotal)],
      dominantKeyCount:dominantKeyTotal,totalMcqs:total})
 }
 return{
   schemaVersion:'assps-grade910-mcq-authoring-structure-qa-v2',
   scope:'RESEARCH_EDITORIAL_INSPECTION_NO_INDEPENDENT_ANSWER_VERIFICATION',
   totalMcqs:total,bilingualQuestions:bilingual,exactTextDerivedLegacyKeys:inferredFromAnswer,
   optionKeyDistribution:counts,flagCount:findings.length,flagSamples:findings.slice(0,60),
   predictableKeyPatternCount:byFile.reduce((n,x)=>n+x.editorialKeyPatterns.length,0),
   dominantCorrectKeyShare:dominantKeyShare,
   globalCorrectKeyConcentrationRequiresReview:globalEditorialRisk,
   independentMcqEditorialReviewRequired:findings.length>0,
   academicallyVerifiedMcqSelectionReady:false,
   publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
   predictablePatternFileCount:byFile.filter(x=>x.editorialKeyPatterns.length).length,
   filesWithPatterns:byFile.filter(x=>x.editorialKeyPatterns.length),
   originalQuestionTextsReproduced:false,autoReorderedOptions:false,academicallyApproved:0,published:0
 }
}
if(require.main===module){
 const res=auditMcqs(collectDocuments())
 if(process.argv.includes('--write'))fs.writeFileSync(pathOut,JSON.stringify(res,null,2)+'\n')
 console.log(JSON.stringify({totalMcqs:res.totalMcqs,bilingualQuestions:res.bilingualQuestions,
  exactTextDerivedLegacyKeys:res.exactTextDerivedLegacyKeys,optionKeyDistribution:res.optionKeyDistribution,
  flagCount:res.flagCount,flagSamples:res.flagSamples.slice(0,10),
  predictablePatternFileCount:res.predictablePatternFileCount,academicallyApproved:0},null,2))
}
module.exports={assessRecord,auditMcqs}
