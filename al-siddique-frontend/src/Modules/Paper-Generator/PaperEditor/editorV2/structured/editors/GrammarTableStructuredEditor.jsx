// GrammarTableStructuredEditor.jsx — In-place structured editor for Grammar Tables (B4-D).
// Strictly 2-column tables. Fallback to read-only badge if columns.length !== 2.

import React from 'react'
import StructuredTextInput from '../components/StructuredTextInput.jsx'
import StructuredItemControls from '../components/StructuredItemControls.jsx'
import CanonicalStaticNode from '../../CanonicalStaticNode.jsx'
import {
  cmdUpdateGrammarHeaders,
  cmdUpdateGrammarCell,
  cmdToggleGrammarBlank,
  cmdAddGrammarRow,
  cmdRemoveGrammarRow,
  cmdReorderGrammarRows,
} from '../structuredCommands.js'
import { createInsertedGrammarRow } from '../structuredNodeModel.js'
import { buildStructuredControlKey } from '../StructuredFocusContext.jsx'

export default function GrammarTableStructuredEditor({
  nodeId,
  sectionId,
  resolvedNode,
  store,
  dir = 'auto',
  isEditing = true,
}) {
  const columns = resolvedNode?.columns || ['Column 1', 'Column 2']
  const rows = resolvedNode?.rows || []
  const docId = store?.getWorkingDocument()?.baseCanonicalDocumentId || ''

  // Fallback for non-2-column tables
  if (columns.length !== 2) {
    return (
      <div style={{ padding: '4px 0' }}>
        <span
          style={{
            display: 'inline-block',
            background: '#fef3c7',
            color: '#92400e',
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            marginBottom: '6px',
          }}
        >
          Unsupported table structure — read only
        </span>
        <CanonicalStaticNode node={resolvedNode} direction={dir} />
      </div>
    )
  }

  const handleUpdateHeader = (colIdx, newTitle) => {
    if (!store) return
    const newHeaders = [...columns]
    newHeaders[colIdx] = newTitle
    const cmd = cmdUpdateGrammarHeaders(nodeId, sectionId, newHeaders, columns)
    store.dispatchStructuralCommand(cmd)
  }

  const handleUpdateCell = (rowId, side, newText, prevText) => {
    if (!store) return
    const cmd = cmdUpdateGrammarCell(nodeId, sectionId, rowId, side, newText, prevText)
    store.dispatchStructuralCommand(cmd)
  }

  const handleToggleBlank = (rowId, side, isBlank, prevIsBlank) => {
    if (!store) return
    const cmd = cmdToggleGrammarBlank(nodeId, sectionId, rowId, side, isBlank, prevIsBlank)
    store.dispatchStructuralCommand(cmd)
  }

  const handleAddRow = () => {
    if (!store) return
    const allocator = store.getIdAllocator()
    const newId = allocator.allocateRowId(sectionId)
    const newRow = createInsertedGrammarRow(newId)
    const lastRowId = rows.length > 0 ? rows[rows.length - 1].id : null
    const prevOrder = rows.map(r => r.id)
    const cmd = cmdAddGrammarRow(nodeId, sectionId, newRow, lastRowId, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  const handleDeleteRow = (rowId) => {
    if (!store || rows.length <= 1) return
    const rowIdx = rows.findIndex(r => r.id === rowId)
    if (rowIdx === -1) return
    const rowSnapshot = rows[rowIdx]
    const afterRowId = rowIdx > 0 ? rows[rowIdx - 1].id : null
    const prevOrder = rows.map(r => r.id)
    const cmd = cmdRemoveGrammarRow(nodeId, sectionId, rowId, rowSnapshot, afterRowId, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  const handleMoveRow = (fromIdx, toIdx) => {
    if (!store || toIdx < 0 || toIdx >= rows.length) return
    const prevOrder = rows.map(r => r.id)
    const newOrder = [...prevOrder]
    const [movedId] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, movedId)
    const cmd = cmdReorderGrammarRows(nodeId, sectionId, newOrder, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  return (
    <div
      className="canonical-grammar-structured-editor"
      dir={dir}
      data-structured-editor="grammar_table"
      data-node-id={nodeId}
      style={{ marginTop: '6px', width: '100%', overflowX: 'auto' }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1.5px solid #1e3a8a',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={{ padding: '6px', border: '1px solid #cbd5e1', width: '45%' }}>
              <StructuredTextInput
                value={columns[0] || ''}
                onCommit={(newTitle) => handleUpdateHeader(0, newTitle)}
                placeholder="Column 1 Header"
                dir={dir}
                disabled={!isEditing}
                ariaLabel="Column 1 header"
                style={{ fontWeight: 700, textAlign: 'center' }}
              />
            </th>
            <th style={{ padding: '6px', border: '1px solid #cbd5e1', width: '45%' }}>
              <StructuredTextInput
                value={columns[1] || ''}
                onCommit={(newTitle) => handleUpdateHeader(1, newTitle)}
                placeholder="Column 2 Header"
                dir={dir}
                disabled={!isEditing}
                ariaLabel="Column 2 header"
                style={{ fontWeight: 700, textAlign: 'center' }}
              />
            </th>
            {isEditing && (
              <th style={{ padding: '6px', border: '1px solid #cbd5e1', width: '10%' }} className="grammar-action-col no-print">
                <span style={{ fontSize: '11px', color: '#64748b' }}>Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const canMoveUp = isEditing && idx > 0
            const canMoveDown = isEditing && idx < rows.length - 1
            const canDelete = isEditing && rows.length > 1
            const leftCtrlKey = buildStructuredControlKey(docId, sectionId, nodeId, 'grammar', row.id, 'left')
            const rightCtrlKey = buildStructuredControlKey(docId, sectionId, nodeId, 'grammar', row.id, 'right')

            return (
              <tr key={row.id || idx} data-grammar-row-id={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                {/* Left Cell */}
                <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <StructuredTextInput
                        value={row.leftText || ''}
                        onCommit={(newText) => handleUpdateCell(row.id, 'left', newText, row.leftText || '')}
                        placeholder={row.leftIsBlank ? '[ Blank ]' : 'Left text...'}
                        dir={dir}
                        disabled={!isEditing}
                        controlKey={leftCtrlKey}
                        ariaLabel={`Row ${idx + 1} left cell`}
                      />
                    </div>
                    {isEditing && (
                      <label className="grammar-blank-toggle no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: '#64748b', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(row.leftIsBlank)}
                          onChange={(e) => handleToggleBlank(row.id, 'left', e.target.checked, Boolean(row.leftIsBlank))}
                        />
                        <span>Blank</span>
                      </label>
                    )}
                  </div>
                </td>

                {/* Right Cell */}
                <td style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <StructuredTextInput
                        value={row.rightText || ''}
                        onCommit={(newText) => handleUpdateCell(row.id, 'right', newText, row.rightText || '')}
                        placeholder={row.rightIsBlank ? '[ Blank ]' : 'Right text...'}
                        dir={dir}
                        disabled={!isEditing}
                        controlKey={rightCtrlKey}
                        ariaLabel={`Row ${idx + 1} right cell`}
                      />
                    </div>
                    {isEditing && (
                      <label className="grammar-blank-toggle no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: '#64748b', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(row.rightIsBlank)}
                          onChange={(e) => handleToggleBlank(row.id, 'right', e.target.checked, Boolean(row.rightIsBlank))}
                        />
                        <span>Blank</span>
                      </label>
                    )}
                  </div>
                </td>

                {/* Row Controls */}
                {isEditing && (
                  <td className="grammar-action-col no-print" style={{ padding: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    <StructuredItemControls
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                      canDelete={canDelete}
                      onMoveUp={() => handleMoveRow(idx, idx - 1)}
                      onMoveDown={() => handleMoveRow(idx, idx + 1)}
                      onDelete={() => handleDeleteRow(row.id)}
                      label={`row ${idx + 1}`}
                      compact={true}
                    />
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {isEditing && (
        <div style={{ marginTop: '6px' }}>
          <button
            type="button"
            onClick={handleAddRow}
            style={{
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
            + Add Row
          </button>
        </div>
      )}
    </div>
  )
}
