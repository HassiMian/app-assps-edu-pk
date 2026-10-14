export const DEFAULT_REQUESTED_PASS_PERCENT = 40

export function classPassingThreshold({totalMarks, mode, value}) {
  if (String(totalMarks ?? '').trim() === '' || String(value ?? '').trim() === '') return null
  const total = Number(totalMarks), n = Number(value)
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(n)) return null
  if (mode === 'percentage' && n >= 0 && n <= 100)
    return {total, percentage: n, marks: Number((total * n / 100).toFixed(4))}
  if (mode === 'marks' && n >= 0 && n <= total)
    return {total, percentage: Number((n * 100 / total).toFixed(4)), marks: n}
  return null
}
