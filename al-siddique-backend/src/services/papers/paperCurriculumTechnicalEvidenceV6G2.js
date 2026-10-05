const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.join(__dirname,'curriculumReviewedEvidenceV6G2')
const PINS=Object.freeze({
 biology9EnglishEvidenceLedger:'5f67750dd12749a3a7b0dae0ad5ab1125f275e405e92f5137703dd3a66700667',
 biology9UrduEvidenceLedger:'c2208cacada551073edc15d9338874768aaa508a4eeba82f8a775564ca2ba09f',
 biology9Chapter1SourceIssues:'8b94fbb99340ca5558c936e7cefe0e628bf083b174bacfc7c4a16d6d5b83f524',
 biology9SourceReacquisitionEvidence_20261005:'c4afa9d06b2e4299b624a5f4f9ef6b17b32fd44978d9274923ee5b9a86286332',
})
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
function loadPinned(name){const f=path.join(ROOT,`${name}.json`);const bytes=fs.readFileSync(f);if(sha(bytes)!==PINS[name])throw Error(`V6-G2 evidence pin mismatch: ${name}`);return JSON.parse(bytes)}
const ascending=xs=>xs.every((x,i)=>i===0||x>xs[i-1])
const exactChapterNumbers=chs=>chs.length===11&&chs.map(x=>Number(x.number)).every((n,i)=>n===i+1)
function deriveTechnicalEvidence(){
 const en=loadPinned('biology9EnglishEvidenceLedger'), ur=loadPinned('biology9UrduEvidenceLedger'), issues=loadPinned('biology9Chapter1SourceIssues'), reacq=loadPinned('biology9SourceReacquisitionEvidence_20261005')
 const enPages=(en.chapters||[]).map(x=>Number(x.verifiedPhysicalStartPage));const urPages=(ur.chapters||[]).map(x=>Number(x.verifiedPhysicalStartPage))
 const sourceIdentityConsistent=Boolean(
   reacq?.sources?.en?.pdfSha256===en?.source?.pdfSha256&&reacq?.sources?.ur?.pdfSha256===ur?.source?.pdfSha256&&
   reacq?.sources?.en?.ledgerSha256===PINS.biology9EnglishEvidenceLedger&&reacq?.sources?.ur?.ledgerSha256===PINS.biology9UrduEvidenceLedger&&
   issues?.sourcePdfSha256===en?.source?.pdfSha256&&issues?.urduSourcePdfSha256===ur?.source?.pdfSha256)
 const enChapterMap=exactChapterNumbers(en.chapters||[])&&ascending(enPages)&&enPages.every(p=>p>=1&&p<=Number(en?.source?.pdfPages||0))
 const urChapterMap=exactChapterNumbers(ur.chapters||[])&&ascending(urPages)&&urPages.every(p=>p>=1&&p<=Number(ur?.source?.pdfPages||0))
 const enExerciseRefs=Number(en?.totals?.exerciseSourceRefs||0), urExerciseRefs=Number(ur?.totals?.chapter1ExerciseSourceRefs||0)
 const openAcademicIssues=Array.isArray(issues?.issues)?issues.issues.length:0
 const approvedQuestions=Math.min(Number(en?.release?.realApprovedQuestionCount||0),Number(ur?.release?.realApprovedQuestionCount||0))
 const gates={
  pinnedEvidenceBytes:true,sourceIdentityConsistent,
  englishChapterMapTechnicallyValid:enChapterMap,urduChapterMapTechnicallyValid:urChapterMap,
  englishExerciseReferencesPresent:enExerciseRefs>0,urduExerciseReferencesPresent:urExerciseRefs>0,
  chapterCardinalityAligned:(en.chapters||[]).length===(ur.chapters||[]).length&&enChapterMap&&urChapterMap,
  binaryIntegrityVerified:reacq?.approval?.binaryIntegrityVerified===true,
  ledgerBindingVerified:reacq?.approval?.ledgerBindingVerified===true,
  chapterIndexIndependentApproval:reacq?.approval?.chapterIndexIndependentApproval===true,
  exerciseIndexIndependentApproval:reacq?.approval?.exerciseIndexIndependentApproval===true,
  bilingualEditionEquivalenceApproved:reacq?.approval?.bilingualEditionEquivalenceApproved===true,
  academicQuestionReleaseApproved:reacq?.approval?.academicQuestionReleaseApproved===true&&approvedQuestions>0,
  productionPublisherApproved:reacq?.approval?.productionPublisherApproved===true,
 }
 const technicalKeys=['pinnedEvidenceBytes','sourceIdentityConsistent','englishChapterMapTechnicallyValid','urduChapterMapTechnicallyValid','englishExerciseReferencesPresent','urduExerciseReferencesPresent','chapterCardinalityAligned','binaryIntegrityVerified','ledgerBindingVerified']
 const technicalValid=technicalKeys.every(k=>gates[k])
 const approvalKeys=['chapterIndexIndependentApproval','exerciseIndexIndependentApproval','bilingualEditionEquivalenceApproved','academicQuestionReleaseApproved','productionPublisherApproved']
 const approvalComplete=approvalKeys.every(k=>gates[k])
 const blockers=Object.entries(gates).filter(([,ok])=>!ok).map(([k])=>k.replace(/[A-Z]/g,m=>'_'+m).toUpperCase())
 return {architectureVersion:'v6-g2-technical-evidence-1',scope:{grade:9,subject:'Biology'},technicalValid,approvalComplete,gates,metrics:{englishChapters:(en.chapters||[]).length,urduChapters:(ur.chapters||[]).length,englishExerciseSourceRefs:enExerciseRefs,urduExerciseSourceRefs:urExerciseRefs,englishTopicIndexEntries:Number(en?.totals?.topicIndexEntries||0),openAcademicIssues,approvedQuestions},blockers,policy:{technicalValidationIsAcademicApproval:false,automaticQuestionReleaseAllowed:false,automaticBilingualEquivalenceClaimAllowed:false},sourceCommit:'d6b294db53a9aa5a8f19c6bae5ecbb673996be5c'}
}
module.exports={deriveTechnicalEvidence,PINS}
