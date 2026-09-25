// shortQuestionLayoutEngine.js — Deterministic Short Question Layout Engine for ASSPS Paper Generator

export const SHORT_LAYOUT_MODES = [
  { id: '2-column-balanced', label: '2 Columns (Vertical Split)', desc: 'Standard school examination layout: 1-5 left, 6-10 right' },
  { id: '1-column',          label: '1 Column',                   desc: 'Single continuous column' },
  { id: '2-column-row',      label: '2 Columns (Row-wise)',       desc: 'Horizontal pairing: 1|2, 3|4, 5|6' },
  { id: 'table',             label: 'Table Mode',                 desc: 'Structured tabular grid of questions' },
  { id: 'auto',              label: 'Auto',                       desc: 'Balanced 2-column if 4+ questions, else 1-column' },
]

/**
 * Deterministically splits questions into balanced columns for school papers.
 * Standard school exam requirement:
 * 10 questions: Left has 1-5, Right has 6-10.
 * 9 questions: Left has 1-5, Right has 6-9.
 */
export function splitQuestionsBalancedVertical(questions = []) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { left: [], right: [] }
  }
  const splitIndex = Math.ceil(questions.length / 2)
  const left = questions.slice(0, splitIndex)
  const right = questions.slice(splitIndex)
  return { left, right, splitIndex }
}

/**
 * Splits questions row-wise for alternative horizontal pairing (1|2, 3|4).
 */
export function splitQuestionsRowWise(questions = []) {
  const rows = []
  for (let i = 0; i < questions.length; i += 2) {
    rows.push([questions[i], questions[i + 1]].filter(Boolean))
  }
  return rows
}

/**
 * Resolves effective short question layout mode
 */
export function resolveShortLayoutMode(mode = '2-column-balanced', questionCount = 0) {
  if (mode === 'auto') {
    return questionCount >= 4 ? '2-column-balanced' : '1-column'
  }
  return mode
}
