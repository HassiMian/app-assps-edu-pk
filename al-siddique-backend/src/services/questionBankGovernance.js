const crypto = require('crypto')
const {assertIndependentReviewReady}=require('./grade910AcademicReviewGate')

const text = value => String(value ?? '').trim().replace(/\s+/g, ' ')
const lower = value => text(value).toLowerCase()

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  }
  return value
}

function sha256(value) {
  const payload = typeof value === 'string' ? value : JSON.stringify(stable(value))
  return crypto.createHash('sha256').update(payload).digest('hex')
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return []
  return options.map((option, index) => {
    if (typeof option === 'string') return { label: String.fromCharCode(65 + index), text: text(option) }
    return {
      label: text(option?.label || String.fromCharCode(65 + index)),
      text: text(option?.text ?? option?.value ?? ''),
    }
  })
}

function normalizeQuestionForGovernance(input = {}) {
  return {
    classLevel: text(input.class_level ?? input.classLevel),
    subject: lower(input.subject),
    medium: lower(input.medium || 'english'),
    board: lower(input.board || 'Punjab Board'),
    chapterNo: text(input.chapter_no ?? input.chapterNo),
    chapterName: lower(input.chapter_name ?? input.chapterName ?? input.chapter),
    topicName: lower(input.topic_name ?? input.topicName),
    questionType: lower(input.question_type ?? input.type),
    questionText: text(input.question_text ?? input.text ?? input.en),
    questionTextUrdu: text(input.question_text_urdu ?? input.textUrdu ?? input.ur),
    options: normalizeOptions(input.options),
  }
}

function buildCanonicalFingerprint(input = {}) {
  return sha256(normalizeQuestionForGovernance(input))
}

function buildQuestionRevisionPayload(input = {}) {
  const normalized = normalizeQuestionForGovernance(input)
  return {
    ...normalized,
    correctOption: text(input.correct_option ?? input.correctOption),
    answer: text(input.answer),
    explanation: text(input.explanation),
    marks: Number.isFinite(Number(input.marks)) ? Number(input.marks) : 1,
    difficulty: lower(input.difficulty || 'medium'),
    priority: lower(input.priority || 'exercise'),
    sourceType: lower(input.source_type ?? input.sourceType),
    sourceFileId: text(input.source_file_id ?? input.sourceFileId),
    sourcePageNo: Number.isFinite(Number(input.source_page_no ?? input.sourcePageNo)) ? Number(input.source_page_no ?? input.sourcePageNo) : null,
  }
}

function buildRevisionHash(input = {}) {
  return sha256(buildQuestionRevisionPayload(input))
}

const lifecycleTransitions = Object.freeze({
  candidate: new Set(['reviewed', 'retired']),
  reviewed: new Set(['candidate', 'ready', 'retired']),
  ready: new Set(['reviewed', 'retired']),
  retired: new Set([]),
})

function assertLifecycleTransition(from, to) {
  const current = lower(from)
  const next = lower(to)
  if (current === next) return true
  if (!lifecycleTransitions[current]?.has(next)) {
    const error = new Error(`Invalid question lifecycle transition: ${current || '<empty>'} -> ${next || '<empty>'}`)
    error.code = 'INVALID_QUESTION_LIFECYCLE_TRANSITION'
    error.status = 409
    throw error
  }
  return true
}

function assertIdempotencyKey(value) {
  const key = text(value)
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(key)) {
    const error = new Error('Idempotency key must be 8-128 safe characters.')
    error.code = 'INVALID_IDEMPOTENCY_KEY'
    error.status = 400
    throw error
  }
  return key
}

module.exports = {
  stable,
  sha256,
  normalizeQuestionForGovernance,
  buildCanonicalFingerprint,
  buildQuestionRevisionPayload,
  buildRevisionHash,
  assertLifecycleTransition,
  assertIdempotencyKey,
}

const { pool } = require('../config/database')

function governanceError(status, code, message, extra = {}) {
  const error = new Error(message)
  error.status = status
  error.code = code
  Object.assign(error, extra)
  return error
}

async function withTenantTransaction(schoolId, fn) {
  const tenantId = Number(schoolId)
  if (!Number.isInteger(tenantId) || tenantId <= 0) throw governanceError(400, 'INVALID_SCHOOL_CONTEXT', 'Valid school context is required.')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.rls_enabled','true',true), set_config('app.is_super_admin','false',true), set_config('app.tenant_id',$1,true)", [String(tenantId)])
    const result = await fn(client, tenantId)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function captureQuestionGovernance({ schoolId, userId = null, idempotencyKey, question = {}, sourceQuestionBankId = null, expectedRevision = null }) {
  const key = assertIdempotencyKey(idempotencyKey)
  const fingerprint = buildCanonicalFingerprint(question)
  const revisionPayload = buildQuestionRevisionPayload(question)
  const revisionHash = buildRevisionHash(question)
  const sourceId = text(sourceQuestionBankId || question.id) || null
  const normalizedExpectedRevision = expectedRevision == null ? null : Number(expectedRevision)
  if (normalizedExpectedRevision != null && (!Number.isInteger(normalizedExpectedRevision) || normalizedExpectedRevision < 0)) {
    throw governanceError(400, 'INVALID_EXPECTED_QUESTION_REVISION', 'Expected question revision must be a non-negative integer.')
  }
  const requestHash = sha256({ fingerprint, revisionHash, sourceId, expectedRevision:normalizedExpectedRevision })

  return withTenantTransaction(schoolId, async (client, tenantId) => {
    const previous = await client.query(
      `SELECT request_hash, result_json FROM question_capture_requests WHERE school_id=$1 AND idempotency_key=$2`,
      [tenantId, key]
    )
    if (previous.rowCount) {
      if (previous.rows[0].request_hash !== requestHash) {
        throw governanceError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was already used for different question content.')
      }
      return { ...previous.rows[0].result_json, replayed:true }
    }

    const masterResult = await client.query(
      `SELECT qm.*
         FROM question_masters qm
        WHERE qm.school_id=$1
          AND (
            qm.canonical_fingerprint=$2
            OR ($3::text IS NOT NULL AND (
              qm.source_question_bank_id=$3
              OR EXISTS (
                SELECT 1 FROM question_mappings src
                 WHERE src.school_id=qm.school_id
                   AND src.question_master_id=qm.id
                   AND src.mapping_type='source_question_bank_id'
                   AND src.mapping_key=$3
              )
            ))
          )
        ORDER BY (qm.canonical_fingerprint=$2) DESC, qm.id ASC
        LIMIT 1
        FOR UPDATE`,
      [tenantId, fingerprint, sourceId]
    )

    let master = masterResult.rows[0] || null
    if (normalizedExpectedRevision != null) {
      const currentRevision = Number(master?.current_revision || 0)
      if (currentRevision !== normalizedExpectedRevision) {
        throw governanceError(409, 'QUESTION_REVISION_CONFLICT', 'Question changed since it was loaded. Reload the Question Bank and try again.', {
          expectedRevision: normalizedExpectedRevision,
          currentRevision,
          publicId: master?.public_id || null,
        })
      }
    }
    let created = false
    let duplicate = false
    if (!master) {
      const publicId = `qm_${crypto.randomUUID()}`
      const inserted = await client.query(
        `INSERT INTO question_masters
          (school_id,public_id,canonical_fingerprint,source_question_bank_id,lifecycle_status,current_revision,created_by,updated_by)
         VALUES ($1,$2,$3,$4,'candidate',0,$5,$5)
         RETURNING *`,
        [tenantId, publicId, fingerprint, sourceId, userId]
      )
      master = inserted.rows[0]
      created = true
    } else if (master.canonical_fingerprint === fingerprint) {
      duplicate = !sourceId || master.source_question_bank_id !== sourceId
    } else {
      const collision = await client.query(
        `SELECT public_id FROM question_masters WHERE school_id=$1 AND canonical_fingerprint=$2 AND id<>$3 LIMIT 1`,
        [tenantId, fingerprint, master.id]
      )
      if (collision.rowCount) {
        throw governanceError(409, 'QUESTION_DUPLICATE_MASTER_CONFLICT', 'Edited source now matches another governed question master.', { duplicatePublicId:collision.rows[0].public_id })
      }
      const updated = await client.query(
        `UPDATE question_masters SET canonical_fingerprint=$1,updated_by=$2,updated_at=NOW() WHERE school_id=$3 AND id=$4 RETURNING *`,
        [fingerprint, userId, tenantId, master.id]
      )
      master = updated.rows[0]
    }

    const latestRevision = await client.query(
      `SELECT revision_number,content_hash FROM question_revisions WHERE school_id=$1 AND question_master_id=$2 ORDER BY revision_number DESC LIMIT 1`,
      [tenantId, master.id]
    )
    let revisionCreated = false
    let revisionNumber = latestRevision.rows[0]?.revision_number || 0
    if (!latestRevision.rowCount || latestRevision.rows[0].content_hash !== revisionHash) {
      const historicalRevision = await client.query("SELECT revision_number FROM question_revisions WHERE school_id=$1 AND question_master_id=$2 AND content_hash=$3 LIMIT 1", [tenantId, master.id, revisionHash])
      if (historicalRevision.rowCount) {
        revisionNumber = Number(latestRevision.rows[0]?.revision_number || historicalRevision.rows[0].revision_number)
      } else {
      revisionNumber += 1
      await client.query(
        `INSERT INTO question_revisions
          (school_id,question_master_id,revision_number,content_json,content_hash,revision_reason,created_by)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)`,
        [tenantId, master.id, revisionNumber, JSON.stringify(revisionPayload), revisionHash, revisionNumber===1?'initial_capture':'source_revision', userId]
      )
      await client.query(
        `UPDATE question_masters SET current_revision=$1,updated_by=$2,updated_at=NOW() WHERE school_id=$3 AND id=$4`,
        [revisionNumber, userId, tenantId, master.id]
      )
      revisionCreated = true
      }
    }

    if (sourceId) {
      await client.query(
        `INSERT INTO question_mappings
          (school_id,question_master_id,mapping_type,mapping_key,mapping_status,metadata,created_by)
         VALUES ($1,$2,'source_question_bank_id',$3,'ready',$4::jsonb,$5)
         ON CONFLICT (school_id,question_master_id,mapping_type,mapping_key) DO NOTHING`,
        [tenantId, master.id, sourceId, JSON.stringify({ source:'question_bank' }), userId]
      )
    }

    const result = {
      publicId:master.public_id,
      lifecycleStatus:master.lifecycle_status,
      currentRevision:revisionNumber,
      canonicalFingerprint:fingerprint,
      revisionHash,
      created,
      duplicate,
      revisionCreated,
      replayed:false,
    }
    await client.query(
      `INSERT INTO question_capture_requests
        (school_id,idempotency_key,canonical_fingerprint,question_master_id,request_hash,result_json,created_by)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
      [tenantId, key, fingerprint, master.id, requestHash, JSON.stringify(result), userId]
    )
    return result
  })
}

async function transitionQuestionLifecycle({ schoolId, userId = null, publicId, toStatus }) {
  return withTenantTransaction(schoolId, async (client, tenantId) => {
    const found = await client.query(
      `SELECT id,public_id,lifecycle_status,current_revision,source_question_bank_id,created_by FROM question_masters WHERE school_id=$1 AND public_id=$2 FOR UPDATE`,
      [tenantId, text(publicId)]
    )
    if (!found.rowCount) throw governanceError(404, 'QUESTION_MASTER_NOT_FOUND', 'Governed question was not found.')
    const master = found.rows[0]
    assertLifecycleTransition(master.lifecycle_status, toStatus)
    if (lower(toStatus)==='ready' && Number(master.current_revision||0)<1) {
      throw governanceError(409, 'QUESTION_MASTER_HAS_NO_REVISION', 'A question must have an immutable revision before it can be ready.')
    }
    const nextStatus = lower(toStatus)
    const academicReview = nextStatus==='ready'
      ? await assertIndependentReviewReady(client,{schoolId:tenantId,master,actorId:userId})
      : null
    const updated = await client.query(
      `UPDATE question_masters SET lifecycle_status=$1,updated_by=$2,updated_at=NOW() WHERE school_id=$3 AND id=$4 RETURNING public_id,lifecycle_status,current_revision,updated_at`,
      [nextStatus, userId, tenantId, master.id]
    )
    if (master.source_question_bank_id && (nextStatus === 'ready' || nextStatus === 'retired')) {
      if(nextStatus==='ready' && academicReview?.grade){
        // Publish exactly the already-locked tenant-local legacy row. Preserve
        // all paper content: any source/revision drift is rejected above.
        const patch={
          review_state:'academically_reviewed',
          review_gate_version:'assps-grade910-independent-review-v1',
          reviewed_revision:Number(academicReview.revision.revision_number),
          reviewed_content_hash:String(academicReview.revision.content_hash).trim(),
          academic_reviewer_id:Number(academicReview.review.reviewed_by),
          approved_by:Number(userId),
          source_catalog_id:academicReview.review.metadata.sourceEvidence.sourceRecordId,
          source_pdf_sha256:academicReview.review.metadata.sourceEvidence.sourcePdfSha256,
        }
        const promoted=await client.query(
          `UPDATE question_bank SET is_approved=true,
              metadata=COALESCE(metadata,'{}'::jsonb) || $1::jsonb
             WHERE school_id=$2 AND id=$3 AND is_approved IS NOT TRUE
             RETURNING id`,
          [JSON.stringify(patch),tenantId,master.source_question_bank_id]
        )
        if(promoted.rowCount!==1)
          throw governanceError(409,'ACADEMIC_APPROVAL_CAS_CONFLICT',
            'The exact tenant question could not be atomically approved.')
      } else {
        await client.query(
          `UPDATE question_bank SET is_approved=$1 WHERE school_id=$2 AND id=$3`,
          [nextStatus === 'ready', tenantId, master.source_question_bank_id]
        )
      }
    }
    return updated.rows[0]
  })
}

module.exports.captureQuestionGovernance = captureQuestionGovernance
module.exports.transitionQuestionLifecycle = transitionQuestionLifecycle
module.exports.withTenantTransaction = withTenantTransaction
