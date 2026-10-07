// paperSystemRules.js — single source of truth for ASSPS paper authoring/presentation rules
import { URDU_FONT_STACK, isUrduScriptPaper } from './resolvePaperRoute.js'
import { inferOfficialSectionKind, parseMcqRows } from './officialSectionSemantics.js'
import { resolveManualSectionScoring } from './PaperEditor/core/ScoringPlan.js'

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

  const total = sections.reduce((sum, section, index) => {
    const scoring = resolveManualSectionScoring(section, resolveSectionTotalMarks(section), index)
    return sum + Number(scoring.maximumObtainableMarks || 0)
  }, 0)
  return total > 0 ? total : 0
}

export function buildMarksLedger(paper = {}) {
  const sections = Array.isArray(paper.official_section)
    ? paper.official_section
    : (paper.selectedQuestions?.official_section?.questions || [])
  const scoring = sections.map((section, index) => resolveManualSectionScoring(section, resolveSectionTotalMarks(section), index))
  const sectionTotals = scoring.map(item => Number(item.maximumObtainableMarks || 0))
  const sectionPotentialTotals = scoring.map(item => Number(item.listedPotentialItemMarksTotal || 0))
  const questionTotal = sectionTotals.reduce((sum, marks) => sum + marks, 0)
  const availableItemMarksTotal = sectionPotentialTotals.reduce((sum, marks) => sum + marks, 0)
  const headerTotal = safeNumber(paper.config?.totalMarks ?? paper.totalMarks) ?? 0
  const scoringErrors = scoring.flatMap(item => item.errors || [])
  return {
    headerTotal,
    questionTotal,
    availableItemMarksTotal,
    sectionTotals,
    sectionPotentialTotals,
    choiceGroups: scoring.map(item => item.choiceGroup).filter(Boolean),
    scoringErrors,
    balanced: headerTotal > 0 && headerTotal === questionTotal && scoringErrors.length === 0,
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

export function normalizeSectionOrder(sections = [], isUrdu = false) {
  let questionSerial = 0
  return [...sections]
    .map((section, index) => {
      const ordered = { ...section, sourceOrder: index + 1 }
      if (inferOfficialSectionKind(section) === 'marker') return ordered
      questionSerial += 1
      const heading = replaceQuestionSerial(section.heading || section.text || section.textUrdu || '', questionSerial, isUrdu)
      return {
        ...ordered,
        heading,
        text: heading,
        textUrdu: isUrdu ? heading : (section.textUrdu || ''),
      }
    })
}

export function applyAsspsPaperRules(paper = {}) {
  const profile = buildPaperRuleProfile(paper)
  const sourceSections = Array.isArray(paper.official_section)
    ? paper.official_section
    : (paper.selectedQuestions?.official_section?.questions || [])
  const sections = normalizeSectionOrder(sourceSections, profile.isUrdu)
  const config = buildEditablePaperConfig(paper.config || {})
  const editorSettings = {
    ...(paper.editorSettings || {}),
    mcqLayout: 'matrix-table',
    shortLayout: '1-column',
    pageBorder: 'thin',
    questionBorder: 'none',
    fontFamily: profile.fontFamily,
    fontSize: Number(paper.editorSettings?.fontSize || 13),
    headingSize: Number(paper.editorSettings?.headingSize || 14),
    englishLineHeight: Number(paper.editorSettings?.englishLineHeight || 1.55),
    urduLineHeight: Number(paper.editorSettings?.urduLineHeight || 2.2),
    showSectionLine: paper.editorSettings?.showSectionLine !== false,
  }
  return {
    ...paper,
    config,
    editorSettings,
    official_section: sections,
    selectedQuestions: paper.selectedQuestions?.official_section
      ? {
          ...paper.selectedQuestions,
          official_section: {
            ...paper.selectedQuestions.official_section,
            questions: sections,
          },
        }
      : paper.selectedQuestions,
    paperSystemVersion: ASSPS_PAPER_SYSTEM_VERSION,
    paperSystem: {
      ...(paper.paperSystem || {}),
      rulesAppliedAt: new Date().toISOString(),
      rulesVersion: ASSPS_PAPER_SYSTEM_VERSION,
    },
  }
}

export function validatePaperDraft(paper = {}) {
  const sections = Array.isArray(paper.official_section)
    ? paper.official_section
    : (paper.selectedQuestions?.official_section?.questions || [])
  const academic = sections.filter(section => inferOfficialSectionKind(section) !== 'marker')
  const ledger = buildMarksLedger(paper)
  const issues = []
  if (!String(paper.config?.classLevel || paper.config?.className || '').trim()) issues.push({ code:'CLASS_MISSING', level:'warning', text:'Class is missing.' })
  if (!String(paper.config?.subject || paper.config?.subjectName || '').trim()) issues.push({ code:'SUBJECT_MISSING', level:'warning', text:'Subject is missing.' })
  if (!String(paper.config?.paperCode || '').trim()) issues.push({ code:'PAPER_CODE_MISSING', level:'warning', text:'Paper code is missing.' })
  if (!String(paper.config?.examDate || '').trim()) issues.push({ code:'EXAM_DATE_MISSING', level:'warning', text:'Exam date is missing.' })
  if (!Number(paper.config?.totalMarks || 0)) issues.push({ code:'TOTAL_MARKS_MISSING', level:'warning', text:'Total marks are missing.' })
  if (!academic.length) issues.push({ code:'NO_QUESTIONS', level:'error', text:'Paper has no question sections.' })
  const ids = new Set()
  academic.forEach((section, index) => {
    const number = index + 1
    if (!String(section.heading || section.text || '').trim()) issues.push({ code:'QUESTION_HEADING_MISSING', level:'error', question:number, text:`Question ${number} heading is empty.` })
    if (!String(section.content || '').trim()) issues.push({ code:'QUESTION_CONTENT_MISSING', level:'warning', question:number, text:`Question ${number} content is empty.` })
    if (section.id) {
      if (ids.has(section.id)) issues.push({ code:'DUPLICATE_SECTION_ID', level:'error', question:number, text:`Question ${number} has a duplicate internal id.` })
      ids.add(section.id)
    }
    const kind = inferOfficialSectionKind(section)
    if (kind === 'mcq') {
      const rows = parseMcqRows(section.content || '')
      if (!rows.length) issues.push({ code:'MCQ_PARSE_EMPTY', level:'error', question:number, text:`Question ${number} is marked MCQ but no MCQs can be parsed.` })
      rows.forEach((row, rowIndex) => {
        if ((row.options || []).length < 2) issues.push({ code:'MCQ_OPTIONS_TOO_FEW', level:'error', question:number, item:rowIndex + 1, text:`Question ${number}, MCQ ${rowIndex + 1} has fewer than two options.` })
      })
    }
  })
  if (ledger.headerTotal > 0 && ledger.questionTotal > 0 && !ledger.balanced) {
    issues.push({ code:'MARKS_MISMATCH', level:'warning', text:`Header total is ${ledger.headerTotal}, while question totals equal ${ledger.questionTotal}.` })
  }
  return {
    ready: !issues.some(issue => issue.level === 'error'),
    issues,
    errorCount: issues.filter(issue => issue.level === 'error').length,
    warningCount: issues.filter(issue => issue.level === 'warning').length,
    marksLedger: ledger,
    academicQuestionCount: academic.length,
  }
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
