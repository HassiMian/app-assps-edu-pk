'use strict'
/**
 * Composer-safe academic syllabus intake, pure validation only.
 * This module NEVER writes to a database or publishes a lesson.
 * Miss Adiba is a forwarding/composing contact, NOT the automatic teacher.
 */
const crypto = require('node:crypto')

const CLASSES = Object.freeze(['Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven','Eight','Pre-Nine'])
const ALIASES = Object.freeze({
  play:'Starter',playgroup:'Starter',starter:'Starter',
  mover:'Mover',nursery:'Mover',flyer:'Flyer',prep:'Flyer',
  one:'One','1':'One',two:'Two','2':'Two',three:'Three','3':'Three',
  four:'Four','4':'Four',five:'Five','5':'Five',six:'Six','6':'Six',
  seven:'Seven','7':'Seven',eight:'Eight','8':'Eight',
  prenine:'Pre-Nine',preix:'Pre-Nine'
})
const SHA = /^[a-f0-9]{64}$/
const SOURCE_ID = /^WA14-(?:L[0-9]{1,5}|IMG-[a-zA-Z0-9-]{1,50})$/
function reject(code, detail = '') {
  const e = new Error(code + (detail ? ': ' + detail : ''))
  e.code = code
  throw e
}
function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v) }
function sha(value) { return crypto.createHash('sha256').update(value, 'utf8').digest('hex') }
function normalizeClass(name) {
  if (typeof name !== 'string') return null
  const key = name.toLowerCase().replace(/^\s*(?:class|grade)\s+/,'').replace(/[^a-z0-9]/g,'')
  return ALIASES[key] || null
}
function safeSubject(name) {
  if (typeof name !== 'string') return null
  const value = name.trim().replace(/\s+/g, ' ')
  return value && value.length <= 100 && !/[\x00-\x1f<>]/.test(value) ? value : null
}
function validateSource(source, sourceId) {
  if (!isObject(source) || source.source_id !== sourceId) reject('SOURCE_PROVENANCE_MISMATCH', sourceId)
  const image = sourceId.startsWith('WA14-IMG-')
  const pieces = image && source.source_excerpt_pieces === undefined ? [] : source.source_excerpt_pieces
  if (image && !SHA.test(source.source_body_sha256 || '')) reject('IMAGE_HASH_REQUIRED', sourceId)
  if (!Array.isArray(pieces)) reject('SOURCE_EXCERPT_REQUIRED', sourceId)
  if (!image && !pieces.length) reject('SOURCE_EXCERPT_REQUIRED', sourceId)
  for (const p of pieces) {
    if (!isObject(p) || !Number.isSafeInteger(p.source_start_line) ||
      !Number.isSafeInteger(p.source_end_line) || p.source_end_line < p.source_start_line ||
      typeof p.verbatim !== 'string' || !p.verbatim.trim()) reject('SOURCE_LINE_PROVENANCE_INVALID', sourceId)
  }
  if (!SHA.test(source.source_body_sha256 || '')) reject('SOURCE_DIGEST_INVALID', sourceId)
  return Object.freeze({
    sourceId,
    bodyHash: source.source_body_sha256 || null,
    excerptHash: sha(JSON.stringify(pieces.map(p=>[p.source_start_line,p.source_end_line,p.verbatim]))),
    hasVerbatim: Boolean(pieces.length),
    sourceAuthor: source.source_author || 'UNKNOWN'
  })
}
function prepareReviewBatch(input, expectedSchoolId) {
  if (!Number.isSafeInteger(expectedSchoolId) || expectedSchoolId <= 0) reject('TRUSTED_SCHOOL_REQUIRED')
  if (!isObject(input) || input.schema !== 'assps.lesson_plan.review_import.v1' ||
    !Array.isArray(input.candidates) || input.candidates.length < 1 || input.candidates.length > 250) {
    reject('INTAKE_SCHEMA_INVALID')
  }
  if (!SHA.test(input.source_zip_sha256 || '') || !SHA.test(input.source_txt_sha256 || '')) {
    reject('ORIGINAL_EXPORT_HASH_REQUIRED')
  }
  const grouped = new Map()
  const review = []
  const seen = new Set()
  let excerptCount = 0
  for (const c of input.candidates) {
    if (!isObject(c) || typeof c.candidate_key !== 'string' || !/^LPREVIEW-[A-Za-z0-9-]{8,95}$/.test(c.candidate_key)) reject('CANDIDATE_ID_INVALID')
    if (seen.has(c.candidate_key)) reject('DUPLICATE_CANDIDATE', c.candidate_key)
    seen.add(c.candidate_key)
    if (c.school_id !== expectedSchoolId) reject('CROSS_TENANT_CANDIDATE', c.candidate_key)
    const klass = normalizeClass(c.proposed_class_level)
    if (!klass || klass !== normalizeClass(c.class_display)) reject('CLASS_MAPPING_UNVERIFIED', c.candidate_key)
    const subject = safeSubject(c.source_subject_label)
    if (!subject) reject('SUBJECT_MAPPING_INVALID', c.candidate_key)
    if (c.publish_status !== 'BLOCKED' || c.sent_to_portal !== false ||
      c.ready_for_post_api !== false || c.safe_import_mode !== 'REVIEW_ONLY_APPEND_LINKED_SOURCES' ||
      c.review_state !== 'AWAITING_SUBJECT_OWNER_AND_ACADEMIC_QA') reject('UNSAFE_PUBLICATION_STATE', c.candidate_key)
    for (const field of ['teacher_user_id','section_id','canonical_subject_id','document_owner_id',
      'canonical_term_id','reviewer_identity','approval_signature','corrected_schedule']) {
      if (c[field] !== null) reject('UNVERIFIED_ASSIGNMENT_OR_APPROVAL', field + ' ' + c.candidate_key)
    }
    if (!Array.isArray(c.source_submissions) || !c.source_submissions.length ||
      !Array.isArray(c.source_detail_records)) reject('SOURCE_IDS_REQUIRED', c.candidate_key)
    const sourceIds = [...new Set(c.source_submissions)]
    if (sourceIds.length !== c.source_submissions.length ||
      sourceIds.some(s => typeof s !== 'string' || !SOURCE_ID.test(s))) reject('SOURCE_ID_INVALID', c.candidate_key)
    if (sourceIds.length !== c.source_detail_records.length) reject('SOURCE_COUNT_MISMATCH', c.candidate_key)
    const evidenceById = new Map(c.source_detail_records.map(x=>[x.source_id,x]))
    if (evidenceById.size !== sourceIds.length) reject('SOURCE_COUNT_MISMATCH', c.candidate_key)
    const evidence = sourceIds.map(id=>validateSource(evidenceById.get(id),id))
    excerptCount += evidence.reduce((n,e)=>n+(e.hasVerbatim?1:0),0)
    const digest = sha(JSON.stringify([expectedSchoolId, klass, subject, evidence.map(e=>[e.sourceId,e.bodyHash,e.excerptHash])]))
    const safe = Object.freeze({
      reviewKey:c.candidate_key, schoolId:expectedSchoolId, className:klass, subject,
      composerRole:'COMPOSER_ONLY', teacherUserId:null, sectionId:null, termId:null,
      reviewStatus:'PENDING_ACADEMIC_REVIEW', publishStatus:'BLOCKED', sentToPortal:false,
      readyForLegacyPost:false, evidence, digest,
      issues:[...(Array.isArray(c.blocking_reasons)?c.blocking_reasons:[])]
    })
    review.push(safe)
    if (!grouped.has(klass)) grouped.set(klass,[])
    grouped.get(klass).push(safe)
  }
  const unassigned = input.unassigned_evidence || []
  if (!Array.isArray(unassigned) || unassigned.some(id=>typeof id!=='string'||!SOURCE_ID.test(id))) reject('UNASSIGNED_EVIDENCE_INVALID')
  const groups = CLASSES.filter(c=>grouped.has(c)).map(klass=>Object.freeze({
    className:klass,
    subjects:Object.freeze(grouped.get(klass).sort((a,b)=>a.subject.localeCompare(b.subject,'en')))
  }))
  return Object.freeze({
    schoolId:expectedSchoolId, originalZipHash:input.source_zip_sha256,
    originalTextHash:input.source_txt_sha256,
    reviewStatus:'PENDING_ACADEMIC_REVIEW', published:false,
    candidateCount:review.length, classes:groups, unassignedSourceIds:[...unassigned],
    evidenceWithVerbatimCount:excerptCount,
    manifestHash:sha(JSON.stringify([input.source_zip_sha256,input.source_txt_sha256,review.map(r=>[r.reviewKey,r.digest])])),
    candidates:review
  })
}
module.exports = { CLASSES, normalizeClass, safeSubject, prepareReviewBatch }
