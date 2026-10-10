// parseMcqSection.js — Lossless semantic parser for MCQ sections
import {
  createMcqNode,
  createScopeHeaderNode,
  createSectionBannerNode,
  LabelOrigin,
  DocumentDirection,
} from '../../core/PaperDocumentV2.js'

/**
 * Parses an MCQ section's raw content into structured canonical nodes with exact spans.
 *
 * @param {string} content
 * @param {object} context
 * @returns {Array<{ node: object, startOffset: number, endOffset: number, rawText: string }>}
 */
export function parseMcqSection(content, context = {}) {
  const items = []
  if (!content || typeof content !== 'string') return items

  const sectionId = context.sectionId || 'sec'
  const direction = context.direction || DocumentDirection.AUTO

  // Match question-start boundaries without confusing option rows for questions.
  // Important source forms:
  //   1. Question text          -> real question boundary
  //   (1) option (2) option    -> NOT a question boundary
  //   الف) Question text       -> Urdu question boundary
  //   ☐ الف) option            -> NOT a question boundary
  const numericQuestionStart = /^[ \t]*(?:(?:Q\s*\d+|[0-9]+|[ivxIVX]+)[.)\-:]|\([0-9]+\)|\([ivxIVX]+\))[ \t]+/
  const urduQuestionStart = /^[ \t]*(?:(?:الف|ا|ب|ج|د|ہ|و|ز|ح)[.)\-:]|\((?:الف|ا|ب|ج|د|ہ|و|ز|ح)\))[ \t]+/
  const lineEntries = []
  let cursor = 0
  for (const rawLine of content.split('\n')) {
    lineEntries.push({ index: cursor, line: rawLine })
    cursor += rawLine.length + 1
  }

  const isNumericOptionRow = (line = '') => {
    const tokens = String(line).match(/\([1-8]\)/g) || []
    return tokens.length >= 2
  }
  const isCheckboxOptionRow = (line = '') => /^\s*☐/.test(String(line))
  // Urdu questions may start with الف) or ب), but a row containing several
  // labelled answers is never another question heading.
  const isUrduInlineOptionRow = (line = '') => {
    const optionLabels = String(line).match(/(?:^|[ \t]+)(?:الف|ا|ب|ج|د|ہ|و|ز|ح)[.)][ \t]+/g) || []
    return optionLabels.length >= 2
  }

  const numericCandidates = lineEntries
    .map(entry => ({ ...entry, match: entry.line.match(numericQuestionStart) }))
    .filter(entry => entry.match && !isNumericOptionRow(entry.line) && !isCheckboxOptionRow(entry.line))
  const hasNumericQuestions = numericCandidates.length > 0
  const matches = []

  for (const entry of lineEntries) {
    if (isCheckboxOptionRow(entry.line) || isNumericOptionRow(entry.line) || isUrduInlineOptionRow(entry.line)) continue
    const boundary = entry.line.match(hasNumericQuestions ? numericQuestionStart : urduQuestionStart)
    if (!boundary) continue
    matches.push({ index: entry.index + boundary.index, text: boundary[0] })
  }

  // If no numbered lines found, treat entire content as 1 item
  if (matches.length === 0) {
    const rawText = content
    const parsed = parseSingleMcqBlock(rawText, `${sectionId}__q01`, direction)
    items.push({
      node: parsed,
      startOffset: 0,
      endOffset: content.length,
      rawText,
    })
    return items
  }

  // Pre-question text (banners or headers before first question)
  if (matches[0].index > 0) {
    const preText = content.slice(0, matches[0].index)
    if (preText.trim()) {
      const bannerNode = preText.includes('#')
        ? createSectionBannerNode({ id: `${sectionId}__banner00`, bannerText: preText.trim(), direction })
        : createScopeHeaderNode({ id: `${sectionId}__scope00`, headingText: preText.trim(), direction })
      items.push({
        node: bannerNode,
        startOffset: 0,
        endOffset: matches[0].index,
        rawText: preText,
      })
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const startOffset = items.length === 0 && i === 0 ? 0 : matches[i].index
    const endOffset = i + 1 < matches.length ? matches[i + 1].index : content.length
    const rawText = content.slice(startOffset, endOffset)
    const qIndex = String(i + 1).padStart(2, '0')
    const nodeId = `${sectionId}__q${qIndex}`

    // Check if trailing banner exists in this block
    const bannerMatch = rawText.match(/\n[ \t]*(#[^\n]+)$/)
    if (bannerMatch && i === matches.length - 1) {
      const bannerIndexInBlock = bannerMatch.index + 1
      const qText = rawText.slice(0, bannerIndexInBlock)
      const bText = rawText.slice(bannerIndexInBlock)

      const parsedQ = parseSingleMcqBlock(qText, nodeId, direction)
      items.push({
        node: parsedQ,
        startOffset,
        endOffset: startOffset + bannerIndexInBlock,
        rawText: qText,
      })

      const bannerNode = bText.includes('Chapter') || bText.includes('باب')
        ? createScopeHeaderNode({ id: `${sectionId}__scope_end`, headingText: bText.trim(), direction })
        : createSectionBannerNode({ id: `${sectionId}__banner_end`, bannerText: bText.trim(), direction })
      items.push({
        node: bannerNode,
        startOffset: startOffset + bannerIndexInBlock,
        endOffset,
        rawText: bText,
      })
      continue
    }

    const parsed = parseSingleMcqBlock(rawText, nodeId, direction)
    items.push({
      node: parsed,
      startOffset,
      endOffset,
      rawText,
    })
  }

  // Ensure first item starts at 0 if leading text was whitespace
  if (items.length > 0 && items[0].startOffset > 0) {
    items[0].rawText = content.slice(0, items[0].endOffset)
    items[0].startOffset = 0
  }

  return items
}

/**
 * Parses a single raw MCQ text block into a Canonical MCQ node.
 */
function parseSingleMcqBlock(rawText, nodeId, defaultDirection) {
  const lines = rawText.trim().split('\n')
  const stemLines = []
  const options = []

  let foundOptions = false
  const optLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  // Patterns for option markers:
  // a) / A) / (a) / a.
  // الف) / ب) / ج) / د)
  // 1) / 2) / 3) / (1)
  const optMarkerRegex = /(?:^|[ \t]+)(?:☐|\(T\/F\)|\[\s*\])?\s*(?:([a-dA-D]|الف|ا|ب|ج|د|ہ|و|ز|ح|[1-8])[.)\-:]|\(([a-dA-D]|الف|ا|ب|ج|د|ہ|و|ز|ح|[1-8])\))[ \t]+/g

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx].trim()
    if (!line) continue

    // Line 0 is always the question stem (or part of it)
    if (lIdx === 0 && !foundOptions) {
      stemLines.push(line)
      continue
    }

    // Check if line contains labeled options
    optMarkerRegex.lastIndex = 0
    const inlineMarkers = []
    let m
    while ((m = optMarkerRegex.exec(line)) !== null) {
      inlineMarkers.push({ index: m.index, matchLen: m[0].length, label: m[1] || m[2] })
    }

    if (inlineMarkers.length >= 2) {
      foundOptions = true
      inlineMarkers.forEach((marker, mi) => {
        const textStart = marker.index + marker.matchLen
        const textEnd = mi + 1 < inlineMarkers.length ? inlineMarkers[mi + 1].index : line.length
        const optText = line.slice(textStart, textEnd).trim()
        const canonicalLabel = optLetters[options.length] || String(options.length + 1)
        options.push({
          id: `${nodeId}__opt${canonicalLabel}`,
          canonicalLabel,
          sourceLabel: marker.label,
          displayLabel: `${marker.label})`,
          labelOrigin: LabelOrigin.SOURCE,
          text: optText,
          direction: defaultDirection,
          isCorrect: null,
        })
      })
      continue
    }

    // Single option line: e.g. "a) Food" or "☐ الف) اللہ"
    if (inlineMarkers.length === 1 && lIdx > 0) {
      foundOptions = true
      const marker = inlineMarkers[0]
      const optText = line.slice(marker.index + marker.matchLen).trim()
      const canonicalLabel = optLetters[options.length] || String(options.length + 1)
      options.push({
        id: `${nodeId}__opt${canonicalLabel}`,
        canonicalLabel,
        sourceLabel: marker.label,
        displayLabel: `${marker.label})`,
        labelOrigin: LabelOrigin.SOURCE,
        text: optText,
        direction: defaultDirection,
        isCorrect: null,
      })
      continue
    }

    // Check unlabeled options row (Class 5 Islamiyat Version B: "1200   1300   1400   1500")
    if (lIdx > 0) {
      const parts = line.split(/[ \t]{3,}/).map(s => s.trim()).filter(Boolean)
      if (parts.length >= 3 && parts.every(p => !p.match(/^[0-9]+[.)]/))) {
        foundOptions = true
        parts.forEach((p) => {
          const canonicalLabel = optLetters[options.length] || String(options.length + 1)
          options.push({
            id: `${nodeId}__opt${canonicalLabel}`,
            canonicalLabel,
            sourceLabel: null,
            displayLabel: '',
            labelOrigin: LabelOrigin.GENERATED_CANONICAL,
            text: p,
            direction: defaultDirection,
            isCorrect: null,
          })
        })
        continue
      }
    }

    if (!foundOptions) {
      stemLines.push(line)
    }
  }

  // Strip question number prefix from stem if present
  let stemText = stemLines.join(' ')
  stemText = stemText.replace(/^[ \t]*(?:Q\s*\d+|[0-9]+|[ivxIVX]+|[a-zA-Z]|الف|ا|ب|ج|د|ہ|و|ز|ح)[.)\-:][ \t]*/, '').trim()

  // Ensure at least 2 options for valid MCQ contract
  if (options.length < 2) {
    // Generate canonical fallback options if line had unparsed choices or empty
    while (options.length < 2) {
      const cLabel = optLetters[options.length]
      options.push({
        id: `${nodeId}__opt${cLabel}`,
        canonicalLabel: cLabel,
        sourceLabel: null,
        displayLabel: '',
        labelOrigin: LabelOrigin.GENERATED_CANONICAL,
        text: '',
        direction: defaultDirection,
        isCorrect: null,
      })
    }
  }

  return createMcqNode({
    id: nodeId,
    direction: defaultDirection,
    stemText: stemText || rawText.trim(),
    options,
  })
}
