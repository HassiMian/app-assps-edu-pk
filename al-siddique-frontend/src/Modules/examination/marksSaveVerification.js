/** Verify an exact independent exam result reload before showing Saved. */
export function areExamMarksVerified(requested = [], fetched = []) {
  if (!Array.isArray(requested) || !requested.length || !Array.isArray(fetched)) return false
  const saved = new Map(fetched.map(row => [
    `${Number(row.exam_id)}|${Number(row.student_id)}|${String(row.subject || '').trim()}`, row
  ]))
  return requested.every(row => {
    const actual = saved.get(`${Number(row.exam_id)}|${Number(row.student_id)}|${String(row.subject || '').trim()}`)
    if (!actual) return false
    // Empty/NULL is NOT the genuine numeric zero, even though Number(null)=0.
    if (actual.marks_obtained == null || actual.marks_obtained === '' || actual.total_marks == null || actual.total_marks === '') return false
    if (row.marks_obtained == null || row.marks_obtained === '' || row.total_marks == null || row.total_marks === '') return false
    if (!Number.isFinite(Number(actual.marks_obtained)) || !Number.isFinite(Number(actual.total_marks))) return false
    if (Number(actual.marks_obtained) !== Number(row.marks_obtained) || Number(actual.total_marks) !== Number(row.total_marks)) return false
    return String(actual.result_status || 'SCORED').toUpperCase() === String(row.result_status || 'SCORED').toUpperCase()
  })
}
