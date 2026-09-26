// structuredIdAllocator.js — Deterministic monotonic ID allocator for B4 structured editing.
// RULE: Never use Date.now() / Math.random(). Never decrement on undo.
// IDs are stable across draft save/reload; sequence is persisted in draft v2.

/**
 * Derives stable working IDs for baseline-sourced nested items (those without canonical IDs).
 * Called ONCE from projection on first access; IDs are keyed to source index, not current order.
 */
export function deriveBaselineSegmentId(nodeId, srcIndex) {
  return `${nodeId}__segment__src${srcIndex}`
}

export function deriveBaselineGrammarRowId(nodeId, srcIndex) {
  return `${nodeId}__grammar-row__src${srcIndex}`
}

export function deriveBaselineOperandId(nodeId, srcIndex) {
  return `${nodeId}__operand__src${srcIndex}`
}

/**
 * In-memory allocator. Sequence is loaded from persisted draft and stored back on save.
 */
export class StructuredIdAllocator {
  /**
   * @param {string} baseDocId
   * @param {number} initialSequence — restored from draft; default 1
   */
  constructor(baseDocId, initialSequence = 1) {
    this._baseDocId = baseDocId
    this._seq = Math.max(1, initialSequence)
  }

  getNextSequence() {
    return this._seq
  }

  /**
   * Allocates the next ID and INCREMENTS the counter.
   * Undo MUST NOT call this; new IDs are needed only for new allocations after redo.
   */
  allocate(sectionId, kind) {
    const seq = String(this._seq).padStart(4, '0')
    const id = `user__${this._baseDocId}__${sectionId}__${kind}__${seq}`
    this._seq++
    return id
  }

  allocateNodeId(sectionId) { return this.allocate(sectionId, 'node') }
  allocateOptionId(sectionId) { return this.allocate(sectionId, 'option') }
  allocateSegmentId(sectionId) { return this.allocate(sectionId, 'segment') }
  allocateRowId(sectionId) { return this.allocate(sectionId, 'row') }
  allocateOperandId(sectionId) { return this.allocate(sectionId, 'operand') }
  allocateItemId(sectionId, side) { return this.allocate(sectionId, `${side}-item`) }

  /**
   * After loading a draft, ensure the allocator is ahead of all discovered user IDs.
   * Call with the max sequence found in the draft's insertedNodes, insertedOptions, etc.
   */
  advanceTo(minNext) {
    if (minNext >= this._seq) {
      this._seq = minNext + 1
    }
  }

  serialize() {
    return this._seq
  }
}

/**
 * Scans an inserted node record for the highest sequence number used.
 * Used on draft reload to advance the allocator past all previously issued IDs.
 */
export function extractMaxSequenceFromUserId(userId) {
  // Pattern: user__<docId>__<secId>__<kind>__<NNNN>
  const match = String(userId || '').match(/__(\d{4,})$/)
  if (match) return parseInt(match[1], 10)
  return 0
}

export const computeMaxSequenceFromUserId = extractMaxSequenceFromUserId
