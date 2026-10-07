// StructuredItemControls.jsx — Keyboard-accessible item controls (Move Up, Move Down, Delete).
// RULE: No drag-and-drop npm packages. Keyboard-accessible buttons with aria-labels.

import React from 'react'

export default function StructuredItemControls({
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp = true,
  canMoveDown = true,
  canDelete = true,
  label = 'item',
  compact = true,
}) {
  const btnBaseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: compact ? '2px 5px' : '3px 8px',
    fontSize: compact ? '11px' : '12px',
    fontWeight: 600,
    border: '1px solid #cbd5e1',
    borderRadius: '3px',
    background: '#f8fafc',
    color: '#475569',
    cursor: 'pointer',
    userSelect: 'none',
    lineHeight: 1,
  }

  const disabledStyle = {
    opacity: 0.35,
    cursor: 'not-allowed',
  }

  return (
    <div
      className="structured-item-controls"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
    >
      <button
        type="button"
        onClick={canMoveUp ? onMoveUp : undefined}
        disabled={!canMoveUp}
        aria-label={`Move ${label} up`}
        title={`Move ${label} up`}
        style={{ ...btnBaseStyle, ...(canMoveUp ? {} : disabledStyle) }}
      >
        ▲
      </button>

      <button
        type="button"
        onClick={canMoveDown ? onMoveDown : undefined}
        disabled={!canMoveDown}
        aria-label={`Move ${label} down`}
        title={`Move ${label} down`}
        style={{ ...btnBaseStyle, ...(canMoveDown ? {} : disabledStyle) }}
      >
        ▼
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={canDelete ? onDelete : undefined}
          disabled={!canDelete}
          aria-label={`Delete ${label}`}
          title={`Delete ${label}`}
          style={{
            ...btnBaseStyle,
            borderColor: '#fca5a5',
            color: '#dc2626',
            background: '#fef2f2',
            ...(canDelete ? {} : disabledStyle),
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
