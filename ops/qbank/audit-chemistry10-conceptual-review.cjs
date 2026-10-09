#!/usr/bin/env node
'use strict'
// Editorial research docket only. These are NOT independently reviewed or approved.
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/chemistry10Starter2026.json')
const OUT=path.join(ROOT,'docs/question-bank')
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex')
// Exact unchanged independently authored batch from the verified 2026-10-09 worktree.
const PINNED_ORIGINAL_SHA='ef2917a8fc5ea030992d5f15df2493b7422954463ee4d54c25414fc81af706a1'
const POLICIES=Object.freeze([
 {
  questionId:'X-CHEM-C15-M02',severity:'HIGH',reviewType:'UNVERIFIED_TEXTBOOK_CONDITION_AND_PRESSURE',
  observation:'The item attributes an approximate room-temperature molar gas volume to the textbook, but the adopted edition and stated pressure/temperature conditions are not independently evidenced.',
  proposedAction:'Verify actual adopted textbook and its explicit room temperature and pressure convention; replace textbook-attribution wording with a defensible stated condition or independently authored value question if faculty confirms.',
  independentChecks:['School textbook edition/exam cohort','Temperature and pressure definition in original source','Chosen molar gas volume under those conditions']
 },
 {
  questionId:'X-CHEM-C18-M01',severity:'HIGH',reviewType:'SALT_DEFINITION_OVERBROAD',
  observation:'Every salt contains cation and anion species, but describing a salt only as any ionic compound is broader than the acid-base salt classification and may not distinguish ionic oxides.',
  proposedAction:'Have a Chemistry specialist verify the adopted board-level salt definition and refine the stem/answer to distinguish salts from other ionic compounds without a contradictory distractor.',
  independentChecks:['Official grade-specific salt definition','Correct chemical examples/nonexamples','One unambiguous selected option']
 },
 {
  questionId:'X-CHEM-C21-M01',severity:'MEDIUM',reviewType:'ORGANIC_CARBON_SCOPE_CAVEAT',
  observation:'Organic chemistry primarily studies carbon-containing compounds, but a broad statement covering all carbon compounds can overlook inorganic carbon oxides, carbonates and related exceptions.',
  proposedAction:'Verify that “mainly studies” wording is appropriately bounded to organic carbon compounds under the adopted syllabus; avoid implying every carbon compound is organic.',
  independentChecks:['Adopted textbook organic chemistry scope','Carbon oxide/carbonate exceptions','Age-appropriate conceptual precision']
 },
 {
  questionId:'X-CHEM-C21-S01',severity:'MEDIUM',reviewType:'HOMOLOGOUS_SERIES_MISSING_CRITERION',
  observation:'The model answer gives a shared functional group/general formula and trends but does not explicitly state that successive homologues differ by a CH2 unit.',
  proposedAction:'Have the subject reviewer determine whether the rubric must explicitly credit the successive CH2 increment and corresponding molar-mass change.',
  independentChecks:['Textbook homologous-series definition','Completeness of model answer','Marks/rubric for required criteria']
 },
 {
  questionId:'X-CHEM-C16-L01',severity:'MEDIUM',reviewType:'ELECTRODE_PROCESS_ROLE_PRECISION',
  observation:'The requested electrode roles merit distinguishing invariant oxidation-at-anode and reduction-at-cathode from electrode sign, which differs between electrolytic and galvanic cells.',
  proposedAction:'Require the qualified reviewer to specify the cell context in the question or answer rubric, and distinguish electrode processes from polarity.',
  independentChecks:['Voltaic versus electrolytic cell context','Oxidation/reduction electrode definitions','Rubric consistency']
 },
 {
  questionId:'X-CHEM-C23-S02',severity:'MEDIUM',reviewType:'ETHANOL_OXIDATION_CONDITION_PRECISION',
  observation:'The answer identifies an aldehyde followed by carboxylic acid, but the stated products depend on the oxidation conditions; the rubric should not imply both products always form together.',
  proposedAction:'Have the specialist state appropriate mild/strong oxidation conditions and distinguish ethanal from further oxidation to ethanoic acid.',
  independentChecks:['Appropriate oxidation conditions','Intermediate and final products','Answer scope and marks']
 }
])
function audit({source,rawBytes,registry}){
 if(!Buffer.isBuffer(rawBytes)||hash(rawBytes)!==PINNED_ORIGINAL_SHA)
  throw Error('CHEM10_STALE_OR_CHANGED_ORIGINAL:source_file_sha256')
 let stored
 try {stored=JSON.parse(rawBytes)}catch(_){throw Error('CHEM10_STALE_OR_CHANGED_ORIGINAL:unreadable_json')}
 if(JSON.stringify(stored)!==JSON.stringify(source))
  throw Error('CHEM10_STALE_OR_CHANGED_ORIGINAL:parsed_source_mismatch')
 if(source?.publicationAllowed!==false||source?.liveImportAllowed!==false||
    !Array.isArray(source?.drafts)||source.drafts.length!==65)
  throw Error('CHEM10_UNSAFE_OR_UNEXPECTED_CORPUS')
 const candidates=new Map()
 for(const q of source.drafts){
  if(!q.id||candidates.has(q.id))throw Error('CHEM10_DUPLICATE_OR_EMPTY_QUESTION_ID')
  candidates.set(q.id,q)
 }
 const counts={mcq:0,short:0,long:0}
 for(const q of candidates.values()){
  if(!(q.type in counts))throw Error('CHEM10_UNEXPECTED_QUESTION_TYPE:'+q.id)
  counts[q.type]++
 }
 if(counts.mcq!==26||counts.short!==26||counts.long!==13)
  throw Error('CHEM10_QUESTION_TYPE_COUNT_CHANGED')
 const src=registry?.entries?.find(x=>x.recordId===source.sourceRecordId)
 if(!src||src.pdfSha256!==source.sourcePdfSha256||
    Number(src.grade)!==10||src.subject!=='Chemistry'||String(src.medium).toLowerCase()!=='english')
  throw Error('CHEM10_CANONICAL_SOURCE_MISMATCH')
 for(const q of candidates.values()){
  if(q.source?.catalogRecordId!==src.recordId||q.source?.pdfSha256!==src.pdfSha256)
   throw Error('CHEM10_QUESTION_SOURCE_DRIFT:'+q.id)
 }
 const rows=POLICIES.map(p=>{
  const q=candidates.get(p.questionId)
  if(!q)throw Error('CHEM10_REVIEW_CANDIDATE_NOT_IN_CORPUS:'+p.questionId)
  const questionText=String(q.stem||q.content?.en?.stem||'')
  const answer=String(q.answer||q.content?.en?.answer||'')
  if(!questionText||!answer)throw Error('CHEM10_REVIEW_TARGET_INCOMPLETE:'+p.questionId)
  return {
   ...p,sourceFile:'chemistry10Starter2026.json',
   questionType:q.type,chapterNo:q.chapter?.number,topicId:q.topicId,
   originalQuestionSha256:hash(q),originalDraftFileSha256:hash(rawBytes),
   originalOfficialSourceId:src.recordId,declaredOfficialPdfSha256:src.pdfSha256,
   sourcePrintedPageClaim:q.source?.page??null,
   originalAnswerIntentionallyUntouched:true,sourcePageIndependentlyVerified:false,
   answerAccuracyIndependentlyHumanVerified:false,independentReviewerId:null,
   academicApprovalGranted:false,publicationAllowed:false,
   proposalStatus:'PENDING_INDEPENDENT_CHEMISTRY_X_EDITORIAL_AND_ADOPTED_TEXTBOOK_REVIEW'
  }
 })
 return {
  schemaVersion:'assps-grade10-chemistry-editorial-concept-qa-v1',
  scope:'DESK_RESEARCH_PROPOSALS_ONLY_NO_APPROVAL',
  originalSourceFile:'chemistry10Starter2026.json',
  originalSourceFileSha256:hash(rawBytes),
  canonicalSourceRecordId:src.recordId,canonicalPdfSha256:src.pdfSha256,
  provisionalQuestionCount:candidates.size,questionTypes:counts,
  proposedIndependentReviewCount:rows.length,
  sourcePageHumanVerifiedCount:0,answerHumanVerifiedCount:0,approvedCount:0,
  findings:rows
 }
}
function markdown(r){
 const lines=['# Grade X Chemistry — Source-bound conceptual editorial review batch','',
 '**Research proposals only. No textbook edition, printed page, academic approval or human subject review is certified.**','',
 `Source: \`${r.originalSourceFile}\`; actual original candidate records: **${r.provisionalQuestionCount}** (MCQ ${r.questionTypes.mcq}, short ${r.questionTypes.short}, long ${r.questionTypes.long}).`,
 `Conceptual/editorial flags for qualified Chemistry review: **${r.findings.length}**. All original questions/answers unchanged.`,
 '', '| Question ID | Chapter | Risk | Proposed faculty check |','|---|---:|---|---|']
 for(const x of r.findings)lines.push(`| ${x.questionId} | ${x.chapterNo} | ${x.reviewType} | ${x.proposedAction.replace(/\|/g,'\\|')} |`)
 lines.push('','## Independent evidence still required','',
 '1. Verify actual ASSPS-adopted Grade X Chemistry title, edition, medium and board examination cohort; a recovered PDF SHA does not prove applicability.',
 '2. Confirm original printed textbook chapter/topic and relevant page against physical PDF page with authorized independent reviewer.',
 '3. Specialist assesses each flagged underlying question, scientific correctness, intended option/rubric, student difficulty, language and originality.',
 '4. Any proposed revision must carry a new immutable question hash and be independently re-reviewed before any publication. Do not auto-apply corrections.',
 '', '**Academic source page verified: 0; human answer reviews: 0; approvals: 0; deployment: none.**','')
 return lines.join('\n')
}
function main(){
 const raw=fs.readFileSync(INPUT)
 const source=JSON.parse(raw)
 const registry=JSON.parse(fs.readFileSync(path.join(ROOT,'al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')))
 const report=audit({source,rawBytes:raw,registry})
 fs.writeFileSync(path.join(OUT,'ASSPS_CHEMISTRY10_CONCEPTUAL_EDITORIAL_REVIEW_20261009.json'),JSON.stringify(report,null,2)+'\n')
 fs.writeFileSync(path.join(OUT,'ASSPS_CHEMISTRY10_CONCEPTUAL_EDITORIAL_REVIEW_20261009.md'),markdown(report))
 console.log(JSON.stringify({sourceSha:report.originalSourceFileSha256,questionTypes:report.questionTypes,flagged:report.proposedIndependentReviewCount,approved:report.approvedCount}))
}
if(require.main===module)main()
module.exports={audit,markdown,POLICIES}
