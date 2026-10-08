'use strict'
const { optionQuality } = require('../../al-siddique-backend/src/scripts/lib/seed-intake-policy.cjs')
const manifest = require('./catalog-hash-ledger-20261008.json')
const index = new Map(manifest.entries.map(item=>[item.recordId,item]))

function normalized(value) { return String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'') }
function parseSourceTag(raw) {
  const match = String(raw || '').match(/^PECTAA\s+(pectaa-catalog-\d+)\s*\|\s*([a-f0-9]{64})\s*\|\s*(.*)$/i)
  return match ? { catalogId:match[1].toLowerCase(),pdfSha256:match[2].toLowerCase(),hint:match[3].trim() } : null
}

function inspectSourceRecord(row, catalog=index) {
  const note=parseSourceTag(row.metadata?.source)
  const source=catalog.get(note?.catalogId)
  const flags=[]
  if (!note) flags.push('NO_STRUCTURED_CATALOG_LINK')
  else if(!source) flags.push('CATALOG_RECORD_NOT_IN_LEDGER')
  else {
    if (note.pdfSha256 !== String(source.pdfSha256 || '').toLowerCase()) flags.push('CATALOG_PDF_HASH_MISMATCH')
    if (parseInt(row.class_level,10) !== Number(source.grade)) flags.push('CATALOG_GRADE_MISMATCH')
    if (normalized(row.subject) !== normalized(source.subject)) flags.push('CATALOG_SUBJECT_MISMATCH')
    if (normalized(row.medium) && normalized(source.medium) && normalized(row.medium)!==normalized(source.medium))
      flags.push('CATALOG_MEDIUM_MISMATCH')
    if (String(source.chapterIndexStatus || '') !== 'VERIFIED') flags.push('CHAPTER_INDEX_NOT_FULLY_VERIFIED')
    if (String(source.exerciseIndexStatus || '') !== 'VERIFIED') flags.push('EXERCISE_INDEX_NOT_VERIFIED')
    if (!/^APPROVED|READY_FOR_RELEASE|REVIEWED$/i.test(String(source.questionGenerationStatus || '')))
      flags.push('QUESTION_GENERATION_NOT_ACADEMICALLY_APPROVED')
  }
  if (!Number.isInteger(Number(row.source_page_no)) || Number(row.source_page_no)<1 || row.source_page_no==null) {
    flags.push('QUESTION_SOURCE_PAGE_NOT_VERIFIED')
  }
  if (!row.is_approved) flags.push('QUESTION_NOT_APPROVED')
  if (row.metadata?.provisional_internal===true ||
      row.metadata?.review_state==='provisional_internal') flags.push('PROVISIONAL_DRAFT')
  if (!row.metadata || row.metadata.review_state!=='academic_verified') flags.push('ACADEMIC_REVIEW_ATTESTATION_MISSING')
  if (row.is_duplicate) flags.push('KNOWN_DUPLICATE')
  return {
    recordId:row.id,catalogId:note?.catalogId??null,
    grade:row.class_level,subject:row.subject,questionType:row.question_type,
    catalogDigestMatches:!!source && !!note && note.pdfSha256 === String(source.pdfSha256 || '').toLowerCase(),
    complete:flags.length===0,flags,
  }
}
function summarize(records) {
  const reasons={}
  const bySubject={}
  const evaluations=records.map(row=>{
    const state=inspectSourceRecord(row)
    for(const flag of state.flags) reasons[flag]=(reasons[flag]||0)+1
    const key=[row.class_level,row.subject].join('|')
    if (!bySubject[key]) bySubject[key]={grade:row.class_level,subject:row.subject,discovered:0,catalogHashMatches:0,reviewReady:0,sourcePageVerified:0,mcqRows:[]}
    const bucket=bySubject[key]
    bucket.discovered++
    if(state.catalogDigestMatches)bucket.catalogHashMatches++
    if(state.complete)bucket.reviewReady++
    if(!state.flags.includes('QUESTION_SOURCE_PAGE_NOT_VERIFIED'))bucket.sourcePageVerified++
    if(row.question_type==='mcq') bucket.mcqRows.push({questionType:'mcq',correctOption:row.correct_option})
    return state
  })
  for(const entry of Object.values(bySubject)) {
    entry.mcqKeys=optionQuality(entry.mcqRows)
    delete entry.mcqRows
  }
  return {
    sourceManifestDigest:manifest.sourceSha256,
    scope:'READ_ONLY_CANDIDATE_AUDIT_NOT_ACADEMIC_APPROVAL',
    inspected:records.length,
    academicallyReady: evaluations.filter(e=>e.complete).length,
    blockers:Object.fromEntries(Object.entries(reasons).sort((a,b)=>b[1]-a[1])),
    subjects:Object.values(bySubject).sort((a,b)=>a.grade.localeCompare(b.grade)||a.subject.localeCompare(b.subject)),
  }
}
module.exports={manifest,index,parseSourceTag,inspectSourceRecord,summarize}
