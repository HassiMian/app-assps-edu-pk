// parseVerticalMath.js — Lossless semantic parser for vertical arithmetic
import {
  createVerticalMathNode,
  createRichTextNode,
  DocumentDirection,
} from '../../core/PaperDocumentV2.js'

/**
 * Parses vertical math layout into canonical vertical_math nodes or rich fallback.
 *
 * @param {string} content
 * @param {object} context
 * @returns {Array<{ node: object, startOffset: number, endOffset: number, rawText: string }>}
 */
export function parseVerticalMath(content, context = {}) {
  const items = []
  if (!content || typeof content !== 'string') return items

  const sectionId = context.sectionId || 'sec'
  const direction = context.direction || DocumentDirection.LTR

  // Attempt to parse structured vertical math blocks (3-line groups: op1 / op2 with operator / underline)
  const lines = content.split('\n')
  const blocks = []

  // Check if content matches vertical math grid
  const hasGridLines = lines.some(l => /[-+×÷]/.test(l)) && lines.some(l => /_{3,}/.test(l))

  if (!hasGridLines) {
    // Lossless rich fallback
    items.push({
      node: createRichTextNode({
        id: `${sectionId}__vm01`,
        direction,
        content,
        layoutSemantic: 'vertical-math-grid',
      }),
      startOffset: 0,
      endOffset: content.length,
      rawText: content,
    })
    return items
  }

  // Parse vertical sums from columns
  // Example pattern in Countdown Math:
  // line 0: " 13              23              34"
  // line 1: "    -  4            +  6            +  5"
  // line 2: "    ______          ______          ______"
  let currentGroup = []
  let groupStart = 0
  let currentPos = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineLen = line.length + (i < lines.length - 1 ? 1 : 0)

    if (line.trim().length > 0) {
      if (currentGroup.length === 0) {
        groupStart = currentPos
      }
      currentGroup.push(line)
    } else {
      if (currentGroup.length >= 2) {
        blocks.push({
          lines: [...currentGroup],
          startOffset: groupStart,
          endOffset: currentPos,
          rawText: content.slice(groupStart, currentPos),
        })
        currentGroup = []
      }
    }
    currentPos += lineLen
  }

  if (currentGroup.length >= 2) {
    blocks.push({
      lines: [...currentGroup],
      startOffset: groupStart,
      endOffset: content.length,
      rawText: content.slice(groupStart, content.length),
    })
  }

  if (blocks.length === 0) {
    // Fallback
    items.push({
      node: createRichTextNode({
        id: `${sectionId}__vm01`,
        direction,
        content,
        layoutSemantic: 'vertical-math-grid',
      }),
      startOffset: 0,
      endOffset: content.length,
      rawText: content,
    })
    return items
  }

  // Each multi-column block contains vertical sums
  // For lossless representation with full spatial fidelity, emit each group as a vertical math grid node
  blocks.forEach((block, bIdx) => {
    const blockIndex = String(bIdx + 1).padStart(2, '0')
    const nodeId = `${sectionId}__vm${blockIndex}`

    // Extract operands and operator for canonical vertical_math contract
    const op1Line = block.lines[0] || ''
    const op2Line = block.lines[1] || ''

    // Look for numbers and operator in the block
    const numbers = block.rawText.match(/\b\d+\b/g) || ['0', '0']
    const operatorMatch = block.rawText.match(/[-+×÷]/)
    const operator = operatorMatch ? operatorMatch[0] : '+'

    const operands = [
      {
        raw: numbers[0] || '0',
        normalizedNumericValue: Number.isFinite(Number(numbers[0])) ? Number(numbers[0]) : null,
      },
      {
        raw: numbers[1] || '0',
        normalizedNumericValue: Number.isFinite(Number(numbers[1])) ? Number(numbers[1]) : null,
      },
    ]

    const node = createVerticalMathNode({
      id: nodeId,
      direction,
      operands,
      operator,
      result: null,
      layoutSemantic: 'vertical-math-grid',
    })

    items.push({
      node,
      startOffset: block.startOffset,
      endOffset: block.endOffset,
      rawText: block.rawText,
    })
  })

  // Ensure full coverage from offset 0 to content.length
  if (items.length > 0) {
    if (items[0].startOffset > 0) {
      items[0].rawText = content.slice(0, items[0].endOffset)
      items[0].startOffset = 0
    }
    const lastItem = items[items.length - 1]
    if (lastItem.endOffset < content.length) {
      lastItem.rawText = content.slice(lastItem.startOffset, content.length)
      lastItem.endOffset = content.length
    }
  }

  return items
}
