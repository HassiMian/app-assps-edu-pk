import { inferOfficialSectionKind } from './officialSectionSemantics.js'
import { resolveSectionTotalMarks } from './paperSystemRules.js'

export const ASSPS_OFFICIAL_PAPER_RULES_VERSION = 'ASSPS_OFFICIAL_PAPER_RULES_2026_09_29_V2'

const BLOCKING_READINESS = new Set(['HOLD_FOR_MARKS_CONFIRMATION', 'REVIEW_SOURCE_MCQS', 'HOLD_FOR_SOURCE_CONFIRMATION'])

export function auditOfficialPaperForPrint(paper = {}) {
  const sections = Array.isArray(paper.official_section)
    ? paper.official_section
    : (paper.selectedQuestions?.official_section?.questions || [])
  const academic = sections.filter(section => inferOfficialSectionKind(section) !== 'marker')
  const headerTotal = Number(paper.config?.totalMarks || 0)
  const sectionTotals = academic.map(section => resolveSectionTotalMarks(section))
  const explicitSections = academic.filter((section, index) => Number(sectionTotals[index] || 0) > 0)
  const explicitSectionSum = sectionTotals.reduce((sum, marks) => sum + Number(marks || 0), 0)
  const unresolvedSectionCount = academic.length - explicitSections.length
  const readiness = String(paper.printReadiness || 'READY').trim().toUpperCase()

  const issues = []
  if (headerTotal > 0 && explicitSections.length === academic.length && explicitSectionSum !== headerTotal) {
    const acknowledged = readiness === 'READY_WITH_SOURCE_CONFLICT'
    issues.push({
      code: 'HEADER_SECTION_MARKS_CONFLICT',
      blocking: !acknowledged,
      text: `Header total is ${headerTotal}, but explicit section marks total ${explicitSectionSum}. Source values are preserved; no marks are invented.`,
    })
  }
  if (unresolvedSectionCount > 0 && headerTotal > 0) {
    issues.push({
      code: 'SECTION_MARKS_UNRESOLVED',
      blocking: false,
      text: `${unresolvedSectionCount} section(s) have no source-authorized marks; they remain blank.`,
    })
  }
  if (BLOCKING_READINESS.has(readiness)) {
    issues.push({
      code: readiness,
      blocking: true,
      text: readiness === 'REVIEW_SOURCE_MCQS'
        ? 'Teacher/source content requires review before printing (for example a missing MCQ).'
        : 'Teacher/source marks require confirmation before printing.',
    })
  }

  const blocked = issues.some(issue => issue.blocking)
  return {
    rulesVersion: ASSPS_OFFICIAL_PAPER_RULES_VERSION,
    blocked,
    readiness,
    headerTotal,
    explicitSectionSum,
    unresolvedSectionCount,
    issues,
    sourceTotalNote: String(paper.sourceTotalNote || '').trim(),
    qaNotes: String(paper.qaNotes || '').trim(),
  }
}

export function paperPrintBlockMessage(audit = {}) {
  const lines = [
    'PRINT BLOCKED — source confirmation required.',
    ...(audit.issues || []).filter(issue => issue.blocking).map(issue => `• ${issue.text}`),
  ]
  if (audit.sourceTotalNote) lines.push(`Source note: ${audit.sourceTotalNote}`)
  return lines.join('\n')
}
