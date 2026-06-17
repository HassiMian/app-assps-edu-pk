const SECTION_HINTS = [
  {
    type: 'mcq',
    patterns: [
      /^mcq\b/i, /^objective\b/i, /^multiple choice\b/i, /^choose\b/i, /^part\s*a\b/i, /^section\s*a\b/i,
      /معروضی|کثیر\s*الانتخاب|درست\s*جواب|جوابات\s*A|جوابات\s*اے|objective\s*part/i,
    ],
  },
  {
    type: 'short',
    patterns: [
      /^short\b/i, /^short questions?\b/i, /^brief\b/i, /^part\s*b\b/i, /^section\s*b\b/i,
      /مختصر|مختصراً|پانچ\s+سوالات|جوابات?\s+دیں|جواب\s+دیں|درج\s+ذیل.*سوالات/i,
    ],
  },
  {
    type: 'long',
    patterns: [
      /^long\b/i, /^long questions?\b/i, /^subjective\b/i, /^descriptive\b/i, /^essay\b/i, /^part\s*c\b/i, /^section\s*c\b/i,
      /تفصیلی|طویل|انشائی|حصہ\s*دوم|تشریح|خلاصہ|مرکزی\s+خیال|درخواست|کہانی|مکالمہ|خط|مضمون|جملوں|واحد\s+جمع/i,
    ],
  },
]

const URDU_TYPE_HINTS = [
  { type: 'long', pattern: /اشعار|شعر|تشریح|خلاصہ|مرکزی\s+خیال|درخواست|کہانی|خط|مضمون|مکالمہ/ },
  { type: 'short', pattern: /مختصر|پانچ\s+سوالات|سوالات\s+کے\s+مختصر|جواب\s+دیں/ },
  { type: 'short', pattern: /واحد\s+جمع|مترادف|متضاد|الفاظ\s+معانی|خالی\s+جگہ|درست\s+کریں/ },
]

const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

function norm(str) {
  return String(str || '').trim()
}

function normalizeDigits(str = '') {
  return String(str).replace(/[۰-۹٠-٩]/g, ch => {
    const ur = URDU_DIGITS.indexOf(ch)
    if (ur >= 0) return String(ur)
    const ar = ARABIC_DIGITS.indexOf(ch)
    return ar >= 0 ? String(ar) : ch
  })
}

function isUrduText(text) {
  return /[\u0600-\u06ff]/.test(String(text || ''))
}

function isWatermarkOrHeader(line) {
  const value = normalizeDigits(line).replace(/\s+/g, ' ').trim()
  if (!value) return true
  if (/FGSTUDY|FQSTUDY|ROLL\s*NO|Code\s*:|Annual\s+\d{4}|www\.|\.com/i.test(value)) return true
  if (/^\*+$|^-+$|^_+$/.test(value)) return true
  if (/^(وقت|نمبر|کلانمبر|کل\s*نمبر)\s*[:：]?\s*\d+$/i.test(value)) return true
  return false
}

function cleanQuestionLine(line) {
  return norm(normalizeDigits(line))
    .replace(/\bFGSTUDY\.?COM\b/gi, '')
    .replace(/^\s*(?:q(?:uestion)?\.?\s*|سوال\s*نمبر\s*)?\d+\s*[\).:\-–—]?\s*/i, '')
    .replace(/^\s*(?:\([ivxlcdm]+\)|[ivxlcdm]+[\).:-])\s*/i, '')
    .replace(/^\s*[-•*]\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function detectSection(line) {
  const clean = normalizeDigits(line)
  for (const { type, patterns } of SECTION_HINTS) {
    if (patterns.some(pattern => pattern.test(clean))) return type
  }
  return null
}

function inferTypeFromText(text, fallback = 'short') {
  const clean = normalizeDigits(text)
  for (const { type, pattern } of URDU_TYPE_HINTS) {
    if (pattern.test(clean)) return type
  }
  if (/\([A-D]\)|\b[A-D][).:-]/i.test(clean)) return 'mcq'
  return clean.length > 180 ? 'long' : fallback
}

function isOptionLine(line) {
  return /^\s*(?:[a-d][).:-]|\([a-d]\)|[ا-د][).:-]|\([ا-د]\))\s+/i.test(line)
}

function optionLabel(raw) {
  const value = String(raw || '').replace(/[()۔.:\-\s]/g, '').trim()
  const urduMap = { ا: 'A', ب: 'B', ج: 'C', د: 'D' }
  return (urduMap[value] || value || '').toUpperCase()
}

function parseOptionLine(line) {
  const match = normalizeDigits(line).match(/^\s*(?:([a-d])[).:-]|\(([a-d])\)|([ا-د])[).:-]|\(([ا-د])\))\s*(.+)$/i)
  if (!match) return null
  const label = optionLabel(match[1] || match[2] || match[3] || match[4])
  const text = norm(match[5])
  return { label, text, textUrdu: isUrduText(text) ? text : '' }
}

function parseInlineOptions(text) {
  const clean = normalizeDigits(text)
  const marker = /(\([A-Da-d]\)|[A-Da-d][).:-]|\([ا-د]\)|[ا-د][).:-])/g
  const matches = [...clean.matchAll(marker)]
  if (matches.length < 2) return { stem: clean, options: [] }

  const options = []
  let stem = clean.slice(0, matches[0].index).trim()
  matches.forEach((match, index) => {
    const start = match.index + match[0].length
    const end = index + 1 < matches.length ? matches[index + 1].index : clean.length
    const value = clean.slice(start, end).replace(/[،,؛;]+$/g, '').trim()
    if (!value) return
    options.push({
      label: optionLabel(match[0]),
      text: value,
      textUrdu: isUrduText(value) ? value : '',
    })
  })

  if (!stem) {
    const withoutOptions = clean.replace(marker, '\n$1').split('\n')[0]?.trim()
    stem = withoutOptions || ''
  }
  return { stem, options }
}

function isQuestionStart(line) {
  const clean = normalizeDigits(line)
  return /^\s*(?:q(?:uestion)?\.?\s*)?\d+\s*[\).:\-–—]\s*/i.test(clean)
    || /^\s*سوال\s*نمبر\s*\d+/i.test(clean)
    || /^\s*\([ivxlcdm]+\)\s+/i.test(clean)
}

function isLooseQuestionLine(line, currentType) {
  const clean = normalizeDigits(line)
  if (isQuestionStart(clean)) return true
  if (currentType === 'mcq' && /\([A-D]\)|\b[A-D][).:-]/i.test(clean)) return true
  return /^[؟?].+/.test(clean) || /[؟?]\s*$/.test(clean)
}

function splitRomanSubparts(line) {
  const clean = normalizeDigits(line)
  const parts = clean.split(/\s+(?=\([ivxlcdm]+\)\s+)/i).map(part => part.trim()).filter(Boolean)
  return parts.length > 1 ? parts : null
}

function blocksFromLines(content) {
  const lines = norm(content)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => !isWatermarkOrHeader(line))

  const blocks = []
  let current = []
  let currentType = 'short'

  const flush = () => {
    if (current.length) blocks.push({ type: currentType, lines: current })
    current = []
  }

  lines.forEach((line) => {
    const section = detectSection(line)
    if (section) {
      flush()
      currentType = section
      if (isQuestionStart(line)) current = [line]
      return
    }

    const romanParts = splitRomanSubparts(line)
    if (romanParts && currentType !== 'mcq') {
      flush()
      romanParts.forEach(part => blocks.push({ type: currentType, lines: [part] }))
      return
    }

    if (isLooseQuestionLine(line, currentType) && current.length) {
      flush()
      current = [line]
      return
    }

    current.push(line)
  })

  flush()
  return blocks
}

function cloneQuestion(question = {}) {
  return {
    ...question,
    options: (question.options || []).map(option => ({ ...option })),
  }
}

function mergeQuestionPair(primary = {}, secondary = {}, forceLanguage = '') {
  const merged = cloneQuestion(primary)
  const secondaryText = norm(secondary.text || secondary.textUrdu)
  const secondaryOptions = Array.isArray(secondary.options) ? secondary.options : []

  if (!norm(merged.text) && secondaryText) merged.text = secondaryText
  if (secondaryText) merged.textUrdu = secondaryText

  if (secondaryOptions.length) {
    const baseOptions = (merged.options || []).length ? merged.options : secondaryOptions
    merged.options = baseOptions.map((option, index) => {
      const secondaryOption = secondaryOptions[index] || {}
      return {
        ...option,
        textUrdu: norm(secondaryOption.textUrdu || secondaryOption.text || option.textUrdu || ''),
      }
    })
  }

  const hasEnglish = Boolean(norm(merged.text || '')) || (merged.options || []).some(opt => norm(opt.text || ''))
  const hasUrdu = Boolean(norm(merged.textUrdu || '')) || (merged.options || []).some(opt => norm(opt.textUrdu || ''))
  merged.medium = forceLanguage || (hasEnglish && hasUrdu ? 'mixed' : hasUrdu && !hasEnglish ? 'urdu' : merged.medium || 'english')
  return merged
}

function parseBlock(lines, fallbackType = 'short') {
  const safeLines = (Array.isArray(lines) ? lines : String(lines || '').split('\n'))
    .map(line => normalizeDigits(line).trim())
    .filter(Boolean)
  if (!safeLines.length) return null

  let textLines = []
  let options = []
  let answer = ''
  let sectionOverride = null
  let marks = ''

  safeLines.forEach(line => {
    const section = detectSection(line)
    if (section) {
      sectionOverride = section
      return
    }
    const marksMatch = line.match(/(?:کل\s*)?(?:نمبر|marks?)\s*[:：]?\s*(\d+)/i)
    if (marksMatch && Number(marksMatch[1]) <= 20) marks = marksMatch[1]

    if (/^(answer|ans|جواب)\s*[:=-]/i.test(line)) {
      answer = line.replace(/^(answer|ans|جواب)\s*[:=-]\s*/i, '').trim()
      return
    }

    const singleOption = isOptionLine(line) ? parseOptionLine(line) : null
    if (singleOption) {
      options.push(singleOption)
      return
    }

    const inline = parseInlineOptions(line)
    if (inline.options.length >= 2) {
      if (inline.stem) textLines.push(cleanQuestionLine(inline.stem))
      options.push(...inline.options)
      return
    }

    textLines.push(cleanQuestionLine(line))
  })

  const text = textLines.join(' ').replace(/\s+/g, ' ').trim()
  const section = sectionOverride || (options.length >= 2 ? 'mcq' : inferTypeFromText(text, fallbackType))
  if (!text && !options.length) return null

  const normalizedOptions = options
    .filter(option => option.label && norm(option.text || option.textUrdu))
    .sort((a, b) => ['A', 'B', 'C', 'D'].indexOf(a.label) - ['A', 'B', 'C', 'D'].indexOf(b.label))

  return {
    id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: section === 'mcq' ? 'mcq' : section === 'long' ? 'long' : 'short',
    text,
    textUrdu: isUrduText(text) ? text : '',
    options: normalizedOptions,
    answer,
    marks: Number(marks || (section === 'mcq' ? 1 : section === 'long' ? 5 : 2)),
    chapter: '',
    medium: isUrduText(text) ? 'urdu' : 'english',
  }
}

export function parseManualPaperDraft(rawContent) {
  const bucket = { mcq: [], short: [], long: [] }
  blocksFromLines(rawContent).forEach(block => {
    const parsed = parseBlock(block.lines, block.type)
    if (!parsed) return
    if (parsed.type === 'mcq') bucket.mcq.push(parsed)
    else if (parsed.type === 'long') bucket.long.push(parsed)
    else bucket.short.push(parsed)
  })
  return bucket
}

export function parseManualPaperDraftPair(englishRaw = '', urduRaw = '') {
  const primary = parseManualPaperDraft(englishRaw)
  const secondary = parseManualPaperDraft(urduRaw)
  if (!norm(urduRaw)) return primary

  const merged = { mcq: [], short: [], long: [] }
  ;(['mcq', 'short', 'long']).forEach((section) => {
    const a = primary[section] || []
    const b = secondary[section] || []
    const max = Math.max(a.length, b.length)
    for (let i = 0; i < max; i += 1) {
      if (a[i] || b[i]) merged[section].push(mergeQuestionPair(a[i] || {}, b[i] || {}, norm(englishRaw) ? 'mixed' : 'urdu'))
    }
  })
  return merged
}

export function buildManualPaperTitle({ classLevel = '', subject = '', publisher = '' }) {
  const parts = [subject || 'Manual Draft', classLevel ? `Class ${classLevel}` : '', publisher ? `- ${publisher}` : ''].filter(Boolean)
  return parts.join(' ')
}
