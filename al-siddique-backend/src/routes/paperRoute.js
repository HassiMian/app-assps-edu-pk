const express = require('express')
const fs = require('fs')
const path = require('path')
const os = require('os')
const multer = require('multer')
const router = express.Router()

const { protect, requireRoles, requireFeature: maybeRequireFeature } = require('../middleware/auth')
const { pool } = require('../config/database')
const { currentSchoolId, tenantClause } = require('../middleware/tenant')
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

const UPLOAD_ROOT = path.join(os.tmpdir(), 'al-siddique-paper-uploads')
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safe}`)
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
