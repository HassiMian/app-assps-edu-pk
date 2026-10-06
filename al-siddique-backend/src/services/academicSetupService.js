const DEFAULT_ACADEMIC_SETUP = Object.freeze({
  localities: ['Rayya Khas', 'Tharpal Sharif', 'Garoowal', 'Matteke', 'Fattoke', 'Jeewan Bhinder', 'Kulla Mandiala', 'Baddomalhi', 'Narowal', 'Lahore'],
  periodsPerDay: 8,
  classes: [
    { level: 'starter', name: 'Starter', active: true, sections: ['Blue'] },
    { level: 'mover', name: 'Mover', active: true, sections: ['Blue'] },
    { level: 'flyer', name: 'Flyer', active: true, sections: ['Blue'] },
    { level: '1', name: 'One', active: true, sections: ['Blue'] },
    { level: '2', name: 'Two', active: true, sections: ['Blue'] },
    { level: '3', name: 'Three', active: true, sections: ['Blue'] },
    { level: '4', name: 'Four', active: true, sections: ['Blue'] },
    { level: '5', name: 'Five', active: true, sections: ['Blue'] },
    { level: '6', name: 'Six', active: true, sections: ['Blue'] },
    { level: '7', name: 'Seven', active: true, sections: ['Blue'] },
    { level: '8', name: 'Eight', active: true, sections: ['Blue'] },
    { level: 'pre-nine', name: 'Pre Nine', active: true, sections: ['Fatima', 'Usman', 'Blue'] },
    { level: 'hifaz', name: 'Hifaz Class', active: true, sections: ['Abubakar'] },
  ],
})

function cleanString(value, max = 120) {
  return String(value ?? '').trim().slice(0, max)
}

function uniqueStrings(values = [], max = 80) {
  const seen = new Set()
  const result = []
  for (const value of Array.isArray(values) ? values : []) {
    const cleaned = cleanString(value, max)
    if (!cleaned) continue
    const key = cleaned.toLocaleLowerCase('en')
    if (seen.has(key)) continue
    seen.add(key)
    result.push(cleaned)
  }
  return result
}

function validateAcademicSetup(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['Academic setup must be an object.'] }
  }

  const errors = []
  const classes = Array.isArray(input.classes) ? input.classes : []
  const periodsPerDayRaw = Number(input.periodsPerDay ?? 8)
  const periodsPerDay = Number.isInteger(periodsPerDayRaw) ? Math.min(12, Math.max(1, periodsPerDayRaw)) : 8
  const subjects = Array.isArray(input.subjects) ? input.subjects : []
  const localities = uniqueStrings(input.localities || [], 120).slice(0, 250)

  if (!classes.length) errors.push('At least one class is required.')
  if (classes.length > 100) errors.push('Too many classes.')
  if (subjects.length > 250) errors.push('Too many subjects.')

  const classNames = new Set()
  const classLevels = new Set()
  const normalizedClasses = []

  classes.slice(0, 100).forEach((item, index) => {
    const name = cleanString(item?.name, 100)
    const level = cleanString(item?.level || item?.id || `class-${index + 1}`, 80)
    const sections = uniqueStrings(item?.sections || [], 80).slice(0, 50)

    if (!name) errors.push(`Class ${index + 1}: name is required.`)
    if (!level) errors.push(`Class ${index + 1}: level is required.`)

    const nameKey = name.toLocaleLowerCase('en')
    const levelKey = level.toLocaleLowerCase('en')
    if (name && classNames.has(nameKey)) errors.push(`Duplicate class name: ${name}`)
    if (level && classLevels.has(levelKey)) errors.push(`Duplicate class level: ${level}`)
    if (name) classNames.add(nameKey)
    if (level) classLevels.add(levelKey)

    if (!sections.length) errors.push(`Class ${name || index + 1}: at least one section is required.`)

    normalizedClasses.push({
      level,
      name,
      active: item?.active !== false,
      sections,
    })
  })

  const normalizedSubjects = subjects.slice(0, 250).map((item, index) => ({
    id: cleanString(item?.id || `subject-${index + 1}`, 80),
    name: cleanString(item?.name, 120),
    nameUrdu: cleanString(item?.nameUrdu || item?.name_urdu, 160),
    compulsory: item?.compulsory !== false,
    classes: uniqueStrings(item?.classes || [], 80).slice(0, 100),
  })).filter(subject => subject.name)

  return {
    ok: errors.length === 0,
    errors,
    value: {
      localities,
      periodsPerDay,
      classes: normalizedClasses,
      subjects: normalizedSubjects,
    },
  }
}

module.exports = { DEFAULT_ACADEMIC_SETUP, validateAcademicSetup }
