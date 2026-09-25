// EditableQuestionStem.jsx — Interactive, selection-aware question stem editor
import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { getPaperEditorExtensions, createTiptapDocFromText } from '../extensions/PaperEditorExtensions.js'
import { PaperRichTextRenderer } from '../../PaperRichTextEditor.jsx'

export default function EditableQuestionStem({
  question,
  sectionId,
  isUrdu = false,
  secDir = 'ltr',
  isEditing = true,
  renderMode = 'screen',
  onUpdateQuestion,
  onSetActiveEditor,
  onSelectQuestion,
  onSelectSection,
}) {
  const fallbackText = isUrdu ? (question.stemUrdu || question.stemText) : question.stemText

  // If in print mode or editing is disabled, render clean static HTML with zero editor overhead
  if (renderMode === 'print' || !isEditing) {
    return (
      <span className="paper-rendered-stem" dir={secDir}>
        {question.stemRich ? (
          <PaperRichTextRenderer value={question.stemRich} fallbackText={fallbackText} direction={secDir} />
        ) : (
          <span>{fallbackText}</span>
        )}
      </span>
    )
  }

  return (
    <ActiveStemEditor
      question={question}
      sectionId={sectionId}
      isUrdu={isUrdu}
      secDir={secDir}
      fallbackText={fallbackText}
      onUpdateQuestion={onUpdateQuestion}
      onSetActiveEditor={onSetActiveEditor}
      onSelectQuestion={onSelectQuestion}
      onSelectSection={onSelectSection}
    />
  )
}

function ActiveStemEditor({
  question,
  sectionId,
  isUrdu,
  secDir,
  fallbackText,
  onUpdateQuestion,
  onSetActiveEditor,
  onSelectQuestion,
  onSelectSection,
}) {
  const editor = useEditor({
    extensions: getPaperEditorExtensions(),
    content: question.stemRich || createTiptapDocFromText(fallbackText),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'paper-editable-stem-content',
        dir: secDir,
        'data-question-id': String(question.id),
      },
    },
    onFocus: ({ editor: focusedEditor }) => {
      onSelectQuestion?.(question.id)
      onSelectSection?.(sectionId)
      onSetActiveEditor?.(focusedEditor)
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      onSetActiveEditor?.(currentEditor)
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onUpdateQuestion?.(sectionId, question.id, {
        stemRich: updatedEditor.getJSON(),
        stemText: updatedEditor.getText(),
      })
    },
  })

  // Synchronize external content changes (e.g. on Undo / Redo or document reload)
  useEffect(() => {
    if (!editor) return
    const targetContent = question.stemRich || createTiptapDocFromText(fallbackText)
    const currentJSON = editor.getJSON()
    if (JSON.stringify(currentJSON) !== JSON.stringify(targetContent)) {
      editor.commands.setContent(targetContent, { emitUpdate: false })
    }
  }, [question.stemRich, fallbackText, editor])

  if (!editor) {
    return <span>{fallbackText}</span>
  }

  return (
    <span
      className="paper-editable-stem-wrapper"
      onClick={() => {
        onSelectQuestion?.(question.id)
        onSelectSection?.(sectionId)
        onSetActiveEditor?.(editor)
      }}
      style={{
        display: 'inline-block',
        minWidth: '40px',
        cursor: 'text',
        verticalAlign: 'top',
      }}
    >
      <EditorContent editor={editor} />
    </span>
  )
}
