const fs = require('fs')
const path = require('path')
const os = require('os')
const { query } = require('../../config/database')

const JOB_TTL_MS = 1000 * 60 * 60 * 24
const QUEUE_EVENT_TTL_MS = 1000 * 60 * 60 * 24 * 14
const QUEUE_EVENT_MAX_ROWS = 250
const TMP_ROOT = path.join(os.tmpdir(), 'al-siddique-ai-jobs')

if (!fs.existsSync(TMP_ROOT)) fs.mkdirSync(TMP_ROOT, { recursive: true })

const jobs = new Map()
const queue = []
const queueEvents = []
let active = 0
let queuePaused = false
let handlers = {}
let tableReady = false
let queueStateReady = false
let queueEventsReady = false
let hydrating = false
let hydrated = false

function nowIso() {
  return new Date().toISOString()
}

function toMs(value) {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : 0
}

function createJobId() {
  return `aj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

async function ensureTable() {
  if (tableReady) return
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ai_jobs (
        id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        message TEXT,
        payload JSONB,
        result JSONB,
        error JSONB,
        meta JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_updated ON ai_jobs(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_jobs_type_created ON ai_jobs(job_type, created_at DESC);
    `).catch(() => {})
    tableReady = true
  } catch (err) {
    console.warn('AI job table bootstrap skipped:', err.message)
  }
}

async function ensureQueueStateTable() {
  if (queueStateReady) return
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ai_queue_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    queueStateReady = true
  } catch (err) {
    console.warn('AI queue state bootstrap skipped:', err.message)
  }
}

async function ensureQueueEventsTable() {
  if (queueEventsReady) return
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS ai_queue_events (
        id BIGSERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        meta JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_queue_events_created ON ai_queue_events(created_at DESC)`).catch(() => {})
    queueEventsReady = true
  } catch (err) {
    console.warn('AI queue events bootstrap skipped:', err.message)
  }
}

async function loadQueuePausedState() {
  try {
    await ensureQueueStateTable()
    const result = await query('SELECT value FROM ai_queue_state WHERE key = $1', ['paused'])
    const value = String(result.rows[0]?.value || 'false').toLowerCase()
    queuePaused = value === 'true' || value === '1' || value === 'yes'
  } catch (err) {
    console.warn('AI queue paused state load skipped:', err.message)
  }
}

async function persistQueuePausedState() {
  try {
    await ensureQueueStateTable()
    await query(
      `INSERT INTO ai_queue_state (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      ['paused', String(Boolean(queuePaused))]
    )
  } catch (err) {
    console.warn('AI queue paused state persist skipped:', err.message)
  }
}

async function recordQueueEvent(eventType, message, meta = {}) {
  const event = {
    eventType,
    message,
    meta,
    createdAt: nowIso(),
  }
  queueEvents.unshift(event)
  if (queueEvents.length > 100) {
    queueEvents.length = 100
  }
  try {
    await ensureQueueEventsTable()
    await query(
      `INSERT INTO ai_queue_events (event_type, message, meta, created_at)
       VALUES ($1, $2, $3, $4)`,
      [eventType, message, JSON.stringify(meta || {}), event.createdAt]
    )
    const cutoffIso = new Date(Date.now() - QUEUE_EVENT_TTL_MS).toISOString()
    await query(
      `DELETE FROM ai_queue_events
       WHERE id NOT IN (
         SELECT id FROM ai_queue_events
         WHERE created_at >= $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2
       )`,
      [cutoffIso, QUEUE_EVENT_MAX_ROWS]
    ).catch(() => {})
  } catch (err) {
    console.warn('AI queue event persist skipped:', err.message)
  }
  return event
}

async function listQueueEvents(limit = 20) {
  try {
    await ensureQueueEventsTable()
    const result = await query(
      `SELECT event_type, message, meta, created_at
       FROM ai_queue_events
       ORDER BY created_at DESC
       LIMIT $1`,
      [Math.max(1, Math.min(Number(limit || 20), 100))]
    )
    return result.rows.map(row => ({
      eventType: row.event_type,
      message: row.message,
      meta: parseJsonField(row.meta, {}),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : nowIso(),
    }))
  } catch (err) {
    console.warn('AI queue events read skipped:', err.message)
    return queueEvents.slice(0, Math.max(1, Math.min(Number(limit || 20), 100)))
  }
}

async function deleteQueueEvents() {
  queueEvents.length = 0
  try {
    await ensureQueueEventsTable()
    await query('DELETE FROM ai_queue_events')
  } catch (err) {
    console.warn('AI queue events clear skipped:', err.message)
  }
  return true
}

async function persistJob(job) {
  try {
    await ensureTable()
    await query(
      `INSERT INTO ai_jobs (id, job_type, status, progress, message, payload, result, error, meta, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         job_type = EXCLUDED.job_type,
         status = EXCLUDED.status,
         progress = EXCLUDED.progress,
         message = EXCLUDED.message,
         payload = EXCLUDED.payload,
         result = EXCLUDED.result,
         error = EXCLUDED.error,
         meta = EXCLUDED.meta,
         updated_at = EXCLUDED.updated_at`,
      [
        job.id,
        job.type,
        job.status,
        job.progress,
        job.message || null,
        JSON.stringify(job.payload || {}),
        job.result ? JSON.stringify(job.result) : null,
        job.error ? JSON.stringify(job.error) : null,
        JSON.stringify(job.meta || {}),
        job.createdAt,
        job.updatedAt,
      ]
    )
  } catch (err) {
    console.warn('AI job persist skipped:', err.message)
  }
}

function parseJsonField(value, fallback = null) {
  if (value == null) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function eventMetaForJob(job, extra = {}) {
  return {
    ...extra,
    jobId: job.id,
    jobType: job.type,
    school_id: job.meta?.school_id || job.payload?.school_id || job.payload?.config?.school_id || null,
  }
}

function restoreJob(row) {
  const job = {
    id: row.id,
    type: row.job_type,
    payload: parseJsonField(row.payload, {}),
    meta: parseJsonField(row.meta, {}),
    status: row.status || 'queued',
    progress: Number(row.progress) || 0,
    message: row.message || 'Queued',
    result: parseJsonField(row.result, null),
    error: parseJsonField(row.error, null),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : nowIso(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : nowIso(),
    startedAt: null,
    completedAt: null,
    attempts: Number(row.meta?.attempts || 0) || 0,
    retryCount: Number(row.meta?.retryCount || 0) || 0,
    jobDir: ensureJobDir(row.id),
  }

  const terminal = job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
  if (terminal) {
    job.completedAt = job.updatedAt
  } else if (job.status === 'running' || job.status === 'retrying') {
    job.status = 'queued'
    job.message = 'Resumed after server restart'
    job.progress = Math.min(Number(job.progress) || 0, 95)
  }

  return job
}

function serializeJob(job) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    message: job.message,
    result: job.result,
    error: job.error,
    meta: job.meta,
    attempts: job.attempts,
    retryCount: job.retryCount,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }
}

function isQueuePaused() {
  return queuePaused
}

function getJobDir(jobId) {
  return path.join(TMP_ROOT, jobId)
}

function ensureJobDir(jobId) {
  const dir = getJobDir(jobId)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function cleanupJobFiles(job) {
  const dir = getJobDir(job.id)
  try {
    if (fs.existsSync(dir)) {
      await fs.promises.rm(dir, { recursive: true, force: true })
    }
  } catch (err) {
    console.warn('AI job cleanup skipped:', err.message)
  }
}

async function pruneJobs() {
  const cutoff = Date.now() - JOB_TTL_MS
  const staleIds = []

  for (const [id, job] of jobs.entries()) {
    const finishedAt = toMs(job.completedAt || job.updatedAt || job.createdAt)
    const terminal = job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
    if (terminal && finishedAt && finishedAt < cutoff) {
      staleIds.push(id)
    }
  }

  if (!staleIds.length) return

  staleIds.forEach(id => {
    const job = jobs.get(id)
    if (job) {
      void recordQueueEvent('job_pruned', 'Old AI job pruned', eventMetaForJob(job, {
        status: job.status,
      }))
    }
    jobs.delete(id)
  })

  try {
    await query('DELETE FROM ai_jobs WHERE id = ANY($1::text[])', [staleIds])
  } catch (err) {
    console.warn('AI job prune DB cleanup skipped:', err.message)
  }

  await Promise.all(staleIds.map(async id => {
    try {
      const dir = getJobDir(id)
      if (fs.existsSync(dir)) {
        await fs.promises.rm(dir, { recursive: true, force: true })
      }
    } catch {}
  }))
}

async function hydrateJobsFromDb() {
  if (hydrated || hydrating) return
  hydrating = true
  try {
    await ensureTable()
    await loadQueuePausedState()
    const result = await query(`
      SELECT id, job_type, status, progress, message, payload, result, error, meta, created_at, updated_at
      FROM ai_jobs
      ORDER BY updated_at DESC
      LIMIT 250
    `)

    for (const row of result.rows) {
      const job = restoreJob(row)
      jobs.set(job.id, job)
      const shouldResume = job.status === 'queued'
      if (shouldResume && !queue.includes(job.id)) {
        queue.push(job.id)
      }
    }

    hydrated = true
    void recordQueueEvent('queue_hydrated', 'AI queue restored from database', {
      jobs: jobs.size,
      queued: queue.length,
      paused: queuePaused,
    })
    void pruneJobs()
    if (queue.length) {
      process.nextTick(runQueue)
    }
  } catch (err) {
    console.warn('AI job hydrate skipped:', err.message)
  } finally {
    hydrating = false
  }
}

function registerHandlers(nextHandlers) {
  handlers = { ...handlers, ...nextHandlers }
}

function queueJob(jobId) {
  const job = jobs.get(jobId)
  if (!job) return null
  if (job.status === 'cancelled') return job
  if (!queue.includes(jobId)) {
    queue.push(jobId)
    void recordQueueEvent('job_queued', 'AI job queued', eventMetaForJob(job))
    if (!queuePaused) {
      process.nextTick(runQueue)
    }
  }
  return job
}

function createJob(type, payload = {}, meta = {}) {
  void pruneJobs()
  const id = createJobId()
  const job = {
    id,
    type,
    payload,
    meta,
    status: 'queued',
    progress: 0,
    message: 'Queued',
    result: null,
    error: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    startedAt: null,
    completedAt: null,
    attempts: 0,
    retryCount: 0,
    jobDir: ensureJobDir(id),
  }
  jobs.set(id, job)
  if (meta.autoStart !== false) {
    queue.push(id)
    void recordQueueEvent('job_created', 'AI job created', eventMetaForJob(job))
    if (!queuePaused) {
      process.nextTick(runQueue)
    }
  }
  void persistJob(job)
  return job
}

function updateJob(id, patch = {}) {
  const job = jobs.get(id)
  if (!job) return null
  Object.assign(job, patch, { updatedAt: nowIso() })
  void persistJob(job)
  return job
}

function getJob(id) {
  return jobs.get(id) || null
}

function listJobs() {
  void pruneJobs()
  return Array.from(jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function getQueueStats() {
  const jobsList = Array.from(jobs.values())
  const counts = jobsList.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1
    return acc
  }, {})
  const now = Date.now()
  const oldestQueued = jobsList
    .filter(job => job.status === 'queued' || job.status === 'retrying')
    .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt))[0] || null
  const oldestRunning = jobsList
    .filter(job => job.status === 'running')
    .sort((a, b) => toMs(a.startedAt || a.createdAt) - toMs(b.startedAt || b.createdAt))[0] || null
  return {
    active,
    queued: queue.length,
    total: jobsList.length,
    paused: queuePaused,
    statuses: counts,
    oldestQueuedAt: oldestQueued?.createdAt || null,
    oldestQueuedAgeMinutes: oldestQueued ? Math.max(0, Math.round((now - toMs(oldestQueued.createdAt)) / 60000)) : 0,
    oldestRunningAt: oldestRunning?.startedAt || oldestRunning?.createdAt || null,
    oldestRunningAgeMinutes: oldestRunning
      ? Math.max(0, Math.round((now - toMs(oldestRunning.startedAt || oldestRunning.createdAt)) / 60000))
      : 0,
  }
}

function resolveHandlers(type) {
  const fn = handlers[type]
  if (!fn) throw new Error(`No AI handler registered for job type: ${type}`)
  return fn
}

async function runJob(job) {
  if (job.status === 'cancelled') {
    return getJob(job.id)
  }
  job.status = 'running'
  job.startedAt = job.startedAt || nowIso()
  job.updatedAt = nowIso()
  job.attempts += 1
  await persistJob(job)
  void recordQueueEvent('job_started', 'AI job started', eventMetaForJob(job))

  try {
    const handler = resolveHandlers(job.type)
      const result = await handler({
        job,
        update: (patch) => updateJob(job.id, patch),
        jobDir: job.jobDir,
        cleanup: () => cleanupJobFiles(job),
        isCancelled: () => getJob(job.id)?.status === 'cancelled',
      })
      if (job.status === 'cancelled') {
        return getJob(job.id)
      }
      const finalStatus = result?.status || 'completed'
      void recordQueueEvent(finalStatus === 'completed' ? 'job_completed' : 'job_updated', `AI job ${finalStatus}`, eventMetaForJob(job, {
        status: finalStatus,
      }))
      updateJob(job.id, {
        status: finalStatus,
        progress: result?.progress ?? 100,
        message: result?.message || 'Completed',
        result: result?.result || result || null,
      error: null,
      completedAt: nowIso(),
    })
    return getJob(job.id)
  } catch (err) {
    const finalStatus = err.code === 'AI_JOB_CANCELLED' ? 'cancelled' : 'failed'
    void recordQueueEvent(finalStatus === 'cancelled' ? 'job_cancelled' : 'job_failed', `AI job ${finalStatus}`, eventMetaForJob(job, {
      status: finalStatus,
    }))
    updateJob(job.id, {
      status: finalStatus,
      progress: job.progress || 0,
      message: finalStatus === 'cancelled' ? 'Job cancelled.' : (err.message || 'AI job failed'),
      error: finalStatus === 'cancelled' ? null : {
        code: err.code || 'AI_JOB_FAILED',
        message: err.message || 'AI job failed',
        details: err.details || null,
      },
      completedAt: nowIso(),
    })
    return getJob(job.id)
  } finally {
    if (job.status === 'completed' || job.status === 'cancelled') {
      if (!job.meta?.keepFiles) {
        await cleanupJobFiles(job)
      }
    }
    if (job.status === 'failed' && !job.meta?.keepFiles) {
      // Keep failed job files around for retries and debugging.
      // They will be removed later by pruneJobs after the job TTL expires.
    }
  }
}

async function runQueue() {
  if (queuePaused) return
  if (active > 0) return
  active += 1
  try {
    while (queue.length) {
      const id = queue.shift()
      const job = jobs.get(id)
      if (!job) continue
      if (job.status !== 'queued' && job.status !== 'retrying') continue
      await runJob(job)
    }
  } finally {
    active = 0
  }
}

function pauseQueue() {
  queuePaused = true
  void persistQueuePausedState()
  void recordQueueEvent('queue_paused', 'AI queue paused', {
    paused: true,
  })
  return getQueueStats()
}

function resumeQueue() {
  queuePaused = false
  void persistQueuePausedState()
  void recordQueueEvent('queue_resumed', 'AI queue resumed', {
    paused: false,
  })
  process.nextTick(runQueue)
  return getQueueStats()
}

function retryJob(id) {
  const job = jobs.get(id)
  if (!job) return null
  job.retryCount += 1
  job.status = 'queued'
  const failedPages = Array.isArray(job.result?.failedPages) ? [...new Set(job.result.failedPages.map(page => Number(page)).filter(Number.isFinite))] : []
  if (failedPages.length) {
    job.payload = {
      ...(job.payload || {}),
      retryPages: failedPages,
      retrySourceJobId: job.id,
    }
    job.message = `Retry queued for pages: ${failedPages.join(', ')}`
  } else {
    job.message = 'Retry queued'
  }
  job.error = null
  job.completedAt = null
  queue.push(job.id)
  void recordQueueEvent('job_retried', 'AI job queued for retry', eventMetaForJob(job))
  void persistJob(job)
  process.nextTick(runQueue)
  return job
}

function cancelJob(id) {
  const job = jobs.get(id)
  if (!job) return null
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return job
  }
  const queueIndex = queue.indexOf(job.id)
  if (queueIndex >= 0) {
    queue.splice(queueIndex, 1)
  }
  job.status = 'cancelled'
  job.message = 'Job cancelled.'
  job.error = null
  job.completedAt = nowIso()
  void recordQueueEvent('job_cancelled', 'AI job cancelled', eventMetaForJob(job))
  void persistJob(job)
  return job
}

async function deleteJob(id) {
  const job = jobs.get(id)
  if (!job) return null
  const terminal = job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
  if (!terminal) {
    throw new Error('Only completed, failed, or cancelled jobs can be deleted.')
  }

  const queueIndex = queue.indexOf(job.id)
  if (queueIndex >= 0) {
    queue.splice(queueIndex, 1)
  }

  jobs.delete(id)
  void recordQueueEvent('job_deleted', 'AI job removed from history', eventMetaForJob(job, {
    status: job.status,
  }))
  try {
    await query('DELETE FROM ai_jobs WHERE id = $1', [id])
  } catch (err) {
    console.warn('AI job delete DB cleanup skipped:', err.message)
  }

  if (!job.meta?.keepFiles) {
    await cleanupJobFiles(job)
  }

  return job
}

async function deleteTerminalJobs() {
  const deletable = Array.from(jobs.values()).filter(job => ['completed', 'failed', 'cancelled'].includes(job.status))
  const removed = []
  for (const job of deletable) {
    removed.push(await deleteJob(job.id))
  }
  return removed.filter(Boolean)
}

module.exports = {
  registerHandlers,
  createJob,
  queueJob,
  getJob,
  listJobs,
  listQueueEvents,
  retryJob,
  cancelJob,
  deleteJob,
  deleteTerminalJobs,
  pauseQueue,
  resumeQueue,
  isQueuePaused,
  updateJob,
  ensureJobDir,
  getJobDir,
  serializeJob,
  cleanupJobFiles,
  pruneJobs,
  hydrateJobsFromDb,
  getQueueStats,
  deleteQueueEvents,
}
