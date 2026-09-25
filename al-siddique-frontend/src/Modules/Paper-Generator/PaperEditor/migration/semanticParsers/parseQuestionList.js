// parseQuestionList.js — Lossless semantic parser for question lists & subparts
import {
  createShortQuestionNode,
  createLongQuestionNode,
  createEssayNode,
  createApplicationNode,
  createLetterNode,
  createTranslationNode,
  createDefinitionNode,
  createScopeHeaderNode,
  createSectionBannerNode,
  createUnknownPreservedNode,
  DocumentDirection,
  ClassificationCertainty,
} from '../../core/PaperDocumentV2.js'

/**
 * Parses question list content into canonical question nodes with nested subparts.
 *
 * @param {string} content
 * @param {object} context
 * @returns {Array<{ node: object, startOffset: number, endOffset: number, rawText: string }>}
 */
export function parseQuestionList(content, context = {}) {
  const items = []
  if (!content || typeof content !== 'string') return items

  const sectionId = context.sectionId || 'sec'
  const direction = context.direction || DocumentDirection.AUTO
  const heading = context.heading || ''

  // Determine concrete question factory from heading context
  const factory = resolveQuestionFactory(heading)

  // Primary top-level question marker regex
  // Matches: 1., 1), (1), Q1., Q.1, ۱., ۱), ١., etc.
  // Conservative: requires start of line and whitespace after marker
  const topQuestionRegex = /^[ \t]*(?:(?:Q\.?\s*\d+|[0-9]+|[ivxIVX]+|[۱-۹]+|[١-٩]+)[\.\)\-:]|\([0-9]+\)|\([۱-۹]+\)|\([١-٩]+\))[ \t]+/gm
  const matches = []
  let match

  while ((match = topQuestionRegex.exec(content)) !== null) {
    matches.push({ index: match.index, text: match[0] })
  }

  // If no primary numbering matches found, split by double newlines or single newlines
  if (matches.length === 0) {
    // Check if content has lines with alphabetic markers e.g. a), b)
    const alphaRegex = /^[ \t]*\([a-zA-Z]\)[ \t]+|^[ \t]*[a-zA-Z][\.\)\-:][ \t]+/gm
    while ((match = alphaRegex.exec(content)) !== null) {
      matches.push({ index: match.index, text: match[0] })
    }
  }

  if (matches.length === 0) {
    // Check if section is a scope/banner or pure raw text
    const trimmed = content.trim()
    if (trimmed.startsWith('#')) {
      const bannerNode = trimmed.includes('Chapter') || trimmed.includes('باب')
        ? createScopeHeaderNode({ id: `${sectionId}__scope01`, headingText: trimmed, direction })
        : createSectionBannerNode({ id: `${sectionId}__banner01`, bannerText: trimmed, direction })
      items.push({
        node: bannerNode,
        startOffset: 0,
        endOffset: content.length,
        rawText: content,
      })
      return items
    }

    // Split non-empty lines if multiple exist
    const lines = content.split('\n')
    if (lines.filter(l => l.trim()).length > 1) {
      let cur = 0
      lines.forEach((line, lIdx) => {
        const len = line.length + (lIdx < lines.length - 1 ? 1 : 0)
        if (line.trim().length > 0) {
          const qIndex = String(items.length + 1).padStart(2, '0')
          const nodeId = `${sectionId}__q${qIndex}`
          const raw = content.slice(cur, cur + len)
          const node = factory({
            id: nodeId,
            direction,
            stemText: line.trim(),
            subparts: [],
            provenance: {
              classificationCertainty: ClassificationCertainty.HEURISTIC,
              academicTextMutated: false,
            },
          })
          items.push({
            node,
            startOffset: cur,
            endOffset: cur + len,
            rawText: raw,
          })
        }
        cur += len
      })
    }

    if (items.length === 0) {
      const rawText = content
      const node = factory({
        id: `${sectionId}__q01`,
        direction,
        stemText: content.trim(),
        subparts: [],
        provenance: {
          classificationCertainty: ClassificationCertainty.HEURISTIC,
          academicTextMutated: false,
        },
      })
      items.push({
        node,
        startOffset: 0,
        endOffset: content.length,
        rawText,
      })
    }
    return items
  }

  // Pre-question text (e.g. # Chapters... or banner)
  if (matches[0].index > 0) {
    const preText = content.slice(0, matches[0].index)
    if (preText.trim()) {
      const bannerNode = preText.includes('Chapter') || preText.includes('باب')
        ? createScopeHeaderNode({ id: `${sectionId}__scope00`, headingText: preText.trim(), direction })
        : createSectionBannerNode({ id: `${sectionId}__banner00`, bannerText: preText.trim(), direction })
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

    // Check trailing banner (e.g. # Subjective Part)
    const bannerMatch = rawText.match(/\n[ \t]*(#[^\n]+)$/)
    if (bannerMatch && i === matches.length - 1) {
      const bannerIndexInBlock = bannerMatch.index + 1
      const qText = rawText.slice(0, bannerIndexInBlock)
      const bText = rawText.slice(bannerIndexInBlock)

      const parsed = parseSingleQuestionBlock(qText, nodeId, direction, factory)
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

    const parsed = parseSingleQuestionBlock(rawText, nodeId, direction, factory)
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

/**
 * Resolves the appropriate concrete question factory based on heading vocabulary.
 */
function resolveQuestionFactory(heading) {
  if (/مضمون|essay/i.test(heading)) return createEssayNode
  if (/درخواست|application/i.test(heading)) return createApplicationNode
  if (/خط|letter/i.test(heading)) return createLetterNode
  if (/ترجمہ|translation/i.test(heading)) return createTranslationNode
  if (/تعریف|definition/i.test(heading)) return createDefinitionNode
  if (/تفصیلی|long\s*questions?/i.test(heading)) return createLongQuestionNode
  return createShortQuestionNode
}

/**
 * Parses a single question block, detecting nested subparts (e.g. a), b) or i), ii)).
 */
function parseSingleQuestionBlock(rawText, nodeId, defaultDirection, factory) {
  const lines = rawText.trim().split('\n')
  const stemLines = []
  const subparts = []

  // Subpart regex: a), b), c), or (i), (ii), etc.
  const subpartRegex = /^[ \t]*(?:\(([a-zA-Z]|[ivxIVX]+)\)|([a-zA-Z]|[ivxIVX]+)[\.\)\-:][ \t]+)(.+)$/

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx].trim()
    if (!line) continue

    if (lIdx > 0) {
      const spMatch = line.match(subpartRegex)
      if (spMatch) {
        const label = spMatch[1] || spMatch[2]
        const text = spMatch[3].trim()
        const pIndex = String(subparts.length + 1).padStart(2, '0')
        subparts.push({
          id: `${nodeId}__p${pIndex}`,
          label,
          stemText: text,
          direction: defaultDirection,
          rawSourceSnapshot: line,
          sourceSegmentIds: [],
        })
        continue
      }
    }

    if (subparts.length === 0) {
      stemLines.push(line)
    }
  }

  let stemText = stemLines.join(' ')
  stemText = stemText.replace(/^[ \t]*(?:Q\.?\s*\d+|[0-9]+|[ivxIVX]+|[۱-۹]+|[١-٩]+)[\.\)\-:][ \t]*/, '').trim()

  return factory({
    id: nodeId,
    direction: defaultDirection,
    stemText: stemText || rawText.trim(),
    subparts,
  })
}
