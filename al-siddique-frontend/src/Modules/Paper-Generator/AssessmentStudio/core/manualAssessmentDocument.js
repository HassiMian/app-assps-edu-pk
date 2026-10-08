import {
  AttemptRule,
  AttemptRuleOrigin,
  ClassificationCertainty,
  ContentCapability,
  MathSourceFormat,
  DocumentDirection,
  DocumentLanguage,
  DocumentOrigin,
  FieldProvenanceOrigin,
  NodeMarksOrigin,
  PaperMarksStatus,
  PaperTotalOrigin,
  SectionMarksOrigin,
  createCanonicalPaperDocument,
  createCanonicalAsset,
  createCanonicalSection,
  createProvenanceField,
  createRichTextNode,
  createShortQuestionNode,
  createLongQuestionNode,
  createGrammarTableNode,
  createMatchingColumnsNode,
  validateCanonicalPaperDocument,
} from '../../PaperEditor/core/PaperDocumentV2.js'
import { DEFAULT_BLOCK_REGISTRY, normalizeNodeForBlockRegistry } from './BlockRegistry.js'
import { resolveSectionTotalMarks } from '../../paperSystemRules.js'
import { buildManualScoringPlan, resolveManualSectionScoring } from '../../PaperEditor/core/ScoringPlan.js'
import { sanitizeInlineHtml } from '../../inlineHtmlSanitizer.js'

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

function parseTableRows(content = '') {
  return String(content).split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
    const parts=line.split('|').map(x=>x.trim())
    return { leftText:parts[0]||'', rightText:parts.slice(1).join(' | ')||'', leftIsBlank:false, rightIsBlank:false }
  })
}

function assetFromSection(section = {}) {
  const asset=section.asset
  if(!asset || typeof asset!=='object' || !text(asset.id)) return null
  return createCanonicalAsset(asset)
}

function nodeFromSection(section,{ nodeId, body, direction, marks }) {
  const layout=String(section.layoutPreset||'auto').toLowerCase()
  const capabilities=[]
  if(layout==='math') capabilities.push(ContentCapability.MATH)
  if(layout==='image') capabilities.push(ContentCapability.IMAGE)
  const base={
    id:nodeId, direction, operationalNodeMarks:marks, authoritativeNodeMarks:marks,
    nodeMarksOrigin:NodeMarksOrigin.ITEM_LEVEL_EXPLICIT, marksEvidenceString:marks?String(marks):null,
    ...(capabilities.length?{contentCapabilities:capabilities}:{}),
    ...(layout==='math'?{math:{format:section.math?.format||MathSourceFormat.LATEX,source:text(section.math?.source),display:section.math?.display==='inline'?'inline':'block'}}:{}),
    ...(layout==='image'&&text(section.asset?.id)?{assetRefs:[text(section.asset.id)]}:{}),
    provenance:{ classificationCertainty:ClassificationCertainty.EXPLICIT, academicTextMutated:true, sourceSegmentIds:[], rawSourceSnapshot:null },
  }
  if(layout==='math') return createShortQuestionNode({ ...base, stemText:body })
  if(layout==='image') return createRichTextNode({ ...base, content:body })
  if(layout==='short') return createShortQuestionNode({ ...base, stemText:body })
  if(layout==='long') return createLongQuestionNode({ ...base, stemText:body })
  if(layout==='matching') return createMatchingColumnsNode({
    ...base,
    leftItems:parseTableRows(body).map((row,i)=>({id:`${nodeId}-l${i+1}`,text:row.leftText})),
    rightItems:parseTableRows(body).map((row,i)=>({id:`${nodeId}-r${i+1}`,text:row.rightText})),
    correctMappings:null,
  })
  if(layout==='table' || layout==='pair_table' || layout==='sentence_usage') return createGrammarTableNode({
    ...base,
    tableSemantic:section.tablePurpose||section.tableSemantic||(layout==='sentence_usage'?'sentence_usage':'answer_table'),
    columns:Array.isArray(section.tableHeaders)&&section.tableHeaders.length?section.tableHeaders:['Column A','Column B'],
    rows:parseTableRows(body),
  })
  return createRichTextNode({ ...base, content:body })
}

export function createManualAssessmentDocument({ paper = {}, config = {}, paperSettings = {} } = {}) {
  const language = languageOf(config.language)
  const direction = directionOf(language)
  const sections = Array.isArray(paper.official_section) ? paper.official_section : []
  const assetMap=new Map()
  sections.forEach(section=>{const asset=assetFromSection(section);if(asset) assetMap.set(asset.id,asset)})
  const canonicalAssets=[...assetMap.values()]
  const sectionScoring = sections.map((section, index) => resolveManualSectionScoring(section, finiteMarks(resolveSectionTotalMarks(section)), index))
  const canonicalSections = sections.map((section, index) => {
    const scoring = sectionScoring[index]
    const marks = finiteMarks(scoring.maximumObtainableMarks)
    const nodeId = `manual-node-${text(section.id) || index + 1}`
    const sectionId = `manual-section-${text(section.id) || index + 1}`
    const body = text(section.content)
    const heading = text(section.heading || section.text || section.textUrdu)
    const edited = section.richText && typeof section.richText === 'object' ? section.richText : {}
    const serialHtml = typeof edited.questionSerial === 'string' ? sanitizeInlineHtml(edited.questionSerial.slice(0,16000)) : ''
    const instructionHtml = typeof edited.headingInstruction === 'string' ? sanitizeInlineHtml(edited.headingInstruction.slice(0,16000)) : ''
    return createCanonicalSection({
      ...(serialHtml || instructionHtml ? { headingFormatting:{questionSerial:serialHtml,headingInstruction:instructionHtml} } : {}),
      id: sectionId,
      sectionIndex: index + 1,
      title: heading || `Question ${index + 1}`,
      heading: heading || null,
      instructions: text(section.instructions) || null,
      direction,
      storedLegacyMarksValue: null,
      operationalSectionTotal: marks,
      authoritativeSectionTotal: marks,
      sectionMarksOrigin: scoring.attemptRule === AttemptRule.ALL
        ? SectionMarksOrigin.TEACHER_EXPLICIT_SCALAR
        : SectionMarksOrigin.TEACHER_EXPLICIT_FORMULA,
      listedPotentialItemMarksTotal: finiteMarks(scoring.listedPotentialItemMarksTotal),
      attemptRule: scoring.attemptRule,
      attemptRuleOrigin: scoring.attemptRuleOrigin,
      attemptCount: scoring.attemptCount,
      actualItemCount: scoring.actualItemCount,
      formula: scoring.choiceGroup ? clone(scoring.choiceGroup) : null,
      nodes: [normalizeNodeForBlockRegistry(nodeFromSection(section,{ nodeId, body, direction, marks }), DEFAULT_BLOCK_REGISTRY)],
      provenance: { sourceSectionId: null, sourceSegmentIds: [] },
    })
  })

  const configuredTotal = finiteMarks(config.totalMarks)
  const scoringPlan = buildManualScoringPlan(sectionScoring, configuredTotal)
  const questionTotal = scoringPlan.maximumObtainableMarks
  const hasExplicitTotal = configuredTotal > 0
  const headerBalanced = scoringPlan.headerBalanced
  const balanced = scoringPlan.balanced
  const effectiveTotal = questionTotal
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
      paperTotalOrigin: hasExplicitTotal && headerBalanced
        ? PaperTotalOrigin.TEACHER_EXPLICIT
        : (hasExplicitTotal ? PaperTotalOrigin.CORRECTED_FROM_CONFLICTING_SOURCE_HEADER : PaperTotalOrigin.DERIVED_FROM_EXPLICIT_SECTION_EVIDENCE),
      paperMarksStatus: scoringPlan.errors.length
        ? PaperMarksStatus.MIXED_EXPLICIT_AND_UNRESOLVED
        : (balanced ? PaperMarksStatus.BALANCED_EXPLICIT : PaperMarksStatus.SOURCE_TOTAL_CONFLICT),
      flags: {
        hasItemCountConflict: scoringPlan.errors.some(error => /item count|attempt count/i.test(error)),
        hasProvisionalMarks: false,
        hasSourceHeaderConflict: hasExplicitTotal && !headerBalanced,
        hasUnresolvedAttemptRule: scoringPlan.errors.length > 0,
      },
      sourceTotalNote: null,
      qaNotes: null,
    },
    sourceIdentity: null,
    assets: canonicalAssets,
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
    ...scoringPlan,
    maximumObtainableMarks: questionTotal,
    questionMarksTotal: questionTotal,
  }
  return doc
}

export function validateManualAssessmentForRelease(doc) {
  const canonical = validateCanonicalPaperDocument(doc)
  const errors = [...canonical.errors]
  if (doc?.documentOrigin !== DocumentOrigin.USER_AUTHORED) errors.push('Manual assessment must be USER_AUTHORED')
  if (!Array.isArray(doc?.sections) || doc.sections.length === 0) errors.push('At least one assessment section is required before finalization')
  if (!doc?.scoringPlan?.balanced) errors.push('Scoring plan must be balanced before finalization')
  for (const scoringError of (doc?.scoringPlan?.errors || [])) errors.push(scoringError)
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
    // The first typed canonical node remains authoritative after reopening.
    // Do not silently downgrade short/long or asset/math blocks to plain text.
    layoutPreset:section.nodes?.[0]?.contentCapabilities?.includes(ContentCapability.MATH) ? 'math'
      : section.nodes?.[0]?.contentCapabilities?.includes(ContentCapability.IMAGE) ? 'image'
        : ({short_question:'short',long_question:'long',matching_columns:'matching',grammar_table:'table'}[section.nodes?.[0]?.type] || 'auto'),
    ...(section.nodes?.[0]?.math ? {math:clone(section.nodes[0].math)} : {}),
    ...(section.nodes?.[0]?.assetRefs?.[0] ? {asset:clone((doc.assets||[]).find(asset=>asset.id===section.nodes[0].assetRefs[0])||{})} : {}),
    id: String(section.id || `server-section-${index + 1}`).replace(/^manual-section-/, ''),
    heading: section.heading || section.title || `Question ${index + 1}`,
    instructions: section.instructions || '',
    // Server-authored revision is authoritative. Never reapply stale local
    // richText when this revision has no headingFormatting.
    ...(section.headingFormatting ? { richText:{
      questionSerial:sanitizeInlineHtml(section.headingFormatting.questionSerial || ''),
      headingInstruction:sanitizeInlineHtml(section.headingFormatting.headingInstruction || ''),
    }} : {}),
    content: section.nodes?.map(node => node.content || node.stemText || node.rawText || '').filter(Boolean).join('\n') || '',
    marks: finiteMarks(section.operationalSectionTotal ?? section.authoritativeSectionTotal),
    attemptRule: section.attemptRule || AttemptRule.ALL,
    attemptCount: Number.isInteger(section.attemptCount) ? section.attemptCount : null,
    actualItemCount: Number.isInteger(section.actualItemCount) ? section.actualItemCount : null,
    marksPerItem: finiteMarks(section.formula?.marksPerItem) || null,
    maximumObtainableMarks: finiteMarks(section.operationalSectionTotal ?? section.authoritativeSectionTotal),
    listedPotentialItemMarksTotal: finiteMarks(section.listedPotentialItemMarksTotal),
    choiceGroupId: text(section.formula?.id) || null,
    nestedChoiceMode: Array.isArray(section.formula?.children) && section.formula.children.length ? (section.formula?.mode || 'ALL') : null,
    choiceGroups: Array.isArray(section.formula?.children) ? clone(section.formula.children) : [],
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
