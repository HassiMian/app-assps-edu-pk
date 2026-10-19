/**
 * Core-owned timetable client contract. The server remains the authority for
 * school actor, approved source, staff identity and conflict-free transaction.
 * Each invocation may mutate EXACTLY ONE reviewed eight-period day.
 */
const DAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
const HASH = /^[a-f0-9]{64}$/
const PERIOD = /^Period ([1-8])$/
const requireField = (value, code) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code)
  return value.trim()
}
const teacherId = value => {
  const str = String(value ?? '')
  const n = Number(str)
  if (!/^[1-9]\d*$/.test(str) || !Number.isSafeInteger(n)) throw new Error('TIMETABLE_TEACHER_REQUIRED')
  return n
}

export function buildGuardedDayPayload({ schoolClass, section, day, assignments, bells, snapshot, numPeriods = 8 }) {
  const className = requireField(schoolClass, 'TIMETABLE_CLASS_REQUIRED')
  if (className.toLowerCase() === 'school-wide') throw new Error('TIMETABLE_SCHOOLWIDE_READ_ONLY')
  const scopedSection = requireField(section, 'TIMETABLE_SECTION_REQUIRED')
  if (!DAYS.has(day) || numPeriods !== 8) throw new Error('TIMETABLE_REVIEWED_EIGHT_PERIOD_DAY_REQUIRED')
  if (!bells || bells.school_id !== 1 || !bells.version || !bells.academic_session) {
    throw new Error('TIMETABLE_VERIFIED_BELLS_UNAVAILABLE')
  }
  if (!snapshot || !HASH.test(snapshot.expected_snapshot_sha256 || '') ||
      !Array.isArray(snapshot.entries) || snapshot.entries.length !== 8) {
    throw new Error('TIMETABLE_VERIFIED_SNAPSHOT_REQUIRED')
  }
  const originals = new Map()
  for (const entry of snapshot.entries) {
    if (!PERIOD.test(entry?.period_label || '') || originals.has(entry.period_label)) {
      throw new Error('TIMETABLE_SNAPSHOT_PERIODS_INVALID')
    }
    originals.set(entry.period_label, entry)
  }
  const source = snapshot.entries[0]?.source_sha256
  if (!HASH.test(source || '') || !snapshot.entries.every(e =>
      e.source_sha256 === source && e.staff_identity_reviewed === true)) {
    throw new Error('TIMETABLE_SOURCE_NOT_INDEPENDENTLY_REVIEWED')
  }
  const slots = (day === 'Friday' ? bells.friday : bells.regular)
  if (!Array.isArray(slots)) throw new Error('TIMETABLE_OFFICIAL_PERIODS_MISSING')
  const official = slots.filter(s => PERIOD.test(s?.label || ''))
  if (official.length !== 8 || new Set(official.map(s => s.label)).size !== 8) {
    throw new Error('TIMETABLE_OFFICIAL_PERIODS_INVALID')
  }
  const entries = Array.from({length: 8}, (_, i) => {
    const label = 'Period ' + (i + 1)
    const slot = official.find(s => s.label === label)
    const original = originals.get(label)
    const edited = assignments?.[day]?.[label]
    if (!slot || !original || !edited) throw new Error('TIMETABLE_PERIOD_INCOMPLETE')
    // Never transmit the UI's potentially stale/edited time; the official
    // versioned school bells are the only trusted time source.
    const teacher = teacherId(edited.teacher_id)
    const subject = requireField(edited.subject, 'TIMETABLE_SUBJECT_REQUIRED')
    const displayName = requireField(edited.teacher, 'TIMETABLE_TEACHER_NAME_REQUIRED')
    if (!Object.prototype.hasOwnProperty.call(original, 'room') ||
        (original.room !== null && (typeof original.room !== 'string' || original.room.length > 120))) {
      throw new Error('TIMETABLE_ROOM_SNAPSHOT_REQUIRED')
    }
    return {
      period_label: label,
      start_time: requireField(slot.start, 'TIMETABLE_START_REQUIRED'),
      end_time: requireField(slot.end, 'TIMETABLE_END_REQUIRED'),
      teacher_id: teacher,
      teacher_display_name: displayName,
      subject,
      room: original.room
    }
  })
  return {
    class_name: className,
    section: scopedSection,
    day_name: day,
    academic_session: bells.academic_session,
    schedule_version: bells.version,
    expected_snapshot_sha256: snapshot.expected_snapshot_sha256,
    source_sha256: source,
    entries
  }
}

export async function submitGuardedDay({ api, schoolClass, section, day, assignments, numPeriods }) {
  // Both read endpoints are actor- and tenant-scoped; a missing/erroring
  // snapshot MUST NOT fall back to legacy bulk /save semantics.
  const bellResponse = await api.get('/api/timetable/bells')
  if (bellResponse?.data?.success !== true) throw new Error('TIMETABLE_BELLS_NOT_VERIFIED')
  const bells = bellResponse.data.data
  const snapshotResponse = await api.get('/api/timetable/snapshot', {
    params: {class_name: schoolClass, section, day_name: day, academic_session: bells?.academic_session}
  })
  if (snapshotResponse?.data?.success !== true) throw new Error('TIMETABLE_SNAPSHOT_NOT_VERIFIED')
  const payload = buildGuardedDayPayload({
    schoolClass, section, day, assignments, numPeriods,
    bells, snapshot: snapshotResponse.data
  })
  return api.post('/api/timetable/save', payload)
}
