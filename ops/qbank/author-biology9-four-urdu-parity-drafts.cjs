#!/usr/bin/env node
'use strict'
// New independent Urdu CANDIDATE translations. Never overwrite the original English source.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const SOURCE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/biology9TopicResearchDrafts.json')
const DOC=path.join(ROOT,'docs/question-bank')
const NAME='ASSPS_BIOLOGY9_FOUR_UNREVIEWED_URDU_PARITY_DRAFTS_20261010'
const ORIGINAL_SHA='d7afb8f8feda76162600ff7b8e3c09cb38e4dc51d9862dd321898f8e5749372a'
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const reject=m=>{throw Error('BIO9_URDU_PARITY_'+m)}
const DRAFTS=Object.freeze({
'IX-BIO-EM-RESEARCH-C01-T0101-S01':{
 stem:'ایک سائنس دان خوردبینی پھپھوندیوں کا مطالعہ کرتا ہے، جبکہ دوسرا جانوروں کے رویّے کا جائزہ لیتا ہے۔ حیاتیات کی دونوں متعلقہ شاخوں کے نام لکھیں اور ان کے دائرۂ مطالعہ میں فرق واضح کریں۔',
 answer:'خرد حیاتیات (مائیکرو بایولوجی) میں خرد جانداروں، مثلاً خوردبینی پھپھوندیوں، کا مطالعہ کیا جاتا ہے۔ حیوانیات (زوالوجی) میں جانوروں کی ساخت، افعال، رویّے اور تنوع کا مطالعہ کیا جاتا ہے۔'
},
'IX-BIO-EM-RESEARCH-C01-T0101-S02':{
 stem:'ایک رپورٹ میں خلیوں کی ساخت اور تقسیم پر تحقیق ہے، جبکہ دوسری میں جسم کے کسی عضو کے کام کرنے کی وضاحت ہے۔ ان دونوں سے متعلق حیاتیات کی کون سی شاخیں ہیں؟',
 answer:'خلویات (سائٹولوجی) میں خلیوں اور ان کی تقسیم جیسے عمل کا مطالعہ کیا جاتا ہے۔ فعلیات (فزیالوجی) میں جسم کے اعضا کے افعال کا مطالعہ کیا جاتا ہے۔'
},
'IX-BIO-EM-RESEARCH-C01-T0101-S03':{
 stem:'شکلیات اور علمِ تشریح کسی جاندار کے بارے میں مختلف مگر ایک دوسرے کی تکمیل کرنے والی معلومات کیسے فراہم کرتے ہیں؟',
 answer:'شکلیات (مورفولوجی) جاندار کی شکل، ظاہری بناوٹ اور ساختی خصوصیات بیان کرتی ہے، جبکہ علمِ تشریح (اناٹومی) اس کی اندرونی جسمانی ساخت اور اعضا کی ترتیب کا مطالعہ کرتا ہے۔ دونوں مل کر جاندار کی زیادہ مکمل تصویر پیش کرتے ہیں۔'
},
'IX-BIO-EM-RESEARCH-C01-T0101-S04':{
 stem:'جب ماہرینِ حیاتیات کو غیر مانوس جانداروں کا موازنہ کرنا ہو تو درجہ بندی (ٹیکسانومی) کیوں مفید ہوتی ہے؟',
 answer:'درجہ بندی (ٹیکسانومی) جانداروں کو مماثلتوں اور اختلافات کی بنیاد پر گروہوں میں منظم کرتی ہے۔ اس سے انواع کا تقابل، حیاتیاتی تنوع کی پہچان اور ان کے باہمی تعلقات کے مطالعے میں مدد ملتی ہے۔'
}
})
const ids=Object.keys(DRAFTS)
const urduLetters=/[\u0600-\u06ff]/g
function loadInputs(){const bytes=fs.readFileSync(SOURCE);return{bytes,original:JSON.parse(bytes)}}
function build({bytes,original}){
 if(!Buffer.isBuffer(bytes)||sha(bytes)!==ORIGINAL_SHA)reject('ORIGINAL_SOURCE_SHA_DRIFT')
 if(JSON.stringify(JSON.parse(bytes))!==JSON.stringify(original))reject('ORIGINAL_PARSED_SOURCE_DRIFT')
 if(!Array.isArray(original.drafts)||original.drafts.length!==6||
  original.publicationAllowed!==false||original.liveImportAllowed!==false)reject('ORIGINAL_AUTHORING_SCOPE_DRIFT')
 const raw=new Map(original.drafts.map(q=>[q.id,q]))
 if(raw.size!==6||ids.length!==4)reject('EXPECTED_RESEARCH_QUESTION_IDS_DRIFT')
 const rows=[]
 for(const id of ids){
  const originalQuestion=raw.get(id),translated=DRAFTS[id]
  if(!originalQuestion||originalQuestion.type!=='short'||originalQuestion.marks!==2||
    originalQuestion.curriculum?.grade!==9||originalQuestion.curriculum?.subjectId!=='biology'||
    originalQuestion.source?.catalogRecordId!=='pectaa-catalog-009'||
    originalQuestion.review?.status!=='draft'||
    Object.values(originalQuestion.review.checks||{}).some(x=>x!==false)||
    originalQuestion.content?.ur?.stem!==''||originalQuestion.content?.ur?.answer!==''||
    !originalQuestion.content?.en?.stem||!originalQuestion.content?.en?.answer)
    reject('ORIGINAL_MISSING_URDU_RECORD_CHANGED:'+id)
  if(!translated.stem||!translated.answer||!translated.stem.match(urduLetters)?.length||
     translated.answer.match(urduLetters)?.length<30)
    reject('URDU_CANDIDATE_TEXT_INVALID:'+id)
  const revision={originalId:id,originalQuestionSha256:sha(JSON.stringify(originalQuestion)),
   originalEnglishQuestionSha256:sha(JSON.stringify(originalQuestion.content.en)),
   proposedUrduStem:translated.stem,proposedUrduAnswer:translated.answer,marks:2}
  rows.push({originalQuestionId:id,
   sourceOriginalQuestionRevisionSha256:revision.originalQuestionSha256,
   sourceEnglishStemAnswerSha256:revision.originalEnglishQuestionSha256,
   proposedUrduRevisionSha256:sha(JSON.stringify(revision)),
   marks:2,unreviewedUrduStem:translated.stem,unreviewedUrduAnswer:translated.answer,
   originalSourceFile:'biology9TopicResearchDrafts.json',sourcePdfSha256Claim:originalQuestion.source.pdfSha256,
   sourcePageClaimNotPhysicallyVerified:originalQuestion.source.page,
   actualTextbookEditionSchoolAdoptionVerified:false,
   qualifiedIndependentBiologyReviewed:false,qualifiedIndependentUrduReviewed:false,
   englishUrduMeaningParityIndependentlyReviewed:false,
   independentReviewerId:null,approvalRevisionId:null,academicallyApproved:false,published:false})
 }
 return{schemaVersion:'assps-grade9-biology-four-urdu-unreviewed-revision-bound-drafts-v1',
  originalSourceFile:'biology9TopicResearchDrafts.json',originalSourceRawSha256:ORIGINAL_SHA,
  originalQuestionRecordsRetained:6,originalEmptyUrduFieldsRetained:4,
  newlyDraftedSeparateUrduCandidateRevisions:4,schoolSourcePageVerified:0,qualifiedIndependentReviewed:0,
  academicallyApproved:0,verifiedPublished:0,
  publicationDecision:'DENY_VERIFIED_PUBLICATION_AND_PRODUCTION_IMPORT',
  warning:'Separate unreviewed AI-authored Urdu research proposals, NOT original seed modifications, not independently checked translations and NOT Paper Studio selectable.',rows}
}
function markdown(d){
 return ['# Grade IX Biology — Four Urdu parity candidates for independent academic review','',
  '**All translations below are new research drafts; none is verified, approved, or ready for Paper Studio publication.**','',
  'Original English source questions and their intentionally blank Urdu fields remain UNCHANGED.',
  'Each new proposal is attached to the original exact question ID and full source-revision SHA256.','',
  ...d.rows.flatMap(q=>[
   '## '+q.originalQuestionId,'',
   '**Unreviewed Urdu question:** '+q.unreviewedUrduStem,'',
   '**Unreviewed Urdu answer:** '+q.unreviewedUrduAnswer,'',
   'Original SHA256: '+q.sourceOriginalQuestionRevisionSha256,
   'Proposed Urdu revision SHA256: '+q.proposedUrduRevisionSha256,''
  ]),
  'Qualified Biology and qualified Urdu teacher must independently sign off exact question and translated answer; school adopted source/printed page still missing.',
  '**Release DENY / no production seeding.**',''].join('\n')
}
function main(){
 const d=build(loadInputs()),file=path.join(DOC,NAME)
 fs.writeFileSync(file+'.json',JSON.stringify(d,null,2)+'\n')
 fs.writeFileSync(file+'.md',markdown(d))
 console.log(JSON.stringify({drafts:d.newlyDraftedSeparateUrduCandidateRevisions,approved:d.academicallyApproved,
  manifestSHA256:sha(fs.readFileSync(file+'.json')),originalFileSha256:d.originalSourceRawSha256}))
}
if(require.main===module)main()
module.exports={loadInputs,build,markdown,sha,NAME,SOURCE}
