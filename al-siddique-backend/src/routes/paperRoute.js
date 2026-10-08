const express = require('express')
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const multer = require('multer')
const router = express.Router()

const { protect, requireRoles, requireFeature: maybeRequireFeature } = require('../middleware/auth')
const { pool } = require('../config/database')
const { currentSchoolId, tenantClause } = require('../middleware/tenant')
const { teacherCanAccessClass, ensureTeacherAssignmentSchema } = require('../services/teacherAssignmentService')
const {
  getAiEnvConfig,
  publicMessageFor,
  GeminiError,
} = require('../services/ai/geminiClient')
const {
  processHandwrittenJob,
  processPdfImportJob,
  processTextImportJob,
  generatePaperWithAi,
  testGeminiConnection,
} = require('../services/ai/paperAiPipeline')
const {
  registerHandlers,
  createJob,
  updateJob,
  queueJob,
  getJob,
  listJobs,
  listQueueEvents,
  cancelJob,
  retryJob,
  deleteJob,
  deleteTerminalJobs,
  deleteQueueEvents,
  pauseQueue,
  resumeQueue,
  isQueuePaused,
  serializeJob,
  cleanupJobFiles,
  hydrateJobsFromDb,
  getQueueStats,
} = require('../services/ai/paperAiQueue')

const canUsePaperAi = (req, res, next) => {
  const roleCheck = requireRoles('super_admin', 'admin', 'principal', 'teacher', 'accountant')
  roleCheck(req, res, (err) => {
    if (err) return next(err)
    if (typeof maybeRequireFeature === 'function') {
      return maybeRequireFeature('paper_generator')(req, res, next)
    }
    return next()
  })
}


async function applyPaperVaultRuntimeContext(client, schoolId) {
  const tenantId = Number(schoolId)
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    const err = new Error('School context is required.')
    err.code = 'SCHOOL_CONTEXT_REQUIRED'
    err.status = 403
    throw err
  }
  await client.query('SET LOCAL ROLE apex_paper_runtime')
  await client.query(
    "SELECT set_config('app.rls_enabled','true',true), set_config('app.is_super_admin','false',true), set_config('app.tenant_id',$1,true)",
    [String(tenantId)]
  )
}

async function withPaperVaultRuntime(schoolId, work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await applyPaperVaultRuntimeContext(client, schoolId)
    const value = await work(client)
    await client.query('COMMIT')
    return value
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

async function ensurePaperVaultSchema() {
  const result = await pool.query(`
    SELECT
      to_regclass('public.paper_vault') AS table_name,
      (
        SELECT COUNT(*)::int
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'paper_vault'
          AND column_name IN (
            'school_id','owner_user_id','name','class_name','section','subject_name',
            'status','revision','payload','created_at','updated_at','deleted_at'
          )
      ) AS required_columns
  `)
  const row = result.rows?.[0] || {}
  if (!row.table_name || Number(row.required_columns || 0) < 12) {
    const err = new Error('Paper Vault schema is not initialized. Apply migration 020_paper_vault_schema before serving vault workflows.')
    err.code = 'PAPER_VAULT_SCHEMA_NOT_READY'
    err.status = 503
    throw err
  }
  return true
}

const PAPER_ADMIN_ROLES = new Set(['super_admin', 'admin', 'principal'])
function isPaperAdmin(req) {
  return PAPER_ADMIN_ROLES.has(String(req.user?.role || '').toLowerCase())
}
function cleanPaperText(value, limit) {
  const text = String(value || '').trim()
  return text ? text.slice(0, limit) : null
}
function paperConfig(payload = {}) {
  const cfg = payload?.config || payload?.metadata || {}
  return {
    name: cleanPaperText(payload?.name || cfg?.name || cfg?.title || 'Untitled Paper', 220) || 'Untitled Paper',
    className: cleanPaperText(cfg?.className || cfg?.classLevel || cfg?.class || '', 120),
    section: cleanPaperText(cfg?.section || '', 60),
    subjectName: cleanPaperText(cfg?.subjectName || cfg?.subject || '', 160),
  }
}
function serializeVaultPaper(row) {
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  return {
    ...payload,
    id: String(row.id),
    name: row.name,
    ownerUserId: String(row.owner_user_id),
    className: row.class_name,
    subjectName: row.subject_name,
    status: row.status,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    serverSynced: true,
  }
}
async function enforceTeacherPaperScope(req, payload) {
  if (String(req.user?.role || '').toLowerCase() !== 'teacher') return
  const schoolId = currentSchoolId(req)
  const cfg = paperConfig(payload)
  if (!cfg.className) {
    const err = new Error('Select an assigned class before saving this paper.')
    err.status = 400
    throw err
  }
  await ensureTeacherAssignmentSchema()
  const allowed = await teacherCanAccessClass({
    schoolId,
    teacherUserId: req.user?.id,
    className: cfg.className,
    section: cfg.section,
    subject: cfg.subjectName,
  })
  if (!allowed) {
    const err = new Error('Teachers can save papers only for their assigned class and subject.')
    err.status = 403
    throw err
  }
}

const UPLOAD_ROOT = path.join(os.tmpdir(), 'al-siddique-paper-uploads')
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}_${crypto.randomUUID()}_${safe}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024,
    files: 60,
  },
  fileFilter: (req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase()
    const name = String(file.originalname || '').toLowerCase()
    const isPdf = mime === 'application/pdf' || name.endsWith('.pdf')
    const isImage = mime.startsWith('image/')
    if (isPdf || isImage) return cb(null, true)
    return cb(new Error('Only PDF and image files are allowed.'))
  },
})

function maybeUpload(req, res, next) {
  if (req.is('multipart/form-data')) return upload.any()(req, res, next)
  return next()
}

function cleanupUploadedFiles(files = []) {
  return Promise.all(files.map(async file => {
    if (file?.path) {
      try {
        await fs.promises.unlink(file.path)
      } catch {}
    }
  }))
}

function jobSchoolId(job) {
  return Number(job?.meta?.school_id || job?.payload?.school_id || job?.payload?.config?.school_id || 0) || null
}

function canAccessJob(req, job) {
  if (!job) return false
  if (req.user?.role === 'super_admin') return true
  const schoolId = currentSchoolId(req)
  const ownerSchoolId = jobSchoolId(job)
  return Boolean(schoolId && ownerSchoolId && Number(schoolId) === Number(ownerSchoolId))
}

function scopedJobs(req) {
  return listJobs().filter(job => canAccessJob(req, job))
}

function scopedQueueStats(req) {
  const jobs = scopedJobs(req)
  const statuses = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1
    return acc
  }, {})
  return {
    total: jobs.length,
    queued: statuses.queued || 0,
    running: statuses.running || 0,
    completed: statuses.completed || 0,
    failed: statuses.failed || 0,
    cancelled: statuses.cancelled || 0,
    retrying: statuses.retrying || 0,
    statuses,
    paused: isQueuePaused(),
  }
}

function requireQueueAdmin(req, res) {
  const allowed = ['super_admin', 'admin', 'principal']
  if (allowed.includes(req.user?.role)) return true
  res.status(403).json({ success: false, message: 'Queue administration is limited to admins and principals.' })
  return false
}

async function moveFilesIntoJobDir(job, files, prefix = 'file') {
  const destPaths = []
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i]
    if (!file?.path) continue
    const ext = path.extname(file.originalname || file.path) || path.extname(file.path) || ''
    const safeName = `${prefix}-${String(i + 1).padStart(2, '0')}${ext}`
    const dest = path.join(job.jobDir, safeName)
    await fs.promises.copyFile(file.path, dest)
    await fs.promises.unlink(file.path).catch(() => {})
    destPaths.push(dest)
  }
  return destPaths
}

registerHandlers({
  handwritten_scan: processHandwrittenJob,
  pdf_import: processPdfImportJob,
  text_import: processTextImportJob,
})
void hydrateJobsFromDb().catch((err) => {
  console.warn('AI jobs hydrate skipped:', err.message)
})


// Canonical server-authoritative Paper Vault.
// Teachers see/edit only their own papers; admins/principals can inspect the school library.
router.get('/vault', protect, requireRoles('super_admin', 'admin', 'principal', 'teacher'), async (req, res) => {
  try {
    await ensurePaperVaultSchema()
    const schoolId = currentSchoolId(req)
    if (!schoolId) {
      return res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'School context is required.' })
    }
    const params = [schoolId]
    let ownerClause = ''
    if (!isPaperAdmin(req)) {
      params.push(req.user?.id)
      ownerClause = ` AND owner_user_id=$${params.length}`
    }
    const result = await withPaperVaultRuntime(schoolId, client => client.query(
      `SELECT id, school_id, owner_user_id, name, class_name, section, subject_name, status, revision,
              payload, created_at, updated_at
       FROM paper_vault
       WHERE school_id=$1 AND deleted_at IS NULL${ownerClause}
       ORDER BY updated_at DESC
       LIMIT 200`, params))
    return res.json({
      success: true,
      scope: isPaperAdmin(req) ? 'school' : 'mine',
      papers: result.rows.map(serializeVaultPaper),
    })
  } catch (err) {
    const status = Number(err.status) || 500
    if (status >= 500) console.error('Paper vault list error:', err.message)
    return res.status(status).json({ success: false, code: err.code || undefined, message: 'Saved papers could not be loaded.' })
  }
})

router.post('/vault', protect, requireRoles('super_admin', 'admin', 'principal', 'teacher'), async (req, res) => {
  try {
    await ensurePaperVaultSchema()
    const schoolId = currentSchoolId(req)
    if (!schoolId) return res.status(403).json({ success: false, message: 'School context is required.' })
    const payload = req.body?.paper
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ success: false, message: 'A structured paper document is required.' })
    }
    await enforceTeacherPaperScope(req, payload)
    const cfg = paperConfig(payload)
    const result = await withPaperVaultRuntime(schoolId, client => client.query(
      `INSERT INTO paper_vault
       (school_id, owner_user_id, name, class_name, section, subject_name, status, payload)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',$7)
       RETURNING id, school_id, owner_user_id, name, class_name, section, subject_name, status, revision,
                 payload, created_at, updated_at`,
      [schoolId, req.user?.id, cfg.name, cfg.className, cfg.section, cfg.subjectName, JSON.stringify(payload)]))
    return res.status(201).json({ success: true, paper: serializeVaultPaper(result.rows[0]) })
  } catch (err) {
    const status = Number(err.status) || 500
    if (status >= 500) console.error('Paper vault save error:', err.message)
    return res.status(status).json({ success: false, message: status >= 500 ? 'Paper could not be saved.' : err.message })
  }
})

router.patch('/vault/:id', protect, requireRoles('super_admin', 'admin', 'principal', 'teacher'), async (req, res) => {
  const client = await pool.connect()
  try {
    await ensurePaperVaultSchema()
    const schoolId = currentSchoolId(req)
    if (!schoolId) return res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'School context is required.' })
    const id = String(req.params.id || '').trim()
    if (!/^\d+$/.test(id)) return res.status(400).json({ success: false, message: 'Invalid paper id.' })
    await client.query('BEGIN')
    await applyPaperVaultRuntimeContext(client, schoolId)
    const params = [id, schoolId]
    let ownerClause = ''
    if (!isPaperAdmin(req)) {
      params.push(req.user?.id)
      ownerClause = ` AND owner_user_id=$${params.length}`
    }
    const existing = await client.query(
      `SELECT * FROM paper_vault WHERE id=$1 AND school_id=$2 AND deleted_at IS NULL${ownerClause} FOR UPDATE`, params)
    if (!existing.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Paper not found in your accessible library.' })
    }
    const row = existing.rows[0]
    if (req.body?.expectedRevision === undefined || !Number.isInteger(Number(req.body.expectedRevision))) {
      await client.query('ROLLBACK')
      return res.status(428).json({ success: false, code: 'EXPECTED_REVISION_REQUIRED', message: 'expectedRevision is required for legacy Paper Vault mutations.', revision: row.revision })
    }
    if (Number(req.body.expectedRevision) !== Number(row.revision)) {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, code: 'REVISION_CONFLICT', message: 'This paper changed in another session. Reload before saving again.', revision: row.revision })
    }
    const nextPayload = req.body?.paper && typeof req.body.paper === 'object' && !Array.isArray(req.body.paper)
      ? req.body.paper : row.payload
    await enforceTeacherPaperScope(req, nextPayload)
    const cfg = paperConfig(nextPayload)
    const nextName = cleanPaperText(req.body?.name, 220) || cfg.name || row.name
    const nextStatus = isPaperAdmin(req) && ['draft','review','approved','archived'].includes(String(req.body?.status || ''))
      ? String(req.body.status) : row.status
    const updated = await client.query(
      `UPDATE paper_vault
       SET name=$1, class_name=$2, section=$3, subject_name=$4, status=$5,
           payload=$6, revision=revision+1, updated_at=NOW()
       WHERE id=$7
       RETURNING id, school_id, owner_user_id, name, class_name, section, subject_name, status, revision,
                 payload, created_at, updated_at`,
      [nextName, cfg.className, cfg.section, cfg.subjectName, nextStatus, JSON.stringify(nextPayload), id])
    await client.query('COMMIT')
    return res.json({ success: true, paper: serializeVaultPaper(updated.rows[0]) })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    const status = Number(err.status) || 500
    if (status >= 500) console.error('Paper vault update error:', err.message)
    return res.status(status).json({ success: false, message: status >= 500 ? 'Paper could not be updated.' : err.message })
  } finally { client.release() }
})

router.delete('/vault/:id', protect, requireRoles('super_admin', 'admin', 'principal', 'teacher'), async (req, res) => {
  const client = await pool.connect()
  try {
    await ensurePaperVaultSchema()
    const schoolId = currentSchoolId(req)
    if (!schoolId) return res.status(403).json({ success: false, code: 'SCHOOL_CONTEXT_REQUIRED', message: 'School context is required.' })
    const id = String(req.params.id || '').trim()
    if (!/^\d+$/.test(id)) return res.status(400).json({ success: false, message: 'Invalid paper id.' })
    await client.query('BEGIN')
    await applyPaperVaultRuntimeContext(client, schoolId)
    const params = [id, schoolId]
    let ownerClause = ''
    if (!isPaperAdmin(req)) {
      params.push(req.user?.id)
      ownerClause = ` AND owner_user_id=$${params.length}`
    }
    const existing = await client.query(
      `SELECT id, revision FROM paper_vault WHERE id=$1 AND school_id=$2 AND deleted_at IS NULL${ownerClause} FOR UPDATE`, params)
    if (!existing.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Paper not found in your accessible library.' })
    }
    const row = existing.rows[0]
    if (req.body?.expectedRevision === undefined || !Number.isInteger(Number(req.body.expectedRevision))) {
      await client.query('ROLLBACK')
      return res.status(428).json({ success: false, code: 'EXPECTED_REVISION_REQUIRED', message: 'expectedRevision is required for legacy Paper Vault mutations.', revision: row.revision })
    }
    if (Number(req.body.expectedRevision) !== Number(row.revision)) {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, code: 'REVISION_CONFLICT', message: 'This paper changed in another session. Reload before deleting.', revision: row.revision })
    }
    const result = await client.query(
      `UPDATE paper_vault SET deleted_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND school_id=$2 AND deleted_at IS NULL${ownerClause}
       RETURNING id`, params)
    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Paper not found in your accessible library.' })
    }
    await client.query('COMMIT')
    return res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    const status = Number(err.status) || 500
    if (status >= 500) console.error('Paper vault delete error:', err.message)
    return res.status(status).json({ success: false, code: err.code || undefined, message: 'Paper could not be deleted.' })
  } finally {
    client.release()
  }
})


router.get('/ai/config', protect, canUsePaperAi, async (req, res) => {
  const ai = getAiEnvConfig()
  res.json({
    success: true,
    configured: Boolean(ai.apiKey),
    status: ai.apiKey ? 'ready' : 'unconfigured',
    models: {
      primary: ai.primaryModel,
      fallback: ai.fallbackModel,
      vision: ai.visionModel,
      text: ai.textModel,
    },
    queue: scopedQueueStats(req),
  })
})

router.post('/ai/test-key', protect, canUsePaperAi, async (req, res) => {
  try {
    const result = await testGeminiConnection({
      preferredModel: req.body?.preferredModel,
    })
    res.json({
      success: true,
      message: result.message,
      model: result.model,
    })
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      message: publicMessageFor(err),
      code: err.code || 'AI_TEST_FAILED',
    })
  }
})

router.post('/test-key', protect, canUsePaperAi, async (req, res) => {
  try {
    const result = await testGeminiConnection({
      preferredModel: req.body?.preferredModel,
    })
    res.json({
      success: true,
      message: result.message,
      model: result.model,
    })
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      message: publicMessageFor(err),
      code: err.code || 'AI_TEST_FAILED',
    })
  }
})

router.post('/generate', protect, canUsePaperAi, async (req, res) => {
  try {
    const {
      class: cls,
      subject,
      chapters = [],
      count = 10,
      language = 'english',
      questionType = 'paper',
      preferredModel,
    } = req.body || {}
    const counts = typeof count === 'object' && count !== null ? count : {
      mcq: Number(req.body?.mcqCount || 10),
      short: Number(req.body?.shortCount || 5),
      long: Number(req.body?.longCount || 2),
    }
    const result = await generatePaperWithAi({
      classLevel: cls,
      subject,
      chapters,
      counts,
      medium: language,
      preferredModel,
      questionType,
    })
    res.json({
      success: true,
      model: result.model,
      mcq: result.mcq,
      short: result.short,
      long: result.long,
    })
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      message: publicMessageFor(err),
      code: err.code || 'AI_GENERATION_FAILED',
    })
  }
})

router.post('/notify-admin', protect, requireRoles('teacher', 'admin', 'principal'), async (req, res) => {
  try {
    const { classLevel, subjectName } = req.body || {}
    if (!classLevel || !subjectName) {
      return res.status(400).json({ success: false, message: 'classLevel and subjectName are required' })
    }

    const schoolId = currentSchoolId(req)
    
    // Normalize class name like in studentRoutes
    const rawClass = String(classLevel).trim()
    const CLASS_ALIASES = {
      starter: 'Starter', mover: 'Mover', flyer: 'Flyer',
      one: 'One', two: 'Two', three: 'Three', four: 'Four',
      five: 'Five', six: 'Six', seven: 'Seven', eight: 'Eight',
      'pre nine': 'Pre Nine', 'hifaz class': 'Hifaz Class',
    }
    const key = rawClass.toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
    const normalizedClass = CLASS_ALIASES[key] || rawClass

    // Count students
    let sql = 'SELECT COUNT(*) as count FROM students WHERE is_active = true AND class = $1'
    const params = [normalizedClass]
    const tenant = await tenantClause(req, { table: 'students', paramIndex: 2 })
    sql += tenant.clause
    params.push(...tenant.params)

    const result = await pool.query(sql, params)
    const count = parseInt(result.rows[0].count, 10) || 0

    const message = `Paper for ${subjectName} (${classLevel}) is saved. Number of students is ${count}, so ${count} prints are needed.`

    // Insert into notification_log
    // Ensure table structure exists implicitly or assume it does
    await pool.query(`
      INSERT INTO notification_log (school_id, recipient_role, title, message, type, sent_at)
      VALUES ($1, 'admin', 'Paper Saved by Teacher', $2, 'info', NOW())
    `, [schoolId, message])

    res.json({ success: true, message: 'Notification sent to admin' })
  } catch (err) {
    console.error('Notify admin error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to notify admin' })
  }
})

router.post('/extract-questions', protect, canUsePaperAi, maybeUpload, async (req, res) => {
  let job = null
  try {
    const files = (req.files || []).filter(f => f && f.path)
    const body = req.body || {}
    const subject = body.subject || ''
    const classLevel = body.classLevel || body.class || ''
    const medium = body.medium || 'english'
    const preferredModel = body.preferredModel || body.model || undefined
    const chapterNumber = body.chapterNumber || ''
    const chapterName = body.chapterName || ''
    const chapterHint = chapterName.trim() ? (chapterNumber.trim() ? `Chapter ${chapterNumber.trim()}: ${chapterName.trim()}` : chapterName.trim()) : (chapterNumber.trim() ? `Chapter ${chapterNumber.trim()}` : '')

    if (files.length > 0) {
      const pdfFile = files.find(f => String(f.mimetype || '').includes('pdf') || /\.pdf$/i.test(f.originalname || ''))
      const imageFiles = files.filter(f => !pdfFile || f.path !== pdfFile.path)

      if (pdfFile) {
        const schoolId = currentSchoolId(req)
        job = createJob('pdf_import', {
          config: { subject, classLevel, medium, chapterNumber, chapterName, chapterHint },
          preferredModel,
          keepFiles: false,
          school_id: schoolId,
        }, { fileName: pdfFile.originalname, fileSize: pdfFile.size, autoStart: false, createdBy: req.user?.id, school_id: schoolId })
        const [movedPdf] = await moveFilesIntoJobDir(job, [pdfFile], 'pdf')
        job.payload.filePath = movedPdf
        await cleanupUploadedFiles(imageFiles)
        updateJob(job.id, { payload: job.payload })
        queueJob(job.id)
        return res.status(202).json({
          success: true,
          queued: true,
          jobId: job.id,
          status: job.status,
          message: 'PDF import queued. Poll the job status for progress.',
        })
      }

      const combinedImages = files.filter(f => /image\//i.test(f.mimetype || ''))
      if (!combinedImages.length) {
        await cleanupUploadedFiles(files)
        return res.status(400).json({ success: false, message: 'Upload a PDF or image file.' })
      }

      const schoolId = currentSchoolId(req)
      job = createJob('handwritten_scan', {
        config: { classLevel, subject, language: medium, chapterNumber, chapterName, chapterHint },
        preferredModel,
        keepFiles: false,
        files: [],
        school_id: schoolId,
      }, { fileName: combinedImages[0]?.originalname || 'handwritten-images', autoStart: false, createdBy: req.user?.id, school_id: schoolId })

      job.payload.files = await moveFilesIntoJobDir(job, combinedImages, 'page')
      updateJob(job.id, { payload: job.payload })
      queueJob(job.id)
      return res.status(202).json({
        success: true,
        queued: true,
        jobId: job.id,
        status: job.status,
        message: 'Handwritten scan queued. Poll the job status for progress.',
      })
    }

    if (body.text && String(body.text).trim()) {
      const text = String(body.text).trim()
      const inline = text.length < 4000
      if (inline) {
        const schoolId = currentSchoolId(req)
        const job = createJob('text_import', {
          text,
          config: { subject, classLevel, medium, chapterNumber, chapterName, chapterHint },
          preferredModel,
          keepFiles: true,
          school_id: schoolId,
        }, { source: 'pasted-text', createdBy: req.user?.id, school_id: schoolId })
        return res.status(202).json({
          success: true,
          queued: true,
          jobId: job.id,
          status: job.status,
          message: 'Text import queued.',
        })
      }

      const schoolId = currentSchoolId(req)
      const job = createJob('text_import', {
        text,
        config: { subject, classLevel, medium, chapterNumber, chapterName, chapterHint },
        preferredModel,
        keepFiles: true,
        school_id: schoolId,
      }, { source: 'pasted-text', createdBy: req.user?.id, school_id: schoolId })
      return res.status(202).json({
        success: true,
        queued: true,
        jobId: job.id,
        status: job.status,
        message: 'Text import queued.',
      })
    }

    return res.status(400).json({ success: false, message: 'Upload a PDF, image, or paste text.' })
  } catch (err) {
    await cleanupUploadedFiles((req.files || []).filter(f => f && f.path))
    if (job) await cleanupJobFiles(job)
    res.status(err.status || 500).json({
      success: false,
      message: publicMessageFor(err),
      code: err.code || 'AI_IMPORT_FAILED',
    })
  }
})

router.post('/scan-handwritten', protect, canUsePaperAi, maybeUpload, async (req, res) => {
  let job = null
  try {
    const files = (req.files || []).filter(f => f && f.path)
    if (!files.length) {
      return res.status(400).json({ success: false, message: 'Please upload one or more image pages.' })
    }

    const body = req.body || {}
    const schoolId = currentSchoolId(req)
    const chapterNumber = body.chapterNumber || ''
    const chapterName = body.chapterName || ''
    const chapterHint = chapterName.trim() ? (chapterNumber.trim() ? `Chapter ${chapterNumber.trim()}: ${chapterName.trim()}` : chapterName.trim()) : (chapterNumber.trim() ? `Chapter ${chapterNumber.trim()}` : '')

    job = createJob('handwritten_scan', {
      config: {
        classLevel: body.classLevel || body.class || '',
        subject: body.subject || '',
        examType: body.examType || '',
        language: body.language || 'mixed',
        paperTitle: body.paperTitle || '',
        chapterNumber,
        chapterName,
        chapterHint,
      },
      preferredModel: body.preferredModel || body.model || undefined,
      keepFiles: false,
      school_id: schoolId,
    }, { fileCount: files.length, source: 'handwritten-scan', autoStart: false, createdBy: req.user?.id, school_id: schoolId })
    job.payload.files = await moveFilesIntoJobDir(job, files, 'page')
    updateJob(job.id, { payload: job.payload })
    queueJob(job.id)

    res.status(202).json({
      success: true,
      queued: true,
      jobId: job.id,
      status: job.status,
      message: 'Handwritten scan queued. Poll the job status for progress.',
    })
  } catch (err) {
    await cleanupUploadedFiles((req.files || []).filter(f => f && f.path))
    if (job) await cleanupJobFiles(job)
    res.status(err.status || 500).json({
      success: false,
      message: publicMessageFor(err),
      code: err.code || 'HANDWRITTEN_SCAN_FAILED',
    })
  }
})

router.get('/jobs/events', protect, canUsePaperAi, async (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 10, 50))
  const events = (await listQueueEvents(limit * 3))
    .filter(event => req.user?.role === 'super_admin' || Number(event?.meta?.school_id || 0) === Number(currentSchoolId(req)))
    .slice(0, limit)
  res.json({ success: true, events, count: events.length })
})

router.post('/jobs/queue/pause', protect, canUsePaperAi, async (req, res) => {
  if (!requireQueueAdmin(req, res)) return
  const queue = pauseQueue()
  res.json({
    success: true,
    message: 'AI queue paused.',
    paused: true,
    queue,
  })
})

router.post('/jobs/queue/resume', protect, canUsePaperAi, async (req, res) => {
  if (!requireQueueAdmin(req, res)) return
  const queue = resumeQueue()
  res.json({
    success: true,
    message: 'AI queue resumed.',
    paused: false,
    queue,
  })
})

router.get('/jobs/queue/state', protect, canUsePaperAi, async (req, res) => {
  res.json({
    success: true,
    paused: isQueuePaused(),
    queue: scopedQueueStats(req),
  })
})

router.get('/jobs/:jobId', protect, canUsePaperAi, async (req, res) => {
  const job = getJob(req.params.jobId)
  if (!canAccessJob(req, job)) {
    return res.status(404).json({ success: false, message: 'AI job not found.' })
  }
  res.json({
    success: true,
    job: serializeJob(job),
  })
})

router.get('/jobs', protect, canUsePaperAi, async (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || 20), 100))
  const jobs = scopedJobs(req).slice(0, limit).map(serializeJob)
  res.json({
    success: true,
    jobs,
    count: jobs.length,
    queue: scopedQueueStats(req),
  })
})

router.post('/jobs/:jobId/retry', protect, canUsePaperAi, async (req, res) => {
  const existing = getJob(req.params.jobId)
  if (!canAccessJob(req, existing)) {
    return res.status(404).json({ success: false, message: 'AI job not found.' })
  }
  const job = retryJob(req.params.jobId)
  if (!job) {
    return res.status(404).json({ success: false, message: 'AI job not found.' })
  }
  res.json({
    success: true,
    message: 'Retry queued.',
    job: serializeJob(job),
  })
})

router.post('/jobs/:jobId/cancel', protect, canUsePaperAi, async (req, res) => {
  const existing = getJob(req.params.jobId)
  if (!canAccessJob(req, existing)) {
    return res.status(404).json({ success: false, message: 'AI job not found.' })
  }
  const job = cancelJob(req.params.jobId)
  if (!job) {
    return res.status(404).json({ success: false, message: 'AI job not found.' })
  }
  res.json({
    success: true,
    message: 'Cancellation requested.',
    job: serializeJob(job),
  })
})

router.delete('/jobs/events', protect, canUsePaperAi, async (req, res) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only super admins can clear global queue events.' })
    }
    await deleteQueueEvents()
    res.json({
      success: true,
      message: 'Queue event history cleared.',
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Could not clear queue events.',
      code: err.code || 'AI_QUEUE_EVENT_CLEAR_FAILED',
    })
  }
})

router.delete('/jobs/:jobId', protect, canUsePaperAi, async (req, res) => {
  try {
    const existing = getJob(req.params.jobId)
    if (!canAccessJob(req, existing)) {
      return res.status(404).json({ success: false, message: 'AI job not found.' })
    }
    const job = await deleteJob(req.params.jobId)
    if (!job) {
      return res.status(404).json({ success: false, message: 'AI job not found.' })
    }
    res.json({
      success: true,
      message: 'Job removed from history.',
      job: serializeJob(job),
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: publicMessageFor(err),
      code: err.code || 'AI_JOB_DELETE_FAILED',
    })
  }
})

router.delete('/jobs', protect, canUsePaperAi, async (req, res) => {
  try {
    const removable = scopedJobs(req).filter(job => ['completed', 'failed', 'cancelled'].includes(job.status))
    const removed = []
    for (const job of removable) {
      const deleted = await deleteJob(job.id)
      if (deleted) removed.push(deleted)
    }
    res.json({
      success: true,
      message: removed.length ? `Cleared ${removed.length} terminal job${removed.length === 1 ? '' : 's'}.` : 'No terminal jobs to clear.',
      removedCount: removed.length,
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      message: publicMessageFor(err),
      code: err.code || 'AI_JOB_DELETE_FAILED',
    })
  }
})

module.exports = router
