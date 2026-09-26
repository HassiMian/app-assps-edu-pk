// McqStructuredEditor.jsx — In-place structured editor for MCQ options (B4-C).
// RULE: Plain text inputs only (never Tiptap per option).
// RULE: isCorrect is strictly read-only.
// RULE: Source labels preserved on reorder. Minimum 2 options guard.

import React from 'react'
import StructuredTextInput from '../components/StructuredTextInput.jsx'
import StructuredItemControls from '../components/StructuredItemControls.jsx'
import {
  cmdUpdateMcqOptionText,
  cmdAddMcqOption,
  cmdRemoveMcqOption,
  cmdReorderMcqOptions,
} from '../structuredCommands.js'
import { createInsertedOption } from '../structuredNodeModel.js'
import { generateNextOptionLabel } from '../structuredNodeDefaults.js'
import { buildStructuredControlKey } from '../StructuredFocusContext.jsx'

export default function McqStructuredEditor({
  nodeId,
  sectionId,
  resolvedNode,
  store,
  dir = 'ltr',
  isEditing = true,
}) {
  const options = resolvedNode?.options || []
  const docId = store?.getWorkingDocument()?.baseCanonicalDocumentId || ''

  const handleUpdateOptionText = (optionId, newText, prevText) => {
    if (!store) return
    const cmd = cmdUpdateMcqOptionText(nodeId, sectionId, optionId, newText, prevText)
    store.dispatchStructuralCommand(cmd)
  }

  const handleAddOption = () => {
    if (!store) return
    const allocator = store.getIdAllocator()
    const newId = allocator.allocateOptionId(sectionId)
    const nextLabel = generateNextOptionLabel(options)
    const newOption = createInsertedOption(newId, {
      canonicalLabel: nextLabel,
      displayLabel: nextLabel,
      text: '',
      direction: dir,
    })
    const lastOptionId = options.length > 0 ? options[options.length - 1].id : null
    const cmd = cmdAddMcqOption(nodeId, sectionId, newOption, lastOptionId)
    store.dispatchStructuralCommand(cmd)
  }

  const handleDeleteOption = (optionId) => {
    if (!store || options.length <= 2) return
    const optIndex = options.findIndex(o => o.id === optionId)
    if (optIndex === -1) return
    const opt = options[optIndex]
    const afterId = optIndex > 0 ? options[optIndex - 1].id : null
    const cmd = cmdRemoveMcqOption(nodeId, sectionId, optionId, opt, afterId)
    store.dispatchStructuralCommand(cmd)
  }

  const handleMoveOption = (fromIdx, toIdx) => {
    if (!store || toIdx < 0 || toIdx >= options.length) return
    const currentOrder = options.map(o => o.id)
    const newOrder = [...currentOrder]
    const [movedId] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, movedId)
    const cmd = cmdReorderMcqOptions(nodeId, sectionId, newOrder, currentOrder)
    store.dispatchStructuralCommand(cmd)
  }

  return (
    <div
      className="canonical-mcq-structured-editor"
      dir={dir}
      data-structured-editor="mcq"
      data-node-id={nodeId}
      style={{ marginTop: '8px' }}
    >
      {/* Options Flow / Grid — handles 2 to 11+ options without clipping */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '8px',
          alignItems: 'start',
        }}
      >
        {options.map((opt, idx) => {
          const optLabel = opt.displayLabel || opt.sourceLabel || opt.canonicalLabel || opt.label || String.fromCharCode(65 + idx)
          const optDir = opt.direction || dir
          const canMoveUp = isEditing && idx > 0
          const canMoveDown = isEditing && idx < options.length - 1
          const canDelete = isEditing && options.length > 2
          const ctrlKey = buildStructuredControlKey(docId, sectionId, nodeId, 'option', opt.id, 'text')

          return (
            <div
              key={opt.id || idx}
              data-option-id={opt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 6px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              {/* Option Label */}
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '12px',
                  color: '#1e3a8a',
                  minWidth: '22px',
                  userSelect: 'none',
                }}
              >
                ({optLabel})
              </span>

              {/* Editable Option Text */}
              <div style={{ flex: 1 }}>
                <StructuredTextInput
                  value={opt.text || ''}
                  onCommit={(newText) => handleUpdateOptionText(opt.id, newText, opt.text || '')}
                  placeholder={`Option ${optLabel}`}
                  dir={optDir}
                  disabled={!isEditing}
                  controlKey={ctrlKey}
                  ariaLabel={`Option ${optLabel} text`}
                />
              </div>

              {/* Read-Only Answer Key Indicator (corpus has null, but if non-null render badge) */}
              {opt.isCorrect != null && (
                <span
                  title="Answer Key (Read-Only)"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 4px',
                    background: opt.isCorrect ? '#dcfce7' : '#f1f5f9',
                    color: opt.isCorrect ? '#166534' : '#64748b',
                    borderRadius: '3px',
                    border: '1px solid currentColor',
                    userSelect: 'none',
                  }}
                >
                  {opt.isCorrect ? '✓ Key' : 'Key'}
                </span>
              )}

              {/* Item Controls */}
              {isEditing && (
                <StructuredItemControls
                  canMoveUp={canMoveUp}
                  canMoveDown={canMoveDown}
                  canDelete={canDelete}
                  onMoveUp={() => handleMoveOption(idx, idx - 1)}
                  onMoveDown={() => handleMoveOption(idx, idx + 1)}
                  onDelete={() => handleDeleteOption(opt.id)}
                  label={`option ${optLabel}`}
                  compact={true}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Add Option Button (Editor Only) */}
      {isEditing && (
        <div style={{ marginTop: '8px' }}>
          <button
            type="button"
            onClick={handleAddOption}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#1e3a8a',
              background: '#f8fafc',
              border: '1px dashed #94a3b8',
              borderRadius: '4px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            + Add Option
          </button>
        </div>
      )}
    </div>
  )
}
