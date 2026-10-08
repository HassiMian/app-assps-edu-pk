// Teacher drafts remain private to their author; school management may review all
// records in its own school. Unattributed historical rows are management-only.
function isSchoolDocumentManager(user = {}) {
  return ['super_admin', 'admin', 'school_admin', 'principal'].includes(String(user.role || '').toLowerCase())
}

function canAccessAuthoredDocument(user = {}, row = {}, schoolId) {
  if (user.role === 'super_admin') return true
  if (!Number.isSafeInteger(Number(schoolId)) || Number(schoolId) <= 0) return false
  if (Number(row.school_id) !== Number(schoolId)) return false
  if (isSchoolDocumentManager(user)) return true
  const actor = Number(user.id)
  return String(user.role || '').toLowerCase() === 'teacher' && Number.isSafeInteger(actor) && actor > 0 &&
    row.created_by != null && Number(row.created_by) === actor
}

module.exports = { isSchoolDocumentManager, canAccessAuthoredDocument }
