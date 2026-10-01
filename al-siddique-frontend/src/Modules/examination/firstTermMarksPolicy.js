export const DEFAULT_PASS_PERCENT = 33

export function isOfficialFirstTermExam(exam) {
  return Number(exam?.id) === 9
    && Number(exam?.school_id) === 1
    && String(exam?.name || '').trim().toLowerCase() === 'first term exam'
    && String(exam?.session || '').trim() === '2026-2027'
}

export function requiredFirstTermPassMarks(total, percent = DEFAULT_PASS_PERCENT) {
  const value = Number(total)
  const rate = Number(percent)
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(rate) || rate < 1 || rate > 100) return null
  return Math.ceil((value * rate) / 100)
}
