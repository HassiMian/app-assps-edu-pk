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
 const summary = { cards:cards.length, scored:0, pending:0, absentLogo:0, missingSubject:0, ungraded:0, missingStudent:0, unscoredCards:0 }
 for (const card of cards) {
  if (!card?.school?.logo) summary.absentLogo++
  if (!card?.student?.name || card.student.name === '—') summary.missingStudent++
  const subjects = card?.result?.subjects || []
  if (!subjects.some(row => typeof row.isComplete === 'boolean' ? row.isComplete : row.hasMarks)) summary.unscoredCards++
  for (const row of subjects) {
   if (!row.subjectName || row.subjectName === '—') summary.missingSubject++
   if (typeof row.isComplete === 'boolean' ? row.isComplete : row.hasMarks) summary.scored++
   else summary.pending++
   // Original school bands can leave gaps at fractional percentages. Never
   // silently invent a grade or let a complete but ungraded record print.
   if (row.isComplete === true && row.percentage !== null && (row.grade === '—' || !row.grade)) summary.ungraded++
  }
 }
 return summary
}
