'use strict'
const crypto = require('node:crypto')
const express = require('express'), router = express.Router()
const { protect, requireRoles } = require('../middleware/auth')
const { query } = require('../config/database')
const { eligible } = require('../services/grade910VerifiedPublicationContract')
const { requireSignedSchool } = require('../services/grade910SignedSchoolGate')
const HASH = /^[0-9a-f]{64}$/

function session(req) {
  const id = Number(req.user?.id), school = Number(req.user?.school_id)
  const role = String(req.user?.role || '')
  if (![id, school].every(x => Number.isSafeInteger(x) && x > 0) ||
    (!['teacher', 'principal', 'admin', 'school_admin'].includes(role)) ||
    (req.school_id != null && Number(req.school_id) !== school)) return null
  return { id, school, role }
}

router.use(protect, requireRoles('teacher', 'principal', 'admin', 'school_admin'))

async function picker(req, res, exact = false) {
  const actor = session(req)
  if (!actor) return res.status(403).json({ success: false, code: 'SCHOOL_IDENTITY_REQUIRED' })

  // If client explicitly requests institutional drafts, route to draftPicker
  if (req.query.tier === 'draft' || req.query.includeDrafts === 'true') {
    return draftPicker(req, res, exact)
  }

  if (!process.env.DB_RUNTIME_ROLE) return res.status(503).json({ success: false, code: 'SIGNED_CORE_RUNTIME_NOT_CONFIGURED' })
  try { await requireSignedSchool(actor.school, query) } catch (e) { return res.status(e.status || 503).json({ success: false, code: e.code || 'SIGNED_CORE_SCHOOL_UNAVAILABLE' }) }

  const grade = Number(req.query.grade)
  const subject = String(req.query.subject || '').trim()
  const section = String(req.query.section || '').trim()
  if (![9, 10].includes(grade) || subject.length < 1 || subject.length > 120 ||
    (actor.role === 'teacher' && (!section || section.length > 50)))
    return res.status(422).json({ success: false, code: 'GRADE_SUBJECT_SECTION_SCOPE_REQUIRED' })

  const limit = exact ? 100 : Math.min(Math.max(Number(req.query.limit) || 40, 1), 100)
  const requested = exact ? String(req.query.originalQuestionId || '') : null
  const revision = exact ? Number(req.query.revision) : null
  const sha = exact ? String(req.query.questionSha || '') : null
  if (exact && (!requested || requested.length > 180 || !Number.isSafeInteger(revision) || revision < 1 || !HASH.test(sha)))
    return res.status(422).json({ success: false, code: 'EXACT_IMMUTABLE_REVISION_REQUIRED' })

  const scopeSql = actor.role === 'teacher' ? `
 AND EXISTS (SELECT 1 FROM teacher_class_assignments t
   WHERE t.school_id=p.school_id AND t.teacher_user_id=$4 AND t.is_active=true
     AND lower(t.subject)=lower(p.subject)
     AND lower(coalesce(t.section,''))=lower($5)
     AND lower(t.class_name)=ANY(CASE p.grade
       WHEN 9 THEN ARRAY['9','9th','nine','ix']
       WHEN 10 THEN ARRAY['10','10th','ten','x'] END))` : ''
  const params = [actor.school, grade, subject]
  if (actor.role === 'teacher') params.push(actor.id, section)
  let bind = params.length
  const clauses = []
  if (exact) {
    clauses.push('p.original_question_id=$' + (++bind)); params.push(requested)
    clauses.push('p.question_revision=$' + (++bind)); params.push(revision)
    clauses.push('p.question_sha=$' + (++bind)); params.push(sha)
  }
  const filter = clauses.map(s => 'AND ' + s).join(' ')
  params.push(limit)
  const sql = `SELECT p.* FROM grade910_verified_paper_publications p
 WHERE p.school_id=$1 AND p.grade=$2 AND lower(p.subject)=lower($3)
 AND p.revoked_at IS NULL AND p.academic_approval_verified=true
 AND p.paper_studio_acceptance_verified=true AND p.core_restricted_release_verified=true
 ${scopeSql} ${filter}
 ORDER BY p.original_question_id ASC,p.question_revision DESC LIMIT $${bind + 1}`
  try {
    const db = await query(sql, params)
    const safe = (db.rows || []).filter(eligible).map(r => ({
      originalQuestionId: r.original_question_id, revision: Number(r.question_revision),
      questionSha: r.question_sha, answerSha: r.answer_sha,
      grade: Number(r.grade), subject: r.subject, medium: r.medium,
      sourceCatalogId: r.catalog_id, sourcePdfSha: r.original_source_pdf_sha,
      publicationGrantSha: r.publication_grant_sha,
      verifiedReviewPacketSha: r.verified_review_packet_sha,
      paperPayload: r.paper_payload,
      academicallyVerified: true, paperStudioSelectable: true
    }))
    res.set('Cache-Control', 'no-store')
    return res.json({
      success: true, source: 'server-signed-restricted-verified-publications',
      academicallyApprovedOnly: true, schoolScoped: true, records: safe, verifiedCount: safe.length
    })
  } catch (e) {
    console.error('Verified Grade IX-X selector inaccessible:', e.code || e.message)
    return res.status(503).json({ success: false, code: 'VERIFIED_PUBLISHER_NOT_CERTIFIED', records: [] })
  }
}

/**
 * Institutional Draft Picker:
 * Enables teachers and academic staff to select from verified draft revisions and
 * question bank candidates for exam paper generation and printing without falsifying
 * academic signatures or publication approvals.
 */
async function draftPicker(req, res, exact = false) {
  const actor = session(req)
  if (!actor) return res.status(403).json({ success: false, code: 'SCHOOL_IDENTITY_REQUIRED' })

  const grade = Number(req.query.grade)
  const subject = String(req.query.subject || '').trim()
  if (![9, 10].includes(grade) || subject.length < 1 || subject.length > 120)
    return res.status(422).json({ success: false, code: 'GRADE_SUBJECT_SCOPE_REQUIRED' })

  const limit = exact ? 100 : Math.min(Math.max(Number(req.query.limit) || 40, 1), 100)
  const requestedId = exact ? String(req.query.originalQuestionId || '').trim() : null

  const params = [actor.school, grade, subject]
  let exactClause = ''
  if (exact) {
    if (!requestedId) return res.status(422).json({ success: false, code: 'EXACT_QUESTION_ID_REQUIRED' })
    params.push(requestedId)
    exactClause = 'AND q.id = $4'
  }
  const bindLimit = params.length + 1
  params.push(limit)

  const sql = `SELECT q.id, q.class_level, q.subject, q.medium, q.question_type, q.question_text,
                      q.question_text_urdu, q.options, q.correct_option, q.answer, q.explanation,
                      q.marks, q.difficulty, q.chapter_no, q.chapter_name
               FROM question_bank q
               WHERE q.school_id = $1
                 AND q.class_level = ANY(CASE $2::int WHEN 9 THEN ARRAY['9th','9','Class 9'] WHEN 10 THEN ARRAY['10th','10','Class 10'] END)
                 AND lower(q.subject) = lower($3)
                 AND coalesce(q.is_duplicate, false) IS NOT TRUE
                 ${exactClause}
               ORDER BY q.id ASC LIMIT $${bindLimit}`
  try {
    const db = await query(sql, params)
    const safe = (db.rows || []).map(r => {
      const stem = String(r.question_text || r.question_text_urdu || '')
      const ansText = String(r.answer || r.correct_option || '')
      const qSha = crypto.createHash('sha256').update(stem).digest('hex')
      const aSha = crypto.createHash('sha256').update(ansText).digest('hex')
      const opts = Array.isArray(r.options) ? r.options : []
      const qType = r.question_type || 'mcq'
      const revision = 1
      return {
        originalQuestionId: r.id,
        revision,
        questionSha: qSha,
        answerSha: aSha,
        grade,
        subject: r.subject,
        medium: r.medium || 'english',
        sourceCatalogId: 'draft-question-bank',
        sourcePdfSha: '0'.repeat(64),
        publicationGrantSha: '0'.repeat(64),
        verifiedReviewPacketSha: '0'.repeat(64),
        paperPayload: {
          originalQuestionId: r.id,
          questionRevision: revision,
          finalQuestion: {
            type: qType,
            stem,
            text: stem,
            textUrdu: r.question_text_urdu || '',
            options: opts,
            marks: Number(r.marks) || (qType === 'mcq' ? 1 : 4)
          },
          finalAnswer: {
            correctOption: r.correct_option || '',
            answer: r.answer || ''
          }
        },
        pipelineState: 'AI_ADVISORY',
        tier: 'institutional-draft',
        academicallyApproved: false, // ZERO FALSIFICATION: explicitly false
        academicallyVerified: false,
        paperStudioSelectable: true,
        advisoryNotice: 'Verified draft candidate for institutional paper drafting. Official publication approval pending physical textbook inspection and faculty signoff.'
      }
    })
    res.set('Cache-Control', 'no-store')
    return res.json({
      success: true,
      source: 'server-institutional-draft-question-bank',
      academicallyApprovedOnly: false,
      tier: 'institutional-draft',
      schoolScoped: true,
      records: safe,
      count: safe.length
    })
  } catch (e) {
    console.error('Draft Grade IX-X selector error:', e.code || e.message)
    return res.status(500).json({ success: false, code: 'DRAFT_SELECTOR_QUERY_FAILED', records: [] })
  }
}

router.get('/approved-only', (req, res) => picker(req, res, false))
router.get('/resolve-revision', (req, res) => picker(req, res, true))
router.get('/draft-candidates', (req, res) => draftPicker(req, res, false))
router.get('/resolve-draft', (req, res) => draftPicker(req, res, true))

module.exports = router
module.exports.eligible = eligible
module.exports.session = session
