/**
 * Result-card position preflight. Never rank unlike subject/maximum rosters.
 * Does not infer missing marks as zero and does not mutate exam records.
 */
export function auditClassPositions(rows = [], students = [], { classKey = value => String(value || '').toLowerCase().trim(), excludeSubject = () => false } = {}) {
  const ranks = new Map()
  const issues = new Map()
  const entries = new Map()
  for (const student of students) {
    const id = String(student?.id ?? '')
    if (!id) continue
    entries.set(id, { id, className: classKey(student.className || student.class), subjects: [], obtained: 0, complete: true })
  }
  for (const row of rows) {
    if (excludeSubject(row?.subject || row?.subjectName)) continue
    const entry = entries.get(String(row?.student_id ?? ''))
    if (!entry) continue
    const subject = String(row.subject || row.subjectName || '').trim().toLowerCase()
    const possible = row.total_marks === '' || row.total_marks == null ? NaN : Number(row.total_marks)
    const raw = row.marks_obtained
    const obtained = raw === '' || raw == null ? NaN : Number(raw)
    const scored = !row.result_status || String(row.result_status).trim().toUpperCase() === 'SCORED'
    if (!subject || !Number.isFinite(possible) || possible <= 0 || !scored || !Number.isFinite(obtained) || obtained < 0 || obtained > possible) {
      entry.complete = false
    }
    entry.subjects.push(`${subject}:${possible}`)
    if (Number.isFinite(obtained) && obtained >= 0) entry.obtained += obtained
  }
  const groups = new Map()
  for (const entry of entries.values()) {
    if (!entry.subjects.length) continue
    if (!groups.has(entry.className)) groups.set(entry.className, [])
    groups.get(entry.className).push(entry)
  }
  const ordinal = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`
  for (const [key, group] of groups.entries()) {
    const signatures = group.map(entry => entry.subjects.slice().sort().join('|'))
    const reference = signatures[0]
    const reasons = []
    if (group.some((entry, index) => !entry.complete || new Set(entry.subjects).size !== entry.subjects.length || signatures[index] !== reference)) {
      reasons.push('Different, incomplete or invalid subject/maximum-mark records in the class')
    }
    if (reasons.length) {
      issues.set(key, { className: key, students: group.length, message: reasons.join('; ') })
      continue // Position is explicitly UNVERIFIED; never silently pick a rank.
    }
    const ordered = [...group].sort((a,b) => b.obtained - a.obtained || a.id.localeCompare(b.id))
    let currentRank = 1
    ordered.forEach((entry, index) => {
      if (index && entry.obtained < ordered[index - 1].obtained) currentRank = index + 1
      ranks.set(entry.id, ordinal(currentRank))
    })
  }
  return { ranks, issues }
}
