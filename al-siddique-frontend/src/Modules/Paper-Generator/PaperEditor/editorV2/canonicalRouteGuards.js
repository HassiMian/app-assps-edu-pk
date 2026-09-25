// canonicalRouteGuards.js — Route Guards and Pristine V13 Verifier (Rules 24, 25, 26)
import {
  classifyPaperDocument,
  DOCUMENT_CLASSIFICATIONS,
} from '../migration/classifyPaperDocument.js'
import { migrateOfficialPaperToV2 } from '../migration/migrateOfficialPaperToV2.js'

import officialV13Dataset from '../../seed-data/official-first-term-2026-v13.json' with { type: 'json' }
import normalizationManifest from '../migration/data/normalizationManifestV13.json' with { type: 'json' }

import { stableStringify } from './editorProjection.js'

/**
 * Helper to project a single academic question from selectedQuestions subtree without lossy normalization.
 */
function projectAcademicQuestion(q) {
  if (!q || typeof q !== 'object') return q
  const res = {
    id: q.id ?? '',
    type: q.type ?? '',
    medium: q.medium ?? '',
    heading: q.heading ?? '',
    content: q.content ?? '',
    text: q.text ?? '',
    textUrdu: q.textUrdu ?? '',
    marks: q.marks !== undefined ? q.marks : null,
    sourceOrder: q.sourceOrder !== undefined ? q.sourceOrder : null,
    priority: q.priority ?? '',
  }
  if (q.options !== undefined) {
    res.options = Array.isArray(q.options)
      ? q.options.map(opt => {
          if (!opt || typeof opt !== 'object') return opt
          return {
            id: opt.id ?? '',
            label: opt.label ?? opt.displayLabel ?? opt.canonicalLabel ?? '',
            text: opt.text ?? '',
            ...(opt.urduText !== undefined ? { urduText: opt.urduText } : {}),
            ...(opt.isCorrect !== undefined ? { isCorrect: opt.isCorrect } : {}),
          }
        })
      : q.options
  }
  for (const [k, v] of Object.entries(q)) {
    if (res[k] === undefined) {
      res[k] = v
    }
  }
  return res
}

/**
 * Projects the complete academic selectedQuestions subtree (both real V13 object-form and array-form).
 */
function projectSelectedQuestionsSubtree(sq) {
  if (!sq || typeof sq !== 'object') return null

  if (Array.isArray(sq)) {
    return sq.map(projectAcademicQuestion)
  }

  // Object-form: e.g. { official_section: { questions: [...], marks: ... } }
  const projected = {}
  for (const [secKey, secVal] of Object.entries(sq)) {
    if (secVal && typeof secVal === 'object') {
      const projectedSec = {
        ...(secVal.marks !== undefined ? { marks: secVal.marks } : {}),
        questions: Array.isArray(secVal.questions)
          ? secVal.questions.map(projectAcademicQuestion)
          : secVal.questions,
      }
      for (const [k, v] of Object.entries(secVal)) {
        if (k !== 'marks' && k !== 'questions') {
          projectedSec[k] = v
        }
      }
      projected[secKey] = projectedSec
    } else {
      projected[secKey] = secVal
    }
  }
  return projected
}

/**
 * Extracts a deterministic academic projection from an official V13 paper for pristine comparison.
 * Excludes non-academic presentation and runtime fields (editorSettings, createdAt, pure UI state).
 *
 * @param {any} paper
 * @returns {object|null}
 */
export function extractOfficialV13AcademicProjection(paper) {
  if (!paper || typeof paper !== 'object') return null

  const config = paper.config || {}
  const projectedConfig = {
    title: config.title ?? '',
    classLevel: config.classLevel != null ? String(config.classLevel) : '',
    className: config.className != null ? String(config.className) : '',
    subject: config.subject ?? '',
    subjectName: config.subjectName ?? '',
    examType: config.examType ?? '',
    language: config.language ?? '',
    totalMarks: config.totalMarks ?? null,
    session: config.session ?? '',
    paperCode: config.paperCode ?? '',
    timeAllowed: config.timeAllowed ?? '',
    examDate: config.examDate ?? '',
    ...(config.instructions !== undefined ? { instructions: config.instructions } : {}),
  }

  const sections = Array.isArray(paper.official_section) ? paper.official_section : []
  const projectedSections = sections.map(s => {
    if (!s || typeof s !== 'object') return null
    const sec = {
      id: s.id ?? '',
      type: s.type ?? '',
      medium: s.medium ?? '',
      heading: s.heading ?? '',
      content: s.content ?? '',
      text: s.text ?? '',
      textUrdu: s.textUrdu ?? '',
      marks: s.marks != null ? Number(s.marks) : (s.totalMarks != null ? Number(s.totalMarks) : null),
      sourceOrder: s.sourceOrder != null ? Number(s.sourceOrder) : null,
      priority: s.priority ?? '',
    }
    if (s.options) {
      sec.options = Array.isArray(s.options)
        ? s.options.map(opt => {
            if (!opt || typeof opt !== 'object') return opt
            return {
              id: opt.id ?? '',
              label: opt.label ?? opt.displayLabel ?? opt.canonicalLabel ?? '',
              text: opt.text ?? '',
              ...(opt.urduText !== undefined ? { urduText: opt.urduText } : {}),
              ...(opt.isCorrect !== undefined ? { isCorrect: opt.isCorrect } : {}),
            }
          })
        : s.options
    }
    return sec
  })

  const projectedSectionMarks = paper.official_section_marks != null
    ? (Array.isArray(paper.official_section_marks)
        ? paper.official_section_marks
        : paper.official_section_marks)
    : null

  const projectedSelectedQuestions = projectSelectedQuestionsSubtree(paper.selectedQuestions)

  return {
    id: paper.id,
    config: projectedConfig,
    sections: projectedSections,
    official_section_marks: projectedSectionMarks,
    selectedQuestions: projectedSelectedQuestions,
  }
}

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

  const inputProjection = extractOfficialV13AcademicProjection(paperPayload)
  const pristineProjection = extractOfficialV13AcademicProjection(pristinePaper)

  if (!inputProjection || !pristineProjection) {
    return false
  }

  return stableStringify(inputProjection) === stableStringify(pristineProjection)
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
