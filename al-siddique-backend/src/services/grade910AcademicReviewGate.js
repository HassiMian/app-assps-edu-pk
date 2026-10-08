'use strict'
const { createHash } = require('node:crypto')
const { isDeepStrictEqual } = require('node:util')
const SOURCE_REGISTRY = require('../data/verifiedGrade910SourceRegistry.json')

const ACADEMIC_REVIEW_VERSION = 'assps-grade910-independent-review-v1'
const ATTESTATIONS = Object.freeze([
  'sourceImageChecked','editionChecked','chapterMatchChecked',
  'curriculumChecked','answerKeyChecked','languageChecked','originalityChecked',
])
const GRADE_PATTERN = /^(?:9|10)(?:th)?$/i
const normalizeGrade = value => {
  const grade = String(value||'').trim()
  return GRADE_PATTERN.test(grade) ? parseInt(grade,10) : null
}
function error(code,message,status=409){
  const e=new Error(message);e.code=code;e.status=status;return e
}
function normalizeEvidence(evidence, question) {
  if (!evidence || typeof evidence!=='object'||Array.isArray(evidence))
    throw error('ACADEMIC_EVIDENCE_REQUIRED','Independent academic review evidence is required.',422)
  if (evidence.schemaVersion!==ACADEMIC_REVIEW_VERSION)
    throw error('INVALID_REVIEW_SCHEMA','Academic evidence schema version mismatch.',422)
  const grade=normalizeGrade(question.classLevel)
  if (!grade) throw error('UNSUPPORTED_ACADEMIC_GRADE','This gate is for Grade 9/10 only.',400)
  const source=SOURCE_REGISTRY.entries.find(entry=>
    entry.recordId===evidence.sourceRecordId &&
    entry.grade===grade &&
    entry.subject.trim().toLowerCase()===String(question.subject||'').trim().toLowerCase() &&
    entry.medium.trim().toLowerCase()===String(question.medium||'').trim().toLowerCase() &&
    entry.pdfSha256===evidence.sourcePdfSha256
  )
  if(!source)throw error('UNVERIFIED_SOURCE_IDENTITY','Exact official source hash, grade, subject and medium must match the source registry.',422)
  const edition=String(evidence.edition||'').trim()
  if(!/^[12][0-9]{3}(-[0-9]{2,4})?$/.test(edition)||edition!==source.edition)
    throw error('UNVERIFIED_SOURCE_EDITION','A matching verified textbook edition is required.',422)
  if(String(evidence.chapterNo||'').trim()!==String(question.chapterNo||'').trim() ||
     !String(question.chapterNo||'').trim())
    throw error('INVALID_CHAPTER_EVIDENCE','The reviewed chapter must match this exact question revision.',422)
  const mode=evidence.questionOrigin
  if(!['ORIGINAL','TEXTBOOK_EXERCISE'].includes(mode))
    throw error('INVALID_QUESTION_ORIGIN','Original authorship or exercise source is required.',422)
  if(mode==='TEXTBOOK_EXERCISE' &&
    (!Number.isInteger(evidence.sourcePrintedPage)||evidence.sourcePrintedPage<1||
     !/^[a-z0-9][a-z0-9 .#:/()_-]{2,90}$/i.test(String(evidence.exerciseReference||''))))
    throw error('MISSING_EXERCISE_PROVENANCE','Textbook-derived questions require page and exercise reference.',422)
  if(mode==='ORIGINAL' &&
    (evidence.sourcePrintedPage!=null || evidence.exerciseReference!=null))
    throw error('FALSE_ORIGINAL_EXERCISE_REFERENCE','Original questions must not invent question-level textbook citations.',422)
  for(const key of ATTESTATIONS)
    if(evidence.attestations?.[key]!==true)
      throw error('ACADEMIC_ATTESTATION_INCOMPLETE','Missing explicit review attestation: '+key,422)
  if(String(evidence.editorialNotes||'').trim().length<45)
    throw error('ACADEMIC_REVIEW_NOTES_REQUIRED','Provide substantive independent review notes.',422)
  return {
    schemaVersion:ACADEMIC_REVIEW_VERSION,
    questionOrigin:mode,sourceRecordId:source.recordId,
    sourcePdfSha256:source.pdfSha256,edition:source.edition,
    chapterNo:String(evidence.chapterNo).trim(),
    sourcePrintedPage:mode==='TEXTBOOK_EXERCISE'?evidence.sourcePrintedPage:null,
    exerciseReference:mode==='TEXTBOOK_EXERCISE'?evidence.exerciseReference.trim():null,
    attestations:Object.fromEntries(ATTESTATIONS.map(key=>[key,true])),
    editorialNotes:evidence.editorialNotes.trim().slice(0,2000),
    academicApprovalGranted:false,
  }
}
function reviewMappingKey(revisionNumber,contentHash){
  if(!Number.isInteger(Number(revisionNumber))||Number(revisionNumber)<1 ||
    !/^[a-f0-9]{64}$/i.test(String(contentHash||'')))
    throw error('INVALID_REVIEW_REVISION_BINDING','Invalid revision number or immutable content hash.')
  return String(revisionNumber)+':'+String(contentHash).toLowerCase()
}
module.exports={ACADEMIC_REVIEW_VERSION,ATTESTATIONS,normalizeGrade,
  normalizeEvidence,reviewMappingKey,error}

function canonicalComparedContent(value = {}, legacy = false) {
  const str=x=>String(x??'').trim().replace(/\s+/g,' ')
  const arr=Array.isArray(value.options)?value.options:[]
  return {
    questionType:str(legacy?value.question_type:value.questionType).toLowerCase(),
    questionText:str(legacy?value.question_text:value.questionText),
    questionTextUrdu:str(legacy?value.question_text_urdu:value.questionTextUrdu),
    options:arr.map((option,i)=>({
      label:str(typeof option==='string'?String.fromCharCode(65+i):option?.label),
      text:str(typeof option==='string'?option:option?.text),
    })),
    correctOption:str(legacy?value.correct_option:value.correctOption).toUpperCase(),
    answer:str(value.answer),
    explanation:str(value.explanation),
    marks:Number(value.marks),
  }
}
function approvedSourceMatchesRevision(source,revision){
  return JSON.stringify(canonicalComparedContent(source,true))===
    JSON.stringify(canonicalComparedContent(revision,false))
}

async function assertIndependentReviewReady(client,{schoolId,master,actorId}){
  const latest=await client.query(
    'SELECT revision_number,content_hash,content_json,created_by FROM question_revisions WHERE school_id=$1 AND question_master_id=$2 AND revision_number=$3',
    [schoolId,master.id,master.current_revision]
  )
  if(latest.rowCount!==1)throw error('MISSING_REVIEWED_REVISION','Exact current revision was not found.')
  const rev=latest.rows[0],grade=normalizeGrade(rev.content_json?.classLevel)
  const linked=master.source_question_bank_id
    ? await client.query(
      'SELECT id,school_id,class_level,subject,medium,chapter_no,question_type,question_text,question_text_urdu,options,correct_option,answer,explanation,marks,is_approved,metadata FROM question_bank WHERE school_id=$1 AND id=$2 FOR UPDATE',
      [schoolId,master.source_question_bank_id])
    : {rowCount:0,rows:[]}
  const sourceGrade=linked.rowCount===1?normalizeGrade(linked.rows[0].class_level):null
  if(!grade&&!sourceGrade)return {grade:null,legacyRecord:null,review:null,revision:rev}
  if(grade!==sourceGrade)
    throw error('ACADEMIC_GRADE_MISMATCH','Governed revision and linked Question Bank grade disagree.')

  const hash=String(rev.content_hash||'').trim().toLowerCase()
  const key=reviewMappingKey(Number(rev.revision_number),hash)
  const review=await client.query(
    "SELECT mapping_status,metadata,created_by,reviewed_by FROM question_mappings WHERE school_id=$1 AND question_master_id=$2 AND mapping_type='grade910_independent_academic_review' AND mapping_key=$3",
    [schoolId,master.id,key]
  )
  if(review.rowCount!==1||review.rows[0].mapping_status!=='reviewed')
    throw error('INDEPENDENT_REVIEW_REQUIRED','Current Grade 9/10 revision has no valid independent academic review.',409)
  const signed=review.rows[0],reviewer=Number(signed.reviewed_by)
  if(!Number.isInteger(reviewer)||reviewer<1 ||
     !Number.isInteger(Number(actorId))||Number(actorId)===reviewer ||
     !Number.isInteger(Number(rev.created_by))||Number(rev.created_by)===reviewer ||
     !Number.isInteger(Number(master.created_by))||Number(master.created_by)===reviewer)
    throw error('REVIEW_INDEPENDENCE_REQUIRED','An identified independent academic reviewer, different from author and releaser, is mandatory.')
  if(signed.metadata?.currentRevision!==Number(rev.revision_number)||
     signed.metadata?.contentHash!==hash ||
     signed.metadata?.reviewerUserId!==reviewer ||
     signed.metadata?.schoolId!==Number(schoolId))
    throw error('STALE_ACADEMIC_REVIEW','Review evidence is not bound to current school/revision/hash.')
  const normalized=normalizeEvidence(signed.metadata?.sourceEvidence,rev.content_json)
  if(!isDeepStrictEqual(normalized,signed.metadata?.sourceEvidence))
    throw error('TAMPERED_ACADEMIC_EVIDENCE','Academic review metadata failed source registry verification.')
  if(!master.source_question_bank_id)
    throw error('MISSING_PRODUCTION_QUESTION_LINK','Current Grade 9/10 question is not linked to a tenant-local Question Bank record.')
  const qbank=linked
  if(qbank.rowCount!==1)throw error('PRODUCTION_QUESTION_NOT_FOUND','Linked school question was not found in this tenant.')
  const source=qbank.rows[0]
  if(normalizeGrade(source.class_level)!==grade||
     String(source.subject||'').toLowerCase().trim()!==rev.content_json.subject ||
     String(source.medium||'').toLowerCase().trim()!==rev.content_json.medium ||
     String(source.chapter_no||'').trim()!==String(rev.content_json.chapterNo||'').trim() ||
     String(source.question_text||'').trim().replace(/\s+/g,' ')!==String(rev.content_json.questionText||'').trim())
    throw error('SOURCE_REVISION_CONTENT_DRIFT','Legacy question content differs from independently reviewed revision.')
  if(!approvedSourceMatchesRevision(source,rev.content_json))
    throw error('QUESTION_ANSWER_KEY_REVISION_DRIFT','Answer keys, marks, options or content differ from the independently reviewed revision.')
  if(source.is_approved===true)
    throw error('QUESTION_ALREADY_APPROVED','Question is already approved and must not be silently republished.')
  return {grade,legacyRecord:source,review:signed,revision:rev}
}
module.exports.assertIndependentReviewReady=assertIndependentReviewReady

module.exports.approvedSourceMatchesRevision=approvedSourceMatchesRevision
