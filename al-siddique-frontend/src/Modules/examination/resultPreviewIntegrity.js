// Result preview totals must not interpret a missing mark as a scored zero.
// Pure reducer: no student database reads or mutation.
export function summarizeResultRows(rows = [], exam = {}) {
  let obtained = 0
  let possible = 0
  let recorded = 0
  let pending = 0
  for (const row of Array.isArray(rows) ? rows : []) {
    const raw = row?.marks_obtained
    const score = raw === undefined || raw === null || raw === '' ? null : Number(raw)
    const limitRaw = row?.total_marks ?? exam?.total_marks
    const limit = limitRaw === undefined || limitRaw === null || limitRaw === '' ? NaN : Number(limitRaw)
    if (score === null || !Number.isFinite(score) || !Number.isFinite(limit) || limit <= 0 || score < 0 || score > limit) {
      pending += 1
      continue
    }
    recorded += 1
    obtained += score
    possible += limit
  }
  return { obtained, possible, recorded, pending, percentage: possible > 0 ? Math.round(obtained * 100 / possible) : null }
}

export function formatResultCell(value, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

export function meetsResultPassMark(mark, passMark) {
  if (mark === null || mark === undefined || mark === '' || passMark === null || passMark === undefined || passMark === '') return null
  const score = Number(mark)
  const threshold = Number(passMark)
  if (!Number.isFinite(score) || !Number.isFinite(threshold) || threshold < 0) return null
  return score >= threshold
}
