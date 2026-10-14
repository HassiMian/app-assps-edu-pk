#!/usr/bin/env node
'use strict'
// Genre- and topic-specific evaluation criteria, not fixed model essays.
// Intentionally preserves creative answer variation and all historical revisions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const BASE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const V2=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CORRECTION_INTEGRITY_VERIFIED_DOCKET_20261014.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_EIGHT_ESSAY_SPECIFIC_ADVISORY_RUBRICS_20261014.json')
const SHA=b=>crypto.createHash('sha256').update(b).digest('hex')
const proposed={
 'IX-ENG-ORIG-20261008-W001':[
  [3,'Describe practical ways students can serve the community without spending money, such as helping someone learn or organizing a clean-up.'],
  [2,'Explain a clear benefit to another person or the community with relevant concrete examples.'],
  [2,'Provide a connected, coherent paragraph within the requested 120–150 words.'],
  [1,'Use accurate and understandable English grammar, vocabulary and punctuation.']
 ],
 'IX-ENG-ORIG-20261008-W002':[
  [2,'State a clear position either for OR against holding a student-run school exhibition.'],
  [3,'Offer at least two relevant reasons about learning, teamwork, workload or resources, supporting the chosen position.'],
  [1,'Acknowledge one practical trade-off or address a reasonable counterargument.'],
  [2,'Use persuasive, coherent paragraph organization and clear grammatical English.']
 ],
 'IX-ENG-ORIG-20261008-W003':[
  [1,'Open with an appropriate greeting or engaging statement for a student audience.'],
  [3,'Explain why fair access to books, connectivity or learning support matters to student opportunity.'],
  [2,'Offer at least one workable inclusive action or example without inventing evidence.'],
  [1,'Conclude with a clear appeal or memorable closing thought.'],
  [1,'Use accessible, coherent spoken English suitable for approximately one minute.']
 ],
 'IX-ENG-ORIG-20261008-W004':[
  [2,'Write 8–10 clearly identifiable exchanges with two consistent student speakers.'],
  [2,'Convey accurate, respectful wildlife awareness and why habitat protection matters.'],
  [2,'Plan a feasible school activity, including audience, communication or role allocation.'],
  [1,'Ensure dialogue turns respond naturally to the other speaker.'],
  [1,'Use correct and age-appropriate English language and punctuation.']
 ],
 'IX-URDU-GR-ESS01':[
  [1,'کہانی کا واضح آغاز اور مسئلے یا صورتحال کا تعارف شامل ہو۔'],
  [2,'کرداروں کا باہمی تعاون اور مسئلہ حل کرنے کا مربوط واقعہ پیش کیا جائے۔'],
  [1,'اختتام میں اتحاد اور تعاون کی اہمیت مناسب انداز میں ظاہر ہو۔'],
  [1,'اصل انداز، رواں اردو اور قابلِ فہم جملوں کا استعمال ہو۔']
 ],
 'IX-URDU-GR-ESS02':[
  [1,'طالب علم اور استاد کے کردار اور ان کی باری واضح ہوں۔'],
  [1,'وقت کی پابندی کی اہمیت کو مکالمے میں درست طور پر بیان کیا جائے۔'],
  [1,'تاخیر سے بچنے کی ایک قابلِ عمل تجویز شامل ہو۔'],
  [1,'گفتگو فطری، مربوط اور مناسب اختتام کے ساتھ ہو۔'],
  [1,'زبان، املا اور تہذیب پر مبنی انداز درست ہو۔']
 ],
 'X-URDU-GR-ESS01':[
  [1,'عنوان ”محنت کامیابی کی کنجی ہے“ کے مطابق مناسب تمہید ہو۔'],
  [2,'محنت، مسلسل کوشش اور ذمہ داری کی اہمیت واضح دلیل سے سمجھائی جائے۔'],
  [1,'ایک یا دو موضوع سے متعلق عملی مثالیں دی جائیں۔'],
  [1,'مربوط اختتام، زبان کی روانی اور درست املا شامل ہو۔']
 ],
 'X-URDU-GR-ESS02':[
  [1,'دو طلبہ کے درمیان فطری اور باری باری گفتگو ہو۔'],
  [2,'سوشل میڈیا استعمال میں وقت کی حد اور تعلیمی و غیرتعلیمی استعمال کے توازن پر بات ہو۔'],
  [1,'غلط معلومات کی تصدیق اور ذاتی رازداری کے قابلِ عمل اصول بیان ہوں۔'],
  [1,'مناسب اختتام، احترام پر مبنی زبان اور درست املا ہو۔']
 ]
}
function originalMap(){
 const a=new Map()
 for(const f of fs.readdirSync(BASE).filter(f=>f.endsWith('.json')).sort()){
  let raw,j
  try{raw=fs.readFileSync(path.join(BASE,f));j=JSON.parse(raw)}catch(_){continue}
  for(const q of j.drafts||j.questions||j.items||[]){
   const id=q.id||q.originalQuestionId||q.questionId
   if(id&&proposed[id]){
    if(a.has(id))throw Error('DUPLICATED_ESSAY_ORIGINAL:'+id)
    a.set(id,{q,sourceFile:f,fileSha:SHA(raw),revisionSha:SHA(JSON.stringify(q))})
   }
  }
 }
 return a
}
function build(){
 const official=require('./verify-grade910-processed-correction-integrity-20261014.cjs').assess()
 if(JSON.stringify(official)!==JSON.stringify(JSON.parse(fs.readFileSync(V2))))
  throw Error('ISSUED_INTEGRITY_QUEUE_CHANGED')
 const ids=official.rows.filter(x=>x.signals.includes('ESSAY_REFERENCE_BRIEF'))
 if(ids.length!==8||Object.keys(proposed).length!==8)throw Error('EXPECTED_8_INDEPENDENT_ESSAYS')
 const sources=originalMap()
 const out=[]
 for(const r of ids){
  const q=sources.get(r.originalId)
  if(!q||q.fileSha!==r.sourceFileSha256||q.revisionSha!==r.originalRevisionSha256)
   throw Error('ESSAY_ORIGINAL_SOURCE_SHA_MISMATCH:'+r.originalId)
  const stem=String(q.q.stem||q.q.content?.en?.stem||q.q.content?.ur?.stem||'').trim()
  const marks=q.q.marks
  const criteria=proposed[r.originalId].map(([m,v])=>({marks:m,topicSpecificCriterion:v,reviewStatus:'AI_PROPOSAL_NOT_QUALIFIED_TEACHER'}))
  const allocated=criteria.reduce((s,c)=>s+c.marks,0)
  if(!stem||![5,8].includes(marks)||allocated!==marks)throw Error('ESSAY_RUBRIC_MARKS_OR_STEM_INVALID:'+r.originalId)
  out.push({
   originalId:r.originalId,originalStem:stem,originalReferenceAnswer:r.originalReferenceAnswer,
   originalRevisionSha256:r.originalRevisionSha256,originalFileSha256:q.fileSha,
   medium:q.q.medium||'english',questionType:r.type,originalQuestionMarks:marks,
   proposedCriteria:criteria,proposedTotalMarks:allocated,
   multipleValidStudentAnswersAllowed:true,existingOriginalQuestionUntouched:true,
   independentQualifiedTeacherReviewed:false,questionCorrectnessCertified:false,
   textbookExerciseEvidenceVerified:false,principalSigned:false,
   academicallyApproved:false,published:false,paperStudioSelectable:false
  })
 }
 out.sort((a,b)=>a.originalId.localeCompare(b.originalId))
 return{
  schemaVersion:'assps-grade910-8-context-specific-original-essay-rubrics-v1',
  exactOriginalShaValidated:out.length,sourceEnglishItems:out.filter(x=>x.medium==='english').length,
  sourceUrduItems:out.filter(x=>x.medium==='urdu').length,
  rubricTotalMatchesQuestionMarks:out.length,
  facultyReviewed:0,approved:0,published:0,
  warning:'A writing rubric evaluates different acceptable responses; this is not a single answer key. Real independent faculty and edition applicability reviews remain mandatory.',
  rows:out
 }
}
function write(){const x=build();fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n');return{count:x.rows.length,english:x.sourceEnglishItems,urdu:x.sourceUrduItems,hash:SHA(fs.readFileSync(OUT))}}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={build,write,OUT}
