// structuredNodeModel.js — B4 Working-Document structured state shape definitions.
// These are pure data-shape descriptors, not classes.

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION STATES
// ─────────────────────────────────────────────────────────────────────────────
export const STRUCTURED_MUTATION = {
  PRISTINE: 'PRISTINE',
  USER_EDITED: 'USER_EDITED',
  USER_DELETED: 'USER_DELETED',
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURED STATE TOP-LEVEL (lives inside PaperEditorWorkingDocument)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns an empty structured state block for a new working document.
 */
export function createEmptyStructuredState() {
  return {
    structuredPatches: {},     // { [nodeId]: StructuredNodePatch }
    insertedNodes: {},         // { [nodeId]: InsertedNodeRecord }
    deletedNodeIds: [],        // string[]
    nodeOrderBySection: {},    // { [sectionId]: string[] }
    nextUserStructureSequence: 1,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH SHAPES — source nodes only (delta storage)
// ─────────────────────────────────────────────────────────────────────────────

export function createMcqPatch(nodeId, partial = {}) {
  return {
    nodeId,
    nodeType: 'mcq',
    mutationState: STRUCTURED_MUTATION.PRISTINE,
    optionPatches: {},         // { [optionId]: { text?, direction? } }
    insertedOptions: {},       // { [optionId]: InsertedOptionRecord }
    deletedOptionIds: [],      // string[]
    optionOrder: null,         // null = use canonical order; set on first reorder
    ...partial,
  }
}

export function createTrueFalsePatch(nodeId, partial = {}) {
  return {
    nodeId,
    nodeType: 'true_false',
    mutationState: STRUCTURED_MUTATION.PRISTINE,
    statementPatch: null,      // { workingPlainText } or null
    hasIndicatorBoxPatch: null, // boolean or null (null = use source value)
    // NOTE: expectedAnswer is NOT in patch — read-only
    ...partial,
  }
}

export function createFillBlankPatch(nodeId, partial = {}) {
  return {
    nodeId,
    nodeType: 'fill_blank',
    mutationState: STRUCTURED_MUTATION.PRISTINE,
    segmentPatches: {},        // { [workingSegId]: { type?, value? } }
    insertedSegments: {},      // { [segId]: InsertedSegmentRecord }
    deletedSegIds: [],         // string[]
    segmentOrder: null,        // null = derived from baseline order
    wordBankPatch: null,       // string[] or null (null = use source)
    ...partial,
  }
}

export function createMatchingPatch(nodeId, partial = {}) {
  return {
    nodeId,
    nodeType: 'matching_columns',
    mutationState: STRUCTURED_MUTATION.PRISTINE,
    leftPatches: {},           // { [itemId]: { text } }
    rightPatches: {},          // { [itemId]: { text } }
    insertedLeftItems: {},     // { [itemId]: { id, text } }
    insertedRightItems: {},    // { [itemId]: { id, text } }
    deletedLeftIds: [],
    deletedRightIds: [],
    leftOrder: null,           // null = canonical order
    rightOrder: null,
    // correctMappings NOT in patch — read-only
    ...partial,
  }
}

export function createGrammarPatch(nodeId, partial = {}) {
  return {
    nodeId,
    nodeType: 'grammar_table',
    mutationState: STRUCTURED_MUTATION.PRISTINE,
    columnHeaderPatches: null, // [string, string] or null
    rowPatches: {},            // { [rowId]: { leftText?, rightText?, leftIsBlank?, rightIsBlank? } }
    insertedRows: {},          // { [rowId]: InsertedRowRecord }
    deletedRowIds: [],
    rowOrder: null,            // null = canonical order
    ...partial,
  }
}

export function createVerticalMathPatch(nodeId, partial = {}) {
  return {
    nodeId,
    nodeType: 'vertical_math',
    mutationState: STRUCTURED_MUTATION.PRISTINE,
    operandPatches: {},        // { [workingOpId]: { raw, normalizedNumericValue } }
    insertedOperands: {},      // { [opId]: InsertedOperandRecord }
    deletedOperandIds: [],
    operandOrder: null,        // null = canonical order
    operatorPatch: null,       // string or null
    resultPatch: undefined,    // undefined = untouched; null = explicitly removed; { raw, normalizedNumericValue }
    ...partial,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INSERTED NODE RECORDS (full working data, no canonical baseline)
// ─────────────────────────────────────────────────────────────────────────────

export function createInsertedMcqNode(nodeId, sectionId, partial = {}) {
  return {
    nodeId,
    nodeType: 'mcq',
    sectionId,
    origin: 'USER_CREATED',
    sourceSegmentIds: [],
    rawSourceSnapshot: null,
    workingMarksOverride: null,
    direction: 'auto',
    stemText: '',
    options: [],               // InsertedOptionRecord[]
    ...partial,
  }
}

export function createInsertedTrueFalseNode(nodeId, sectionId, partial = {}) {
  return {
    nodeId,
    nodeType: 'true_false',
    sectionId,
    origin: 'USER_CREATED',
    sourceSegmentIds: [],
    rawSourceSnapshot: null,
    workingMarksOverride: null,
    direction: 'auto',
    statement: '',
    hasIndicatorBox: true,
    expectedAnswer: null,   // Always null — never inferred
    ...partial,
  }
}

export function createInsertedFillBlankNode(nodeId, sectionId, partial = {}) {
  return {
    nodeId,
    nodeType: 'fill_blank',
    sectionId,
    origin: 'USER_CREATED',
    sourceSegmentIds: [],
    rawSourceSnapshot: null,
    workingMarksOverride: null,
    direction: 'auto',
    segments: [],              // InsertedSegmentRecord[]
    wordBank: [],
    ...partial,
  }
}

export function createInsertedMatchingNode(nodeId, sectionId, partial = {}) {
  return {
    nodeId,
    nodeType: 'matching_columns',
    sectionId,
    origin: 'USER_CREATED',
    sourceSegmentIds: [],
    rawSourceSnapshot: null,
    workingMarksOverride: null,
    direction: 'auto',
    leftItems: [],
    rightItems: [],
    correctMappings: null,     // Always null — Answer Key Mode only
    ...partial,
  }
}

export function createInsertedGrammarNode(nodeId, sectionId, partial = {}) {
  return {
    nodeId,
    nodeType: 'grammar_table',
    sectionId,
    origin: 'USER_CREATED',
    sourceSegmentIds: [],
    rawSourceSnapshot: null,
    workingMarksOverride: null,
    direction: 'auto',
    columns: ['Column 1', 'Column 2'],
    rows: [],
    ...partial,
  }
}

export function createInsertedVerticalMathNode(nodeId, sectionId, partial = {}) {
  return {
    nodeId,
    nodeType: 'vertical_math',
    sectionId,
    origin: 'USER_CREATED',
    sourceSegmentIds: [],
    rawSourceSnapshot: null,
    workingMarksOverride: null,
    direction: 'auto',
    operands: [],
    operator: '+',
    result: null,
    ...partial,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INSERTED ITEM RECORDS
// ─────────────────────────────────────────────────────────────────────────────
export function createInsertedOption(id, partial = {}) {
  return {
    id,
    text: '',
    direction: 'auto',
    canonicalLabel: '',
    labelOrigin: 'USER_GENERATED',
    sourceLabel: null,
    isCorrect: null,           // Always null — never set by B4
    ...partial,
  }
}

export function createInsertedSegment(id, type = 'text', partial = {}) {
  return { id, type, value: '', ...partial }
}

export function createInsertedGrammarRow(id, partial = {}) {
  return { id, leftText: '', rightText: '', leftIsBlank: false, rightIsBlank: false, ...partial }
}

export function createInsertedOperand(id, partial = {}) {
  return { id, raw: '', normalizedNumericValue: null, ...partial }
}

export function createInsertedMatchingItem(id, partial = {}) {
  return { id, text: '', ...partial }
}
