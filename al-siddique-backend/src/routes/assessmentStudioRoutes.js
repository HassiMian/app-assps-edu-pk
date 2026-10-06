const crypto = require('crypto')
const express = require('express')
const router = express.Router()

const { pool, query } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId, tenantClause } = require('../middleware/tenant')
const { createPrintJobBinding, printJobTransition } = require('../services/assessmentPrintJobs')

const canAuthorAssessments = requireRoles('super_admin', 'admin', 'school_admin', 'principal', 'teacher')

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  }
  return value
}

function hashDocument(document) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(document)), 'utf8').digest('hex')
}

function safePublicId(value) {
  const id = String(value || '').trim()
  if (!id || id.length > 220 || !/^[A-Za-z0-9._:-]+$/.test(id)) return null
  return id
}

function actorKey(req) {
  return String(req.user?.id || req.user?.email || req.user?.service_identity || 'unknown')
}

function schoolIdForRequest(req, body = {}) {
  const direct = currentSchoolId(req)
  if (direct) return direct
  if (req.user?.role === 'super_admin' || req.user?.role === 'platform_owner') {
    const explicit = Number.parseInt(body.schoolId ?? req.query.school_id ?? req.query.schoolId, 10)
    return Number.isFinite(explicit) && explicit > 0 ? explicit : null
  }
  return null
}

function validatePaperDocument(document) {
  if (!document || typeof document !== 'object') return 'document must be an object'
  if (document.format !== 'assps-canonical-paper') return 'document.format must be assps-canonical-paper'
  if (document.documentModel !== 'PaperDocumentV2') return 'document.documentModel must be PaperDocumentV2'
  if (Number(document.schemaVersion) !== 3) return 'document.schemaVersion must be 3'
  if (document.documentOrigin !== 'USER_AUTHORED') return 'Assessment Studio revision must be USER_AUTHORED'
  if (document.sourceIdentity !== null && document.sourceIdentity !== undefined) return 'USER_AUTHORED document must not carry sourceIdentity'
  if (!Array.isArray(document.sections)) return 'document.sections must be an array'
  return null
}

async function withTenantTransaction(req, schoolId, fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SELECT set_config('app.rls_enabled', 'true', true)`)
    if (req.user?.role === 'super_admin' || req.user?.role === 'platform_owner') {
      await client.query(`SELECT set_config('app.is_super_admin', 'true', true)`)
    } else {
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [String(schoolId)])
      await client.query(`SELECT set_config('app.is_super_admin', 'false', true)`)
    }
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

router.use(protect, canAuthorAssessments)

router.get('/papers', async (req, res) => {
  try {
    const schoolId = schoolIdForRequest(req)
    if (!schoolId) return res.status(400).json({ success:false, message:'School context required.' })
    await tenantClause(req, { table:'assessment_papers' })
    const result = await query(
      `SELECT public_id, title, status, current_revision, created_at, updated_at
         FROM assessment_papers
        WHERE school_id = $1
        ORDER BY updated_at DESC
        LIMIT 100`,
      [schoolId]
    )
    return res.json({ success:true, data:result.rows })
  } catch (error) {
    console.error('Assessment Studio list error:', error.message)
    return res.status(500).json({ success:false, message:'Could not list assessment papers.' })
  }
})

router.get('/papers/:paperId', async (req, res) => {
  try {
    const publicId = safePublicId(req.params.paperId)
    const schoolId = schoolIdForRequest(req)
    if (!publicId) return res.status(400).json({ success:false, message:'Invalid paper id.' })
    if (!schoolId) return res.status(400).json({ success:false, message:'School context required.' })
    await tenantClause(req, { table:'assessment_papers' })
    const result = await query(
      `SELECT p.public_id, p.title, p.status, p.current_revision, p.created_at, p.updated_at,
              r.document_json, r.content_hash, r.created_at AS revision_created_at
         FROM assessment_papers p
         LEFT JOIN assessment_paper_revisions r
           ON r.paper_id = p.id AND r.revision_number = p.current_revision
        WHERE p.school_id = $1 AND p.public_id = $2
        LIMIT 1`,
      [schoolId, publicId]
    )
    if (!result.rowCount) return res.status(404).json({ success:false, message:'Assessment paper not found.' })
    return res.json({ success:true, data:result.rows[0] })
  } catch (error) {
    console.error('Assessment Studio read error:', error.message)
    return res.status(500).json({ success:false, message:'Could not read assessment paper.' })
  }
})

router.post('/papers/:paperId/revisions', async (req, res) => {
  const publicId = safePublicId(req.params.paperId)
  const schoolId = schoolIdForRequest(req, req.body || {})
  const expectedRevision = Number(req.body?.expectedRevision ?? 0)
  const document = req.body?.document
  const title = String(req.body?.title || document?.metadata?.title || '').trim().slice(0, 500)
  const validationError = validatePaperDocument(document)
  if (!publicId) return res.status(400).json({ success:false, message:'Invalid paper id.' })
  if (!schoolId) return res.status(400).json({ success:false, message:'School context required.' })
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return res.status(400).json({ success:false, message:'expectedRevision must be a non-negative integer.' })
  if (validationError) return res.status(400).json({ success:false, message:validationError })

  try {
    const data = await withTenantTransaction(req, schoolId, async client => {
      let paper = (await client.query(
        `SELECT * FROM assessment_papers WHERE school_id = $1 AND public_id = $2 FOR UPDATE`,
        [schoolId, publicId]
      )).rows[0]

      if (!paper) {
        if (expectedRevision !== 0) return { conflict:true, currentRevision:0 }
        paper = (await client.query(
          `INSERT INTO assessment_papers (school_id, public_id, title, status, current_revision, created_by_key, updated_by_key)
           VALUES ($1,$2,$3,'DRAFT',0,$4,$4)
           RETURNING *`,
          [schoolId, publicId, title || null, actorKey(req)]
        )).rows[0]
      }

      if (Number(paper.current_revision) !== expectedRevision) {
        return { conflict:true, currentRevision:Number(paper.current_revision) }
      }

      const nextRevision = expectedRevision + 1
      const contentHash = hashDocument(document)
      await client.query(
        `INSERT INTO assessment_paper_revisions
           (school_id, paper_id, revision_number, document_json, content_hash, created_by_key)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6)`,
        [schoolId, paper.id, nextRevision, JSON.stringify(document), contentHash, actorKey(req)]
      )
      await client.query(
        `UPDATE assessment_papers
            SET title = $3, current_revision = $4, status = 'DRAFT', updated_by_key = $5, updated_at = NOW()
          WHERE school_id = $1 AND id = $2`,
        [schoolId, paper.id, title || paper.title || null, nextRevision, actorKey(req)]
      )
      return { publicId, currentRevision:nextRevision, contentHash, status:'DRAFT' }
    })

    if (data.conflict) {
      return res.status(409).json({ success:false, code:'REVISION_CONFLICT', currentRevision:data.currentRevision, message:'Paper changed elsewhere. Reload or resolve the conflict before overwriting.' })
    }
    return res.status(201).json({ success:true, data })
  } catch (error) {
    console.error('Assessment Studio revision save error:', error.message)
    return res.status(500).json({ success:false, message:'Could not save assessment revision.' })
  }
})

router.post('/papers/:paperId/releases', async (req, res) => {
  const publicId = safePublicId(req.params.paperId)
  const schoolId = schoolIdForRequest(req, req.body || {})
  const expectedRevision = Number(req.body?.expectedRevision)
  const release = req.body?.release || {}
  if (!publicId) return res.status(400).json({ success:false, message:'Invalid paper id.' })
  if (!schoolId) return res.status(400).json({ success:false, message:'School context required.' })
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return res.status(400).json({ success:false, message:'expectedRevision must be an integer >= 1.' })

  try {
    const data = await withTenantTransaction(req, schoolId, async client => {
      const paper = (await client.query(
        `SELECT * FROM assessment_papers WHERE school_id = $1 AND public_id = $2 FOR UPDATE`,
        [schoolId, publicId]
      )).rows[0]
      if (!paper) return { missing:true }
      if (Number(paper.current_revision) !== expectedRevision) {
        return { conflict:true, currentRevision:Number(paper.current_revision) }
      }
      const revision = (await client.query(
        `SELECT document_json, content_hash FROM assessment_paper_revisions
          WHERE school_id = $1 AND paper_id = $2 AND revision_number = $3 LIMIT 1`,
        [schoolId, paper.id, expectedRevision]
      )).rows[0]
      if (!revision) throw new Error('Current paper revision is missing.')

      const serverHash = hashDocument(revision.document_json)
      if (serverHash !== revision.content_hash) throw new Error('Stored revision hash mismatch.')
      if (String(release.contentHash || '') !== serverHash) {
        return { hashMismatch:true, serverHash }
      }
      if (hashDocument(release.snapshot) !== serverHash) {
        return { hashMismatch:true, serverHash }
      }

      const releaseId = safePublicId(release.releaseId) || `release-${publicId}-r${expectedRevision}`
      const rendererVersion = String(release.rendererVersion || 'assessment-studio-v1').slice(0, 120)
      const inserted = (await client.query(
        `INSERT INTO assessment_releases
           (school_id, paper_id, release_id, revision_number, content_hash, renderer_version, snapshot_json, released_by_key, released_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,COALESCE($9::timestamptz,NOW()))
         ON CONFLICT (paper_id, revision_number, content_hash) DO NOTHING
         RETURNING release_id, revision_number, content_hash, renderer_version, released_at`,
        [schoolId, paper.id, releaseId, expectedRevision, serverHash, rendererVersion, JSON.stringify(release.snapshot), actorKey(req), release.releasedAt || null]
      )).rows[0]
      const stored = inserted || (await client.query(
        `SELECT release_id, revision_number, content_hash, renderer_version, released_at
           FROM assessment_releases
          WHERE school_id=$1 AND paper_id=$2 AND revision_number=$3 AND content_hash=$4 LIMIT 1`,
        [schoolId, paper.id, expectedRevision, serverHash]
      )).rows[0]
      await client.query(
        `UPDATE assessment_papers SET status='FINALIZED', updated_by_key=$3, updated_at=NOW()
          WHERE school_id=$1 AND id=$2`,
        [schoolId, paper.id, actorKey(req)]
      )
      return stored
    })

    if (data.missing) return res.status(404).json({ success:false, message:'Assessment paper not found.' })
    if (data.conflict) return res.status(409).json({ success:false, code:'REVISION_CONFLICT', currentRevision:data.currentRevision, message:'Paper changed before finalization.' })
    if (data.hashMismatch) return res.status(409).json({ success:false, code:'RELEASE_HASH_MISMATCH', serverHash:data.serverHash, message:'Release snapshot does not match the current server revision.' })
    return res.status(201).json({ success:true, data })
  } catch (error) {
    console.error('Assessment Studio release error:', error.message)
    return res.status(500).json({ success:false, message:'Could not finalize assessment release.' })
  }
})

router.post('/papers/:paperId/print-jobs', async (req, res) => {
  try {
    const publicId = safePublicId(req.params.paperId)
    const schoolId = schoolIdForRequest(req, req.body || {})
    if (!publicId) return res.status(400).json({ success:false, message:'Invalid paper id.' })
    if (!schoolId) return res.status(400).json({ success:false, message:'School context required.' })
    const body = req.body || {}
    const printJobId = safePublicId(body.printJobId) || `print-${crypto.randomUUID()}`
    const reprintMode = String(body.reprintMode || 'NEW_JOB').toUpperCase()
    const parentPrintJobId = safePublicId(body.parentPrintJobId)

    const data = await withTenantTransaction(req, schoolId, async client => {
      const paper = (await client.query(
        `SELECT id FROM assessment_papers WHERE school_id=$1 AND public_id=$2 LIMIT 1`,
        [schoolId, publicId]
      )).rows[0]
      if (!paper) return { missingPaper:true }

      if (reprintMode === 'REPRINT_ORIGINAL') {
        if (!parentPrintJobId) return { invalid:'parentPrintJobId is required for REPRINT_ORIGINAL.' }
        const parent = (await client.query(
          `SELECT j.* FROM assessment_print_jobs j
             JOIN assessment_releases ar ON ar.school_id=j.school_id AND ar.release_id=j.release_id
            WHERE j.school_id=$1 AND j.print_job_id=$2 AND ar.paper_id=$3 LIMIT 1`,
          [schoolId, parentPrintJobId, paper.id]
        )).rows[0]
        if (!parent) return { missingParent:true }
        const inserted = (await client.query(
          `INSERT INTO assessment_print_jobs
            (school_id,print_job_id,release_id,roster_snapshot_id,binding_snapshot_json,render_settings_json,copy_count,personalized,duplex,student_boundary_policy,reprint_mode,parent_print_job_id,status,attempt_count,created_by_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'REPRINT_ORIGINAL',$11,'CREATED',0,$12)
           RETURNING print_job_id,release_id,roster_snapshot_id,copy_count,personalized,duplex,student_boundary_policy,reprint_mode,parent_print_job_id,status,attempt_count,created_at`,
          [schoolId, printJobId, parent.release_id, parent.roster_snapshot_id, JSON.stringify(parent.binding_snapshot_json), JSON.stringify(parent.render_settings_json), parent.copy_count, parent.personalized, parent.duplex, parent.student_boundary_policy, parentPrintJobId, actorKey(req)]
        )).rows[0]
        return { printJob:inserted }
      }

      let binding
      try {
        binding = createPrintJobBinding({
          releaseId:body.releaseId,
          roster:body.roster,
          teacherBinding:body.teacherBinding,
          renderSettings:body.renderSettings,
          personalized:Boolean(body.personalized),
          reprintMode,
          parentPrintJobId,
        })
      } catch (error) {
        return { invalid:error.message }
      }
      if (binding.reprintMode === 'NEW_JOB' && binding.parentPrintJobId) return { invalid:'NEW_JOB cannot reference a parent print job.' }
      if (binding.reprintMode === 'UPDATED_JOB' && !binding.parentPrintJobId) return { invalid:'UPDATED_JOB requires parentPrintJobId.' }
      if (binding.parentPrintJobId) {
        const parent = (await client.query(`SELECT 1 FROM assessment_print_jobs WHERE school_id=$1 AND print_job_id=$2 LIMIT 1`, [schoolId,binding.parentPrintJobId])).rows[0]
        if (!parent) return { missingParent:true }
      }
      const release = (await client.query(
        `SELECT ar.release_id FROM assessment_releases ar
           WHERE ar.school_id=$1 AND ar.paper_id=$2 AND ar.release_id=$3 LIMIT 1`,
        [schoolId,paper.id,binding.releaseId]
      )).rows[0]
      if (!release) return { missingRelease:true }

      let rosterSnapshotId = null
      if (binding.personalized) {
        rosterSnapshotId = `roster-${printJobId}`
        await client.query(
          `INSERT INTO assessment_roster_snapshots
            (school_id,snapshot_id,context_json,students_json,student_count,roster_hash,created_by_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [schoolId,rosterSnapshotId,JSON.stringify(binding.rosterSnapshot.context),JSON.stringify(binding.rosterSnapshot.students),binding.rosterSnapshot.studentCount,binding.rosterSnapshot.rosterHash,actorKey(req)]
        )
      }
      const inserted = (await client.query(
        `INSERT INTO assessment_print_jobs
          (school_id,print_job_id,release_id,roster_snapshot_id,binding_snapshot_json,render_settings_json,copy_count,personalized,duplex,student_boundary_policy,reprint_mode,parent_print_job_id,status,attempt_count,created_by_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'CREATED',0,$13)
         RETURNING print_job_id,release_id,roster_snapshot_id,copy_count,personalized,duplex,student_boundary_policy,reprint_mode,parent_print_job_id,status,attempt_count,created_at`,
        [schoolId,printJobId,binding.releaseId,rosterSnapshotId,JSON.stringify(binding.bindingSnapshot),JSON.stringify(binding.renderSettings),binding.copyCount,binding.personalized,binding.duplex,binding.studentBoundaryPolicy,binding.reprintMode,binding.parentPrintJobId,actorKey(req)]
      )).rows[0]
      return { printJob:inserted, rosterHash:binding.rosterSnapshot?.rosterHash || null, bindingHash:binding.bindingHash }
    })

    if (data.missingPaper) return res.status(404).json({ success:false, message:'Paper not found.' })
    if (data.missingRelease) return res.status(404).json({ success:false, message:'Assessment release not found for this paper.' })
    if (data.missingParent) return res.status(404).json({ success:false, message:'Parent print job not found.' })
    if (data.invalid) return res.status(400).json({ success:false, message:data.invalid })
    return res.status(201).json({ success:true, data })
  } catch (error) {
    if (error?.code === '23505') return res.status(409).json({ success:false, message:'Print job id already exists.' })
    console.error('Assessment Studio print job create error:', error.message)
    return res.status(500).json({ success:false, message:'Could not create print job.' })
  }
})

router.get('/print-jobs/:printJobId', async (req, res) => {
  try {
    const printJobId = safePublicId(req.params.printJobId)
    const schoolId = schoolIdForRequest(req)
    if (!printJobId) return res.status(400).json({ success:false, message:'Invalid print job id.' })
    if (!schoolId) return res.status(400).json({ success:false, message:'School context required.' })
    await tenantClause(req, { table:'assessment_print_jobs' })
    const result = await query(
      `SELECT j.print_job_id,j.release_id,j.copy_count,j.personalized,j.duplex,j.student_boundary_policy,j.reprint_mode,j.parent_print_job_id,j.status,j.attempt_count,j.last_error,j.created_at,j.updated_at,
              r.snapshot_id AS roster_snapshot_id,r.student_count,r.roster_hash,r.context_json AS roster_context
         FROM assessment_print_jobs j
         LEFT JOIN assessment_roster_snapshots r ON r.school_id=j.school_id AND r.snapshot_id=j.roster_snapshot_id
        WHERE j.school_id=$1 AND j.print_job_id=$2 LIMIT 1`,
      [schoolId,printJobId]
    )
    if (!result.rowCount) return res.status(404).json({ success:false, message:'Print job not found.' })
    return res.json({ success:true, data:result.rows[0] })
  } catch (error) {
    console.error('Assessment Studio print job read error:', error.message)
    return res.status(500).json({ success:false, message:'Could not read print job.' })
  }
})

router.patch('/print-jobs/:printJobId/status', async (req, res) => {
  try {
    const printJobId = safePublicId(req.params.printJobId)
    const schoolId = schoolIdForRequest(req, req.body || {})
    if (!printJobId) return res.status(400).json({ success:false, message:'Invalid print job id.' })
    if (!schoolId) return res.status(400).json({ success:false, message:'School context required.' })
    const target = String(req.body?.status || '').toUpperCase()
    const data = await withTenantTransaction(req, schoolId, async client => {
      const current = (await client.query(`SELECT status,attempt_count FROM assessment_print_jobs WHERE school_id=$1 AND print_job_id=$2 FOR UPDATE`,[schoolId,printJobId])).rows[0]
      if (!current) return { missing:true }
      let transition
      try { transition = printJobTransition(current.status,target,current.attempt_count) }
      catch (error) { return { invalid:error.message, currentStatus:current.status } }
      const lastError = target === 'FAILED' ? String(req.body?.lastError || '').slice(0,1000) || null : null
      const updated = (await client.query(
        `UPDATE assessment_print_jobs SET status=$3,attempt_count=$4,last_error=$5 WHERE school_id=$1 AND print_job_id=$2
         RETURNING print_job_id,status,attempt_count,last_error,updated_at`,
        [schoolId,printJobId,transition.status,transition.attemptCount,lastError]
      )).rows[0]
      return { printJob:updated }
    })
    if (data.missing) return res.status(404).json({ success:false, message:'Print job not found.' })
    if (data.invalid) return res.status(409).json({ success:false, code:'INVALID_PRINT_JOB_TRANSITION', message:data.invalid, currentStatus:data.currentStatus })
    return res.json({ success:true, data:data.printJob })
  } catch (error) {
    console.error('Assessment Studio print job status error:', error.message)
    return res.status(500).json({ success:false, message:'Could not update print job status.' })
  }
})

router.get('/papers/:paperId/releases/latest', async (req, res) => {
  try {
    const publicId = safePublicId(req.params.paperId)
    const schoolId = schoolIdForRequest(req)
    if (!publicId) return res.status(400).json({ success:false, message:'Invalid paper id.' })
    if (!schoolId) return res.status(400).json({ success:false, message:'School context required.' })
    await tenantClause(req, { table:'assessment_releases' })
    const result = await query(
      `SELECT ar.release_id, ar.revision_number, ar.content_hash, ar.renderer_version, ar.snapshot_json, ar.released_at
         FROM assessment_releases ar
         JOIN assessment_papers p ON p.id = ar.paper_id AND p.school_id = ar.school_id
        WHERE ar.school_id = $1 AND p.public_id = $2
        ORDER BY ar.released_at DESC
        LIMIT 1`,
      [schoolId, publicId]
    )
    if (!result.rowCount) return res.status(404).json({ success:false, message:'No release found.' })
    return res.json({ success:true, data:result.rows[0] })
  } catch (error) {
    console.error('Assessment Studio release read error:', error.message)
    return res.status(500).json({ success:false, message:'Could not read assessment release.' })
  }
})

module.exports = router
