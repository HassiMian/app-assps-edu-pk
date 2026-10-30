// Pure rules shared by the assessment UI and its regression tests.
// Session choice must be made in application state, not left to a browser's
// visually selected first <option> while React still holds an empty value.
export function resolveExamSession(current, active, exams = []) {
  const chosen = String(current || '').trim()
  if (chosen) return chosen
  const configured = String(active || '').trim()
  if (configured) return configured
  // Preserve historical session labels; never rewrite persisted exam records.
  const existing = exams.map(exam => String(exam?.session || '').trim()).filter(Boolean)
  return [...new Set(existing)].sort((a, b) => {
    const yearA = Number(a.slice(0, 4))
    const yearB = Number(b.slice(0, 4))
    return (yearB - yearA) || (b.length - a.length) || b.localeCompare(a)
  })[0] || ''
}

export function validateExamCreation(form) {
  if (!String(form.name || '').trim()) return 'Enter an exam name.'
  if (!String(form.session || '').trim()) return 'Select an academic session.'
  if (!String(form.class || '').trim()) return 'Select a class.'
  const totalText = String(form.total_marks ?? '').trim()
  const passingText = String(form.pass_marks ?? '').trim()
  // Reject blank and numeric coercion artifacts before attempting a write.
  if (!totalText || !passingText || !/^\d+(?:\.\d+)?$/.test(totalText) || !/^\d+(?:\.\d+)?$/.test(passingText))
    return 'Enter valid total marks and passing marks.'
  const total = Number(totalText)
  const passing = Number(passingText)
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(passing) || total <= 0 || passing > total)
    return 'Use whole-number marks: total above zero, passing between zero and total.'
  return ''
}

export function nextAssessmentName(name) {
  const match = /^Assessment\s+(\d+)$/i.exec(String(name || '').trim())
  return match ? `Assessment ${Number(match[1]) + 1}` : ''
}
