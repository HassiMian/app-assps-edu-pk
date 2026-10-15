#!/usr/bin/env node
'use strict'
// Objective token-level editorial heuristics, NOT language/science certification.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const root=path.resolve(__dirname,'../..'),base=path.join(root,'docs/question-bank')
const src=path.join(base,'ASSPS_GRADE910_66_CURATED_MCQ_OPTION_REVISION_DRAFTS_20261015.json')
const out=path.join(base,'ASSPS_GRADE910_66_RESIDUAL_OPTION_BIAS_RISKS_20261015.json')
const summary=path.join(base,'ASSPS_GRADE910_66_RESIDUAL_OPTION_BIAS_RISKS_20261015.md')
const hash=b=>crypto.createHash('sha256').update(b).digest('hex')
const absolute=/(?:\b(?:only|always|never|all|every|none|without|no|permanently|completely|entirely|exactly|impossible)\b|صرف|ہمیشہ|ہر|کبھی|بغیر|لازماً|مکمل)/iu
function report(){
 const raw=fs.readFileSync(src),x=JSON.parse(raw)
 if(x.rows.length!==66||x.remainingStrongLengthOutliersAfterProposals!==0)
  throw Error('GRADE910_66_RESIDUAL_SOURCE_NOT_FROZEN')
 const rows=[]
 for(const r of x.rows){
  const q=r.proposal
  if(q.academicallyApproved||q.published)throw Error('GRADE910_66_RESIDUAL_CANNOT_AUDIT_APPROVED')
  const correct=q.options.find(o=>o.id===q.proposedCorrectOptionId)
  if(!correct||correct.text!==r.originalReferenceAnswerText)
   throw Error('GRADE910_66_RESIDUAL_KEY_SOURCE_MISMATCH')
  const others=q.options.filter(o=>o.id!==q.proposedCorrectOptionId)
  const distractorCues=others.map(o=>({option:o.id,lexicalAbsoluteCue: absolute.test(o.text)}))
  const count=distractorCues.filter(o=>o.lexicalAbsoluteCue).length
  rows.push({
   originalId:r.originalId,originalRevisionSha256:r.originalRevisionSha256,
   proposalSha256:r.proposalSha256,medium:q.medium,subject:q.subject,
   sourceReferenceCorrectHasAbsoluteCue:absolute.test(correct.text),
   distractorsWithAbsoluteCue:count,individualDistractorFlags:distractorCues,
   multipleIncorrectOptionsCarryExclusiveOrAbsolutePhrasing:count>=2,
   correctOptionStrictlyLongest:r.correctOptionStillStrictlyLongest,
   questionNeedsRealSourceAndMeaningReview:true,
   sourceAnswerCorrectnessAndTranslationNotVerified:true,
   academicallyApproved:false,published:false
  })
 }
 const aggregate={
  total:rows.length,sourceSha256:hash(raw),
  alternativesChecked:rows.length*3,
  incorrectOptionsWithAbsoluteWordCue:rows.reduce((s,r)=>s+r.distractorsWithAbsoluteCue,0),
  referenceAnswersWithAbsoluteWordCue:rows.filter(r=>r.sourceReferenceCorrectHasAbsoluteCue).length,
  questionsWithAnySuchDistractorCue:rows.filter(r=>r.distractorsWithAbsoluteCue>0).length,
  questionsWithTwoOrMoreSuchDistractors:rows.filter(r=>r.multipleIncorrectOptionsCarryExclusiveOrAbsolutePhrasing).length,
  correctOptionStillStrictlyLongest:rows.filter(r=>r.correctOptionStrictlyLongest).length,
  originalStrongLengthOutliers:66,newStrongLengthOutliers:0,
  caution:'Token-level polarity or exclusive-word cues do NOT prove option factual incorrectness or poor quality. Disproportionate rates identify content requiring a real independent human reviewer.',
  independentlyQualifiedAcademicApprovals:0,published:0
 }
 return{schema:'assps-grade910-66-residual-editorial-choice-cue-audit-v1',aggregate,rows}
}
function write(){
 const result=report();fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n')
 const a=result.aggregate
 fs.writeFileSync(summary,[
 '# ASSPS Grade IX–X 66 MCQs — residual editorial bias risks', '',
 'The prior 66 extreme correct-choice length outliers have been eliminated in AI drafts; **this alone is not sufficient MCQ quality or academic correctness verification**.',
 '',
 '- Individual options checked: 66×4; alternative distractors: **'+a.alternativesChecked+'**.',
 '- Distractors containing absolute / exclusive cue words (English and Urdu heuristic): **'+a.incorrectOptionsWithAbsoluteWordCue+'**.',
 '- Recorded original reference answers with those same cue words: **'+a.referenceAnswersWithAbsoluteWordCue+'**.',
 '- Unique questions with one or more flagged distractors: **'+a.questionsWithAnySuchDistractorCue+'**.',
 '- Unique questions with at least two flagged distractors: **'+a.questionsWithTwoOrMoreSuchDistractors+'**.',
 '- Correct options strictly longest (though not >1.5× average): **'+a.correctOptionStillStrictlyLongest+'**.',
 '- Correct options with extreme length cue: **0**.',
 '',
 'These are objective surface-form **editorial risks**, not proof of correctness or error. Actual question-answer content, bilingual equivalence and whether each alternative is unambiguously wrong require qualified subject and Urdu review.',
 '',
 '**Real faculty review = 0; school-adopted edition proof = 0; publication = 0; Paper Studio verified selection = not allowed.**'
 ].join('\n')+'\n')
 return{...a,artifactSha256:hash(fs.readFileSync(out))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={report,write,out,summary,absolute}
