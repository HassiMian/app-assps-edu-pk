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

  // Match question start boundaries
  // Lines starting with 1., 1), (1), i), i., Q1., (a), الف), etc.
  const lineRegex = /^[ \t]*(?:(?:Q\s*\d+|[0-9]+|[ivxIVX]+|[a-zA-Z]|[الف-ي])[\.\)\-:]|\([0-9]+\)|\([a-zA-Z]\)|\([الف-ي]\))[ \t]+/gm
  const matches = []
  let match
  while ((match = lineRegex.exec(content)) !== null) {
    matches.push({ index: match.index, text: match[0] })
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
  const optLetters = ['A', 'B', 'C', 'D', 'E', 'F']

  // Patterns for option markers:
  // a) / A) / (a) / a.
  // الف) / ب) / ج) / د)
  // 1) / 2) / 3) / (1)
  const optionInlinePattern = /(?:^|\s+)(?:☐|\(T\/F\)|\[\s*\])?\s*(?:([a-dA-D]|الف|ب|ج|د|[1-4])[\.\)\-:]|\(([a-dA-D]|الف|ب|ج|د|[1-4])\))[ \t]+([^\n\t]+)/g

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx].trim()
    if (!line) continue

    // Line 0 is always the question stem (or part of it)
    if (lIdx === 0 && !foundOptions) {
      stemLines.push(line)
      continue
    }

    // Check if line contains labeled options
    const inlineMatches = []
    let m
    while ((m = optionInlinePattern.exec(line)) !== null) {
      const label = m[1] || m[2]
      const text = m[3].replace(/[ \t]+(?:[a-dA-D]|الف|ب|ج|د|[1-4])[\.\)\-:]/g, '').trim()
      inlineMatches.push({ label, text })
    }

    if (inlineMatches.length >= 2) {
      foundOptions = true
      inlineMatches.forEach((opt) => {
        const canonicalLabel = optLetters[options.length] || String(options.length + 1)
        options.push({
          id: `${nodeId}__opt${canonicalLabel}`,
          canonicalLabel,
          sourceLabel: opt.label,
          displayLabel: `${opt.label})`,
          labelOrigin: LabelOrigin.SOURCE,
          text: opt.text,
          direction: defaultDirection,
          isCorrect: null,
        })
      })
      continue
    }

    // Check single option line: e.g. "a) Food" or "☐ الف) اللہ"
    const singleOptMatch = line.match(/^(?:☐|\(T\/F\)|\[\s*\])?[ \t]*([a-dA-D]|الف|ب|ج|د|[1-4])[\.\)\-:][ \t]+(.+)$/)
    if (singleOptMatch && lIdx > 0) {
      foundOptions = true
      const label = singleOptMatch[1]
      const text = singleOptMatch[2].trim()
      const canonicalLabel = optLetters[options.length] || String(options.length + 1)
      options.push({
        id: `${nodeId}__opt${canonicalLabel}`,
        canonicalLabel,
        sourceLabel: label,
        displayLabel: `${label})`,
        labelOrigin: LabelOrigin.SOURCE,
        text,
        direction: defaultDirection,
        isCorrect: null,
      })
      continue
    }

    // Check unlabeled options row (Class 5 Islamiyat Version B: "1200   1300   1400   1500")
    if (lIdx > 0) {
      const parts = line.split(/[ \t]{3,}/).map(s => s.trim()).filter(Boolean)
      if (parts.length >= 3 && parts.every(p => !p.match(/^[0-9]+[\.\)]/))) {
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
  stemText = stemText.replace(/^[ \t]*(?:Q\s*\d+|[0-9]+|[ivxIVX]+|[a-zA-Z]|[الف-ي])[\.\)\-:][ \t]*/, '').trim()

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
