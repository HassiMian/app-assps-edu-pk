// VerticalMathStructuredEditor.jsx — In-place structured editor for Vertical Math problems (B4-D).
// Monospace stack layout. Raw numbers preserved exactly (e.g. "0012" not converted to 12).
// Minimum 2 operands guard. Never auto-calculates result line.

import React from 'react'
import StructuredTextInput from '../components/StructuredTextInput.jsx'
import StructuredItemControls from '../components/StructuredItemControls.jsx'
import {
  cmdUpdateVerticalOperand,
  cmdAddVerticalOperand,
  cmdRemoveVerticalOperand,
  cmdReorderVerticalOperands,
  cmdUpdateVerticalOperator,
  cmdSetVerticalResult,
  cmdRemoveVerticalResult,
} from '../structuredCommands.js'
import { createInsertedOperand } from '../structuredNodeModel.js'
import { parseVerticalNumeric } from '../structuredNodeProjection.js'
import { buildStructuredControlKey } from '../StructuredFocusContext.jsx'

export default function VerticalMathStructuredEditor({
  nodeId,
  sectionId,
  resolvedNode,
  store,
  dir = 'ltr',
  isEditing = true,
}) {
  const operands = resolvedNode?.operands || []
  const operator = resolvedNode?.operator || '+'
  const result = resolvedNode?.result || null
  const docId = store?.getWorkingDocument()?.baseCanonicalDocumentId || ''

  const handleUpdateOperand = (opId, newRaw) => {
    if (!store) return
    const prevOp = operands.find(o => o.id === opId)
    const prevRaw = prevOp?.raw || ''
    const prevNorm = prevOp?.normalizedNumericValue ?? null
    const newNorm = parseVerticalNumeric(newRaw)
    const cmd = cmdUpdateVerticalOperand(nodeId, sectionId, opId, newRaw, newNorm, prevRaw, prevNorm)
    store.dispatchStructuralCommand(cmd)
  }

  const handleAddOperand = () => {
    if (!store) return
    const allocator = store.getIdAllocator()
    const newId = allocator.allocateOperandId(sectionId)
    const newOp = createInsertedOperand(newId, { raw: '', normalizedNumericValue: null })
    const lastOpId = operands.length > 0 ? operands[operands.length - 1].id : null
    const prevOrder = operands.map(o => o.id)
    const cmd = cmdAddVerticalOperand(nodeId, sectionId, newOp, lastOpId, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  const handleDeleteOperand = (opId) => {
    if (!store || operands.length <= 2) return
    const opIdx = operands.findIndex(o => o.id === opId)
    if (opIdx === -1) return
    const opSnapshot = operands[opIdx]
    const afterOpId = opIdx > 0 ? operands[opIdx - 1].id : null
    const prevOrder = operands.map(o => o.id)
    const cmd = cmdRemoveVerticalOperand(nodeId, sectionId, opId, opSnapshot, afterOpId, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  const handleMoveOperand = (fromIdx, toIdx) => {
    if (!store || toIdx < 0 || toIdx >= operands.length) return
    const prevOrder = operands.map(o => o.id)
    const newOrder = [...prevOrder]
    const [movedId] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, movedId)
    const cmd = cmdReorderVerticalOperands(nodeId, sectionId, newOrder, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  const handleUpdateOperator = (e) => {
    if (!store) return
    const newOp = e.target.value
    const cmd = cmdUpdateVerticalOperator(nodeId, sectionId, newOp, operator)
    store.dispatchStructuralCommand(cmd)
  }

  const handleUpdateResult = (newRaw) => {
    if (!store) return
    const newNorm = parseVerticalNumeric(newRaw)
    const cmd = cmdSetVerticalResult(nodeId, sectionId, newRaw, newNorm, result)
    store.dispatchStructuralCommand(cmd)
  }

  const handleAddResultLine = () => {
    if (!store) return
    const cmd = cmdSetVerticalResult(nodeId, sectionId, '', null, null)
    store.dispatchStructuralCommand(cmd)
  }

  const handleRemoveResultLine = () => {
    if (!store) return
    const cmd = cmdRemoveVerticalResult(nodeId, sectionId, result)
    store.dispatchStructuralCommand(cmd)
  }

  return (
    <div
      className="canonical-vertical-math-editor"
      dir="ltr"
      data-structured-editor="vertical_math"
      data-node-id={nodeId}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        padding: '12px 16px',
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontFamily: "'Courier New', Courier, monospace",
        marginTop: '6px',
      }}
    >
      {/* Operands Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        {operands.map((op, idx) => {
          const isLastOperand = idx === operands.length - 1
          const canMoveUp = isEditing && idx > 0
          const canMoveDown = isEditing && idx < operands.length - 1
          const canDelete = isEditing && operands.length > 2
          const ctrlKey = buildStructuredControlKey(docId, sectionId, nodeId, 'operand', op.id, 'raw')

          return (
            <div
              key={op.id || idx}
              data-operand-id={op.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              {/* Operator on the last operand row */}
              {isLastOperand ? (
                isEditing ? (
                  <select
                    value={operator}
                    onChange={handleUpdateOperator}
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      padding: '2px',
                      borderRadius: '3px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                    }}
                  >
                    <option value="+">+</option>
                    <option value="-">-</option>
                    <option value="×">×</option>
                    <option value="÷">÷</option>
                  </select>
                ) : (
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{operator}</span>
                )
              ) : (
                <span style={{ width: '24px' }}></span>
              )}

              {/* Operand Input */}
              <div style={{ width: '90px' }}>
                <StructuredTextInput
                  value={op.raw || ''}
                  onCommit={(newRaw) => handleUpdateOperand(op.id, newRaw)}
                  placeholder="0"
                  dir="ltr"
                  disabled={!isEditing}
                  controlKey={ctrlKey}
                  ariaLabel={`Operand ${idx + 1}`}
                  style={{
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: '15px',
                    fontWeight: 700,
                    textAlign: 'right',
                  }}
                />
              </div>

              {/* Operand Controls */}
              {isEditing && (
                <StructuredItemControls
                  canMoveUp={canMoveUp}
                  canMoveDown={canMoveDown}
                  canDelete={canDelete}
                  onMoveUp={() => handleMoveOperand(idx, idx - 1)}
                  onMoveDown={() => handleMoveOperand(idx, idx + 1)}
                  onDelete={() => handleDeleteOperand(op.id)}
                  label={`operand ${idx + 1}`}
                  compact={true}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Horizontal Calculation Bar */}
      <div
        style={{
          width: '100%',
          height: '2px',
          background: '#0f172a',
          margin: '6px 0',
        }}
      />

      {/* Result Line */}
      {result !== null ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <span style={{ width: '24px' }}></span>
          <div style={{ width: '90px' }}>
            <StructuredTextInput
              value={result.raw || ''}
              onCommit={handleUpdateResult}
              placeholder="Result"
              dir="ltr"
              disabled={!isEditing}
              ariaLabel="Vertical math result"
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '15px',
                fontWeight: 700,
                textAlign: 'right',
                background: '#eff6ff',
                borderColor: '#93c5fd',
              }}
            />
          </div>
          {isEditing && (
            <button
              type="button"
              onClick={handleRemoveResultLine}
              title="Remove result line"
              style={{
                fontSize: '11px',
                color: '#ef4444',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '3px',
                padding: '2px 5px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        isEditing && (
          <div style={{ width: '100%', textAlign: 'right', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleAddResultLine}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: '#eff6ff',
                border: '1px dashed #3b82f6',
                borderRadius: '3px',
                color: '#1d4ed8',
                cursor: 'pointer',
              }}
            >
              + Add Result Line
            </button>
          </div>
        )
      )}

      {/* Add Operand Button */}
      {isEditing && (
        <div style={{ marginTop: '8px', alignSelf: 'flex-start' }}>
          <button
            type="button"
            onClick={handleAddOperand}
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 600,
              background: '#ffffff',
              border: '1px dashed #94a3b8',
              borderRadius: '3px',
              color: '#1e3a8a',
              cursor: 'pointer',
            }}
          >
            + Add Operand
          </button>
        </div>
      )}
    </div>
  )
}
