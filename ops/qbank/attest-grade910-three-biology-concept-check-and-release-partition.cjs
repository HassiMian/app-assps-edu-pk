#!/usr/bin/env node
'use strict'
// AI factual screening = author-side research, NEVER qualified independent
// review or school signoff. All 2,581 original research revisions are frozen.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const SRC=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/biology9Chapter1TopicDrafts.json')
const BASE=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_BIOLOGY3_AI_CONCEPT_SCREENING_AND_SAFE_RELEASE_PARTITION_20261015.json')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const err=x=>{throw Error('GRADE910_BIOLOGY_AI_CONCEPT_SCREEN_'+x)}
const examples=[
 {id:'IX-BIO-2025-C01-T0101-M01',type:'mcq',mark:1,answer:'Genetics',option:'A',urdu:'جینیات',
  reasoning:'Genetics concerns inheritance of characteristics across generations.'},
 {id:'IX-BIO-2025-C01-T0101-M02',type:'mcq',mark:1,answer:'Ecology',option:'C',urdu:'ماحولیات',
  reasoning:'Ecology concerns interactions between organisms and their environments.'},
 {id:'IX-BIO-2025-C01-T0101-S01',type:'short',mark:2,
  answer:'Botany studies plants. Its scope includes plant growth and reproduction.',
  urdu:'نباتیات میں پودوں کا مطالعہ کیا جاتا ہے۔ اس میں پودوں کی نشوونما اور تولید شامل ہیں۔',
  reasoning:'Botany addresses plants; plant growth and reproduction are valid subtopics.'}
]
function assess(){
 const buf=fs.readFileSync(SRC),raw=JSON.parse(buf),index=JSON.parse(fs.readFileSync(BASE))
 const sourceHash=sha(buf),cross=new Map(index.rows.map(x=>[x.questionId,x]))
 if(cross.size!==2581||index.metrics.originalQuestions!==2581)err('FROZEN_SOURCE_UNIVERSE_DRIFT')
 const seen=new Set(),results=[]
 for(const row of examples){
  const q=raw.drafts.find(x=>x.id===row.id),f=cross.get(row.id)
  if(!q||!f||seen.has(row.id)||sha(JSON.stringify(q))!==f.originalRevisionSha256||
     f.originalResearchFileSha256!==sourceHash||q.type!==row.type||
     q.marks!==row.mark||q.chapter.number!==1||q.topicId!=='1.1'||
     q.curriculum.subjectId!=='biology'||q.content.en.answer!==row.answer||
     q.content.ur.answer!==row.urdu)err('ORIGINAL_QUESTION_OR_ANSWER_CHANGED')
  seen.add(row.id)
  if(row.type==='mcq'){
    if(q.correctOptionId!==row.option||q.content.en.options.length!==4||
      q.content.ur.options.length!==4||
      q.content.en.options.find(x=>x.id===row.option)?.text!==row.answer||
      q.content.ur.options.find(x=>x.id===row.option)?.text!==row.urdu)
      err('MCQ_KEY_OR_EN_UR_OPTION_MISMATCH')
    for(const lang of ['en','ur']){
      const a=q.content[lang].options
      if(new Set(a.map(x=>x.text.trim())).size!==4)err('MCQ_AMBIGUOUS_DISTRACTORS')
    }
  }
  results.push({
   originalQuestionId:row.id,originalQuestionRevisionSha256:f.originalRevisionSha256,
   originalSourceFileSha256:sourceHash,grade:9,subject:'biology',chapter:1,
   medium:'dual',marks:q.marks,type:q.type,
   enUrStoredAnswerConsistencyChecked:true,
   authorAiGeneralBiologyConceptCheck:'PASS_GENERAL_BIOLOGY_CONCEPT_ONLY',
   originalSourceAnswerProvenCorrectByOfficialTextbook:false,
   physicalSourcePageIndependentlyVerified:false,
   independentQualifiedSubjectReviewerAuthenticated:false,
   principalSchoolApprovalCryptographicallyAuthenticated:false,
   principalChatFeedback:'SELF_REPORTED_SAHI_UNAUTHENTICATED',
   explanationOfConceptNotTextbookExcerpt:row.reasoning,
   approvalWorkflowStatus:'RESEARCH_SCREENED_PENDING_INDEPENDENT_VERIFICATION',
   paperStudioAcademicallyVerifiedSelectable:false,published:false
  })
 }
 if(results.length!==3)err('UNEXPECTED_SCREENING_SIZE')
 return{
  schema:'assps-grade910-ai-concept-screen-not-human-academic-approval-v1',
  checkedOn:'2026-10-15',academicSessionClaim:'2026-27',
  sourceFileSha256:sourceHash,sourceResearchUniverse:2581,
  screenCount:3,factualConceptSelfScreened:3,
  teacherExperienceSchoolReportedComplete:true,
  generalBiologyAnswerConceptsPass:3,
  separateReviewFacts:{
   pectaaOfficialPublisherOnBookCoverReported:true,
   printedEditionAndPageExactSchoolAdoptionVerified:false,
   applicable2027AnnualBoardEvidenceVerified:false,
   humanIndependentAnswerCheckVerified:false
  },
  results,
  releasePartition:{
   completedExistingPaperStudioFeatureDeploymentOwnedBy:'SAAS_CORE_PRODUCTION_MASTER',
   liveReleaseCertification:'NOT_CERTIFIED_BY_ACADEMIC_MASTER',
   existingVerifiedAcademicQuestionBankSelector:'APPROVED_SIGNED_REVISIONS_ONLY',
   researchedCandidatesAutomaticallyPublished:0,
   candidatesMayRemainResearchDraftsWithoutClaimingVerified:true,
   currentProductionAcademicSeedAuthorized:false,
   currentProductionStudentMarkOrExistingPaperMutationAuthorized:false
  },
  academicApprovedCount:0,verifiedPublishedCount:0,
  academicRelease:'HOLD_SCHOOL_ADOPTION_AND_INDEPENDENT_QUALIFIED_REVIEW',
  sourceScreeningDoesNotReplaceTeacherSignoff:true
 }
}
if(require.main===module){
 try{const result=assess();if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n',{flag:'wx'})
 console.log(JSON.stringify({source:result.sourceFileSha256,conceptsScreened:3,humanAcademicApprovals:0,verifiedPublished:0,release:result.academicRelease}))}
 catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={assess,OUT}
