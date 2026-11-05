// Read-only Marks Review exam selection. Do not default to an empty newest
// Assessment while older historical marks exist; do not create or edit exams.
// The server must supply tenant-scoped saved-result counts explicitly.
export function selectDefaultMarksReviewExam(exams = []) {
  if (!Array.isArray(exams)) return null
  const candidates = exams.filter(exam => exam && Number.isSafeInteger(Number(exam.id)) && Number(exam.id) > 0)
  const withScores = candidates.find(exam => Number(exam.saved_scored_count) > 0)
  if (withScores) return withScores
  const withPendingRows = candidates.find(exam => Number(exam.saved_result_count) > 0)
  return withPendingRows || candidates.find(exam => /\bfirst\s+term\b/i.test(String(exam.name || ''))) || candidates[0] || null
}
