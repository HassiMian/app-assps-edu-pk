import {
  AttemptRule,
  AttemptRuleOrigin,
  ClassificationCertainty,
  DocumentDirection,
  DocumentLanguage,
  DocumentOrigin,
  FieldProvenanceOrigin,
  NodeMarksOrigin,
  PaperMarksStatus,
  PaperTotalOrigin,
  SectionMarksOrigin,
  createCanonicalPaperDocument,
  createCanonicalSection,
  createProvenanceField,
  createRichTextNode,
  validateCanonicalPaperDocument,
} from '../../PaperEditor/core/PaperDocumentV2.js'
import { resolveSectionTotalMarks } from '../../paperSystemRules.js'

const text = value => String(value ?? '').trim()
const finiteMarks = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
const clone = value => JSON.parse(JSON.stringify(value))

function languageOf(value) {
  if (value === 'urdu') return DocumentLanguage.URDU
  if (value === 'dual') return DocumentLanguage.DUAL
  return DocumentLanguage.ENGLISH
}

function directionOf(language) {
  return language === DocumentLanguage.URDU ? DocumentDirection.RTL
    : language === DocumentLanguage.ENGLISH ? DocumentDirection.LTR
      : DocumentDirection.AUTO
}

export function createManualAssessmentDocument({ paper = {}, config = {}, paperSettings = {} } = {}) {
  const language = languageOf(config.language)
  const direction = directionOf(language)
  const sections = Array.isArray(paper.official_section) ? paper.official_section : []
  const canonicalSections = sections.map((section, index) => {
    const marks = finiteMarks(resolveSectionTotalMarks(section))
    const nodeId = `manual-node-${text(section.id) || index + 1}`
    const sectionId = `manual-section-${text(section.id) || index + 1}`
    const body = text(section.content)
    const heading = text(section.heading || section.text || section.textUrdu)
    return createCanonicalSection({
      id: sectionId,
      sectionIndex: index + 1,
      title: heading || `Question ${index + 1}`,
      heading: heading || null,
      instructions: text(section.instructions) || null,
      direction,
      storedLegacyMarksValue: null,
      operationalSectionTotal: marks,
      authoritativeSectionTotal: marks,
      sectionMarksOrigin: SectionMarksOrigin.TEACHER_EXPLICIT_SCALAR,
      listedPotentialItemMarksTotal: marks,
      attemptRule: AttemptRule.ALL,
      attemptRuleOrigin: AttemptRuleOrigin.TEACHER_EXPLICIT,
      attemptCount: 1,
      actualItemCount: 1,
      nodes: [createRichTextNode({
        id: nodeId,
        content: body,
        direction,
        operationalNodeMarks: marks,
        authoritativeNodeMarks: marks,
        nodeMarksOrigin: NodeMarksOrigin.ITEM_LEVEL_EXPLICIT,
        marksEvidenceString: marks ? String(marks) : null,
        provenance: {
          classificationCertainty: ClassificationCertainty.EXPLICIT,
          academicTextMutated: true,
          sourceSegmentIds: [],
          rawSourceSnapshot: null,
        },
      })],
      provenance: { sourceSectionId: null, sourceSegmentIds: [] },
    })
  })

  const questionTotal = canonicalSections.reduce((sum, section) => sum + finiteMarks(section.operationalSectionTotal), 0)
  const configuredTotal = finiteMarks(config.totalMarks)
  const hasExplicitTotal = configuredTotal > 0
  const balanced = hasExplicitTotal ? configuredTotal === questionTotal : questionTotal > 0
  const effectiveTotal = hasExplicitTotal ? configuredTotal : questionTotal
  const id = text(paper.id) || text(paper.clientDraftId) || `manual-${text(config.classLevel) || 'class'}-${text(config.subjectName || config.subject) || 'subject'}`

  const doc = createCanonicalPaperDocument({
    documentOrigin: DocumentOrigin.USER_AUTHORED,
    id,
    metadata: {
      title: text(config.title) || 'Weekly Assessment',
      paperCode: text(config.paperCode) || null,
      className: text(config.className || config.classLevel) || null,
      classLevel: text(config.classLevel || config.className) || null,
      subject: text(config.subject || config.subjectName) || null,
      subjectName: text(config.subjectName || config.subject) || null,
      examType: text(config.examType) || 'Weekly Assessment',
      session: text(config.session) || null,
      language,
      direction,
      timeAllowed: text(config.timeAllowed) || null,
      examDate: text(config.examDate) || null,
      generalInstructions: text(config.generalInstructions) || null,
    },
    presentation: {
      schoolName: createProvenanceField(text(paperSettings.schoolName) || null, FieldProvenanceOrigin.TENANT_DEFAULT),
      schoolAddress: createProvenanceField(text(config.address || paperSettings.address) || null, FieldProvenanceOrigin.TENANT_DEFAULT),
      logoUrl: createProvenanceField(text(paperSettings.logo) || null, FieldProvenanceOrigin.TENANT_DEFAULT),
    },
    authority: {
      storedConfiguredTotal: hasExplicitTotal ? configuredTotal : null,
      originalTeacherHeaderTotal: hasExplicitTotal ? configuredTotal : null,
      authoritativePaperTotal: effectiveTotal,
      paperTotalOrigin: hasExplicitTotal ? PaperTotalOrigin.TEACHER_EXPLICIT : PaperTotalOrigin.DERIVED_FROM_EXPLICIT_SECTION_EVIDENCE,
      paperMarksStatus: balanced ? PaperMarksStatus.BALANCED_EXPLICIT : PaperMarksStatus.SOURCE_TOTAL_CONFLICT,
      flags: {
        hasItemCountConflict: false,
        hasProvisionalMarks: false,
        hasSourceHeaderConflict: hasExplicitTotal && !balanced,
        hasUnresolvedAttemptRule: false,
      },
      sourceTotalNote: null,
      qaNotes: null,
    },
    sourceIdentity: null,
    sections: canonicalSections,
    sourceCoverageLedger: [],
    createdAt: paper.createdAt || null,
    updatedAt: new Date().toISOString(),
  })

  doc.assessment = {
    creationMode: 'MANUAL',
    assessmentType: text(paper.assessmentType || config.assessmentType || config.examType) || 'Weekly Assessment',
    scope: {
      label: text(paper.scope?.label || config.scopeLabel) || null,
      chapterId: paper.scope?.chapterId || null,
      learningScopeIds: Array.isArray(paper.scope?.learningScopeIds) ? [...paper.scope.learningScopeIds] : [],
    },
  }
  doc.scoringPlan = {
    version: 1,
    strategy: 'ALL_SECTIONS',
    maximumObtainableMarks: effectiveTotal,
    questionMarksTotal: questionTotal,
    balanced,
    choiceGroups: [],
  }
  return doc
}

export function validateManualAssessmentForRelease(doc) {
  const canonical = validateCanonicalPaperDocument(doc)
  const errors = [...canonical.errors]
  if (doc?.documentOrigin !== DocumentOrigin.USER_AUTHORED) errors.push('Manual assessment must be USER_AUTHORED')
  if (!Array.isArray(doc?.sections) || doc.sections.length === 0) errors.push('At least one assessment section is required before finalization')
  if (!doc?.scoringPlan?.balanced) errors.push('Scoring plan must be balanced before finalization')
  if (!(Number(doc?.scoringPlan?.maximumObtainableMarks) > 0)) errors.push('Maximum obtainable marks must be greater than zero')
  return { valid: errors.length === 0, errors }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  return value
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(stable(value)))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function createAssessmentRelease(doc, { rendererVersion = 'manual-weekly-v1' } = {}) {
  const check = validateManualAssessmentForRelease(doc)
  if (!check.valid) throw new Error(`ASSESSMENT_RELEASE_BLOCKED: ${check.errors.join(' | ')}`)
  const snapshot = clone(doc)
  const contentHash = await sha256Hex(snapshot)
  const releasedAt = new Date().toISOString()
  return {
    releaseVersion: 1,
    releaseId: `release-${text(doc.id)}-${releasedAt.replace(/[^0-9]/g, '')}`,
    status: 'FINALIZED',
    paperDocumentId: doc.id,
    contentHashAlgorithm: 'SHA-256',
    contentHash,
    rendererVersion,
    releasedAt,
    snapshot,
  }
}


export function mergeServerDocumentIntoLocalPaper(localPaper = {}, doc = {}, serverMeta = {}) {
  const sections = Array.isArray(doc?.sections) ? doc.sections : []
  const officialSections = sections.map((section, index) => ({
    id: String(section.id || `server-section-${index + 1}`).replace(/^manual-section-/, ''),
    heading: section.heading || section.title || `Question ${index + 1}`,
    instructions: section.instructions || '',
    content: section.nodes?.map(node => node.content || '').filter(Boolean).join('\n') || '',
    marks: finiteMarks(section.operationalSectionTotal ?? section.authoritativeSectionTotal),
  }))
  return {
    ...localPaper,
    canonicalDocument: clone(doc),
    official_section: officialSections,
    official_section_marks: finiteMarks(doc?.scoringPlan?.questionMarksTotal),
    assessmentType: doc?.assessment?.assessmentType || localPaper.assessmentType,
    scope: clone(doc?.assessment?.scope || localPaper.scope || {}),
    config: {
      ...(localPaper.config || {}),
      title: doc?.metadata?.title || localPaper.config?.title || '',
      examType: doc?.metadata?.examType || localPaper.config?.examType || '',
      classLevel: doc?.metadata?.classLevel || localPaper.config?.classLevel || '',
      className: doc?.metadata?.className || localPaper.config?.className || '',
      subject: doc?.metadata?.subject || localPaper.config?.subject || '',
      subjectName: doc?.metadata?.subjectName || localPaper.config?.subjectName || '',
      totalMarks: finiteMarks(doc?.scoringPlan?.maximumObtainableMarks),
      language: String(doc?.metadata?.language || localPaper.config?.language || 'english').toLowerCase(),
      session: doc?.metadata?.session || localPaper.config?.session || '',
      timeAllowed: doc?.metadata?.timeAllowed || localPaper.config?.timeAllowed || '',
      examDate: doc?.metadata?.examDate || localPaper.config?.examDate || '',
    },
    serverRevision: Number(serverMeta.current_revision ?? serverMeta.currentRevision ?? localPaper.serverRevision ?? 0),
    serverContentHash: serverMeta.content_hash || serverMeta.contentHash || localPaper.serverContentHash || null,
    persistenceAuthority: 'SERVER_REVISION_SOURCE_OF_TRUTH',
    persistenceMode: 'ONLINE',
  }
}
