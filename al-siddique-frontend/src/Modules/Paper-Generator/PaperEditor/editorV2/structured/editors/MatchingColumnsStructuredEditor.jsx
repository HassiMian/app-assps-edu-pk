// MatchingColumnsStructuredEditor.jsx — In-place structured editor for Matching Columns nodes (B4-D).
// Two independent columns (Left & Right).
// RULE: Never model as pair rows. Never update or invent correctMappings.

import React from 'react'
import StructuredTextInput from '../components/StructuredTextInput.jsx'
import StructuredItemControls from '../components/StructuredItemControls.jsx'
import {
  cmdUpdateMatchingSide,
  cmdAddMatchingItem,
  cmdRemoveMatchingItem,
  cmdReorderMatchingSide,
} from '../structuredCommands.js'
import { createInsertedMatchingItem } from '../structuredNodeModel.js'
import { buildStructuredControlKey } from '../StructuredFocusContext.jsx'

export default function MatchingColumnsStructuredEditor({
  nodeId,
  sectionId,
  resolvedNode,
  store,
  dir = 'auto',
  isEditing = true,
}) {
  const leftItems = resolvedNode?.leftItems || []
  const rightItems = resolvedNode?.rightItems || []
  const docId = store?.getWorkingDocument()?.baseCanonicalDocumentId || ''

  const handleUpdateItem = (side, itemId, newText, prevText) => {
    if (!store) return
    const cmd = cmdUpdateMatchingSide(side, nodeId, sectionId, itemId, newText, prevText)
    store.dispatchStructuralCommand(cmd)
  }

  const handleAddItem = (side) => {
    if (!store) return
    const allocator = store.getIdAllocator()
    const newId = allocator.allocateItemId(sectionId, side)
    const newItem = createInsertedMatchingItem(newId, { text: '', direction: dir })
    const items = side === 'left' ? leftItems : rightItems
    const prevOrder = items.map(i => i.id)
    const cmd = cmdAddMatchingItem(side, nodeId, sectionId, newItem, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  const handleDeleteItem = (side, itemId) => {
    if (!store) return
    const items = side === 'left' ? leftItems : rightItems
    const itemSnapshot = items.find(i => i.id === itemId)
    if (!itemSnapshot) return
    const prevOrder = items.map(i => i.id)
    const cmd = cmdRemoveMatchingItem(side, nodeId, sectionId, itemId, itemSnapshot, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  const handleMoveItem = (side, fromIdx, toIdx) => {
    const items = side === 'left' ? leftItems : rightItems
    if (!store || toIdx < 0 || toIdx >= items.length) return
    const prevOrder = items.map(i => i.id)
    const newOrder = [...prevOrder]
    const [movedId] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, movedId)
    const cmd = cmdReorderMatchingSide(side, nodeId, sectionId, newOrder, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  return (
    <div
      className="canonical-matching-structured-editor"
      dir={dir}
      data-structured-editor="matching_columns"
      data-node-id={nodeId}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        width: '100%',
        marginTop: '6px',
      }}
    >
      {/* Column A (Left) */}
      <div
        className="matching-column-left"
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '8px',
          background: '#f8fafc',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: '12px', color: '#1e3a8a', marginBottom: '8px' }}>
          Column A
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {leftItems.map((item, idx) => {
            const ctrlKey = buildStructuredControlKey(docId, sectionId, nodeId, 'matching', item.id, 'left')
            const canMoveUp = isEditing && idx > 0
            const canMoveDown = isEditing && idx < leftItems.length - 1
            const canDelete = isEditing && leftItems.length > 1

            return (
              <div
                key={item.id || idx}
                data-matching-item-id={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', minWidth: '16px' }}>
                  {idx + 1}.
                </span>
                <div style={{ flex: 1 }}>
                  <StructuredTextInput
                    value={item.text || ''}
                    onCommit={(newText) => handleUpdateItem('left', item.id, newText, item.text || '')}
                    placeholder={`Item ${idx + 1}`}
                    dir={dir}
                    disabled={!isEditing}
                    controlKey={ctrlKey}
                    ariaLabel={`Left item ${idx + 1}`}
                  />
                </div>
                {isEditing && (
                  <StructuredItemControls
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    canDelete={canDelete}
                    onMoveUp={() => handleMoveItem('left', idx, idx - 1)}
                    onMoveDown={() => handleMoveItem('left', idx, idx + 1)}
                    onDelete={() => handleDeleteItem('left', item.id)}
                    label={`left item ${idx + 1}`}
                    compact={true}
                  />
                )}
              </div>
            )
          })}
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={() => handleAddItem('left')}
            style={{
              marginTop: '8px',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#ffffff',
              border: '1px dashed #94a3b8',
              borderRadius: '4px',
              color: '#1e3a8a',
              cursor: 'pointer',
            }}
          >
            + Add Item to Column A
          </button>
        )}
      </div>

      {/* Column B (Right) */}
      <div
        className="matching-column-right"
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '8px',
          background: '#f8fafc',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: '12px', color: '#1e3a8a', marginBottom: '8px' }}>
          Column B
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {rightItems.map((item, idx) => {
            const ctrlKey = buildStructuredControlKey(docId, sectionId, nodeId, 'matching', item.id, 'right')
            const canMoveUp = isEditing && idx > 0
            const canMoveDown = isEditing && idx < rightItems.length - 1
            const canDelete = isEditing && rightItems.length > 1
            const labelChar = String.fromCharCode(65 + idx)

            return (
              <div
                key={item.id || idx}
                data-matching-item-id={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', minWidth: '16px' }}>
                  ({labelChar})
                </span>
                <div style={{ flex: 1 }}>
                  <StructuredTextInput
                    value={item.text || ''}
                    onCommit={(newText) => handleUpdateItem('right', item.id, newText, item.text || '')}
                    placeholder={`Item ${labelChar}`}
                    dir={dir}
                    disabled={!isEditing}
                    controlKey={ctrlKey}
                    ariaLabel={`Right item ${labelChar}`}
                  />
                </div>
                {isEditing && (
                  <StructuredItemControls
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    canDelete={canDelete}
                    onMoveUp={() => handleMoveItem('right', idx, idx - 1)}
                    onMoveDown={() => handleMoveItem('right', idx, idx + 1)}
                    onDelete={() => handleDeleteItem('right', item.id)}
                    label={`right item ${labelChar}`}
                    compact={true}
                  />
                )}
              </div>
            )
          })}
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={() => handleAddItem('right')}
            style={{
              marginTop: '8px',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#ffffff',
              border: '1px dashed #94a3b8',
              borderRadius: '4px',
              color: '#1e3a8a',
              cursor: 'pointer',
            }}
          >
            + Add Item to Column B
          </button>
        )}
      </div>
    </div>
  )
}
