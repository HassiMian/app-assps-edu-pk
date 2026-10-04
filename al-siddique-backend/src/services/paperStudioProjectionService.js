const { query } = require('../config/database')
const { getTeacherAssignments, ensureTeacherAssignmentSchema } = require('./teacherAssignmentService')

function normalizedRole(req) { return String(req.user?.role || '').trim().toLowerCase() }
function isPaperAdmin(req) { return ['super_admin','admin','principal'].includes(normalizedRole(req)) }
function normalizeText(v) { return String(v ?? '').trim() }

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

module.exports = { normalizedRole, isPaperAdmin, teacherContext, listProjectedPapers, getProjectedPaper }
