#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/biology9TopicResearchDrafts.json')
const OUTPUT=path.join(ROOT,'docs/question-bank/ASSPS_BIO9_RESEARCH_URDU_EDITORIAL_REV2_20261008.json')
const DOCKET=path.join(ROOT,'docs/question-bank/ASSPS_BIO9_RESEARCH_URDU_EDITORIAL_REV2_DOCKET_20261008.json')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const EXPECTED_SOURCE_SHA256='d7afb8f8feda76162600ff7b8e3c09cb38e4dc51d9862dd321898f8e5749372a'
const PROPOSALS=Object.freeze({
 'IX-BIO-EM-RESEARCH-C01-T0101-S01':{
  stem:'ایک سائنس دان خردبینی پھپھوندیوں کا مطالعہ کرتا ہے، جبکہ دوسرا جانوروں کے رویّے پر تحقیق کرتا ہے۔ دونوں متعلقہ حیاتیاتی شعبوں کی نشاندہی کریں اور ان کے دائرۂ کار میں فرق بیان کریں۔',
  answer:'خرد حیاتیات (مائیکرو بایولوجی) میں خردبینی جانداروں، جن میں بعض خردبینی پھپھوندیاں بھی شامل ہیں، کا مطالعہ کیا جاتا ہے۔ حیوانیات (زوالوجی) میں جانوروں کی ساخت، افعال، رویّے اور تنوع کا مطالعہ کیا جاتا ہے۔'
 },
 'IX-BIO-EM-RESEARCH-C01-T0101-S02':{
  stem:'ایک تحقیقی رپورٹ خلیوں کی ساخت اور تقسیم کا جائزہ لیتی ہے، جبکہ دوسری بیان کرتی ہے کہ جسم کا کوئی حصہ کیسے کام کرتا ہے۔ حیاتیات کی کون سی شاخیں ان مطالعات سے براہِ راست متعلق ہیں؟',
  answer:'خلویات (سائٹولوجی) میں خلیوں اور ان کی تقسیم جیسے عمل کا مطالعہ کیا جاتا ہے۔ فعلیات (فزیالوجی) میں جسم کے حصوں کے افعال کا مطالعہ کیا جاتا ہے۔'
 },
 'IX-BIO-EM-RESEARCH-C01-T0101-S03':{
  stem:'شکلیات (مورفولوجی) اور تشریح الاعضا (اناٹومی) کسی جاندار کے متعلق مختلف لیکن ایک دوسرے کی تکمیل کرنے والی معلومات کیسے فراہم کرتی ہیں؟',
  answer:'شکلیات (مورفولوجی) جاندار کی شکل و صورت اور ظاہری ساختی خصوصیات بیان کرتی ہے، جبکہ تشریح الاعضا (اناٹومی) اس کی اندرونی جسمانی ساخت کا مطالعہ کرتی ہے۔ دونوں شعبے مل کر جاندار کی ساخت کو زیادہ مکمل طور پر سمجھنے میں مدد دیتے ہیں۔'
 },
 'IX-BIO-EM-RESEARCH-C01-T0101-S04':{
  stem:'جب ماہرینِ حیاتیات کو غیر مانوس جانداروں کا آپس میں موازنہ کرنا ہو تو درجہ بندی (ٹیکسانومی) کیوں مفید ہوتی ہے؟',
  answer:'درجہ بندی (ٹیکسانومی) جانداروں کو ان کی مماثلتوں اور اختلافات کی بنیاد پر گروہوں میں منظم کرتی ہے۔ اس سے ماہرین جانداروں کے تنوع کا موازنہ اور ان کے باہمی تعلقات کا مطالعہ کر سکتے ہیں۔'
 }
})
function build(sourceBytes){
 if(sha(sourceBytes)!==EXPECTED_SOURCE_SHA256)throw Error('PARENT_SOURCE_BYTES_CHANGED')
 const original=JSON.parse(sourceBytes.toString())
 if(original.schemaVersion!=='assps-topic-research-examples-v1'||
    original.publicationAllowed!==false||original.liveImportAllowed!==false||
    original.drafts?.length<4)throw Error('ORIGINAL_AUTHORING_SOURCE_IDENTITY_DRIFT')
 const idList=Object.keys(PROPOSALS).sort()
 const rows=idList.map(id=>{
  const matches=original.drafts.filter(q=>q.id===id)
  if(matches.length!==1)throw Error('ORIGINAL_QUESTION_ID_NOT_UNIQUE:'+id)
  const q=matches[0],proposed=PROPOSALS[id]
  if(q.type!=='short'||q.curriculum?.grade!==9||q.content?.en?.stem?.trim().length<20||
     q.content?.en?.answer?.trim().length<20||q.content?.ur?.stem||q.content?.ur?.answer)
    throw Error('ORIGINAL_QUESTION_NOT_IN_EXPECTED_UNTRANSLATED_STATE:'+id)
  if(q.review?.status!=='draft'||q.source?.catalogRecordId!=='pectaa-catalog-009'||
     !/^[a-f0-9]{64}$/.test(q.source?.pdfSha256||''))
    throw Error('ORIGINAL_SOURCE_OR_APPROVAL_DRIFT:'+id)
  const translated={...q,content:{...q.content,ur:{...proposed}},
    review:{...q.review,checks:Object.fromEntries(Object.keys(q.review.checks).map(k=>[k,false])),
      status:'draft'},
    editorialRevision:{
     type:'INDEPENDENT_HUMAN_REVIEW_REQUIRED',
     revision:2,parentQuestionSha256:sha(JSON.stringify(q)),
     translationAuthorType:'AI_EDITORIAL_PROPOSAL_NOT_INDEPENDENT_REVIEWER',
     questionOrigin:'ORIGINAL_CONCEPTUAL_NOT_TEXTBOOK_EXERCISE',
     schoolAdoptedBookVerified:false,physicalPageVerified:false,
     terminologyReviewPending:true,semanticEquivalencePending:true,
     note:id.endsWith('S01')?'Subject reviewer must confirm scope of microbiology versus mycology for the fungi example.':'Subject and Urdu language reviewers must verify vocabulary and meaning.'
    }}
  return translated
 })
 const full={
  schemaVersion:'assps-bio9-research-urdu-editorial-rev2-v1',
  parentAuthoringFile:path.relative(ROOT,SOURCE),
  parentAuthoringSha256:sha(sourceBytes),
  revisionType:'TRANSLATION_COMPLETION_CANDIDATE_ONLY',
  originalQuestionCount:original.drafts.length,uniqueQuestionsAdded:0,
  schoolAdoptedBookVerified:false,sourcePrintedPageVerified:false,
  translationIndependentlyReviewed:false,academicallyApproved:false,
  releaseEligible:false,liveImportAllowed:false,
  questions:rows
 }
 const bytes=Buffer.from(JSON.stringify(full,null,2)+'\n')
 const docket={
  schemaVersion:'assps-bio9-research-urdu-editorial-review-docket-v1',
  originalFile:full.parentAuthoringFile,originalFileSha256:full.parentAuthoringSha256,
  revisionFile:path.relative(ROOT,OUTPUT),revisionFileSha256:sha(bytes),
  questionCount:rows.length,uniqueQuestionsAdded:0,
  sourceVerified:0,translationReviewed:0,academicReviewed:0,
  approved:0,published:0,
  items:rows.map(q=>({
   questionId:q.id,originalQuestionSha256:q.editorialRevision.parentQuestionSha256,
   proposedRevisionSha256:sha(JSON.stringify(q)),
   languageCandidate:'urdu',sourceGrade:9,
   reviewState:'PENDING_INDEPENDENT_TRANSLATION_AND_BIOLOGY_REVIEW',
   scientificScopeFlag:q.id.endsWith('S01')?'MICROBIOLOGY_VS_MYCOLOGY_TERMINOLOGY_CONFIRMATION':null,
   reviewerId:null,independentAcademicReviewerId:null,
   sourcePageVerified:false,semanticEquivalenceVerified:false,
   approved:false,published:false
  }))
 }
 return{full,docket,bytes,reviewBytes:Buffer.from(JSON.stringify(docket,null,2)+'\n')}
}
function write(){
 const r=build(fs.readFileSync(SOURCE))
 fs.writeFileSync(OUTPUT,r.bytes)
 fs.writeFileSync(DOCKET,r.reviewBytes)
 return r
}
if(require.main===module){
 const r=process.argv.includes('--write')?write():build(fs.readFileSync(SOURCE))
 console.log(JSON.stringify({originalFileSha256:r.full.parentAuthoringSha256,
 revisionFileSha256:sha(r.bytes),reviewDocketSha256:sha(r.reviewBytes),
 questionCount:r.full.questions.length,uniqueQuestionsAdded:0,reviewed:0,approved:0,published:0},null,2))
}
module.exports={build,PROPOSALS,SOURCE,OUTPUT,DOCKET}
