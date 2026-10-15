'use strict'
// Guards canonical documents that claim verified or institutional draft Grade IX/X revisions.
// Distinguishes institutional draft classroom authoring from official publication certification.
// Never changes status, grants publication, or trusts client academic approval labels.
const crypto = require('crypto')
const { eligible } = require('./grade910VerifiedPublicationContract')
function block(code, status = 409) { const error = Error(code); error.code = code; error.status = status; throw error }
const norm = v => String(v ?? '').trim()
function gradeOf(raw) {
 const s = norm(raw).toLowerCase().replace(/^class\s*/, '')
 if (/^(9|9th|ix|nine)(?:\s|$)/.test(s)) return 9
 if (/^(10|10th|x|ten)(?:\s|$)/.test(s)) return 10
 return null
}
function expectedPrintedText(published) {
 const q = published.paper_payload.finalQuestion, answer = published.paper_payload.finalAnswer
 const stem = published.medium === 'urdu' ?
  norm(q.textUrdu || q.ur || q.text || q.stem || q.en) :
  norm(q.text || q.stem || q.en)
 if (!stem) block('CERTIFIED_QUESTION_EMPTY')
 const type = q.type
 if (!['mcq', 'short', 'long'].includes(type)) block('CERTIFIED_PAPER_TYPE_UNSUPPORTED')
 const options = type === 'mcq' ? (q.options || []).map((o, i) => {
  const key = norm(o.key || o.label || String.fromCharCode(65 + i))
  const value = published.medium === 'urdu' ? norm(o.textUrdu || o.ur || o.text || o.en) : norm(o.text || o.en)
  if (!key || !value) block('CERTIFIED_OPTION_INCOMPLETE')
  return '(' + key + ') ' + value
 }) : []
 if (type === 'mcq') {
  if (options.length < 2 || !norm(answer.correctOption || answer.option)) block('CERTIFIED_MCQ_ANSWER_INCOMPLETE')
 }
 return { type, marks: Number(q.marks), content: '1. ' + stem + (options.length ? '\n' + options.join('\n') : ''),
  answer: norm(answer.correctOption || answer.option || '') }
}

function isInstitutionalDraftRow(row) {
 const ref = row?.question?.verifiedAcademicRef
 return row?.tier === 'institutional-draft' || ref?.tier === 'institutional-draft'
}

async function assertVerifiedPaperDocument({ document, schoolId, actor, lookup, isRelease = false }) {
 const manifest = document?.academicVerifiedSelections
 if (manifest == null) return { verifiedReferences: 0, draftReferences: 0 } // All existing unsigned/manual/archived papers unchanged.
 if (manifest.schemaVersion !== 'assps-grade910-canonical-approved-revisions-v1' ||
   manifest.alwaysRequireServerReverification !== true ||
   !Array.isArray(manifest.rows) || !manifest.rows.length || manifest.rows.length > 100)
  block('CERTIFIED_REVISION_MANIFEST_INVALID')

 const userId = Number(actor?.id), sId = Number(schoolId)
 if (!Number.isSafeInteger(userId) || userId < 1 || !Number.isSafeInteger(sId) || sId < 1 ||
    !['teacher', 'principal', 'admin', 'school_admin', 'super_admin'].includes(norm(actor.role)))
  block('AUTHENTIC_SIGNED_SCHOOL_ACTOR_REQUIRED', 403)
 const grade = gradeOf(document?.metadata?.className || document?.metadata?.classLevel)
 const subject = norm(document?.metadata?.subjectName || document?.metadata?.subject)
 if (!grade || !subject) block('CERTIFIED_GRADE_SUBJECT_SCOPE_INVALID')
 if (!Array.isArray(document.sections)) block('CANONICAL_RENDERED_SECTIONS_REQUIRED')

 const draftRows = manifest.rows.filter(isInstitutionalDraftRow)
 const approvedRows = manifest.rows.filter(r => !isInstitutionalDraftRow(r))

 // Institutional drafts are unapproved advisory materials and can NEVER be finalized as signed releases
 if (isRelease && draftRows.length > 0) {
  block('INSTITUTIONAL_DRAFT_CANNOT_BE_OFFICIALLY_RELEASED', 409)
 }

 // Official publication verification requires publisher Ed25519 signing keys
 if (approvedRows.length > 0) {
  if (!process.env.DB_RUNTIME_ROLE || !process.env.ASSPS_GRADE910_PUBLISHER_PUBLIC_KEY_PEM ||
    !process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256)
   block('CORE_SIGNED_PUBLICATION_TRUST_NOT_CONFIGURED', 503)
 }

 const seen = new Set()
 for (const row of manifest.rows) {
  const isDraft = isInstitutionalDraftRow(row)
  const ref = row?.question?.verifiedAcademicRef, sec = row?.section
  if (!ref || !sec || !row.originalQuestionId || seen.has(row.originalQuestionId + ':' + row.revision) ||
   ref.originalQuestionId !== row.originalQuestionId || Number(ref.revision) !== Number(row.revision) ||
   row.questionSha !== ref.questionSha || row.answerSha !== ref.answerSha ||
   Number(ref.grade) !== grade || norm(ref.subject).toLowerCase() !== subject.toLowerCase())
   block('CANONICAL_ACADEMIC_SOURCE_REPLAY_OR_FORGERY')
  seen.add(row.originalQuestionId + ':' + row.revision)

  const actual = document.sections.find(s => s.id === 'manual-section-' + sec.id || s.id === sec.id)
  const actualNode = actual?.nodes?.[0]
  const rendered = norm(actualNode?.content ?? actualNode?.stemText)
  if (!actual || !actualNode || rendered !== norm(sec.content) ||
   Number(actualNode.operationalNodeMarks) !== Number(sec.marks) ||
   Number(actual.operationalSectionTotal) !== Number(sec.marks))
   block('CANONICAL_RENDERED_QUESTION_NOT_SOURCE_BOUND')

  if (actor.role === 'teacher') {
   const teacherScope = await lookup(
    `SELECT EXISTS(SELECT 1 FROM teacher_class_assignments t WHERE t.school_id=$1
       AND t.teacher_user_id=$2 AND t.is_active=true
       AND lower(t.subject)=lower($3) AND lower(coalesce(t.section,''))=lower($4)
       AND lower(t.class_name)=ANY($5::text[])) AS allowed`,
    [sId, userId, subject, norm(ref.section), grade === 9 ? ['9', '9th', 'ix', 'nine'] : ['10', '10th', 'x', 'ten']]
   )
   if (teacherScope.rows?.[0]?.allowed !== true) block('CERTIFIED_TEACHER_EXACT_ASSIGNMENT_REQUIRED', 403)
  }

  if (isDraft) {
   // Strict institutional draft invariants:
   // Zero falsification: must not claim academic approval or official publication grants
   if (ref.academicallyApproved === true || row.academicallyApproved === true) {
    block('DRAFT_CANNOT_CLAIM_ACADEMIC_APPROVAL', 409)
   }
   const UNAPPROVED_SHA = '0'.repeat(64)
   if (row.publicationGrantSha !== UNAPPROVED_SHA || ref.publicationGrantSha !== UNAPPROVED_SHA) {
    block('DRAFT_CANNOT_CLAIM_PUBLICATION_GRANT', 409)
   }
   // Visible advisory heading classification
   const heading = norm(sec.heading)
   if (!(/Draft Candidate.*AI Advisory/i.test(heading) || heading.indexOf('\u0645\u0633\u0648\u062f\u06c1') !== -1 || row.tier === 'institutional-draft' || ref.tier === 'institutional-draft')) {
    block('DRAFT_ADVISORY_CLASSIFICATION_REQUIRED', 409)
   }

   // Validate against question_bank
   const qDb = await lookup(
    `SELECT id, school_id, class_level, subject, question_text, question_text_urdu, answer, correct_option, marks, question_type
     FROM question_bank
     WHERE id = $1 AND school_id = $2 AND coalesce(is_duplicate, false) IS NOT TRUE LIMIT 1`,
    [row.originalQuestionId, sId]
   )
   const qRow = qDb.rows?.[0]
   if (!qRow) block('DRAFT_QUESTION_NOT_FOUND_IN_BANK', 404)

   const stem = norm(qRow.question_text || qRow.question_text_urdu || '')
   const ansText = norm(qRow.answer || qRow.correct_option || '')
   const expectedQSha = crypto.createHash('sha256').update(stem).digest('hex')
   const expectedASha = crypto.createHash('sha256').update(ansText).digest('hex')
   if (row.questionSha !== expectedQSha || row.answerSha !== expectedASha) {
    block('DRAFT_QUESTION_REVISION_HASH_MISMATCH', 409)
   }
  } else {
   // Certified official publication validation
   if (row.publicationGrantSha !== ref.publicationGrantSha) block('CANONICAL_ACADEMIC_SOURCE_REPLAY_OR_FORGERY')
   const r = await lookup(`SELECT * FROM grade910_verified_paper_publications
      WHERE school_id=$1 AND original_question_id=$2 AND question_revision=$3
        AND question_sha=$4 AND answer_sha=$5 AND publication_grant_sha=$6
        AND grade=$7 AND lower(subject)=lower($8) AND revoked_at IS NULL LIMIT 1`,
    [sId, row.originalQuestionId, Number(row.revision), row.questionSha, row.answerSha,
     row.publicationGrantSha, grade, subject]
   )
   const published = r.rows?.[0]
   if (!eligible(published)) block('CERTIFIED_PUBLISHER_SIGNATURE_OR_REVISION_INVALID')
   const expected = expectedPrintedText(published)
   if (expected.type !== sec.layoutPreset || expected.content !== sec.content ||
      expected.marks !== Number(sec.marks) ||
      expected.marks !== Number(row.question.marks))
    block('CANONICAL_PRINT_TEXT_OR_MARKS_CHANGED')
   if (expected.type === 'mcq' && norm(sec.answerKey?.['1']) !== expected.answer)
    block('CERTIFIED_MCQ_ANSWER_KEY_CHANGED')
  }
 }
 return { verifiedReferences: approvedRows.length, draftReferences: draftRows.length }
}

module.exports = { assertVerifiedPaperDocument, gradeOf, expectedPrintedText, isInstitutionalDraftRow }
