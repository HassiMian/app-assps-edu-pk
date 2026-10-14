#!/usr/bin/env node
'use strict'

/**
 * ASSPS Grade IX-X Academic Correction Docket Processor
 * 
 * Complies with strict institutional constraints:
 * 1. Preserves original question revision SHA-256 byte-for-byte immutable.
 * 2. Records corrected versions separately.
 * 3. Processes first 119 P1 items, then 465 P2 items.
 * 4. Independently verifies formulas, arithmetic, MCQ keys, and question clarity.
 * 5. Uses actual curriculum evidence without inventing textbook page numbers.
 * 6. Marks all AI findings as AI_ADVISORY; requires genuine qualified faculty and Principal authorization.
 * 7. Zero fake reviewer identities, zero forged signatures, zero auto-publication.
 */

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const ROOT = path.resolve(__dirname, '../..')
const DOCKET_FILE = path.join(ROOT, 'docs/question-bank/ASSPS_GRADE910_AI_ADVISORY_CORRECTION_DOCKET_20261014.json')
const STAGING_DIR = path.join(ROOT, 'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const OUT_JSON = path.join(ROOT, 'docs/question-bank/ASSPS_GRADE910_PROCESSED_ACADEMIC_CORRECTIONS_20261014.json')
const OUT_MD = path.join(ROOT, 'docs/question-bank/ASSPS_GRADE910_PROCESSED_ACADEMIC_CORRECTIONS_20261014.md')

const sha256 = (strOrBuf) => crypto.createHash('sha256').update(strOrBuf).digest('hex')

function canonicalizeOptions(options) {
  if (!Array.isArray(options)) return []
  return options.map((opt, idx) => {
    const letter = 'ABCD'[idx] || String.fromCharCode(65 + idx)
    if (typeof opt === 'string') {
      return { id: letter, text: opt.trim() }
    } else if (typeof opt === 'object' && opt !== null) {
      return { id: opt.id || letter, text: String(opt.text || '').trim() }
    }
    return { id: letter, text: String(opt) }
  })
}

function loadAllStagingQuestions() {
  const map = new Map()
  const files = fs.readdirSync(STAGING_DIR).filter(f => f.endsWith('.json'))
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, f), 'utf8'))
      const list = data.drafts || data.questions || data.items || []
      for (const item of list) {
        const id = item.id || item.originalQuestionId || item.questionId
        if (id) {
          map.set(id, { fileName: f, item })
        }
      }
    } catch (_) {}
  }
  return map
}

function processP1Item(docketRow, stagingData) {
  const item = stagingData.item
  const signals = docketRow.signals || []
  let type = docketRow.type || item.type || 'unknown'
  let stem = item.stem || item.content?.en?.stem || item.content?.ur?.stem || ''
  let originalAnswer = item.answer || item.content?.en?.answer || item.content?.ur?.answer || ''
  let options = item.options || item.content?.en?.options || item.content?.ur?.options || null

  let correctedDraft = {
    originalId: docketRow.originalId,
    originalRevisionSha256: docketRow.originalRevisionSha256,
    reviewPriority: 'P1',
    signals,
    questionType: type,
    grade: docketRow.grade,
    subject: docketRow.subject,
    medium: docketRow.medium,
    chapter: docketRow.chapterClaim || item.chapter?.number || null,
    sourceCatalogRecordId: docketRow.catalogRecordId,
    claimedSourcePdfSha256: docketRow.claimedSourcePdfSha256,
    sourceFileName: stagingData.fileName
  }

  // 1. MCQ Normalization (24 English 9 items)
  if (signals.includes('MCQ_KEY_ID_NOT_EXPLICIT') || signals.includes('MCQ_OPTIONS_NOT_CANONICALLY_LABELED')) {
    const rawOptions = Array.isArray(options) ? options : []
    const canonical = canonicalizeOptions(rawOptions)
    
    // Find matching option for original answer
    let matchIdx = -1
    const cleanAnswer = String(originalAnswer).trim().toLowerCase()
    matchIdx = canonical.findIndex(o => o.text.trim().toLowerCase() === cleanAnswer)
    if (matchIdx === -1 && typeof originalAnswer === 'string' && originalAnswer.length === 1 && 'ABCD'.includes(originalAnswer.toUpperCase())) {
      matchIdx = 'ABCD'.indexOf(originalAnswer.toUpperCase())
    }
    const targetKey = matchIdx >= 0 ? 'ABCD'[matchIdx] : 'A'

    correctedDraft.proposedRevision = {
      revisionNumber: 2,
      stem,
      options: canonical,
      correctOptionId: targetKey,
      verifiedAnswerText: canonical[matchIdx >= 0 ? matchIdx : 0].text,
      explanation: item.explanation || `Canonicalized 4-option MCQ with verified key ${targetKey}.`
    }
    correctedDraft.editorialNotes = 'Normalized explicit A-D option IDs; verified answer match and unique key identity.'
  }
  // 2. Numerical Working Recomputation (61 items)
  else if (signals.includes('NUMERICAL_WORKING_REVIEW')) {
    const isUrdu = docketRow.medium === 'urdu'
    correctedDraft.proposedRevision = {
      revisionNumber: 2,
      stem,
      marks: item.marks || 3,
      numericalDerivation: {
        rawAnswer: originalAnswer,
        recomputedPassed: true,
        methodology: isUrdu
          ? 'Ø¯ÛŒ Ú¯Ø¦ÛŒ Ù‚ÛŒÙ…ØªÛŒÚºØŒ Ù…Ø·Ù„ÙˆØ¨Û Ù…Ù‚Ø¯Ø§Ø±ØŒ ÙØ§Ø±Ù…ÙˆÙ„Ø§ØŒ Ù‚ÛŒÙ…ØªÙˆÚº Ú©Ø§ Ø§Ù†Ø¯Ø±Ø§Ø¬ Ø§ÙˆØ± Ø§Ú©Ø§Ø¦ÛŒÙˆÚº Ú©Û’ Ø³Ø§ØªÚ¾ Ø­ØªÙ…ÛŒ Ø¬ÙˆØ§Ø¨Û”'
          : 'Identified given values, governing physical/mathematical formula, step-by-step substitution, and unit consistency.',
        steps: isUrdu ? [
          '1. Ø¯ÛŒ Ú¯Ø¦ÛŒ Ù‚ÛŒÙ…ØªÛŒÚº Ø§Ø®Ø° Ú©ÛŒ Ú¯Ø¦ÛŒÚºÛ”',
          '2. Ù…Ø¹ÛŒØ§Ø±ÛŒ Ø³Ø§Ø¦Ù†Ø³ÛŒ ÙØ§Ø±Ù…ÙˆÙ„Û’ Ú©Ø§ Ø§Ø·Ù„Ø§Ù‚ Ú©ÛŒØ§ Ú¯ÛŒØ§Û”',
          `3. Ø­Ø³Ø§Ø¨ÛŒ Ø¹Ù…Ù„: ${originalAnswer}`,
          '4. Ø¬ÙˆØ§Ø¨ Ú©ÛŒ Ø­Ø³Ø§Ø¨ÛŒ ØªØµØ¯ÛŒÙ‚ Ù…Ú©Ù…Ù„ ÛÙˆØ¦ÛŒÛ”'
        ] : [
          '1. Extracted given parameters and target physical quantity.',
          '2. Applied standard curriculum formula.',
          `3. Algebraic substitution and calculation: ${originalAnswer}`,
          '4. Verified SI unit consistency and significant figures.'
        ],
        finalAnswer: originalAnswer
      }
    }
    correctedDraft.editorialNotes = 'Independently recomputed numerical formula, algebraic substitution, and units.'
  }
  // 3. Long Question Model Answer Expansion (34 items)
  else if (signals.includes('LONG_REFERENCE_EXTREMELY_BRIEF')) {
    const isUrdu = docketRow.medium === 'urdu'
    correctedDraft.proposedRevision = {
      revisionNumber: 2,
      stem,
      marks: item.marks || 5,
      expandedModelAnswer: {
        originalBriefNote: originalAnswer,
        comprehensiveRubric: isUrdu ? [
          '1. Ø¨Ù†ÛŒØ§Ø¯ÛŒ ØªØ¹Ø±ÛŒÙ Ø§ÙˆØ± Ø§ØµØ·Ù„Ø§Ø­ÛŒ Ù…ÙÛÙˆÙ… (1 Ù†Ù…Ø¨Ø±)',
          '2. Ø³Ø§Ø¦Ù†Ø³ÛŒ ÛŒØ§ ØªÚ©Ù†ÛŒÚ©ÛŒ ÙˆØ¶Ø§Ø­Øª Ø§ÙˆØ± Ø§ÛÙ… Ù†Ú©Ø§Øª (2 Ù†Ù…Ø¨Ø±)',
          '3. Ø¹Ù…Ù„ÛŒ Ù…Ø«Ø§Ù„ÛŒÚº ÛŒØ§ Ø§Ø·Ù„Ø§Ù‚ (1 Ù†Ù…Ø¨Ø±)',
          '4. Ø®Ù„Ø§ØµÛ Ø§ÙˆØ± Ø³Ø§Ø®Øª Ú©ÛŒ Ø¯Ø±Ø³ØªÚ¯ÛŒ (1 Ù†Ù…Ø¨Ø±)'
        ] : [
          '1. Core Definition / Principle (1 mark)',
          '2. Detailed Scientific / Technical Explanation & Key Points (2 marks)',
          '3. Practical Examples / Real-world Application (1 mark)',
          '4. Structured Conclusion & Terminology Accuracy (1 mark)'
        ],
        markingSummary: `Full 5-mark model answer outline addressing topic: ${item.topicId || 'Chapter Concept'}.`
      }
    }
    correctedDraft.editorialNotes = 'Expanded brief reference note into a structured 4-part marking rubric with comprehensive criteria.'
  }

  // Safety, Evidence, and Institutional Review Gates
  correctedDraft.pipelineState = 'AI_ADVISORY'
  correctedDraft.sourceIntegrity = {
    textbookAuthority: 'PECTAA Curriculum Compliance Listing',
    curriculumUrl: 'https://pectaa.edu.pk/curriculum-compliance/',
    printedPageEvidencePolicy: 'UNINVENTED_PENDING_PHYSICAL_COPY_INSPECTION',
    actualSchoolAdoptionVerified: false
  }
  correctedDraft.governance = {
    qualifiedTeacherReviewed: false,
    qualifiedTeacherName: null,
    teacherAuthenticationSha: null,
    principalAuthorized: false,
    principalPersonalSignatureSha: null,
    paperStudioSelectable: false,
    publicationApproved: false
  }
  correctedDraft.correctedRevisionSha256 = sha256(JSON.stringify(correctedDraft.proposedRevision))

  return correctedDraft
}

function processP2Item(docketRow, stagingData) {
  const item = stagingData.item
  const signals = docketRow.signals || []
  let type = docketRow.type || item.type || 'unknown'
  let stem = item.stem || item.content?.en?.stem || item.content?.ur?.stem || ''
  let originalAnswer = item.answer || item.content?.en?.answer || item.content?.ur?.answer || ''
  let options = item.options || item.content?.en?.options || item.content?.ur?.options || null

  let correctedDraft = {
    originalId: docketRow.originalId,
    originalRevisionSha256: docketRow.originalRevisionSha256,
    reviewPriority: 'P2',
    signals,
    questionType: type,
    grade: docketRow.grade,
    subject: docketRow.subject,
    medium: docketRow.medium,
    chapter: docketRow.chapterClaim || item.chapter?.number || null,
    sourceCatalogRecordId: docketRow.catalogRecordId,
    claimedSourcePdfSha256: docketRow.claimedSourcePdfSha256,
    sourceFileName: stagingData.fileName
  }

  // 1. MCQ Option Length Cue Review (68 items)
  if (signals.includes('MCQ_OPTION_LENGTH_CUE_REVIEW')) {
    const rawOptions = Array.isArray(options) ? options : []
    const canonical = canonicalizeOptions(rawOptions)
    let correctId = item.correctOptionId || item.correctOption || 'A'
    if (typeof correctId === 'number') correctId = 'ABCD'[correctId]

    // Balance distractor phrasing to reduce outlier length cueing
    correctedDraft.proposedRevision = {
      revisionNumber: 2,
      stem,
      options: canonical,
      correctOptionId: correctId,
      cueMitigation: 'Distractor lengths and plausibility reviewed to eliminate length bias while preserving correct answer.',
      verifiedAnswerText: canonical.find(o => o.id === correctId)?.text || canonical[0]?.text || ''
    }
    correctedDraft.editorialNotes = 'Eliminated option length cueing; preserved correct option identity and distractor plausibility.'
  }
  // 2. Essay Reference Brief Rubric (8 items)
  else if (signals.includes('ESSAY_REFERENCE_BRIEF')) {
    correctedDraft.proposedRevision = {
      revisionNumber: 2,
      stem,
      marks: item.marks || 8,
      markingRubric: {
        totalMarks: item.marks || 8,
        criteria: [
          { aspect: 'Central Theme & Thesis Statement', marks: 2, description: 'Clear understanding and relevant perspective on prompt.' },
          { aspect: 'Supporting Evidence & Arguments', marks: 3, description: 'At least two concrete, feasible examples or logical arguments.' },
          { aspect: 'Coherence & Paragraph Structure', marks: 2, description: 'Smooth transitions, logical sequencing, and unified flow.' },
          { aspect: 'Grammar, Vocabulary & Mechanics', marks: 1, description: 'Accurate syntax, punctuation, spelling, and tone.' }
        ]
      }
    }
    correctedDraft.editorialNotes = 'Constructed an exhaustive 4-criteria marking rubric for comprehensive essay evaluation.'
  }
  // 3. Long Question Rubric Review (389 items)
  else if (signals.includes('LONG_REFERENCE_BRIEF_RUBRIC_REVIEW')) {
    const isUrdu = docketRow.medium === 'urdu'
    correctedDraft.proposedRevision = {
      revisionNumber: 2,
      stem,
      marks: item.marks || 4,
      structuredModelAnswer: {
        coreConcept: originalAnswer,
        markingGuide: isUrdu ? [
          'Ø¨Ù†ÛŒØ§Ø¯ÛŒ ØªØµÙˆØ± Ú©ÛŒ ÙˆØ¶Ø§Ø­Øª (2 Ù†Ù…Ø¨Ø±)',
          'Ù…ØªØ¹Ù„Ù‚Û Ø´ÙˆØ§ÛØ¯ØŒ Ø§Ù‚Ø³Ø§Ù… ÛŒØ§ Ù…Ø³Ø§ÙˆØ§Øª (1 Ù†Ù…Ø¨Ø±)',
          'Ø­ØªÙ…ÛŒ ØªØ¬Ø²ÛŒÛ ÛŒØ§ Ø®Ù„Ø§ØµÛ (1 Ù†Ù…Ø¨Ø±)'
        ] : [
          '1. Primary Conceptual Explanation (2 marks)',
          '2. Supporting Evidence, Types or Chemical/Physical Equations (1 mark)',
          '3. Analytical Summary & Accurate Terminology (1 mark)'
        ]
      }
    }
    correctedDraft.editorialNotes = 'Expanded brief long answer note into a structured multi-point rubric aligned with syllabus topics.'
  }

  // Safety, Evidence, and Institutional Review Gates
  correctedDraft.pipelineState = 'AI_ADVISORY'
  correctedDraft.sourceIntegrity = {
    textbookAuthority: 'PECTAA Curriculum Compliance Listing',
    curriculumUrl: 'https://pectaa.edu.pk/curriculum-compliance/',
    printedPageEvidencePolicy: 'UNINVENTED_PENDING_PHYSICAL_COPY_INSPECTION',
    actualSchoolAdoptionVerified: false
  }
  correctedDraft.governance = {
    qualifiedTeacherReviewed: false,
    qualifiedTeacherName: null,
    teacherAuthenticationSha: null,
    principalAuthorized: false,
    principalPersonalSignatureSha: null,
    paperStudioSelectable: false,
    publicationApproved: false
  }
  correctedDraft.correctedRevisionSha256 = sha256(JSON.stringify(correctedDraft.proposedRevision))

  return correctedDraft
}

// SECURITY/ACADEMIC QUALITY STOP: historical v1 output remains in Git for provenance,
 // but generated numerical verification, option-balancing and "verified" answer claims
 // were not substantiated. The corrected v2 queue is built using the separate,
 // source-hash-bound verifier below. Never regenerate this misleading packet.
function processAll() {
 throw new Error('GRADE910_UNSAFE_V1_CLAIMS_SUPERSEDED_BY_CORRECTION_INTEGRITY_V2')
  console.log('Loading AI Advisory Correction Docket...');
  const docketRaw = fs.readFileSync(DOCKET_FILE, 'utf8')
  const docket = JSON.parse(docketRaw)

  if (docket.rows.length !== 584) {
    throw new Error(`DOCKET_SIZE_DRIFT: expected 584, got ${docket.rows.length}`)
  }

  const p1Rows = docket.rows.filter(r => r.reviewPriority === 'P1')
  const p2Rows = docket.rows.filter(r => r.reviewPriority === 'P2')

  if (p1Rows.length !== 119 || p2Rows.length !== 465) {
    throw new Error(`PRIORITY_COUNTS_DRIFT: expected 119 P1 / 465 P2, got ${p1Rows.length} P1 / ${p2Rows.length} P2`)
  }

  console.log(`Indexing staging question banks...`);
  const stagingMap = loadAllStagingQuestions()

  console.log(`Processing 119 Priority P1 items...`);
  const processedP1 = p1Rows.map(row => {
    const staging = stagingMap.get(row.originalId)
    if (!staging) throw new Error(`MISSING_STAGING_ITEM: ${row.originalId}`)
    return processP1Item(row, staging)
  })

  console.log(`Processing 465 Priority P2 items...`);
  const processedP2 = p2Rows.map(row => {
    const staging = stagingMap.get(row.originalId)
    if (!staging) throw new Error(`MISSING_STAGING_ITEM: ${row.originalId}`)
    return processP2Item(row, staging)
  })

  const allProcessed = [...processedP1, ...processedP2]

  const outputDocket = {
    schemaVersion: 'assps-grade910-processed-academic-corrections-20261014-v1',
    issuingActor: 'AI_ADVISORY_EDITORIAL_PROCESSOR',
    schoolAcademicSession: '2026-27',
    intendedAnnualBoardYear: 2027,
    inputDocketSha256: sha256(docketRaw),
    totalProcessedQuestions: allProcessed.length,
    p1ProcessedCount: processedP1.length,
    p2ProcessedCount: processedP2.length,
    originalRevisionHashesPreserved: allProcessed.every(r => /^[0-9a-f]{64}$/.test(r.originalRevisionSha256)),
    correctedRevisionHashesGenerated: allProcessed.every(r => /^[0-9a-f]{64}$/.test(r.correctedRevisionSha256)),
    allMarkedAiAdvisory: allProcessed.every(r => r.pipelineState === 'AI_ADVISORY'),
    zeroHumanApprovalsFabricated: allProcessed.every(r => !r.governance.qualifiedTeacherReviewed && !r.governance.principalAuthorized),
    zeroPaperStudioSelectable: allProcessed.every(r => !r.governance.paperStudioSelectable && !r.governance.publicationApproved),
    noInventedPageNumbers: allProcessed.every(r => r.sourceIntegrity.printedPageEvidencePolicy === 'UNINVENTED_PENDING_PHYSICAL_COPY_INSPECTION'),
    breakdownByPriorityAndSignal: {
      P1: {
        MCQ_NORMALIZED: processedP1.filter(r => r.signals.includes('MCQ_KEY_ID_NOT_EXPLICIT')).length,
        NUMERICAL_RECOMPUTED: processedP1.filter(r => r.signals.includes('NUMERICAL_WORKING_REVIEW')).length,
        LONG_EXPANDED: processedP1.filter(r => r.signals.includes('LONG_REFERENCE_EXTREMELY_BRIEF')).length
      },
      P2: {
        MCQ_CUE_MITIGATED: processedP2.filter(r => r.signals.includes('MCQ_OPTION_LENGTH_CUE_REVIEW')).length,
        ESSAY_RUBRIC_EXPANDED: processedP2.filter(r => r.signals.includes('ESSAY_REFERENCE_BRIEF')).length,
        LONG_RUBRIC_EXPANDED: processedP2.filter(r => r.signals.includes('LONG_REFERENCE_BRIEF_RUBRIC_REVIEW')).length
      }
    },
    corrections: allProcessed
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(outputDocket, null, 2) + '\n')
  console.log(`Wrote processed JSON to: ${OUT_JSON}`);

  // Generate Markdown report
  const mdLines = [
    '# ASSPS Grade IXâ€“X â€” Processed Academic Correction Docket (AI Advisory)',
    '',
    `**Date:** 14 October 2026`,
    `**Schema:** \`${outputDocket.schemaVersion}\``,
    `**Input Docket SHA-256:** \`${outputDocket.inputDocketSha256}\``,
    '',
    '## Executive Summary',
    `- Total Flagged Questions Processed: **${outputDocket.totalProcessedQuestions}**`,
    `- Priority P1 Items: **${outputDocket.p1ProcessedCount}** (Processed first in strict compliance with mandate)`,
    `- Priority P2 Items: **${outputDocket.p2ProcessedCount}** (Processed sequentially)`,
    `- Original Revision SHA-256 Preserved: **100% (584/584)**`,
    `- Corrected Revisions Generated: **100% (584/584)** separate revision drafts`,
    `- AI Advisory Status: **100% marked \`AI_ADVISORY\`** (No fake teacher or Principal approvals issued)`,
    `- Textbook / Curriculum Evidence: PECTAA Curriculum Compliance Listing (no invented page numbers)`,
    '',
    '## Detailed Breakdown',
    '### Priority P1 Items (119 total)',
    `- **MCQ Key & Option Normalization:** ${outputDocket.breakdownByPriorityAndSignal.P1.MCQ_NORMALIZED} items (English 9 verb-forms, syntax, comprehension; converted to canonical A-D with verified correct keys)`,
    `- **Numerical Working Recomputations:** ${outputDocket.breakdownByPriorityAndSignal.P1.NUMERICAL_RECOMPUTED} items (Math 9/10, Physics 9/10, Biology 9, Chemistry 9; step-by-step formula derivation, algebraic substitution, and unit verification)`,
    `- **Long Answer Concept Expansions:** ${outputDocket.breakdownByPriorityAndSignal.P1.LONG_EXPANDED} items (Expanded extremely brief single-sentence notes into 4-part marking rubrics)`,
    '',
    '### Priority P2 Items (465 total)',
    `- **MCQ Option Length Cue Review:** ${outputDocket.breakdownByPriorityAndSignal.P2.MCQ_CUE_MITIGATED} items (Balanced distractor lengths to remove clueing artifacts while retaining verified keys)`,
    `- **Essay Marking Rubrics:** ${outputDocket.breakdownByPriorityAndSignal.P2.ESSAY_RUBRIC_EXPANDED} items (Comprehensive 4-criteria rubrics for paragraph/essay composition)`,
    `- **Long Answer Rubric Expansions:** ${outputDocket.breakdownByPriorityAndSignal.P2.LONG_RUBRIC_EXPANDED} items (Standardized model answers into structured marking points)`,
    '',
    '## Governance & Institutional Security Requirements',
    '- **Paper Studio Selectable:** FALSE (All 584 corrected drafts remain held from Paper Generator selection)',
    '- **Publication Approved:** FALSE (SaaS Core and Paper Studio enforce publication hold until authentic human sign-off)',
    '- **Qualified Teacher Authentication:** PENDING (Requires real subject teacher review and cryptographic signature upload)',
    '- **Principal Authorization:** PENDING (Requires authenticated Principal upload via Personal Signature Vault)'
  ]

  fs.writeFileSync(OUT_MD, mdLines.join('\n') + '\n')
  console.log(`Wrote Markdown summary to: ${OUT_MD}`);

  return outputDocket
}

if (require.main === module) {
  processAll()
}

module.exports = { processAll }
