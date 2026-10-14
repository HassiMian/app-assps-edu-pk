#!/usr/bin/env node
'use strict'
/** Review-only original question drafts. No live DB import or autoapproval. */
const fs=require('node:fs')
const path=require('node:path')
const RECIPE={mcq:5,short:5,long:1}
function assessDraft(doc,anchors){
 const findings=[]
 const counts={mcq:0,short:0,long:0}
 const keyCounts={A:0,B:0,C:0,D:0}
 const seenIds=new Set(),seenText=new Set()
 if(doc.academicallyApproved!==false||doc.productionQuestionBankImportAllowed!==false||
    doc.releaseEligible!==false||doc.independentAnswerReview!==false||
    doc.independentCurriculumReview!==false||doc.sourceExerciseVerified!==false)
     findings.push('DRAFT_POLICY_BYPASS')
 if(doc.questionsAuthorship!=='NEW_ORIGINAL_ASSPS_WORKING_DRAFT_NOT_EXTRACTED_FROM_TEXTBOOK')
     findings.push('AUTHORSHIP_SCOPE_MISMATCH')
 if(doc.grade!=='9th'||doc.subject!=='Biology'||doc.chapterNo!=='1'||
    doc.evidenceSourceRecordId!==anchors.sourceRecordId||
    doc.evidencePdfSha256!==anchors.expectedSha256)
     findings.push('UNVERIFIED_SOURCE_OR_GRADE')
 const chapter=anchors.chapters.find(x=>x.chapter===Number(doc.chapterNo))
 if(!chapter || JSON.stringify(doc.chapterSourcePrintedPages)!==
                   JSON.stringify([chapter.printedPageStart,chapter.printedPageEnd]))
     findings.push('CHAPTER_RANGE_DRIFT')
 if(doc.questionLevelSourcePage!==null)findings.push('FALSE_PER_QUESTION_SOURCE_PAGE')
 if(!Array.isArray(doc.questions))findings.push('MISSING_QUESTIONS')
 for(const [i,q] of (doc.questions||[]).entries()){
   if(!RECIPE.hasOwnProperty(q.type)){findings.push('UNSUPPORTED_TYPE:'+i);continue}
   counts[q.type]++
   if(!q.localId||seenIds.has(q.localId))findings.push('MISSING_OR_DUPLICATE_ID:'+i)
   seenIds.add(q.localId)
   const normalized=String(q.questionText||'').trim().replace(/\s+/g,' ').toLowerCase()
   if(normalized.length<35 || seenText.has(normalized))findings.push('INVALID_OR_DUPLICATE_PROMPT:'+i)
   seenText.add(normalized)
   if(q.type==='mcq'){
     if(q.marks!==1 || !Array.isArray(q.options)||q.options.length!==4||
        new Set(q.options.map(x=>String(x).toLowerCase().trim())).size!==4||
        q.options.some(x=>String(x).trim().length<5))findings.push('INVALID_MCQ_OPTIONS:'+i)
     if(!['A','B','C','D'].includes(q.correctOption))findings.push('INVALID_MCQ_KEY:'+i)
     else keyCounts[q.correctOption]++
     if(String(q.answerExplanation||'').trim().length<20)findings.push('UNEXPLAINED_MCQ_KEY:'+i)
   }
   if(q.type==='short'&&(q.marks!==2||String(q.modelAnswer||'').trim().length<35))
     findings.push('INVALID_SHORT_ANSWER:'+i)
   if(q.type==='long'&&(q.marks!==5||!Array.isArray(q.markingPoints)||
      q.markingPoints.length!==5||q.markingPoints.some(x=>String(x).trim().length<12)))
     findings.push('INVALID_LONG_RUBRIC:'+i)
 }
 for(const [kind,minimum] of Object.entries(RECIPE)){
   if(counts[kind]<minimum)findings.push('INSUFFICIENT_ORIGINAL_DRAFTS:'+kind)
 }
 const total=RECIPE.mcq*1+RECIPE.short*2+RECIPE.long*5
 if(doc.proposedTwentyMarkRecipe?.totalMarks!==total)findings.push('INVALID_RECIPE_MARKS')
 if(counts.mcq>=12 && Math.max(...Object.values(keyCounts))>counts.mcq/2)
   findings.push('MCQ_KEY_DISTRIBUTION_TOO_SKEWED')
 return {safe:findings.length===0,findings,questionCounts:counts,
    mcqKeyCounts:keyCounts,canComposeOriginalTwentyMarkReviewPaper:findings.length===0,
    academicallyApproved:false,productionImportAllowed:false}
}
function main(){
 const args=process.argv.slice(2),val=k=>args[args.indexOf(k)+1]
 if(!args.includes('--draft')||!args.includes('--anchors'))throw Error('REQUIRES_--draft_AND_--anchors')
 const draft=JSON.parse(fs.readFileSync(path.resolve(val('--draft'))))
 const anchors=JSON.parse(fs.readFileSync(path.resolve(val('--anchors'))))
 const report=assessDraft(draft,anchors)
 console.log(JSON.stringify(report,null,2))
 if(!report.safe)process.exitCode=2
}
if(require.main===module)try{main()}catch(e){console.error('DRAFT_GATE_FAIL',e.message);process.exitCode=2}
module.exports={assessDraft}
