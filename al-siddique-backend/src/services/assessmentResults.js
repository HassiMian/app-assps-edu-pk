const crypto = require('crypto')

const RESULT_ENTRY_STATES = Object.freeze([
  'SCORED',
  'NOT_ATTEMPTED',
  'ABSENT',
  'NOT_CHECKED',
  'EXEMPT',
])

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  }
  return value
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value)), 'utf8').digest('hex')
}

function finiteMarks(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function text(value, max = 1000) {
  const raw = String(value ?? '').trim()
  return raw ? raw.slice(0, max) : null
}

function nodeMarks(node = {}) {
  return finiteMarks(node.authoritativeNodeMarks ?? node.operationalNodeMarks ?? node.marks)
}

function sectionMarks(section = {}) {
  return finiteMarks(section.authoritativeSectionTotal ?? section.operationalSectionTotal ?? section.marks)
}

function buildCheckingSlots(snapshot = {}) {
  const slots = []
  const sections = Array.isArray(snapshot.sections) ? snapshot.sections : []

  sections.forEach((section, sectionIndex) => {
    const nodes = Array.isArray(section.nodes) ? section.nodes : []
    const sectionNumber = Number(section.sectionIndex) > 0 ? Number(section.sectionIndex) : sectionIndex + 1
    const sectionMax = sectionMarks(section)

    if (nodes.length === 1) {
      const node = nodes[0] || {}
      const maxMarks = sectionMax > 0 ? sectionMax : nodeMarks(node)
      if (!(maxMarks > 0)) return
      const questionInstanceId = String(node.id || section.id || ('section-' + sectionNumber)).trim()
      if (!questionInstanceId) throw new Error('Question instance id is required')
      slots.push({
        questionInstanceId,
        displayLabel: 'Q' + sectionNumber,
        maxMarks,
        sectionId: String(section.id || ''),
        nodeId: String(node.id || ''),
      })
      return
    }

    const markedNodes = nodes
      .map((node, nodeIndex) => ({ node, nodeIndex, maxMarks: nodeMarks(node) }))
      .filter(item => item.maxMarks > 0)

    if (markedNodes.length > 0) {
      markedNodes.forEach(({ node, nodeIndex, maxMarks }) => {
        const questionInstanceId = String(node.id || ((section.id || ('section-' + sectionNumber)) + '-node-' + (nodeIndex + 1))).trim()
        slots.push({
          questionInstanceId,
          displayLabel: 'Q' + sectionNumber + '.' + (nodeIndex + 1),
          maxMarks,
          sectionId: String(section.id || ''),
          nodeId: String(node.id || ''),
        })
      })
      return
    }

    if (sectionMax > 0) {
      const questionInstanceId = String(section.id || ('section-' + sectionNumber)).trim()
      slots.push({
        questionInstanceId,
        displayLabel: 'Q' + sectionNumber,
        maxMarks: sectionMax,
        sectionId: String(section.id || ''),
        nodeId: '',
      })
    }
  })

  const seen = new Set()
  for (const slot of slots) {
    if (seen.has(slot.questionInstanceId)) throw new Error('Duplicate question instance id: ' + slot.questionInstanceId)
    seen.add(slot.questionInstanceId)
  }
  return slots
}

function releaseMaximum(snapshot = {}, slots = []) {
  const configured = finiteMarks(snapshot?.scoringPlan?.maximumObtainableMarks)
  return configured > 0 ? configured : slots.reduce((sum, slot) => sum + finiteMarks(slot.maxMarks), 0)
}

function normalizeResultEntries(snapshot, entries = [], { resultStatus = 'DRAFT', releaseId, studentId, reason = null } = {}) {
  if (!Array.isArray(entries)) throw new Error('Result entries must be an array')
  const slots = buildCheckingSlots(snapshot)
  if (!slots.length) throw new Error('Assessment release has no scorable question instances')

  const inputById = new Map()
  for (const entry of entries) {
    const id = String(entry?.questionInstanceId || entry?.question_instance_id || '').trim()
    if (!id) throw new Error('questionInstanceId is required')
    if (inputById.has(id)) throw new Error('Duplicate result entry: ' + id)
    inputById.set(id, entry)
  }

  const slotIds = new Set(slots.map(slot => slot.questionInstanceId))
  for (const id of inputById.keys()) {
    if (!slotIds.has(id)) {
      const error = new Error('Unknown question instance: ' + id)
      error.code = 'UNKNOWN_QUESTION_INSTANCE'
      throw error
    }
  }

  const normalized = slots.map(slot => {
    const raw = inputById.get(slot.questionInstanceId) || {}
    const state = String(raw.state || 'NOT_CHECKED').trim().toUpperCase()
    if (!RESULT_ENTRY_STATES.includes(state)) {
      const error = new Error('Invalid result state: ' + state)
      error.code = 'INVALID_RESULT_STATE'
      throw error
    }

    let score = null
    if (state === 'SCORED') {
      const numeric = Number(raw.score)
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > slot.maxMarks) {
        const error = new Error('Score must be between 0 and ' + slot.maxMarks + ' for ' + slot.displayLabel)
        error.code = 'INVALID_RESULT_SCORE'
        throw error
      }
      score = numeric
    } else if (raw.score !== undefined && raw.score !== null && raw.score !== '') {
      const error = new Error('Non-scored result states must not carry a numeric score')
      error.code = 'INVALID_RESULT_SCORE_STATE'
      throw error
    }

    return {
      questionInstanceId: slot.questionInstanceId,
      displayLabel: slot.displayLabel,
      state,
      score,
      maxScore: slot.maxMarks,
      comment: text(raw.comment),
    }
  })

  const status = String(resultStatus || 'DRAFT').trim().toUpperCase()
  if (!['DRAFT', 'FINALIZED'].includes(status)) {
    const error = new Error('Invalid result status')
    error.code = 'INVALID_RESULT_STATUS'
    throw error
  }
  if (status === 'FINALIZED' && normalized.some(entry => entry.state === 'NOT_CHECKED')) {
    const error = new Error('All question instances must be checked before finalization')
    error.code = 'RESULT_NOT_FULLY_CHECKED'
    throw error
  }

  const maximumScore = releaseMaximum(snapshot, slots)
  const totalScore = normalized.reduce((sum, entry) => sum + (entry.state === 'SCORED' ? finiteMarks(entry.score) : 0), 0)
  if (totalScore > maximumScore + 0.0001) {
    const error = new Error('Total score exceeds assessment release maximum')
    error.code = 'RESULT_TOTAL_EXCEEDS_RELEASE_MAX'
    throw error
  }

  const nonExemptAvailable = normalized
    .filter(entry => entry.state !== 'EXEMPT')
    .reduce((sum, entry) => sum + finiteMarks(entry.maxScore), 0)
  const effectiveMaximumScore = Math.min(maximumScore, nonExemptAvailable)

  const hashPayload = {
    releaseId: String(releaseId || ''),
    studentId: Number(studentId || 0),
    resultStatus: status,
    totalScore,
    maximumScore,
    effectiveMaximumScore,
    entries: normalized,
    reason: text(reason),
  }

  return {
    resultStatus: status,
    totalScore,
    maximumScore,
    effectiveMaximumScore,
    entries: normalized,
    resultHash: sha256(hashPayload),
  }
}

module.exports = {
  RESULT_ENTRY_STATES,
  buildCheckingSlots,
  normalizeResultEntries,
  releaseMaximum,
  sha256,
}
