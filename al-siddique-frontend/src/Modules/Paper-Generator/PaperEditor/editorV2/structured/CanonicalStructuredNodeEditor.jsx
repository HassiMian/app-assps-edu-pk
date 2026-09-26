import React from 'react'
import McqStructuredEditor from './editors/McqStructuredEditor.jsx'
import TrueFalseStructuredEditor from './editors/TrueFalseStructuredEditor.jsx'
import FillBlankStructuredEditor from './editors/FillBlankStructuredEditor.jsx'
import MatchingColumnsStructuredEditor from './editors/MatchingColumnsStructuredEditor.jsx'
import GrammarTableStructuredEditor from './editors/GrammarTableStructuredEditor.jsx'
import VerticalMathStructuredEditor from './editors/VerticalMathStructuredEditor.jsx'
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

    case 'matching_columns':
      return (
        <MatchingColumnsStructuredEditor
          nodeId={nodeId}
          sectionId={sectionId}
          resolvedNode={resolvedNode}
          store={store}
          dir={dir}
          isEditing={isEditing}
        />
      )

    case 'grammar_table':
      return (
        <GrammarTableStructuredEditor
          nodeId={nodeId}
          sectionId={sectionId}
          resolvedNode={resolvedNode}
          store={store}
          dir={dir}
          isEditing={isEditing}
        />
      )

    case 'vertical_math':
      return (
        <VerticalMathStructuredEditor
          nodeId={nodeId}
          sectionId={sectionId}
          resolvedNode={resolvedNode}
          store={store}
          dir={dir}
          isEditing={isEditing}
        />
      )

    default:
      return <CanonicalStaticNode node={resolvedNode} direction={dir} />
  }
}
