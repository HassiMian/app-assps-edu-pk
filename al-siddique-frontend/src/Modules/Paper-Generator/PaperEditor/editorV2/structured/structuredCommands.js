// structuredCommands.js — Command factories for all B4 structural transactions.
// Each command carries its inverse to enable O(1) undo without full-document snapshots.

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND TYPE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
export const CMD = {
  // MCQ
  UPDATE_MCQ_OPTION_TEXT:       'UPDATE_MCQ_OPTION_TEXT',
  ADD_MCQ_OPTION:               'ADD_MCQ_OPTION',
  REMOVE_MCQ_OPTION:            'REMOVE_MCQ_OPTION',
  REORDER_MCQ_OPTIONS:          'REORDER_MCQ_OPTIONS',
  UPDATE_MCQ_OPTION_DIRECTION:  'UPDATE_MCQ_OPTION_DIRECTION',
  // True/False
  UPDATE_TF_STATEMENT:          'UPDATE_TF_STATEMENT',
  UPDATE_TF_INDICATOR:          'UPDATE_TF_INDICATOR',
  // Fill Blank
  UPDATE_FILL_SEGMENT_TEXT:     'UPDATE_FILL_SEGMENT_TEXT',
  INSERT_FILL_SEGMENT:          'INSERT_FILL_SEGMENT',
  REMOVE_FILL_SEGMENT:          'REMOVE_FILL_SEGMENT',
  REORDER_FILL_SEGMENTS:        'REORDER_FILL_SEGMENTS',
  UPDATE_WORD_BANK:             'UPDATE_WORD_BANK',
  // Matching
  UPDATE_MATCHING_LEFT:         'UPDATE_MATCHING_LEFT',
  UPDATE_MATCHING_RIGHT:        'UPDATE_MATCHING_RIGHT',
  ADD_MATCHING_LEFT:            'ADD_MATCHING_LEFT',
  ADD_MATCHING_RIGHT:           'ADD_MATCHING_RIGHT',
  REMOVE_MATCHING_LEFT:         'REMOVE_MATCHING_LEFT',
  REMOVE_MATCHING_RIGHT:        'REMOVE_MATCHING_RIGHT',
  REORDER_MATCHING_LEFT:        'REORDER_MATCHING_LEFT',
  REORDER_MATCHING_RIGHT:       'REORDER_MATCHING_RIGHT',
  // Grammar
  UPDATE_GRAMMAR_HEADERS:       'UPDATE_GRAMMAR_HEADERS',
  UPDATE_GRAMMAR_CELL:          'UPDATE_GRAMMAR_CELL',
  TOGGLE_GRAMMAR_BLANK:         'TOGGLE_GRAMMAR_BLANK',
  ADD_GRAMMAR_ROW:              'ADD_GRAMMAR_ROW',
  REMOVE_GRAMMAR_ROW:           'REMOVE_GRAMMAR_ROW',
  REORDER_GRAMMAR_ROWS:         'REORDER_GRAMMAR_ROWS',
  // Vertical Math
  UPDATE_VERTICAL_OPERAND:      'UPDATE_VERTICAL_OPERAND',
  ADD_VERTICAL_OPERAND:         'ADD_VERTICAL_OPERAND',
  REMOVE_VERTICAL_OPERAND:      'REMOVE_VERTICAL_OPERAND',
  REORDER_VERTICAL_OPERANDS:    'REORDER_VERTICAL_OPERANDS',
  UPDATE_VERTICAL_OPERATOR:     'UPDATE_VERTICAL_OPERATOR',
  SET_VERTICAL_RESULT:          'SET_VERTICAL_RESULT',
  REMOVE_VERTICAL_RESULT:       'REMOVE_VERTICAL_RESULT',
  // Node
  INSERT_NODE:                  'INSERT_NODE',
  DELETE_NODE:                  'DELETE_NODE',
  UNDELETE_NODE:                'UNDELETE_NODE',
  DUPLICATE_NODE:               'DUPLICATE_NODE',
  MOVE_NODE:                    'MOVE_NODE',
  // Generic nested field
  SET_NODE_PATCH_FIELD:         'SET_NODE_PATCH_FIELD',
}

let _cmdSeq = 0

/**
 * Creates a structural command object.
 * @param {string} type — one of CMD.*
 * @param {string} nodeId
 * @param {string} sectionId
 * @param {object} payload — command-specific data
 * @param {object} inverse — pre-computed inverse command (for undo)
 */
export function makeCommand(type, nodeId, sectionId, payload, inverse) {
  return {
    id: `cmd__${++_cmdSeq}`,
    type,
    nodeId,
    sectionId,
    payload,
    inverse,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND FACTORIES — each returns { command, inverse }
// ─────────────────────────────────────────────────────────────────────────────

export function cmdUpdateMcqOptionText(nodeId, sectionId, optionId, newText, prevText) {
  const inverse = makeCommand(CMD.UPDATE_MCQ_OPTION_TEXT, nodeId, sectionId, { optionId, text: prevText }, null)
  const cmd = makeCommand(CMD.UPDATE_MCQ_OPTION_TEXT, nodeId, sectionId, { optionId, text: newText }, inverse)
  return cmd
}

export function cmdAddMcqOption(nodeId, sectionId, newOption, afterId) {
  const inverse = makeCommand(CMD.REMOVE_MCQ_OPTION, nodeId, sectionId, { optionId: newOption.id }, null)
  return makeCommand(CMD.ADD_MCQ_OPTION, nodeId, sectionId, { newOption, afterId }, inverse)
}

export function cmdRemoveMcqOption(nodeId, sectionId, optionId, optionSnapshot, afterId) {
  const inverse = makeCommand(CMD.ADD_MCQ_OPTION, nodeId, sectionId, { newOption: optionSnapshot, afterId }, null)
  return makeCommand(CMD.REMOVE_MCQ_OPTION, nodeId, sectionId, { optionId }, inverse)
}

export function cmdReorderMcqOptions(nodeId, sectionId, newOrder, prevOrder) {
  const inverse = makeCommand(CMD.REORDER_MCQ_OPTIONS, nodeId, sectionId, { optionOrder: prevOrder }, null)
  return makeCommand(CMD.REORDER_MCQ_OPTIONS, nodeId, sectionId, { optionOrder: newOrder }, inverse)
}

export function cmdUpdateTfStatement(nodeId, sectionId, newText, prevText) {
  const inverse = makeCommand(CMD.UPDATE_TF_STATEMENT, nodeId, sectionId, { text: prevText }, null)
  return makeCommand(CMD.UPDATE_TF_STATEMENT, nodeId, sectionId, { text: newText }, inverse)
}

export function cmdUpdateTfIndicator(nodeId, sectionId, newVal, prevVal) {
  const inverse = makeCommand(CMD.UPDATE_TF_INDICATOR, nodeId, sectionId, { hasIndicatorBox: prevVal }, null)
  return makeCommand(CMD.UPDATE_TF_INDICATOR, nodeId, sectionId, { hasIndicatorBox: newVal }, inverse)
}

export function cmdUpdateFillSegmentText(nodeId, sectionId, segId, newVal, prevVal) {
  const inverse = makeCommand(CMD.UPDATE_FILL_SEGMENT_TEXT, nodeId, sectionId, { segId, value: prevVal }, null)
  return makeCommand(CMD.UPDATE_FILL_SEGMENT_TEXT, nodeId, sectionId, { segId, value: newVal }, inverse)
}

export function cmdInsertFillSegment(nodeId, sectionId, newSeg, afterSegId, prevOrder) {
  const inverse = makeCommand(CMD.REMOVE_FILL_SEGMENT, nodeId, sectionId, { segId: newSeg.id, prevOrder }, null)
  return makeCommand(CMD.INSERT_FILL_SEGMENT, nodeId, sectionId, { newSeg, afterSegId }, inverse)
}

export function cmdRemoveFillSegment(nodeId, sectionId, segId, segSnapshot, prevOrder) {
  const inverse = makeCommand(CMD.INSERT_FILL_SEGMENT, nodeId, sectionId, { newSeg: segSnapshot, afterSegId: prevOrder[prevOrder.indexOf(segId) - 1] || null }, null)
  return makeCommand(CMD.REMOVE_FILL_SEGMENT, nodeId, sectionId, { segId, prevOrder }, inverse)
}

export function cmdReorderFillSegments(nodeId, sectionId, newOrder, prevOrder) {
  const inverse = makeCommand(CMD.REORDER_FILL_SEGMENTS, nodeId, sectionId, { segmentOrder: prevOrder }, null)
  return makeCommand(CMD.REORDER_FILL_SEGMENTS, nodeId, sectionId, { segmentOrder: newOrder }, inverse)
}

export function cmdUpdateWordBank(nodeId, sectionId, newBank, prevBank) {
  const inverse = makeCommand(CMD.UPDATE_WORD_BANK, nodeId, sectionId, { wordBank: prevBank }, null)
  return makeCommand(CMD.UPDATE_WORD_BANK, nodeId, sectionId, { wordBank: newBank }, inverse)
}

export function cmdUpdateMatchingSide(side, nodeId, sectionId, itemId, newText, prevText) {
  const type = side === 'left' ? CMD.UPDATE_MATCHING_LEFT : CMD.UPDATE_MATCHING_RIGHT
  const inverse = makeCommand(type, nodeId, sectionId, { itemId, text: prevText }, null)
  return makeCommand(type, nodeId, sectionId, { itemId, text: newText }, inverse)
}

export function cmdAddMatchingItem(side, nodeId, sectionId, newItem, prevOrder) {
  const type = side === 'left' ? CMD.ADD_MATCHING_LEFT : CMD.ADD_MATCHING_RIGHT
  const removeType = side === 'left' ? CMD.REMOVE_MATCHING_LEFT : CMD.REMOVE_MATCHING_RIGHT
  const inverse = makeCommand(removeType, nodeId, sectionId, { itemId: newItem.id, prevOrder }, null)
  return makeCommand(type, nodeId, sectionId, { newItem }, inverse)
}

export function cmdRemoveMatchingItem(side, nodeId, sectionId, itemId, itemSnapshot, prevOrder) {
  const type = side === 'left' ? CMD.REMOVE_MATCHING_LEFT : CMD.REMOVE_MATCHING_RIGHT
  const addType = side === 'left' ? CMD.ADD_MATCHING_LEFT : CMD.ADD_MATCHING_RIGHT
  const inverse = makeCommand(addType, nodeId, sectionId, { newItem: itemSnapshot }, null)
  return makeCommand(type, nodeId, sectionId, { itemId, prevOrder }, inverse)
}

export function cmdReorderMatchingSide(side, nodeId, sectionId, newOrder, prevOrder) {
  const type = side === 'left' ? CMD.REORDER_MATCHING_LEFT : CMD.REORDER_MATCHING_RIGHT
  const inverse = makeCommand(type, nodeId, sectionId, { order: prevOrder }, null)
  return makeCommand(type, nodeId, sectionId, { order: newOrder }, inverse)
}

export function cmdUpdateGrammarHeaders(nodeId, sectionId, newHeaders, prevHeaders) {
  const inverse = makeCommand(CMD.UPDATE_GRAMMAR_HEADERS, nodeId, sectionId, { headers: prevHeaders }, null)
  return makeCommand(CMD.UPDATE_GRAMMAR_HEADERS, nodeId, sectionId, { headers: newHeaders }, inverse)
}

export function cmdUpdateGrammarCell(nodeId, sectionId, rowId, side, newVal, prevVal) {
  const inverse = makeCommand(CMD.UPDATE_GRAMMAR_CELL, nodeId, sectionId, { rowId, side, value: prevVal }, null)
  return makeCommand(CMD.UPDATE_GRAMMAR_CELL, nodeId, sectionId, { rowId, side, value: newVal }, inverse)
}

export function cmdToggleGrammarBlank(nodeId, sectionId, rowId, side, newVal, prevVal) {
  const inverse = makeCommand(CMD.TOGGLE_GRAMMAR_BLANK, nodeId, sectionId, { rowId, side, isBlank: prevVal }, null)
  return makeCommand(CMD.TOGGLE_GRAMMAR_BLANK, nodeId, sectionId, { rowId, side, isBlank: newVal }, inverse)
}

export function cmdAddGrammarRow(nodeId, sectionId, newRow, afterRowId, prevOrder) {
  const inverse = makeCommand(CMD.REMOVE_GRAMMAR_ROW, nodeId, sectionId, { rowId: newRow.id, prevOrder }, null)
  return makeCommand(CMD.ADD_GRAMMAR_ROW, nodeId, sectionId, { newRow, afterRowId }, inverse)
}

export function cmdRemoveGrammarRow(nodeId, sectionId, rowId, rowSnapshot, afterRowId, prevOrder) {
  const inverse = makeCommand(CMD.ADD_GRAMMAR_ROW, nodeId, sectionId, { newRow: rowSnapshot, afterRowId }, null)
  return makeCommand(CMD.REMOVE_GRAMMAR_ROW, nodeId, sectionId, { rowId, prevOrder }, inverse)
}

export function cmdReorderGrammarRows(nodeId, sectionId, newOrder, prevOrder) {
  const inverse = makeCommand(CMD.REORDER_GRAMMAR_ROWS, nodeId, sectionId, { rowOrder: prevOrder }, null)
  return makeCommand(CMD.REORDER_GRAMMAR_ROWS, nodeId, sectionId, { rowOrder: newOrder }, inverse)
}

export function cmdUpdateVerticalOperand(nodeId, sectionId, opId, newRaw, newNorm, prevRaw, prevNorm) {
  const inverse = makeCommand(CMD.UPDATE_VERTICAL_OPERAND, nodeId, sectionId, { opId, raw: prevRaw, normalizedNumericValue: prevNorm }, null)
  return makeCommand(CMD.UPDATE_VERTICAL_OPERAND, nodeId, sectionId, { opId, raw: newRaw, normalizedNumericValue: newNorm }, inverse)
}

export function cmdAddVerticalOperand(nodeId, sectionId, newOp, afterOpId, prevOrder) {
  const inverse = makeCommand(CMD.REMOVE_VERTICAL_OPERAND, nodeId, sectionId, { opId: newOp.id, prevOrder }, null)
  return makeCommand(CMD.ADD_VERTICAL_OPERAND, nodeId, sectionId, { newOp, afterOpId }, inverse)
}

export function cmdRemoveVerticalOperand(nodeId, sectionId, opId, opSnapshot, afterOpId, prevOrder) {
  const inverse = makeCommand(CMD.ADD_VERTICAL_OPERAND, nodeId, sectionId, { newOp: opSnapshot, afterOpId }, null)
  return makeCommand(CMD.REMOVE_VERTICAL_OPERAND, nodeId, sectionId, { opId, prevOrder }, inverse)
}

export function cmdReorderVerticalOperands(nodeId, sectionId, newOrder, prevOrder) {
  const inverse = makeCommand(CMD.REORDER_VERTICAL_OPERANDS, nodeId, sectionId, { operandOrder: prevOrder }, null)
  return makeCommand(CMD.REORDER_VERTICAL_OPERANDS, nodeId, sectionId, { operandOrder: newOrder }, inverse)
}

export function cmdUpdateVerticalOperator(nodeId, sectionId, newOp, prevOp) {
  const inverse = makeCommand(CMD.UPDATE_VERTICAL_OPERATOR, nodeId, sectionId, { operator: prevOp }, null)
  return makeCommand(CMD.UPDATE_VERTICAL_OPERATOR, nodeId, sectionId, { operator: newOp }, inverse)
}

export function cmdSetVerticalResult(nodeId, sectionId, raw, norm, prevResult) {
  const inverse = prevResult === null
    ? makeCommand(CMD.REMOVE_VERTICAL_RESULT, nodeId, sectionId, {}, null)
    : makeCommand(CMD.SET_VERTICAL_RESULT, nodeId, sectionId, { raw: prevResult.raw, normalizedNumericValue: prevResult.normalizedNumericValue }, null)
  return makeCommand(CMD.SET_VERTICAL_RESULT, nodeId, sectionId, { raw, normalizedNumericValue: norm }, inverse)
}

export function cmdRemoveVerticalResult(nodeId, sectionId, prevResult) {
  const inverse = makeCommand(CMD.SET_VERTICAL_RESULT, nodeId, sectionId, prevResult || { raw: '', normalizedNumericValue: null }, null)
  return makeCommand(CMD.REMOVE_VERTICAL_RESULT, nodeId, sectionId, {}, inverse)
}

export function cmdInsertNode(nodeId, sectionId, insertedRecord, afterNodeId, prevOrder) {
  const inverse = makeCommand(CMD.DELETE_NODE, nodeId, sectionId, { prevOrder }, null)
  return makeCommand(CMD.INSERT_NODE, nodeId, sectionId, { insertedRecord, afterNodeId }, inverse)
}

export function cmdDeleteNode(nodeId, sectionId, prevOrder) {
  const inverse = makeCommand(CMD.UNDELETE_NODE, nodeId, sectionId, { prevOrder }, null)
  return makeCommand(CMD.DELETE_NODE, nodeId, sectionId, { prevOrder }, inverse)
}

export function cmdUndeleteNode(nodeId, sectionId, prevOrder) {
  const inverse = makeCommand(CMD.DELETE_NODE, nodeId, sectionId, { prevOrder }, null)
  return makeCommand(CMD.UNDELETE_NODE, nodeId, sectionId, { prevOrder }, inverse)
}

export function cmdDuplicateNode(originalId, newNodeId, sectionId, insertedRecord, afterNodeId, prevOrder) {
  const inverse = makeCommand(CMD.DELETE_NODE, newNodeId, sectionId, { prevOrder }, null)
  return makeCommand(CMD.DUPLICATE_NODE, originalId, sectionId, { newNodeId, insertedRecord, afterNodeId }, inverse)
}

export function cmdMoveNode(nodeId, sectionId, newOrder, prevOrder) {
  const inverse = makeCommand(CMD.MOVE_NODE, nodeId, sectionId, { newOrder: prevOrder }, null)
  return makeCommand(CMD.MOVE_NODE, nodeId, sectionId, { newOrder }, inverse)
}
