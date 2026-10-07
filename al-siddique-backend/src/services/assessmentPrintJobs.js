const crypto = require('crypto')

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]))
  return value
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value)), 'utf8').digest('hex')
}

function cleanText(value, max = 160) {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, max) : null
}

function normalizeRosterStudent(student = {}) {
  const studentId = cleanText(student.studentId ?? student.id, 80)
  if (!studentId) throw new Error('Roster student id is required')
  return {
    studentId,
    rollNo: cleanText(student.rollNo ?? student.roll_no, 80),
    displayName: cleanText(student.displayName ?? student.name, 160),
    section: cleanText(student.section ?? student.sectionName, 80),
  }
}

function normalizeRosterSnapshot({ students = [], context = {} } = {}) {
  if (!Array.isArray(students)) throw new Error('Roster students must be an array')
  const normalized = students.map(normalizeRosterStudent)
  const ids = new Set()
  for (const student of normalized) {
    if (ids.has(student.studentId)) throw new Error(`Duplicate roster student id: ${student.studentId}`)
    ids.add(student.studentId)
  }
  const normalizedContext = {
    classId: cleanText(context.classId ?? context.class_id, 80),
    className: cleanText(context.className ?? context.class_name, 120),
    section: cleanText(context.section ?? context.sectionName, 80),
    session: cleanText(context.session, 80),
  }
  return {
    context: normalizedContext,
    students: normalized,
    studentCount: normalized.length,
    rosterHash: sha256({ context: normalizedContext, students: normalized }),
  }
}

function normalizeTeacherBinding(binding = {}) {
  return {
    teacherUserId: cleanText(binding.teacherUserId ?? binding.userId ?? binding.id, 80),
    teacherName: cleanText(binding.teacherName ?? binding.name, 160),
    subjectId: cleanText(binding.subjectId ?? binding.subject_id, 80),
    subjectName: cleanText(binding.subjectName ?? binding.subject, 160),
    classId: cleanText(binding.classId ?? binding.class_id, 80),
    className: cleanText(binding.className ?? binding.class_name, 120),
    section: cleanText(binding.section ?? binding.sectionName, 80),
  }
}

function normalizeRenderSettings(settings = {}, { personalized = false, rosterSnapshot = null } = {}) {
  const duplex = Boolean(settings.duplex)
  const copyCount = Number.parseInt(settings.copyCount ?? 1, 10)
  if (!Number.isFinite(copyCount) || copyCount < 1 || copyCount > 1000) throw new Error('copyCount must be between 1 and 1000')

  const rendererVersion = cleanText(settings.rendererVersion || 'assps-paper-workspace-v1', 120) || 'assps-paper-workspace-v1'
  const browserEngineVersion = cleanText(settings.browserEngineVersion, 240)
  const includeStudentName = settings.includeStudentName !== false
  const includeRollNumber = settings.includeRollNumber !== false

  const bookletPlan = []
  let totalPages = null
  if (personalized && rosterSnapshot) {
    const rawCounts = settings.studentPageCounts
    if (!rawCounts || typeof rawCounts !== 'object' || Array.isArray(rawCounts)) {
      throw new Error('studentPageCounts are required for personalized printing')
    }
    const allowedIds = new Set(rosterSnapshot.students.map(student => student.studentId))
    for (const key of Object.keys(rawCounts)) {
      if (!allowedIds.has(String(key))) throw new Error('Unknown roster student id in page counts: ' + key)
    }
    let cursor = 1
    rosterSnapshot.students.forEach((student, index) => {
      const contentPages = Number.parseInt(rawCounts[student.studentId], 10)
      if (!Number.isFinite(contentPages) || contentPages < 1 || contentPages > 100) {
        throw new Error('Invalid page count for roster student ' + student.studentId)
      }
      const paddingPages = duplex && contentPages % 2 === 1 ? 1 : 0
      const bookletPages = contentPages + paddingPages
      const startPage = cursor
      const endPage = cursor + bookletPages - 1
      if (duplex && startPage % 2 !== 1) throw new Error('Duplex booklet boundary must start on a front side')
      bookletPlan.push({
        studentId: student.studentId,
        ordinal: index + 1,
        contentPages,
        paddingPages,
        startPage,
        endPage,
      })
      cursor = endPage + 1
    })
    totalPages = cursor - 1
  }

  return {
    copyCount,
    duplex,
    pageSize: cleanText(settings.pageSize || 'A4', 32) || 'A4',
    orientation: cleanText(settings.orientation || 'portrait', 32) || 'portrait',
    studentBoundaryPolicy: personalized ? 'START_EACH_STUDENT_ON_FRONT' : 'NOT_APPLICABLE',
    rendererVersion,
    browserEngineVersion,
    includeStudentName,
    includeRollNumber,
    bookletPlan,
    totalPages,
  }
}

function createPrintJobBinding({ releaseId, roster = null, teacherBinding = {}, renderSettings = {}, personalized = false, reprintMode = 'NEW_JOB', parentPrintJobId = null } = {}) {
  const safeReleaseId = cleanText(releaseId, 220)
  if (!safeReleaseId) throw new Error('releaseId is required')
  const allowedReprintModes = new Set(['NEW_JOB', 'REPRINT_ORIGINAL', 'UPDATED_JOB'])
  if (!allowedReprintModes.has(reprintMode)) throw new Error('Invalid reprint mode')
  const rosterSnapshot = personalized ? normalizeRosterSnapshot(roster || {}) : null
  const bindingSnapshot = normalizeTeacherBinding(teacherBinding)
  const render = normalizeRenderSettings(renderSettings, { personalized, rosterSnapshot })
  return {
    releaseId: safeReleaseId,
    rosterSnapshot,
    bindingSnapshot,
    renderSettings: {
      pageSize: render.pageSize,
      orientation: render.orientation,
      rendererVersion: render.rendererVersion,
      browserEngineVersion: render.browserEngineVersion,
      includeStudentName: render.includeStudentName,
      includeRollNumber: render.includeRollNumber,
      bookletPlan: render.bookletPlan,
      totalPages: render.totalPages,
    },
    copyCount: render.copyCount,
    personalized: Boolean(personalized),
    duplex: render.duplex,
    studentBoundaryPolicy: render.studentBoundaryPolicy,
    reprintMode,
    parentPrintJobId: cleanText(parentPrintJobId, 220),
    bindingHash: sha256({
      releaseId: safeReleaseId,
      rosterHash: rosterSnapshot?.rosterHash || null,
      bindingSnapshot,
      renderSettings: {
      pageSize: render.pageSize,
      orientation: render.orientation,
      rendererVersion: render.rendererVersion,
      browserEngineVersion: render.browserEngineVersion,
      includeStudentName: render.includeStudentName,
      includeRollNumber: render.includeRollNumber,
      bookletPlan: render.bookletPlan,
      totalPages: render.totalPages,
    },
      copyCount: render.copyCount,
      personalized: Boolean(personalized),
      duplex: render.duplex,
      studentBoundaryPolicy: render.studentBoundaryPolicy,
      reprintMode,
      parentPrintJobId: cleanText(parentPrintJobId, 220),
    }),
  }
}


const PRINT_JOB_TRANSITIONS = Object.freeze({
  CREATED: new Set(['QUEUED','CANCELLED']),
  QUEUED: new Set(['PRINTING','CANCELLED','FAILED']),
  PRINTING: new Set(['COMPLETED','FAILED','CANCELLED']),
  FAILED: new Set(['QUEUED','CANCELLED']),
  COMPLETED: new Set(),
  CANCELLED: new Set(),
})

function canTransitionPrintJob(from, to) {
  const source = String(from || '').toUpperCase()
  const target = String(to || '').toUpperCase()
  return Boolean(PRINT_JOB_TRANSITIONS[source]?.has(target))
}

function printJobTransition(from, to, attemptCount = 0) {
  const source = String(from || '').toUpperCase()
  const target = String(to || '').toUpperCase()
  if (!canTransitionPrintJob(source, target)) throw new Error(`Invalid print job transition: ${source} -> ${target}`)
  const attempts = Math.max(0, Number.parseInt(attemptCount || 0, 10) || 0) + (target === 'PRINTING' ? 1 : 0)
  return { status: target, attemptCount: attempts }
}

function paddedPageCount(pageCount, { personalized = false, duplex = false } = {}) {
  const pages = Math.max(0, Number.parseInt(pageCount || 0, 10) || 0)
  if (!personalized || !duplex) return pages
  return pages % 2 === 0 ? pages : pages + 1
}

module.exports = {
  createPrintJobBinding,
  normalizeRosterSnapshot,
  normalizeTeacherBinding,
  normalizeRenderSettings,
  paddedPageCount,
  canTransitionPrintJob,
  printJobTransition,
  sha256,
}
