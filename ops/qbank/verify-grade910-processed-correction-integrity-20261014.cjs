#!/usr/bin/env node
'use strict'
// Authored as a corrective, append-only replacement for the unverified v1 report.
// No inference from generated text is allowed to become a verified answer or signoff.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const IN=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_AI_ADVISORY_CORRECTION_DOCKET_20261014.json')
const LEGACY=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_PROCESSED_ACADEMIC_CORRECTIONS_20261014.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CORRECTION_INTEGRITY_VERIFIED_DOCKET_20261014.json')
const SUMMARY=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CORRECTION_INTEGRITY_AUDIT_20261014.md')
const hash=value=>crypto.createHash('sha256').update(value).digest('hex')
const fail=code=>{throw Error('GRADE910_CORRECTION_INTEGRITY_'+code)}
function sourceMap() {
 const indexed=new Map()
 for(const file of fs.readdirSync(STAGING).filter(x=>x.endsWith('.json')).sort()){
  const raw=fs.readFileSync(path.join(STAGING,file))
  let obj
  try{obj=JSON.parse(raw)}catch(_){continue}
  const items=obj.drafts||obj.questions||obj.items||[]
  if(!Array.isArray(items))continue
  for(const item of items) {
   const id=item.id||item.originalQuestionId||item.questionId
   if(typeof id!=='string')continue
   if(indexed.has(id))fail('DUPLICATE_ORIGINAL_SOURCE_ID:'+id)
   indexed.set(id,{item,file,fileHash:hash(raw),revisionHash:hash(JSON.stringify(item))})
  }
 }
 return indexed
}
const text=v=>String(v??'').normalize('NFKC').trim()
function referenceOnlyMcq(q){
 const raw=q.options||q.content?.en?.options||q.content?.ur?.options
 if(!Array.isArray(raw)||raw.length!==4)return{status:'UNRESOLVED_OPTION_SET',formatOnlyDraft:null}
 const options=raw.map((o,i)=>({id:'ABCD'[i],text:text(typeof o==='string'?o:o?.text)}))
 if(options.some(o=>!o.text)||new Set(options.map(o=>o.text.toLowerCase())).size!==4)
  return{status:'UNRESOLVED_OPTION_SET',formatOnlyDraft:null}
 const answer=text(q.answer||q.content?.en?.answer||q.content?.ur?.answer).toLowerCase()
 const hits=options.filter(o=>o.text.toLowerCase()===answer)
 if(hits.length!==1)return{status:'UNRESOLVED_REFERENCE_ANSWER_MAPPING',formatOnlyDraft:null}
 const stem=q.stem||q.question_text||q.content?.en?.stem||q.content?.ur?.stem||''
 return{status:'UNIQUE_REFERENCE_TEXT_MATCH_NOT_SUBJECT_KEY_VERIFICATION',
  formatOnlyDraft:{
   stem,options,referenceAnswerOptionId:hits[0].id,referenceAnswerText:hits[0].text,
   sourceAnswerNotFactChecked:true,substantiveAnswerKeyVerified:false
  }}
}
function assess(inputDocket=fs.readFileSync(IN), legacy=fs.readFileSync(LEGACY), indexed=sourceMap()){
 const docket=JSON.parse(inputDocket)
 const prev=JSON.parse(legacy)
 if(!Array.isArray(docket.rows)||docket.rows.length!==584||!Array.isArray(prev.corrections)||prev.corrections.length!==584)
  fail('584_EXPECTED')
 const ids=new Set(),rows=[]
 for(const r of docket.rows){
  if(ids.has(r.originalId))fail('DUPLICATE_DOCKET_ID')
  ids.add(r.originalId)
  const source=indexed.get(r.originalId)
  if(!source)fail('MISSING_ORIGINAL:'+r.originalId)
  if(source.fileHash!==r.sourceFileSha256)fail('ORIGINAL_FILE_BYTES_DRIFT:'+r.originalId)
  if(source.revisionHash!==r.originalRevisionSha256)fail('ORIGINAL_QUESTION_REVISION_DRIFT:'+r.originalId)
  const prevRow=prev.corrections.find(v=>v.originalId===r.originalId)
  if(!prevRow||prevRow.originalRevisionSha256!==r.originalRevisionSha256)
   fail('LEGACY_RECONCILIATION_FAILED:'+r.originalId)
  const q=source.item
  const advice={
   originalId:r.originalId,originalRevisionSha256:r.originalRevisionSha256,
   sourceFile:source.file,sourceFileSha256:source.fileHash,
   claimedCatalogRecordId:r.catalogRecordId,grade:r.grade??q.curriculum?.grade??null,
   subject:r.subject??q.curriculum?.subjectId??null,medium:r.medium??q.medium??null,
   chapter:r.chapterClaim??q.chapter?.number??q.unit??null,
   type:r.type,priority:r.reviewPriority,signals:r.signals,
   suggestedCorrections:r.correctionProposals,
   status:'AI_ADVISORY_NEEDS_SOURCE_AND_QUALIFIED_HUMAN',
   sourceEditionSchoolAdoptionVerified:false,
   actualTextbookPageChecked:false,semanticFactCheckPerformed:false,
   numericalRecalculationPerformed:false,answerCorrectnessVerified:false,
   bilingualEquivalenceVerified:false,
   qualifiedTeacherReviewed:false,principalAuthorized:false,
   academicallyApproved:false,paperStudioSelectable:false,published:false,
   originalReferenceAnswer:q.answer??q.content?.en?.answer??q.content?.ur?.answer??null,
   sourceRevisionChangeAuthorized:false,automaticCorrectedQuestionCount:0,
   formattingProposal:null,formattingProposalSha256:null,
   verificationQueue:r.signals.includes('NUMERICAL_WORKING_REVIEW')?
    'INDEPENDENT_FORMULA_ARITHMETIC_UNITS_RECALCULATION_REQUIRED':
    r.signals.some(f=>f.includes('MCQ'))?'CORRECT_OPTION_AND_DISTRACTORS_REQUIRE_QUALIFIED_CHECK':
    'MODEL_ANSWER_AND_MARKING_RUBRIC_REQUIRE_SUBJECT_REVIEW'
  }
  if(r.signals.includes('MCQ_KEY_ID_NOT_EXPLICIT')||r.signals.includes('MCQ_OPTIONS_NOT_CANONICALLY_LABELED')){
   const m=referenceOnlyMcq(q)
   advice.referenceAnswerMatchStatus=m.status
   if(m.formatOnlyDraft){
    advice.formattingProposal=m.formatOnlyDraft
    advice.formattingProposalSha256=hash(JSON.stringify(m.formatOnlyDraft))
   }
  }
  rows.push(advice)
 }
 rows.sort((a,b)=>a.priority.localeCompare(b.priority)||a.originalId.localeCompare(b.originalId))
 const p1=rows.filter(r=>r.priority==='P1').length,p2=rows.filter(r=>r.priority==='P2').length
 if(p1!==119||p2!==465)fail('PRIORITY_TOTAL_DRIFT')
 const formatting=rows.filter(r=>r.formattingProposal)
 const output={
  schemaVersion:'assps-grade910-correction-integrity-evidence-20261014-v2',
  supersedesClaimOfIndependentCorrectionVerification:true,
  historicalReportStatus:'UNSAFE_OVERSTATED_VERIFICATION__PRESERVED_IN_GIT_HISTORY',
  legacyProcessedLedgerSha256:hash(legacy),inputAdvisorySha256:hash(inputDocket),
  originalCandidateCount:2581,originalsBoundToExactSourceBytesAndRevisionHash:rows.length,
  reviewDocketItems:rows.length,priority:{P1:p1,P2:p2},
  mechanicallyProposedMcqOptionLabels:formatting.length,
  actualIndependentlyVerifiedQuestionAnswers:0,
  numericalCalculationsIndependentlyRecomputed:0,qualifiedHumanReviewed:0,
  schoolBookAdoptionCertified:0,approved:0,published:0,
  rows
 }
 return output
}
function write(){
 const result=assess()
 fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n')
 const marked=result.rows.filter(r=>r.referenceAnswerMatchStatus==='UNRESOLVED_REFERENCE_ANSWER_MAPPING').length
 fs.writeFileSync(SUMMARY,[
  '# ASSPS IX–X correction-processing integrity — superseding academic claim audit','',
  '14 October 2026. This audit **supersedes unsupported correctness claims** in the previous final-readiness report and the 584-row generated v1 correction packet. The original report and packet remain preserved in their Git history; neither is a faculty certificate.','',
  '- Exact authoritative original source files and individual revision JSON hashes rechecked: **584/584 MATCH**.',
  '- Higher-priority P1 advisory items: **119**; P2 advisory items: **465**.',
  '- Mechanically proposed canonical MCQ formatting (source answer text matched exactly one choice): **'+result.mechanicallyProposedMcqOptionLabels+'**; this is not substantive answer correctness.',
  '- Ambiguous/mismatched reference MCQ mappings: **'+marked+'**; never substitute default option A.',
  '- Independent numerical recomputations: **0**. No fabricated formulas, algebra, SI units or successful calculations claimed.',
  '- Actual qualified independent subject/Urdu corrections verified: **0**; school textbook adoption: **0**; academically approved: **0**; published: **0**.',
  '- Original v1 packet included unjustified recomputedPassed=true, generic made-up working steps, an A-on-missing MCQ answer fallback, unchanged distractors described as balanced, and mojibake Urdu strings. Those statements **cannot be used as academic evidence**.',
  '- Corrected v2 dossier separates original answer references, mechanical formatting proposals and required independent subject verification. Source SHA comparisons protect all original data. No existing production marks, papers, source question files or approval records were updated.','',
  '**Academic publication decision: HOLD.** A valid human review cannot be created solely by an AI agent. Principal signature feature is present as an isolated code candidate; actual live installation and owner-operated signature upload remain unverified.',
  '','## Sources','',
  '- Original research authoring files: al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging',
  '- Original SHA-bound advisory: ASSPS_GRADE910_AI_ADVISORY_CORRECTION_DOCKET_20261014.json',
  '- New item-by-item corrected classification: ASSPS_GRADE910_CORRECTION_INTEGRITY_VERIFIED_DOCKET_20261014.json',
  '- Historical report and correction packet remain in git at 9ec28e744ff2dda3e7921d411d61a064662a12e5.',''
 ].join('\n'))
 return{items:result.reviewDocketItems,formatOnly:result.mechanicallyProposedMcqOptionLabels,
  independentRecomputed:0,approved:0,published:0,docketSha256:hash(fs.readFileSync(OUT))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={assess,write,referenceOnlyMcq,IN,OUT,SUMMARY}
