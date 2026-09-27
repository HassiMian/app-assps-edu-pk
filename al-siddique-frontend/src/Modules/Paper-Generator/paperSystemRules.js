// paperSystemRules.js — single source of truth for ASSPS paper authoring/presentation rules
import { URDU_FONT_STACK, isUrduScriptPaper } from './resolvePaperRoute.js'

export const ASSPS_PAPER_SYSTEM_VERSION = 'ASSPS_PAPER_SYSTEM_V1_2026_09_27'
export const PAPER_LOCKED_HEADER_FIELDS = Object.freeze(['schoolName', 'logo'])
export const PAPER_EDITABLE_HEADER_FIELDS = Object.freeze([
  'title', 'examType', 'session', 'classLevel', 'className',
  'subject', 'subjectName', 'paperCode', 'timeAllowed',
  'totalMarks', 'examDate', 'language', 'address',
])

const URDU_OPTION_LABELS = Object.freeze(['الف', 'ب', 'ج', 'د', 'ہ', 'و', 'ز', 'ح'])
const LATIN_OPTION_LABELS = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])

function safeNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function getPaperLanguageProfile(paper = {}) {
  const isUrdu = isUrduScriptPaper(paper)
  return {
    isUrdu,
    direction: isUrdu ? 'rtl' : 'ltr',
    fontFamily: isUrdu ? URDU_FONT_STACK : "'Times New Roman', Times, serif",
    optionLabels: isUrdu ? URDU_OPTION_LABELS : LATIN_OPTION_LABELS,
  }
}

export function resolveSectionTotalMarks(section = {}) {
  const heading = String(section.heading || section.text || section.textUrdu || '')
  const formula = heading.match(/(?:\(|^|\s)(\d+)\s*[×xX*]\s*(\d+)\s*=\s*(\d+)(?=\s*(?:\)|$))/)
  if (formula) return Number(formula[3])

  const trailing = heading.match(/\(\s*(\d+)\s*(?:marks?|نمبر)?\s*\)\s*$/i)
  if (trailing) return Number(trailing[1])

  const operational = safeNumber(section.operationalMarks ?? section.operationalSectionTotal)
  if (operational !== null && operational >= 0) return operational

  const stored = safeNumber(section.marks)
  return stored !== null && stored >= 0 ? stored : 0
}

export function resolvePaperTotalMarks(paper = {}) {
  const configured = safeNumber(paper.config?.totalMarks ?? paper.totalMarks)
  if (configured !== null && configured > 0) return configured

  const sections = Array.isArray(paper.official_section)
    ? paper.official_section
    : (paper.selectedQuestions?.official_section?.questions || [])

  const total = sections.reduce((sum, section) => sum + resolveSectionTotalMarks(section), 0)
  return total > 0 ? total : 0
}

export function buildMarksLedger(paper = {}) {
  const sections = Array.isArray(paper.official_section)
    ? paper.official_section
    : (paper.selectedQuestions?.official_section?.questions || [])
  const sectionTotals = sections.map(resolveSectionTotalMarks)
  const questionTotal = sectionTotals.reduce((sum, marks) => sum + Number(marks || 0), 0)
  const headerTotal = safeNumber(paper.config?.totalMarks ?? paper.totalMarks) ?? 0
  return {
    headerTotal,
    questionTotal,
    sectionTotals,
    balanced: headerTotal > 0 && headerTotal === questionTotal,
    difference: headerTotal - questionTotal,
  }
}

export function stampWorkingCopy(paper = {}, sourcePaper = paper) {
  const sourceId = String(sourcePaper?.sourcePaperId || sourcePaper?.id || paper?.id || '')
  return {
    ...paper,
    sourceLocked: true,
    userEdited: true,
    sourcePaperId: sourceId,
    paperSystemVersion: ASSPS_PAPER_SYSTEM_VERSION,
    paperSystem: {
      ...(paper.paperSystem || {}),
      sourceLocked: true,
      workingCopy: true,
      sourcePaperId: sourceId,
      version: ASSPS_PAPER_SYSTEM_VERSION,
      editedAt: new Date().toISOString(),
    },
  }
}

export function normalizeOptionLabel(label, index = 0, isUrdu = false) {
  const raw = String(label || '').trim().replace(/[().]/g, '')
  if (isUrdu) {
    const upper = raw.toUpperCase()
    const latinIndex = LATIN_OPTION_LABELS.indexOf(upper)
    if (latinIndex >= 0) return URDU_OPTION_LABELS[latinIndex] || URDU_OPTION_LABELS[index] || raw
    if (URDU_OPTION_LABELS.includes(raw)) return raw
    if (/^[1-8]$/.test(raw)) return URDU_OPTION_LABELS[Number(raw) - 1] || raw
    return URDU_OPTION_LABELS[index] || raw || 'الف'
  }
  if (URDU_OPTION_LABELS.includes(raw)) {
    const urduIndex = URDU_OPTION_LABELS.indexOf(raw)
    return LATIN_OPTION_LABELS[urduIndex] || LATIN_OPTION_LABELS[index] || raw
  }
  const upper = raw.toUpperCase()
  return upper || LATIN_OPTION_LABELS[index] || String(index + 1)
}

export function optionLabelParts(label, index = 0, isUrdu = false) {
  return {
    label: normalizeOptionLabel(label, index, isUrdu),
    closingBracket: ')',
    direction: isUrdu ? 'rtl' : 'ltr',
  }
}

export function replaceQuestionSerial(heading = '', nextSerial = 1, isUrdu = false) {
  const serial = Math.max(1, Number(nextSerial) || 1)
  const text = String(heading || '').trim()
  if (isUrdu) {
    if (/^سوال(?:\s+نمبر)?\s*\d+\s*[:.)-]?/i.test(text)) {
      return text.replace(/^سوال(?:\s+نمبر)?\s*\d+\s*[:.)-]?\s*/i, 'سوال نمبر ' + serial + ': ')
    }
    return ('سوال نمبر ' + serial + ': ' + text).trim()
  }
  if (/^(?:Q(?:uestion)?\s*)\d+\s*[:.)-]?/i.test(text)) {
    return text.replace(/^(?:Q(?:uestion)?\s*)\d+\s*[:.)-]?\s*/i, 'Q' + serial + '. ')
  }
  return ('Q' + serial + '. ' + text).trim()
}

export function replaceSectionMarks(heading = '', nextMarks = 0, isUrdu = false) {
  const marks = Math.max(0, Number(nextMarks) || 0)
  const clean = String(heading || '')
    .replace(/\s*\([^)]*(?:\d|marks?|نمبر)[^)]*\)\s*$/i, '')
    .trim()
  if (!marks) return clean
  return clean + ' (' + marks + (isUrdu ? ' نمبر' : ' Marks') + ')'
}

export function normalizeSectionOrder(sections = []) {
  return [...sections]
    .sort((a, b) => Number(a.sourceOrder || 0) - Number(b.sourceOrder || 0))
    .map((section, index) => ({ ...section, sourceOrder: index + 1 }))
}

export function buildEditablePaperConfig(config = {}) {
  const next = { ...config }
  if (!next.language) next.language = 'english'
  if (!next.className && next.classLevel) next.className = next.classLevel
  if (!next.classLevel && next.className) next.classLevel = next.className
  if (!next.subjectName && next.subject) next.subjectName = next.subject
  if (!next.subject && next.subjectName) next.subject = next.subjectName
  if (!next.timeAllowed) next.timeAllowed = 'As announced'
  if (!next.examDate) next.examDate = '__________'
  return next
}

export function buildPaperRuleProfile(paper = {}) {
  const language = getPaperLanguageProfile(paper)
  const sections = Array.isArray(paper.official_section)
    ? paper.official_section
    : (paper.selectedQuestions?.official_section?.questions || [])
  return {
    version: ASSPS_PAPER_SYSTEM_VERSION,
    ...language,
    header: { locked: PAPER_LOCKED_HEADER_FIELDS, editable: PAPER_EDITABLE_HEADER_FIELDS },
    questionHeading: {
      urdu: 'question-right/marks-left',
      english: 'question-left/marks-right',
    },
    optionLabel: {
      urdu: 'label-closing-bracket-option-text',
      english: 'label-closing-bracket-option-text',
    },
    presentation: {
      mcqLayout: 'matrix-table',
      shortLayout: '1-column',
      pageBorder: 'thin',
      questionBorder: 'none',
      bodyFontSize: 13,
      headingFontSize: 14,
      englishLineHeight: 1.55,
      urduLineHeight: 2.2,
      questionHeading: language.isUrdu ? 'right' : 'left',
      marksBadge: language.isUrdu ? 'left' : 'right',
    },
    contentPolicy: {
      preserveSourceText: true,
      noSilentAcademicRewrite: true,
      explicitUserEditsOnly: true,
      normalizeOptionLabelsAtRender: true,
    },
    sourcePolicy: {
      sourceLocked: true,
      editsGoToWorkingCopy: true,
      protectedBranding: PAPER_LOCKED_HEADER_FIELDS,
    },
    sectionTotals: sections.map(resolveSectionTotalMarks),
    paperTotal: resolvePaperTotalMarks(paper),
  }
}
