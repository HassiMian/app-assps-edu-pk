// parseTrueFalse.js — Lossless semantic parser for True/False sections
import {
  createTrueFalseNode,
  createScopeHeaderNode,
  createSectionBannerNode,
  DocumentDirection,
} from '../../core/PaperDocumentV2.js'

/**
 * Parses True/False section content into canonical TrueFalseNode items.
 *
 * @param {string} content
 * @param {object} context
 * @returns {Array<{ node: object, startOffset: number, endOffset: number, rawText: string }>}
 */
export function parseTrueFalse(content, context = {}) {
  const items = []
  if (!content || typeof content !== 'string') return items

  const sectionId = context.sectionId || 'sec'
  const direction = context.direction || DocumentDirection.AUTO

  // Match statement line boundaries
  const lineRegex = /^[ \t]*(?:(?:[0-9]+|[ivxIVX]+|[a-zA-Z]|[الف-ي])[\.\)\-:]|\([0-9]+\)|\([a-zA-Z]\)|\([الف-ي]\))[ \t]+/gm
  const matches = []
  let match
  while ((match = lineRegex.exec(content)) !== null) {
    matches.push({ index: match.index, text: match[0] })
  }

  if (matches.length === 0) {
    const rawText = content
    const parsed = parseSingleTfLine(rawText, `${sectionId}__q01`, direction)
    items.push({
      node: parsed,
      startOffset: 0,
      endOffset: content.length,
      rawText,
    })
    return items
  }

  // Pre-statement banner or text
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

      const parsed = parseSingleTfLine(qText, nodeId, direction)
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

    const parsed = parseSingleTfLine(rawText, nodeId, direction)
    items.push({
      node: parsed,
      startOffset,
      endOffset,
      rawText,
    })
  }

  if (items.length > 0 && items[0].startOffset > 0) {
    items[0].rawText = content.slice(0, items[0].endOffset)
    items[0].startOffset = 0
  }

  return items
}

function parseSingleTfLine(rawText, nodeId, defaultDirection) {
  let statement = rawText.trim()

  // Remove leading numbering
  statement = statement.replace(/^[ \t]*(?:[0-9]+|[ivxIVX]+|[a-zA-Z]|[الف-ي])[\.\)\-:][ \t]*/, '')

  // Detect indicator box
  const hasIndicatorBox = /[□☐]|\[\s*\]|\(T\/F\)|\(True\/False\)|_{3,}/.test(statement)

  // Remove trailing indicator box from statement text
  statement = statement.replace(/[ \t]*(?:[□☐]|\[\s*\]|\(T\/F\)|\(True\/False\)|_{3,})[ \t]*$/, '').trim()

  return createTrueFalseNode({
    id: nodeId,
    direction: defaultDirection,
    statement: statement || rawText.trim(),
    hasIndicatorBox,
    expectedAnswer: null, // Never infer truth value
  })
}
