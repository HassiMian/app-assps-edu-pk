const express = require('express')
const crypto = require('node:crypto')
const router = express.Router()

const { pool } = require('../config/database')
const { protect, requireRoles } = require('../middleware/auth')
const { currentSchoolId } = require('../middleware/tenant')

const canManageLessonPlans = requireRoles('super_admin', 'admin', 'school_admin', 'principal', 'teacher')

function cleanText(value, max = 500) {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, max) : ''
}

function cleanDate(value) {
  const date = cleanText(value, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
}

function normalizeClassKey(value) {
  const aliases = {
    one:'1', first:'1', two:'2', second:'2', three:'3', third:'3', four:'4', fourth:'4',
    five:'5', fifth:'5', six:'6', sixth:'6', seven:'7', seventh:'7', eight:'8', eighth:'8',
    nine:'9', ninth:'9', ten:'10', tenth:'10',
  }
  const raw = String(value || '').toLowerCase().replace(/class|grade/g, '').replace(/[^a-z0-9]/g, '')
  return aliases[raw] || raw
}

function classMatches(a, b) {
  const left = normalizeClassKey(a)
  const right = normalizeClassKey(b)
  return Boolean(left && right && left === right)
}

function resolveSchoolId(req) {
  const explicit = ['super_admin','platform_owner'].includes(String(req.user?.role || '').toLowerCase())
    ? Number(req.body?.school_id || req.query?.school_id || 0)
    : 0
  const schoolId = explicit || Number(currentSchoolId(req) || req.user?.school_id || 0)
  return Number.isInteger(schoolId) && schoolId > 0 ? schoolId : null
}

function normalizePlan(body = {}) {
  const id = cleanText(body.id || body.public_id || body.publicId || '', 120) || `lp_${crypto.randomUUID()}`
  const duration = Number(body.duration)
  const payload = JSON.parse(JSON.stringify(body || {}))
  for (const key of ['school_id','schoolId','revision','serverRevision','created_at','createdAt','updated_at','updatedAt']) delete payload[key]
  payload.id = id
  return {
    publicId: id,
    title: cleanText(body.title, 500),
    subject: cleanText(body.subject, 160),
    classLevel: cleanText(body.classLevel ?? body.class_level, 100),
    chapter: cleanText(body.chapter, 1000),
    teacher: cleanText(body.teacher, 160),
    planDate: cleanDate(body.date ?? body.plan_date) || new Date().toISOString().slice(0, 10),
    planningScope: cleanText(body.planningScope ?? body.planning_scope, 32) || 'daily',
    planRangeLabel: cleanText(body.planRangeLabel ?? body.plan_range_label, 500),
    endDate: cleanDate(body.endDate ?? body.end_date),
    period: cleanText(body.period, 64),
    duration: Number.isFinite(duration) && duration > 0 ? Math.min(Math.round(duration), 600) : 40,
    sentToPortal: Boolean(body.sentToPortal ?? body.sent_to_portal),
    payload,
  }
}

function mapRow(row) {
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  return {
    ...payload,
    id: row.public_id,
    serverRevision: Number(row.revision || 1),
    revision: Number(row.revision || 1),
    title: row.title || payload.title || '',
    subject: row.subject || payload.subject || '',
    classLevel: row.class_level || payload.classLevel || '',
    chapter: row.chapter || payload.chapter || '',
    teacher: row.teacher || payload.teacher || '',
    date: row.plan_date ? new Date(row.plan_date).toISOString().slice(0, 10) : payload.date,
    planningScope: row.planning_scope || payload.planningScope || 'daily',
    planRangeLabel: row.plan_range_label || payload.planRangeLabel || '',
    endDate: row.end_date ? new Date(row.end_date).toISOString().slice(0, 10) : (payload.endDate || ''),
    period: row.period || payload.period || '',
    duration: Number(row.duration || payload.duration || 40),
    sentToPortal: Boolean(row.sent_to_portal),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  }
}

async function withTenantTransaction(req, schoolId, fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SELECT set_config('app.rls_enabled', 'true', true)`)
    if (['super_admin','platform_owner'].includes(String(req.user?.role || '').toLowerCase())) {
      await client.query(`SELECT set_config('app.is_super_admin', 'true', true)`)
    } else {
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [String(schoolId)])
      await client.query(`SELECT set_config('app.is_super_admin', 'false', true)`)
    }
    const exists = await client.query("SELECT to_regclass('public.lesson_plans') AS table_name")
    if (!exists.rows[0]?.table_name) {
      const error = new Error('Lesson Plan storage is not initialized.')
      error.code = 'LESSON_PLAN_SCHEMA_NOT_READY'
      error.status = 503
      throw error
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

function expectedRevision(req) {
  const raw = req.body?.expectedRevision ?? req.body?.serverRevision ?? req.query?.expectedRevision ?? req.get('If-Match')
  const revision = Number(raw)
  return Number.isInteger(revision) && revision > 0 ? revision : null
}

router.use(protect, canManageLessonPlans)

router.get('/', async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req)
    if (!schoolId) return res.status(400).json({ success:false, message:'School context is required.' })
    const limit = Math.max(1, Math.min(Number(req.query.limit || 200), 500))
    const data = await withTenantTransaction(req, schoolId, async client => {
      const params = [schoolId]
      let sql = 'SELECT * FROM lesson_plans WHERE school_id=$1'
      if (req.query.classLevel) { params.push(cleanText(req.query.classLevel,100)); sql += ` AND class_level=$${params.length}` }
      if (req.query.subject) { params.push(cleanText(req.query.subject,160)); sql += ` AND subject ILIKE $${params.length}` }
      if (req.query.from) { params.push(cleanDate(req.query.from)); sql += ` AND plan_date >= $${params.length}::date` }
      if (req.query.to) { params.push(cleanDate(req.query.to)); sql += ` AND plan_date <= $${params.length}::date` }
      params.push(limit)
      sql += ` ORDER BY plan_date DESC, updated_at DESC LIMIT $${params.length}`
      const rows = await client.query(sql, params)
      return rows.rows.map(mapRow)
    })
    res.json({ success:true, data })
  } catch (error) {
    const status = Number(error.status || 500)
    if (status >= 500 && error.code !== 'LESSON_PLAN_SCHEMA_NOT_READY') console.error('Lesson plan list error:', error)
    res.status(status).json({ success:false, code:error.code || 'LESSON_PLAN_LIST_FAILED', message:status >= 500 ? 'Failed to load lesson plans.' : error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req)
    if (!schoolId) return res.status(400).json({ success:false, message:'School context is required.' })
    const plan = normalizePlan(req.body || {})
    const data = await withTenantTransaction(req, schoolId, async client => {
      const result = await client.query(`
        INSERT INTO lesson_plans (
          school_id, public_id, revision, title, subject, class_level, chapter, teacher,
          plan_date, planning_scope, plan_range_label, end_date, period, duration,
          sent_to_portal, payload, created_by, updated_at
        ) VALUES (
          $1,$2,1,$3,$4,$5,$6,$7,$8::date,$9,$10,$11::date,$12,$13,$14,$15::jsonb,$16,NOW()
        )
        ON CONFLICT (school_id, public_id) DO NOTHING
        RETURNING *
      `, [
        schoolId, plan.publicId, plan.title, plan.subject, plan.classLevel, plan.chapter, plan.teacher,
        plan.planDate, plan.planningScope, plan.planRangeLabel, plan.endDate, plan.period, plan.duration,
        plan.sentToPortal, JSON.stringify(plan.payload), req.user?.id || null,
      ])
      if (result.rowCount) return { created:true, plan:mapRow(result.rows[0]) }
      const current = await client.query('SELECT * FROM lesson_plans WHERE school_id=$1 AND public_id=$2 LIMIT 1', [schoolId, plan.publicId])
      return { created:false, plan:current.rows[0] ? mapRow(current.rows[0]) : null }
    })
    if (!data.created) return res.status(409).json({ success:false, code:'LESSON_PLAN_EXISTS', message:'This lesson plan already exists on the server.', data:data.plan })
    res.status(201).json({ success:true, data:data.plan })
  } catch (error) {
    const status = Number(error.status || 500)
    if (status >= 500 && error.code !== 'LESSON_PLAN_SCHEMA_NOT_READY') console.error('Lesson plan create error:', error)
    res.status(status).json({ success:false, code:error.code || 'LESSON_PLAN_CREATE_FAILED', message:status >= 500 ? 'Failed to save lesson plan.' : error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req)
    if (!schoolId) return res.status(400).json({ success:false, message:'School context is required.' })
    const id = cleanText(req.params.id, 120)
    const revision = expectedRevision(req)
    if (!revision) return res.status(428).json({ success:false, code:'LESSON_PLAN_REVISION_REQUIRED', message:'Current lesson plan revision is required.' })
    const plan = normalizePlan({ ...(req.body || {}), id })
    const data = await withTenantTransaction(req, schoolId, async client => {
      const result = await client.query(`
        UPDATE lesson_plans SET
          revision=revision+1,title=$1,subject=$2,class_level=$3,chapter=$4,teacher=$5,
          plan_date=$6::date,planning_scope=$7,plan_range_label=$8,end_date=$9::date,
          period=$10,duration=$11,sent_to_portal=$12,payload=$13::jsonb,updated_at=NOW()
        WHERE school_id=$14 AND public_id=$15 AND revision=$16
        RETURNING *
      `, [
        plan.title, plan.subject, plan.classLevel, plan.chapter, plan.teacher, plan.planDate,
        plan.planningScope, plan.planRangeLabel, plan.endDate, plan.period, plan.duration,
        plan.sentToPortal, JSON.stringify(plan.payload), schoolId, id, revision,
      ])
      if (result.rowCount) return { plan:mapRow(result.rows[0]) }
      const current = await client.query('SELECT revision FROM lesson_plans WHERE school_id=$1 AND public_id=$2 LIMIT 1', [schoolId, id])
      return current.rowCount ? { conflict:true, currentRevision:Number(current.rows[0].revision) } : { missing:true }
    })
    if (data.missing) return res.status(404).json({ success:false, code:'LESSON_PLAN_NOT_FOUND', message:'Lesson plan not found.' })
    if (data.conflict) return res.status(409).json({ success:false, code:'LESSON_PLAN_REVISION_CONFLICT', currentRevision:data.currentRevision, message:'Lesson plan changed in another session. Reopen it before saving.' })
    res.json({ success:true, data:data.plan })
  } catch (error) {
    const status = Number(error.status || 500)
    if (status >= 500 && error.code !== 'LESSON_PLAN_SCHEMA_NOT_READY') console.error('Lesson plan update error:', error)
    res.status(status).json({ success:false, code:error.code || 'LESSON_PLAN_UPDATE_FAILED', message:status >= 500 ? 'Failed to update lesson plan.' : error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req)
    if (!schoolId) return res.status(400).json({ success:false, message:'School context is required.' })
    const id = cleanText(req.params.id, 120)
    const revision = expectedRevision(req)
    if (!revision) return res.status(428).json({ success:false, code:'LESSON_PLAN_REVISION_REQUIRED', message:'Current lesson plan revision is required.' })
    const data = await withTenantTransaction(req, schoolId, async client => {
      const result = await client.query('DELETE FROM lesson_plans WHERE school_id=$1 AND public_id=$2 AND revision=$3 RETURNING public_id', [schoolId, id, revision])
      if (result.rowCount) return { deleted:true }
      const current = await client.query('SELECT revision FROM lesson_plans WHERE school_id=$1 AND public_id=$2 LIMIT 1', [schoolId, id])
      return current.rowCount ? { conflict:true, currentRevision:Number(current.rows[0].revision) } : { missing:true }
    })
    if (data.missing) return res.status(404).json({ success:false, code:'LESSON_PLAN_NOT_FOUND', message:'Lesson plan not found.' })
    if (data.conflict) return res.status(409).json({ success:false, code:'LESSON_PLAN_REVISION_CONFLICT', currentRevision:data.currentRevision, message:'Lesson plan changed in another session. Reopen it before deleting.' })
    res.json({ success:true, deleted:true, id })
  } catch (error) {
    const status = Number(error.status || 500)
    if (status >= 500 && error.code !== 'LESSON_PLAN_SCHEMA_NOT_READY') console.error('Lesson plan delete error:', error)
    res.status(status).json({ success:false, code:error.code || 'LESSON_PLAN_DELETE_FAILED', message:status >= 500 ? 'Failed to delete lesson plan.' : error.message })
  }
})

router.post('/:id/share', async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req)
    if (!schoolId) return res.status(400).json({ success:false, message:'School context is required.' })
    const id = cleanText(req.params.id, 120)
    const revision = expectedRevision(req)
    if (!revision) return res.status(428).json({ success:false, code:'LESSON_PLAN_REVISION_REQUIRED', message:'Current lesson plan revision is required.' })

    const data = await withTenantTransaction(req, schoolId, async client => {
      const row = (await client.query('SELECT * FROM lesson_plans WHERE school_id=$1 AND public_id=$2 LIMIT 1', [schoolId, id])).rows[0]
      if (!row) return { missing:true }
      if (Number(row.revision) !== revision) return { conflict:true, currentRevision:Number(row.revision) }

      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}
      payload.sentToPortal = true
      const updated = (await client.query(`
        UPDATE lesson_plans SET sent_to_portal=true,payload=$1::jsonb,revision=revision+1,updated_at=NOW()
        WHERE school_id=$2 AND public_id=$3 AND revision=$4 RETURNING *
      `, [JSON.stringify(payload), schoolId, id, revision])).rows[0]
      if (!updated) return { conflict:true }

      const students = (await client.query('SELECT id,name,class,section FROM students WHERE school_id=$1 AND is_active=true', [schoolId])).rows
        .filter(student => classMatches(student.class, row.class_level))
      const title = row.title || `${row.subject || 'Lesson'} — ${row.chapter || 'Lesson Plan'}`
      const message = `${row.subject || 'Lesson'} lesson plan for ${row.plan_date ? new Date(row.plan_date).toISOString().slice(0,10) : ''}: ${row.chapter || title}`.slice(0, 500)
      let notifications = 0
      for (const student of students) {
        for (const recipient of ['student','parent']) {
          await client.query(`
            INSERT INTO notification_log (
              school_id, student_id, recipient_role, type, title, message, metadata, status, sent_by
            ) VALUES ($1,$2,$3,'lesson_plan',$4,$5,$6::jsonb,'sent',$7)
          `, [
            schoolId, student.id, recipient, title, message,
            JSON.stringify({
              lesson_plan_id:id, class_level:row.class_level, subject:row.subject, chapter:row.chapter,
              plan_date:row.plan_date, recipient,
            }),
            req.user?.id || null,
          ])
          notifications += 1
        }
      }
      return { plan:mapRow(updated), notifications, studentCount:students.length }
    })

    if (data.missing) return res.status(404).json({ success:false, code:'LESSON_PLAN_NOT_FOUND', message:'Lesson plan not found.' })
    if (data.conflict) return res.status(409).json({ success:false, code:'LESSON_PLAN_REVISION_CONFLICT', currentRevision:data.currentRevision, message:'Lesson plan changed in another session. Reopen it before sharing.' })
    res.json({ success:true, data:data.plan, delivery:{ students:data.studentCount, notifications:data.notifications } })
  } catch (error) {
    const status = Number(error.status || 500)
    if (status >= 500 && error.code !== 'LESSON_PLAN_SCHEMA_NOT_READY') console.error('Lesson plan share error:', error)
    res.status(status).json({ success:false, code:error.code || 'LESSON_PLAN_SHARE_FAILED', message:status >= 500 ? 'Failed to share lesson plan.' : error.message })
  }
})

module.exports = router
