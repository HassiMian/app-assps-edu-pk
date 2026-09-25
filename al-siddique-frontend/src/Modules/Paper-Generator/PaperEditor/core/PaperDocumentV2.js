// PaperDocumentV2.js — Lossless Canonical PaperDocument V2 Model & Validator
// Pure JavaScript implementation with runtime contract enforcement.

export const CANONICAL_FORMAT = 'assps-canonical-paper'
export const CANONICAL_DOCUMENT_MODEL = 'PaperDocumentV2'
export const CANONICAL_SCHEMA_VERSION = 3

export const DocumentLanguage = Object.freeze({
  ENGLISH: 'english',
  URDU: 'urdu',
  DUAL: 'dual',
  UNKNOWN: 'unknown',
})

export const DocumentDirection = Object.freeze({
  LTR: 'ltr',
  RTL: 'rtl',
  AUTO: 'auto',
})

export const AttemptRule = Object.freeze({
  ATTEMPT_ANY: 'ATTEMPT_ANY',
  ALL: 'ALL',
  CHOICE_GROUP: 'CHOICE_GROUP',
  UNSPECIFIED: 'UNSPECIFIED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
})

export const AttemptRuleOrigin = Object.freeze({
  TEACHER_EXPLICIT: 'TEACHER_EXPLICIT',
  DETERMINISTIC_FROM_HEADING: 'DETERMINISTIC_FROM_HEADING',
  DETERMINISTIC_FROM_STRUCTURE: 'DETERMINISTIC_FROM_STRUCTURE',
  UNKNOWN: 'UNKNOWN',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
})

export const PaperMarksStatus = Object.freeze({
  BALANCED_EXPLICIT: 'BALANCED_EXPLICIT',
  BALANCED_DETERMINISTIC: 'BALANCED_DETERMINISTIC',
  SOURCE_TOTAL_CONFLICT: 'SOURCE_TOTAL_CONFLICT',
  HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS: 'HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS',
  MIXED_EXPLICIT_AND_UNRESOLVED: 'MIXED_EXPLICIT_AND_UNRESOLVED',
  PROVISIONAL_OR_RECONCILED: 'PROVISIONAL_OR_RECONCILED',
  FULLY_UNRESOLVED: 'FULLY_UNRESOLVED',
})

export const PaperTotalOrigin = Object.freeze({
  TEACHER_EXPLICIT: 'TEACHER_EXPLICIT',
  DERIVED_FROM_EXPLICIT_SECTION_EVIDENCE: 'DERIVED_FROM_EXPLICIT_SECTION_EVIDENCE',
  TRANSCRIBER_RECONCILIATION: 'TRANSCRIBER_RECONCILIATION',
  CORRECTED_FROM_CONFLICTING_SOURCE_HEADER: 'CORRECTED_FROM_CONFLICTING_SOURCE_HEADER',
  PROVISIONAL_INFERENCE: 'PROVISIONAL_INFERENCE',
  UNRESOLVED_ZERO: 'UNRESOLVED_ZERO',
  UNKNOWN: 'UNKNOWN',
})

export const SectionMarksOrigin = Object.freeze({
  TEACHER_EXPLICIT_FORMULA: 'TEACHER_EXPLICIT_FORMULA',
  TEACHER_EXPLICIT_SCALAR: 'TEACHER_EXPLICIT_SCALAR',
  TRANSCRIBER_INFERRED: 'TRANSCRIBER_INFERRED',
  PROVISIONAL_RECONCILIATION: 'PROVISIONAL_RECONCILIATION',
  LEGACY_UNKNOWN: 'LEGACY_UNKNOWN',
  NONE: 'NONE',
})

export const NodeMarksOrigin = Object.freeze({
  ITEM_LEVEL_EXPLICIT: 'ITEM_LEVEL_EXPLICIT',
  DERIVED_FROM_RESOLVED_FORMULA: 'DERIVED_FROM_RESOLVED_FORMULA',
  INHERITED_OPERATIONAL: 'INHERITED_OPERATIONAL',
  UNSTATED: 'UNSTATED',
})

export const ClassificationCertainty = Object.freeze({
  EXPLICIT: 'EXPLICIT',
  DETERMINISTIC: 'DETERMINISTIC',
  HEURISTIC: 'HEURISTIC',
  UNKNOWN: 'UNKNOWN',
})

export const FieldProvenanceOrigin = Object.freeze({
  SOURCE: 'SOURCE',
  OPERATIONAL_CONFIG: 'OPERATIONAL_CONFIG',
  TENANT_DEFAULT: 'TENANT_DEFAULT',
  UNSET: 'UNSET',
})

export const CoverageStatus = Object.freeze({
  STRUCTURED: 'STRUCTURED',
  RAW_PRESERVED: 'RAW_PRESERVED',
  METADATA_ONLY: 'METADATA_ONLY',
})

export const LabelOrigin = Object.freeze({
  SOURCE: 'SOURCE',
  GENERATED_CANONICAL: 'GENERATED_CANONICAL',
})

export const CanonicalNodeType = Object.freeze({
  MCQ: 'mcq',
  SHORT_QUESTION: 'short_question',
  LONG_QUESTION: 'long_question',
  TRUE_FALSE: 'true_false',
  FILL_BLANK: 'fill_blank',
  MATCHING_COLUMNS: 'matching_columns',
  GRAMMAR_TABLE: 'grammar_table',
  VERTICAL_MATH: 'vertical_math',
  ESSAY: 'essay',
  APPLICATION: 'application',
  LETTER: 'letter',
  TRANSLATION: 'translation',
  DEFINITION: 'definition',
  RICH_TEXT: 'rich_text',
  SCOPE_HEADER: 'scope_header',
  SECTION_BANNER: 'section_banner',
  UNKNOWN_PRESERVED: 'unknown_preserved',
})

export const VALID_LANGUAGES = new Set(Object.values(DocumentLanguage))
export const VALID_DIRECTIONS = new Set(Object.values(DocumentDirection))
export const VALID_ATTEMPT_RULES = new Set(Object.values(AttemptRule))
export const VALID_ATTEMPT_RULE_ORIGINS = new Set(Object.values(AttemptRuleOrigin))
export const VALID_PAPER_MARKS_STATUSES = new Set(Object.values(PaperMarksStatus))
export const VALID_PAPER_TOTAL_ORIGINS = new Set(Object.values(PaperTotalOrigin))
export const VALID_SECTION_MARKS_ORIGINS = new Set(Object.values(SectionMarksOrigin))
export const VALID_NODE_MARKS_ORIGINS = new Set(Object.values(NodeMarksOrigin))
export const VALID_FIELD_PROVENANCE_ORIGINS = new Set(Object.values(FieldProvenanceOrigin))
export const VALID_COVERAGE_STATUSES = new Set(Object.values(CoverageStatus))
export const VALID_LABEL_ORIGINS = new Set(Object.values(LabelOrigin))
export const VALID_NODE_TYPES = new Set(Object.values(CanonicalNodeType))
export const VALID_CLASSIFICATION_CERTAINTIES = new Set(Object.values(ClassificationCertainty))

export function createProvenanceField(value = null, origin = FieldProvenanceOrigin.UNSET) {
  return {
    value,
    origin,
  }
}

export function createBaseNode(overrides = {}) {
  return {
    id: overrides.id,
    type: overrides.type,
    direction: overrides.direction || DocumentDirection.AUTO,
    operationalNodeMarks: overrides.operationalNodeMarks ?? null,
    authoritativeNodeMarks: overrides.authoritativeNodeMarks ?? null,
    nodeMarksOrigin: overrides.nodeMarksOrigin || NodeMarksOrigin.UNSTATED,
    marksEvidenceString: overrides.marksEvidenceString ?? null,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.UNKNOWN,
      academicTextMutated: Boolean(overrides.provenance?.academicTextMutated ?? false),
      sourceSegmentIds: Array.isArray(overrides.provenance?.sourceSegmentIds)
        ? [...overrides.provenance.sourceSegmentIds]
        : [],
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot ?? null,
    },
  }
}

export function createMcqNode(overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type: CanonicalNodeType.MCQ,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.EXPLICIT,
      academicTextMutated: Boolean(overrides.provenance?.academicTextMutated ?? false),
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    stemText: overrides.stemText ?? '',
    options: Array.isArray(overrides.options)
      ? overrides.options.map(opt => ({
          id: opt.id,
          canonicalLabel: opt.canonicalLabel ?? '',
          sourceLabel: opt.sourceLabel ?? null,
          displayLabel: opt.displayLabel ?? '',
          labelOrigin: opt.labelOrigin ?? LabelOrigin.GENERATED_CANONICAL,
          text: opt.text ?? '',
          direction: opt.direction || DocumentDirection.AUTO,
          isCorrect: opt.isCorrect ?? null,
        }))
      : [],
  }
}

export function createGenericQuestionNode(type, overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.DETERMINISTIC,
      academicTextMutated: Boolean(overrides.provenance?.academicTextMutated ?? false),
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    stemText: overrides.stemText ?? '',
    subparts: Array.isArray(overrides.subparts)
      ? overrides.subparts.map(p => ({
          id: p.id,
          label: p.label ?? null,
          stemText: p.stemText ?? '',
          direction: p.direction || DocumentDirection.AUTO,
          rawSourceSnapshot: p.rawSourceSnapshot ?? null,
          sourceSegmentIds: Array.isArray(p.sourceSegmentIds) ? [...p.sourceSegmentIds] : [],
        }))
      : [],
  }
}

export function createShortQuestionNode(overrides = {}) {
  return createGenericQuestionNode(CanonicalNodeType.SHORT_QUESTION, overrides)
}

export function createLongQuestionNode(overrides = {}) {
  return createGenericQuestionNode(CanonicalNodeType.LONG_QUESTION, overrides)
}

export function createEssayNode(overrides = {}) {
  return createGenericQuestionNode(CanonicalNodeType.ESSAY, overrides)
}

export function createApplicationNode(overrides = {}) {
  return createGenericQuestionNode(CanonicalNodeType.APPLICATION, overrides)
}

export function createLetterNode(overrides = {}) {
  return createGenericQuestionNode(CanonicalNodeType.LETTER, overrides)
}

export function createTranslationNode(overrides = {}) {
  return createGenericQuestionNode(CanonicalNodeType.TRANSLATION, overrides)
}

export function createDefinitionNode(overrides = {}) {
  return createGenericQuestionNode(CanonicalNodeType.DEFINITION, overrides)
}

export function createTrueFalseNode(overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type: CanonicalNodeType.TRUE_FALSE,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.EXPLICIT,
      academicTextMutated: Boolean(overrides.provenance?.academicTextMutated ?? false),
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    statement: overrides.statement ?? '',
    hasIndicatorBox: Boolean(overrides.hasIndicatorBox),
    expectedAnswer: overrides.expectedAnswer ?? null,
  }
}

export function createFillBlankNode(overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type: CanonicalNodeType.FILL_BLANK,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.EXPLICIT,
      academicTextMutated: Boolean(overrides.provenance?.academicTextMutated ?? false),
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    fullText: overrides.fullText ?? '',
    segments: Array.isArray(overrides.segments)
      ? overrides.segments.map(seg => ({
          type: seg.type === 'blank' ? 'blank' : 'text',
          value: seg.value ?? '',
          ...(seg.id ? { id: seg.id } : {}),
        }))
      : [],
    wordBank: Array.isArray(overrides.wordBank) ? [...overrides.wordBank] : null,
    rawSource: overrides.rawSource ?? overrides.fullText ?? '',
  }
}

export function createMatchingColumnsNode(overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type: CanonicalNodeType.MATCHING_COLUMNS,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.EXPLICIT,
      academicTextMutated: Boolean(overrides.provenance?.academicTextMutated ?? false),
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    leftItems: Array.isArray(overrides.leftItems)
      ? overrides.leftItems.map(item => ({ id: item.id, text: item.text ?? '' }))
      : [],
    rightItems: Array.isArray(overrides.rightItems)
      ? overrides.rightItems.map(item => ({ id: item.id, text: item.text ?? '' }))
      : [],
    correctMappings: overrides.correctMappings ?? null,
  }
}

export function createGrammarTableNode(overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type: CanonicalNodeType.GRAMMAR_TABLE,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.EXPLICIT,
      academicTextMutated: Boolean(overrides.provenance?.academicTextMutated ?? false),
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    tableSemantic: overrides.tableSemantic ?? 'unknown_table',
    columns: Array.isArray(overrides.columns) ? [...overrides.columns] : [],
    rows: Array.isArray(overrides.rows)
      ? overrides.rows.map(row => ({
          leftText: row.leftText ?? '',
          rightText: row.rightText ?? '',
          leftIsBlank: Boolean(row.leftIsBlank),
          rightIsBlank: Boolean(row.rightIsBlank),
        }))
      : [],
  }
}

export function createVerticalMathNode(overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type: CanonicalNodeType.VERTICAL_MATH,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.DETERMINISTIC,
      academicTextMutated: Boolean(overrides.provenance?.academicTextMutated ?? false),
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    operands: Array.isArray(overrides.operands)
      ? overrides.operands.map(op => ({
          raw: String(op.raw ?? ''),
          normalizedNumericValue: Number.isFinite(Number(op.normalizedNumericValue))
            ? Number(op.normalizedNumericValue)
            : null,
        }))
      : [],
    operator: overrides.operator ?? '+',
    result: overrides.result
      ? {
          raw: String(overrides.result.raw ?? ''),
          normalizedNumericValue: Number.isFinite(Number(overrides.result.normalizedNumericValue))
            ? Number(overrides.result.normalizedNumericValue)
            : null,
        }
      : null,
    layoutSemantic: overrides.layoutSemantic ?? 'vertical-math-grid',
  }
}

export function createRichTextNode(overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type: CanonicalNodeType.RICH_TEXT,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.DETERMINISTIC,
      academicTextMutated: Boolean(overrides.provenance?.academicTextMutated ?? false),
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    content: overrides.content ?? '',
    layoutSemantic: overrides.layoutSemantic ?? null,
  }
}

export function createScopeHeaderNode(overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type: CanonicalNodeType.SCOPE_HEADER,
    operationalNodeMarks: null,
    authoritativeNodeMarks: null,
    nodeMarksOrigin: NodeMarksOrigin.UNSTATED,
    marksEvidenceString: null,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.DETERMINISTIC,
      academicTextMutated: false,
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    headingText: overrides.headingText ?? '',
  }
}

export function createSectionBannerNode(overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type: CanonicalNodeType.SECTION_BANNER,
    operationalNodeMarks: null,
    authoritativeNodeMarks: null,
    nodeMarksOrigin: NodeMarksOrigin.UNSTATED,
    marksEvidenceString: null,
    provenance: {
      classificationCertainty:
        overrides.provenance?.classificationCertainty || ClassificationCertainty.DETERMINISTIC,
      academicTextMutated: false,
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    bannerText: overrides.bannerText ?? '',
  }
}

export function createUnknownPreservedNode(overrides = {}) {
  const base = createBaseNode({
    ...overrides,
    type: CanonicalNodeType.UNKNOWN_PRESERVED,
    operationalNodeMarks: null,
    authoritativeNodeMarks: null,
    nodeMarksOrigin: NodeMarksOrigin.UNSTATED,
    marksEvidenceString: null,
    provenance: {
      classificationCertainty: ClassificationCertainty.UNKNOWN,
      academicTextMutated: false,
      sourceSegmentIds: overrides.provenance?.sourceSegmentIds,
      rawSourceSnapshot: overrides.provenance?.rawSourceSnapshot,
    },
  })
  return {
    ...base,
    rawText: overrides.rawText ?? '',
  }
}

export function createCanonicalSection(overrides = {}) {
  return {
    id: overrides.id,
    sectionIndex: Number.isInteger(overrides.sectionIndex) ? overrides.sectionIndex : 1,
    title: overrides.title ?? null,
    titleUrdu: overrides.titleUrdu ?? null,
    heading: overrides.heading ?? null,
    instructions: overrides.instructions ?? null,
    direction: overrides.direction || DocumentDirection.AUTO,
    storedLegacyMarksValue: Number.isFinite(overrides.storedLegacyMarksValue)
      ? Number(overrides.storedLegacyMarksValue)
      : null,
    operationalSectionTotal: Number.isFinite(overrides.operationalSectionTotal)
      ? Number(overrides.operationalSectionTotal)
      : null,
    authoritativeSectionTotal: Number.isFinite(overrides.authoritativeSectionTotal)
      ? Number(overrides.authoritativeSectionTotal)
      : null,
    sectionMarksOrigin: overrides.sectionMarksOrigin || SectionMarksOrigin.NONE,
    listedPotentialItemMarksTotal: Number.isFinite(overrides.listedPotentialItemMarksTotal)
      ? Number(overrides.listedPotentialItemMarksTotal)
      : null,
    attemptRule: overrides.attemptRule || AttemptRule.UNSPECIFIED,
    attemptRuleOrigin: overrides.attemptRuleOrigin || AttemptRuleOrigin.UNKNOWN,
    attemptCount: Number.isInteger(overrides.attemptCount) ? overrides.attemptCount : null,
    actualItemCount: Number.isInteger(overrides.actualItemCount) ? overrides.actualItemCount : null,
    formula: overrides.formula ? { ...overrides.formula } : null,
    nodes: Array.isArray(overrides.nodes) ? [...overrides.nodes] : [],
    provenance: {
      sourceSectionId: overrides.provenance?.sourceSectionId ?? null,
      sourceSegmentIds: Array.isArray(overrides.provenance?.sourceSegmentIds)
        ? [...overrides.provenance.sourceSegmentIds]
        : [],
    },
  }
}

export function createCanonicalPaperDocument(overrides = {}) {
  const meta = overrides.metadata || {}
  const pres = overrides.presentation || {}
  const auth = overrides.authority || {}
  const audit = overrides.migrationAudit || {}
  const sid = overrides.sourceIdentity || null

  const language = meta.language || DocumentLanguage.UNKNOWN
  const direction =
    meta.direction ||
    (language === DocumentLanguage.URDU
      ? DocumentDirection.RTL
      : language === DocumentLanguage.ENGLISH
        ? DocumentDirection.LTR
        : DocumentDirection.AUTO)

  return {
    format: CANONICAL_FORMAT,
    documentModel: CANONICAL_DOCUMENT_MODEL,
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    id: overrides.id,
    metadata: {
      title: meta.title ?? null,
      paperCode: meta.paperCode ?? null,
      className: meta.className ?? null,
      classLevel: meta.classLevel ?? null,
      subject: meta.subject ?? null,
      subjectName: meta.subjectName ?? null,
      examType: meta.examType ?? null,
      session: meta.session ?? null,
      language,
      direction,
      durationMinutes: Number.isFinite(meta.durationMinutes) ? Number(meta.durationMinutes) : null,
      timeAllowed: meta.timeAllowed ?? null,
      examDate: meta.examDate ?? null,
      generalInstructions: meta.generalInstructions ?? null,
    },
    presentation: {
      schoolName: pres.schoolName || createProvenanceField(null, FieldProvenanceOrigin.UNSET),
      schoolAddress: pres.schoolAddress || createProvenanceField(null, FieldProvenanceOrigin.UNSET),
      logoUrl: pres.logoUrl || createProvenanceField(null, FieldProvenanceOrigin.UNSET),
    },
    authority: {
      storedConfiguredTotal: Number.isFinite(auth.storedConfiguredTotal)
        ? Number(auth.storedConfiguredTotal)
        : null,
      originalTeacherHeaderTotal: Number.isFinite(auth.originalTeacherHeaderTotal)
        ? Number(auth.originalTeacherHeaderTotal)
        : null,
      authoritativePaperTotal: Number.isFinite(auth.authoritativePaperTotal)
        ? Number(auth.authoritativePaperTotal)
        : null,
      paperTotalOrigin: auth.paperTotalOrigin || PaperTotalOrigin.UNKNOWN,
      paperMarksStatus: auth.paperMarksStatus || PaperMarksStatus.FULLY_UNRESOLVED,
      flags: {
        hasItemCountConflict: Boolean(auth.flags?.hasItemCountConflict),
        hasProvisionalMarks: Boolean(auth.flags?.hasProvisionalMarks),
        hasSourceHeaderConflict: Boolean(auth.flags?.hasSourceHeaderConflict),
        hasUnresolvedAttemptRule: Boolean(auth.flags?.hasUnresolvedAttemptRule),
      },
      sourceTotalNote: auth.sourceTotalNote ?? null,
      qaNotes: auth.qaNotes ?? null,
    },
    sourceIdentity: sid
      ? {
          sourcePaperId: sid.sourcePaperId,
          sourceDatasetGeneration: sid.sourceDatasetGeneration || 'v13',
          sourceDatasetVersion: sid.sourceDatasetVersion,
          sourceDatasetByteSha256: sid.sourceDatasetByteSha256,
          sourceDatasetDeclaredSha256: sid.sourceDatasetDeclaredSha256,
          normalizationManifestByteSha256: sid.normalizationManifestByteSha256,
          normalizationManifestVersion: sid.normalizationManifestVersion,
          manifestPaperIndex: sid.manifestPaperIndex,
        }
      : null,
    sections: Array.isArray(overrides.sections) ? [...overrides.sections] : [],
    sourceCoverageLedger: Array.isArray(overrides.sourceCoverageLedger)
      ? [...overrides.sourceCoverageLedger]
      : [],
    createdAt: overrides.createdAt ?? null,
    updatedAt: overrides.updatedAt ?? null,
    migrationAudit: {
      migrationBaselineCommit: audit.migrationBaselineCommit ?? null,
      migrationEngineVersion: audit.migrationEngineVersion ?? null,
    },
  }
}

/**
 * Pure synchronous canonical document validator.
 * No mutation, no default filling, no repair.
 * @param {any} doc
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCanonicalPaperDocument(doc) {
  const errors = []

  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['Document must be a non-null object'] }
  }

  // 1. Exact Discriminator Validation
  if (doc.format !== CANONICAL_FORMAT) {
    errors.push(`Discriminator mismatch: format must be "${CANONICAL_FORMAT}", got "${doc.format}"`)
  }
  if (doc.documentModel !== CANONICAL_DOCUMENT_MODEL) {
    errors.push(`Discriminator mismatch: documentModel must be "${CANONICAL_DOCUMENT_MODEL}", got "${doc.documentModel}"`)
  }
  if (doc.schemaVersion !== CANONICAL_SCHEMA_VERSION) {
    errors.push(`Discriminator mismatch: schemaVersion must be ${CANONICAL_SCHEMA_VERSION}, got ${doc.schemaVersion}`)
  }

  // 2. Document ID
  if (typeof doc.id !== 'string' || !doc.id.trim()) {
    errors.push('Document id must be a non-empty string')
  }

  // 3. Source Identity Validation (Mandatory for Canonical B2)
  if (!doc.sourceIdentity || typeof doc.sourceIdentity !== 'object') {
    errors.push('Document sourceIdentity must be an object')
  } else {
    const sid = doc.sourceIdentity
    if (typeof sid.sourcePaperId !== 'string' || !sid.sourcePaperId.trim()) {
      errors.push('sourceIdentity.sourcePaperId must be a non-empty string')
    }
    if (sid.sourceDatasetGeneration !== 'v13') {
      errors.push(`sourceIdentity.sourceDatasetGeneration must be "v13", got "${sid.sourceDatasetGeneration}"`)
    }
    if (typeof sid.sourceDatasetVersion !== 'string' || !sid.sourceDatasetVersion.trim()) {
      errors.push('sourceIdentity.sourceDatasetVersion must be a non-empty string')
    }
    if (typeof sid.sourceDatasetByteSha256 !== 'string' || sid.sourceDatasetByteSha256.length !== 64) {
      errors.push('sourceIdentity.sourceDatasetByteSha256 must be a 64-char hex string')
    }
    if (typeof sid.sourceDatasetDeclaredSha256 !== 'string' || sid.sourceDatasetDeclaredSha256.length !== 64) {
      errors.push('sourceIdentity.sourceDatasetDeclaredSha256 must be a 64-char hex string')
    }
    if (typeof sid.normalizationManifestByteSha256 !== 'string' || sid.normalizationManifestByteSha256.length !== 64) {
      errors.push('sourceIdentity.normalizationManifestByteSha256 must be a 64-char hex string')
    }
    if (typeof sid.normalizationManifestVersion !== 'string' || !sid.normalizationManifestVersion.trim()) {
      errors.push('sourceIdentity.normalizationManifestVersion must be a non-empty string')
    }
    if (!Number.isInteger(sid.manifestPaperIndex) || sid.manifestPaperIndex < 1) {
      errors.push('sourceIdentity.manifestPaperIndex must be an integer >= 1')
    }
  }

  // 4. Metadata Validation
  if (!doc.metadata || typeof doc.metadata !== 'object') {
    errors.push('Document metadata must be an object')
  } else {
    const meta = doc.metadata
    if (!VALID_LANGUAGES.has(meta.language)) {
      errors.push(`Invalid metadata.language: "${meta.language}"`)
    }
    if (meta.direction === 'dual') {
      errors.push('metadata.direction MUST NOT be "dual"')
    } else if (!VALID_DIRECTIONS.has(meta.direction)) {
      errors.push(`Invalid metadata.direction: "${meta.direction}"`)
    }
    if (meta.durationMinutes !== null && (!Number.isFinite(meta.durationMinutes) || Number.isNaN(meta.durationMinutes))) {
      errors.push('metadata.durationMinutes must be finite number or null')
    }
  }

  // 5. Presentation Provenance Validation
  if (!doc.presentation || typeof doc.presentation !== 'object') {
    errors.push('Document presentation must be an object')
  } else {
    for (const fieldName of ['schoolName', 'schoolAddress', 'logoUrl']) {
      const field = doc.presentation[fieldName]
      if (!field || typeof field !== 'object') {
        errors.push(`presentation.${fieldName} must be an object { value, origin }`)
      } else if (!VALID_FIELD_PROVENANCE_ORIGINS.has(field.origin)) {
        errors.push(`Invalid presentation.${fieldName}.origin: "${field.origin}"`)
      }
    }
  }

  // 6. Authority Validation
  if (!doc.authority || typeof doc.authority !== 'object') {
    errors.push('Document authority must be an object')
  } else {
    const auth = doc.authority
    if (!VALID_PAPER_TOTAL_ORIGINS.has(auth.paperTotalOrigin)) {
      errors.push(`Invalid authority.paperTotalOrigin: "${auth.paperTotalOrigin}"`)
    }
    if (!VALID_PAPER_MARKS_STATUSES.has(auth.paperMarksStatus)) {
      errors.push(`Invalid authority.paperMarksStatus: "${auth.paperMarksStatus}"`)
    }
    for (const totalKey of ['storedConfiguredTotal', 'originalTeacherHeaderTotal', 'authoritativePaperTotal']) {
      const val = auth[totalKey]
      if (val !== null && (!Number.isFinite(val) || Number.isNaN(val))) {
        errors.push(`authority.${totalKey} must be finite number or null (got ${val})`)
      }
    }
    if (!auth.flags || typeof auth.flags !== 'object') {
      errors.push('authority.flags must be an object')
    } else {
      for (const flagKey of ['hasItemCountConflict', 'hasProvisionalMarks', 'hasSourceHeaderConflict', 'hasUnresolvedAttemptRule']) {
        if (typeof auth.flags[flagKey] !== 'boolean') {
          errors.push(`authority.flags.${flagKey} must be a boolean`)
        }
      }
    }
  }

  // 7. Section & Node Validation
  if (!Array.isArray(doc.sections)) {
    errors.push('sections must be an array')
  } else {
    const sectionIds = new Set()
    const globalNodeIds = new Set()
    const globalOptionIds = new Set()

    doc.sections.forEach((sec, sIdx) => {
      const secPath = `sections[${sIdx}]`
      if (!sec || typeof sec !== 'object') {
        errors.push(`${secPath} must be an object`)
        return
      }

      if (typeof sec.id !== 'string' || !sec.id.trim()) {
        errors.push(`${secPath}.id must be a non-empty string`)
      } else {
        if (sectionIds.has(sec.id)) {
          errors.push(`Duplicate section id "${sec.id}" at ${secPath}`)
        }
        sectionIds.add(sec.id)
      }

      if (sec.direction === 'dual') {
        errors.push(`${secPath}.direction MUST NOT be "dual"`)
      } else if (!VALID_DIRECTIONS.has(sec.direction)) {
        errors.push(`Invalid ${secPath}.direction: "${sec.direction}"`)
      }

      if (!VALID_SECTION_MARKS_ORIGINS.has(sec.sectionMarksOrigin)) {
        errors.push(`Invalid ${secPath}.sectionMarksOrigin: "${sec.sectionMarksOrigin}"`)
      }
      if (!VALID_ATTEMPT_RULES.has(sec.attemptRule)) {
        errors.push(`Invalid ${secPath}.attemptRule: "${sec.attemptRule}"`)
      }
      if (!VALID_ATTEMPT_RULE_ORIGINS.has(sec.attemptRuleOrigin)) {
        errors.push(`Invalid ${secPath}.attemptRuleOrigin: "${sec.attemptRuleOrigin}"`)
      }

      for (const sMarksKey of ['storedLegacyMarksValue', 'operationalSectionTotal', 'authoritativeSectionTotal', 'listedPotentialItemMarksTotal']) {
        const val = sec[sMarksKey]
        if (val !== null && (!Number.isFinite(val) || Number.isNaN(val))) {
          errors.push(`${secPath}.${sMarksKey} must be finite number or null`)
        }
      }

      if (!Array.isArray(sec.nodes)) {
        errors.push(`${secPath}.nodes must be an array`)
        return
      }

      sec.nodes.forEach((node, nIdx) => {
        const nodePath = `${secPath}.nodes[${nIdx}]`
        if (!node || typeof node !== 'object') {
          errors.push(`${nodePath} must be an object`)
          return
        }

        if (typeof node.id !== 'string' || !node.id.trim()) {
          errors.push(`${nodePath}.id must be a non-empty string`)
        } else {
          if (globalNodeIds.has(node.id)) {
            errors.push(`Duplicate node id "${node.id}" at ${nodePath}`)
          }
          globalNodeIds.add(node.id)
        }

        if (!VALID_NODE_TYPES.has(node.type)) {
          errors.push(`Invalid ${nodePath}.type: "${node.type}"`)
        }

        if (node.direction === 'dual') {
          errors.push(`${nodePath}.direction MUST NOT be "dual"`)
        } else if (!VALID_DIRECTIONS.has(node.direction)) {
          errors.push(`Invalid ${nodePath}.direction: "${node.direction}"`)
        }

        if (!VALID_NODE_MARKS_ORIGINS.has(node.nodeMarksOrigin)) {
          errors.push(`Invalid ${nodePath}.nodeMarksOrigin: "${node.nodeMarksOrigin}"`)
        }

        for (const nMarksKey of ['operationalNodeMarks', 'authoritativeNodeMarks']) {
          const val = node[nMarksKey]
          if (val !== null && (!Number.isFinite(val) || Number.isNaN(val))) {
            errors.push(`${nodePath}.${nMarksKey} must be finite number or null`)
          }
        }

        // Validate Provenance Contract
        if (!node.provenance || typeof node.provenance !== 'object') {
          errors.push(`${nodePath}.provenance must be an object`)
        } else {
          if (!VALID_CLASSIFICATION_CERTAINTIES.has(node.provenance.classificationCertainty)) {
            errors.push(
              `Invalid ${nodePath}.provenance.classificationCertainty: "${node.provenance.classificationCertainty}"`
            )
          }
          if (typeof node.provenance.academicTextMutated !== 'boolean') {
            errors.push(`${nodePath}.provenance.academicTextMutated must be a boolean`)
          }
          if (!Array.isArray(node.provenance.sourceSegmentIds)) {
            errors.push(`${nodePath}.provenance.sourceSegmentIds must be an array`)
          }
        }

        // Concrete Node Contract Enforcement
        validateConcreteNodeContract(node, nodePath, globalOptionIds, errors)
      })
    })
  }

  // 8. Source Coverage Ledger Validation
  if (doc.sourceCoverageLedger !== undefined) {
    if (!Array.isArray(doc.sourceCoverageLedger)) {
      errors.push('sourceCoverageLedger must be an array')
    } else {
      doc.sourceCoverageLedger.forEach((entry, cIdx) => {
        const entryPath = `sourceCoverageLedger[${cIdx}]`
        if (!entry || typeof entry !== 'object') {
          errors.push(`${entryPath} must be an object`)
          return
        }
        if (typeof entry.sourceSectionId !== 'string') {
          errors.push(`${entryPath}.sourceSectionId must be a string`)
        }
        if (entry.sourceField !== 'heading' && entry.sourceField !== 'content') {
          errors.push(`${entryPath}.sourceField must be "heading" or "content"`)
        }
        if (typeof entry.sourceSegmentId !== 'string') {
          errors.push(`${entryPath}.sourceSegmentId must be a string`)
        }
        if (entry.offsetUnit !== 'utf16-code-unit') {
          errors.push(`${entryPath}.offsetUnit must be "utf16-code-unit"`)
        }
        if (!Number.isInteger(entry.startOffset) || entry.startOffset < 0) {
          errors.push(`${entryPath}.startOffset must be a non-negative integer`)
        }
        if (!Number.isInteger(entry.endOffset) || entry.endOffset < entry.startOffset) {
          errors.push(`${entryPath}.endOffset must be an integer >= startOffset`)
        }
        if (typeof entry.rawSourceSnapshot !== 'string') {
          errors.push(`${entryPath}.rawSourceSnapshot must be a string`)
        }
        if (typeof entry.sourceSegmentSha256 !== 'string' || entry.sourceSegmentSha256.length !== 64) {
          errors.push(`${entryPath}.sourceSegmentSha256 must be a 64-char hex string`)
        }
        if (!Array.isArray(entry.targetCanonicalIds) || entry.targetCanonicalIds.length === 0) {
          errors.push(`${entryPath}.targetCanonicalIds must be a non-empty array of strings`)
        }
        if (!VALID_COVERAGE_STATUSES.has(entry.coverageStatus)) {
          errors.push(`Invalid ${entryPath}.coverageStatus: "${entry.coverageStatus}"`)
        }
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates concrete specialized node contracts.
 * BaseCanonicalNode is NOT a valid union member.
 */
function validateConcreteNodeContract(node, nodePath, globalOptionIds, errors) {
  switch (node.type) {
    case CanonicalNodeType.MCQ: {
      if (typeof node.stemText !== 'string') {
        errors.push(`${nodePath}.stemText must be a string`)
      }
      if (!Array.isArray(node.options) || node.options.length < 2) {
        errors.push(`${nodePath}.options must be an array of at least 2 options`)
      } else {
        node.options.forEach((opt, oIdx) => {
          const optPath = `${nodePath}.options[${oIdx}]`
          if (!opt || typeof opt !== 'object') {
            errors.push(`${optPath} must be an object`)
            return
          }
          if (typeof opt.id !== 'string' || !opt.id.trim()) {
            errors.push(`${optPath}.id must be a non-empty string`)
          } else {
            if (globalOptionIds.has(opt.id)) {
              errors.push(`Duplicate option id "${opt.id}" at ${optPath}`)
            }
            globalOptionIds.add(opt.id)
          }
          if (typeof opt.canonicalLabel !== 'string') {
            errors.push(`${optPath}.canonicalLabel must be a string`)
          }
          if (opt.sourceLabel !== null && typeof opt.sourceLabel !== 'string') {
            errors.push(`${optPath}.sourceLabel must be string or null`)
          }
          if (!VALID_LABEL_ORIGINS.has(opt.labelOrigin)) {
            errors.push(`Invalid ${optPath}.labelOrigin: "${opt.labelOrigin}"`)
          }
          if (typeof opt.text !== 'string') {
            errors.push(`${optPath}.text must be a string`)
          }
          if (opt.direction === 'dual') {
            errors.push(`${optPath}.direction MUST NOT be "dual"`)
          } else if (!VALID_DIRECTIONS.has(opt.direction)) {
            errors.push(`Invalid ${optPath}.direction: "${opt.direction}"`)
          }
          if (opt.isCorrect !== null && typeof opt.isCorrect !== 'boolean') {
            errors.push(`${optPath}.isCorrect must be boolean or null`)
          }
        })
      }
      break
    }

    case CanonicalNodeType.SHORT_QUESTION:
    case CanonicalNodeType.LONG_QUESTION:
    case CanonicalNodeType.ESSAY:
    case CanonicalNodeType.APPLICATION:
    case CanonicalNodeType.LETTER:
    case CanonicalNodeType.TRANSLATION:
    case CanonicalNodeType.DEFINITION: {
      if (typeof node.stemText !== 'string') {
        errors.push(`${nodePath}.stemText must be a string`)
      }
      if (!Array.isArray(node.subparts)) {
        errors.push(`${nodePath}.subparts must be an array`)
      } else {
        node.subparts.forEach((p, pIdx) => {
          const pPath = `${nodePath}.subparts[${pIdx}]`
          if (!p || typeof p !== 'object') {
            errors.push(`${pPath} must be an object`)
            return
          }
          if (typeof p.id !== 'string') {
            errors.push(`${pPath}.id must be a string`)
          }
          if (typeof p.stemText !== 'string') {
            errors.push(`${pPath}.stemText must be a string`)
          }
          if (p.direction === 'dual') {
            errors.push(`${pPath}.direction MUST NOT be "dual"`)
          } else if (!VALID_DIRECTIONS.has(p.direction)) {
            errors.push(`Invalid ${pPath}.direction: "${p.direction}"`)
          }
        })
      }
      break
    }

    case CanonicalNodeType.TRUE_FALSE: {
      if (typeof node.statement !== 'string') {
        errors.push(`${nodePath}.statement must be a string`)
      }
      if (typeof node.hasIndicatorBox !== 'boolean') {
        errors.push(`${nodePath}.hasIndicatorBox must be a boolean`)
      }
      if (node.expectedAnswer !== null && typeof node.expectedAnswer !== 'boolean') {
        errors.push(`${nodePath}.expectedAnswer must be boolean or null`)
      }
      break
    }

    case CanonicalNodeType.FILL_BLANK: {
      if (typeof node.fullText !== 'string') {
        errors.push(`${nodePath}.fullText must be a string`)
      }
      if (!Array.isArray(node.segments) || node.segments.length === 0) {
        errors.push(`${nodePath}.segments must be a non-empty array`)
      }
      if (typeof node.rawSource !== 'string') {
        errors.push(`${nodePath}.rawSource must be a string`)
      }
      if (node.wordBank !== null && !Array.isArray(node.wordBank)) {
        errors.push(`${nodePath}.wordBank must be an array or null`)
      }
      break
    }

    case CanonicalNodeType.MATCHING_COLUMNS: {
      if (!Array.isArray(node.leftItems) || node.leftItems.length === 0) {
        errors.push(`${nodePath}.leftItems must be a non-empty array`)
      }
      if (!Array.isArray(node.rightItems) || node.rightItems.length === 0) {
        errors.push(`${nodePath}.rightItems must be a non-empty array`)
      }
      if (node.correctMappings !== null && typeof node.correctMappings !== 'object') {
        errors.push(`${nodePath}.correctMappings must be an object or null`)
      }
      break
    }

    case CanonicalNodeType.GRAMMAR_TABLE: {
      if (typeof node.tableSemantic !== 'string') {
        errors.push(`${nodePath}.tableSemantic must be a string`)
      }
      if (!Array.isArray(node.columns) || node.columns.length === 0) {
        errors.push(`${nodePath}.columns must be a non-empty array`)
      }
      if (!Array.isArray(node.rows) || node.rows.length === 0) {
        errors.push(`${nodePath}.rows must be a non-empty array`)
      } else {
        node.rows.forEach((r, rIdx) => {
          const rPath = `${nodePath}.rows[${rIdx}]`
          if (!r || typeof r !== 'object') {
            errors.push(`${rPath} must be an object`)
          } else {
            if (typeof r.leftText !== 'string' || typeof r.rightText !== 'string') {
              errors.push(`${rPath} leftText and rightText must be strings`)
            }
          }
        })
      }
      break
    }

    case CanonicalNodeType.VERTICAL_MATH: {
      if (!Array.isArray(node.operands) || node.operands.length < 2) {
        errors.push(`${nodePath}.operands must be an array of at least 2 operands`)
      } else {
        node.operands.forEach((op, opIdx) => {
          const opPath = `${nodePath}.operands[${opIdx}]`
          if (!op || typeof op !== 'object' || typeof op.raw !== 'string') {
            errors.push(`${opPath} must be an object with string .raw`)
          }
        })
      }
      if (typeof node.operator !== 'string') {
        errors.push(`${nodePath}.operator must be a string`)
      }
      break
    }

    case CanonicalNodeType.RICH_TEXT: {
      if (typeof node.content !== 'string') {
        errors.push(`${nodePath}.content must be a string`)
      }
      break
    }

    case CanonicalNodeType.SCOPE_HEADER: {
      if (typeof node.headingText !== 'string') {
        errors.push(`${nodePath}.headingText must be a string`)
      }
      break
    }

    case CanonicalNodeType.SECTION_BANNER: {
      if (typeof node.bannerText !== 'string') {
        errors.push(`${nodePath}.bannerText must be a string`)
      }
      break
    }

    case CanonicalNodeType.UNKNOWN_PRESERVED: {
      if (typeof node.rawText !== 'string') {
        errors.push(`${nodePath}.rawText must be a string`)
      }
      if (!node.provenance || !Array.isArray(node.provenance.sourceSegmentIds)) {
        errors.push(`${nodePath}.provenance.sourceSegmentIds must be an array`)
      }
      break
    }

    default:
      errors.push(`Unhandled or unsupported concrete node type: "${node.type}" at ${nodePath}`)
  }
}
