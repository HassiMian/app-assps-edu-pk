// CanonicalStructuredNodeEditor.jsx — Router for structured academic node editors (B4-C).
// Routes by nodeType to specialized editors; falls back to static rendering for view-mode.

import React from 'react'
import McqStructuredEditor from './editors/McqStructuredEditor.jsx'
import TrueFalseStructuredEditor from './editors/TrueFalseStructuredEditor.jsx'
import FillBlankStructuredEditor from './editors/FillBlankStructuredEditor.jsx'
import CanonicalStaticNode from '../CanonicalStaticNode.jsx'

export default function CanonicalStructuredNodeEditor({
  nodeId,
  sectionId,
  resolvedNode,
  store,
  dir = 'auto',
  isEditing = true,
}) {
  if (!resolvedNode) return null
  const nodeType = resolvedNode.type || resolvedNode.nodeType

  // In view mode (not editing), render the static projection
  if (!isEditing) {
    return <CanonicalStaticNode node={resolvedNode} direction={dir} />
  }

  // Edit Mode Routers
  switch (nodeType) {
    case 'mcq':
      return (
        <McqStructuredEditor
          nodeId={nodeId}
          sectionId={sectionId}
          resolvedNode={resolvedNode}
          store={store}
          dir={dir}
          isEditing={isEditing}
        />
      )

    case 'true_false':
      return (
        <TrueFalseStructuredEditor
          nodeId={nodeId}
          sectionId={sectionId}
          resolvedNode={resolvedNode}
          store={store}
          dir={dir}
          isEditing={isEditing}
        />
      )

    case 'fill_blank':
      return (
        <FillBlankStructuredEditor
          nodeId={nodeId}
          sectionId={sectionId}
          resolvedNode={resolvedNode}
          store={store}
          dir={dir}
          isEditing={isEditing}
        />
      )

    case 'grammar_table': {
      const cols = resolvedNode.columns || []
      // 3-column or non-2-column safety fallback (spec requirement)
      if (cols.length !== 2) {
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
      // B4-D will provide the full GrammarTableStructuredEditor
      return <CanonicalStaticNode node={resolvedNode} direction={dir} />
    }

    // Matching columns & vertical math routed to static until B4-D
    case 'matching_columns':
    case 'vertical_math':
      return <CanonicalStaticNode node={resolvedNode} direction={dir} />

    default:
      return <CanonicalStaticNode node={resolvedNode} direction={dir} />
  }
}
