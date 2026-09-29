// adaptLegacyCanvasToCanonical.js
// Lossless-enough adapter for ASSPS schemaVersion 2 saved papers.
// It does not pretend legacy papers are official V13. It only supplies the
// canonical editor contract so the product has one visible editing surface.

const URDU_RE = /[\u0600-\u06ff]/

function finite(value, fallback = null) {
  if (value === '' || value === null || value === undefined) return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function directionFor(value, fallback = 'ltr') {
  if (value === 'rtl' || value === 'ltr') return value
  return fallback
}

function nodeTypeFor(question = {}, sectionType = '') {
  const raw = String(question.type || sectionType || '').toLowerCase()
  if (raw === 'mcq') return 'mcq'
  if (raw === 'long' || raw === 'long_question') return 'long_question'
  if (raw === 'essay') return 'essay'
  if (raw === 'application') return 'application'
  if (raw === 'letter') return 'letter'
  if (raw === 'translation') return 'translation'
  if (raw === 'definition') return 'definition'
  if (raw === 'true_false' || raw === 'true-false') return 'true_false'
  return 'short_question'
}

function adaptOption(option = {}, index = 0, direction = 'ltr', nodeId = 'node') {
  const label = String(
    option.sourceLabel ||
    option.displayLabel ||
    option.canonicalLabel ||
    option.label ||
    String.fromCharCode(65 + index)
  )
  const text = String(option.textUrdu || option.text || '')
  return {
    id: String(option.id || `${nodeId}__opt_${index + 1}`),
    canonicalLabel: label,
    sourceLabel: label,
    displayLabel: label,
    labelOrigin: 'SOURCE_EXPLICIT',
    text,
    direction: directionFor(option.direction, URDU_RE.test(text) ? 'rtl' : direction),
    isCorrect: option.isCorrect === true ? true : (option.isCorrect === false ? false : null),
  }
}

function adaptQuestion(question = {}, index = 0, section = {}, documentDirection = 'ltr') {
  const type = nodeTypeFor(question, section.type)
  const nodeId = String(question.id || `${section.id || 'section'}__q_${index + 1}`)
  const urduText = String(question.stemUrdu || question.textUrdu || '')
  const englishText = String(question.stemText || question.text || '')
  const stemText = urduText || englishText
  const direction = directionFor(
    question.direction,
    URDU_RE.test(stemText) ? 'rtl' : documentDirection
  )
  const marks = finite(question.marks, finite(section.marksPerQuestion, null))
  const base = {
    id: nodeId,
    type,
    direction,
    stemText,
    operationalNodeMarks: marks,
    authoritativeNodeMarks: marks,
    nodeMarksOrigin: marks === null ? 'UNSTATED' : 'LEGACY_SAVED_VALUE',
    marksEvidenceString: null,
    provenance: {
      classificationCertainty: 'HIGH',
      sourceSegmentIds: [],
      academicTextMutated: false,
      rawSourceSnapshot: stemText,
    },
  }

  if (type === 'mcq') {
    return {
      ...base,
      options: (question.options || []).map((option, optIndex) =>
        adaptOption(option, optIndex, direction, nodeId)
      ),
    }
  }

  if (type === 'true_false') {
    return {
      ...base,
      statement: stemText,
      statementText: stemText,
      hasIndicatorBox: true,
      expectedAnswer: null,
    }
  }

  return {
    ...base,
    subparts: [],
  }
}

export function adaptLegacyCanvasToCanonical(raw = {}) {
  if (!raw || typeof raw !== 'object' || raw.schemaVersion !== 2 || !Array.isArray(raw.sections)) {
    throw new Error('LEGACY_CANVAS_ADAPTER_REQUIRES_SCHEMA2_SECTIONS')
  }

  const meta = raw.metadata || {}
  const language = meta.language === 'urdu'
    ? 'urdu'
    : (meta.language === 'english' ? 'english' : (URDU_RE.test(String(meta.title || raw.name || '')) ? 'urdu' : 'english'))
  const direction = language === 'urdu' ? 'rtl' : 'ltr'
  const sections = raw.sections.map((section, sectionIndex) => {
    const nodes = (section.questions || []).map((question, questionIndex) =>
      adaptQuestion(question, questionIndex, section, direction)
    )
    const total = finite(section.totalMarks, null)
    return {
      id: String(section.id || `legacy_section_${sectionIndex + 1}`),
      sectionIndex: section.sectionNumber || sectionIndex + 1,
      title: String(section.title || section.heading || `Question ${sectionIndex + 1}`),
      titleUrdu: section.titleUrdu || null,
      heading: String(section.title || section.heading || ''),
      instructions: section.instructions || null,
      direction: directionFor(section.layout?.direction, direction),
      storedLegacyMarksValue: total,
      operationalSectionTotal: total,
      authoritativeSectionTotal: total,
      listedPotentialItemMarksTotal: nodes.reduce((sum, node) => sum + (finite(node.operationalNodeMarks, 0) || 0), 0),
      sectionMarksOrigin: total === null ? 'NONE' : 'LEGACY_SAVED_VALUE',
      attemptRule: 'ALL',
      attemptRuleOrigin: 'LEGACY_SAVED_VALUE',
      attemptCount: nodes.length,
      actualItemCount: nodes.length,
      formula: null,
      nodes,
    }
  })

  const totalMarks = finite(meta.totalMarks, sections.reduce((sum, section) => sum + (finite(section.operationalSectionTotal, 0) || 0), 0))
  const documentId = String(raw.id || `legacy_saved_${Date.now()}`)

  return {
    format: 'assps-canonical-paper',
    documentModel: 'PaperDocumentV2',
    schemaVersion: 3,
    id: documentId,
    name: raw.name || meta.title || 'Saved Paper',
    legacyAdapter: {
      sourceFormat: 'legacy-canvas-v2',
      sourcePaperId: documentId,
    },
    metadata: {
      title: meta.title || raw.name || 'Assessment Paper',
      paperCode: meta.paperCode || '',
      className: meta.className || meta.classLevel || '',
      classLevel: meta.classLevel || '',
      subject: meta.subject || meta.subjectName || '',
      subjectName: meta.subjectName || meta.subject || '',
      examType: meta.examType || '',
      session: meta.session || '',
      language,
      direction,
      durationMinutes: finite(meta.durationMinutes ?? meta.duration, null),
      timeAllowed: meta.timeAllowed || '',
      examDate: meta.examDate || '',
      generalInstructions: meta.instructions || meta.generalInstructions || '',
    },
    presentation: {
      schoolName: { value: meta.schoolName || null, origin: meta.schoolName ? 'SOURCE_EXPLICIT' : 'UNSET' },
      schoolAddress: { value: meta.schoolAddress || null, origin: meta.schoolAddress ? 'SOURCE_EXPLICIT' : 'UNSET' },
      logoUrl: { value: meta.logoUrl || null, origin: meta.logoUrl ? 'SOURCE_EXPLICIT' : 'UNSET' },
      templateId: raw.templateId || 'academic',
    },
    authority: {
      storedConfiguredTotal: totalMarks,
      originalTeacherHeaderTotal: totalMarks,
      authoritativePaperTotal: totalMarks,
      paperTotalOrigin: 'LEGACY_SAVED_VALUE',
      paperMarksStatus: 'RESOLVED_FROM_SOURCE',
      flags: {
        hasItemCountConflict: false,
        hasProvisionalMarks: false,
        hasSourceHeaderConflict: false,
        hasUnresolvedAttemptRule: false,
      },
      sourceTotalNote: 'Adapted from schemaVersion 2 saved paper',
      qaNotes: null,
    },
    sourceIdentity: {
      sourcePaperId: documentId,
      sourceDatasetGeneration: 'legacy-canvas-v2',
      sourceDatasetVersion: '2',
      adapter: 'adaptLegacyCanvasToCanonical',
    },
    sections,
    sourceCoverageLedger: [],
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    migrationAudit: {
      migrationBaselineCommit: null,
      migrationEngineVersion: 'legacy-canvas-adapter-v1',
    },
  }
}
