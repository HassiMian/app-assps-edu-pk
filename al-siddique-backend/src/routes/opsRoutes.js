const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { protect, adminOnly } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')
const { getQueueStats, listQueueEvents } = require('../services/ai/paperAiQueue')
const { getAiEnvConfig } = require('../services/ai/geminiClient')

function buildDiagnosticsHealth(ai, queue, outcomes24h = {}) {
  const warnings = []

  if (!ai.apiKey) {
    warnings.push('Gemini API key is not configured.')
  }

  if (!ai.primaryModel) {
    warnings.push('Primary AI model is missing.')
  }

  if (!ai.visionModel) {
    warnings.push('Vision model is missing.')
  }

  if (!ai.textModel) {
    warnings.push('Text model is missing.')
  }

  if ((queue?.statuses?.failed || 0) > 0) {
    warnings.push(`${queue.statuses.failed} AI job${queue.statuses.failed === 1 ? '' : 's'} failed recently.`)
  }

  if ((queue?.queued || 0) > 25) {
    warnings.push(`AI queue backlog is high (${queue.queued} jobs queued).`)
  } else if ((queue?.queued || 0) > 10) {
    warnings.push(`AI queue is growing (${queue.queued} jobs queued).`)
  }

  if ((queue?.active || 0) > 4) {
    warnings.push(`AI worker load is high (${queue.active} active jobs).`)
  }

  if ((queue?.oldestQueuedAgeMinutes || 0) > 20) {
    warnings.push(`Oldest queued AI job has been waiting ${queue.oldestQueuedAgeMinutes} minute${queue.oldestQueuedAgeMinutes === 1 ? '' : 's'}.`)
  }

  if ((queue?.oldestRunningAgeMinutes || 0) > 30) {
    warnings.push(`Oldest running AI job has been active for ${queue.oldestRunningAgeMinutes} minute${queue.oldestRunningAgeMinutes === 1 ? '' : 's'}.`)
  }

  if (queue?.paused) {
    warnings.push('AI queue is paused.')
  }

  const completed24h = Number(outcomes24h?.completed || 0)
  const failed24h = Number(outcomes24h?.failed || 0)
  const total24h = completed24h + failed24h + Number(outcomes24h?.cancelled || 0)
  const failureRate24h = total24h > 0 ? Math.round((failed24h / total24h) * 100) : 0
  if (failed24h >= 5) {
    warnings.push(`AI jobs failed ${failed24h} times in the last 24 hours.`)
  } else if (failed24h > completed24h && failed24h > 0) {
    warnings.push('AI failures are outpacing successful jobs in the last 24 hours.')
  }

  if (total24h >= 8 && failureRate24h >= 50) {
    warnings.push(`AI failure rate is high (${failureRate24h}% over the last 24 hours).`)
  }

  const critical = !ai.apiKey && ((queue?.queued || 0) > 0 || (queue?.active || 0) > 0)
  const status = critical ? 'critical' : warnings.length ? 'warning' : 'healthy'
  const recommendation = critical
    ? 'Configure Gemini API key and retry pending AI jobs.'
        : queue?.paused
          ? 'Resume the AI queue when you are ready to continue processing.'
          : total24h >= 8 && failureRate24h >= 50
            ? 'Review the AI pipeline for the high failure rate in the last 24 hours.'
          : failed24h >= 5
            ? 'Review recent AI failures and check model/configuration health.'
          : failed24h > completed24h && failed24h > 0
            ? 'Review recent failures before submitting more AI jobs.'
      : warnings.length
        ? 'Review warnings and clear stale AI jobs if needed.'
        : 'System is healthy. Keep monitoring queue depth and DB latency.'

  return { status, warnings, recommendation, failureRate24h: total24h >= 8 ? failureRate24h : null }
}

router.get('/diagnostics', protect, adminOnly, async (req, res) => {
  try {
    const schoolId = currentSchoolId(req)
    const isSuperAdmin = req.user?.role === 'super_admin'
    const schoolFilter = isSuperAdmin ? '' : ' WHERE school_id = $1'
    const schoolParams = isSuperAdmin ? [] : [schoolId]
    const dbStartedAt = Date.now()

    const [studentsR, employeesR, feesR, examsR, resultsR, attendanceR, noticesR, admissionsR, queueActivityR, queueOutcomeR] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM students${schoolFilter}`, schoolParams),
      query(`SELECT COUNT(*)::int AS count FROM employees${schoolFilter}`, schoolParams),
      query(`SELECT COUNT(*)::int AS count FROM fee_challans${schoolFilter}`, schoolParams),
      query(`SELECT COUNT(*)::int AS count FROM exams${schoolFilter}`, schoolParams),
      query(`SELECT COUNT(*)::int AS count FROM exam_results${schoolFilter}`, schoolParams),
      query(`SELECT COUNT(*)::int AS count FROM attendance${schoolFilter}`, schoolParams),
      query(`SELECT COUNT(*)::int AS count FROM notices${schoolFilter}`, schoolParams).catch(() => ({ rows: [{ count: 0 }] })),
      query(`SELECT COUNT(*)::int AS count FROM admissions${schoolFilter}`, schoolParams).catch(() => ({ rows: [{ count: 0 }] })),
      query(`SELECT COUNT(*)::int AS count FROM ai_queue_events WHERE created_at >= NOW() - INTERVAL '30 minutes'`).catch(() => ({ rows: [{ count: 0 }] })),
      query(`
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'job_completed')::int AS completed,
          COUNT(*) FILTER (WHERE event_type = 'job_failed')::int AS failed,
          COUNT(*) FILTER (WHERE event_type = 'job_cancelled')::int AS cancelled
        FROM ai_queue_events
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `).catch(() => ({ rows: [{ completed: 0, failed: 0, cancelled: 0 }] })),
    ])

    const ai = getAiEnvConfig()
    const queue = getQueueStats()
    const queueEvents = await listQueueEvents(1)
    const latestQueueEvent = queueEvents[0] || null
    const latestQueueEventAgeMinutes = latestQueueEvent?.createdAt ? Math.max(0, Math.round((Date.now() - new Date(latestQueueEvent.createdAt).getTime()) / 60000)) : null
    const health = buildDiagnosticsHealth(ai, queue, {
      completed: Number(queueOutcomeR.rows[0]?.completed || 0),
      failed: Number(queueOutcomeR.rows[0]?.failed || 0),
      cancelled: Number(queueOutcomeR.rows[0]?.cancelled || 0),
    })
    const database = 'ok'
    const databaseLatencyMs = Date.now() - dbStartedAt
    if (databaseLatencyMs > 1500) {
      health.warnings.push(`Database responses are slow (${databaseLatencyMs}ms).`)
      if (health.status === 'healthy') {
        health.status = 'warning'
      }
    }
    res.json({
      success: true,
      schoolId,
      scope: isSuperAdmin ? 'global' : 'school',
      database,
      databaseLatencyMs,
      status: health.status,
      warnings: health.warnings,
      recommendation: health.recommendation,
      counts: {
        students: Number(studentsR.rows[0]?.count || 0),
        employees: Number(employeesR.rows[0]?.count || 0),
        feeChallans: Number(feesR.rows[0]?.count || 0),
        exams: Number(examsR.rows[0]?.count || 0),
        examResults: Number(resultsR.rows[0]?.count || 0),
        attendance: Number(attendanceR.rows[0]?.count || 0),
        notices: Number(noticesR.rows[0]?.count || 0),
        admissions: Number(admissionsR.rows[0]?.count || 0),
      },
      ai: {
        configured: Boolean(ai.apiKey),
        models: {
          primary: ai.primaryModel,
          fallback: ai.fallbackModel,
          vision: ai.visionModel,
          text: ai.textModel,
        },
        queue,
        latestEvent: latestQueueEvent ? {
          type: latestQueueEvent.eventType,
          message: latestQueueEvent.message,
          createdAt: latestQueueEvent.createdAt,
          ageMinutes: latestQueueEventAgeMinutes,
        } : null,
        recentActivity30m: Number(queueActivityR.rows[0]?.count || 0),
        recentOutcomes24h: {
          completed: Number(queueOutcomeR.rows[0]?.completed || 0),
          failed: Number(queueOutcomeR.rows[0]?.failed || 0),
          cancelled: Number(queueOutcomeR.rows[0]?.cancelled || 0),
        },
        failureRate24h: health.failureRate24h,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Diagnostics unavailable',
    })
  }
})

module.exports = router
