// Pure session resolution shared by the editor and its regression tests.
export const FIRST_TERM_RECOVERY_SESSION = '2026-2027'

export function normalizeAcademicSession(raw) {
  const value = String(raw ?? '').trim()
  const matched = /^(\d{4})\s*[-–/]\s*(\d{2}|\d{4})$/.exec(value)
  if (!matched) return ''
  const year = Number(matched[1])
  const end = matched[2].length === 2
    ? Math.floor(year / 100) * 100 + Number(matched[2])
    : Number(matched[2])
  return end === year + 1 ? `${year}-${end}` : ''
}

export function pickDateSheetSession(academicSession, paperSession, savedRows = []) {
  const preferred = [normalizeAcademicSession(academicSession), normalizeAcademicSession(paperSession)]
    .filter(Boolean)
  const saved = [...new Set((Array.isArray(savedRows) ? savedRows : [])
    .map(row => normalizeAcademicSession(row?.session)).filter(Boolean))].sort().reverse()
  return preferred.find(value => saved.includes(value)) || saved[0] ||
    preferred[0] || FIRST_TERM_RECOVERY_SESSION
}

export function dateSheetSessionOptions(savedRows, academicSession, paperSession, editSession, printSession) {
  return [...new Set([
    FIRST_TERM_RECOVERY_SESSION,
    '2027-2028',
    normalizeAcademicSession(academicSession),
    normalizeAcademicSession(paperSession),
    normalizeAcademicSession(editSession),
    normalizeAcademicSession(printSession),
    ...(Array.isArray(savedRows) ? savedRows.map(row => normalizeAcademicSession(row?.session)) : []),
  ].filter(Boolean))].sort()
}
