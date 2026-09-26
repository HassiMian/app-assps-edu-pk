// TrueFalseStructuredEditor.jsx — In-place structured editor for True/False nodes (B4-C).
// Statement edited via StructuredTextInput; indicator box toggleable; expectedAnswer strictly read-only.

import React from 'react'
import StructuredTextInput from '../components/StructuredTextInput.jsx'
import {
  cmdUpdateTfStatement,
  cmdUpdateTfIndicator,
} from '../structuredCommands.js'
import { buildStructuredControlKey } from '../StructuredFocusContext.jsx'

export default function TrueFalseStructuredEditor({
  nodeId,
  sectionId,
  resolvedNode,
  store,
  dir = 'auto',
  isEditing = true,
}) {
  const statement = resolvedNode?.statement || resolvedNode?.statementText || resolvedNode?.stemText || ''
  const hasIndicatorBox = resolvedNode?.hasIndicatorBox ?? true
  const docId = store?.getWorkingDocument()?.baseCanonicalDocumentId || ''
  const ctrlKey = buildStructuredControlKey(docId, sectionId, nodeId, 'true_false', 'statement', 'text')

  const handleUpdateStatement = (newText) => {
    if (!store) return
    const cmd = cmdUpdateTfStatement(nodeId, sectionId, newText, statement)
    store.dispatchStructuralCommand(cmd)
  }

  const handleToggleIndicator = (e) => {
    if (!store) return
    const newVal = e.target.checked
    const cmd = cmdUpdateTfIndicator(nodeId, sectionId, newVal, hasIndicatorBox)
    store.dispatchStructuralCommand(cmd)
  }

  return (
    <div
      className="canonical-tf-structured-editor"
      dir={dir}
      data-structured-editor="true_false"
      data-node-id={nodeId}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        width: '100%',
      }}
    >
      {/* Statement Input */}
      <div style={{ flex: 1 }}>
        <StructuredTextInput
          value={statement}
          onCommit={handleUpdateStatement}
          placeholder="True / False statement..."
          dir={dir}
          disabled={!isEditing}
          controlKey={ctrlKey}
          ariaLabel="True/False statement text"
        />
      </div>

      {/* Indicator Box & Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {hasIndicatorBox && (
          <span
            className="canonical-tf-box"
            style={{
              display: 'inline-block',
              border: '1.5px solid #1e3a8a',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#1e3a8a',
              letterSpacing: '0.05em',
              userSelect: 'none',
            }}
          >
            [ &nbsp;T&nbsp; / &nbsp;F&nbsp; ]
          </span>
        )}

        {isEditing && (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#64748b',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={hasIndicatorBox}
              onChange={handleToggleIndicator}
              style={{ cursor: 'pointer' }}
            />
            <span>Box</span>
          </label>
        )}

        {/* Read-Only Expected Answer Display */}
        {resolvedNode?.expectedAnswer != null && (
          <span
            title="Expected Answer (Read-Only)"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 5px',
              background: '#f1f5f9',
              color: '#475569',
              borderRadius: '3px',
              border: '1px solid #cbd5e1',
            }}
          >
            Key: {String(resolvedNode.expectedAnswer)}
          </span>
        )}
      </div>
    </div>
  )
}
