import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import { TableKit } from '@tiptap/extension-table'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, ArrowRight, Bold, Columns3,
  Highlighter, Italic, List, ListOrdered, Minus, Plus, Redo2, RemoveFormatting,
  Rows3, Strikethrough, Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Table2, Underline as UnderlineIcon, Undo2,
} from 'lucide-react'
import './PaperRichTextEditor.css'

const FONTS = [
  ['Arial', 'Arial, sans-serif'],
  ['Times New Roman', 'Times New Roman, serif'],
  ['Georgia', 'Georgia, serif'],
  ['Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq, serif'],
  ['Noto Nastaliq Urdu', 'Noto Nastaliq Urdu, serif'],
]
const SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36]
const COLORS = ['#111827', '#374151', '#b91c1c', '#b45309', '#15803d', '#1d4ed8', '#7e22ce']
const HIGHLIGHTS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff']
const BLOCKS = new Set(['doc', 'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock', 'horizontalRule', 'table', 'tableRow', 'tableCell', 'tableHeader'])
const LEAVES = new Set(['text', 'hardBreak', 'horizontalRule'])
const MARKS = new Set(['bold', 'italic', 'underline', 'strike', 'superscript', 'subscript', 'code', 'textStyle', 'highlight'])

const safeDirection = value => value === 'rtl' || value === 'ltr' ? value : null
const safeAlign = value => ['left', 'center', 'right', 'justify'].includes(value) ? value : null
const safeFont = value => FONTS.some(([, font]) => font === value) ? value : null
const safeSize = value => SIZES.some(size => `${size}pt` === value) ? value : null
const safeColor = value => COLORS.includes(value) ? value : null
const safeHighlight = value => HIGHLIGHTS.includes(value) ? value : null

function cleanMark(mark) {
  if (!mark || !MARKS.has(mark.type)) return null
  if (mark.type === 'textStyle') {
    const attrs = {
      fontFamily: safeFont(mark.attrs?.fontFamily),
      fontSize: safeSize(mark.attrs?.fontSize),
      color: safeColor(mark.attrs?.color),
    }
    return Object.values(attrs).some(Boolean) ? { type: 'textStyle', attrs } : null
  }
  if (mark.type === 'highlight') {
    const color = safeHighlight(mark.attrs?.color)
    return color ? { type: 'highlight', attrs: { color } } : null
  }
  return { type: mark.type }
}

function cleanNode(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 32) return null
  if (node.type === 'text') {
    if (typeof node.text !== 'string') return null
    const marks = Array.isArray(node.marks) ? node.marks.map(cleanMark).filter(Boolean) : []
    return { type: 'text', text: node.text, ...(marks.length ? { marks } : {}) }
  }
  if (node.type === 'hardBreak') return { type: 'hardBreak' }
  if (!BLOCKS.has(node.type)) return null
  if (node.type === 'horizontalRule') return { type: 'horizontalRule' }

  const attrs = {}
  if (node.type === 'paragraph' || node.type === 'heading') {
    const dir = safeDirection(node.attrs?.dir)
    const textAlign = safeAlign(node.attrs?.textAlign)
    if (dir) attrs.dir = dir
    if (textAlign) attrs.textAlign = textAlign
    if (node.type === 'heading') attrs.level = [1, 2, 3].includes(node.attrs?.level) ? node.attrs.level : 2
  }
  if (node.type === 'tableCell' || node.type === 'tableHeader') {
    const span = key => Number.isInteger(node.attrs?.[key]) ? Math.max(1, Math.min(20, node.attrs[key])) : 1
    attrs.colspan = span('colspan')
    attrs.rowspan = span('rowspan')
  }
  const children = Array.isArray(node.content) ? node.content.map(child => cleanNode(child, depth + 1)).filter(Boolean) : []
  return { type: node.type, ...(Object.keys(attrs).length ? { attrs } : {}), ...(children.length ? { content: children } : {}) }
}

export function sanitizePaperRichText(value) {
  if (!value || value.type !== 'doc' || !Array.isArray(value.content)) return null
  const doc = cleanNode(value)
  return doc?.content?.length ? doc : { type: 'doc', content: [{ type: 'paragraph' }] }
}

function initialDocument(value, fallbackText) {
  const cleaned = sanitizePaperRichText(value)
  if (cleaned) return cleaned
  const lines = String(fallbackText ?? '').split(/\r?\n/)
  return {
    type: 'doc',
    content: lines.map(line => ({ type: 'paragraph', ...(line ? { content: [{ type: 'text', text: line }] } : {}) })),
  }
}

const StyledText = TextStyle.extend({
  addAttributes() {
    return {
      ...(this.parent?.() || {}),
      fontFamily: {
        default: null,
        parseHTML: element => safeFont(element.style.fontFamily),
        renderHTML: attrs => safeFont(attrs.fontFamily) ? { style: `font-family: ${attrs.fontFamily}` } : {},
      },
      fontSize: {
        default: null,
        parseHTML: element => safeSize(element.style.fontSize),
        renderHTML: attrs => safeSize(attrs.fontSize) ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
      color: {
        default: null,
        parseHTML: element => safeColor(element.style.color),
        renderHTML: attrs => safeColor(attrs.color) ? { style: `color: ${attrs.color}` } : {},
      },
    }
  },
})

const AlignedText = TextAlign.extend({
  addGlobalAttributes() {
    return [
      ...(this.parent?.() || []),
      {
        types: ['paragraph', 'heading'],
        attributes: {
          dir: {
            default: null,
            parseHTML: element => safeDirection(element.getAttribute('dir')),
            renderHTML: attrs => safeDirection(attrs.dir) ? { dir: attrs.dir } : {},
          },
        },
      },
    ]
  },
})

const EXTENSIONS = [
  StarterKit.configure({ underline: false, link: false, heading: { levels: [1, 2, 3] } }),
  Underline,
  StyledText,
  AlignedText.configure({ types: ['paragraph', 'heading'], alignments: ['left', 'center', 'right', 'justify'] }),
  Highlight.configure({ multicolor: true }),
  Superscript,
  Subscript,
  TableKit.configure({ table: { resizable: false } }),
]

function renderNode(node, key) {
  if (node.type === 'text') {
    let content = node.text
    for (const [index, mark] of (node.marks || []).entries()) {
      const markKey = `${key}-mark-${index}`
      if (mark.type === 'textStyle') content = <span key={markKey} style={{ fontFamily: safeFont(mark.attrs?.fontFamily) || undefined, fontSize: safeSize(mark.attrs?.fontSize) || undefined, color: safeColor(mark.attrs?.color) || undefined }}>{content}</span>
      else if (mark.type === 'highlight') content = <mark key={markKey} style={{ backgroundColor: safeHighlight(mark.attrs?.color) || undefined }}>{content}</mark>
      else if (mark.type === 'bold') content = <strong key={markKey}>{content}</strong>
      else if (mark.type === 'italic') content = <em key={markKey}>{content}</em>
      else if (mark.type === 'underline') content = <u key={markKey}>{content}</u>
      else if (mark.type === 'strike') content = <s key={markKey}>{content}</s>
      else if (mark.type === 'superscript') content = <sup key={markKey}>{content}</sup>
      else if (mark.type === 'subscript') content = <sub key={markKey}>{content}</sub>
      else if (mark.type === 'code') content = <code key={markKey}>{content}</code>
    }
    return content
  }
  if (node.type === 'hardBreak') return <br key={key} />
  if (node.type === 'horizontalRule') return <hr key={key} />
  const children = node.content?.map((child, index) => renderNode(child, `${key}-${index}`))
  const attrs = node.attrs || {}
  const props = { key, dir: safeDirection(attrs.dir) || undefined, style: { textAlign: safeAlign(attrs.textAlign) || undefined } }
  switch (node.type) {
    case 'doc': return <>{children}</>
    case 'paragraph': return <p {...props}>{children}</p>
    case 'heading': {
      const Tag = `h${[1, 2, 3].includes(attrs.level) ? attrs.level : 2}`
      return <Tag {...props}>{children}</Tag>
    }
    case 'bulletList': return <ul key={key}>{children}</ul>
    case 'orderedList': return <ol key={key}>{children}</ol>
    case 'listItem': return <li key={key}>{children}</li>
    case 'blockquote': return <blockquote key={key}>{children}</blockquote>
    case 'codeBlock': return <pre key={key}><code>{children}</code></pre>
    case 'table': return <table key={key}><tbody>{children}</tbody></table>
    case 'tableRow': return <tr key={key}>{children}</tr>
    case 'tableCell': return <td key={key} colSpan={attrs.colspan} rowSpan={attrs.rowspan}>{children}</td>
    case 'tableHeader': return <th key={key} colSpan={attrs.colspan} rowSpan={attrs.rowspan}>{children}</th>
    default: return null
  }
}

export function PaperRichTextRenderer({ value, fallbackText = '', direction = 'ltr', className = '' }) {
  const doc = initialDocument(value, fallbackText)
  return <div className={`paper-rich-text-renderer ${className}`} dir={safeDirection(direction) || 'ltr'}>{renderNode(doc, 'root')}</div>
}

function ToolButton({ label, icon: Icon, onClick, disabled, active }) {
  return <button type="button" className={`paper-rte-tool${active ? ' is-active' : ''}`} title={label} aria-label={label} aria-pressed={active === undefined ? undefined : active} onMouseDown={event => event.preventDefault()} onClick={onClick} disabled={disabled}><Icon size={16} aria-hidden="true" /></button>
}

export default function PaperRichTextEditor({ value = null, onChange, fallbackText = '', direction = 'ltr', ariaLabel = 'Paper content' }) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [revision, setRevision] = useState(0)
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: initialDocument(value, fallbackText),
    immediatelyRender: false,
    editorProps: {
      attributes: { 'aria-label': ariaLabel, class: 'paper-rte-content', dir: safeDirection(direction) || 'ltr' },
    },
    onUpdate: ({ editor: current }) => onChangeRef.current?.(sanitizePaperRichText(current.getJSON())),
    onSelectionUpdate: () => setRevision(count => count + 1),
    onTransaction: () => setRevision(count => count + 1),
  })

  useEffect(() => {
    if (!editor) return
    const next = initialDocument(value, fallbackText)
    if (JSON.stringify(sanitizePaperRichText(editor.getJSON())) !== JSON.stringify(next)) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [editor, value, fallbackText])

  useEffect(() => {
    editor?.setOptions({ editorProps: { attributes: { 'aria-label': ariaLabel, class: 'paper-rte-content', dir: safeDirection(direction) || 'ltr' } } })
  }, [editor, direction, ariaLabel])

  if (!editor) return <div className="paper-rte" aria-label={ariaLabel} />
  void revision
  const selected = !editor.state.selection.empty
  const inTable = editor.isActive('table')
  const runSelected = command => { if (selected) command(editor.chain().focus()).run() }
  const mark = name => runSelected(chain => chain.toggleMark(name))
  const setStyle = (name, choice) => {
    if (!selected) return
    const attrs = { ...editor.getAttributes('textStyle'), [name]: choice || null }
    const chain = editor.chain().focus()
    if (Object.values(attrs).some(Boolean)) chain.setMark('textStyle', attrs).run()
    else chain.unsetMark('textStyle').run()
  }
  const setDirection = dir => {
    if (!selected) return
    editor.chain().focus().updateAttributes('paragraph', { dir }).updateAttributes('heading', { dir }).run()
  }
  const selectProps = label => ({ 'aria-label': label, title: label, disabled: !selected, className: 'paper-rte-select' })
  const style = editor.getAttributes('textStyle')

  return <div className="paper-rte" dir="ltr">
    <div className="paper-rte-toolbar" role="toolbar" aria-label="Paper text formatting">
      <div className="paper-rte-group" role="group" aria-label="Character formatting">
        <ToolButton label="Bold selected text" icon={Bold} onClick={() => mark('bold')} disabled={!selected} active={editor.isActive('bold')} />
        <ToolButton label="Italic selected text" icon={Italic} onClick={() => mark('italic')} disabled={!selected} active={editor.isActive('italic')} />
        <ToolButton label="Underline selected text" icon={UnderlineIcon} onClick={() => mark('underline')} disabled={!selected} active={editor.isActive('underline')} />
        <ToolButton label="Strike through selected text" icon={Strikethrough} onClick={() => mark('strike')} disabled={!selected} active={editor.isActive('strike')} />
        <ToolButton label="Superscript selected text" icon={SuperscriptIcon} onClick={() => mark('superscript')} disabled={!selected} active={editor.isActive('superscript')} />
        <ToolButton label="Subscript selected text" icon={SubscriptIcon} onClick={() => mark('subscript')} disabled={!selected} active={editor.isActive('subscript')} />
        <ToolButton label="Clear formatting from selected text" icon={RemoveFormatting} onClick={() => runSelected(chain => chain.unsetAllMarks())} disabled={!selected} />
      </div>
      <div className="paper-rte-group" role="group" aria-label="Font formatting">
        <select {...selectProps('Font family for selected text')} value={safeFont(style.fontFamily) || ''} onChange={event => setStyle('fontFamily', event.target.value)}>
          <option value="">Default font</option>{FONTS.map(([label, font]) => <option key={font} value={font}>{label}</option>)}
        </select>
        <select {...selectProps('Font size for selected text')} value={safeSize(style.fontSize) || ''} onChange={event => setStyle('fontSize', event.target.value)}>
          <option value="">Size</option>{SIZES.map(size => <option key={size} value={`${size}pt`}>{size} pt</option>)}
        </select>
        <label className="paper-rte-palette" title="Text color for selected text"><span className="paper-rte-palette-icon">A</span><select {...selectProps('Text color for selected text')} value={safeColor(style.color) || ''} onChange={event => setStyle('color', event.target.value)}><option value="">Default color</option>{COLORS.map(color => <option key={color} value={color}>{color}</option>)}</select><i style={{ background: safeColor(style.color) || COLORS[0] }} /></label>
        <label className="paper-rte-palette" title="Highlight selected text"><Highlighter size={16} aria-hidden="true" /><select {...selectProps('Highlight selected text')} value={safeHighlight(editor.getAttributes('highlight').color) || ''} onChange={event => runSelected(chain => event.target.value ? chain.setHighlight({ color: event.target.value }) : chain.unsetHighlight())}><option value="">No highlight</option>{HIGHLIGHTS.map(color => <option key={color} value={color}>{color}</option>)}</select><i style={{ background: safeHighlight(editor.getAttributes('highlight').color) || HIGHLIGHTS[0] }} /></label>
      </div>
      <div className="paper-rte-group" role="group" aria-label="Paragraph formatting">
        <ToolButton label="Align selected paragraph left" icon={AlignLeft} onClick={() => runSelected(chain => chain.setTextAlign('left'))} disabled={!selected} active={editor.isActive({ textAlign: 'left' })} />
        <ToolButton label="Center selected paragraph" icon={AlignCenter} onClick={() => runSelected(chain => chain.setTextAlign('center'))} disabled={!selected} active={editor.isActive({ textAlign: 'center' })} />
        <ToolButton label="Align selected paragraph right" icon={AlignRight} onClick={() => runSelected(chain => chain.setTextAlign('right'))} disabled={!selected} active={editor.isActive({ textAlign: 'right' })} />
        <ToolButton label="Left-to-right selected paragraph" icon={ArrowRight} onClick={() => setDirection('ltr')} disabled={!selected} active={editor.isActive({ dir: 'ltr' })} />
        <ToolButton label="Right-to-left selected paragraph" icon={ArrowLeft} onClick={() => setDirection('rtl')} disabled={!selected} active={editor.isActive({ dir: 'rtl' })} />
        <ToolButton label="Toggle bullet list for selected paragraphs" icon={List} onClick={() => runSelected(chain => chain.toggleBulletList())} disabled={!selected} active={editor.isActive('bulletList')} />
        <ToolButton label="Toggle numbered list for selected paragraphs" icon={ListOrdered} onClick={() => runSelected(chain => chain.toggleOrderedList())} disabled={!selected} active={editor.isActive('orderedList')} />
      </div>
      <div className="paper-rte-group" role="group" aria-label="Table editing">
        <ToolButton label="Insert 3 by 3 table" icon={Table2} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <ToolButton label="Add table row below" icon={Rows3} onClick={() => editor.chain().focus().addRowAfter().run()} disabled={!inTable} />
        <ToolButton label="Add table column after" icon={Columns3} onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!inTable} />
        <ToolButton label="Delete current table row" icon={Minus} onClick={() => editor.chain().focus().deleteRow().run()} disabled={!inTable} />
        <ToolButton label="Delete current table column" icon={Plus} onClick={() => editor.chain().focus().deleteColumn().run()} disabled={!inTable} />
      </div>
      <div className="paper-rte-group" role="group" aria-label="History">
        <ToolButton label="Undo" icon={Undo2} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
        <ToolButton label="Redo" icon={Redo2} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
      </div>
    </div>
    <EditorContent editor={editor} className="paper-rte-surface" />
  </div>
}
