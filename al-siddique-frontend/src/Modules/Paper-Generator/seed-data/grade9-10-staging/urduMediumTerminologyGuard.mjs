import {reviewUrduMediumStyle, bidiPropsForTechnicalTerm} from './urduMediumLanguageStyle.mjs';

// Optional evidence-bound glossary validation. It is NOT invoked automatically
// for every ordinary scientific word in an Urdu-medium question.
const MODES = new Set(['LATIN_TERM_RETAINED','TEXTBOOK_URDU_TRANSLITERATION','TEXTBOOK_URDU_EQUIVALENT','TEXTBOOK_MIXED_FORM']);
const HASH = /^[a-f0-9]{64}$/i;
const text = x => typeof x === 'string' && x.trim().length > 0;
export function validateTextbookTermEvidence(term) {
  const errors = [];
  if (!term || typeof term !== 'object') return {valid:false,errors:['term evidence object required']};
  if (!text(term.conceptId) || !text(term.englishTerm)) errors.push('concept identity and English term required');
  if (!text(term.verifiedTextbookForm)) errors.push('exact verified textbook form required');
  if (!MODES.has(term.renderingMode)) errors.push('textbook rendering mode required');
  const e = term.evidence;
  if (!e || !text(e.catalogRecordId) || !HASH.test(e.pdfSha256 || '') || !Number.isInteger(e.physicalPage) || e.physicalPage < 1 || !text(e.anchor))
    errors.push('exact official textbook catalog/hash/page/anchor evidence required');
  if (e?.reviewStatus !== 'VISUALLY_VERIFIED') errors.push('term evidence must be visually verified');
  if (term.dictionaryGenerated === true || term.inventedPureUrdu === true)
    errors.push('dictionary or invented pure-Urdu translation prohibited');
  return {valid:errors.length === 0,errors};
}

/**
 * Backwards-compatible entry point, corrected to convention review.
 * Academic question evidence remains enforced independently in questionContract
 * and releaseAudit. technicalTerms are OPTIONAL and may be strings or annotations.
 */
export function validateUrduQuestionTerminology({
  subject = 'Science', stemUr, answerUr = '', optionsUr = [],
  containsTechnicalVocabulary = false, technicalTerms = [],
  meaningConflict = false, editorialReviewed = false,
} = {}) {
  const termUsages = Array.isArray(technicalTerms)
    ? technicalTerms.map(term => typeof term === 'string' ? term : ({
        conceptId: term?.conceptId || term?.englishTerm,
        displayForm: term?.surfaceForm || term?.preferredForm || term?.verifiedTextbookForm || term?.englishTerm,
        inventedPureUrdu: term?.inventedPureUrdu,
        dictionaryGenerated: term?.dictionaryGenerated,
        meaningConflict: term?.meaningConflict,
        ambiguousMeaning: term?.ambiguousMeaning,
        bookReviewedAlternative: term?.bookReviewedAlternative,
      }))
    : technicalTerms;
  return reviewUrduMediumStyle({
    subject,stemUr,answerUr,optionsUr,containsTechnicalVocabulary,termUsages,
    meaningConflict,editorialReviewed,
  });
}
export {bidiPropsForTechnicalTerm};
