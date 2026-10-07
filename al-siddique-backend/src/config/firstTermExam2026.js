const SESSION = '2026-2027'
const NAME = 'First Term Exam'
const TYPE = 'TE'
const PAPER_TIME = '10:00 AM - 12:00 PM'
const START_DATE = '2026-09-28'
const END_DATE = '2026-10-10'

const CLASS_LEVEL_TO_NAME = {
  starter: 'Starter',
  mover: 'Mover',
  flyer: 'Flyer',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
}

const MATRIX = {
  '2026-09-28': { starter:'English Written', mover:'English Written', flyer:'English Written', '1':'English', '3':'English', '5':'English', '7':'English' },
  '2026-09-29': { '2':'English', '4':'English', '6':'English', '8':'English' },
  '2026-09-30': { starter:'Mathematics Written', mover:'Mathematics Written', flyer:'Mathematics Written', '1':'Mathematics', '3':'Mathematics', '5':'Mathematics', '7':'Mathematics' },
  '2026-10-01': { '2':'Mathematics', '4':'Mathematics', '6':'Mathematics', '8':'Mathematics' },
  '2026-10-02': { starter:'Urdu Written', mover:'Urdu Written', flyer:'Urdu Written', '1':'Urdu', '3':'Urdu', '5':'Urdu', '7':'Urdu' },
  '2026-10-03': { '2':'Urdu', '4':'Urdu', '6':'Urdu', '8':'Urdu' },
  '2026-10-05': { starter:'English Oral', mover:'English Oral', flyer:'English Oral', '1':'Science', '3':'Science', '5':'Science', '7':'Science' },
  '2026-10-06': { '2':'Science', '4':'Science', '6':'Science', '8':'Science' },
  '2026-10-07': { starter:'Mathematics Oral', mover:'Mathematics Oral', flyer:'Mathematics Oral', '1':'Islamiyat', '3':'General Knowledge Written', '5':'Social Studies', '7':'Social Studies', '8':'Computer' },
  '2026-10-08': { '2':'Islamiyat', '4':'Social Studies', '6':'Social Studies' },
  '2026-10-09': { starter:'Urdu Oral', mover:'Urdu Oral', flyer:'Urdu Oral', '1':'Quran / Nazra', '3':'Islamiyat', '4':'Islamiyat', '5':'Islamiyat', '6':'Islamiyat', '7':'Islamiyat', '8':'Islamiyat' },
  '2026-10-10': { starter:'General Knowledge Oral', mover:'General Knowledge Oral', flyer:'General Knowledge Oral', '2':'Quran / Nazra', '3':'Quran / Nazra', '4':'Quran / Nazra', '5':'Quran / Nazra', '6':'Quran / Nazra', '7':'Quran / Nazra', '8':'Quran / Nazra' },
}

const CLASS_ALIASES = {
  Starter: ['Starter', 'starter', 'Playgroup', 'Play Group', 'PG', 'سٹاٹر'],
  Mover: ['Mover', 'mover', 'Nursery'],
  Flyer: ['Flyer', 'flyer', 'Prep', 'KG'],
  One: ['One', 'one', '1', 'Class 1'],
  Two: ['Two', 'two', '2', 'Class 2'],
  Three: ['Three', 'three', '3', 'Class 3'],
  Four: ['Four', 'four', '4', 'Class 4'],
  Five: ['Five', 'five', '5', 'Class 5'],
  Six: ['Six', 'six', '6', 'Class 6'],
  Seven: ['Seven', 'seven', '7', 'Class 7'],
  Eight: ['Eight', 'eight', '8', 'Class 8'],
}

function normalizeClassName(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const found = Object.entries(CLASS_ALIASES).find(([, aliases]) =>
    aliases.some(alias => String(alias).toLowerCase() === raw.toLowerCase())
  )
  return found ? found[0] : raw
}

function aliasesForClass(value) {
  const canonical = normalizeClassName(value)
  return [...new Set([canonical, ...(CLASS_ALIASES[canonical] || [])].filter(Boolean))]
}

function officialRows() {
  let order = 0
  return Object.entries(MATRIX).flatMap(([examDate, byClass]) =>
    Object.entries(byClass).map(([level, subject]) => ({
      classLevel: level,
      className: CLASS_LEVEL_TO_NAME[level],
      subject,
      examDate,
      paperTime: PAPER_TIME,
      sortOrder: ++order,
    }))
  )
}

function subjectsForClass(value) {
  const canonical = normalizeClassName(value)
  return officialRows().filter(row => row.className === canonical)
}

function mergeEnrollmentSnapshot(existingRows = [], rosterRows = []) {
  const officialClassNames = new Set(Object.values(CLASS_LEVEL_TO_NAME))
  const merged = new Map()

  for (const row of existingRows) {
    const className = normalizeClassName(row?.class_name ?? row?.class)
    if (!officialClassNames.has(className)) continue
    const section = String(row?.section || '').trim()
    merged.set(`${className}|${section}`, { className, section })
  }

  for (const row of rosterRows) {
    const className = normalizeClassName(row?.class_name ?? row?.class)
    if (!officialClassNames.has(className)) continue
    const section = String(row?.section || '').trim()
    merged.set(`${className}|${section}`, { className, section })
  }

  return [...merged.values()]
}

module.exports = {
  SESSION,
  NAME,
  TYPE,
  PAPER_TIME,
  START_DATE,
  END_DATE,
  CLASS_LEVEL_TO_NAME,
  MATRIX,
  CLASS_ALIASES,
  normalizeClassName,
  aliasesForClass,
  officialRows,
  subjectsForClass,
  mergeEnrollmentSnapshot,
}
