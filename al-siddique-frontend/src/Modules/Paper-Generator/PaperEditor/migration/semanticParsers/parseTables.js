// parseTables.js — Lossless semantic parser for Markdown Tables & Matching Columns
import {
  createMatchingColumnsNode,
  createGrammarTableNode,
  createScopeHeaderNode,
  createSectionBannerNode,
  DocumentDirection,
} from '../../core/PaperDocumentV2.js'

/**
 * Parses markdown table content into canonical matching_columns or grammar_table nodes.
 *
 * @param {string} content
 * @param {object} context
 * @returns {Array<{ node: object, startOffset: number, endOffset: number, rawText: string }>}
 */
export function parseTables(content, context = {}) {
  const items = []
  if (!content || typeof content !== 'string') return items

  const sectionId = context.sectionId || 'sec'
  const direction = context.direction || DocumentDirection.AUTO
  const heading = context.heading || ''

  // Locate table boundaries
  const tableRegex = /(?:^[ \t]*\|[^\n]+\|[ \t]*\n?)+/gm
  const matches = []
  let match
  while ((match = tableRegex.exec(content)) !== null) {
    matches.push({ index: match.index, length: match[0].length, text: match[0] })
  }

  if (matches.length === 0) {
    // Fallback: parse entire content as a grammar table or generic block
    const node = parseSingleTableBlock(content, `${sectionId}__tbl01`, direction, heading)
    items.push({
      node,
      startOffset: 0,
      endOffset: content.length,
      rawText: content,
    })
    return items
  }

  // Pre-table banner or text
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
    const tblIndex = String(i + 1).padStart(2, '0')
    const nodeId = `${sectionId}__tbl${tblIndex}`

    // Check trailing banner
    const bannerMatch = rawText.match(/\n[ \t]*(#[^\n]+)$/)
    if (bannerMatch && i === matches.length - 1) {
      const bannerIndexInBlock = bannerMatch.index + 1
      const tText = rawText.slice(0, bannerIndexInBlock)
      const bText = rawText.slice(bannerIndexInBlock)

      const parsed = parseSingleTableBlock(tText, nodeId, direction, heading)
      items.push({
        node: parsed,
        startOffset,
        endOffset: startOffset + bannerIndexInBlock,
        rawText: tText,
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

    const parsed = parseSingleTableBlock(rawText, nodeId, direction, heading)
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

function parseSingleTableBlock(rawText, nodeId, defaultDirection, heading = '') {
  const lines = rawText.trim().split('\n').filter(l => l.includes('|'))
  if (lines.length === 0) {
    return createGrammarTableNode({
      id: nodeId,
      direction: defaultDirection,
      tableSemantic: 'unknown_table',
      columns: ['Col 1', 'Col 2'],
      rows: [{ leftText: rawText.trim(), rightText: '', leftIsBlank: false, rightIsBlank: true }],
    })
  }

  // Parse header line
  const parseRowCells = (line) =>
    line
      .split('|')
      .slice(1, -1)
      .map(c => c.trim())

  let headerRow = parseRowCells(lines[0])
  let dataLines = lines.slice(1)

  // Skip delimiter row if present (e.g. |---|---|)
  if (dataLines.length > 0 && /^[ \t]*\|(?:\s*[:-]+[-| :]*)\|[ \t]*$/.test(dataLines[0])) {
    dataLines = dataLines.slice(1)
  }

  if (headerRow.length < 2) {
    headerRow = ['Col 1', 'Col 2']
  }

  // Determine whether this is a matching_columns table or grammar table
  const isMatching =
    /match|کالم\s*ملائیں|کالم\s*\(?الف\)?\s*کو\s*کالم\s*\(?ب\)?/i.test(heading) ||
    /Column\s+[AB]|کالم\s*\(?[الفب]\)?/i.test(headerRow.join(' '))

  if (isMatching) {
    const leftItems = []
    const rightItems = []

    dataLines.forEach((line, rIdx) => {
      const cells = parseRowCells(line)
      if (cells.length >= 2) {
        const itemNum = String(rIdx + 1).padStart(2, '0')
        leftItems.push({
          id: `${nodeId}__left${itemNum}`,
          text: cells[0],
        })
        rightItems.push({
          id: `${nodeId}__right${itemNum}`,
          text: cells[1],
        })
      }
    })

    // Fallback if empty data lines
    if (leftItems.length === 0) {
      leftItems.push({ id: `${nodeId}__left01`, text: '' })
      rightItems.push({ id: `${nodeId}__right01`, text: '' })
    }

    return createMatchingColumnsNode({
      id: nodeId,
      direction: defaultDirection,
      leftItems,
      rightItems,
      correctMappings: null, // Critical: never infer row-position answer mappings
    })
  }

  // Grammar table classification
  const combinedHeaders = headerRow.join(' ')
  let tableSemantic = 'unknown_table'

  if (/مذکر|مؤنث|masculine|feminine/i.test(combinedHeaders) || /مذکر|مؤنث|masculine|feminine/i.test(heading)) {
    tableSemantic = 'masculine_feminine'
  } else if (/واحد|جمع|singular|plural/i.test(combinedHeaders) || /واحد|جمع|singular|plural/i.test(heading)) {
    tableSemantic = 'singular_plural'
  } else if (/الفاظ.*معنی|words.*meanings?|alfaaz.*maani/i.test(combinedHeaders) || /الفاظ.*معنی|words.*meanings?/i.test(heading)) {
    tableSemantic = 'words_meanings'
  } else if (/متضاد|مترادف|opposites?|synonyms?/i.test(combinedHeaders) || /متضاد|مترادف|opposites?/i.test(heading)) {
    tableSemantic = 'words_opposites'
  }

  const rows = []
  dataLines.forEach(line => {
    const cells = parseRowCells(line)
    if (cells.length >= 2) {
      const leftText = cells[0]
      const rightText = cells[1]
      const leftIsBlank = /^[_\s-]+$/.test(leftText) || leftText === ''
      const rightIsBlank = /^[_\s-]+$/.test(rightText) || rightText === ''

      rows.push({
        leftText,
        rightText,
        leftIsBlank,
        rightIsBlank,
      })
    }
  })

  if (rows.length === 0) {
    rows.push({
      leftText: '',
      rightText: '',
      leftIsBlank: false,
      rightIsBlank: true,
    })
  }

  return createGrammarTableNode({
    id: nodeId,
    direction: defaultDirection,
    tableSemantic,
    columns: headerRow,
    rows,
  })
}
