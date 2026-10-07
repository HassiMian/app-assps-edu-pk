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
  await query(`
    CREATE TABLE IF NOT EXISTS paper_vault (
      id BIGSERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(220) NOT NULL,
      class_name VARCHAR(120),
      section VARCHAR(60),
      subject_name VARCHAR(160),
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      revision INTEGER NOT NULL DEFAULT 1,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_paper_vault_school_updated
      ON paper_vault(school_id, updated_at DESC)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_paper_vault_owner_updated
      ON paper_vault(school_id, owner_user_id, updated_at DESC)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_paper_vault_class_subject
      ON paper_vault(school_id, LOWER(COALESCE(class_name,'')), LOWER(COALESCE(subject_name,'')))
      WHERE deleted_at IS NULL;
  `)
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
  return {
    id: String(row.id),
    name: row.name || 'Untitled Paper',
    className: row.class_name || '',
    section: row.section || '',
    subjectName: row.subject_name || '',
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
  const params = [schoolId]
  let ownerClause = ''
  if (role === 'teacher') { params.push(userId); ownerClause = ` AND owner_user_id=$${params.length}` }
  else if (!['super_admin','admin','principal'].includes(role)) return []
  params.push(Math.max(1, Math.min(Number(limit) || 100, 200)))
  const result = await query(
    `SELECT id, owner_user_id, name, class_name, section, subject_name, status, revision, created_at, updated_at
     FROM paper_vault
     WHERE school_id=$1 AND deleted_at IS NULL${ownerClause}
     ORDER BY updated_at DESC LIMIT $${params.length}`,
    params,
  )
  return result.rows.map(serializePaper)
}

async function getProjectedPaper({ schoolId, userId, role, paperId }) {
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
