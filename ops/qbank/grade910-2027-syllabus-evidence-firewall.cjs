'use strict'
// Pure source-research classifier: fail CLOSED. Academic approval is never inferred from public metadata.
const ledger = require('../../docs/question-bank/ASSPS_GRADE910_OFFICIAL_SYLLABUS_AUTHORITY_LEDGER_20261017.json')
const VALID_MODES = new Set(['full', 'alp'])
const APPROVED_TYPES = new Set(['ALP_NOTIFICATION', 'MATRIC_TECH_MODEL_AND_PAIRING',
  'TEXTBOOK_CATALOG_INDEX', 'BOARD_SYLLABUS_INDEX', 'LEARNING_OUTCOMES_INDEX'])
const freezeDeep = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep)
    Object.freeze(value)
  }
  return value
}
freezeDeep(ledger)

function validateResearchLedger (source = ledger) {
  if (!source || !Array.isArray(source.records) || source.records.length !== 5 ||
      source.verifiedPublicationAllowed !== false ||
      source.asspsBoardAffiliationAuthenticated !== false ||
      source.schoolTextbookAdoptionAuthenticated !== false ||
      source.facultyRevisionApprovalCount !== 0) {
    throw new Error('GRADE910_RESEARCH_LEDGER_RELEASE_ASSERTION_REFUSED')
  }
  const ids = new Set()
  for (const record of source.records) {
    if (ids.has(record.id) || typeof record.id !== 'string' || !APPROVED_TYPES.has(record.sourceType) ||
        !Array.isArray(record.grades) || !record.grades.length ||
        !/^https:\/\//.test(record.originalUrl) ||
        record.originalPdfByteSha256 !== null || record.originalPdfBytesVerified !== false ||
        record.schoolAdoptionAuthenticated !== false) {
      throw new Error('GRADE910_RESEARCH_LEDGER_PROVENANCE_ASSERTION_REFUSED')
    }
    ids.add(record.id)
  }
  const alp = source.records.find(r => r.id === 'pectaa-revised-grade9-alp-annual2026')
  const tech = source.records.find(r => r.id === 'pectaa-grade9-tech-model-annual2026')
  if (!alp || alp.sourceType !== 'ALP_NOTIFICATION' || alp.applicableAnnualExamYear !== 2026 ||
      alp.notificationId !== 'PECTAA/C&C Unit/2025/376' || !tech ||
      tech.sourceType !== 'MATRIC_TECH_MODEL_AND_PAIRING' ||
      tech.applicableAnnualExamYear !== 2026 ||
      tech.notificationId !== 'PECTAA/C&C Unit/2025/326') {
    throw new Error('GRADE910_RESEARCH_LEDGER_2026_YEAR_IDENTITY_REFUSED')
  }
  return true
}
validateResearchLedger()

function classifySyllabusEvidence (request = {}) {
  const { sourceId, syllabusMode = 'full', examYear, grade, stream } = request
  const source = ledger.records.find(r => r.id === sourceId)
  const reasons = []
  if (!VALID_MODES.has(syllabusMode)) reasons.push('INVALID_SYLLABUS_MODE')
  if (!Number.isInteger(examYear) || examYear < 2000 || examYear > 2100) reasons.push('EXAM_YEAR_NOT_VERIFIED')
  if (![9, 10].includes(grade)) reasons.push('GRADE_NOT_VERIFIED')
  if (!source) reasons.push('SOURCE_NOT_IN_TRUSTED_LEDGER')
  if (source && !source.grades.includes(grade)) reasons.push('SOURCE_GRADE_MISMATCH')
  if (source && source.applicableAnnualExamYear !== null && source.applicableAnnualExamYear !== examYear) {
    reasons.push('SOURCE_ANNUAL_EXAM_YEAR_MISMATCH')
  }
  if (source && source.sourceType === 'MATRIC_TECH_MODEL_AND_PAIRING' && stream !== 'matric-tech') {
    reasons.push('MATRIC_TECH_STREAM_NOT_AUTHENTICATED')
  }
  if (source && source.sourceType === 'MATRIC_TECH_MODEL_AND_PAIRING' && syllabusMode === 'alp') {
    reasons.push('MATRIC_TECH_PAIRING_IS_NOT_ALP')
  }
  if (syllabusMode === 'alp' && (!source || source.sourceType !== 'ALP_NOTIFICATION')) {
    reasons.push('NOT_AN_ALP_NOTIFICATION')
  }
  if (source && source.sourceType === 'TEXTBOOK_CATALOG_INDEX') reasons.push('CATALOG_LABEL_NOT_SCHOOL_ADOPTION')
  if (source && source.sourceType === 'BOARD_SYLLABUS_INDEX') reasons.push('BOARD_INDEX_NOT_2027_ALP')
  if (source && source.sourceType === 'LEARNING_OUTCOMES_INDEX') reasons.push('NATIONAL_OUTCOMES_NOT_BOARD_SCHEME')
  reasons.push('ORIGINAL_DOCUMENT_SHA_NOT_AUTHENTICATED')
  reasons.push('ASSPS_ADOPTED_TEXTBOOK_AND_STREAM_NOT_ATTESTED')
  reasons.push('INDEPENDENT_FACULTY_REVISION_APPROVAL_ABSENT')
  reasons.push('PAPER_STUDIO_AND_CORE_RELEASE_NOT_CERTIFIED')
  return Object.freeze({
    status: 'RESEARCH_EVIDENCE_HOLD',
    sourceId: source ? source.id : null,
    sourceType: source ? source.sourceType : null,
    requestedExamYear: Number.isInteger(examYear) ? examYear : null,
    requestedSyllabusMode: syllabusMode,
    researchDefault: syllabusMode === 'full' ? 'FULL_BOOK_RESEARCH_ONLY' : 'DO_NOT_SILENTLY_SUBSTITUTE_FULL_FOR_ALP',
    paperStudioVerifiedSelectable: false,
    academicallyApproved: false,
    autoExcludeChaptersOrExercises: false,
    schoolAdoptionVerified: false,
    originalPdfByteSha256Verified: false,
    reasons: Object.freeze([...new Set(reasons)])
  })
}

module.exports = { ledger, validateResearchLedger, classifySyllabusEvidence }
