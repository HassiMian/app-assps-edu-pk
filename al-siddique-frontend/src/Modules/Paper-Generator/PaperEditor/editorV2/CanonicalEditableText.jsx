// CanonicalEditableText.jsx — Focus-Stable In-Place Tiptap Field Editor (Rules 1, 27, 28, 29, 30)
import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { getCanonicalEditorExtensions, SUPPORTED_FONTS, SUPPORTED_SIZES } from './CanonicalEditorExtensions.js'
import CanonicalStaticText from './CanonicalStaticText.jsx'

function CanonicalEditableText({
  fieldKey,
  fieldOverlay,
  direction = 'auto',
  store,
  registry,
  onFocusField,
  isEditing = true,
  externalRevisionToken = 1,
}) {
  // Test-only diagnostics tracking (zero production overhead, Rule 27)
  if (typeof window !== 'undefined' && window.__B3_DIAGNOSTICS__) {
    const d = window.__B3_DIAGNOSTICS__
    d.fieldRenderCounts = d.fieldRenderCounts || {}
    d.fieldRenderCounts[fieldKey] = (d.fieldRenderCounts[fieldKey] || 0) + 1
  }

  const dir = direction === 'rtl' ? 'rtl' : (direction === 'ltr' ? 'ltr' : 'auto')

  // If in static view mode, render zero-overhead static renderer
  if (!isEditing) {
    return (
      <span className="canonical-stem-box canonical-editable-field" data-field-key={fieldKey} dir={dir}>
        <CanonicalStaticText
          value={fieldOverlay?.workingRich}
          fallbackText={fieldOverlay?.workingPlainText}
          direction={dir}
        />
        {fieldOverlay?.lockedMarksEvidence && (
          <span className="canonical-locked-marks-badge" title="Authoritative marks evidence (read-only)">
            {fieldOverlay.lockedMarksEvidence}
          </span>
        )}
      </span>
    )
  }

  return (
    <ActiveInPlaceEditor
      fieldKey={fieldKey}
      fieldOverlay={fieldOverlay}
      direction={dir}
      store={store}
      registry={registry}
      onFocusField={onFocusField}
      externalRevisionToken={externalRevisionToken}
    />
  )
}

function ActiveInPlaceEditor({
  fieldKey,
  fieldOverlay,
  direction,
  store,
  registry,
  onFocusField,
  externalRevisionToken,
}) {
  const lastExternalRevRef = useRef(externalRevisionToken)
  const isLocalUpdateRef = useRef(false)

  const editor = useEditor({
    extensions: getCanonicalEditorExtensions(),
    content: fieldOverlay?.workingRich || { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'canonical-editable-stem-content',
        dir: direction !== 'auto' ? direction : undefined,
        'data-field-key': fieldKey,
      },
    },
    onFocus: ({ editor: ed }) => {
      registry?.setActiveFieldKey(fieldKey)
      if (ed?.state?.selection) {
        registry?.saveSelection?.(fieldKey, ed.state.selection)
      }
      onFocusField?.(fieldKey)
    },
    onSelectionUpdate: ({ editor: ed }) => {
      registry?.setActiveFieldKey(fieldKey)
      if (ed?.state?.selection) {
        registry?.saveSelection?.(fieldKey, ed.state.selection)
      }
    },
    onUpdate: ({ editor: updatedEd }) => {
      isLocalUpdateRef.current = true
      // Local typing updates compact working store silently (Rule 1, 28)
      // publishDocument: false prevents root and neighbor React rerenders!
      store?.updateField(fieldKey, updatedEd.getJSON(), updatedEd.getText(), { publishDocument: false })
      setTimeout(() => {
        isLocalUpdateRef.current = false
      }, 0)
    },
  })

  // Diagnostics: track Tiptap editor creation count (Rule 3, 27)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__B3_DIAGNOSTICS__) {
      const d = window.__B3_DIAGNOSTICS__
      d.editorCreationCounts = d.editorCreationCounts || {}
      d.editorCreationCounts[fieldKey] = (d.editorCreationCounts[fieldKey] || 0) + 1
    }
  }, [fieldKey])

  // Register in field registry on mount, unregister on unmount (Rule 13)
  useEffect(() => {
    if (!editor || !registry) return
    registry.register(fieldKey, {
      fieldKey,
      editor,
      onExternalSync: (newContent) => {
        if (typeof window !== 'undefined' && window.__B3_DIAGNOSTICS__) {
          const d = window.__B3_DIAGNOSTICS__
          d.localSetContentCounts = d.localSetContentCounts || {}
          d.localSetContentCounts[fieldKey] = (d.localSetContentCounts[fieldKey] || 0) + 1
        }
        editor.commands.setContent(newContent, { emitUpdate: false })
      },
    })
    return () => {
      registry.unregister(fieldKey)
    }
  }, [editor, fieldKey, registry])

  // External synchronization: ONLY runs when externalRevisionToken increments
  // (e.g. on external draft reload or explicit reset), NEVER on local typing! (Rule 29)
  useEffect(() => {
    if (!editor) return
    if (externalRevisionToken !== lastExternalRevRef.current) {
      lastExternalRevRef.current = externalRevisionToken
      if (!isLocalUpdateRef.current && fieldOverlay?.workingRich) {
        editor.commands.setContent(fieldOverlay.workingRich, { emitUpdate: false })
      }
    }
  }, [externalRevisionToken, fieldOverlay?.workingRich, editor])

  const applyTextStyle = (attr, value) => {
    if (!editor) return
    const currentAttrs = editor.getAttributes('textStyle') || {}
    const nextAttrs = { ...currentAttrs, [attr]: value || null }
    const chain = editor.chain().focus()
    if (Object.values(nextAttrs).some(Boolean)) chain.setMark('textStyle', nextAttrs).run()
    else chain.unsetMark('textStyle').run()
  }

  return (
    <span
      className="canonical-stem-box canonical-editable-field"
      data-field-key={fieldKey}
      dir={direction}
      onClick={() => {
        if (editor && !editor.isFocused) {
          editor.commands.focus()
        }
      }}
    >
      {editor && (
        <BubbleMenu
          editor={editor}
          pluginKey={`canonical-selection-bubble-${fieldKey}`}
          updateDelay={80}
          shouldShow={({ from, to }) => from !== to && editor.isEditable}
          options={{ placement: 'top', offset: 8, shift: true, flip: true }}
          className="canonical-selection-bubble"
          data-selection-bubble
        >
          <button type="button" title="Bold selected text" onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>B</button>
          <button type="button" title="Italic selected text" onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}><em>I</em></button>
          <button type="button" title="Underline selected text" onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'is-active' : ''}><u>U</u></button>
          <select
            aria-label="Selection Font Family"
            title="Font for selected text"
            value={editor.getAttributes('textStyle')?.fontFamily || ''}
            onChange={e => applyTextStyle('fontFamily', e.target.value)}
          >
            <option value="">Font</option>
            {SUPPORTED_FONTS.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}
          </select>
          <select
            aria-label="Selection Font Size"
            title="Size for selected text"
            value={String(editor.getAttributes('textStyle')?.fontSize || '').replace(/[^0-9]/g, '')}
            onChange={e => applyTextStyle('fontSize', e.target.value ? `${e.target.value}pt` : null)}
          >
            <option value="">Size</option>
            {SUPPORTED_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
      {fieldOverlay?.lockedMarksEvidence && (
        <span className="canonical-locked-marks-badge" title="Authoritative marks evidence (read-only)">
          {fieldOverlay.lockedMarksEvidence}
        </span>
      )}
    </span>
  )
}

export default React.memo(CanonicalEditableText)
