#!/usr/bin/env node
'use strict'
// Exact SHA256 bytes-to-2,581 original question provenance; not textbook page, syllabus adoption or answer approval.
const fs=require('node:fs'),path=require('node:path')
const packets=require('./build-grade910-blind-faculty-packets.cjs')
const source=require('./reattest-grade910-source-bytes.cjs')
const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_ORIGINAL_2581_PDF_BYTE_LINEAGE_20261012.json')
const NOTE=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_ORIGINAL_PDF_SOURCE_LINEAGE_20261012.md')
const fail=x=>{throw Error('ASSPS_QBANK_PDF_LINEAGE_'+x)}
const shaRe=/^[0-9a-f]{64}$/
function build({byteEvidence}){
 const manifest=require(path.join(STAGING,'officialSourceManifest.json'))
 const ledger=require('./catalog-hash-ledger-20261008.json')
 if(!byteEvidence||byteEvidence.manifestCount!==111||byteEvidence.verifiedSourceCount!==110||
    byteEvidence.uncheckedSourceCount!==1||byteEvidence.mismatches!==0||
    !Array.isArray(byteEvidence.results)||byteEvidence.results.length!==111)fail('OFFICIAL_111_BYTE_SOURCE_ATTESTATION_MISSING')
 const check=new Map(byteEvidence.results.map(x=>[x.recordId,x]))
 const m=new Map(manifest.entries.map(x=>[x.recordId,x]))
 if(m.size!==111||ledger.entries.length!==111||check.size!==111)fail('SOURCE_MANIFEST_ID_SET_INVALID')
 if(byteEvidence.results.filter(x=>x.status==='BYTE_SHA256_MATCH').length!==110||
    byteEvidence.results.filter(x=>x.status==='NO_OFFICIAL_SHA_QUARANTINED').length!==1||
    check.get('pectaa-catalog-037')?.status!=='NO_OFFICIAL_SHA_QUARANTINED')
    fail('PDF_BYTE_ATTESTATION_RESULTS_STATUS_DRIFT')
 const original=packets.inventory(),rows=[],statuses={},group=new Map()
 const catalogUse=new Map()
 for(const row of original.queue.rows){
  const q=original.candidates.get(row.originalQuestionId).q
  const entry=m.get(row.originalSourceCatalogId)
  if(!entry)fail('UNRECOGNIZED_CANDIDATE_CATALOG_ID:'+row.originalQuestionId)
  const evidence=check.get(entry.recordId)
  if(!evidence)fail('UNVERIFIED_CATALOG_BYTE_EVIDENCE')
  const claim=q.source?.pdfSha256||null
  let status
  if(!claim)status='ORIGINAL_QUESTION_PDF_SHA_NOT_DECLARED'
  else if(!shaRe.test(claim)||claim!==entry.pdfSha256)status='ORIGINAL_QUESTION_PDF_SHA_CONFLICT'
  else if(evidence.status!=='BYTE_SHA256_MATCH')status='CANDIDATE_CATALOG_PDF_NOT_BYTE_VERIFIED'
  else status='ORIGINAL_PDF_SHA_EXACT_BYTE_VERIFIED'
  statuses[status]=(statuses[status]||0)+1
  catalogUse.set(entry.recordId,(catalogUse.get(entry.recordId)||0)+1)
  const grp=[row.gradeClaim||'unassigned',row.subjectClaim||'unassigned'].join('|')
  if(!group.has(grp))group.set(grp,{grade:row.gradeClaim??null,
   subject:row.subjectClaim??null,originals:0,missingOriginalPdfHash:0,
   byteVerifiedCatalogSha:0})
  const g=group.get(grp);g.originals++
  if(status==='ORIGINAL_QUESTION_PDF_SHA_NOT_DECLARED')g.missingOriginalPdfHash++
  if(status==='ORIGINAL_PDF_SHA_EXACT_BYTE_VERIFIED')g.byteVerifiedCatalogSha++
  rows.push({originalQuestionId:row.originalQuestionId,
   originalQuestionRevisionSha256:row.originalQuestionRevisionSha256,
   originalSourceFileSha256:row.originalSourceFileSha256,
   declaredSourceCatalogRecordId:entry.recordId,
   originalCandidatePdfSha256Claim:claim,
   catalogPdfSha256Declared:entry.pdfSha256||null,
   candidateByteLineageStatus:status,
   pageClaimIsHumanPrintedTextbookVerified:false,
   schoolAdoptedExactEditionVerified:false,
   curriculumBoardExamYearVerified:false,
   academicallyApproved:false,verifiedPublished:false})
 }
 if(rows.length!==2581||statuses.ORIGINAL_PDF_SHA_EXACT_BYTE_VERIFIED!==2537||
  statuses.ORIGINAL_QUESTION_PDF_SHA_NOT_DECLARED!==44||
  (statuses.ORIGINAL_QUESTION_PDF_SHA_CONFLICT||0)!==0||
  (statuses.CANDIDATE_CATALOG_PDF_NOT_BYTE_VERIFIED||0)!==0||
  (catalogUse.get('pectaa-catalog-037')||0)!==0)
  fail('ORIGINAL_2581_PDF_SOURCE_POPULATION_DRIFT')
 rows.sort((a,b)=>a.originalQuestionId.localeCompare(b.originalQuestionId))
 const catalogs=manifest.entries.map(entry=>({
  recordId:entry.recordId,grade:entry.grade,subject:entry.subject,medium:entry.medium,
  publishedEditionLabel:entry.edition,
  sha256:entry.pdfSha256||null,
  sourceByteStatus:check.get(entry.recordId).status,
  originalQuestionReferences:catalogUse.get(entry.recordId)||0,
  schoolBookActuallyAdopted:false,
  officialPrintedExercisePageHumanChecked:false
 })).sort((a,b)=>a.recordId.localeCompare(b.recordId))
 return{schemaVersion:'assps-grade910-2581-original-pdf-byte-source-provenance-v1',
  originalCandidates:2581,originalAuthoringFiles:73,officialCatalogRecords:111,
  cachedPdfByteHashMatches:110,oneNoShaCatalogQuarantined:1,
  quarantinedCatalogRecordId:'pectaa-catalog-037',
  quarantinedCatalogOriginalQuestionReferences:0,
  actualCachePdfBytesHashed:byteEvidence.bytesRead,
  candidateStatusCounts:statuses,
  sourceQuestionClaimMatchesExistingByteVerifiedCatalog:2537,
  missingIndividualQuestionPdfShaClaim:44,
  questionShaConflicts:0,
  originalGradeSubjectGroups:[...group.values()].sort((a,b)=>
   String(a.grade).localeCompare(String(b.grade))||String(a.subject).localeCompare(String(b.subject))),
  catalogs,rows,
  methodology:'Actual cached PDF SHA256 byte verification and original-question declared digest comparison, not physical textbook adoption, page/exercise location validation, curriculum board/year approval or scientific answer correctness.',
  academicallyApproved:0,verifiedPublished:0,paperStudioVerifiedSelectable:false,
  releaseDecision:'HOLD_UNTIL_SCHOOL_ADOPTION_ACTUAL_PAGE_IF_CLAIMED_AND_QUALIFIED_REVIEW'}
}
function markdown(x){
 return ['# ASSPS Grade IX-X — 2,581 originals to independently SHA-checked PDF source bytes',
  '','Date: 12 October 2026. Source evidence only; **not** independently certified textbook/answer approval.',
  '','Read-only rehash of actual protected VPS PDF files: **'+x.cachedPdfByteHashMatches+
  ' of 111** catalog file contents exactly match the declared SHA256 and PDF magic. One catalog entry '+
  x.quarantinedCatalogRecordId+' has no official declared PDF hash; **0 original question candidates reference it**.',
  '','**2,537/2,581** original candidates declare a PDF SHA256 matching one of the 110 currently byte-verified catalogue files. '+
  '**44** legacy Grade IX English question originals lack a direct question-level PDF SHA256 claim. '+
  'None is silently declared source-verified or approved; all require exact chapter/edition/board-year/source applicability review.',
  '','Byte-level equality confirms file identity, not physical textbook page/exercise correctness. '+
  'PACTAA/PECTAA catalogue can contain different editions and options; actual ASSPS adopted textbook session and physical print must be separately verified.',
  '','**Academically approved 0, verified published 0. Academic release HOLD.**',
  ''].join('\n')
}
async function live({write=false}={}){
 const manifest=JSON.parse(fs.readFileSync(path.join(STAGING,'officialSourceManifest.json'),'utf8'))
 const ledger=require('./catalog-hash-ledger-20261008.json')
 const bytes=await source.attest({manifest,ledger,cacheRoot:'/root/workspace/qbank-source-cache'})
 const report=build({byteEvidence:bytes})
 if(write){fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n')
  fs.writeFileSync(NOTE,markdown(report))}
 return report
}
if(require.main===module)live({write:process.argv.includes('--write')})
 .then(r=>console.log(JSON.stringify({statusCounts:r.candidateStatusCounts,
  cachedPdfByteHashMatches:r.cachedPdfByteHashMatches,
  bytesHashed:r.actualCachePdfBytesHashed,unreviewed:2581,academicallyApproved:0,published:0})))
 .catch(e=>{console.error(e.message);process.exitCode=2})
module.exports={build,markdown,live,OUT,NOTE}
