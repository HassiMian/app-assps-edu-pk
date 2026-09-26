// FillBlankStructuredEditor.jsx — In-place structured editor for Fill-in-the-Blank nodes (B4-C).
// Renders token segments (text / blanks) and optional word bank.
// Dispatches granular structural commands for undo/redo tracking.

import React, { useState } from 'react'
import FillBlankSegmentEditor from '../components/FillBlankSegmentEditor.jsx'
import {
  cmdUpdateFillSegmentText,
  cmdInsertFillSegment,
  cmdRemoveFillSegment,
  cmdReorderFillSegments,
  cmdUpdateWordBank,
} from '../structuredCommands.js'
import { createInsertedSegment } from '../structuredNodeModel.js'

export default function FillBlankStructuredEditor({
  nodeId,
  sectionId,
  resolvedNode,
  store,
  dir = 'auto',
  isEditing = true,
}) {
  const segments = resolvedNode?.segments || []
  const wordBank = resolvedNode?.wordBank || []
  const [newWordInput, setNewWordInput] = useState('')

  const handleUpdateSegmentText = (segId, newText) => {
    if (!store) return
    const prevSeg = segments.find(s => s.id === segId)
    const prevText = prevSeg?.text || prevSeg?.value || ''
    const cmd = cmdUpdateFillSegmentText(nodeId, sectionId, segId, newText, prevText)
    store.dispatchStructuralCommand(cmd)
  }

  const handleInsertSegment = (type) => {
    if (!store) return
    const allocator = store.getIdAllocator()
    const newId = allocator.allocateSegmentId(sectionId)
    const newSeg = createInsertedSegment(newId, type, { value: '', text: '' })
    const lastSeg = segments[segments.length - 1]
    const afterId = lastSeg ? lastSeg.id : null
    const currentOrder = segments.map(s => s.id)
    const cmd = cmdInsertFillSegment(nodeId, sectionId, newSeg, afterId, currentOrder)
    store.dispatchStructuralCommand(cmd)
  }

  const handleDeleteSegment = (segId) => {
    if (!store || segments.length <= 1) return
    const seg = segments.find(s => s.id === segId)
    if (!seg) return
    const currentOrder = segments.map(s => s.id)
    const cmd = cmdRemoveFillSegment(nodeId, sectionId, segId, seg, currentOrder)
    store.dispatchStructuralCommand(cmd)
  }

  const handleMoveSegment = (fromIdx, toIdx) => {
    if (!store || toIdx < 0 || toIdx >= segments.length) return
    const currentOrder = segments.map(s => s.id)
    const newOrder = [...currentOrder]
    const [movedId] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, movedId)
    const cmd = cmdReorderFillSegments(nodeId, sectionId, newOrder, currentOrder)
    store.dispatchStructuralCommand(cmd)
  }

  // Word Bank Handlers
  const handleAddWordToBank = () => {
    if (!store || !newWordInput.trim()) return
    const word = newWordInput.trim()
    const newBank = [...wordBank, word]
    const cmd = cmdUpdateWordBank(nodeId, sectionId, newBank, wordBank)
    store.dispatchStructuralCommand(cmd)
    setNewWordInput('')
  }

  const handleRemoveWordFromBank = (wordIdx) => {
    if (!store) return
    const newBank = wordBank.filter((_, idx) => idx !== wordIdx)
    const cmd = cmdUpdateWordBank(nodeId, sectionId, newBank, wordBank)
    store.dispatchStructuralCommand(cmd)
  }

  return (
    <div
      className="canonical-fill-blank-structured-editor"
      dir={dir}
      data-structured-editor="fill_blank"
      data-node-id={nodeId}
      style={{ width: '100%' }}
    >
      {/* 1. Segments Flow */}
      <FillBlankSegmentEditor
        segments={segments}
        onUpdateText={handleUpdateSegmentText}
        onInsertBlank={() => handleInsertSegment('blank')}
        onInsertText={() => handleInsertSegment('text')}
        onDeleteSegment={handleDeleteSegment}
        onMoveSegment={handleMoveSegment}
        dir={dir}
        nodeId={nodeId}
      />

      {/* 2. Word Bank (if present or if adding in edit mode) */}
      {(wordBank.length > 0 || isEditing) && (
        <div
          className="canonical-word-bank-box"
          style={{
            marginTop: '8px',
            padding: '6px 10px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#334155', userSelect: 'none' }}>
              Word Bank:
            </span>

            {wordBank.map((word, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  background: '#ffffff',
                  border: '1px solid #94a3b8',
                  borderRadius: '3px',
                  color: '#0f172a',
                }}
              >
                <span>{word}</span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => handleRemoveWordFromBank(idx)}
                    aria-label={`Remove ${word}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 700,
                      fontSize: '11px',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}

            {isEditing && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="text"
                  value={newWordInput}
                  onChange={(e) => setNewWordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddWordToBank()
                    }
                  }}
                  placeholder="+ word"
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '3px',
                    width: '80px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddWordToBank}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
