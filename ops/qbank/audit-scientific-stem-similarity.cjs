#!/usr/bin/env node
'use strict'
/**
 * Candidate-only near-stem review. Preserves operators/ionic charge:
 * a comparison must never silently equate "1+" and "1-".
 */
const fs=require('node:fs')
const path=require('node:path')
const {createHash}=require('node:crypto')
const {collectDocuments,normalizedText}=require('./audit-authoring-crossfile-qa.cjs')
const ROOT=path.resolve(__dirname,'../..')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_SCIENTIFIC_STEM_SIMILARITY_REVIEW_20261008.json')
const SHA=x=>createHash('sha256').update(x).digest('hex')
const safe=v=>String(v??'').normalize('NFKC').toLowerCase().trim()
const LETTER_OR_NUMBER=/[\p{L}\p{N}]+|[+\-=×÷/^]/gu
function stemTokens(stem){
 return (safe(stem).replace(/[−–—﹣]/g,'-').match(LETTER_OR_NUMBER)||[])
}
function score(a,b){
 const left=new Set(stemTokens(a)),right=new Set(stemTokens(b))
 if(Math.min(left.size,right.size)<5)return 0
 const common=[...left].filter(w=>right.has(w)).length
 return common/(left.size+right.size-common)
}
function collectRows(documents){
 const rows=[],ids=new Set()
 for(const {file,data} of documents){
  for(const q of [...(data?.drafts||[]),...(data?.items||[])]){
   if(!q?.id||!normalizedText(q))continue
   if(ids.has(q.id))throw Error('DUPLICATE_ORIGINAL_QUESTION_ID:'+q.id)
   ids.add(q.id)
   const grade=String(q.curriculum?.grade||q.grade||data.grade||'unspecified')
   const subject=safe(q.curriculum?.subjectId||q.subjectId||q.subject||data.subject||'unspecified')
   const medium=safe(q.medium||q.language||data.medium||'unspecified')
   const type=safe(q.type||q.questionType||'unspecified')
   const chapter=String(q.chapter?.number??q.chapterNo??data.chapterNo??'').trim()
   const stem=String(q.question_text||q.questionText||q.stem||q.content?.en?.stem||q.content?.ur?.stem||'').trim()
   const answer=String(q.content?.en?.answer||q.content?.ur?.answer||q.answer||'').trim()
   if(!stem)throw Error('QUESTION_STEM_MISSING:'+q.id)
   rows.push({id:String(q.id),file,grade,subject,medium,type,chapter,stem,
    answerFingerprint:answer?SHA(safe(answer)):null,questionSha256:SHA(JSON.stringify(q))})
  }
 }
 return rows
}
function audit(documents){
 const rows=collectRows(documents),groups=new Map(),pairs=[]
 for(const row of rows){
  const key=[row.grade,row.subject,row.medium,row.type].join('|')
  if(!groups.has(key))groups.set(key,[])
  groups.get(key).push(row)
 }
 for(const [key,items] of groups){
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   const a=items[i],b=items[j]
   // Chapter mapping must be known before declaring cross-chapter template reuse.
   if(!a.chapter||!b.chapter)continue
   const similarity=score(a.stem,b.stem)
   const sameChapter=a.chapter!==''&&a.chapter===b.chapter
   const threshold=sameChapter?0.88:0.90
   if(similarity+1e-9<threshold)continue
   const reason=sameChapter?'SAME_CHAPTER_POSSIBLE_REPHRASE':'CROSS_CHAPTER_TEMPLATE_SIMILARITY'
   pairs.push({
    questionA:a.id,questionB:b.id,questionShaA:a.questionSha256,questionShaB:b.questionSha256,
    sourceFileA:a.file,sourceFileB:b.file,grade:a.grade,subject:a.subject,medium:a.medium,type:a.type,
    chapterA:a.chapter,chapterB:b.chapter,similarity:Number(similarity.toFixed(6)),
    reason,answerTextFingerprintsEqual:Boolean(a.answerFingerprint&&a.answerFingerprint===b.answerFingerprint),
    duplicateConfirmed:false,scientificAnswersCorrectVerified:false,independentReviewerId:null,approved:false
   })
  }
 }
 pairs.sort((x,y)=>x.reason.localeCompare(y.reason)||y.similarity-x.similarity||
   x.questionA.localeCompare(y.questionA)||x.questionB.localeCompare(y.questionB))
 const ids=[...new Set(pairs.flatMap(x=>[x.questionA,x.questionB]))].sort()
 return {
  schemaVersion:'assps-grade910-science-preserving-near-stem-triage-v1',
  scope:'POTENTIAL_TEMPLATE_REUSE_ONLY_NO_AUTOMATIC_DUPLICATE_OR_ANSWER_ACCURACY_VERDICT',
  originalQuestionCount:rows.length,distinctOriginalIdCount:new Set(rows.map(x=>x.id)).size,
  comparedBuckets:groups.size,sameChapterPossibleRephrasePairs:pairs.filter(x=>x.reason==='SAME_CHAPTER_POSSIBLE_REPHRASE').length,
  crossChapterTemplatePairs:pairs.filter(x=>x.reason==='CROSS_CHAPTER_TEMPLATE_SIMILARITY').length,
  uniqueQuestionsForEditorialReview:ids.length,flaggedQuestionIds:ids,
  comparisonPolicy:'Within same grade subject medium type; scientific sign-preserving token-set Jaccard; same chapter >=0.88, cross-chapter >=0.90',
  independentReviewCount:0,confirmedDuplicates:0,approved:0,published:0,pairs
 }
}
if(require.main===module){
 try{
  const result=audit(collectDocuments())
  if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify({
   originalQuestionCount:result.originalQuestionCount,
   comparedBuckets:result.comparedBuckets,
   sameChapterPossibleRephrasePairs:result.sameChapterPossibleRephrasePairs,
   crossChapterTemplatePairs:result.crossChapterTemplatePairs,
   uniqueQuestionsForEditorialReview:result.uniqueQuestionsForEditorialReview,
   examples:result.pairs.slice(0,4).map(x=>({ids:[x.questionA,x.questionB],reason:x.reason,score:x.similarity})),
   approved:0
  },null,2))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={stemTokens,score,collectRows,audit,OUT}
