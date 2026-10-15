// ASSPS cross-mode subject heading controls.
// Versioned, pure and compatible with previously saved V3 layoutSettings.
// Product owner: Paper Studio. Shared contract: Diary / Term / Week / Day.
export const SUBJECT_SIZE_MIN = 10
export const SUBJECT_SIZE_MAX = 23
export const SUBJECT_SIZE_DEFAULT = 14

export function normalizeSubjectTypography(design = {}) {
  const raw = Number(design.subjectNameSize)
  const size = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : SUBJECT_SIZE_DEFAULT
  return {
    subjectNameSize: Math.max(SUBJECT_SIZE_MIN, Math.min(SUBJECT_SIZE_MAX, size)),
    // Original V3 class paper subjects were bold, therefore missing old value
    // means bold, not false. An explicit false from new controls is retained.
    subjectNameBold: design.subjectNameBold !== false
  }
}

export function changeSubjectTypography(design = {}, action) {
  const next = normalizeSubjectTypography(design)
  if (action === 'smaller') next.subjectNameSize = Math.max(SUBJECT_SIZE_MIN, next.subjectNameSize - 1)
  if (action === 'larger') next.subjectNameSize = Math.min(SUBJECT_SIZE_MAX, next.subjectNameSize + 1)
  if (action === 'toggleBold') next.subjectNameBold = !next.subjectNameBold
  return { ...design, ...next }
}
