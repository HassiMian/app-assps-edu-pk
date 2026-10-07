import { resolveWorkingSectionNodes } from './structured/structuredNodeProjection.js'

const NON_ACADEMIC_TYPES = new Set([
  'scope_header',
  'section_banner',
  'unknown_preserved',
])

export function isWorkingAcademicNode(node) {
  if (!node) return false
  const type = node.type || node.nodeType
  if (!type || NON_ACADEMIC_TYPES.has(type)) return false
  if (type === 'rich_text' && node.layoutSemantic !== 'vertical-math-grid') return false
  return true
}

export function normalizeWorkingMark(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function computeSectionTotalFromItemMarks(itemMarks = [], attemptCount = null) {
  const marks = itemMarks.map(normalizeWorkingMark)
  if (marks.length === 0) {
    return { total: null, status: 'NO_ITEM_MARKS' }
  }
  if (marks.some(mark => mark === null)) {
    return { total: null, status: 'INCOMPLETE_ITEM_MARKS' }
  }

  const attempt = Number(attemptCount)
  if (Number.isFinite(attempt) && attempt > 0 && attempt < marks.length) {
    const first = marks[0]
    const uniform = marks.every(mark => mark === first)
    if (!uniform) {
      return { total: null, status: 'AMBIGUOUS_ATTEMPT_MARKS' }
    }
    return { total: attempt * first, status: 'AUTO_ATTEMPT_UNIFORM' }
  }

  return {
    total: marks.reduce((sum, mark) => sum + mark, 0),
    status: 'AUTO_SUM',
  }
}

export function computePaperTotalFromSections(sectionTotals = []) {
  const totals = sectionTotals.map(normalizeWorkingMark)
  if (totals.length === 0) {
    return { total: null, status: 'NO_SECTION_TOTALS' }
  }
  if (totals.some(total => total === null)) {
    return { total: null, status: 'INCOMPLETE_SECTION_TOTALS' }
  }
  return {
    total: totals.reduce((sum, total) => sum + total, 0),
    status: 'AUTO_SUM',
  }
}

export function getEffectiveSectionTotal(section) {
  if (!section) return null
  if (section.sectionTotalMode === 'MANUAL') {
    return normalizeWorkingMark(section.workingSectionTotal)
  }
  if (section.sectionTotalMode === 'AUTO') {
    return normalizeWorkingMark(section.computedSectionTotal)
  }
  return normalizeWorkingMark(section.workingSectionTotal)
}

export function getEffectivePaperTotal(workingDoc) {
  const marks = workingDoc?.marks || {}
  if (marks.paperTotalMode === 'MANUAL') {
    return normalizeWorkingMark(marks.manualPaperTotal)
  }
  if (marks.paperTotalMode === 'AUTO') {
    return normalizeWorkingMark(marks.computedPaperTotal)
  }
  return normalizeWorkingMark(marks.sourcePaperTotal)
}

function resolveItemWorkingMark(workingDoc, section, item) {
  if (item.isInserted) {
    return normalizeWorkingMark(item.resolvedNode?.workingMarksOverride)
  }
  const overlay = section.nodeOverlays?.find(node => node.nodeId === item.nodeId)
  if (!overlay) {
    return normalizeWorkingMark(
      item.resolvedNode?.authoritativeNodeMarks ?? item.resolvedNode?.operationalNodeMarks
    )
  }
  return normalizeWorkingMark(overlay.workingNodeMarks)
}

export function recalculateWorkingMarks(workingDoc, baselineDoc) {
  if (!workingDoc || !baselineDoc) return workingDoc

  const effectiveSectionTotals = []

  for (const section of workingDoc.sections || []) {
    const baselineSection = baselineDoc.sections?.find(source => source.id === section.id)
    if (!baselineSection) continue

    const items = resolveWorkingSectionNodes(baselineSection, workingDoc.structured)
      .filter(item => isWorkingAcademicNode(item.resolvedNode))

    if (items.length === 0) continue

    const itemMarks = items.map(item => resolveItemWorkingMark(workingDoc, section, item))
    const result = computeSectionTotalFromItemMarks(itemMarks, section.attemptCount)

    section.computedSectionTotal = result.total
    if (section.sectionTotalMode === 'AUTO') {
      section.sectionMarksStatus = result.status
    }

    effectiveSectionTotals.push(getEffectiveSectionTotal(section))
  }

  const paperResult = computePaperTotalFromSections(effectiveSectionTotals)
  if (!workingDoc.marks) workingDoc.marks = {}
  workingDoc.marks.computedPaperTotal = paperResult.total
  if (workingDoc.marks.paperTotalMode === 'AUTO') {
    workingDoc.marks.paperMarksStatus = paperResult.status
  }
  return workingDoc
}
