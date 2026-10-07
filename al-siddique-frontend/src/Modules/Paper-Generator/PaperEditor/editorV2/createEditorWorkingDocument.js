// createEditorWorkingDocument.js — Pure factory for PaperEditorWorkingDocument (Schema 3.2-W)
import {
  canonicalTextToTiptapDoc,
  computeCanonicalFingerprint,
} from './editorProjection.js'
import {
  getB3NodeEditability,
  B3_RENDER_STRATEGY,
} from './nodeRenderStrategy.js'
import { createEmptyStructuredState } from './structured/structuredNodeModel.js'

const EDITABLE_METADATA_KEYS = Object.freeze([
  'title',
  'paperCode',
  'className',
  'classLevel',
  'subject',
  'subjectName',
  'examType',
  'session',
  'durationMinutes',
  'timeAllowed',
  'examDate',
  'generalInstructions',
  'schoolAddress',
  'studentNameField',
  'rollNoField',
])

export function resolveSourcePaperTotal(canonicalDoc) {
  const authority = canonicalDoc?.authority || {}
  if (Number.isFinite(authority.authoritativePaperTotal)) return Number(authority.authoritativePaperTotal)
  if (
    Number.isFinite(authority.storedConfiguredTotal) &&
    authority.paperTotalOrigin !== 'UNRESOLVED_ZERO'
  ) {
    return Number(authority.storedConfiguredTotal)
  }
  if (Number.isFinite(authority.originalTeacherHeaderTotal)) return Number(authority.originalTeacherHeaderTotal)
  return null
}

export function createWorkingMetadata(canonicalDoc) {
  const source = canonicalDoc?.metadata || {}
  const values = {}
  for (const key of EDITABLE_METADATA_KEYS) {
    values[key] = source[key] ?? null
  }

  const sourceSchoolAddress = canonicalDoc?.presentation?.schoolAddress?.value
  values.schoolAddress = typeof sourceSchoolAddress === 'string' ? sourceSchoolAddress : null
  values.studentNameField = '__________________________'
  values.rollNoField = '__________'

  values.language = source.language || 'unknown'
  values.direction = source.direction || (values.language === 'urdu' ? 'rtl' : 'ltr')
  return {
    ...values,
    dirtyFields: {},
    customFields: [],
    customFieldsDirty: false,
    hiddenHeaderFields: [],
    hiddenHeaderFieldsDirty: false,
  }
}

/**
 * Determines the academic field name and initial text for an editable canonical node.
 */
function resolveNodeFieldInfo(node) {
  const type = node.type || node.nodeType

  if (type === 'rich_text') {
    return { fieldName: 'content', rawText: String(node.content || '') }
  }

  if (type === 'unknown_preserved') {
    return { fieldName: 'rawText', rawText: String(node.rawText || '') }
  }

  // Academic question nodes (short_question, long_question, mcq, essay, etc.)
  return { fieldName: 'stem', rawText: String(node.stemText || '') }
}

/**
 * Separates terminal marks evidence string to lock it outside the editable stem (Rule 22).
 */
function extractLockedMarksEvidence(node, rawText) {
  const evidence = node.marksEvidenceString
  if (typeof evidence === 'string' && evidence.length > 0 && rawText.endsWith(evidence)) {
    const editableText = rawText.slice(0, -evidence.length).trimEnd()
    return {
      editableText,
      lockedMarksEvidence: evidence,
    }
  }
  return {
    editableText: rawText,
    lockedMarksEvidence: null,
  }
}

/**
 * Creates an individual FieldOverlay for an editable academic field.
 */
export function createFieldOverlay(fieldName, editableText, direction = 'auto', lockedMarksEvidence = null) {
  const baselineRich = canonicalTextToTiptapDoc(editableText, direction)
  return {
    fieldName,
    baselinePlainText: editableText,
    baselineRich,
    workingPlainText: editableText,
    workingRich: baselineRich,
    isDirty: false,
    academicTextMutated: false,
    mutationState: 'PRISTINE',
    lockedMarksEvidence,
  }
}

/**
 * Creates a NodeOverlay for a canonical node.
 * For READ_ONLY_STRUCTURED nodes: editableFields = {} (Rule 5).
 * Does NOT duplicate full canonical snapshot or raw source ledger.
 */
export function createNodeOverlay(node) {
  const nodeType = node.type || node.nodeType
  const strategy = getB3NodeEditability(nodeType)
  const editableFields = {}

  if (strategy === B3_RENDER_STRATEGY.EDITABLE_RICH) {
    const { fieldName, rawText } = resolveNodeFieldInfo(node)
    const { editableText, lockedMarksEvidence } = extractLockedMarksEvidence(node, rawText)
    editableFields[fieldName] = createFieldOverlay(
      fieldName,
      editableText,
      node.direction || 'auto',
      lockedMarksEvidence
    )
  } else if (strategy === B3_RENDER_STRATEGY.EDITABLE_RAW) {
    const rawText = String(node.rawText || '')
    editableFields.rawText = createFieldOverlay(
      'rawText',
      rawText,
      node.direction || 'auto',
      null
    )
  }
  // READ_ONLY_STRUCTURED leaves editableFields = {} without creating dummy stem overlays

  const sourceNodeMarks = node.authoritativeNodeMarks ?? node.operationalNodeMarks ?? null

  return {
    nodeId: node.id,
    nodeType,
    direction: node.direction || 'auto',
    authoritativeNodeMarks: node.authoritativeNodeMarks ?? null,
    operationalNodeMarks: node.operationalNodeMarks ?? null,
    nodeMarksOrigin: node.nodeMarksOrigin || 'UNSTATED',
    workingNodeMarks: Number.isFinite(sourceNodeMarks) ? Number(sourceNodeMarks) : null,
    nodeMarksDirty: false,
    displayNumberOverride: null,
    displayNumberDirty: false,
    editableFields,
    provenance: {
      classificationCertainty: node.provenance?.classificationCertainty || 'UNKNOWN',
      sourceSegmentIds: Array.isArray(node.provenance?.sourceSegmentIds)
        ? [...node.provenance.sourceSegmentIds]
        : [],
      academicTextMutated: false,
      rawSourceSnapshot: node.provenance?.rawSourceSnapshot || null,
    },
  }
}

/**
 * Creates a WorkingSection overlay.
 * Section headings in B3 are READ-ONLY (Rule 20).
 */
export function createSectionOverlay(section) {
  const sourceSectionTotal = section.authoritativeSectionTotal ?? section.operationalSectionTotal ?? null
  return {
    id: section.id,
    sectionIndex: section.sectionIndex ?? 1,
    title: section.title || '',
    titleUrdu: section.titleUrdu || null,
    heading: section.heading || section.title || '',
    instructions: section.instructions || null,
    direction: section.direction || 'auto',
    authoritativeSectionTotal: section.authoritativeSectionTotal ?? null,
    operationalSectionTotal: section.operationalSectionTotal ?? null,
    workingSectionTotal: Number.isFinite(sourceSectionTotal) ? Number(sourceSectionTotal) : null,
    computedSectionTotal: null,
    sectionTotalMode: 'SOURCE',
    sectionMarksDirty: false,
    sectionMarksStatus: 'SOURCE',
    sectionMarksOrigin: section.sectionMarksOrigin || 'NONE',
    attemptRule: section.attemptRule || 'ALL',
    attemptRuleOrigin: section.attemptRuleOrigin || 'UNKNOWN',
    attemptCount: Number.isFinite(section.attemptCount) ? Number(section.attemptCount) : null,
    actualItemCount: Number.isFinite(section.actualItemCount) ? Number(section.actualItemCount) : null,
    formula: section.formula || null,
    sectionTextDirty: {
      title: false,
      instructions: false,
    },
    layout: {
      layoutMode: section.layout?.layoutMode || 'compact-grid',
      columns: section.layout?.columns || 4,
      borderStyle: section.layout?.borderStyle || 'none',
      showMarksBadge: true,
    },
    nodeOverlays: Array.isArray(section.nodes)
      ? section.nodes.map(n => createNodeOverlay(n))
      : [],
  }
}

/**
 * Creates a PaperEditorWorkingDocument from an immutable canonical PaperDocumentV2.
 * Canonical language/direction origin is canonicalDoc.metadata (Rule 16).
 * The canonicalDoc remains the immutable baseline truth.
 */
export function createEditorWorkingDocument(canonicalDoc) {
  if (!canonicalDoc || typeof canonicalDoc !== 'object') {
    throw new Error('createEditorWorkingDocument requires a valid canonical PaperDocument object');
  }

  const baseFingerprint = computeCanonicalFingerprint(canonicalDoc)
  const workingDocumentId = `workdoc__${canonicalDoc.id}`

  // Canonical B2 language/direction live under metadata (Rule 16)
  const lang = canonicalDoc.metadata?.language || 'unknown'
  let dir = canonicalDoc.metadata?.direction || (lang === 'urdu' ? 'rtl' : 'ltr')
  if (dir === 'dual') dir = 'ltr'

  return {
    documentModel: 'PaperEditorWorkingDocument',
    workingFormat: 'assps-working-paper',
    schemaVersion: 3,
    workingVersion: '3.2.0',
    workingDocumentId,
    baseCanonicalDocumentId: canonicalDoc.id,
    baseFingerprint,
    sourceIdentity: Object.freeze({ ...(canonicalDoc.sourceIdentity || {}) }),
    metadata: createWorkingMetadata(canonicalDoc),
    marks: {
      sourcePaperTotal: resolveSourcePaperTotal(canonicalDoc),
      paperTotalMode: 'SOURCE',
      manualPaperTotal: null,
      computedPaperTotal: null,
      paperMarksDirty: false,
      paperMarksStatus: 'SOURCE',
    },
    presentation: {
      isDirty: false,
      templateId: canonicalDoc.presentation?.templateId || 'academic',
      zoomLevel: 100,
      pageBorder: 'none',
      sectionLayoutOverrides: {},
      answerLinesByNode: {},
      structuredFieldStyles: {},
      headerFieldStyles: {},
      headerTemplate: null,
      printMode: 'a4',
      language: lang,
      direction: dir,
    },
    sections: Array.isArray(canonicalDoc.sections)
      ? canonicalDoc.sections.map(s => createSectionOverlay(s))
      : [],
    structured: createEmptyStructuredState(),
    session: {
      isDirty: false,
      editMode: true,
      activeFieldKey: null,
      activeStructuredControlKey: null,
      activeInteractionMode: 'NONE',
      revisionToken: 1,
      structuralRevisionToken: 1,
    },
  }
}
