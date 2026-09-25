// canonicalRouteGuards.js — Route Guards and Pristine V13 Verifier (Rules 24, 25, 26)
import {
  classifyPaperDocument,
  DOCUMENT_CLASSIFICATIONS,
} from '../migration/classifyPaperDocument.js'
import { migrateOfficialPaperToV2 } from '../migration/migrateOfficialPaperToV2.js'

import officialV13Dataset from '../../seed-data/official-first-term-2026-v13.json' with { type: 'json' }
import normalizationManifest from '../migration/data/normalizationManifestV13.json' with { type: 'json' }

/**
 * Checks whether an incoming OFFICIAL_V13_PAPER matches the official pristine seed data
 * academically without user mutations.
 */
export function isPristineOfficialV13Paper(paperPayload) {
  if (!paperPayload || typeof paperPayload !== 'object' || !paperPayload.id) {
    return false
  }

  const pristinePaper = officialV13Dataset.papers?.find(p => p.id === paperPayload.id)
  if (!pristinePaper) {
    return false
  }

  // Compare core academic fields
  if (paperPayload.classLevel !== pristinePaper.classLevel) return false
  if (paperPayload.subject !== pristinePaper.subject) return false

  const inputSections = paperPayload.official_section || []
  const pristineSections = pristinePaper.official_section || []

  if (inputSections.length !== pristineSections.length) {
    return false
  }

  for (let i = 0; i < inputSections.length; i++) {
    const inSec = inputSections[i]
    const priSec = pristineSections[i]

    if (inSec.id !== priSec.id) return false
    if ((inSec.heading || '') !== (priSec.heading || '')) return false
    if ((inSec.content || '') !== (priSec.content || '')) return false
    if (inSec.totalMarks !== priSec.totalMarks) return false
    if (inSec.marksPerQuestion !== priSec.marksPerQuestion) return false

    // Options count if MCQ
    const inOpts = inSec.options || []
    const priOpts = priSec.options || []
    if (inOpts.length !== priOpts.length) return false
  }

  return true
}

/**
 * Evaluates an incoming paper payload and determines the safe editor route.
 *
 * @param {any} loadedPaper
 * @returns {{
 *   route: 'CANONICAL_V2' | 'LEGACY_CANVAS_V2' | 'DIAGNOSTIC_DATASET',
 *   resolvedPaper: any,
 *   reason?: string
 * }}
 */
export function resolvePaperEditorRoute(loadedPaper) {
  if (!loadedPaper) {
    return {
      route: 'LEGACY_CANVAS_V2',
      resolvedPaper: null,
      reason: 'EMPTY_PAYLOAD_SAFE_FALLBACK',
    }
  }

  const classification = classifyPaperDocument(loadedPaper)

  // 1. CANONICAL_V2: Direct route to new B3 Canonical Editor
  if (classification === DOCUMENT_CLASSIFICATIONS.CANONICAL_V2) {
    return {
      route: 'CANONICAL_V2',
      resolvedPaper: loadedPaper,
      reason: 'CANONICAL_V2_DISCRIMINATOR_VERIFIED',
    }
  }

  // 2. OFFICIAL_V13_PAPER: Guarded Pristine Check
  if (classification === DOCUMENT_CLASSIFICATIONS.OFFICIAL_V13_PAPER) {
    const isPristine = isPristineOfficialV13Paper(loadedPaper)
    if (isPristine) {
      const manifestRecord = normalizationManifest.papers?.find(p => p.paperId === loadedPaper.id)
      if (manifestRecord) {
        try {
          const canonicalDoc = migrateOfficialPaperToV2(loadedPaper, manifestRecord)
          return {
            route: 'CANONICAL_V2',
            resolvedPaper: canonicalDoc,
            reason: 'PRISTINE_V13_CONVERTED_TO_CANONICAL',
          }
        } catch (err) {
          console.warn('Failed to migrate pristine V13 paper to canonical:', err)
        }
      }
    }

    // If modified or migration failed, route to legacy editor to protect user edits
    return {
      route: 'LEGACY_CANVAS_V2',
      resolvedPaper: loadedPaper,
      reason: 'MODIFIED_OR_CUSTOM_V13_PRESERVED_IN_LEGACY',
    }
  }

  // 3. OFFICIAL_V13_DATASET: Must never open directly into editor
  if (classification === DOCUMENT_CLASSIFICATIONS.OFFICIAL_V13_DATASET) {
    return {
      route: 'DIAGNOSTIC_DATASET',
      resolvedPaper: loadedPaper,
      reason: 'DATASET_CONTAINER_REQUIRES_SELECTION',
    }
  }

  // 4. LEGACY_CANVAS_V2 and UNKNOWN: Preserve legacy editor path
  return {
    route: 'LEGACY_CANVAS_V2',
    resolvedPaper: loadedPaper,
    reason: classification === DOCUMENT_CLASSIFICATIONS.LEGACY_CANVAS_V2
      ? 'LEGACY_CANVAS_V2_PRESERVED'
      : 'UNKNOWN_FORMAT_SAFE_LEGACY_FALLBACK',
  }
}
