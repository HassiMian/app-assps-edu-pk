const { callWithFallback, getAiEnvConfig, parseJsonResponse, publicMessageFor } = require('./ai/geminiClient')

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MAX_RANGE_DAYS = 370
const MAX_SUBJECTS = 20
const MAX_UNITS_PER_SUBJECT = 80

function clean(value, max = 240) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
}

function normalizeClassKey(value) {
  const aliases = {
    starter:'starter', playgroup:'starter', pg:'starter', mover:'mover', nursery:'mover', flyer:'flyer', prep:'flyer', kg:'flyer',
    one:'1', first:'1', two:'2', second:'2', three:'3', third:'3', four:'4', fourth:'4', five:'5', fifth:'5',
    six:'6', sixth:'6', seven:'7', seventh:'7', eight:'8', eighth:'8', nine:'9', ninth:'9', ten:'10', tenth:'10',
  }
  const raw = String(value || '').toLowerCase().replace(/class|grade/g, '').replace(/[^a-z0-9]/g, '')
  return aliases[raw] || raw
}

function subjectKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
}

function parseIsoDate(value) {
  const text = String(value || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const date = new Date(`${text}T12:00:00Z`)
  return Number.isNaN(date.getTime()) || iso(date) !== text ? null : date
}

function iso(date) {
  return date.toISOString().slice(0, 10)
}

function enumerateDates(startValue, endValue) {
  const start = parseIsoDate(startValue)
  const end = parseIsoDate(endValue || startValue)
  if (!start || !end || end < start) return []
  if (Math.round((end - start) / 86400000) + 1 > MAX_RANGE_DAYS) {
    throw new RangeError(`Lesson planning range exceeds ${MAX_RANGE_DAYS} calendar days.`)
  }
  const dates = []
  const cursor = new Date(start)
  while (cursor <= end && dates.length < MAX_RANGE_DAYS) {
    dates.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

function normalizeBlackoutDates(values = []) {
  return new Set((Array.isArray(values) ? values : []).map(v => String(v).trim()).filter(v => /^\d{4}-\d{2}-\d{2}$/.test(v) && parseIsoDate(v)))
}

function classMatches(a, b) {
  const left = normalizeClassKey(a)
  const right = normalizeClassKey(b)
  return Boolean(left && right && left === right)
}

function buildTimetableSlots({ timetable = [], classLevel, section, startDate, endDate, blackoutDates = [] }) {
  const blackout = normalizeBlackoutDates(blackoutDates)
  const sectionKey = clean(section, 80).toLowerCase()
  const rows = timetable.filter(row => {
    if (!classMatches(row.class_name, classLevel)) return false
    if (sectionKey && clean(row.section, 80).toLowerCase() && clean(row.section, 80).toLowerCase() !== sectionKey) return false
    return true
  })
  const byDay = new Map()
  for (const row of rows) {
    const key = clean(row.day_name, 20).toLowerCase()
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(row)
  }
  for (const values of byDay.values()) {
    values.sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')) || Number(a.day_order || 0) - Number(b.day_order || 0))
  }
  const slots = []
  for (const date of enumerateDates(startDate, endDate)) {
    const dateKey = iso(date)
    if (blackout.has(dateKey)) continue
    const dayName = DAY_NAMES[date.getUTCDay()]
    const dayRows = byDay.get(dayName.toLowerCase()) || []
    for (const row of dayRows) {
      slots.push({
        date: dateKey,
        dayName,
        subject: clean(row.subject, 160),
        classLevel: clean(row.class_name, 80),
        section: clean(row.section, 80),
        period: clean(row.period_label, 80) || clean(row.start_time, 16),
        startTime: clean(row.start_time, 16),
        endTime: clean(row.end_time, 16),
        teacherId: row.teacher_id || null,
      })
    }
  }
  return slots
}

function groupBySubject(values = []) {
  const grouped = new Map()
  for (const item of values) {
    const key = subjectKey(item.subject || item.subject_name)
    if (!key) continue
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(item)
  }
  return grouped
}

function qbankWeight(signal = {}) {
  signal = signal || {}
  const questions = Math.max(0, Number(signal.questionCount || signal.question_count || 0))
  const past = Math.max(0, Number(signal.pastPaperCount || signal.past_paper_count || 0))
  const long = Math.max(0, Number(signal.longQuestionCount || signal.long_question_count || 0))
  return Math.min(4, Math.sqrt(questions) / 6 + past * 0.18 + long * 0.08)
}

function scopeWeight(scope = {}, qbankSignal = null) {
  const type = String(scope.scopeType || scope.scope_type || '').toLowerCase()
  const metadata = scope.metadata && typeof scope.metadata === 'object' ? scope.metadata : {}
  let weight = type === 'chapter' ? 2.4 : type === 'topic' ? 1.4 : type === 'skill' || type === 'slo' || type === 'learning_outcome' ? 1.15 : 1
  if (Number(metadata.estimated_periods) > 0) weight += Math.min(6, Number(metadata.estimated_periods)) * 0.35
  if (metadata.practical || metadata.activity_required) weight += 0.7
  weight += qbankWeight(qbankSignal)
  return Math.max(0.75, weight)
}

function buildUnitsForSubject({ subject, curriculumScopes = [], questionSignals = [] }) {
  const key = subjectKey(subject)
  const relevantScopes = curriculumScopes.filter(scope => subjectKey(scope.subject) === key)
  const qSignals = questionSignals.filter(signal => subjectKey(signal.subject) === key)
  const qByChapter = new Map(qSignals.map(signal => [clean(signal.chapterName || signal.chapter_name || 'Unmapped', 240).toLowerCase(), signal]))

  const chapterScopes = relevantScopes.filter(scope => String(scope.scopeType || scope.scope_type || '').toLowerCase() === 'chapter')
  const candidates = chapterScopes.length ? chapterScopes : relevantScopes.filter(scope => ['topic','general','cross_chapter'].includes(String(scope.scopeType || scope.scope_type || '').toLowerCase()))

  if (candidates.length) {
    return candidates.slice(0, MAX_UNITS_PER_SUBJECT).map((scope, index) => {
      const label = clean(scope.label || scope.canonicalKey || `Scope ${index + 1}`, 240)
      const qSignal = qByChapter.get(label.toLowerCase()) || null
      const metadata = scope.metadata && typeof scope.metadata === 'object' ? scope.metadata : {}
      return {
        id: clean(scope.publicId || scope.public_id || `${key}-scope-${index + 1}`, 160),
        label,
        scopeType: clean(scope.scopeType || scope.scope_type || 'chapter', 40),
        sortOrder: Number(scope.sortOrder ?? scope.sort_order ?? index + 1),
        learningOutcomes: Array.isArray(metadata.learning_outcomes) ? metadata.learning_outcomes.map(v => clean(v, 500)).filter(Boolean) : [],
        pageRange: clean(metadata.page_range || metadata.pages || scope.sourceLocator?.pages || '', 80),
        source: 'curriculum',
        sourceVersion: clean(scope.curriculumLabel || scope.curriculum_label || '', 180),
        curriculumAuthority: clean(scope.curriculumAuthority || scope.curriculum_authority || '', 160),
        questionBank: qSignal || null,
        weight: scopeWeight(scope, qSignal),
        needsReview: false,
      }
    }).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  const qChapters = qSignals.filter(signal => clean(signal.chapterName || signal.chapter_name || '', 240))
  if (qChapters.length) {
    return qChapters.slice(0, MAX_UNITS_PER_SUBJECT).map((signal, index) => ({
      id: `${key}-qbank-${index + 1}`,
      label: clean(signal.chapterName || signal.chapter_name, 240),
      scopeType: 'chapter',
      sortOrder: index + 1,
      learningOutcomes: [],
      pageRange: '',
      source: 'question_bank_inference',
      sourceVersion: '',
      curriculumAuthority: '',
      questionBank: signal,
      weight: 1 + qbankWeight(signal),
      needsReview: true,
    }))
  }

  return [{
    id: `${key || 'subject'}-needs-mapping`,
    label: 'Curriculum mapping required',
    scopeType: 'general',
    sortOrder: 1,
    learningOutcomes: [],
    pageRange: '',
    source: 'unmapped',
    sourceVersion: '',
    curriculumAuthority: '',
    questionBank: null,
    weight: 1,
    needsReview: true,
  }]
}

function allocatePeriods(units, usablePeriods) {
  if (!units.length) return []
  const available = Number.isFinite(Number(usablePeriods)) ? Math.max(0, Math.floor(Number(usablePeriods))) : 0
  const draft = units.map(unit => ({ ...unit, allocatedPeriods: 0 }))
  if (!available) return draft

  const weights = units.map(unit => {
    const value = Number(unit.weight)
    return Number.isFinite(value) && value > 0 ? value : 1
  })
  const base = available >= units.length ? 1 : 0
  draft.forEach(item => { item.allocatedPeriods = base })
  const remaining = available - base * units.length
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  const quotas = weights.map(weight => remaining * weight / totalWeight)
  const floors = quotas.map(Math.floor)
  floors.forEach((value, i) => { draft[i].allocatedPeriods += value })
  const left = remaining - floors.reduce((sum, value) => sum + value, 0)
  const order = quotas.map((quota, i) => ({ i, remainder: quota - floors[i], weight: weights[i] }))
    .sort((a, b) => b.remainder - a.remainder || b.weight - a.weight || a.i - b.i)
  for (let i = 0; i < left; i += 1) draft[order[i].i].allocatedPeriods += 1
  return draft
}

function buildDeterministicPlan(input, context) {
  const planningType = ['daily','weekly','term'].includes(String(input.planningType || '').toLowerCase()) ? String(input.planningType).toLowerCase() : 'daily'
  const classLevel = clean(input.classLevel, 80)
  const section = clean(input.section, 80)
  const startDate = clean(input.startDate || input.date, 10)
  const endDate = clean(input.endDate || input.date || input.startDate, 10)
  const requestedBufferRatio = Number(input.bufferRatio ?? 0.1)
  const bufferRatio = Number.isFinite(requestedBufferRatio) ? Math.max(0, Math.min(requestedBufferRatio, 0.3)) : 0.1
  const selectedSubjects = [...new Set((Array.isArray(input.subjects) ? input.subjects : []).map(value => clean(value, 160)).filter(Boolean))].slice(0, MAX_SUBJECTS)
  const slots = buildTimetableSlots({ timetable: context.timetable, classLevel, section, startDate, endDate, blackoutDates: input.blackoutDates })
  const slotGroups = groupBySubject(slots)
  const timetableSubjects = [...new Set(slots.map(slot => slot.subject).filter(Boolean))]
  const subjects = selectedSubjects.length ? selectedSubjects : timetableSubjects
  const subjectPlans = []

  for (const subject of subjects) {
    const subjectSlots = slotGroups.get(subjectKey(subject)) || []
    const capacity = subjectSlots.length
    const bufferPeriods = Math.min(capacity, Math.ceil(capacity * bufferRatio))
    const usablePeriods = Math.max(0, capacity - bufferPeriods)
    const units = allocatePeriods(buildUnitsForSubject({ subject, curriculumScopes: context.curriculumScopes, questionSignals: context.questionBankSignals }), usablePeriods)
    const lessons = []
    let slotCursor = 0
    for (const unit of units) {
      const take = Math.max(0, Number(unit.allocatedPeriods || 0))
      for (let i = 0; i < take && slotCursor < subjectSlots.length; i += 1) {
        const slot = subjectSlots[slotCursor++]
        const lessonNumber = i + 1
        lessons.push({
          key: `${subjectKey(subject)}:${unit.id}:${lessonNumber}:${slot.date}:${slot.period}`,
          date: slot.date,
          dayName: slot.dayName,
          period: slot.period,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subject,
          unitId: unit.id,
          unitLabel: unit.label,
          title: `${unit.label}${take > 1 ? ` — Lesson ${lessonNumber}` : ''}`,
          objectives: unit.learningOutcomes.slice(0, 4),
          activities: [],
          assessment: '',
          homework: '',
          resources: [],
          status: 'planned',
          confidence: unit.source === 'curriculum' ? 'high' : unit.source === 'question_bank_inference' ? 'medium' : 'low',
          source: unit.source,
          needsReview: unit.needsReview,
        })
      }
    }
    const requiredPeriods = units.reduce((sum, unit) => sum + Math.max(1, Math.round(Number(unit.weight || 1) * 2)), 0)
    const overload = Math.max(0, requiredPeriods - usablePeriods)
    subjectPlans.push({
      subject,
      capacityPeriods: capacity,
      bufferPeriods,
      usablePeriods,
      estimatedRequiredPeriods: requiredPeriods,
      overloadPeriods: overload,
      status: overload > 0 ? 'over_capacity' : capacity === 0 ? 'timetable_missing' : 'within_capacity',
      units,
      lessons,
      rationale: capacity === 0
        ? 'No matching timetable periods were found. Teacher confirmation is required before scheduling.'
        : `${capacity} timetable periods found; ${bufferPeriods} reserved as buffer; ${usablePeriods} periods available for planned instruction.`,
    })
  }

  const totalCapacity = subjectPlans.reduce((sum, subject) => sum + subject.capacityPeriods, 0)
  const totalUsable = subjectPlans.reduce((sum, subject) => sum + subject.usablePeriods, 0)
  const warnings = [...(context.warnings || [])]
  if (!slots.length) warnings.push('No timetable slots matched the selected class/section/date range. Dates were not invented.')
  if (!context.holidayCalendarAvailable) warnings.push('Authoritative school holiday calendar is not configured; blackout dates require teacher confirmation.')
  if (subjectPlans.some(subject => subject.overloadPeriods > 0)) warnings.push('One or more subjects exceed estimated teaching capacity. Review pacing before finalizing.')

  return {
    schemaVersion: 2,
    documentType: 'ASSPS_LESSON_PLAN',
    planningType,
    status: 'draft',
    sessionLabel: clean(input.sessionLabel || context.session?.label || context.academicSetup?.sessionLabel || '', 120),
    termLabel: clean(input.termLabel || '', 120),
    classLevel,
    section,
    teacher: clean(input.teacher, 160),
    startDate,
    endDate,
    bufferRatio,
    blackoutDates: [...normalizeBlackoutDates(input.blackoutDates)],
    subjects: subjectPlans,
    analysis: {
      totalCapacityPeriods: totalCapacity,
      totalUsablePeriods: totalUsable,
      timetableSlots: slots.length,
      curriculumScopeCount: context.curriculumScopes.length,
      questionBankSignalCount: context.questionBankSignals.length,
      curriculumSources: [...new Set(context.curriculumScopes.map(scope => clean(scope.curriculumLabel || scope.curriculum_label, 180)).filter(Boolean))],
      warnings: [...new Set(warnings)],
    },
    provenance: {
      generatedAt: new Date().toISOString(),
      deterministic: true,
      aiEnhanced: false,
      curriculumVersioned: context.curriculumScopes.length > 0,
      questionBankUsed: context.questionBankSignals.length > 0,
      timetableUsed: slots.length > 0,
      verifiedFields: ['classLevel','section','startDate','endDate','subjects','timetableSlots'],
      suggestedFields: ['lesson objectives','activities','assessment','homework'],
    },
  }
}

function buildAiPrompt(plan, context) {
  const safePlan = {
    planningType: plan.planningType,
    classLevel: plan.classLevel,
    section: plan.section,
    termLabel: plan.termLabel,
    subjects: plan.subjects.map(subject => ({
      subject: subject.subject,
      lessons: subject.lessons.map(lesson => ({
        key: lesson.key,
        date: lesson.date,
        period: lesson.period,
        unitLabel: lesson.unitLabel,
        title: lesson.title,
        confidence: lesson.confidence,
        objectives: lesson.objectives,
      })),
    })),
  }
  const qbank = context.questionBankSignals.slice(0, 120).map(signal => ({
    subject: signal.subject,
    chapter: signal.chapterName || signal.chapter_name,
    questions: Number(signal.questionCount || signal.question_count || 0),
    pastPaper: Number(signal.pastPaperCount || signal.past_paper_count || 0),
    longQuestions: Number(signal.longQuestionCount || signal.long_question_count || 0),
  }))
  return [
    'You are ASSPS Lesson Planning Assistant.',
    'Enrich an existing deterministic school lesson schedule. Never change lesson keys, subjects, dates, periods, unit labels, or add curriculum facts/page numbers.',
    'Only propose concise objectives, activities, assessment, homework, and resources for the listed lessons.',
    'If source confidence is low or curriculum evidence is missing, use cautious generic pedagogy and include "Teacher confirmation required" in notes rather than inventing facts.',
    'Return strict JSON: {"lessons":[{"key":"...","objectives":["..."],"activities":["..."],"assessment":"...","homework":"...","resources":["..."],"notes":"..."}]}',
    'Do not output markdown. Do not include student personal data. Do not include answers/answer keys.',
    `PLAN=${JSON.stringify(safePlan)}`,
    `QUESTION_BANK_SIGNALS=${JSON.stringify(qbank)}`,
  ].join('\n')
}

async function enhancePlanWithAi(plan, context, { preferredModel } = {}) {
  const config = getAiEnvConfig()
  if (!config.apiKey) {
    return { plan, ai: { configured: false, used: false, message: 'AI model is not configured; deterministic plan retained.' } }
  }
  try {
    const result = await callWithFallback({
      model: preferredModel || config.textModel,
      purpose: 'text',
      contents: [{ role: 'user', parts: [{ text: buildAiPrompt(plan, context) }] }],
      generationConfig: { temperature: 0.15, maxOutputTokens: 8192, responseMimeType: 'application/json' },
      timeoutMs: 70000,
      maxRetries: 1,
    })
    const parsed = parseJsonResponse(result.text) || {}
    const enrichment = new Map((Array.isArray(parsed.lessons) ? parsed.lessons : []).map(item => [String(item.key || ''), item]))
    const merged = {
      ...plan,
      subjects: plan.subjects.map(subject => ({
        ...subject,
        lessons: subject.lessons.map(lesson => {
          const extra = enrichment.get(lesson.key)
          if (!extra) return lesson
          return {
            ...lesson,
            objectives: Array.isArray(extra.objectives) ? extra.objectives.slice(0, 6).map(v => clean(v, 500)).filter(Boolean) : lesson.objectives,
            activities: Array.isArray(extra.activities) ? extra.activities.slice(0, 6).map(v => clean(v, 500)).filter(Boolean) : lesson.activities,
            assessment: clean(extra.assessment, 700),
            homework: clean(extra.homework, 700),
            resources: Array.isArray(extra.resources) ? extra.resources.slice(0, 8).map(v => clean(v, 240)).filter(Boolean) : [],
            notes: clean(extra.notes, 700),
          }
        }),
      })),
      provenance: { ...plan.provenance, aiEnhanced: true },
    }
    return { plan: merged, ai: { configured: true, used: true, model: result.model, fallbackUsed: Boolean(result.fallbackUsed) } }
  } catch (error) {
    return { plan, ai: { configured: true, used: false, message: publicMessageFor(error), code: error.code || 'AI_ENHANCEMENT_FAILED' } }
  }
}

function parseSmartPlanningText(text, knownSubjects = []) {
  const source = String(text || '').replace(/\r/g, '').trim()
  if (!source) return { subjects: [], unclassified: [], confidence: 'low' }
  const aliases = new Map()
  for (const subject of knownSubjects) aliases.set(subjectKey(subject), clean(subject, 160))
  const lines = source.split('\n').map(line => line.trim()).filter(Boolean)
  const subjects = []
  const unclassified = []
  let current = null
  const fieldPatterns = [
    ['objectives', /^(?:objectives?|learning outcomes?|slo?s?)\s*[:\-]\s*(.+)$/i],
    ['activities', /^(?:activities?|activity|teacher activity|student activity)\s*[:\-]\s*(.+)$/i],
    ['assessment', /^(?:assessment|check for understanding|quiz|test)\s*[:\-]\s*(.+)$/i],
    ['homework', /^(?:homework|home task|diary)\s*[:\-]\s*(.+)$/i],
    ['resources', /^(?:resources?|materials?)\s*[:\-]\s*(.+)$/i],
    ['pageRange', /^(?:pages?|page range)\s*[:\-]\s*(.+)$/i],
  ]
  function ensureSubject(label) {
    const normalized = clean(label, 160)
    let found = subjects.find(item => subjectKey(item.subject) === subjectKey(normalized))
    if (!found) {
      found = { subject: normalized, units: [], notes: [] }
      subjects.push(found)
    }
    return found
  }
  for (const line of lines) {
    const withoutColon = line.replace(/[:\-]+$/, '').trim()
    const directSubject = aliases.get(subjectKey(withoutColon))
    if (directSubject) {
      current = ensureSubject(directSubject)
      continue
    }
    const inline = line.match(/^([^:]{2,40})\s*:\s*(.+)$/)
    if (inline && aliases.has(subjectKey(inline[1]))) {
      current = ensureSubject(aliases.get(subjectKey(inline[1])))
      current.units.push({ title: clean(inline[2], 500), objectives: [], activities: [], assessment: '', homework: '', resources: [], pageRange: '', source: 'pasted_text' })
      continue
    }
    if (!current) {
      unclassified.push(line)
      continue
    }
    const field = fieldPatterns.find(([, pattern]) => pattern.test(line))
    if (field) {
      const [, pattern] = field
      const match = line.match(pattern)
      if (!current.units.length) current.units.push({ title: 'Teacher-provided lesson', objectives: [], activities: [], assessment: '', homework: '', resources: [], pageRange: '', source: 'pasted_text' })
      const unit = current.units[current.units.length - 1]
      if (['objectives','activities','resources'].includes(field[0])) unit[field[0]].push(clean(match[1], 500))
      else unit[field[0]] = clean(match[1], 700)
      continue
    }
    const chapterMatch = line.match(/^(?:chapter|unit|topic|lesson)\s*\d*\s*[:\-]?\s*(.+)$/i)
    if (chapterMatch) {
      current.units.push({ title: clean(chapterMatch[1], 500), objectives: [], activities: [], assessment: '', homework: '', resources: [], pageRange: '', source: 'pasted_text' })
      continue
    }
    if (!current.units.length) current.units.push({ title: clean(line, 500), objectives: [], activities: [], assessment: '', homework: '', resources: [], pageRange: '', source: 'pasted_text' })
    else current.notes.push(line)
  }
  return { subjects, unclassified, confidence: unclassified.length ? 'medium' : subjects.length ? 'high' : 'low' }
}

module.exports = {
  normalizeClassKey,
  classMatches,
  enumerateDates,
  parseIsoDate,
  MAX_RANGE_DAYS,
  allocatePeriods,
  buildTimetableSlots,
  buildUnitsForSubject,
  buildDeterministicPlan,
  enhancePlanWithAi,
  parseSmartPlanningText,
}
