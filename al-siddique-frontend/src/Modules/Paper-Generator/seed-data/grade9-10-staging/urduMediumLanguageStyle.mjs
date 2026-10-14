/**
 * ASSPS Urdu-medium Science/Mathematics language-style review (staging).
 * This module never validates academic content or grants publication approval.
 * Official textbook review informs a subject's prose convention; ordinary
 * established technical words do not require per-occurrence page evidence.
 */
const HAS_LATIN = /[A-Za-z]/;
const HAS_URDU = /[\u0600-\u06ff]/;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

export const USER_PREFERRED_SCIENTIFIC_IDENTITIES = Object.freeze([
  'genetics', 'gene', 'quantitative observation', 'qualitative observation',
  'hypothesis', 'deduction', 'Plasmodium',
]);

export function bidiPropsForTechnicalTerm(displayForm) {
  if (!nonempty(displayForm)) return {dir:'auto', lang:'und', style:{unicodeBidi:'isolate'}};
  const latin = HAS_LATIN.test(displayForm);
  return {
    dir: latin ? 'ltr' : HAS_URDU.test(displayForm) ? 'rtl' : 'auto',
    lang: latin ? 'en' : HAS_URDU.test(displayForm) ? 'ur' : 'und',
    style: {unicodeBidi:'isolate'},
  };
}

/**
 * termUsages are optional editorial annotations, not per-word source citations.
 * Each annotated surface form must actually appear in Urdu question or answer.
 * Terms can be supplied as a string or {conceptId,displayForm,...flags}.
 */
export function reviewUrduMediumStyle({
  subject, stemUr, answerUr = '', optionsUr = [],
  containsTechnicalVocabulary = false, termUsages = [],
  meaningConflict = false, editorialReviewed = false,
} = {}) {
  const errors = [], warnings = [];
  if (!nonempty(subject)) errors.push('subject required for subject-sensitive style review');
  if (!nonempty(stemUr)) errors.push('Urdu question stem required');
  if (answerUr != null && typeof answerUr !== 'string') errors.push('answerUr must be text');
  if (!Array.isArray(optionsUr)) errors.push('optionsUr must be an array');
  if (!Array.isArray(termUsages)) errors.push('termUsages must be an array');

  const optionText = Array.isArray(optionsUr)
    ? optionsUr.map(x => typeof x === 'string' ? x : x?.text).filter(nonempty).join(' ')
    : '';
  const body = [stemUr, answerUr, optionText].filter(nonempty).join(' ');
  let conflictFound = meaningConflict === true;
  const safeUsages = Array.isArray(termUsages) ? termUsages : [];
  for (const usage of safeUsages) {
    const item = typeof usage === 'string' ? {displayForm: usage, conceptId: usage} : usage;
    if (!item || !nonempty(item.displayForm)) {
      errors.push('annotated technical usage requires a nonempty displayForm');
      continue;
    }
    const id = nonempty(item.conceptId) ? item.conceptId : item.displayForm;
    if (!body.includes(item.displayForm)) errors.push(`${id}: annotated displayForm is absent from question/answer/options`);
    if (item.inventedPureUrdu === true || item.dictionaryGenerated === true)
      errors.push(`${id}: invented pure-Urdu / dictionary translation is prohibited`);
    if (item.meaningConflict === true || item.ambiguousMeaning === true) conflictFound = true;
    if (USER_PREFERRED_SCIENTIFIC_IDENTITIES.some(t => t.toLowerCase() === String(id).toLowerCase())
      && !HAS_LATIN.test(item.displayForm) && !item.bookReviewedAlternative)
      warnings.push(`${id}: user prefers a recognizable scientific form; check any alternative against the prescribed edition`);
  }
  if (containsTechnicalVocabulary === true && safeUsages.length === 0)
    warnings.push('technical vocabulary needs a language/editorial read; individual source-page citation is not required for every word');
  if (conflictFound)
    warnings.push('possible scientific meaning conflict requires independent subject/editorial review; never silently normalize');

  const needsLanguageReview = errors.length > 0 || conflictFound || warnings.length > 0 || editorialReviewed !== true;
  return {
    valid: errors.length === 0,
    errors, warnings,
    needsLanguageReview,
    styleReviewed: editorialReviewed === true && errors.length === 0 && !conflictFound && warnings.length === 0,
    // This is deliberately NEVER inferred from a language-style review.
    academicApprovalGranted: false,
    productionWriteAllowed: false,
  };
}
