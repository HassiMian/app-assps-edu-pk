// sourceCoverage.js — Source Coverage Ledger builder & verifier
// Implements UTF-16 code-unit offsets and cryptographic segment integrity.

import { sha256Sync, sha256Async } from './hashUtils.js'
import { CoverageStatus } from '../core/PaperDocumentV2.js'

/**
 * Creates a single coverage segment entry.
 *
 * @param {object} params
 * @param {string} params.sourceSectionId
 * @param {'heading' | 'content'} params.sourceField
 * @param {string} params.sourceSegmentId
 * @param {number} params.startOffset
 * @param {number} params.endOffset
 * @param {string} params.rawSourceSnapshot
 * @param {string[]} params.targetCanonicalIds
 * @param {string} [params.coverageStatus]
 * @returns {object} Canonical source coverage entry
 */
export function createCoverageSegment({
  sourceSectionId,
  sourceField,
  sourceSegmentId,
  startOffset,
  endOffset,
  rawSourceSnapshot,
  targetCanonicalIds = [],
  coverageStatus = CoverageStatus.STRUCTURED,
}) {
  const sha = sha256Sync(rawSourceSnapshot)
  return {
    sourceSectionId,
    sourceField,
    sourceSegmentId,
    offsetUnit: 'utf16-code-unit',
    startOffset,
    endOffset,
    rawSourceSnapshot,
    sourceSegmentSha256: sha,
    targetCanonicalIds: Array.isArray(targetCanonicalIds) ? [...targetCanonicalIds] : [targetCanonicalIds],
    coverageStatus,
    diagnosticCharCount: endOffset - startOffset,
  }
}

/**
 * Verifies that a list of segments for a specific source field satisfies
 * the 100% gapless, non-overlapping, exact UTF-16 reconstructibility invariant.
 *
 * @param {string} sourceFieldValue
 * @param {Array<object>} segments
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function verifyFieldCoverageInvariants(sourceFieldValue, segments) {
  const errors = []
  const text = typeof sourceFieldValue === 'string' ? sourceFieldValue : ''

  if (!Array.isArray(segments) || segments.length === 0) {
    if (text.length === 0) {
      return { valid: true, errors: [] }
    }
    return {
      valid: false,
      errors: [`Field length is ${text.length} but 0 coverage segments were provided`],
    }
  }

  // Sort by startOffset ascending
  const sorted = [...segments].sort((a, b) => a.startOffset - b.startOffset)

  // 1. First segment must start at 0
  if (sorted[0].startOffset !== 0) {
    errors.push(`First segment must start at offset 0 (got ${sorted[0].startOffset})`)
  }

  let reconstructed = ''

  for (let i = 0; i < sorted.length; i++) {
    const seg = sorted[i]

    // Check offset order and bounds
    if (seg.endOffset < seg.startOffset) {
      errors.push(`Segment ${seg.sourceSegmentId} has endOffset (${seg.endOffset}) < startOffset (${seg.startOffset})`)
    }

    // Check gap or overlap with previous segment
    if (i > 0) {
      const prev = sorted[i - 1]
      if (seg.startOffset !== prev.endOffset) {
        errors.push(
          `Coverage discontinuity between ${prev.sourceSegmentId} (end ${prev.endOffset}) and ${seg.sourceSegmentId} (start ${seg.startOffset})`
        )
      }
    }

    // Check exact slice match
    const expectedSlice = text.slice(seg.startOffset, seg.endOffset)
    if (expectedSlice !== seg.rawSourceSnapshot) {
      errors.push(
        `Segment ${seg.sourceSegmentId} snapshot mismatch: slice [${seg.startOffset}, ${seg.endOffset}] did not equal rawSourceSnapshot`
      )
    }

    // Check SHA-256
    const expectedSha = sha256Sync(seg.rawSourceSnapshot)
    if (seg.sourceSegmentSha256 !== expectedSha) {
      errors.push(
        `Segment ${seg.sourceSegmentId} SHA mismatch: got ${seg.sourceSegmentSha256}, expected ${expectedSha}`
      )
    }

    // Disallow DROPPED
    if (seg.coverageStatus === 'DROPPED') {
      errors.push(`Segment ${seg.sourceSegmentId} has forbidden status "DROPPED"`)
    }

    reconstructed += seg.rawSourceSnapshot
  }

  // Last segment must end at text.length
  const last = sorted[sorted.length - 1]
  if (last.endOffset !== text.length) {
    errors.push(`Last segment endOffset (${last.endOffset}) does not equal source length (${text.length})`)
  }

  // Reconstructed string must match exact source string
  if (reconstructed !== text) {
    errors.push('Reconstructed text from segments does not exactly match source string')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Asynchronous verification of coverage ledger hashes using SubtleCrypto
 * with pure JS fallback.
 *
 * @param {object} doc
 * @returns {Promise<{ valid: boolean, errors: string[] }>}
 */
export async function verifyCanonicalCoverageHashes(doc) {
  const errors = []
  if (!doc || !Array.isArray(doc.sourceCoverageLedger)) {
    return { valid: false, errors: ['Document does not have a sourceCoverageLedger array'] }
  }

  for (const seg of doc.sourceCoverageLedger) {
    const computedSha = await sha256Async(seg.rawSourceSnapshot)
    if (computedSha !== seg.sourceSegmentSha256) {
      errors.push(
        `Hash verification failed for segment ${seg.sourceSegmentId}: expected ${seg.sourceSegmentSha256}, computed ${computedSha}`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
