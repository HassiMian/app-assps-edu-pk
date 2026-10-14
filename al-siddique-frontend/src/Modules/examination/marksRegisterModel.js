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
