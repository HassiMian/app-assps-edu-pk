export const FINAL_EXAM_SESSION = '2026-2027'
export const FINAL_EXAM_TERM = 'First Term Exam'
export const FINAL_EXAM_SEED_KEY = 'al_siddique_date_sheets_first_term_exam_2026_2027_seed'
export const FINAL_EXAM_SEED_VERSION = 'assps-first-term-exam-2026-2027-v3'
export const FINAL_EXAM_PAPER_TIME = '10:00 AM - 12:00 PM'

const LEGACY_MISTAKEN_SEED_VERSIONS = [
  'assps-final-exam-2026-2027-v1',
  'assps-first-term-exam-2026-2027-v1',
  'assps-first-term-exam-2026-2027-v2',
]

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const REQUIRED_DATES = [
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
  '2026-10-08',
  '2026-10-09',
  '2026-10-10',
]

const EXAM_CLASSES = ['starter', 'mover', 'flyer', '1', '2', '3', '4', '5', '6', '7', '8']
const FORBIDDEN_CLASSES = new Set(['pre-nine', 'nine', '9', 'hifaz', 'hifaz class'])
const FORBIDDEN_DATES = new Set(['2026-10-04'])
const FORBIDDEN_SUBJECT_LABELS = ['holiday', 'preparation holiday', 'off', 'no paper', 'sunday']

const MATRIX = {
  '2026-09-28': {
    starter: 'English Written',
    mover: 'English Written',
    flyer: 'English Written',
    1: 'English',
    3: 'English',
    5: 'English',
    7: 'English',
  },
  '2026-09-29': {
    2: 'English',
    4: 'English',
    6: 'English A',
    8: 'English',
  },
  '2026-09-30': {
    starter: 'Mathematics Written',
    mover: 'Mathematics Written',
    flyer: 'Mathematics Written',
    1: 'Mathematics',
    3: 'Mathematics',
    5: 'Mathematics',
    7: 'Mathematics',
  },
  '2026-10-01': {
    2: 'Mathematics',
    4: 'Mathematics',
    6: 'Mathematics',
    8: 'Mathematics',
  },
  '2026-10-02': {
    starter: 'Urdu Written',
    mover: 'Urdu Written',
    flyer: 'Urdu Written',
    1: 'Urdu',
    3: 'Urdu',
    5: 'Urdu',
    7: 'Urdu',
  },
  '2026-10-03': {
    2: 'Urdu',
    4: 'Urdu',
    6: 'Urdu',
    7: 'Science',
    8: 'Urdu',
  },
  '2026-10-05': {
    starter: 'English Oral',
    mover: 'English Oral',
    flyer: 'English Oral',
    1: 'Science',
    3: 'Science',
    5: 'Science',
    6: 'Science',
    7: 'Social Studies',
  },
  '2026-10-06': {
    2: 'Science',
    4: 'Science',
    6: 'English B',
    8: 'Science',
  },
  '2026-10-07': {
    starter: 'Mathematics Oral',
    mover: 'Mathematics Oral',
    flyer: 'Mathematics Oral',
    1: 'Islamiyat',
    3: 'General Knowledge Written',
    5: 'Social Studies',
    7: 'English B',
    8: 'Computer',
  },
  '2026-10-08': {
    2: 'Islamiyat',
    4: 'Social Studies',
    6: 'Social Studies',
    7: 'Islamiyat',
  },
  '2026-10-09': {
    starter: 'Urdu Oral',
    mover: 'Urdu Oral',
    flyer: 'Urdu Oral',
    1: 'Quran / Nazra',
    3: 'Islamiyat',
    4: 'Islamiyat',
    5: 'Islamiyat',
    6: 'Islamiyat',
    8: 'Islamiyat',
  },
  '2026-10-10': {
    starter: 'General Knowledge Oral',
    mover: 'General Knowledge Oral',
    flyer: 'General Knowledge Oral',
    2: 'Quran / Nazra',
    3: 'Quran / Nazra',
    4: 'Quran / Nazra',
    5: 'Quran / Nazra',
    6: 'Quran / Nazra',
    7: 'Quran / Nazra',
    8: 'Quran / Nazra',
  },
}

function dayName(date) {
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? '' : DAYS[parsed.getDay()]
}

function buildFinalExamRows() {
  return REQUIRED_DATES.flatMap((date) =>
    EXAM_CLASSES.flatMap((classLevel) => {
      const subject = MATRIX[date]?.[classLevel]
      if (!subject) return []
      return [{
        id: `${FINAL_EXAM_SEED_VERSION}-${classLevel}-${date}`,
        session: FINAL_EXAM_SESSION,
        term: FINAL_EXAM_TERM,
        class: classLevel,
        section: '',
        date,
        day: dayName(date),
        times: [FINAL_EXAM_PAPER_TIME, '', ''],
        subjects: [subject],
      }]
    })
  )
}

function isManagedSeedRow(row) {
  const id = String(row?.id || '')
  return [FINAL_EXAM_SEED_VERSION, ...LEGACY_MISTAKEN_SEED_VERSIONS]
    .some(version => id.startsWith(`${version}-`))
}

export function validateFinalExamRows(rows = []) {
  const issues = []
  const finalRows = rows.filter(row => row.session === FINAL_EXAM_SESSION && row.term === FINAL_EXAM_TERM)

  finalRows.forEach((row) => {
    const classLevel = String(row.class || '').toLowerCase()
    const date = String(row.date || '')
    const subjects = Array.isArray(row.subjects) ? row.subjects : []
    if (FORBIDDEN_CLASSES.has(classLevel)) issues.push(`Forbidden class found: ${row.class}`)
    if (FORBIDDEN_DATES.has(date)) issues.push(`Forbidden date found: ${date}`)
    if (dayName(date) === 'Sunday') issues.push(`Sunday exam found: ${date}`)
    subjects.forEach((subject) => {
      if (FORBIDDEN_SUBJECT_LABELS.includes(String(subject || '').trim().toLowerCase())) {
        issues.push(`Fake non-paper subject found: ${subject}`)
      }
    })
  })

  const uniqueKeys = new Set(finalRows.map(row => `${row.class}|${row.section || ''}|${row.date}`))
  if (uniqueKeys.size !== finalRows.length) issues.push('Duplicate class/date row found')

  const requiredRows = buildFinalExamRows()
  if (finalRows.length !== requiredRows.length) {
    issues.push(`Expected ${requiredRows.length} first term exam rows, found ${finalRows.length}`)
  }

  requiredRows.forEach((expected) => {
    const actual = finalRows.find(row =>
      String(row.class) === expected.class &&
      String(row.section || '') === '' &&
      String(row.date) === expected.date
    )
    const subject = actual?.subjects?.[0]
    if (!actual) {
      issues.push(`Missing ${expected.class} on ${expected.date}`)
    } else if (subject !== expected.subjects[0]) {
      issues.push(`Subject mismatch for ${expected.class} on ${expected.date}: ${subject || '<blank>'}`)
    } else if (!(Array.isArray(actual.times) && actual.times.map(time => String(time || '').trim()).includes(FINAL_EXAM_PAPER_TIME))) {
      issues.push(`Time mismatch for ${expected.class} on ${expected.date}: expected ${FINAL_EXAM_PAPER_TIME}`)
    }
  })

  return issues
}

export function mergeFinalExamRows(existingRows = []) {
  const safeRows = Array.isArray(existingRows) ? existingRows : []
  const keptRows = safeRows.filter(row =>
    !isManagedSeedRow(row) &&
    !(row.session === FINAL_EXAM_SESSION && row.term === FINAL_EXAM_TERM)
  )
  return [...keptRows, ...buildFinalExamRows()]
}
