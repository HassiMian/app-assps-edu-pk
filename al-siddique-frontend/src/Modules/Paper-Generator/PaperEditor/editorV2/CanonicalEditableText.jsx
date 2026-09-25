// CanonicalEditableText.jsx — Focus-Stable In-Place Tiptap Field Editor (Rules 1, 27, 28, 29, 30)
import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { getCanonicalEditorExtensions } from './CanonicalEditorExtensions.js'
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
    onFocus: () => {
      registry?.setActiveFieldKey(fieldKey)
      onFocusField?.(fieldKey)
    },
    onSelectionUpdate: () => {
      registry?.setActiveFieldKey(fieldKey)
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
