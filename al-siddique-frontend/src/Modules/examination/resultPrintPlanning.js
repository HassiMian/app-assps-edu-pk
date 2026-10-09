// Per-card print choices must follow the examination actually attached to that
// student, particularly when the print batch mixes different exam sessions.
export const RESULT_TERM_KEYS = ['includeAssessment','includeFirstTerm','includeSecondTerm','includeThirdTerm','includeFinalTerm']
export function inferExamTermKey(exam = {}) {
 const description = `${exam.name ?? ''} ${exam.type ?? ''} ${exam.term ?? ''}`.toLowerCase()
 if (/assessment|monthly|quiz|weekly|unit\s*test/.test(description)) return 'includeAssessment'
 if (/\bfirst\b|\b1st\b|\bterm[\s-]*1\b|\bterm[\s-]*one\b/.test(description)) return 'includeFirstTerm'
 if (/\bsecond\b|\b2nd\b|\bterm[\s-]*2\b|\bterm[\s-]*two\b/.test(description)) return 'includeSecondTerm'
 if (/\bthird\b|\b3rd\b|\bterm[\s-]*3\b/.test(description)) return 'includeThirdTerm'
 if (/\bfinal\b|\bannual\b|\b4th\b|\bterm[\s-]*4\b/.test(description)) return 'includeFinalTerm'
 return null
}
export function resolveResultPrintOptions(options = {}, exam = {}) {
 if (!options.autoTermColumns) return options
 const selected = inferExamTermKey(exam)
 const flags = Object.fromEntries(RESULT_TERM_KEYS.map(k => [k, k === selected]))
 return { ...options, ...flags }
}
export function summarizePrintBatch(cards = []) {
 const summary = { cards:cards.length, scored:0, pending:0, absentLogo:0, missingSubject:0 }
 for (const card of cards) {
  if (!card?.school?.logo) summary.absentLogo++
  for (const row of card?.result?.subjects || []) {
   if (!row.subjectName || row.subjectName === '—') summary.missingSubject++
   if (row.hasMarks) summary.scored++
   else summary.pending++
  }
 }
 return summary
}
