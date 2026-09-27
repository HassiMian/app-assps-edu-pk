// officialSectionSemantics.js — shared semantic classifier/parser for official exam sections
const SECTION_MARKER_RE = /^\s*#\s*(.+?)\s*$/

const MCQ_HEADING_RE = /(?:tick|choose|circle|select|mark)\b[^\n]*(?:correct|best)[^\n]*(?:option|answer)|correct\s+(?:option|answer)|multiple\s+choice|\bmcqs?\b|درست[^\n]*(?:جواب|نشان|انتخاب)|صحیح[^\n]*جواب|نشان[^\n]*لگائیں|نشان\s*دہی/i
const TRUE_FALSE_RE = /true\s*(?:or|\/)?\s*false|tick\s+the\s+true|cross\s+the\s+false|درست[^\n]*غلط|صحیح[^\n]*غلط/i
const MATCH_RE = /match\s+(?:the\s+)?columns?|matching|کالم[^\n]*(?:ملائیں|ملاؤ)|جوڑ[^\n]*مل/i
const SHORT_RE = /short\s+questions?|answer\s+(?:the\s+)?(?:(?:following|these)\s+)?questions?(?:\s+given\s+below)?|مختصر[^\n]*سوال|مختصر[^\n]*جواب/i
const LONG_RE = /long\s+questions?|detailed\s+questions?|essay|story|application|letter|paragraph|summari[sz]e|summary|تفصیلی|مضمون|درخواست|خط|کہانی/i
const VERTICAL_MATH_RE = /addition|subtract|subtraction|multiply|multiplication|division|divide|vertical|solve\s+the\s+sums?|add\s+the\s+following|subtract\s+the\s+following|multiply\s+the\s+following|جمع|تفریق/i
const MATH_COMPARE_RE = /greater\s+than|less\s+than|fill\s+in\s+the\s+symbols?\s*>\s*or\s*<|write\s*>\s*(?:,|or)?\s*<|write[^\n]*(?:>|less)[^\n]*(?:<|equal)|compare/i
const MATH_NUMBER_NAME_RE = /number\s+names?|write\s+in\s+words|write\s+the\s+number|write\s+in\s+figures/i
const ATTEMPT_ANY_RE = /attempt\s+any\s+(?:\w+|\d+)\s+questions?/i
const MATH_PLACE_VALUE_RE = /tens?\s+and\s+ones?|place\s+value/i
const MATH_ORDER_RE = /ascending\s+order|descending\s+order/i
const MATH_TABLE_RE = /(?:write\s+the\s+)?tables?\s+of\b|table\s+of\s+\d/i
const PAIR_TABLE_RE = /word\s+meanings?|meanings?\s+of|urdu\s+meaning|opposites?|antonyms?|synonyms?|plural|singular|masculine|feminine|past\s+tense|acronyms?|abbreviations?|full\s+forms?|write\s+(?:these|the\s+following)\s+as\s+numbers?|معانی|مترادف|متضاد|واحد|جمع|مذکر|مونث|ہم\s*آواز/i

export function isSectionMarkerLine(line = '') {
  return SECTION_MARKER_RE.test(String(line))
}

export function cleanSectionMarker(line = '') {
  return String(line).replace(SECTION_MARKER_RE, '$1').trim()
}

export function inferOfficialSectionKind(section = {}) {
  const manualKind = String(section.layoutPreset || section.sectionKind || '').trim().toLowerCase()
  const allowedManualKinds = new Set(['mcq','short','long','table','pair_table','matching','true_false','fill_blank','list','vertical_math','math_compare','math_number_name','math_place_value','math_order','math_table'])
  if (manualKind && manualKind !== 'auto' && allowedManualKinds.has(manualKind)) return manualKind
  const heading = String(section.heading || '')
  const content = String(section.content || '')
  const trimmedLines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (isSectionMarkerLine(heading.trim()) && (!trimmedLines.length || trimmedLines.every(isSectionMarkerLine))) return 'marker'
  if (!heading.trim() && trimmedLines.length > 0 && trimmedLines.every(isSectionMarkerLine)) return 'marker'
  if (MCQ_HEADING_RE.test(heading)) return 'mcq'
  if (TRUE_FALSE_RE.test(heading)) return 'true_false'
  if (MATCH_RE.test(heading)) return 'matching'
  if (PAIR_TABLE_RE.test(heading)) return 'pair_table'
  if (MATH_COMPARE_RE.test(heading)) return 'math_compare'
  if (MATH_NUMBER_NAME_RE.test(heading)) return 'math_number_name'
  if (MATH_PLACE_VALUE_RE.test(heading)) return 'math_place_value'
  if (MATH_ORDER_RE.test(heading)) return 'math_order'
  if (MATH_TABLE_RE.test(heading)) return 'math_table'
  if (VERTICAL_MATH_RE.test(heading)) return 'vertical_math'
  if (LONG_RE.test(heading)) return 'long'
  if (SHORT_RE.test(heading) || ATTEMPT_ANY_RE.test(heading)) return 'short'
  if (trimmedLines.some(line => /^\|.*\|$/.test(line))) return 'table'
  if (/_{3,}|□|☐/.test(content)) return 'fill_blank'
  return 'list'
}
export function extractMarksLabel(heading = '', fallbackMarks = 0) {
  const text = String(heading)
  const match = text.match(/\(([^)]*(?:\d|marks?|نمبر)[^)]*)\)\s*$/i)
  if (match) return match[1].trim()
  const n = Number(fallbackMarks)
  return n > 0 ? String(n) : ''
}

export function stripTrailingMarks(heading = '') {
  return String(heading)
    .replace(/\s*\([^)]*(?:\d|marks?|نمبر)[^)]*\)\s*$/i, '')
    .trim()
}

export function splitContentWithMarkers(content = '') {
  const parts = []
  let buffer = []
  const flush = () => {
    if (buffer.length) parts.push({ type: 'content', text: buffer.join('\n').trim() })
    buffer = []
  }
  String(content).replace(/\r\n/g, '\n').split('\n').forEach(line => {
    if (isSectionMarkerLine(line)) {
      flush()
      parts.push({ type: 'marker', text: cleanSectionMarker(line) })
    } else {
      buffer.push(line)
    }
  })
  flush()
  return parts.filter(part => part.text)
}

function optionTokenRegex() {
  return /(?:^|\s|☐\s*)(?:\(([a-dA-D]|[ابجد]|الف|[1-4])\)|([a-dA-D]|[ابجد]|الف)[.)])\s*/g
}

function isOptionOnlyLine(line = '') {
  return /^(?:☐\s*)?(?:\(([a-dA-D]|[ابجد]|الف|[1-4])\)|([a-dA-D]|[ابجد]|الف)[.)])\s*/.test(String(line).trim())
}

function parseOptionsFromLines(lines = []) {
  const joined = lines.join(' ')
  const matches = [...joined.matchAll(optionTokenRegex())]
  if (matches.length >= 2) {
    return matches.map((match, index) => {
      const start = match.index + match[0].length
      const end = matches[index + 1]?.index ?? joined.length
      return {
        label: String(match[1] || match[2] || '').toUpperCase(),
        text: joined.slice(start, end).trim()
      }
    }).filter(option => option.text)
  }
  const split = lines.flatMap(line => String(line).trim().split(/\s{2,}/).map(x => x.trim()).filter(Boolean))
  if (split.length >= 2) return split.map((text, index) => ({ label:String.fromCharCode(65 + index), text }))
  return []
}

export function parseMcqRows(content = '') {
  const lines = String(content).replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).filter(Boolean)
  const blocks = []
  let current = null
  const qStart = /^(\d+|[ivxlcdm]+|الف|ب|ج|د|ہ|و)(?:[.)]|\))\s*(.*)$/i
  const checkboxMode = lines.some(line => line.startsWith('☐'))

  lines.forEach(line => {
    const urduQuestionLabel = checkboxMode && !line.startsWith('☐') && /^(?:الف|ب|ج|د|ہ|و)[.)]/.test(line)
    const q = (urduQuestionLabel || !isOptionOnlyLine(line)) ? line.match(qStart) : null
    if (q) {
      if (current) blocks.push(current)
      current = { number:q[1], lines:[q[2]] }
    } else if (current) {
      current.lines.push(line)
    } else {
      current = { number:'1', lines:[line] }
    }
  })
  if (current) blocks.push(current)

  return blocks.map(block => {
    const optionLineIndex = block.lines.findIndex(isOptionOnlyLine)
    const promptLines = optionLineIndex >= 0 ? block.lines.slice(0, optionLineIndex) : block.lines.slice(0, 1)
    const optionLines = optionLineIndex >= 0 ? block.lines.slice(optionLineIndex) : block.lines.slice(1)
    const inlineJoined = block.lines.join(' ')
    const inlineMatches = [...inlineJoined.matchAll(optionTokenRegex())]
    let prompt = promptLines.join(' ').trim()
    let options = parseOptionsFromLines(optionLines)

    if (inlineMatches.length >= 2) {
      prompt = inlineJoined.slice(0, inlineMatches[0].index).trim()
      options = inlineMatches.map((match, index) => {
        const start = match.index + match[0].length
        const end = inlineMatches[index + 1]?.index ?? inlineJoined.length
        return { label:String(match[1] || match[2] || '').toUpperCase(), text:inlineJoined.slice(start, end).trim() }
      }).filter(option => option.text)
    }

    if (options.length < 2 && block.lines.length > 1) {
      options = parseOptionsFromLines(block.lines.slice(1))
      prompt = block.lines[0].trim()
    }
    return options.length >= 2 ? { number:block.number, prompt, options } : null
  }).filter(Boolean)
}

export function countOfficialMcqs(section = {}) {
  if (inferOfficialSectionKind(section) !== 'mcq') return 0
  const rows = parseMcqRows(section.content)
  return rows.length || 1
}

export function countNumberedItems(content = '') {
  return String(content)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^(?:\d+|[ivxlcdm]+|[a-z])[.)]\s+/i.test(line)).length
}

export function isOfficialFirstTermPaper(paper = {}) {
  const id = String(paper.id || '')
  return paper.documentFormat === 'pts-native-v13' ||
    paper.documentFormat === 'official-v12' ||
    id.startsWith('official-first-term-') ||
    id.includes('first-term-2026')
}

export const OFFICIAL_SECTION_PATTERNS = {
  MCQ_HEADING_RE,
  TRUE_FALSE_RE,
  MATCH_RE,
  SHORT_RE,
  LONG_RE,
  VERTICAL_MATH_RE,
  MATH_COMPARE_RE,
  MATH_NUMBER_NAME_RE,
  MATH_PLACE_VALUE_RE,
  MATH_ORDER_RE,
  MATH_TABLE_RE,
  PAIR_TABLE_RE
}
