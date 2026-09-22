// PaperEditorExtensions.js — Tiptap / ProseMirror extensions for selection-aware formatting
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import { TableKit } from '@tiptap/extension-table'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'

export const SUPPORTED_FONTS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Cambria', value: 'Cambria, serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Jameel Noori Nastaleeq', value: "'Jameel Noori Nastaleeq', serif" },
  { label: 'Noto Nastaliq Urdu', value: "'Noto Nastaliq Urdu', serif" },
]

export const SUPPORTED_SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36]

export const SUPPORTED_COLORS = [
  '#111827', // Charcoal / Black
  '#374151', // Gray
  '#123b67', // Academic Navy
  '#075985', // Modern Blue
  '#06695b', // Emerald Green
  '#9a6a00', // Gold
  '#b91c1c', // Crimson Red
  '#7e22ce', // Violet
]

export const SUPPORTED_HIGHLIGHTS = [
  '#fef08a', // Yellow
  '#bbf7d0', // Green
  '#bfdbfe', // Blue
  '#fecaca', // Red
  '#e9d5ff', // Purple
]

export const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...(this.parent?.() || {}),
      fontFamily: {
        default: null,
        parseHTML: element => element.style.fontFamily || null,
        renderHTML: attrs => attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
      },
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
      color: {
        default: null,
        parseHTML: element => element.style.color || null,
        renderHTML: attrs => attrs.color ? { style: `color: ${attrs.color}` } : {},
      },
      lineHeight: {
        default: null,
        parseHTML: element => element.style.lineHeight || null,
        renderHTML: attrs => attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
      },
    }
  },
})

export const CustomTextAlign = TextAlign.extend({
  addGlobalAttributes() {
    return [
      ...(this.parent?.() || []),
      {
        types: ['paragraph', 'heading'],
        attributes: {
          dir: {
            default: null,
            parseHTML: element => element.getAttribute('dir') || null,
            renderHTML: attrs => attrs.dir ? { dir: attrs.dir } : {},
          },
        },
      },
    ]
  },
})

export function getPaperEditorExtensions() {
  return [
    StarterKit.configure({
      underline: false,
      link: false,
      heading: { levels: [1, 2, 3, 4] },
    }),
    Underline,
    CustomTextStyle,
    CustomTextAlign.configure({
      types: ['paragraph', 'heading'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    Highlight.configure({ multicolor: true }),
    Superscript,
    Subscript,
    TableKit.configure({
      table: { resizable: true },
    }),
  ]
}

export function createTiptapDocFromText(text = '') {
  const lines = String(text || '').split(/\r?\n/)
  return {
    type: 'doc',
    content: lines.map(line => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  }
}
