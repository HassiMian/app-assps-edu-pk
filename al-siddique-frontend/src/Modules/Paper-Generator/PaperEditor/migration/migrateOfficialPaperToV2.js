// migrateOfficialPaperToV2.js — Lossless V13 to Canonical PaperDocument V2 migration engine
// migrateOfficialPaperToV2.js — Lossless V13 to Canonical PaperDocument V2 migration engine
import { DocumentLanguage, DocumentDirection, FieldProvenanceOrigin, CoverageStatus, NodeMarksOrigin, SectionMarksOrigin, ClassificationCertainty, CanonicalNodeType, createCanonicalPaperDocument, createCanonicalSection, createSectionBannerNode, createUnknownPreservedNode, validateCanonicalPaperDocument } from '../core/PaperDocumentV2.js';

import {
  createCoverageSegment,
  verifyFieldCoverageInvariants,
} from './sourceCoverage.js'

import { parseMcqSection } from './semanticParsers/parseMcqSection.js'
import { parseQuestionList } from './semanticParsers/parseQuestionList.js'
import { parseTables } from './semanticParsers/parseTables.js'
import { parseFillBlanks } from './semanticParsers/parseFillBlanks.js'
import { parseTrueFalse } from './semanticParsers/parseTrueFalse.js'
import { parseVerticalMath } from './semanticParsers/parseVerticalMath.js'
import { inferOfficialSectionKind } from '../../officialSectionSemantics.js'

export const MIGRATION_ENGINE_VERSION = '2.0.0-b2'
export const MIGRATION_BASELINE_COMMIT = '6eea6773d3cf8166aee3ef80a7acc3a71847ea2c'

export const DEFAULT_V13_DATASET_VERSION = 'MASTER_AGENT_PROMPT_ALL_CLASSES_FINAL_V13_NATIVE_EDITOR_V13'
export const DEFAULT_V13_DECLARED_SHA256 = '6669abfe216eb1be8cef7cee97663db25dbb91bfc949b4d078e29139dc73e692'
export const DEFAULT_V13_BYTE_SHA256 = '5e659e9ce9d8bba5003bfd4e1e54dceaeddec2aac7ce52a07adee7f165757214'
export const DEFAULT_MANIFEST_BYTE_SHA256 = 'f40cf8a5ae627ba32924f19dd6b9bc6172ed61d9b46654ff9084ae9e395095d4'
export const DEFAULT_MANIFEST_VERSION = '1.0.0'

/**
 * Determines whether a canonical node is an eligible academic question node
 * for receiving marks.
 */
function isAcademicQuestionNode(node) {
  if (!node || !node.type) return false
  if (
    node.type === CanonicalNodeType.SCOPE_HEADER ||
    node.type === CanonicalNodeType.SECTION_BANNER ||
    node.type === CanonicalNodeType.UNKNOWN_PRESERVED
  ) {
    return false
  }
  if (node.type === CanonicalNodeType.RICH_TEXT && node.layoutSemantic !== 'vertical-math-grid') {
    return false
  }
  return true
}

/**
 * Migrates a single official V13 paper and its B1 normalization manifest entry
 * into a fully structured, canonical PaperDocument V2 with complete source coverage.
 *
 * @param {object} v13Paper
 * @param {object} manifestPaper
 * @param {object} [migrationContext]
 * @returns {object} Validated Canonical PaperDocument V2
 */
export function migrateOfficialPaperToV2(v13Paper, manifestPaper, migrationContext = {}) {
  if (!v13Paper || !manifestPaper) {
    throw new Error('Both v13Paper and manifestPaper are required for migration')
  }

  if (v13Paper.id !== manifestPaper.paperId) {
    throw new Error(`Paper ID mismatch: v13=${v13Paper.id}, manifest=${manifestPaper.paperId}`)
  }

  const paperId = v13Paper.id
  const docId = `doc__${paperId}`

  // Metadata mapping — preserve source, no default invention
  const cfg = v13Paper.config || {}
  const language = cfg.language || DocumentLanguage.UNKNOWN
  const docDirection =
    language === DocumentLanguage.URDU
      ? DocumentDirection.RTL
      : language === DocumentLanguage.ENGLISH
        ? DocumentDirection.LTR
        : DocumentDirection.AUTO

  const metadata = {
    title: cfg.title || null,
    paperCode: cfg.paperCode || null,
    className: cfg.className || null,
    classLevel: cfg.classLevel || null,
    subject: cfg.subject || manifestPaper.subject || null,
    subjectName: cfg.subjectName || null,
    examType: cfg.examType || null,
    session: cfg.session || null,
    language,
    direction: docDirection,
    durationMinutes: Number.isFinite(cfg.durationMinutes) ? cfg.durationMinutes : null,
    timeAllowed: cfg.timeAllowed || null,
    examDate: cfg.examDate || null,
    generalInstructions: cfg.instructions || null,
  }

  // Presentation — field-level provenance, default UNSET in B2
  const presentation = {
    schoolName: { value: null, origin: FieldProvenanceOrigin.UNSET },
    schoolAddress: { value: null, origin: FieldProvenanceOrigin.UNSET },
    logoUrl: { value: null, origin: FieldProvenanceOrigin.UNSET },
  }

  // Authority — exact import from B1 normalization manifest
  const authority = {
    storedConfiguredTotal: Number.isFinite(manifestPaper.storedConfiguredTotal)
      ? manifestPaper.storedConfiguredTotal
      : null,
    originalTeacherHeaderTotal: Number.isFinite(manifestPaper.originalTeacherHeaderTotal)
      ? manifestPaper.originalTeacherHeaderTotal
      : null,
    authoritativePaperTotal: Number.isFinite(manifestPaper.authoritativePaperTotal)
      ? manifestPaper.authoritativePaperTotal
      : null,
    paperTotalOrigin: manifestPaper.paperTotalOrigin,
    paperMarksStatus: manifestPaper.paperMarksStatus,
    flags: {
      hasItemCountConflict: Boolean(manifestPaper.hasItemCountConflict),
      hasProvisionalMarks: Boolean(manifestPaper.hasProvisionalMarks),
      hasSourceHeaderConflict: Boolean(manifestPaper.hasSourceHeaderConflict),
      hasUnresolvedAttemptRule: Boolean(manifestPaper.hasUnresolvedAttemptRule),
    },
    sourceTotalNote: manifestPaper.sourceTotalNote || null,
    qaNotes: manifestPaper.qaNotes || null,
  }

  const sections = []
  const docCoverageLedger = []
  const globalNodeIds = new Set()

  const v13Sections = v13Paper.official_section || []

  v13Sections.forEach((sourceSec, sIdx) => {
    const sIndexNum = sIdx + 1
    const sNumStr = String(sIndexNum).padStart(2, '0')
    const canonicalSectionId = `${paperId}__s${sNumStr}`

    // Match manifest section record
    const manifestSec = (manifestPaper.sections || []).find(ms => ms.sectionId === sourceSec.id)
    if (!manifestSec) {
      throw new Error(`Manifest record missing for section ${sourceSec.id} in paper ${paperId}`)
    }

    const secHeading = typeof sourceSec.heading === 'string' ? sourceSec.heading : ''
    const secContent = typeof sourceSec.content === 'string' ? sourceSec.content : ''

    const secDirection =
      sourceSec.medium === 'urdu'
        ? DocumentDirection.RTL
        : sourceSec.medium === 'english'
          ? DocumentDirection.LTR
          : docDirection

    // 1. Decide whether the academic prompt lives entirely in the heading.
    // Some official papers store the complete question (essay/application/definition/etc.)
    // in heading while content is intentionally empty. Those must become canonical nodes,
    // not disappear as metadata-only sections.
    const inferredKind = inferOfficialSectionKind(sourceSec)
    const headingOnlyAcademic = Boolean(
      secHeading.trim() &&
      !secContent.trim() &&
      inferredKind !== 'marker'
    )

    // 2. Semantic parsing from the authoritative source field.
    const parser = selectParserForSection(sourceSec, v13Paper)
    const parserSource = headingOnlyAcademic ? secHeading : secContent
    let parsedItems = parser(parserSource, {
      sectionId: canonicalSectionId,
      sourceSectionId: sourceSec.id,
      paperId,
      direction: secDirection,
      heading: secHeading,
      marks: manifestSec.operationalSectionTotal,
      formula: manifestSec.explicitHeadingFormula,
      attemptRule: manifestSec.attemptRule,
      attemptCount: manifestSec.attemptCount,
    })

    if (headingOnlyAcademic) {
      // Remove presentation-only numbering/marks from the editable stem while preserving
      // the exact source in provenance/coverage. This is not an academic rewrite.
      parsedItems = parsedItems.map(item => {
        if (!item?.node) return item
        const node = { ...item.node }
        if (typeof node.stemText === 'string') {
          node.stemText = node.stemText
            .replace(/^\s*سوال\s*نمبر\s*\d+\s*[:.)-]?\s*/i, '')
            .replace(/\s*\(\s*\d+\s*(?:Marks?|نمبر)?\s*\)\s*$/i, '')
            .trim()
        }
        return { ...item, node }
      })
    }

    // 3. Gapless stitching against the field that actually contains the academic text.
    const stitched = stitchItemsToFullCoverage(
      parsedItems,
      parserSource,
      canonicalSectionId,
      sourceSec.id,
      secDirection,
      globalNodeIds,
      manifestSec,
      headingOnlyAcademic ? 'heading' : 'content'
    )

    // 4. Verify source-field coverage invariants.
    const primaryInvariants = verifyFieldCoverageInvariants(parserSource, stitched.segments)
    if (!primaryInvariants.valid) {
      throw new Error(
        `${headingOnlyAcademic ? 'Heading' : 'Content'} coverage invariant violation in ${sourceSec.id}: ${primaryInvariants.errors.join('; ')}`
      )
    }
    stitched.segments.forEach(seg => docCoverageLedger.push(seg))

    let headingSegId = null
    const extraSectionSegmentIds = []

    if (headingOnlyAcademic) {
      // The heading is already fully covered by the academic node(s). Preserve the empty
      // content field separately so both original source fields remain losslessly audited.
      const emptyContentSeg = createCoverageSegment({
        sourceSectionId: sourceSec.id,
        sourceField: 'content',
        sourceSegmentId: `${canonicalSectionId}__c_empty`,
        startOffset: 0,
        endOffset: 0,
        rawSourceSnapshot: '',
        targetCanonicalIds: [canonicalSectionId],
        coverageStatus: CoverageStatus.METADATA_ONLY,
      })
      const cInvariants = verifyFieldCoverageInvariants(secContent, [emptyContentSeg])
      if (!cInvariants.valid) {
        throw new Error(
          `Content coverage invariant violation in ${sourceSec.id}: ${cInvariants.errors.join('; ')}`
        )
      }
      docCoverageLedger.push(emptyContentSeg)
      extraSectionSegmentIds.push(emptyContentSeg.sourceSegmentId)
    } else {
      headingSegId = `${canonicalSectionId}__h_seg01`
      const headingCoverageSeg = createCoverageSegment({
        sourceSectionId: sourceSec.id,
        sourceField: 'heading',
        sourceSegmentId: headingSegId,
        startOffset: 0,
        endOffset: secHeading.length,
        rawSourceSnapshot: secHeading,
        targetCanonicalIds: [canonicalSectionId],
        coverageStatus: secHeading.length > 0 ? CoverageStatus.STRUCTURED : CoverageStatus.METADATA_ONLY,
      })
      const hInvariants = verifyFieldCoverageInvariants(secHeading, [headingCoverageSeg])
      if (!hInvariants.valid) {
        throw new Error(
          `Heading coverage invariant violation in ${sourceSec.id}: ${hInvariants.errors.join('; ')}`
        )
      }
      docCoverageLedger.push(headingCoverageSeg)
      extraSectionSegmentIds.push(headingSegId)
    }

    // 5. Construct Canonical Section
    const section = createCanonicalSection({
      id: canonicalSectionId,
      sectionIndex: sIndexNum,
      title: headingOnlyAcademic ? null : (secHeading || null),
      titleUrdu: headingOnlyAcademic ? null : (secDirection === DocumentDirection.RTL ? secHeading : null),
      heading: headingOnlyAcademic ? null : (secHeading || null),
      instructions: null,
      direction: secDirection,
      storedLegacyMarksValue: manifestSec.storedLegacyMarksValue,
      operationalSectionTotal: manifestSec.operationalSectionTotal,
      authoritativeSectionTotal: manifestSec.authoritativeSectionTotal,
      sectionMarksOrigin: manifestSec.sectionMarksOrigin,
      listedPotentialItemMarksTotal: manifestSec.listedPotentialItemMarksTotal,
      attemptRule: manifestSec.attemptRule,
      attemptRuleOrigin: manifestSec.attemptRuleOrigin,
      attemptCount: manifestSec.attemptCount,
      actualItemCount: manifestSec.actualItemCount,
      formula: manifestSec.explicitHeadingFormula ? { ...manifestSec.explicitHeadingFormula } : null,
      nodes: stitched.nodes,
      provenance: {
        sourceSectionId: sourceSec.id,
        sourceSegmentIds: [
          ...extraSectionSegmentIds,
          ...stitched.segments.map(s => s.sourceSegmentId),
        ],
      },
    })

    sections.push(section)
  })

  // Source Identity (Mandatory canonical provenance)
  const sourceIdentity = {
    sourcePaperId: v13Paper.id,
    sourceDatasetGeneration: migrationContext.sourceDatasetGeneration || 'v13',
    sourceDatasetVersion: migrationContext.sourceDatasetVersion || DEFAULT_V13_DATASET_VERSION,
    sourceDatasetByteSha256: migrationContext.sourceDatasetByteSha256 || DEFAULT_V13_BYTE_SHA256,
    sourceDatasetDeclaredSha256: migrationContext.sourceDatasetDeclaredSha256 || DEFAULT_V13_DECLARED_SHA256,
    normalizationManifestByteSha256: migrationContext.normalizationManifestByteSha256 || DEFAULT_MANIFEST_BYTE_SHA256,
    normalizationManifestVersion: migrationContext.normalizationManifestVersion || DEFAULT_MANIFEST_VERSION,
    manifestPaperIndex: Number.isInteger(manifestPaper.paperIndex) ? manifestPaper.paperIndex : 1,
  }

  // Assemble Canonical Document
  const doc = createCanonicalPaperDocument({
    id: docId,
    metadata,
    presentation,
    authority,
    sourceIdentity,
    sections,
    sourceCoverageLedger: docCoverageLedger,
    createdAt: null,
    updatedAt: null,
    migrationAudit: {
      migrationBaselineCommit: migrationContext.migrationBaselineCommit || MIGRATION_BASELINE_COMMIT,
      migrationEngineVersion: migrationContext.migrationEngineVersion || MIGRATION_ENGINE_VERSION,
    },
  })

  // Synchronous structural validation
  const validationResult = validateCanonicalPaperDocument(doc)
  if (!validationResult.valid) {
    throw new Error(
      `Canonical document validation failed for ${paperId}: ${validationResult.errors.join('; ')}`
    )
  }

  return doc
}

/**
 * Selects the appropriate semantic parser for a section.
 */
function selectParserForSection(section, paper) {
  const h = section.heading || ''
  const kind = inferOfficialSectionKind(section)

  // Canonical migration must use the same section classifier as the live Paper Workspace.
  // The semantic parser remains independent, but classifier drift is not allowed.
  if (kind === 'mcq') return parseMcqSection
  if (kind === 'true_false') return parseTrueFalse
  if (kind === 'fill_blank') return parseFillBlanks
  if (kind === 'table' || kind === 'pair_table' || kind === 'matching') return parseTables
  if (kind === 'vertical_math') return parseVerticalMath

  // Preserve the explicit Class 1 Countdown vertical-arithmetic rule.
  if (paper.id.includes('countdown') && /Solve\s+the\s+sums/i.test(h)) {
    return parseVerticalMath
  }

  // Question List handles short/long/essay/application/letter/translation/definition/banners.
  return parseQuestionList
}

/**
 * Stitches parsed item spans into a 100% gapless, non-overlapping coverage ledger.
 */
export function stitchItemsToFullCoverage(
  parsedItems,
  content,
  canonicalSectionId,
  sourceSectionId,
  direction,
  globalNodeIds,
  manifestSec,
  sourceField = 'content'
) {
  const nodes = []
  const segments = []
  const segmentPrefix = sourceField === 'heading' ? 'h' : 'c'

  // Case A: empty content
  if (content.length === 0) {
    const emptySeg = createCoverageSegment({
      sourceSectionId,
      sourceField,
      sourceSegmentId: `${canonicalSectionId}__${segmentPrefix}_empty`,
      startOffset: 0,
      endOffset: 0,
      rawSourceSnapshot: '',
      targetCanonicalIds: [canonicalSectionId],
      coverageStatus: CoverageStatus.METADATA_ONLY,
    })
    return { nodes: [], segments: [emptySeg] }
  }

  // Case B: no items parsed, fallback to unknown_preserved
  if (!parsedItems || parsedItems.length === 0) {
    const nodeId = `${canonicalSectionId}__raw01`
    globalNodeIds.add(nodeId)
    const segId = `${canonicalSectionId}__${segmentPrefix}_seg01`
    const seg = createCoverageSegment({
      sourceSectionId,
      sourceField,
      sourceSegmentId: segId,
      startOffset: 0,
      endOffset: content.length,
      rawSourceSnapshot: content,
      targetCanonicalIds: [nodeId],
      coverageStatus: CoverageStatus.RAW_PRESERVED,
    })
    const node = createUnknownPreservedNode({
      id: nodeId,
      direction,
      rawText: content,
      operationalNodeMarks: null,
      authoritativeNodeMarks: null,
      nodeMarksOrigin: NodeMarksOrigin.UNSTATED,
      marksEvidenceString: null,
      provenance: {
        classificationCertainty: ClassificationCertainty.UNKNOWN,
        academicTextMutated: false,
        sourceSegmentIds: [segId],
        rawSourceSnapshot: content,
      },
    })
    return { nodes: [node], segments: [seg] }
  }

  // Case C: stitch items
  const items = [...parsedItems]

  // Fix leading offset
  if (items[0].startOffset > 0) {
    const preText = content.slice(0, items[0].startOffset)
    if (preText.includes('#')) {
      const bannerId = `${canonicalSectionId}__banner_pre`
      globalNodeIds.add(bannerId)
      items.unshift({
        node: createSectionBannerNode({ id: bannerId, bannerText: preText.trim(), direction }),
        startOffset: 0,
        endOffset: items[0].startOffset,
        rawText: preText,
      })
    } else if (preText.trim().length > 0) {
      const unkId = `${canonicalSectionId}__gap_pre`
      globalNodeIds.add(unkId)
      items.unshift({
        node: createUnknownPreservedNode({
          id: unkId,
          direction,
          rawText: preText,
          operationalNodeMarks: null,
          authoritativeNodeMarks: null,
          nodeMarksOrigin: NodeMarksOrigin.UNSTATED,
          marksEvidenceString: null,
          provenance: {
            classificationCertainty: ClassificationCertainty.UNKNOWN,
            academicTextMutated: false,
          },
        }),
        startOffset: 0,
        endOffset: items[0].startOffset,
        rawText: preText,
      })
    } else {
      items[0].rawText = content.slice(0, items[0].endOffset)
      items[0].startOffset = 0
    }
  }

  // Fix internal gaps
  for (let i = 0; i < items.length - 1; i++) {
    if (items[i].endOffset < items[i + 1].startOffset) {
      const gapText = content.slice(items[i].endOffset, items[i + 1].startOffset)
      if (gapText.includes('#')) {
        const bannerId = `${canonicalSectionId}__banner_gap${i}`
        globalNodeIds.add(bannerId)
        items.splice(i + 1, 0, {
          node: createSectionBannerNode({ id: bannerId, bannerText: gapText.trim(), direction }),
          startOffset: items[i].endOffset,
          endOffset: items[i + 1].startOffset,
          rawText: gapText,
        })
        i++ // skip newly inserted banner
      } else if (gapText.trim().length > 0) {
        const unkId = `${canonicalSectionId}__gap_${i}`
        globalNodeIds.add(unkId)
        items.splice(i + 1, 0, {
          node: createUnknownPreservedNode({
            id: unkId,
            direction,
            rawText: gapText,
            operationalNodeMarks: null,
            authoritativeNodeMarks: null,
            nodeMarksOrigin: NodeMarksOrigin.UNSTATED,
            marksEvidenceString: null,
            provenance: {
              classificationCertainty: ClassificationCertainty.UNKNOWN,
              academicTextMutated: false,
            },
          }),
          startOffset: items[i].endOffset,
          endOffset: items[i + 1].startOffset,
          rawText: gapText,
        })
        i++ // skip newly inserted unknown node
      } else {
        items[i].endOffset = items[i + 1].startOffset
        items[i].rawText = content.slice(items[i].startOffset, items[i].endOffset)
      }
    }
  }

  // Fix trailing offset
  const last = items[items.length - 1]
  if (last.endOffset < content.length) {
    const postText = content.slice(last.endOffset, content.length)
    if (postText.includes('#')) {
      const bannerId = `${canonicalSectionId}__banner_post`
      globalNodeIds.add(bannerId)
      items.push({
        node: createSectionBannerNode({ id: bannerId, bannerText: postText.trim(), direction }),
        startOffset: last.endOffset,
        endOffset: content.length,
        rawText: postText,
      })
    } else if (postText.trim().length > 0) {
      const unkId = `${canonicalSectionId}__gap_post`
      globalNodeIds.add(unkId)
      items.push({
        node: createUnknownPreservedNode({
          id: unkId,
          direction,
          rawText: postText,
          operationalNodeMarks: null,
          authoritativeNodeMarks: null,
          nodeMarksOrigin: NodeMarksOrigin.UNSTATED,
          marksEvidenceString: null,
          provenance: {
            classificationCertainty: ClassificationCertainty.UNKNOWN,
            academicTextMutated: false,
          },
        }),
        startOffset: last.endOffset,
        endOffset: content.length,
        rawText: postText,
      })
    } else {
      last.endOffset = content.length
      last.rawText = content.slice(last.startOffset, content.length)
    }
  }

  // Assemble final nodes and segments
  items.forEach((item, idx) => {
    const itemNum = String(idx + 1).padStart(2, '0')
    const segId = `${canonicalSectionId}__${segmentPrefix}_seg${itemNum}`

    // Ensure node has a globally unique ID
    let finalNodeId = item.node.id
    if (!finalNodeId || globalNodeIds.has(finalNodeId)) {
      finalNodeId = `${canonicalSectionId}__item${itemNum}`
    }
    globalNodeIds.add(finalNodeId)
    item.node.id = finalNodeId

    // Attach provenance
    item.node.provenance = {
      classificationCertainty:
        item.node.provenance?.classificationCertainty || ClassificationCertainty.DETERMINISTIC,
      academicTextMutated: Boolean(item.node.provenance?.academicTextMutated ?? false),
      sourceSegmentIds: [segId],
      rawSourceSnapshot: item.rawText,
    }

    // Node Marks Authority & Origin Resolution
    // Priority: ITEM_LEVEL_EXPLICIT > DERIVED_FROM_RESOLVED_FORMULA > INHERITED_OPERATIONAL > UNSTATED
    const marksMatch = item.rawText.match(/\((\d+)\s*(?:Marks?|نمبر)\)/i)
    const formula = manifestSec?.explicitHeadingFormula
    const isFormulaResolved =
      formula &&
      formula.interpretationStatus === 'RESOLVED' &&
      formula.interpretedMarksPerItem != null &&
      manifestSec.sectionMarksOrigin === SectionMarksOrigin.TEACHER_EXPLICIT_FORMULA

    if (marksMatch && isAcademicQuestionNode(item.node)) {
      const explicitVal = parseInt(marksMatch[1], 10)
      item.node.operationalNodeMarks = explicitVal
      item.node.authoritativeNodeMarks = explicitVal
      item.node.nodeMarksOrigin = NodeMarksOrigin.ITEM_LEVEL_EXPLICIT
      item.node.marksEvidenceString = marksMatch[0]
    } else if (isFormulaResolved && isAcademicQuestionNode(item.node)) {
      item.node.operationalNodeMarks = formula.interpretedMarksPerItem
      item.node.authoritativeNodeMarks = formula.interpretedMarksPerItem
      item.node.nodeMarksOrigin = NodeMarksOrigin.DERIVED_FROM_RESOLVED_FORMULA
      item.node.marksEvidenceString = formula.rawFormula || null
    } else {
      item.node.operationalNodeMarks = null
      item.node.authoritativeNodeMarks = null
      item.node.nodeMarksOrigin = NodeMarksOrigin.UNSTATED
      item.node.marksEvidenceString = null
    }

    const coverageStatus =
      item.node.type === CanonicalNodeType.UNKNOWN_PRESERVED
        ? CoverageStatus.RAW_PRESERVED
        : CoverageStatus.STRUCTURED

    const seg = createCoverageSegment({
      sourceSectionId,
      sourceField,
      sourceSegmentId: segId,
      startOffset: item.startOffset,
      endOffset: item.endOffset,
      rawSourceSnapshot: item.rawText,
      targetCanonicalIds: [finalNodeId],
      coverageStatus,
    })

    nodes.push(item.node)
    segments.push(seg)
  })

  return { nodes, segments }
}

/**
 * Generates the complete canonical PaperDocument V2 corpus from V13 dataset
 * and B1 normalization manifest.
 *
 * @param {object} v13Dataset
 * @param {object} normalizationManifest
 * @param {object} [identity]
 * @returns {object} Deterministic corpus container
 */
export function generateCanonicalV2Corpus(v13Dataset, normalizationManifest, identity = {}) {
  if (!v13Dataset || !Array.isArray(v13Dataset.papers)) {
    throw new Error('v13Dataset must contain a papers array')
  }
  if (!normalizationManifest || !Array.isArray(normalizationManifest.papers)) {
    throw new Error('normalizationManifest must contain a papers array')
  }

  if (v13Dataset.papers.length !== 43) {
    throw new Error(`Expected 43 papers in V13 dataset, got ${v13Dataset.papers.length}`)
  }
  if (normalizationManifest.papers.length !== 43) {
    throw new Error(`Expected 43 papers in manifest, got ${normalizationManifest.papers.length}`)
  }

  const documents = []
  const documentIds = new Set()

  for (const v13Paper of v13Dataset.papers) {
    const manifestPaper = normalizationManifest.papers.find(p => p.paperId === v13Paper.id)
    if (!manifestPaper) {
      throw new Error(`Missing manifest record for paper ${v13Paper.id}`)
    }

    const canonicalDoc = migrateOfficialPaperToV2(v13Paper, manifestPaper, {
      migrationBaselineCommit: identity.migrationBaselineCommit || MIGRATION_BASELINE_COMMIT,
      migrationEngineVersion: MIGRATION_ENGINE_VERSION,
      sourceDatasetGeneration: 'v13',
      sourceDatasetVersion: v13Dataset.version,
      sourceDatasetDeclaredSha256: v13Dataset.sourceSha256,
      sourceDatasetByteSha256: identity.sourceDatasetByteSha256 || null,
      normalizationManifestByteSha256: identity.normalizationManifestByteSha256 || null,
      normalizationManifestVersion: normalizationManifest.schemaVersion || DEFAULT_MANIFEST_VERSION,
    })

    if (documentIds.has(canonicalDoc.id)) {
      throw new Error(`Duplicate document id: ${canonicalDoc.id}`)
    }
    documentIds.add(canonicalDoc.id)
    documents.push(canonicalDoc)
  }

  return {
    artifactFormat: 'assps-canonical-v2-corpus',
    artifactVersion: '3.0.0',
    paperCount: documents.length,
    sourceDatasetGeneration: 'v13',
    sourceDatasetVersion: v13Dataset.version,
    sourceDatasetDeclaredSha256: v13Dataset.sourceSha256,
    sourceDatasetByteSha256: identity.sourceDatasetByteSha256 || null,
    normalizationManifestByteSha256: identity.normalizationManifestByteSha256 || null,
    documents,
  }
}
