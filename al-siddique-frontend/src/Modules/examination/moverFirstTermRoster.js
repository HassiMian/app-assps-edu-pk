import { OFFICIAL_FIRST_TERM_SUBJECTS_2026 } from './officialFirstTerm2026Subjects.js'
import { schoolClassOrderKey } from '../../services/schoolClassOrder.js'

const MOVER_SUBJECTS = new Set(OFFICIAL_FIRST_TERM_SUBJECTS_2026.Mover.map(name => name.toLowerCase()))
const MOVER_MAXIMUM = new Map(OFFICIAL_FIRST_TERM_SUBJECTS_2026.Mover.map(name =>
  [name.toLowerCase(), name.endsWith('Written') ? 50 : 25]
))

/** Read-only projection for ASSPS exam 9; never deletes or rewrites original marks. */
export function projectMoverFirstTermRows(rows = [], students = [], exam = {}) {
  if (Number(exam?.id) !== 9 || Number(exam?.school_id) !== 1) return { rows, excluded: [] }
  const moverIds = new Set(students.filter(student =>
    schoolClassOrderKey(student.className || student.class) === 'mover'
  ).map(student => String(student.id)))
  const accepted = []
  const excluded = []
  for (const row of rows) {
    if (!moverIds.has(String(row.student_id))) { accepted.push(row); continue }
    const subject = String(row.subject || row.subjectName || '').trim().toLowerCase()
    const maximum = Number(row.total_marks)
    if (MOVER_SUBJECTS.has(subject) && maximum === MOVER_MAXIMUM.get(subject)) {
      accepted.push(row)
    } else {
      excluded.push({ studentId: String(row.student_id), subject: row.subject,
        maximum: row.total_marks, reason: 'OUTSIDE_APPROVED_MOVER_FIRST_TERM_ROSTER' })
    }
  }
  return { rows: accepted, excluded }
}
