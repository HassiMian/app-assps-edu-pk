// parseFillBlanks.js — Lossless semantic parser for Fill in the Blanks sections
import {
  createFillBlankNode,
  createScopeHeaderNode,
  createSectionBannerNode,
  DocumentDirection,
} from '../../core/PaperDocumentV2.js'

/**
 * Parses Fill in the Blank section content into canonical FillBlankNode items.
 *
 * @param {string} content
 * @param {object} context
 * @returns {Array<{ node: object, startOffset: number, endOffset: number, rawText: string }>}
 */
export function parseFillBlanks(content, context = {}) {
  const items = []
  if (!content || typeof content !== 'string') return items

  const sectionId = context.sectionId || 'sec'
  const direction = context.direction || DocumentDirection.AUTO

  // Check if a word bank is defined at the top
  let wordBank = null
  let contentToParse = content
  let wordBankOffset = 0

  const wbMatch = content.match(/^[ \t]*(?:الفاظ|words|word\s*bank|hint\s*box)[ \t]*[:：][ \t]*([^\n]+)\n+/i)
  if (wbMatch) {
    const rawBank = wbMatch[1]
    wordBank = rawBank
      .split(/[،,؛;\/|\t]+/)
      .map(w => w.trim())
      .filter(Boolean)
    wordBankOffset = wbMatch[0].length
  }

  // Match item line boundaries
  const lineRegex = /^[ \t]*(?:(?:[0-9]+|[ivxIVX]+|[a-zA-Z]|[الف-ي])[\.\)\-:]|\([0-9]+\)|\([a-zA-Z]\)|\([الف-ي]\))[ \t]+/gm
  lineRegex.lastIndex = wordBankOffset

  const matches = []
  let match
  while ((match = lineRegex.exec(content)) !== null) {
    matches.push({ index: match.index, text: match[0] })
  }

  if (matches.length === 0) {
    // If lines contain blanks but no numbered prefixes, split by newline
    const lines = content.slice(wordBankOffset).split('\n')
    let currentPos = wordBankOffset

    lines.forEach((line, idx) => {
      const lineLen = line.length + (idx < lines.length - 1 ? 1 : 0)
      if (line.trim().length > 0) {
        const rawText = content.slice(currentPos, currentPos + lineLen)
        const parsed = parseSingleFillBlank(rawText, `${sectionId}__q${String(items.length + 1).padStart(2, '0')}`, direction, wordBank)
        items.push({
          node: parsed,
          startOffset: currentPos,
          endOffset: currentPos + lineLen,
          rawText,
        })
      }
      currentPos += lineLen
    })

    if (items.length === 0) {
      const rawText = content
      const parsed = parseSingleFillBlank(rawText, `${sectionId}__q01`, direction, wordBank)
      items.push({
        node: parsed,
        startOffset: 0,
        endOffset: content.length,
        rawText,
      })
    }
  } else {
    // Pre-question text (e.g. Word Bank or banner)
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

      // Check trailing banner
      const bannerMatch = rawText.match(/\n[ \t]*(#[^\n]+)$/)
      if (bannerMatch && i === matches.length - 1) {
        const bannerIndexInBlock = bannerMatch.index + 1
        const qText = rawText.slice(0, bannerIndexInBlock)
        const bText = rawText.slice(bannerIndexInBlock)

        const parsed = parseSingleFillBlank(qText, nodeId, direction, wordBank)
        items.push({
          node: parsed,
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

      const parsed = parseSingleFillBlank(rawText, nodeId, direction, wordBank)
      items.push({
        node: parsed,
        startOffset,
        endOffset,
        rawText,
      })
    }
  }

  if (items.length > 0 && items[0].startOffset > 0) {
    items[0].rawText = content.slice(0, items[0].endOffset)
    items[0].startOffset = 0
  }

  return items
}

function parseSingleFillBlank(rawText, nodeId, defaultDirection, wordBank) {
  let fullText = rawText.trim()
  fullText = fullText.replace(/^[ \t]*(?:[0-9]+|[ivxIVX]+|[a-zA-Z]|[الف-ي])[\.\)\-:][ \t]*/, '')

  // Split into segments by blanks (sequences of 3 or more underscores or dashes)
  const blankRegex = /_{2,}|-{3,}/g
  const segments = []
  let lastIdx = 0
  let m

  while ((m = blankRegex.exec(fullText)) !== null) {
    if (m.index > lastIdx) {
      segments.push({
        type: 'text',
        value: fullText.slice(lastIdx, m.index),
      })
    }
    segments.push({
      type: 'blank',
      value: m[0],
    })
    lastIdx = m.index + m[0].length
  }

  if (lastIdx < fullText.length) {
    segments.push({
      type: 'text',
      value: fullText.slice(lastIdx),
    })
  }

  // If no blanks were explicitly found in text, treat whole as text segment
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      value: fullText,
    })
  }

  return createFillBlankNode({
    id: nodeId,
    direction: defaultDirection,
    fullText: fullText || rawText.trim(),
    segments,
    wordBank: wordBank || null,
    rawSource: rawText.trim(),
  })
}
