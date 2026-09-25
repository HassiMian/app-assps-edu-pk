// CanonicalEditorExtensions.js — Safe Tiptap / ProseMirror extensions for Canonical Paper Editor V2 (Rule 15)
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'

import {
  SUPPORTED_FONTS,
  SUPPORTED_SIZES,
  SUPPORTED_COLORS,
  SUPPORTED_HIGHLIGHTS,
} from './editorProjection.js'

export {
  SUPPORTED_FONTS,
  SUPPORTED_SIZES,
  SUPPORTED_COLORS,
  SUPPORTED_HIGHLIGHTS,
}

export const CanonicalTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...(this.parent?.() || {}),
      fontFamily: {
        default: null,
        parseHTML: element => element.style.fontFamily || null,
        renderHTML: attrs => (attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {}),
      },
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attrs => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
      },
      color: {
        default: null,
        parseHTML: element => element.style.color || null,
        renderHTML: attrs => (attrs.color ? { style: `color: ${attrs.color}` } : {}),
      },
    }
  },
})

export const CanonicalTextAlign = TextAlign.extend({
  addGlobalAttributes() {
    return [
      ...(this.parent?.() || []),
      {
        types: ['paragraph', 'heading'],
        attributes: {
          dir: {
            default: null,
            parseHTML: element => element.getAttribute('dir') || null,
            renderHTML: attrs => (attrs.dir ? { dir: attrs.dir } : {}),
          },
        },
      },
    ]
  },
})

/**
 * Returns the exact list of safe extensions for in-place text editing in B3.
 * TableKit is deliberately omitted to prevent academic structure corruption.
 */
export function getCanonicalEditorExtensions() {
  return [
    StarterKit.configure({
      history: true,
      underline: false,
      link: false,
      heading: { levels: [1, 2, 3, 4] },
    }),
    Underline,
    CanonicalTextStyle,
    CanonicalTextAlign.configure({
      types: ['paragraph', 'heading'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    Highlight.configure({ multicolor: true }),
    Superscript,
    Subscript,
  ]
}
