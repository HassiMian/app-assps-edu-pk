const crypto = require('crypto')
const { captureQuestionGovernance } = require('./questionBankGovernance')

const text = value => String(value ?? '').trim().replace(/\s+/g, ' ')
const lower = value => text(value).toLowerCase()
const finite = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0

function sha256(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex')
}

function firstText(...values) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

function marksForNode(node = {}, section = {}) {
  const nodeMarks = node.authoritativeNodeMarks ?? node.operationalNodeMarks ?? node.marks
  if (Number.isFinite(Number(nodeMarks))) return finite(nodeMarks)
  if (Array.isArray(section.nodes) && section.nodes.length === 1) {
    return finite(section.authoritativeSectionTotal ?? section.operationalSectionTotal)
  }
  return 0
}

function optionsForNode(node = {}) {
  if (!Array.isArray(node.options)) return []
  return node.options.map((option, index) => ({
    label: firstText(option?.displayLabel, option?.label, String.fromCharCode(65 + index)),
    text: firstText(option?.text, option?.value),
  })).filter(option => option.text)
}

function correctOptionForNode(node = {}) {
  if (!Array.isArray(node.options)) return ''
  const match = node.options.find(option => option?.isCorrect === true)
  return match ? firstText(match.displayLabel, match.label) : ''
}

function questionTextForNode(node = {}, section = {}) {
  const direct = firstText(
    node.stemText,
    node.questionText,
    node.prompt,
    node.content,
    node.rawText,
    node.title,
    node.label,
  )
  if (direct) return direct

  const mathSource = firstText(
    node.mathSource,
    node.math?.source,
    node.math?.latex,
    node.expression,
  )
  if (mathSource) return 'Math: ' + mathSource

  const type = lower(node.type)
  if (type === 'matching_columns' || type === 'grammar_table' || type === 'table') {
    return firstText(section.heading, section.title, section.instructions)
  }
  return ''
}

function urduTextForNode(node = {}) {
  return firstText(
    node.stemTextUrdu,
    node.questionTextUrdu,
    node.contentUrdu,
    node.textUrdu,
    node.urduText,
  )
}

function answerForNode(node = {}) {
  return firstText(
    node.answer,
    node.answerText,
    node.modelAnswer,
    node.correctAnswer,
    node.expectedAnswer,
  )
}

function isExcluded(snapshot = {}, section = {}, node = {}) {
  if (snapshot?.assessment?.captureToQuestionBank === false) return true
  if (snapshot?.questionBankCapture?.eligible === false) return true
  if (section?.captureToQuestionBank === false || section?.excludeFromQuestionBank === true) return true
  if (node?.captureToQuestionBank === false || node?.excludeFromQuestionBank === true || node?.scratch === true) return true
  return false
}

function buildMappings(snapshot = {}, { releaseId, paperPublicId, sectionId, nodeId } = {}) {
  const metadata = snapshot.metadata || {}
  const scope = snapshot.assessment?.scope || {}
  const baseMeta = {
    source: 'assessment_release',
    paperPublicId: text(paperPublicId),
    releaseId: text(releaseId),
    sectionId: text(sectionId),
    nodeId: text(nodeId),
  }
  const mappings = [
    { mappingType:'assessment_release', mappingKey:text(releaseId), mappingStatus:'candidate', metadata:baseMeta },
  ]

  const classLevel = firstText(metadata.classLevel, metadata.className)
  if (classLevel) mappings.push({ mappingType:'class_level', mappingKey:classLevel, mappingStatus:'candidate', metadata:baseMeta })

  const subject = firstText(metadata.subject, metadata.subjectName)
  if (subject) mappings.push({ mappingType:'subject', mappingKey:subject, mappingStatus:'candidate', metadata:baseMeta })

  const chapterId = firstText(scope.chapterId)
  const chapterLabel = firstText(scope.label)
  if (chapterId) mappings.push({ mappingType:'chapter_id', mappingKey:chapterId, mappingStatus:'candidate', metadata:{...baseMeta,label:chapterLabel||null} })
  else if (chapterLabel) mappings.push({ mappingType:'chapter_scope', mappingKey:chapterLabel, mappingStatus:'candidate', metadata:baseMeta })

  const learningScopeIds = Array.isArray(scope.learningScopeIds) ? scope.learningScopeIds : []
  for (const id of learningScopeIds) {
    const key = text(id)
    if (key) mappings.push({ mappingType:'learning_scope_id', mappingKey:key, mappingStatus:'candidate', metadata:baseMeta })
  }
  return mappings
}

function extractReleaseQuestionCandidates({ snapshot = {}, releaseId, paperPublicId } = {}) {
  const metadata = snapshot.metadata || {}
  const scope = snapshot.assessment?.scope || {}
  const sections = Array.isArray(snapshot.sections) ? snapshot.sections : []
  const out = []

  for (const [sectionIndex, section] of sections.entries()) {
    const nodes = Array.isArray(section?.nodes) ? section.nodes : []
    for (const [nodeIndex, node] of nodes.entries()) {
      if (isExcluded(snapshot, section, node)) continue

      const marks = marksForNode(node, section)
      if (!(marks > 0)) continue

      const questionText = questionTextForNode(node, section)
      const questionTextUrdu = urduTextForNode(node)
      if (!questionText && !questionTextUrdu) continue

      const nodeId = firstText(node.id, 'node-' + (sectionIndex + 1) + '-' + (nodeIndex + 1))
      const sectionId = firstText(section.id, 'section-' + (sectionIndex + 1))
      const medium = lower(metadata.language || 'english')
      const question = {
        classLevel: firstText(metadata.classLevel, metadata.className),
        subject: firstText(metadata.subject, metadata.subjectName),
        medium,
        board: firstText(metadata.board, snapshot.assessment?.board),
        chapterNo: firstText(scope.chapterId),
        chapterName: firstText(scope.label),
        topicName: firstText(node.topicName, node.topic),
        type: firstText(node.type, 'custom'),
        text: questionText,
        textUrdu: questionTextUrdu,
        options: optionsForNode(node),
        correctOption: correctOptionForNode(node),
        answer: answerForNode(node),
        explanation: firstText(node.explanation),
        marks,
        difficulty: firstText(node.difficulty, 'medium'),
        priority: 'teacher_capture',
        sourceType: 'assessment_release',
      }

      out.push({
        nodeId,
        sectionId,
        question,
        mappings: buildMappings(snapshot, { releaseId, paperPublicId, sectionId, nodeId }),
      })
    }
  }
  return out
}

async function captureFinalizedAssessmentQuestions({
  schoolId,
  userId = null,
  releaseId,
  paperPublicId,
  snapshot = {},
  enabled = true,
} = {}) {
  if (!enabled || snapshot?.assessment?.captureToQuestionBank === false || snapshot?.questionBankCapture?.eligible === false) {
    return { eligible:false, total:0, captured:0, created:0, duplicates:0, revisions:0, replayed:0, failed:0, results:[] }
  }

  const candidates = extractReleaseQuestionCandidates({ snapshot, releaseId, paperPublicId })
  const summary = { eligible:true, total:candidates.length, captured:0, created:0, duplicates:0, revisions:0, replayed:0, failed:0, results:[] }

  for (const candidate of candidates) {
    const idempotencyKey = 'releasecap:' + sha256(String(schoolId) + '|' + String(releaseId) + '|' + candidate.nodeId).slice(0,40)
    try {
      const result = await captureQuestionGovernance({
        schoolId,
        userId,
        idempotencyKey,
        question:candidate.question,
        mappings:candidate.mappings,
      })
      summary.captured += 1
      if (result.replayed) summary.replayed += 1
      else {
        if (result.created) summary.created += 1
        if (result.duplicate) summary.duplicates += 1
        if (result.revisionCreated) summary.revisions += 1
      }
      summary.results.push({ nodeId:candidate.nodeId, ok:true, ...result })
    } catch (error) {
      summary.failed += 1
      summary.results.push({
        nodeId:candidate.nodeId,
        ok:false,
        code:error?.code || 'QUESTION_CAPTURE_FAILED',
        message:error?.message || 'Question capture failed.',
      })
    }
  }
  return summary
}

module.exports = {
  extractReleaseQuestionCandidates,
  captureFinalizedAssessmentQuestions,
}
