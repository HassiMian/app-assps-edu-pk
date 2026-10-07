// structuredNodeDefaults.js — Factory functions for default user-created nodes.
// Produces working-data scaffolding with NO source provenance.

import {
  createInsertedMcqNode,
  createInsertedTrueFalseNode,
  createInsertedFillBlankNode,
  createInsertedMatchingNode,
  createInsertedGrammarNode,
  createInsertedVerticalMathNode,
  createInsertedOption,
  createInsertedSegment,
  createInsertedGrammarRow,
  createInsertedOperand,
  createInsertedMatchingItem,
} from './structuredNodeModel.js'

export const INSERTABLE_NODE_TYPES = [
  'mcq', 'true_false', 'fill_blank', 'matching_columns', 'grammar_table', 'vertical_math',
]

/**
 * Creates a default inserted node of the given type.
 * All user-created content: origin USER_CREATED, no source provenance, marks null.
 */
export function createDefaultInsertedNode(nodeType, nodeId, sectionId, allocate) {
  // allocate(kind) → user ID string
  switch (nodeType) {
    case 'mcq': {
      const optA = createInsertedOption(allocate('option'), { canonicalLabel: 'A', text: '' })
      const optB = createInsertedOption(allocate('option'), { canonicalLabel: 'B', text: '' })
      return createInsertedMcqNode(nodeId, sectionId, {
        stemText: '',
        options: [optA, optB],
      })
    }
    case 'true_false':
      return createInsertedTrueFalseNode(nodeId, sectionId, {
        statement: '',
        hasIndicatorBox: true,
        expectedAnswer: null,
      })
    case 'fill_blank': {
      const seg1 = createInsertedSegment(allocate('segment'), 'text', { value: '' })
      const blank = createInsertedSegment(allocate('segment'), 'blank', { value: '' })
      return createInsertedFillBlankNode(nodeId, sectionId, {
        segments: [seg1, blank],
        wordBank: [],
      })
    }
    case 'matching_columns': {
      const left1 = createInsertedMatchingItem(allocate('left-item'))
      const right1 = createInsertedMatchingItem(allocate('right-item'))
      return createInsertedMatchingNode(nodeId, sectionId, {
        leftItems: [left1],
        rightItems: [right1],
        correctMappings: null,
      })
    }
    case 'grammar_table': {
      const row1 = createInsertedGrammarRow(allocate('row'))
      return createInsertedGrammarNode(nodeId, sectionId, {
        columns: ['Column 1', 'Column 2'],
        rows: [row1],
      })
    }
    case 'vertical_math': {
      const op1 = createInsertedOperand(allocate('operand'), { raw: '', normalizedNumericValue: null })
      const op2 = createInsertedOperand(allocate('operand'), { raw: '', normalizedNumericValue: null })
      return createInsertedVerticalMathNode(nodeId, sectionId, {
        operands: [op1, op2],
        operator: '+',
        result: null,
      })
    }
    default:
      throw new Error(`createDefaultInsertedNode: unsupported nodeType '${nodeType}'`)
  }
}

/**
 * Generates the next option label character for a user-created MCQ option,
 * avoiding collision with existing source canonical labels.
 */
export function generateNextOptionLabel(existingOptions) {
  const usedLabels = new Set(
    existingOptions.map(o => o.canonicalLabel || o.displayLabel || '').filter(Boolean)
  )
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (const ch of letters) {
    if (!usedLabels.has(ch)) return ch
  }
  // Fallback for >26 options
  for (let i = 0; i < 100; i++) {
    const label = `OPT${i}`
    if (!usedLabels.has(label)) return label
  }
  return 'X'
}
