const { query } = require('../config/database')
const { getTeacherAssignments, ensureTeacherAssignmentSchema, teacherCanAccessClass } = require('./teacherAssignmentService')

function normalizedRole(req) { return String(req.user?.role || '').trim().toLowerCase() }
function isPaperAdmin(req) { return ['super_admin','admin','principal'].includes(normalizedRole(req)) }
function normalizeText(v) { return String(v ?? '').trim() }


function cleanPaperText(value, limit) {
  const valueText = String(value || '').trim()
  return valueText ? valueText.slice(0, limit) : null
}

function projectedPaperConfig(payload = {}) {
  const cfg = payload?.config || payload?.metadata || {}
  return {
    name: cleanPaperText(payload?.name || cfg?.name || cfg?.title || 'Untitled Paper', 220) || 'Untitled Paper',
    className: cleanPaperText(cfg?.className || cfg?.classLevel || cfg?.class || '', 120),
    section: cleanPaperText(cfg?.section || '', 60),
    subjectName: cleanPaperText(cfg?.subjectName || cfg?.subject || '', 160),
  }
}

async function ensureProjectedPaperVaultSchema() {
  const result = await query(`
    SELECT
      to_regclass('public.paper_vault') AS table_name,
      COUNT(*) FILTER (WHERE column_name IN (
        'school_id','owner_user_id','name','class_name','section','subject_name',
        'status','revision','payload','deleted_at'
      ))::int AS required_columns
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='paper_vault'
  `)
  const row = result.rows?.[0] || {}
  if (!row.table_name || Number(row.required_columns || 0) < 10) {
    const err = new Error('Paper Vault schema is not initialized. Apply migration 020_paper_vault_schema before serving Paper Studio workflows.')
    err.status = 503
    err.code = 'PAPER_VAULT_SCHEMA_NOT_READY'
    throw err
  }
  return true
}

async function createProjectedPaper({ schoolId, userId, role, payload }) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const err = new Error('A structured paper document is required.')
    err.status = 400
    err.code = 'INVALID_PAPER_DOCUMENT'
    throw err
  }
  if (!['super_admin','admin','principal','teacher'].includes(role)) {
    const err = new Error('Paper creation is not available for this role.')
    err.status = 403
    err.code = 'PAPER_CREATE_FORBIDDEN'
    throw err
  }
  await ensureProjectedPaperVaultSchema()
  const cfg = projectedPaperConfig(payload)
  if (role === 'teacher') {
    if (!cfg.className) {
      const err = new Error('Select an assigned class before saving this paper.')
      err.status = 400
      err.code = 'TEACHER_PAPER_CLASS_REQUIRED'
      throw err
    }
    await ensureTeacherAssignmentSchema()
    const allowed = await teacherCanAccessClass({ schoolId, teacherUserId: userId, className: cfg.className, section: cfg.section, subject: cfg.subjectName })
    if (!allowed) {
      const err = new Error('Teachers can save papers only for their assigned class and subject.')
      err.status = 403
      err.code = 'TEACHER_PAPER_SCOPE_DENIED'
      throw err
    }
  }
  const result = await query(
    `INSERT INTO paper_vault
     (school_id, owner_user_id, name, class_name, section, subject_name, status, payload)
     VALUES ($1,$2,$3,$4,$5,$6,'draft',$7)
     RETURNING id, owner_user_id, name, class_name, section, subject_name, status, revision, payload, created_at, updated_at`,
    [schoolId, userId, cfg.name, cfg.className, cfg.section, cfg.subjectName, JSON.stringify(payload)],
  )
  const row = result.rows[0]
  return { ...serializePaper(row), document: row.payload }
}

function serializePaper(row) {
  const payload = row?.payload && typeof row.paper_json === 'object' ? row.paper_json : {}
  return {
    id: String(row.id),
    name: row.name || payload.name || 'Untitled Paper',
    className: row.class_name || payload?.config?.classLevel || payload?.config?.className || '',
    section: row.section || payload?.config?.section || '',
    subjectName: row.subject_name || payload?.config?.subject || payload?.config?.subjectName || '',
    status: row.status || 'draft',
    revision: Number(row.revision || 1),
    author: { userId: String(row.owner_user_id) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: 'canonical-paper-projection',
  }
}

async function teacherContext({ schoolId, userId, role }) {
  await ensureTeacherAssignmentSchema()
  if (role !== 'teacher') return { assignments: [], paperScope: 'school', questionScope: 'school-governed' }
  const rows = await getTeacherAssignments({ schoolId, teacherUserId: userId })
  const grouped = new Map()
  for (const row of rows) {
    const className = normalizeText(row.class_name)
    const section = normalizeText(row.section)
    const key = `${className.toLowerCase()}::${section.toLowerCase()}`
    if (!grouped.has(key)) grouped.set(key, { className, section, subjects: [] })
    const subject = normalizeText(row.subject)
    if (subject && !grouped.get(key).subjects.some(x => x.toLowerCase() === subject.toLowerCase())) grouped.get(key).subjects.push(subject)
  }
  return { assignments: [...grouped.values()], paperScope: 'own', questionScope: 'assigned-approved' }
}

async function listProjectedPapers({ schoolId, userId, role, limit = 100 }) {
  await ensureProjectedPaperVaultSchema()
  const params = [schoolId]
  let ownerClause = ''
  if (role === 'teacher') { params.push(userId); ownerClause = ` AND owner_user_id=$${params.length}` }
  else if (!['super_admin','admin','principal'].includes(role)) return []
  params.push(Math.max(1, Math.min(Number(limit) || 100, 200)))
  const result = await query(
    `SELECT id, owner_user_id, name, class_name, section, subject_name, status, revision, payload, created_at, updated_at
     FROM paper_vault
     WHERE school_id=$1 AND deleted_at IS NULL${ownerClause}
     ORDER BY updated_at DESC LIMIT $${params.length}`,
    params,
  )
  return result.rows.map(serializePaper)
}

async function getProjectedPaper({ schoolId, userId, role, paperId }) {
  await ensureProjectedPaperVaultSchema()
  const params = [paperId, schoolId]
  let ownerClause = ''
  if (role === 'teacher') { params.push(userId); ownerClause = ` AND owner_user_id=$${params.length}` }
  else if (!['super_admin','admin','principal'].includes(role)) return null
  const result = await query(
    `SELECT id, owner_user_id, name, class_name, section, subject_name, status, revision, payload, created_at, updated_at
     FROM paper_vault WHERE id=$1 AND school_id=$2 AND deleted_at IS NULL${ownerClause} LIMIT 1`, params)
  if (!result.rowCount) return null
  const row = result.rows[0]
  return { ...serializePaper(row), document: row.payload }
}

module.exports = { normalizedRole, isPaperAdmin, teacherContext, listProjectedPapers, getProjectedPaper, createProjectedPaper }
