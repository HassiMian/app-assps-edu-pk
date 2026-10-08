const today = () => new Date().toISOString().slice(0, 10)

export const LESSON_PLAN_SCHEMA_VERSION = 2
export const PLANNING_TYPES = [
  { key:'daily', label:'Daily — Multi-subject day plan', short:'Daily' },
  { key:'weekly', label:'Weekly — Week coverage plan', short:'Weekly' },
  { key:'term', label:'Term-wise — Full term coverage', short:'Term-wise' },
]

const text = (value, max = 500) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
const list = value => Array.isArray(value) ? value : []

export function createEmptyLessonPlanDocument(overrides = {}) {
  const date = overrides.startDate || overrides.date || today()
  return {
    schemaVersion: LESSON_PLAN_SCHEMA_VERSION,
    documentType: 'ASSPS_LESSON_PLAN',
    planningType: overrides.planningType || 'daily',
    status: overrides.status || 'draft',
    sessionLabel: overrides.sessionLabel || '',
    termLabel: overrides.termLabel || '',
    classLevel: overrides.classLevel || '',
    section: overrides.section || '',
    teacher: overrides.teacher || '',
    startDate: date,
    endDate: overrides.endDate || date,
    bufferRatio: Number.isFinite(Number(overrides.bufferRatio)) ? Number(overrides.bufferRatio) : 0.1,
    blackoutDates: list(overrides.blackoutDates),
    subjects: list(overrides.subjects),
    analysis: overrides.analysis || { warnings:[] },
    provenance: overrides.provenance || { deterministic:false, aiEnhanced:false },
  }
}

function normalizeLesson(lesson = {}, subject = '', index = 0) {
  return {
    key: text(lesson.key || `${subject}-${index + 1}`, 220),
    date: text(lesson.date, 10),
    dayName: text(lesson.dayName, 20),
    period: text(lesson.period, 80),
    startTime: text(lesson.startTime, 20),
    endTime: text(lesson.endTime, 20),
    subject: text(lesson.subject || subject, 160),
    unitId: text(lesson.unitId, 160),
    unitLabel: text(lesson.unitLabel || lesson.chapter || '', 300),
    title: text(lesson.title || lesson.topic || '', 700),
    objectives: list(lesson.objectives).map(value => text(value, 700)).filter(Boolean),
    activities: list(lesson.activities).map(value => text(value, 700)).filter(Boolean),
    assessment: text(lesson.assessment, 900),
    homework: text(lesson.homework, 900),
    resources: list(lesson.resources).map(value => text(value, 300)).filter(Boolean),
    notes: text(lesson.notes, 900),
    status: text(lesson.status || 'planned', 40),
    confidence: text(lesson.confidence || 'teacher', 20),
    source: text(lesson.source || 'teacher', 80),
    needsReview: Boolean(lesson.needsReview),
  }
}

function normalizeUnit(unit = {}, index = 0) {
  return {
    id: text(unit.id || `unit-${index + 1}`, 160),
    label: text(unit.label || unit.title || `Unit ${index + 1}`, 300),
    scopeType: text(unit.scopeType || 'chapter', 40),
    sortOrder: Number(unit.sortOrder ?? index + 1),
    learningOutcomes: list(unit.learningOutcomes).map(value => text(value, 700)).filter(Boolean),
    pageRange: text(unit.pageRange, 120),
    source: text(unit.source || 'teacher', 80),
    sourceVersion: text(unit.sourceVersion, 180),
    curriculumAuthority: text(unit.curriculumAuthority, 160),
    allocatedPeriods: Math.max(0, Number(unit.allocatedPeriods || 0)),
    needsReview: Boolean(unit.needsReview),
    questionBank: unit.questionBank && typeof unit.questionBank === 'object' ? unit.questionBank : null,
  }
}

function normalizeSubject(subject = {}, index = 0) {
  const name = text(subject.subject || subject.name || `Subject ${index + 1}`, 160)
  return {
    subject: name,
    capacityPeriods: Math.max(0, Number(subject.capacityPeriods || 0)),
    bufferPeriods: Math.max(0, Number(subject.bufferPeriods || 0)),
    usablePeriods: Math.max(0, Number(subject.usablePeriods || 0)),
    estimatedRequiredPeriods: Math.max(0, Number(subject.estimatedRequiredPeriods || 0)),
    overloadPeriods: Math.max(0, Number(subject.overloadPeriods || 0)),
    status: text(subject.status || 'draft', 40),
    rationale: text(subject.rationale, 1000),
    units: list(subject.units).map(normalizeUnit),
    lessons: list(subject.lessons).map((lesson, lessonIndex) => normalizeLesson(lesson, name, lessonIndex)),
    notes: list(subject.notes).map(value => text(value, 800)).filter(Boolean),
  }
}

export function normalizeLessonPlanDocument(input = {}) {
  if (input?.plannerDocument && typeof input.plannerDocument === 'object') {
    return normalizeLessonPlanDocument({ ...input.plannerDocument, id:input.id, revision:input.revision, serverRevision:input.serverRevision })
  }
  if (Number(input.schemaVersion) >= 2 && Array.isArray(input.subjects)) {
    const base = createEmptyLessonPlanDocument(input)
    return {
      ...base,
      id: input.id,
      revision: Number(input.revision || input.serverRevision || 0),
      serverRevision: Number(input.serverRevision || input.revision || 0),
      title: text(input.title, 500),
      subjects: input.subjects.map(normalizeSubject),
      analysis: input.analysis && typeof input.analysis === 'object' ? input.analysis : { warnings:[] },
      provenance: input.provenance && typeof input.provenance === 'object' ? input.provenance : { deterministic:false, aiEnhanced:false },
    }
  }
  // Legacy single-lesson compatibility: never discard old data.
  const date = input.date || input.planDate || today()
  const subject = text(input.subject || 'Subject', 160)
  const lesson = normalizeLesson({
    key:`legacy:${input.id || Date.now()}`,
    date,
    period:input.period,
    subject,
    unitLabel:input.chapter,
    title:input.title || input.chapter || 'Legacy lesson',
    objectives:input.objectives,
    activities:list(input.phases).map(phase => [phase.label || phase.key, phase.teacherDoes, phase.studentDoes].filter(Boolean).join(' — ')).filter(Boolean),
    assessment:[input.assessmentType, input.assessmentDesc].filter(Boolean).join(': '),
    homework:input.homework,
    resources:input.resources,
    notes:input.notes,
    source:'legacy',
  }, subject, 0)
  return {
    ...createEmptyLessonPlanDocument({
      planningType: input.planningScope || 'daily',
      classLevel: input.classLevel,
      teacher: input.teacher,
      startDate:date,
      endDate:input.endDate || date,
      termLabel:input.planRangeLabel || '',
    }),
    id:input.id,
    revision:Number(input.revision || input.serverRevision || 0),
    serverRevision:Number(input.serverRevision || input.revision || 0),
    title:text(input.title,500),
    subjects:[{ ...normalizeSubject({ subject, units:[{ id:'legacy-unit', label:input.chapter || 'Legacy unit', source:'legacy' }], lessons:[lesson] },0) }],
    provenance:{ deterministic:false, aiEnhanced:false, migratedFromLegacy:true },
  }
}

export function toLessonPlanPersistencePayload(document) {
  const doc = normalizeLessonPlanDocument(document)
  const subjectNames = doc.subjects.map(item => item.subject).filter(Boolean)
  const unitNames = doc.subjects.flatMap(item => item.units.map(unit => unit.label)).filter(Boolean)
  const scopeLabel = PLANNING_TYPES.find(item => item.key === doc.planningType)?.short || 'Daily'
  return {
    ...doc,
    id:doc.id,
    serverRevision:doc.serverRevision || doc.revision || undefined,
    title:doc.title || `${scopeLabel} Plan — ${doc.classLevel || 'Class'}${doc.section ? ` ${doc.section}` : ''}`,
    subject:subjectNames.length === 1 ? subjectNames[0] : subjectNames.length ? 'Multiple Subjects' : '',
    classLevel:doc.classLevel,
    chapter:unitNames.slice(0,8).join(', '),
    teacher:doc.teacher,
    date:doc.startDate,
    planningScope:doc.planningType,
    planRangeLabel:doc.termLabel || `${doc.startDate}${doc.endDate && doc.endDate !== doc.startDate ? ` to ${doc.endDate}` : ''}`,
    endDate:doc.endDate,
    period:doc.planningType === 'daily' ? 'Multiple periods' : '',
    duration:40,
    plannerDocument:doc,
  }
}

export function mergeParsedPlanningText(document, parsed) {
  const doc = normalizeLessonPlanDocument(document)
  const bySubject = new Map(doc.subjects.map(item => [item.subject.toLowerCase(), item]))
  for (const parsedSubject of list(parsed?.subjects)) {
    const name = text(parsedSubject.subject,160)
    if (!name) continue
    let target = bySubject.get(name.toLowerCase())
    if (!target) {
      target = normalizeSubject({ subject:name }, doc.subjects.length)
      doc.subjects.push(target)
      bySubject.set(name.toLowerCase(), target)
    }
    for (const unit of list(parsedSubject.units)) {
      const normalizedUnit = normalizeUnit({
        id:`paste-${name}-${target.units.length + 1}-${Date.now()}`,
        label:unit.title || 'Teacher-provided lesson',
        pageRange:unit.pageRange,
        source:'pasted_text',
        needsReview:false,
      }, target.units.length)
      target.units.push(normalizedUnit)
      target.lessons.push(normalizeLesson({
        key:`paste:${name}:${target.lessons.length + 1}:${Date.now()}`,
        subject:name,
        unitId:normalizedUnit.id,
        unitLabel:normalizedUnit.label,
        title:unit.title,
        objectives:unit.objectives,
        activities:unit.activities,
        assessment:unit.assessment,
        homework:unit.homework,
        resources:unit.resources,
        notes:list(parsedSubject.notes).join(' '),
        source:'pasted_text',
        confidence:'teacher',
      },name,target.lessons.length))
    }
  }
  if (list(parsed?.unclassified).length) {
    doc.analysis = { ...(doc.analysis || {}), warnings:[...new Set([...(doc.analysis?.warnings || []), `Unclassified pasted lines preserved for review: ${parsed.unclassified.join(' | ')}`])] }
  }
  return doc
}

export function deriveDiaryRowsFromLessonPlan(document, date) {
  const doc = normalizeLessonPlanDocument(document)
  const targetDate = date || doc.startDate
  const rows = []
  for (const subject of doc.subjects) {
    const lessons = subject.lessons.filter(lesson => !targetDate || lesson.date === targetDate)
    if (!lessons.length && doc.planningType !== 'daily') continue
    const relevant = lessons.length ? lessons : subject.lessons.slice(0,1)
    if (!relevant.length) continue
    const summary = relevant.map(lesson => {
      const parts = [lesson.title]
      if (lesson.homework) parts.push(`Homework: ${lesson.homework}`)
      else if (lesson.assessment) parts.push(`Assessment: ${lesson.assessment}`)
      return parts.filter(Boolean).join(' — ')
    }).join(' | ')
    rows.push({
      id:`lesson-${subject.subject}-${targetDate || 'day'}`,
      subject:subject.subject.toUpperCase(),
      diary:summary || 'Teacher confirmation required',
      isUrdu:/urdu/i.test(subject.subject),
      source:'lesson-plan',
    })
  }
  return rows
}

export function lessonPlanProgress(document) {
  const doc = normalizeLessonPlanDocument(document)
  return doc.subjects.map(subject => {
    const total = subject.lessons.length
    const completed = subject.lessons.filter(lesson => ['taught','revised','assessed'].includes(lesson.status)).length
    return {
      subject:subject.subject,
      completed,
      total,
      percent:total ? Math.round((completed / total) * 100) : 0,
      capacityPeriods:subject.capacityPeriods,
      usablePeriods:subject.usablePeriods,
      overloadPeriods:subject.overloadPeriods,
      status:subject.overloadPeriods > 0 ? 'Behind capacity' : 'On schedule',
    }
  })
}
