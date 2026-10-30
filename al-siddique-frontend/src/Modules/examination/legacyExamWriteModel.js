// The legacy ExaminationModule must never convert an untouched mark to zero.
// Explicit numeric 0 is a valid recorded score; absent input is PENDING.
export function buildEnteredMarkRows({examId, students, subjects, marks, totalMarks}) {
  const exam = Number(examId)
  const maximum = Number(totalMarks)
  if (!Number.isSafeInteger(exam) || exam <= 0 || !Number.isFinite(maximum) || maximum <= 0)
    throw new Error('Select a saved exam with valid total marks.')
  const rows = []
  for (const student of students || []) {
    const studentId = Number(student?.id)
    if (!Number.isSafeInteger(studentId) || studentId <= 0)
      throw new Error('Student identity is missing or invalid; nothing was saved.')
    for (const subject of subjects || []) {
      const raw = marks?.[studentId]?.[subject]
      if (raw === null || raw === undefined || String(raw).trim() === '') continue
      const value = String(raw).trim()
      // Reject NaN, Infinity, signs, exponent notation and browser coercion.
      if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) throw new Error('Enter valid marks; blank means pending.')
      const numeric = Number(value)
      if (!Number.isFinite(numeric) || numeric > maximum)
        throw new Error('Marks must not exceed the selected exam maximum.')
      rows.push({exam_id:exam,student_id:studentId,subject,marks_obtained:numeric,total_marks:maximum})
    }
  }
  return rows
}

export function assertCreatedExam(response) {
  if (response?.data?.success !== true || !Number.isSafeInteger(Number(response?.data?.data?.id)) || Number(response.data.data.id) <= 0)
    throw new Error('Server did not confirm the new exam. Refresh instead of submitting a duplicate.')
  return response.data.data
}
