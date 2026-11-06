// Exam Management readiness is a visual gate only. Every actual marks write
// must still pass the authenticated backend's approved-subject/tenant checks.
export function examMarksUiAction(exam) {
  const type = String(exam?.type || '').trim()
  if (type !== 'AS' && type !== 'Assessment') return {
    canEnter: true,
    actionLabel: 'Enter Marks',
    message: '',
  }
  const offerings = exam?.subject_offerings
  if (!Array.isArray(offerings)) return {
    canEnter: false,
    actionLabel: 'Marks Locked',
    message: 'Approved subject catalog not verified. Review the Assessment before marks entry.',
  }
  const usable = offerings.filter(row =>
    row && String(row.subject || '').trim() && String(row.class_name || '').trim() &&
    String(row.section || '').trim() && Number.isSafeInteger(row.total_marks) &&
    Number.isSafeInteger(row.pass_marks) && row.total_marks > 0 &&
    row.pass_marks >= 0 && row.pass_marks <= row.total_marks
  )
  // Server returns ONLY approved Assessment offerings for include_subjects=1;
  // never infer approval from Academic Setup or unscoped teacher assignments.
  if (!usable.length) return {
    canEnter: false,
    actionLabel: 'Marks Locked',
    message: 'No signed and approved subject offerings are available for this Assessment.',
  }
  return {
    canEnter: true,
    actionLabel: 'Enter Approved Marks',
    message: `Only ${usable.length} verified class-section subject offering(s) are eligible. Other subjects remain blocked.`,
  }
}
