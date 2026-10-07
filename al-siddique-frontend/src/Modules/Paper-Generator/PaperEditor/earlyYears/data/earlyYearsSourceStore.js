// earlyYearsSourceStore.js — Authoritative loader & accessors for Early Years papers & QA manifest
// V2 is the ACTIVE authoritative corpus.
// V1 (early-years-first-term-2026-source-v1.json) is retained as superseded historical evidence only.
import earlyYearsSourceV2 from './early-years-first-term-2026-source-v2.json' with { type: 'json' }
import earlyYearsQaV2 from './early-years-first-term-2026-qa-v2.json' with { type: 'json' }

/**
 * Returns full Early Years corpus (V2 — teacher-source faithful)
 */
export function getEarlyYearsCorpus() {
  return earlyYearsSourceV2
}

/**
 * Returns all 9 Early Years papers
 */
export function getAllEarlyYearsPapers() {
  return earlyYearsSourceV2.papers || []
}

/**
 * Returns a specific Early Years paper by ID
 */
export function getEarlyYearsPaperById(paperId) {
  if (!paperId) return null
  return earlyYearsSourceV2.papers.find((p) => p.id === paperId) || null
}

/**
 * Returns papers filtered by class stage ('starter' | 'mover' | 'flyer')
 */
export function getEarlyYearsPapersByClass(classStage) {
  if (!classStage) return []
  return earlyYearsSourceV2.papers.filter((p) => p.classStage === classStage.toLowerCase())
}

/**
 * Returns QA Manifest V2
 */
export function getEarlyYearsQAManifest() {
  return earlyYearsQaV2
}

/**
 * Returns all QA findings for a given paper ID
 */
export function getQAFindingsForPaper(paperId) {
  if (!paperId) return []
  return (earlyYearsQaV2.findings || []).filter((f) => f.paperId === paperId)
}

/**
 * Validates corpus integrity against academic source constraints
 */
export function validateEarlyYearsCorpus(corpus = earlyYearsSourceV2) {
  const errors = []
  if (!corpus || !Array.isArray(corpus.papers)) {
    return { valid: false, errors: ['Corpus is missing papers array'] }
  }

  if (corpus.papers.length !== 9) {
    errors.push(`Expected exactly 9 papers, found ${corpus.papers.length}`)
  }

  const ids = new Set()
  const classStages = { starter: 0, mover: 0, flyer: 0 }
  const subjects = { english: 0, urdu: 0, math: 0 }

  for (const paper of corpus.papers) {
    if (!paper.id) errors.push('Paper missing ID')
    if (ids.has(paper.id)) errors.push(`Duplicate paper ID: ${paper.id}`)
    ids.add(paper.id)

    if (paper.status !== 'SOURCE_PRESENT') {
      errors.push(`Paper ${paper.id} has invalid status ${paper.status}; expected SOURCE_PRESENT`)
    }

    if (paper.printable !== true) {
      errors.push(`Paper ${paper.id} printable flag is not true`)
    }

    if (classStages[paper.classStage] !== undefined) {
      classStages[paper.classStage]++
    } else {
      errors.push(`Paper ${paper.id} has invalid classStage ${paper.classStage}`)
    }

    if (subjects[paper.subject] !== undefined) {
      subjects[paper.subject]++
    } else {
      errors.push(`Paper ${paper.id} has invalid subject ${paper.subject}`)
    }
  }

  // Check 3 per class stage
  for (const [stage, count] of Object.entries(classStages)) {
    if (count !== 3) errors.push(`Expected 3 papers for classStage ${stage}, found ${count}`)
  }

  // Check 3 per subject
  for (const [subj, count] of Object.entries(subjects)) {
    if (count !== 3) errors.push(`Expected 3 papers for subject ${subj}, found ${count}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
