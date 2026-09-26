// FillBlankSegmentEditor.jsx — Segment token editor for fill_blank nodes (B4).
// Renders text segments as plain inputs and blank segments as dashed placeholders.
// RULE: Arrays are NEVER reversed in memory for RTL; flex direction handles rendering order.

import React from 'react'
import StructuredTextInput from './StructuredTextInput.jsx'
import StructuredItemControls from './StructuredItemControls.jsx'

export default function FillBlankSegmentEditor({
  segments = [],
  onUpdateText,
  onInsertBlank,
  onInsertText,
  onDeleteSegment,
  onMoveSegment,
  dir = 'ltr',
  nodeId = '',
}) {
  return (
    <div className="fill-blank-segment-editor" dir={dir} style={{ marginTop: '6px' }}>
      <div
        className="fill-blank-token-flow"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          padding: '6px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: '6px',
        }}
      >
        {segments.map((seg, idx) => {
          const isBlank = seg.type === 'blank'
          const canMoveUp = idx > 0
          const canMoveDown = idx < segments.length - 1
          const canDelete = segments.length > 1

          return (
            <div
              key={seg.id || idx}
              data-segment-id={seg.id}
              data-segment-type={seg.type}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 6px',
                background: isBlank ? '#eff6ff' : '#ffffff',
                border: isBlank ? '1.5px dashed #3b82f6' : '1px solid #cbd5e1',
                borderRadius: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {isBlank ? (
                <span
                  style={{
                    color: '#2563eb',
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    padding: '2px 8px',
                    userSelect: 'none',
                  }}
                >
                  [ _____ ]
                </span>
              ) : (
                <div style={{ minWidth: '100px', maxWidth: '240px' }}>
                  <StructuredTextInput
                    value={seg.text || ''}
                    onCommit={(newText) => onUpdateText(seg.id, newText)}
                    placeholder="Enter text..."
                    dir={dir}
                    ariaLabel={`Text segment ${idx + 1}`}
                  />
                </div>
              )}

              <StructuredItemControls
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                canDelete={canDelete}
                onMoveUp={() => onMoveSegment(idx, idx - 1)}
                onMoveDown={() => onMoveSegment(idx, idx + 1)}
                onDelete={() => onDeleteSegment(seg.id)}
                label={isBlank ? 'blank' : 'text'}
                compact={true}
              />
            </div>
          )
        })}
      </div>

      {/* Segment Insertion Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        <button
          type="button"
          onClick={() => onInsertText?.()}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            color: '#1e3a8a',
            cursor: 'pointer',
          }}
        >
          + Add Text
        </button>

        <button
          type="button"
          onClick={() => onInsertBlank?.()}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            background: '#eff6ff',
            border: '1px dashed #3b82f6',
            borderRadius: '4px',
            color: '#1d4ed8',
            cursor: 'pointer',
          }}
        >
          + Add Blank [ ___ ]
        </button>
      </div>
    </div>
  )
}
