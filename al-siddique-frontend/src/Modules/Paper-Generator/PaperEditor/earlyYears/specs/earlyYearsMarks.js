import { getOverlay } from './EarlyYearsPresentationOverlay.js'

// Marks authority is the editable working copy. Teacher source is immutable.
// No marks are invented, redistributed or inferred from question count.
export function resolveEarlyYearsMarks(paper) {
  if (!paper) return { headerTotal:null, questionTotal:0, hasConflict:false, questionRows:[] }
  const sourceHeader = paper.headerSource?.totalMarks ?? paper.totalMarksSource?.headerTotal ?? null
  const headerOverride = getOverlay(paper.id, '__header__').totalMarksOverride
  const headerTotal = headerOverride === undefined ? sourceHeader : headerOverride
  const questionRows = (paper.questions || []).map(question => {
    const override = getOverlay(paper.id, question.id).marksOverride
    const marks = override === undefined ? question.marks : override
    return { id:question.id, label:question.label, marks }
  })
  const questionTotal = questionRows.reduce((sum, row) => sum + (Number(row.marks) || 0), 0)
  const hasConflict = headerTotal !== null && headerTotal !== undefined
    && Number(headerTotal) !== questionTotal
  return {
    sourceHeader,
    sourceQuestionTotal: (paper.questions || []).reduce((sum,q)=>sum + (Number(q.marks)||0),0),
    headerTotal,
    headerOverridden:headerOverride !== undefined,
    questionTotal,
    hasConflict,
    difference:headerTotal == null ? null : Number(headerTotal) - questionTotal,
    questionRows
  }
}
