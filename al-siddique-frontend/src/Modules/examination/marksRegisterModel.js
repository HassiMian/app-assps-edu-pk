import { normalizeMarksClass, equivalentMarksClass } from './marksEntryModel.js'

// A row exists only when the server has returned an authenticated saved record.
// Zero is a valid saved score. Missing and pending are NEVER converted to zero.
export const hasSavedScore = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
const norm = value => String(value ?? '').trim().toLocaleLowerCase('en')
const sameClass = (a, b) => equivalentMarksClass(a, b)
export const registerFilterRows = (rows, { className = '', section = '', subject = '', search = '' } = {}) => {
  const term = norm(search)
  return (Array.isArray(rows) ? rows : []).filter(row =>
    (!className || sameClass(row.student_class ?? row.class, className)) &&
    (!section || norm(row.student_section ?? row.section) === norm(section)) &&
    (!subject || norm(row.subject) === norm(subject)) &&
    (!term || [row.name, row.student_name, row.father_name, row.gr_number, row.roll_number].some(v => norm(v).includes(term)))
  ).sort((a, b) =>
    normalizeMarksClass(a.student_class ?? a.class).localeCompare(normalizeMarksClass(b.student_class ?? b.class), undefined, { numeric: true }) ||
    norm(a.student_section ?? a.section).localeCompare(norm(b.student_section ?? b.section)) ||
    norm(a.name ?? a.student_name).localeCompare(norm(b.name ?? b.student_name)) ||
    norm(a.subject).localeCompare(norm(b.subject))
  )
}
export const availableRegisterValues = (rows, field) =>
  [...new Set((Array.isArray(rows) ? rows : []).map(row => String(field(row) ?? '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

const sameScope = (a, b) => norm(a) === norm(b)
export const resolveRegisterOffering = (exam, row) => {
  const rows = Array.isArray(exam?.subject_offerings) ? exam.subject_offerings : []
  const cls = row.student_class ?? row.class
  const section = row.student_section ?? row.section
  // Exact section is preferred, followed only by explicitly section-wide policy.
  const choices = rows.filter(x => sameScope(x.subject, row.subject) && sameClass(x.class_name, cls) &&
    (!x.section || sameScope(x.section, section)))
  return choices.find(x => x.section && sameScope(x.section, section)) || choices.find(x => !x.section) || null
}
export const registerScoreInfo = (row, exam) => {
  const policy = resolveRegisterOffering(exam, row)
  const obtained = hasSavedScore(row.marks_obtained) ? Number(row.marks_obtained) : null
  const totalValue = policy?.total_marks ?? row.total_marks ?? exam?.total_marks
  const maximum = hasSavedScore(totalValue) && Number(totalValue) > 0 ? Number(totalValue) : null
  const passValue = policy?.pass_marks ?? row.pass_marks
  // Do not fabricate an institution-approved pass mark from a default percentage.
  const pass = hasSavedScore(passValue) ? Number(passValue) : null
  const state = norm(row.result_state ?? row.status)
  const isSpecial = ['absent', 'excused', 'withheld', 'pending'].includes(state)
  const score = isSpecial ? null : obtained
  return {
    score, maximum, pass,
    status: isSpecial ? state.toUpperCase() : score === null ? 'NOT ENTERED' : pass === null ? 'RECORDED' : score >= pass ? 'PASS' : 'FAIL',
  }
}
export const registerSummary = (rows, exam) => {
  const studentKeys = new Set(rows.map(row => String(row.student_id)))
  const entered = rows.filter(row => registerScoreInfo(row, exam).score !== null).length
  return { records: rows.length, students: studentKeys.size, entered, pending: rows.length - entered }
}
export const escapeRegisterHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]))

// A correction is explicitly scoped to an existing saved row. Never use an
// unrecorded student/subject or guess a maximum to create a new mark here.
export const registerRowKey = row => [row?.exam_id, row?.student_id, String(row?.subject ?? '').trim().toLowerCase()].join('::')

export function registerEditGuard(row, exam, value) {
  if (!row || !exam || !Number.isSafeInteger(Number(exam.id)) || Number(exam.id) <= 0 ||
      Number(row.exam_id) !== Number(exam.id) ||
      !Number.isSafeInteger(Number(row.student_id)) || Number(row.student_id) <= 0 ||
      !String(row.subject ?? '').trim()) {
    return { error: 'Record identity is invalid. Refresh the examination register.' }
  }
  const storedTotal = row.total_marks
  if (!hasSavedScore(storedTotal) || Number(storedTotal) <= 0) {
    return { error: 'Saved subject maximum is missing. Resolve its policy before editing.' }
  }
  const policy = resolveRegisterOffering(exam, row)
  if (policy && Number(policy.total_marks) !== Number(storedTotal)) {
    return { error: 'Saved maximum differs from approved subject policy. Editing is locked until they are reconciled.' }
  }
  if (registerScoreInfo(row, exam).score === null) {
    return { error: 'Only existing numeric saved marks can be corrected here.' }
  }
  const text = String(value ?? '').trim()
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(text)) {
    return { error: 'Enter a non-negative number with up to two decimal places.' }
  }
  const next = Number(text)
  if (!Number.isFinite(next) || next > Number(storedTotal)) {
    return { error: `Obtained marks must be between 0 and ${storedTotal}.` }
  }
  return {
    error: '',
    value: next,
    payload: {
      exam_id: Number(row.exam_id), student_id: Number(row.student_id),
      subject: String(row.subject).trim(),
      marks_obtained: next, total_marks: Number(storedTotal),
    },
  }
}

// Refresh immediately before an edit, and reject unexpected server changes.
// This is optimistic preflight protection, NOT a database-atomic CAS lock.
export function registerSnapshotMatches(original, latest) {
  if (!original || !latest || registerRowKey(original) !== registerRowKey(latest)) return false
  if (original.id != null && latest.id != null && String(original.id) !== String(latest.id)) return false
  const matchNumber = (a, b) => a == null ? b == null : b != null && Number(a) === Number(b)
  if (!matchNumber(original.marks_obtained, latest.marks_obtained) ||
      !matchNumber(original.total_marks, latest.total_marks)) return false
  if (String(original.result_state ?? original.status ?? '') !== String(latest.result_state ?? latest.status ?? '')) return false
  if (original.updated_at && latest.updated_at && String(original.updated_at) !== String(latest.updated_at)) return false
  if (original.grade != null && latest.grade != null && String(original.grade) !== String(latest.grade)) return false
  if (original.school_id != null && latest.school_id != null && String(original.school_id) !== String(latest.school_id)) return false
  return true
}

export function orderRegisterRows(rows, mode = 'class') {
  const list = [...(Array.isArray(rows) ? rows : [])]
  const original = registerFilterRows(list)
  const byKey = (a,b) => {
    const x = String(a.gr_number || a.roll_number || '').trim()
    const y = String(b.gr_number || b.roll_number || '').trim()
    return x.localeCompare(y,undefined,{numeric:true})
  }
  if (mode === 'gr') return original.sort((a,b)=>byKey(a,b) || norm(a.name || a.student_name).localeCompare(norm(b.name || b.student_name)))
  if (mode === 'high' || mode === 'low') return original.sort((a,b) => {
    const x = hasSavedScore(a.marks_obtained) && hasSavedScore(a.total_marks) && Number(a.total_marks)>0 ? Number(a.marks_obtained)/Number(a.total_marks) : null
    const y = hasSavedScore(b.marks_obtained) && hasSavedScore(b.total_marks) && Number(b.total_marks)>0 ? Number(b.marks_obtained)/Number(b.total_marks) : null
    return (x===null ? 1 : y===null ? -1 : mode === 'high' ? y-x : x-y) || byKey(a,b)
  })
  if (mode === 'subject') return original.sort((a,b)=>norm(a.subject).localeCompare(norm(b.subject)) || byKey(a,b))
  // Default school register: class → section → GR/roll → student → subject
  return original.sort((a,b) =>
    normalizeMarksClass(a.student_class ?? a.class).localeCompare(normalizeMarksClass(b.student_class ?? b.class),undefined,{numeric:true}) ||
    norm(a.student_section ?? a.section).localeCompare(norm(b.student_section ?? b.section)) ||
    byKey(a,b) ||
    norm(a.name ?? a.student_name).localeCompare(norm(b.name ?? b.student_name)) ||
    norm(a.subject).localeCompare(norm(b.subject)))
}
