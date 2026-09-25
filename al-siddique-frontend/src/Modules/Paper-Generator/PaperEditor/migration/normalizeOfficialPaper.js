// normalizeOfficialPaper.js — Authority-safe 43-paper normalization engine
import {
  parseMarksFormula,
  parseScalarMarks,
  parseContentItemMarks,
  countActualItems,
  parseAttemptRule,
  evaluateItemCountStatus,
} from './marksEvidence.js'

/**
 * Transparent Provenance Overrides Map
 *
 * Epistemic Gate: Isolates authentic provenance facts documented in `sourceTotalNote`
 * or `qaNotes` that veto operational V13 representations from being upgraded to
 * `TEACHER_EXPLICIT` merely because a normalizer inserted marks into headings.
 */
export const PROVENANCE_OVERRIDES = {
  // Paper 1: Class 1 Urdu — Derived from 5 explicit 10-mark sections; header unstated in source.
  'official-first-term-2026-class-1-urdu': {
    paperTotalOrigin: 'DERIVED_FROM_EXPLICIT_SECTION_EVIDENCE',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: 50,
    paperMarksStatus: 'BALANCED_DETERMINISTIC',
  },

  // Paper 2: Class 1 Countdown Mathematics — Provisional 50; sections unresolved (0 marks).
  'official-first-term-2026-class-1-countdown-mathematics': {
    paperTotalOrigin: 'PROVISIONAL_INFERENCE',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: null,
    hasProvisionalMarks: true,
    paperMarksStatus: 'PROVISIONAL_OR_RECONCILED',
  },

  // Paper 3: Class 1 English — Derived from 6+10+10+5+5 = 36; header unstated in source.
  // Section 2 has count mismatch: marked 10, only 8 items supplied.
  'official-first-term-2026-class-1-english': {
    paperTotalOrigin: 'DERIVED_FROM_EXPLICIT_SECTION_EVIDENCE',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: 36,
    hasItemCountConflict: true,
    paperMarksStatus: 'BALANCED_DETERMINISTIC',
  },

  // Paper 12: Class 3 English — Header 75 stated, but Q7 had NO mark in source (10 was inferred).
  'official-first-term-2026-class-3-english': {
    paperTotalOrigin: 'TEACHER_EXPLICIT',
    originalTeacherHeaderTotal: 75,
    authoritativePaperTotal: 75,
    hasProvisionalMarks: true,
    paperMarksStatus: 'PROVISIONAL_OR_RECONCILED',
    sections: {
      'official-first-term-2026-class-3-english-section-7': {
        sectionMarksOrigin: 'TRANSCRIBER_INFERRED',
        authoritativeSectionTotal: null,
        operationalSectionTotal: 10,
        evidence: 'Q7 had no mark value in source; 10 was inferred to reach stated total 75.',
      },
    },
  },

  // Paper 15: Class 4 Urdu — Header 75 stated, but Q6 had NO mark in source (5 provisionally assigned).
  'official-first-term-2026-class-4-urdu': {
    paperTotalOrigin: 'TEACHER_EXPLICIT',
    originalTeacherHeaderTotal: 75,
    authoritativePaperTotal: 75,
    hasProvisionalMarks: true,
    paperMarksStatus: 'PROVISIONAL_OR_RECONCILED',
    sections: {
      'official-first-term-2026-class-4-urdu-section-6': {
        sectionMarksOrigin: 'PROVISIONAL_RECONCILIATION',
        authoritativeSectionTotal: null,
        operationalSectionTotal: 5,
        evidence: 'Q6 had no mark value in source; 5 was provisionally assigned so the paper reaches 75.',
      },
    },
  },

  // Paper 17: Class 4 Social Studies — Neither paper total nor section marks were stated in source.
  'official-first-term-2026-class-4-social-studies': {
    paperTotalOrigin: 'PROVISIONAL_INFERENCE',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: null,
    hasProvisionalMarks: true,
    paperMarksStatus: 'PROVISIONAL_OR_RECONCILED',
    allSections: {
      sectionMarksOrigin: 'TRANSCRIBER_INFERRED',
      authoritativeSectionTotal: null,
      operationalSectionTotal: 10,
      evidence: 'Total marks and section marks were not stated in source; inferred from five-part layout.',
    },
  },

  // Paper 18: Class 4 Science — Derived from 10+20+10+20 = 60; header unstated in source.
  'official-first-term-2026-class-4-science': {
    paperTotalOrigin: 'DERIVED_FROM_EXPLICIT_SECTION_EVIDENCE',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: 60,
    paperMarksStatus: 'BALANCED_DETERMINISTIC',
  },

  // Paper 20: Class 5 Social Studies — Neither total nor section marks stated; 50 with 10/section is provisional.
  'official-first-term-2026-class-5-social-studies': {
    paperTotalOrigin: 'PROVISIONAL_INFERENCE',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: null,
    hasProvisionalMarks: true,
    paperMarksStatus: 'PROVISIONAL_OR_RECONCILED',
    allSections: {
      sectionMarksOrigin: 'TRANSCRIBER_INFERRED',
      authoritativeSectionTotal: null,
      operationalSectionTotal: 10,
      evidence: 'Total marks and individual section marks were not stated in source; 50 with 10 marks per section is provisional.',
    },
  },

  // Paper 21: Class 5 Urdu — Q6 heading in source included "10*6", operational treated as 10 to reconcile 75.
  'official-first-term-2026-class-5-urdu': {
    paperTotalOrigin: 'TEACHER_EXPLICIT',
    originalTeacherHeaderTotal: 75,
    authoritativePaperTotal: 75,
    hasProvisionalMarks: true,
    hasItemCountConflict: true,
    paperMarksStatus: 'PROVISIONAL_OR_RECONCILED',
    sections: {
      'official-first-term-2026-class-5-urdu-section-6': {
        sectionMarksOrigin: 'PROVISIONAL_RECONCILIATION',
        authoritativeSectionTotal: null,
        operationalSectionTotal: 10,
        evidence: 'Q6 source heading included "10*6" though five questions are listed; treated as 10 marks to reconcile 75.',
      },
    },
  },

  // Paper 28: Class 6 Mathematics — Stated 50; MCQs=5, Short=30, Long=20; Fill in blanks has no marks.
  'official-first-term-2026-class-6-mathematics': {
    paperTotalOrigin: 'TEACHER_EXPLICIT',
    originalTeacherHeaderTotal: 50,
    authoritativePaperTotal: 50,
    hasSourceHeaderConflict: true,
    hasItemCountConflict: true,
    paperMarksStatus: 'MIXED_EXPLICIT_AND_UNRESOLVED',
    evidence: 'Header states 50, but short (30) and long (20) already equal 50 before MCQs (5); fill in blanks has 0 marks.',
  },

  // Paper 32: Class 7 Science — Teacher top-line was "Marks: 20", corrected to 60 because sections sum to 60.
  'official-first-term-2026-class-7-science': {
    paperTotalOrigin: 'CORRECTED_FROM_CONFLICTING_SOURCE_HEADER',
    originalTeacherHeaderTotal: 20,
    storedConfiguredTotal: 60,
    authoritativePaperTotal: null,
    hasSourceHeaderConflict: true,
    paperMarksStatus: 'SOURCE_TOTAL_CONFLICT',
    evidence: 'Corrected from source top-line "Marks: 20" because explicit section marks total 60.',
  },

  // Paper 33: Class 7 Social Studies — Teacher top-line was "کل نمبر: 10", corrected to 50 because sections sum to 50.
  'official-first-term-2026-class-7-social-studies': {
    paperTotalOrigin: 'CORRECTED_FROM_CONFLICTING_SOURCE_HEADER',
    originalTeacherHeaderTotal: 10,
    storedConfiguredTotal: 50,
    authoritativePaperTotal: null,
    hasSourceHeaderConflict: true,
    paperMarksStatus: 'SOURCE_TOTAL_CONFLICT',
    evidence: 'Corrected from source top-line "کل نمبر: 10" because explicit section marks total 50.',
  },

  // Paper 36: Class 8 Social Studies — Provisional 50; Q1 has 10 marks, Q2-Q3 have unstated marks.
  'official-first-term-2026-class-8-social-studies': {
    paperTotalOrigin: 'PROVISIONAL_INFERENCE',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: null,
    hasProvisionalMarks: true,
    paperMarksStatus: 'PROVISIONAL_OR_RECONCILED',
  },

  // Paper 37: Class 8 Islamiyat — Header states 50, but only Q1 has marks (10); Q2-Q5 lack marks.
  'official-first-term-2026-class-8-islamiyat': {
    paperTotalOrigin: 'TEACHER_EXPLICIT',
    originalTeacherHeaderTotal: 50,
    authoritativePaperTotal: 50,
    paperMarksStatus: 'MIXED_EXPLICIT_AND_UNRESOLVED',
    evidence: 'Stated total 50; only Q1 has marks (10); Q2-Q5 have no marks in source.',
  },

  // Paper 39: Class 8 Computer — Header states 50; Q3 has 3 long questions of 10 marks each, attempt rule unspecified.
  'official-first-term-2026-class-8-computer': {
    paperTotalOrigin: 'TEACHER_EXPLICIT',
    originalTeacherHeaderTotal: 50,
    authoritativePaperTotal: 50,
    hasUnresolvedAttemptRule: true,
    paperMarksStatus: 'MIXED_EXPLICIT_AND_UNRESOLVED',
  },

  // Paper 40: Class 8 Mathematics — Total unstated (60 provisional); Long Q4 has unstated marks (20 provisional).
  'official-first-term-2026-class-8-mathematics': {
    paperTotalOrigin: 'PROVISIONAL_INFERENCE',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: null,
    hasProvisionalMarks: true,
    hasUnresolvedAttemptRule: true,
    hasItemCountConflict: true,
    paperMarksStatus: 'PROVISIONAL_OR_RECONCILED',
    sections: {
      'official-first-term-2026-class-8-mathematics-section-4': {
        sectionMarksOrigin: 'PROVISIONAL_RECONCILIATION',
        authoritativeSectionTotal: null,
        operationalSectionTotal: 20,
        evidence: 'Long-question marks/attempt rule were not stated; 20 is provisional to reach 60.',
      },
    },
  },

  // Paper 41: Class 8 English — Total unstated (75 provisional from neighbors); all sections 0 marks.
  'official-first-term-2026-class-8-english': {
    paperTotalOrigin: 'PROVISIONAL_INFERENCE',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: null,
    hasProvisionalMarks: true,
    paperMarksStatus: 'PROVISIONAL_OR_RECONCILED',
  },

  // Paper 42: Class 1 Science — Total unsupplied (0), all sections 0 marks.
  'official-first-term-2026-class-1-science': {
    paperTotalOrigin: 'UNRESOLVED_ZERO',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: null,
    paperMarksStatus: 'FULLY_UNRESOLVED',
  },

  // Paper 43: Class 1 Islamiyat — Total unsupplied (0), all sections 0 marks.
  'official-first-term-2026-class-1-islamiyat': {
    paperTotalOrigin: 'UNRESOLVED_ZERO',
    originalTeacherHeaderTotal: null,
    authoritativePaperTotal: null,
    paperMarksStatus: 'FULLY_UNRESOLVED',
  },
}

/**
 * Normalizes a single official paper record according to the 4-tier authority model.
 */
export function normalizeOfficialPaper(rawPaper, paperIndex) {
  const paperId = rawPaper.id
  const config = rawPaper.config || {}
  const storedConfiguredTotal = config.totalMarks ?? 0
  const sourceTotalNote = rawPaper.sourceTotalNote || null
  const qaNotes = rawPaper.qaNotes || null

  const override = PROVENANCE_OVERRIDES[paperId] || {}

  // Determine paper total origin & totals
  const originalTeacherHeaderTotal = override.originalTeacherHeaderTotal !== undefined
    ? override.originalTeacherHeaderTotal
    : (storedConfiguredTotal > 0 ? storedConfiguredTotal : null)

  const paperTotalOrigin = override.paperTotalOrigin || (
    storedConfiguredTotal === 0 ? 'UNRESOLVED_ZERO' : 'TEACHER_EXPLICIT'
  )

  const authoritativePaperTotal = override.authoritativePaperTotal !== undefined
    ? override.authoritativePaperTotal
    : (paperTotalOrigin === 'TEACHER_EXPLICIT' ? storedConfiguredTotal : null)

  const rawSections = rawPaper.selectedQuestions?.official_section?.questions || []

  let hasSourceHeaderConflict = override.hasSourceHeaderConflict || false
  let hasProvisionalMarks = override.hasProvisionalMarks || false
  let hasUnresolvedAttemptRule = override.hasUnresolvedAttemptRule || false
  let hasItemCountConflict = override.hasItemCountConflict || false

  let operationalSectionSum = 0
  let explicitSectionSum = 0
  let zeroSectionCount = 0

  const normalizedSections = rawSections.map((q, sIdx) => {
    const sectionIndex = sIdx + 1
    const sectionId = q.id || `${paperId}-section-${sectionIndex}`
    const heading = q.heading || ''
    const content = q.content || ''
    const storedLegacyMarksValue = q.marks ?? 0

    const formula = parseMarksFormula(heading)
    const scalar = parseScalarMarks(heading)
    const contentItemMarks = parseContentItemMarks(content)
    const actualItemCount = countActualItems(content)
    const attempt = parseAttemptRule(heading, content, actualItemCount, contentItemMarks.hasItemMarks)
    const itemCount = evaluateItemCountStatus(actualItemCount, formula, scalar)

    if (itemCount.itemCountStatus === 'SOURCE_COUNT_MISMATCH') {
      hasItemCountConflict = true
    }
    if (attempt.attemptRule === 'UNSPECIFIED') {
      hasUnresolvedAttemptRule = true
    }

    // Default section totals and origins
    let operationalSectionTotal = 0
    let authoritativeSectionTotal = null
    let sectionMarksOrigin = 'NONE'
    let evidence = 'Section lacks explicit marks'

    if (formula) {
      operationalSectionTotal = formula.formulaTotal
      authoritativeSectionTotal = formula.formulaTotal
      sectionMarksOrigin = 'TEACHER_EXPLICIT_FORMULA'
      evidence = `Formula ${formula.rawFormula} yields ${formula.formulaTotal} marks`
    } else if (scalar !== null) {
      operationalSectionTotal = scalar
      authoritativeSectionTotal = scalar
      sectionMarksOrigin = 'TEACHER_EXPLICIT_SCALAR'
      evidence = `Scalar heading notation (${scalar})`
    } else if (storedLegacyMarksValue > 0) {
      operationalSectionTotal = storedLegacyMarksValue
      authoritativeSectionTotal = storedLegacyMarksValue
      sectionMarksOrigin = 'LEGACY_UNKNOWN'
      evidence = `Legacy stored mark: ${storedLegacyMarksValue}`
    } else if (contentItemMarks.hasItemMarks) {
      operationalSectionTotal = storedLegacyMarksValue
      authoritativeSectionTotal = null
      sectionMarksOrigin = 'NONE'
      evidence = `Content declares ${contentItemMarks.itemMarksCount} item-level marks totaling ${contentItemMarks.listedPotentialItemMarksTotal}; attempt rule is ${attempt.attemptRule}`
    }

    // Apply section-specific overrides from provenance map
    if (override.allSections) {
      operationalSectionTotal = override.allSections.operationalSectionTotal
      authoritativeSectionTotal = override.allSections.authoritativeSectionTotal
      sectionMarksOrigin = override.allSections.sectionMarksOrigin
      evidence = override.allSections.evidence
    } else if (override.sections && override.sections[sectionId]) {
      const secOverride = override.sections[sectionId]
      operationalSectionTotal = secOverride.operationalSectionTotal
      authoritativeSectionTotal = secOverride.authoritativeSectionTotal
      sectionMarksOrigin = secOverride.sectionMarksOrigin
      evidence = secOverride.evidence
    }

    operationalSectionSum += operationalSectionTotal
    if (authoritativeSectionTotal !== null) {
      explicitSectionSum += authoritativeSectionTotal
    } else {
      zeroSectionCount++
    }

    return {
      sectionIndex,
      sectionId,
      heading,
      storedLegacyMarksValue,
      operationalSectionTotal,
      authoritativeSectionTotal,
      sectionMarksOrigin,
      explicitHeadingFormula: formula ? {
        rawFormula: formula.rawFormula,
        itemCount: formula.operandA,
        marksPerItem: formula.operandB,
        formulaTotal: formula.formulaTotal,
      } : null,
      explicitContentMarksEvidence: contentItemMarks.hasItemMarks,
      listedPotentialItemMarksTotal: contentItemMarks.listedPotentialItemMarksTotal,
      attemptRule: attempt.attemptRule,
      attemptCount: attempt.attemptCount,
      attemptRuleOrigin: attempt.attemptRuleOrigin,
      actualItemCount,
      formulaExpectedItemCount: itemCount.formulaExpectedItemCount,
      itemCountStatus: itemCount.itemCountStatus,
      rawSourceSnapshot: content,
      evidence,
    }
  })

  // Detect header conflict
  if (originalTeacherHeaderTotal !== null && operationalSectionSum !== originalTeacherHeaderTotal) {
    hasSourceHeaderConflict = true
  }

  // Determine paperMarksStatus
  let paperMarksStatus = override.paperMarksStatus
  if (!paperMarksStatus) {
    if (storedConfiguredTotal === 0 && zeroSectionCount === normalizedSections.length) {
      paperMarksStatus = 'FULLY_UNRESOLVED'
    } else if (zeroSectionCount === normalizedSections.length && storedConfiguredTotal > 0) {
      paperMarksStatus = 'HEADER_TOTAL_WITH_UNRESOLVED_SECTIONS'
    } else if (hasSourceHeaderConflict) {
      paperMarksStatus = 'SOURCE_TOTAL_CONFLICT'
    } else if (zeroSectionCount > 0 && explicitSectionSum > 0) {
      paperMarksStatus = 'MIXED_EXPLICIT_AND_UNRESOLVED'
    } else if (explicitSectionSum === storedConfiguredTotal && !hasProvisionalMarks) {
      paperMarksStatus = 'BALANCED_EXPLICIT'
    } else {
      paperMarksStatus = 'PROVISIONAL_OR_RECONCILED'
    }
  }

  return {
    paperIndex,
    paperId,
    className: config.className || config.classLevel || '',
    subject: config.subject || config.subjectName || '',
    storedConfiguredTotal,
    originalTeacherHeaderTotal,
    authoritativePaperTotal,
    paperTotalOrigin,
    paperMarksStatus,
    hasSourceHeaderConflict,
    hasProvisionalMarks,
    hasUnresolvedAttemptRule,
    hasItemCountConflict,
    sourceTotalNote,
    qaNotes,
    sections: normalizedSections,
  }
}

/**
 * Sorts object keys recursively to ensure strictly deterministic, byte-identical JSON output.
 */
export function sortObjectKeysRecursively(val) {
  if (val === null || typeof val !== 'object') {
    return val
  }
  if (Array.isArray(val)) {
    return val.map(sortObjectKeysRecursively)
  }
  const sorted = {}
  const keys = Object.keys(val).sort()
  for (const key of keys) {
    sorted[key] = sortObjectKeysRecursively(val[key])
  }
  return sorted
}

/**
 * Generates the full 43-paper normalization manifest from the operational v13 dataset.
 */
export function generate43NormalizationManifest(v13Dataset) {
  const papers = (v13Dataset.papers || []).map((p, idx) => normalizeOfficialPaper(p, idx + 1))
  const manifest = {
    schemaVersion: '1.0.0',
    datasetVersion: v13Dataset.version || 'v13',
    sourceSha256: v13Dataset.sourceSha256 || null,
    paperCount: papers.length,
    generatedAtBaseline: 'b47941ac7867af1b96664c53fd4428a59ccd5055',
    papers,
  }
  return sortObjectKeysRecursively(manifest)
}
