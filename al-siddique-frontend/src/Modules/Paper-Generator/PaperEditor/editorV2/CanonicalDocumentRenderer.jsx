import React, { useState } from 'react'
import CanonicalEditableText from './CanonicalEditableText.jsx'
import CanonicalStaticNode from './CanonicalStaticNode.jsx'
import CanonicalStructuredNodeEditor from './structured/CanonicalStructuredNodeEditor.jsx'
import NodeStructureControls from './structured/components/NodeStructureControls.jsx'
import AddStructuredNodeMenu from './structured/components/AddStructuredNodeMenu.jsx'
import { resolveWorkingSectionNodes } from './structured/structuredNodeProjection.js'
import { createDefaultInsertedNode } from './structured/structuredNodeDefaults.js'
import {
  cmdInsertNode,
  cmdDeleteNode,
  cmdDuplicateNode,
  cmdMoveNode,
} from './structured/structuredCommands.js'
import { buildFieldKey } from './EditorFieldRegistry.js'
import { getB3NodeEditability, B3_RENDER_STRATEGY } from './nodeRenderStrategy.js'
import { usePaperStore } from '../../usePaperStore.js'

export default function CanonicalDocumentRenderer({
  workingDoc,
  canonicalBaseline,
  isEditing = true,
  store,
  registry,
  activeFieldKey,
  onFocusField,
  externalRevisionToken = 1,
}) {
  // Performance diagnostics tracking (test-only, zero production overhead, Rule 27)
  if (typeof window !== 'undefined' && window.__B3_DIAGNOSTICS__) {
    window.__B3_DIAGNOSTICS__.documentRendererRenderCount = (window.__B3_DIAGNOSTICS__.documentRendererRenderCount || 0) + 1
  }

  // Tenant paperSettings for presentation only (Rule 18)
  const { paperSettings } = usePaperStore()
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleInsertNode = (sectionId, nodeType, afterNodeId, workingItems) => {
    if (!store) return
    const allocator = store.getIdAllocator()
    const newNodeId = allocator.allocateNodeId(sectionId)
    const newRecord = createDefaultInsertedNode(
      nodeType,
      newNodeId,
      sectionId,
      (kind) => allocator.allocate(sectionId, kind)
    )
    const prevOrder = workingItems.map(item => item.nodeId)
    const cmd = cmdInsertNode(newNodeId, sectionId, newRecord, afterNodeId, prevOrder)
    store.dispatchStructuralCommand(cmd)
    showToast(`Added ${nodeType.replace('_', ' ')} question`)
  }

  const handleDeleteNode = (sectionId, nodeId, workingItems) => {
    if (!store) return
    const prevOrder = workingItems.map(item => item.nodeId)
    const cmd = cmdDeleteNode(nodeId, sectionId, prevOrder)
    store.dispatchStructuralCommand(cmd)
    showToast('Question removed — Undo (Ctrl+Z)')
  }

  const handleDuplicateNode = (sectionId, originalNodeId, resolvedNode, workingItems) => {
    if (!store) return
    const allocator = store.getIdAllocator()
    const newNodeId = allocator.allocateNodeId(sectionId)

    const nodeType = resolvedNode.type || resolvedNode.nodeType
    const duplicateRecord = {
      nodeId: newNodeId,
      nodeType,
      sectionId,
      origin: 'USER_CREATED',
      sourceSegmentIds: [],
      rawSourceSnapshot: null,
      workingMarksOverride: null,
      direction: resolvedNode.direction || 'auto',
      stemText: resolvedNode.stemText || resolvedNode.statement || '',
      statement: resolvedNode.statement || '',
      hasIndicatorBox: resolvedNode.hasIndicatorBox ?? true,
      expectedAnswer: null,
      correctMappings: null,
    }

    if (nodeType === 'mcq') {
      duplicateRecord.options = (resolvedNode.options || []).map(opt => ({
        ...opt,
        id: allocator.allocateOptionId(sectionId),
        isCorrect: null,
      }))
    } else if (nodeType === 'fill_blank') {
      duplicateRecord.segments = (resolvedNode.segments || []).map(seg => ({
        ...seg,
        id: allocator.allocateSegmentId(sectionId),
      }))
      duplicateRecord.wordBank = [...(resolvedNode.wordBank || [])]
    } else if (nodeType === 'matching_columns') {
      duplicateRecord.leftItems = (resolvedNode.leftItems || []).map(item => ({
        ...item,
        id: allocator.allocateItemId(sectionId, 'left'),
      }))
      duplicateRecord.rightItems = (resolvedNode.rightItems || []).map(item => ({
        ...item,
        id: allocator.allocateItemId(sectionId, 'right'),
      }))
      duplicateRecord.correctMappings = null
    } else if (nodeType === 'grammar_table') {
      duplicateRecord.columns = [...(resolvedNode.columns || ['Column 1', 'Column 2'])]
      duplicateRecord.rows = (resolvedNode.rows || []).map(row => ({
        ...row,
        id: allocator.allocateRowId(sectionId),
      }))
    } else if (nodeType === 'vertical_math') {
      duplicateRecord.operands = (resolvedNode.operands || []).map(op => ({
        ...op,
        id: allocator.allocateOperandId(sectionId),
      }))
      duplicateRecord.operator = resolvedNode.operator || '+'
      duplicateRecord.result = resolvedNode.result ? { ...resolvedNode.result } : null
    }

    const prevOrder = workingItems.map(item => item.nodeId)
    const cmd = cmdDuplicateNode(originalNodeId, newNodeId, sectionId, duplicateRecord, originalNodeId, prevOrder)
    store.dispatchStructuralCommand(cmd)
    showToast('Question duplicated')
  }

  const handleMoveNode = (sectionId, fromIdx, toIdx, workingItems) => {
    if (!store || toIdx < 0 || toIdx >= workingItems.length) return
    const prevOrder = workingItems.map(item => item.nodeId)
    const newOrder = [...prevOrder]
    const [movedId] = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, movedId)
    const cmd = cmdMoveNode(workingItems[fromIdx].nodeId, sectionId, newOrder, prevOrder)
    store.dispatchStructuralCommand(cmd)
  }

  if (!workingDoc || !workingDoc.sections) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        No canonical document loaded.
      </div>
    )
  }

  const meta = canonicalBaseline?.metadata || {}
  const pres = workingDoc.presentationOverlay || workingDoc.presentation || {}
  const isUrdu = pres.language === 'urdu' || meta.language === 'urdu'
  const isHalf = pres.templateId === 'half_page'

  const schoolName = pres.schoolName || paperSettings?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'
  const schoolAddress = pres.schoolAddress || paperSettings?.address || 'Sharif Chowk, Rayya Khas, Narowal'
  const logoUrl = pres.logoUrl || paperSettings?.logo || meta.logoUrl || null

  // Total Marks Authority Resolution (Rule 17)
  let totalMarksDisplay = '—'
  if (canonicalBaseline?.authority?.authoritativePaperTotal != null) {
    totalMarksDisplay = String(canonicalBaseline.authority.authoritativePaperTotal)
  } else if (
    canonicalBaseline?.authority?.storedConfiguredTotal != null &&
    canonicalBaseline.authority.paperTotalOrigin !== 'UNRESOLVED_ZERO'
  ) {
    totalMarksDisplay = String(canonicalBaseline.authority.storedConfiguredTotal)
  } else {
    totalMarksDisplay = '—'
  }

  const pageStyle = {
    width: isHalf ? '148mm' : '210mm',
    minHeight: isHalf ? '210mm' : '297mm',
    margin: '0 auto',
    padding: isHalf ? '16mm 14mm' : '20mm 18mm',
    background: '#ffffff',
    color: '#0f172a',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
    borderRadius: '4px',
    boxSizing: 'border-box',
    position: 'relative',
    fontFamily: isUrdu
      ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif"
      : "'Times New Roman', 'Arial', serif",
  }

  return (
    <article
      data-canonical-working-document={workingDoc.workingDocumentId}
      className="canonical-paper-surface"
      style={pageStyle}
      dir={isUrdu ? 'rtl' : 'ltr'}
    >
      {/* 1. School Header Section (Strictly Read-Only & Isolated outside Tiptap, Rules 17, 18, 34) */}
      <header
        data-canonical-header
        className="canonical-school-header"
        style={{
          position: 'relative',
          zIndex: 1,
          borderBottom: '2.5px solid #1e3a8a',
          paddingBottom: '10px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 140px', gap: '12px', alignItems: 'center' }}>
          {/* Logo */}
          <div style={{ width: 64, height: 64, display: 'grid', placeItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ color: '#1e3a8a', fontSize: '18px', fontWeight: 900 }}>ASSPS</span>
            )}
          </div>

          {/* School Name & Address */}
          <div style={{ textAlign: isUrdu ? 'right' : 'left' }}>
            <h1 style={{ margin: 0, fontSize: isHalf ? '18px' : '22px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.02em' }}>
              {schoolName}
            </h1>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
              {schoolAddress}
            </div>
          </div>

          {/* Exam Type & Session Badge (No invented defaults, Rule 17) */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#1e3a8a' }}>
              {meta.examType || '__________'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
              {meta.session || '__________'}
            </div>
          </div>
        </div>

        {/* Student Information Table (No invented defaults, Rule 17) */}
        <div
          data-student-info
          dir="ltr"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
            gap: '6px',
            marginTop: '10px',
          }}
        >
          {[
            ['Student Name', '__________________________'],
            ['Roll No.', '__________'],
            ['Class', meta.className || meta.classLevel || '__________'],
            ['Paper Code', meta.paperCode || '__________'],
            ['Subject', meta.subject || meta.subjectName || '__________'],
            ['Time Allowed', meta.timeAllowed || '__________'],
            ['Total Marks', totalMarksDisplay],
            ['Date', meta.examDate || '__________'],
          ].map(([label, val], idx) => (
            <div
              key={idx}
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: '11px',
              }}
            >
              <span style={{ color: '#1e3a8a', fontWeight: 800, fontSize: '9px', textTransform: 'uppercase', display: 'block' }}>{label}</span>
              <span style={{ color: '#1e293b', fontSize: '11px', fontWeight: 700 }}>{val}</span>
            </div>
          ))}
        </div>
      </header>

      {/* 2. Main Sections Area */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {workingDoc.sections?.map((section, sIdx) => {
          const secDir = section.direction === 'rtl' ? 'rtl' : (section.direction === 'ltr' ? 'ltr' : (isUrdu ? 'rtl' : 'ltr'))
          const totalMarks = section.authoritativeSectionTotal ?? section.operationalSectionTotal
          let questionCounter = 0

          return (
            <section
              key={section.id || sIdx}
              data-canonical-section={section.id}
              style={{ marginBottom: '18px' }}
            >
              {/* Section Heading Bar (READ-ONLY in B3, Rule 20) */}
              <div
                className="canonical-section-heading-bar"
                dir={secDir}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 10px',
                  background: '#f1f5f9',
                  borderLeft: secDir === 'rtl' ? 'none' : '4px solid #1e3a8a',
                  borderRight: secDir === 'rtl' ? '4px solid #1e3a8a' : 'none',
                  borderRadius: '2px',
                  marginBottom: '10px',
                }}
              >
                {/* Total Marks badge if available */}
                {totalMarks !== null && totalMarks !== undefined && (
                  <span
                    className="canonical-section-marks-badge"
                    style={{
                      background: '#1e3a8a',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    ({totalMarks} Marks)
                  </span>
                )}

                {/* Section structural change warning badge (B4-E spec) */}
                {(() => {
                  const s = workingDoc?.structured
                  const baselineSec = canonicalBaseline?.sections?.find(sec => sec.id === section.id)
                  const hasSectionChanges = Boolean(
                    s && (
                      Object.values(s.insertedNodes || {}).some(n => n.sectionId === section.id) ||
                      (s.deletedNodeIds || []).some(id => baselineSec?.nodes?.some(n => n.id === id)) ||
                      s.nodeOrderBySection?.[section.id]
                    )
                  )
                  if (!hasSectionChanges) return null
                  return (
                    <span
                      className="canonical-section-warning-badge"
                      style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid #fde68a',
                        userSelect: 'none',
                      }}
                    >
                      Working structure changed; source marks total remains unchanged.
                    </span>
                  )
                })()}

                {/* Section Title */}
                <h2
                  data-section-title
                  style={{
                    margin: 0,
                    fontSize: isHalf ? '13px' : '15px',
                    fontWeight: 800,
                    color: '#1e3a8a',
                    textAlign: isUrdu ? 'right' : 'left',
                  }}
                >
                  {isUrdu ? (section.titleUrdu || section.title) : section.title}
                </h2>
              </div>

              {/* Instructions if present */}
              {section.instructions && (
                <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#475569', marginBottom: '6px' }}>
                  {section.instructions}
                </div>
              )}

              {/* Section Nodes */}
              <div className="canonical-section-nodes" dir={secDir}>
                {(() => {
                  const baselineSec = canonicalBaseline?.sections?.find(s => s.id === section.id)
                  const workingItems = resolveWorkingSectionNodes(baselineSec, workingDoc?.structured)

                  return (
                    <>
                      {workingItems.map(({ resolvedNode, nodeId }, itemIdx) => {
                        const nodeType = resolvedNode.type || resolvedNode.nodeType
                        const nodeDir = resolvedNode.direction === 'rtl' ? 'rtl' : (resolvedNode.direction === 'ltr' ? 'ltr' : secDir)
                        const nodeOverlay = section.nodeOverlays?.find(n => n.nodeId === nodeId)

                        // 1. Scope Headers and Section Banners have NO question numbers or marks (Rule 13)
                        if (nodeType === 'section_banner' || nodeType === 'scope_header') {
                          return (
                            <div
                              key={nodeId}
                              data-node-id={nodeId}
                              data-node-type={nodeType}
                              style={{ marginBottom: '6px' }}
                            >
                              <CanonicalStaticNode node={resolvedNode} direction={nodeDir} />
                            </div>
                          )
                        }

                        // Increment question count for academic question items
                        questionCounter++
                        const currentQNum = questionCounter

                        // Contextual node controls header
                        const controlsHeader = isEditing && (
                          <div
                            className="canonical-node-controls-header no-print"
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              marginBottom: '2px',
                            }}
                          >
                            <NodeStructureControls
                              nodeId={nodeId}
                              canMoveUp={itemIdx > 0}
                              canMoveDown={itemIdx < workingItems.length - 1}
                              onMoveUp={() => handleMoveNode(section.id, itemIdx, itemIdx - 1, workingItems)}
                              onMoveDown={() => handleMoveNode(section.id, itemIdx, itemIdx + 1, workingItems)}
                              onDelete={() => handleDeleteNode(section.id, nodeId, workingItems)}
                              onDuplicate={() => handleDuplicateNode(section.id, nodeId, resolvedNode, workingItems)}
                              onInsertAbove={(type) => handleInsertNode(section.id, type, itemIdx > 0 ? workingItems[itemIdx - 1].nodeId : null, workingItems)}
                              onInsertBelow={(type) => handleInsertNode(section.id, type, nodeId, workingItems)}
                            />
                          </div>
                        )

                        // 2. Structured Non-MCQ Nodes (true_false, fill_blank, matching_columns, grammar_table, vertical_math, unknown_preserved)
                        const isStructuredType = [
                          'true_false',
                          'fill_blank',
                          'matching_columns',
                          'grammar_table',
                          'vertical_math',
                          'unknown_preserved',
                        ].includes(nodeType)

                        if (isStructuredType) {
                          return (
                            <div
                              key={nodeId}
                              data-node-id={nodeId}
                              data-node-type={nodeType}
                              style={{ marginBottom: '10px', padding: '2px 0' }}
                            >
                              {controlsHeader}
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <span style={{ fontWeight: 800, color: '#1e3a8a', minWidth: '18px', userSelect: 'none' }}>
                                  {currentQNum}.
                                </span>
                                <div style={{ flex: 1 }}>
                                  <CanonicalStructuredNodeEditor
                                    nodeId={nodeId}
                                    sectionId={section.id}
                                    resolvedNode={resolvedNode}
                                    store={store}
                                    dir={nodeDir}
                                    isEditing={isEditing}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        }

                        // 3. MCQ Nodes (Rich text stem + Structured options)
                        if (nodeType === 'mcq') {
                          const fieldName = nodeOverlay?.editableFields ? Object.keys(nodeOverlay.editableFields)[0] || 'stem' : 'stem'
                          const fieldOverlay = nodeOverlay?.editableFields?.[fieldName]
                          const fieldKey = buildFieldKey(workingDoc.baseCanonicalDocumentId, section.id, nodeId, fieldName)

                          return (
                            <div
                              key={nodeId}
                              data-node-id={nodeId}
                              data-node-type={nodeType}
                              style={{ marginBottom: '10px', padding: '2px 0' }}
                            >
                              {controlsHeader}
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <span style={{ fontWeight: 800, color: '#1e3a8a', minWidth: '18px', userSelect: 'none' }}>
                                  {currentQNum}.
                                </span>
                                <div style={{ flex: 1 }}>
                                  {fieldOverlay ? (
                                    <CanonicalEditableText
                                      fieldKey={fieldKey}
                                      fieldOverlay={fieldOverlay}
                                      direction={nodeDir}
                                      store={store}
                                      registry={registry}
                                      onFocusField={onFocusField}
                                      isEditing={isEditing}
                                      externalRevisionToken={externalRevisionToken}
                                    />
                                  ) : (
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{resolvedNode.stemText || ''}</div>
                                  )}
                                </div>
                              </div>

                              <CanonicalStructuredNodeEditor
                                nodeId={nodeId}
                                sectionId={section.id}
                                resolvedNode={resolvedNode}
                                store={store}
                                dir={nodeDir}
                                isEditing={isEditing}
                              />
                            </div>
                          )
                        }

                        // 4. Other Rich Text Editable Nodes (short_question, long_question, essay, letter, translation, etc.)
                        const fieldName = nodeOverlay?.editableFields ? Object.keys(nodeOverlay.editableFields)[0] || 'stem' : 'stem'
                        const fieldOverlay = nodeOverlay?.editableFields?.[fieldName]
                        const fieldKey = buildFieldKey(workingDoc.baseCanonicalDocumentId, section.id, nodeId, fieldName)

                        return (
                          <div
                            key={nodeId}
                            data-node-id={nodeId}
                            data-node-type={nodeType}
                            style={{
                              marginBottom: '10px',
                              padding: '2px 0',
                            }}
                          >
                            {controlsHeader}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                              <span style={{ fontWeight: 800, color: '#1e3a8a', minWidth: '18px', userSelect: 'none' }}>
                                {currentQNum}.
                              </span>
                              <div style={{ flex: 1 }}>
                                {fieldOverlay ? (
                                  <CanonicalEditableText
                                    fieldKey={fieldKey}
                                    fieldOverlay={fieldOverlay}
                                    direction={nodeDir}
                                    store={store}
                                    registry={registry}
                                    onFocusField={onFocusField}
                                    isEditing={isEditing}
                                    externalRevisionToken={externalRevisionToken}
                                  />
                                ) : (
                                  <CanonicalStaticNode node={resolvedNode} direction={nodeDir} />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Add Question Button at the bottom of the section */}
                      {isEditing && (
                        <div className="canonical-add-node-bar no-print" style={{ marginTop: '10px', paddingTop: '6px' }}>
                          <AddStructuredNodeMenu
                            onSelectType={(type) => {
                              const lastNodeId = workingItems.length > 0 ? workingItems[workingItems.length - 1].nodeId : null
                              handleInsertNode(section.id, type, lastNodeId, workingItems)
                            }}
                            label="+ Add Question to Section"
                          />
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </section>
          )
        })}
      </main>

      {/* Toast Notification (Destructive undoable actions / notifications) */}
      {toastMessage && (
        <div
          role="status"
          className="canonical-editor-toast no-print"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#1e293b',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            fontSize: '12px',
            fontWeight: 600,
            zIndex: 9999,
            userSelect: 'none',
          }}
        >
          {toastMessage}
        </div>
      )}
    </article>
  )
}
