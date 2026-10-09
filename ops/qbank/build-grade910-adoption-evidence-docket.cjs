#!/usr/bin/env node
'use strict'
// READ ONLY: source/edition/school-signoff gaps; never authorizes any question.
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const BACKEND=path.join(ROOT,'al-siddique-backend/src/data')
const OUT=path.join(ROOT,'docs/question-bank')
const EDITION=/^[12][0-9]{3}(?:-[0-9]{2,4})?$/
const SHA=/^[a-f0-9]{64}$/
const code=v=>String(v??'').trim()
const lowercase=v=>code(v).toLowerCase()
const checksum=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
function fail(kind,filename,id){throw Error('ADOPTION_DOCKET_'+kind+':'+filename+':'+id)}
function analyze({registry,adoptions,physical,documents}){
 if(!Array.isArray(registry?.entries)||!adoptions||!physical||!Array.isArray(documents))
  throw Error('ADOPTION_DOCKET_INPUTS_INVALID')
 const sources=new Map()
 for(const row of registry.entries){
  if(!code(row.recordId)||sources.has(row.recordId))fail('SOURCE_REGISTRY_DUPLICATE','registry',row.recordId)
  sources.set(row.recordId,row)
 }
 const bySource=new Map(),ids=new Set(),seenFiles=new Set()
 let total=0,editionGaps=0,gradeGaps=0,mediumGaps=0,editionDisagreements=0
 for(const {filename,data,fileSha256} of documents){
  if(!filename||seenFiles.has(filename)||!Array.isArray(data?.drafts))fail('INVALID_DRAFT_FILE',filename,'')
  seenFiles.add(filename)
  if(data.publicationAllowed!==false||data.liveImportAllowed!==false)
   fail('UNSAFE_PUBLICATION_STATUS',filename,'')
  for(const question of data.drafts){
   const qid=code(question.id)
   if(!qid||ids.has(qid))fail('DUPLICATE_QUESTION_ID',filename,qid)
   ids.add(qid)
   const sourceId=code(question.source?.catalogRecordId||data.sourceRecordId)
   const src=sources.get(sourceId)
   if(!src)fail('UNKNOWN_SOURCE',filename,qid)
   if(!SHA.test(lowercase(src.pdfSha256))||
      lowercase(question.source?.pdfSha256||data.sourcePdfSha256)!==lowercase(src.pdfSha256))
    fail('PDF_HASH_DRIFT',filename,qid)
   const grade=Number(src.grade),draftGrade=Number(question.curriculum?.grade)
   const medium=lowercase(src.medium)
   const gradeUnresolved=![9,10].includes(grade)||![9,10].includes(draftGrade)||grade!==draftGrade
   const mediumUnresolved=!['english','urdu'].includes(medium)||medium!==lowercase(question.medium)
   const editionUnresolved=!EDITION.test(code(src.edition))
   const editionDisagrees=code(question.curriculum?.edition)!==code(src.edition)
   if(gradeUnresolved)gradeGaps++
   if(mediumUnresolved)mediumGaps++
   if(editionUnresolved)editionGaps++
   if(editionDisagrees)editionDisagreements++
   let row=bySource.get(sourceId)
   if(!row){
    row={sourceRecordId:sourceId,grade:src.grade,subject:src.subject,medium:src.medium,
     editionLabel:src.edition,pdfSha256:src.pdfSha256,stagedDrafts:0,files:new Map(),
     editionLabelNeedsVerification:false,draftEditionDisagrees:false,sourceGradeNeedsResolution:false,
     sourceMediumNeedsResolution:false}
    bySource.set(sourceId,row)
   }
   row.stagedDrafts++
   row.editionLabelNeedsVerification ||=editionUnresolved
   row.draftEditionDisagrees ||=editionDisagrees
   row.sourceGradeNeedsResolution ||=gradeUnresolved
   row.sourceMediumNeedsResolution ||=mediumUnresolved
   row.files.set(filename,fileSha256||null)
   total++
  }
 }
 const adoptionCertified=adoptions.schoolBookAndExamYearApplicabilityCertified===true&&
   Array.isArray(adoptions.verifiedAdoptions)&&adoptions.verifiedAdoptions.length>0
 const physicalCertified=physical.academicPageEvidenceCertified===true&&
   Array.isArray(physical.verifiedChapterAnchors)&&physical.verifiedChapterAnchors.length>0
 const cohorts=[...bySource.values()].map(s=>{
  const blockers=['INDEPENDENT_HUMAN_ANSWER_AND_TEXTBOOK_REVIEW_REQUIRED']
  if(!adoptionCertified)blockers.push('SCHOOL_BOOK_ADOPTION_NOT_CERTIFIED')
  if(!physicalCertified)blockers.push('PHYSICAL_PRINTED_PDF_PAGE_NOT_CERTIFIED')
  if(s.editionLabelNeedsVerification)blockers.push('SOURCE_EDITION_LABEL_NOT_EXPLICIT')
  if(s.draftEditionDisagrees)blockers.push('DRAFT_EDITION_SOURCE_LABEL_DISAGREES')
  if(s.sourceGradeNeedsResolution)blockers.push('SOURCE_GRADE_UNRESOLVED')
  if(s.sourceMediumNeedsResolution)blockers.push('SOURCE_MEDIUM_UNRESOLVED')
  return {...s,files:[...s.files].sort(([a],[b])=>a.localeCompare(b)).map(([filename,sha256])=>({filename,sha256})),blockers,
   verifiedQuestionCount:0,approvedQuestionCount:0}
 }).sort((a,b)=>b.stagedDrafts-a.stagedDrafts||a.sourceRecordId.localeCompare(b.sourceRecordId))
 return {
  schemaVersion:'assps-grade910-adoption-evidence-docket-v1',
  scope:'READ_ONLY_STARTER2026_SUBSET_NO_APPROVAL',
  input:{starterFiles:seenFiles.size,sourceRegistryRecords:sources.size,schoolAdoptionCertified:adoptionCertified,
   physicalPageCertified:physicalCertified,teachingSession:adoptions.teachingSession},
  totals:{starterDraftQuestions:total,distinctQuestionIds:ids.size,referencedSourceRecords:cohorts.length,
   nonExplicitEditionDrafts:editionGaps,draftEditionSourceDisagreements:editionDisagreements,unresolvedSourceGradeDrafts:gradeGaps,
   unresolvedSourceMediumDrafts:mediumGaps,humanSourceVerified:0,humanReviewed:0,approved:0,publishedVerified:0},
  caveat:'Overlapping blocker counts are not additive. Starter2026 subset is NOT the full 2,581 candidate corpus. A source PDF hash and syntactically valid edition label are NOT school adoption or human verification.',
  cohorts
 }
}
function writeDocket(docket){
 const json=path.join(OUT,'ASSPS_GRADE910_SCHOOL_ADOPTION_EVIDENCE_DOCKET_20261009.json')
 const md=path.join(OUT,'ASSPS_GRADE910_SCHOOL_ADOPTION_EVIDENCE_DOCKET_20261009.md')
 fs.writeFileSync(json,JSON.stringify(docket,null,2)+'\n')
 const lines=['# ASSPS Grade IX–X — School-adoption evidence docket (9 October 2026)',
  '', '**Read-only, unapproved research candidates. Do not deploy, seed, or mark source-verified.**',
  '', `This reconciles **only ${docket.input.starterFiles} Starter2026 files**, including dual-medium per-question source IDs, with the server-owned source registry. It is **not** a report that all 2,581 existing draft questions have been independently verified.`,
  '',`- Starter drafts: **${docket.totals.starterDraftQuestions}**; distinct source records used: **${docket.totals.referencedSourceRecords}**.`,
  `- Edition labels failing the existing YYYY / YYYY-YY eligibility format: **${docket.totals.nonExplicitEditionDrafts} question drafts**.`,
  `- Draft edition labels differing from the source registry (manual evidence reconciliation needed): **${docket.totals.draftEditionSourceDisagreements}**.`,
  `- Missing/invalid source grade bindings: **${docket.totals.unresolvedSourceGradeDrafts} draft questions**; source medium unresolved/mismatched: **${docket.totals.unresolvedSourceMediumDrafts}**.`,
  `- ASSPS-certified textbook adoptions: **${docket.input.schoolAdoptionCertified?'a registry is present (independent proof still required)':'NONE'}**; independent chapter/exercise page evidence: **${docket.input.physicalPageCertified?'registry present (requires separate review)':'NONE'}**.`,
  `- **All ${docket.totals.starterDraftQuestions.toLocaleString('en-US')} starter drafts remain provisional.** Blocker metrics overlap: do not sum them.`,
  '', '## Source-cohort evidence queue (largest provisional groups first)', '',
  '| Source record | Grade | Subject | Medium | Edition label | Drafts | Open evidence blockers |',
  '|---|---:|---|---|---|---:|---|']
 for(const s of docket.cohorts){
  const escape=v=>String(v??'').replace(/\|/g,'\\|')
  lines.push(`| ${escape(s.sourceRecordId)} | ${escape(s.grade)} | ${escape(s.subject)} | ${escape(s.medium)} | ${escape(s.editionLabel)} | ${s.stagedDrafts} | ${s.blockers.filter(x=>x!=='INDEPENDENT_HUMAN_ANSWER_AND_TEXTBOOK_REVIEW_REQUIRED').join(', ')} |`)
 }
 lines.push('', '## Exact next evidence needed (school-owned, no automatic approval)', '',
  '1. School-authorized actual Grade IX–X subject/medium textbook adoption and **applicable examination year** per course, with textbook title and actual printed edition.',
  '2. Independently examined school-owned **printed chapter/exercise page**, PDF physical page, exercise number, page image SHA and qualified verifier; registry PDFs alone are insufficient.',
  '3. Distinct qualified subject-specialist answer, MCQ distractor, difficulty, originality and bilingual equivalence review tied to the actual question revision hash.',
  '4. Only after verified evidence may academically reviewed questions be considered for approved snapshots. Release remains SaaS Core-only.', '',
  '### Integrity notes', '', '- No question text or protected paper content is copied into this docket.',
  '- A syntactically explicit edition label is **not** school approval. A PECTAA listing is **not** automatic school adoption.',
  '- The school adoption and physical-page registries are empty by design; this docket cannot fabricate their human signoffs.', '')
 fs.writeFileSync(md,lines.join('\n'))
 return {json,md}
}
function main(){
 const registry=JSON.parse(fs.readFileSync(path.join(BACKEND,'verifiedGrade910SourceRegistry.json')))
 const adoptions=JSON.parse(fs.readFileSync(path.join(BACKEND,'asspsGrade910SchoolAdoptions.json')))
 const physical=JSON.parse(fs.readFileSync(path.join(BACKEND,'asspsGrade910PhysicalPageEvidence.json')))
 const documents=fs.readdirSync(INPUT).filter(name=>name.endsWith('Starter2026.json')).sort().map(filename=>{
  const bytes=fs.readFileSync(path.join(INPUT,filename))
  return {filename,data:JSON.parse(bytes),fileSha256:checksum(bytes)}
 })
 const docket=analyze({registry,adoptions,physical,documents})
 writeDocket(docket)
 console.log(JSON.stringify({files:docket.input.starterFiles,records:docket.totals.referencedSourceRecords,...docket.totals}))
}
if(require.main===module)main()
module.exports={analyze,writeDocket}
