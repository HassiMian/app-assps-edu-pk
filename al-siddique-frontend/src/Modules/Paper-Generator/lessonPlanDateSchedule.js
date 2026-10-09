// Calendar-date-only scheduling. These are teacher-picked school days, NOT instants.
// UTC getters/setters prevent the viewer's laptop timezone/DST from shifting days.
const iso = date => date.toISOString().slice(0, 10)

export function buildPlanDates(startDate, scope, count) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(startDate || ''))
  if (!match) return []
  const year = Number(match[1]), month = Number(match[2]) - 1, day = Number(match[3])
  const first = new Date(Date.UTC(year, month, day, 12))
  if (first.getUTCFullYear() !== year || first.getUTCMonth() !== month || first.getUTCDate() !== day) return []
  const quantity = scope === 'annual' ? 12 : Math.min(365, Math.max(0, Math.trunc(Number(count) || 0)))
  if (scope === 'monthly' || scope === 'annual') {
    return Array.from({length:quantity}, (_, index) => {
      const firstOfTarget = new Date(Date.UTC(year, month + index, 1, 12))
      const lastDayOfTarget = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0, 12)).getUTCDate()
      return iso(new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), Math.min(day, lastDayOfTarget), 12)))
    })
  }
  const dates = []
  const needed = scope === 'daily' ? quantity * 5 : quantity
  const cursor = new Date(first)
  for (let scanned = 0; dates.length < needed && scanned < 370; scanned++) {
    const weekday = cursor.getUTCDay()
    if (scope === 'daily' ? weekday >= 1 && weekday <= 5 : weekday === 1) dates.push(iso(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}
