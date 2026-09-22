// mcqLayoutEngine.js — Section-specific MCQ Layout Engine for ASSPS Paper Generator
import { getDisplayOptionLabel } from './urduRtlEngine.js'

export const MCQ_LAYOUT_MODES = [
  { id: 'compact-grid', label: 'Compact Grid', desc: 'Full-width question stem with equal option cells beneath' },
  { id: 'matrix-table', label: 'Matrix Table', desc: 'Table with No. | Question | A | B | C | D columns' },
  { id: 'classic',      label: 'Classic Flow', desc: 'Question above with options listed in columns' },
  { id: 'auto',         label: 'Auto Smart',   desc: 'Selects optimal columns based on option lengths' },
]

export function resolveMcqColumns(question, requestedCols = 4) {
  if (requestedCols && requestedCols >= 1 && requestedCols <= 4 && requestedCols !== 'auto') {
    return Number(requestedCols)
  }
  const options = question.options || []
  if (!options.length) return 4
  const maxLen = options.reduce((max, opt) => Math.max(max, (opt.text || opt.textUrdu || '').length), 0)
  if (maxLen > 36) return 1
  if (maxLen > 18) return 2
  return 4
}

export function chunkOptions(options = [], columns = 4) {
  const safeCols = Math.max(1, Math.min(4, columns))
  const chunks = []
  for (let i = 0; i < options.length; i += safeCols) {
    chunks.push(options.slice(i, i + safeCols))
  }
  return chunks
}

export function normalizeQuestionOptions(options = [], isUrdu = false) {
  return options.map((opt, index) => {
    const label = opt.label || String.fromCharCode(65 + index)
    const displayLabel = opt.displayLabel || getDisplayOptionLabel(label, isUrdu)
    return {
      ...opt,
      label,
      displayLabel,
    }
  })
}
