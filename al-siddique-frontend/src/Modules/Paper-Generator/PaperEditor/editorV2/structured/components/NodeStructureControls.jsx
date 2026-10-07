// NodeStructureControls.jsx — Per-node contextual controls for insert, delete, duplicate, reorder (B4-E).
// RULE: No window.alert(). Inline confirmation for delete. Keyboard accessible buttons.

import React, { useState } from 'react'
import AddStructuredNodeMenu from './AddStructuredNodeMenu.jsx'

export default function NodeStructureControls({
  nodeId,
  canMoveUp = true,
  canMoveDown = true,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
  onInsertAbove,
  onInsertBelow,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 600,
    border: '1px solid #cbd5e1',
    borderRadius: '3px',
    background: '#ffffff',
    color: '#475569',
    cursor: 'pointer',
    userSelect: 'none',
  }

  const disabledStyle = {
    opacity: 0.35,
    cursor: 'not-allowed',
  }

  return (
    <div
      className="node-structure-controls"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        opacity: 0.85,
        transition: 'opacity 0.15s ease',
      }}
    >
      {/* Move Up / Move Down */}
      <button
        type="button"
        onClick={canMoveUp ? onMoveUp : undefined}
        disabled={!canMoveUp}
        title="Move question up"
        aria-label="Move question up"
        style={{ ...btnStyle, ...(canMoveUp ? {} : disabledStyle) }}
      >
        ▲
      </button>

      <button
        type="button"
        onClick={canMoveDown ? onMoveDown : undefined}
        disabled={!canMoveDown}
        title="Move question down"
        aria-label="Move question down"
        style={{ ...btnStyle, ...(canMoveDown ? {} : disabledStyle) }}
      >
        ▼
      </button>

      {/* Duplicate */}
      <button
        type="button"
        onClick={onDuplicate}
        title="Duplicate question"
        aria-label="Duplicate question"
        style={{ ...btnStyle, color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}
      >
        Duplicate
      </button>

      {/* Insert Below Menu */}
      <AddStructuredNodeMenu
        onSelectType={onInsertBelow}
        label="+ Below"
        buttonStyle={{
          padding: '2px 6px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#1e3a8a',
          borderColor: '#cbd5e1',
        }}
      />

      {/* Delete with inline confirmation */}
      {confirmingDelete ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#fef2f2',
            padding: '1px 6px',
            borderRadius: '4px',
            border: '1px solid #fecaca',
            fontSize: '11px',
          }}
        >
          <span style={{ color: '#b91c1c', fontWeight: 600 }}>Delete?</span>
          <button
            type="button"
            onClick={() => {
              setConfirmingDelete(false)
              onDelete()
            }}
            style={{
              padding: '1px 5px',
              fontSize: '11px',
              fontWeight: 700,
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            style={{
              padding: '1px 5px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            No
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          title="Delete question"
          aria-label="Delete question"
          style={{
            ...btnStyle,
            borderColor: '#fca5a5',
            color: '#dc2626',
            background: '#fef2f2',
          }}
        >
          ✕ Delete
        </button>
      )}
    </div>
  )
}
