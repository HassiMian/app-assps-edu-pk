// CanonicalStaticText.jsx — Zero-Overhead Static Renderer with Strict Geometry Parity (Rules 32, 33)
import React from 'react'
import { sanitizePaperRichText } from './editorProjection.js'

function renderTextWithMarks(node, keyPrefix) {
  let content = node.text
  const marks = node.marks || []

  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]
    const markKey = `${keyPrefix}-m${i}`

    switch (mark.type) {
      case 'bold':
        content = <strong key={markKey}>{content}</strong>
        break
      case 'italic':
        content = <em key={markKey}>{content}</em>
        break
      case 'underline':
        content = <u key={markKey}>{content}</u>
        break
      case 'strike':
        content = <s key={markKey}>{content}</s>
        break
      case 'superscript':
        content = <sup key={markKey}>{content}</sup>
        break
      case 'subscript':
        content = <sub key={markKey}>{content}</sub>
        break
      case 'textStyle': {
        const style = {}
        if (mark.attrs?.fontFamily) style.fontFamily = mark.attrs.fontFamily
        if (mark.attrs?.fontSize) style.fontSize = mark.attrs.fontSize
        if (mark.attrs?.color) style.color = mark.attrs.color
        content = <span key={markKey} style={style}>{content}</span>
        break
      }
      case 'highlight': {
        const style = mark.attrs?.color ? { backgroundColor: mark.attrs.color } : undefined
        content = <mark key={markKey} style={style}>{content}</mark>
        break
      }
      default:
        break
    }
  }

  return content
}

function renderBlock(block, index) {
  const key = `block-${index}`
  const attrs = block.attrs || {}
  const dir = attrs.dir || undefined
  const style = attrs.textAlign ? { textAlign: attrs.textAlign } : undefined

  const children = Array.isArray(block.content) && block.content.length > 0
    ? block.content.map((child, cIdx) => {
        if (child.type === 'text') {
          return renderTextWithMarks(child, `${key}-c${cIdx}`)
        }
        return null
      })
    : null

  if (block.type === 'heading') {
    const Tag = `h${[1, 2, 3, 4].includes(attrs.level) ? attrs.level : 2}`
    return <Tag key={key} dir={dir} style={style}>{children || '\u00A0'}</Tag>
  }

  // Default to paragraph
  return <p key={key} dir={dir} style={style}>{children || '\u00A0'}</p>
}

export default function CanonicalStaticText({ value, fallbackText = '', direction = 'auto' }) {
  const sanitizedDoc = sanitizePaperRichText(value)
  const dir = direction === 'rtl' ? 'rtl' : (direction === 'ltr' ? 'ltr' : undefined)

  if (!sanitizedDoc || !Array.isArray(sanitizedDoc.content) || sanitizedDoc.content.length === 0) {
    return <span className="canonical-static-text" dir={dir}>{fallbackText}</span>
  }

  return (
    <div className="canonical-static-text" dir={dir}>
      {sanitizedDoc.content.map((block, idx) => renderBlock(block, idx))}
    </div>
  )
}
