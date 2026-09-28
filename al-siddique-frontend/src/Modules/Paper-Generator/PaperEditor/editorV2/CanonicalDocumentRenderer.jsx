import React, { useState } from 'react'
import CanonicalEditableText from './CanonicalEditableText.jsx'
import CanonicalStaticNode from './CanonicalStaticNode.jsx'
import CanonicalOptionLabel from './CanonicalOptionLabel.jsx'
import CanonicalInlineField from './CanonicalInlineField.jsx'
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

  const meta = workingDoc.metadata || canonicalBaseline?.metadata || {}
  const pres = workingDoc.presentationOverlay || workingDoc.presentation || {}
  const isUrdu = pres.language === 'urdu' || meta.language === 'urdu'
  const isHalf = pres.templateId === 'half_page'

  const schoolName = pres.schoolName || paperSettings?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'
  const schoolAddress = meta.schoolAddress !== null && meta.schoolAddress !== undefined
    ? meta.schoolAddress
    : (paperSettings?.address || 'Sharif Chowk, Rayya Khas, Narowal')
  const logoUrl = pres.logoUrl || paperSettings?.logo || meta.logoUrl || null

  // Working total marks overlay. Canonical authority remains immutable in the baseline.
  let effectivePaperTotal = null
  if (store?.getEffectivePaperTotal) {
    effectivePaperTotal = store.getEffectivePaperTotal()
  } else if (canonicalBaseline?.authority?.authoritativePaperTotal != null) {
    effectivePaperTotal = Number(canonicalBaseline.authority.authoritativePaperTotal)
  } else if (
    canonicalBaseline?.authority?.storedConfiguredTotal != null &&
    canonicalBaseline.authority.paperTotalOrigin !== 'UNRESOLVED_ZERO'
  ) {
    effectivePaperTotal = Number(canonicalBaseline.authority.storedConfiguredTotal)
  }
  const totalMarksDisplay = Number.isFinite(effectivePaperTotal)
    ? String(effectivePaperTotal)
    : '—'

  const headerInfoFields = [
    { id: 'studentName', label: 'Student Name', value: meta.studentNameField ?? '__________________________', metadataKey: 'studentNameField' },
    { id: 'rollNo', label: 'Roll No.', value: meta.rollNoField ?? '__________', metadataKey: 'rollNoField' },
    { id: 'className', label: 'Class', value: meta.className ?? meta.classLevel ?? '', metadataKey: 'className' },
    { id: 'paperCode', label: 'Paper Code', value: meta.paperCode ?? '', metadataKey: 'paperCode' },
    { id: 'subject', label: 'Subject', value: meta.subject ?? meta.subjectName ?? '', metadataKey: 'subject' },
    { id: 'timeAllowed', label: 'Time Allowed', value: meta.timeAllowed ?? '', metadataKey: 'timeAllowed' },
    { id: 'totalMarks', label: 'Total Marks', value: totalMarksDisplay === '—' ? '' : totalMarksDisplay, marksField: true },
    { id: 'examDate', label: 'Date', value: meta.examDate ?? '', metadataKey: 'examDate' },
  ]
  const hiddenHeaderFields = new Set(meta.hiddenHeaderFields || [])
  const visibleHeaderInfoFields = headerInfoFields.filter(field => !hiddenHeaderFields.has(field.id))

  const pageBorder = pres.pageBorder || 'none'
  const borderStyles = {
    none: 'none',
    thin: '1.5px solid #1e293b',
    thick: '3.5px solid #1e293b',
    double: '4.5px double #1e293b',
  }

  const pageStyle = {
    width: isHalf ? '148mm' : '210mm',
    minHeight: isHalf ? '210mm' : '297mm',
    margin: '0 auto',
    padding: isHalf ? '16mm 14mm' : '20mm 18mm',
    background: '#ffffff',
    color: '#0f172a',
    border: borderStyles[pageBorder] || 'none',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
    borderRadius: '4px',
    boxSizing: 'border-box',
    position: 'relative',
    fontFamily: isUrdu
      ? "'ASSPS Jameel Noori', 'Jameel Noori Nastaleeq', 'Jameel Noori Nastaleeq Kasheeda', 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif"
      : "'Times New Roman', 'Arial', serif",
  }

  return (
    <article
      data-canonical-working-document={workingDoc.workingDocumentId}
      className={`canonical-paper-surface page-border-${pageBorder}`}
      style={pageStyle}
      dir={isUrdu ? 'rtl' : 'ltr'}
    >
      {/* 1. School identity protected; paper metadata remains independently editable. */}
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
              <CanonicalInlineField
                value={schoolAddress}
                onCommit={(value) => store?.setMetadataField?.('schoolAddress', value)}
                isEditing={isEditing}
                placeholder="School address"
                ariaLabel="School address"
                minWidth="180px"
                style={{ fontSize: '11px', color: '#475569' }}
              />
            </div>
          </div>

          {/* Exam Type & Session Badge */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#1e3a8a' }}>
              <CanonicalInlineField
                value={meta.examType || ''}
                onCommit={(value) => store?.setMetadataField?.('examType', value)}
                isEditing={isEditing}
                placeholder="__________"
                ariaLabel="Exam type"
                minWidth="90px"
                textAlign="center"
                style={{ fontSize: '10px', fontWeight: 800 }}
              />
            </div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
              <CanonicalInlineField
                value={meta.session || ''}
                onCommit={(value) => store?.setMetadataField?.('session', value)}
                isEditing={isEditing}
                placeholder="__________"
                ariaLabel="Session"
                minWidth="90px"
                textAlign="center"
                style={{ fontSize: '12px', fontWeight: 900 }}
              />
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
          {visibleHeaderInfoFields.map((field) => (
            <div
              key={field.id}
              style={{
                position: 'relative',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '4px 22px 4px 8px',
                borderRadius: 4,
                fontSize: '11px',
              }}
            >
              <span style={{ color: '#1e3a8a', fontWeight: 800, fontSize: '9px', textTransform: 'uppercase', display: 'block' }}>
                {field.label}
              </span>
              {field.marksField ? (
                <CanonicalInlineField
                  value={field.value}
                  onCommit={(value) => store?.setPaperTotalMarks?.(value)}
                  isEditing={isEditing}
                  placeholder="—"
                  ariaLabel="Total marks"
                  minWidth="36px"
                  numeric
                  style={{ color: '#1e293b', fontSize: '11px', fontWeight: 700 }}
                />
              ) : (
                <CanonicalInlineField
                  value={field.value}
                  onCommit={(value) => store?.setMetadataField?.(field.metadataKey, value)}
                  isEditing={isEditing}
                  placeholder="__________"
                  ariaLabel={field.label}
                  minWidth="58px"
                  style={{ color: '#1e293b', fontSize: '11px', fontWeight: 700 }}
                />
              )}
              {isEditing && (
                <button
                  type="button"
                  className="no-print"
                  aria-label={'Remove ' + field.label + ' field'}
                  onClick={() => store?.hideHeaderField?.(field.id)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '3px',
                    border: 'none',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {(meta.customFields || []).map((field) => (
            <div
              key={field.id}
              style={{
                position: 'relative',
                background: '#f8fafc',
                border: '1px dashed #94a3b8',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: '11px',
              }}
            >
              <CanonicalInlineField
                value={field.label}
                onCommit={(value) => store?.updateCustomHeaderField?.(field.id, { label: value })}
                isEditing={isEditing}
                placeholder="FIELD"
                ariaLabel="Custom field label"
                minWidth="54px"
                style={{ color: '#1e3a8a', fontWeight: 800, fontSize: '9px', textTransform: 'uppercase' }}
              />
              <div>
                <CanonicalInlineField
                  value={field.value}
                  onCommit={(value) => store?.updateCustomHeaderField?.(field.id, { value })}
                  isEditing={isEditing}
                  placeholder="__________"
                  ariaLabel={field.label || 'Custom field value'}
                  minWidth="64px"
                  style={{ color: '#1e293b', fontSize: '11px', fontWeight: 700 }}
                />
              </div>
              {isEditing && (
                <button
                  type="button"
                  className="no-print"
                  aria-label={`Remove ${field.label || 'custom field'}`}
                  onClick={() => store?.removeCustomHeaderField?.(field.id)}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '3px',
                    border: 'none',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {isEditing && (
          <div
            className="no-print"
            style={{
              marginTop: '6px',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
            }}
          >
            {headerInfoFields
              .filter(field => hiddenHeaderFields.has(field.id))
              .map(field => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => store?.restoreHeaderField?.(field.id)}
                  aria-label={'Restore ' + field.label + ' field'}
                  style={{
                    border: '1px dashed #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  + {field.label}
                </button>
              ))}
            <button
              type="button"
              onClick={() => store?.addCustomHeaderField?.('Field', '')}
              style={{
                border: '1px dashed #94a3b8',
                background: '#f8fafc',
                color: '#475569',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              + Add header field
            </button>
          </div>
        )}

        {(meta.generalInstructions || isEditing) && (
          <div
            className={!meta.generalInstructions && isEditing ? 'no-print' : undefined}
            dir={isUrdu ? 'rtl' : 'ltr'}
            style={{
              marginTop: '8px',
              padding: '6px 8px',
              borderTop: '1px dashed #cbd5e1',
              fontSize: '11px',
              color: '#334155',
              textAlign: isUrdu ? 'right' : 'left',
            }}
          >
            <strong style={{ marginInlineEnd: '6px', color: '#1e3a8a' }}>General Instructions:</strong>
            <CanonicalInlineField
              value={meta.generalInstructions || ''}
              onCommit={(value) => store?.setMetadataField?.('generalInstructions', value)}
              isEditing={isEditing}
              placeholder="+ Add general instructions"
              ariaLabel="General instructions"
              minWidth="220px"
              textAlign={isUrdu ? 'right' : 'left'}
              multiline
              style={{
                fontSize: '11px',
                color: '#334155',
                background: isEditing ? 'rgba(248,250,252,0.8)' : 'transparent',
              }}
            />
          </div>
        )}
      </header>

      {/* 2. Main Sections Area */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {workingDoc.sections?.map((section, sIdx) => {
          const secDir = section.direction === 'rtl' ? 'rtl' : (section.direction === 'ltr' ? 'ltr' : (isUrdu ? 'rtl' : 'ltr'))
          const totalMarks = store?.getEffectiveSectionTotal
            ? store.getEffectiveSectionTotal(section.id)
            : (section.authoritativeSectionTotal ?? section.operationalSectionTotal)
          let questionCounter = 0

          const secOverrides = pres.sectionLayoutOverrides?.[section.id] || {}
          const isClass5Q1 = section.id && section.id.includes('class-5-english') && (section.title?.includes('Tick the correct option') || section.id.includes('s02'))
          const mcqLayout = secOverrides.mcqLayout || (isClass5Q1 ? 'table' : 'grid')
          const shortLayout = secOverrides.shortLayout || '1-column'
          const questionBorder = secOverrides.questionBorder || 'none'
          const answerLinesMap = pres.answerLinesByNode || {}

          const qBorderStyles = {
            none: {},
            box: { border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 10px', margin: '6px 0', background: '#fafafa' },
            table: { border: '1.5px solid #1e293b', borderRadius: '0', padding: '6px 8px', margin: '4px 0' },
          }
          const qBorderStyle = qBorderStyles[questionBorder] || {}
          const hasSectionHeading = Boolean(section.title?.trim()) || (isUrdu && Boolean(section.titleUrdu?.trim()))

          return (
            <section
              key={section.id || sIdx}
              data-canonical-section={section.id}
              style={{ marginBottom: '18px' }}
            >
              {/* Section Heading Bar (READ-ONLY in B3, Rule 20, FIX C & D) */}
              {hasSectionHeading && (
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
                  {/* Working section marks. Source authority remains immutable. */}
                  {(isEditing || (totalMarks !== null && totalMarks !== undefined)) && (
                    <span
                      className={'canonical-section-marks-badge' + (!Number.isFinite(totalMarks) ? ' canonical-section-marks-empty' : '')}
                      style={{
                        background: '#1e3a8a',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: '2px',
                      }}
                    >
                      <span>(</span>
                      <CanonicalInlineField
                        value={Number.isFinite(totalMarks) ? String(totalMarks) : ''}
                        onCommit={(value) => store?.setSectionMarks?.(section.id, value)}
                        isEditing={isEditing}
                        placeholder="—"
                        ariaLabel={'Section ' + (sIdx + 1) + ' marks'}
                        minWidth="20px"
                        textAlign="center"
                        numeric
                        style={{
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: isEditing ? 'rgba(255,255,255,0.12)' : 'transparent',
                          borderBottomColor: isEditing ? 'rgba(255,255,255,0.65)' : 'transparent',
                        }}
                      />
                      <span>Marks)</span>
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
                        Working structure changed; review the working marks total.
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
                    <CanonicalInlineField
                      value={isUrdu ? (section.titleUrdu || section.title || '') : (section.title || '')}
                      onCommit={(value) => store?.setSectionTitle?.(section.id, value)}
                      isEditing={isEditing}
                      placeholder="Section title"
                      ariaLabel={'Section ' + (sIdx + 1) + ' title'}
                      minWidth="120px"
                      textAlign={secDir === 'rtl' ? 'right' : 'left'}
                      style={{
                        fontSize: isHalf ? '13px' : '15px',
                        fontWeight: 800,
                        color: '#1e3a8a',
                        background: isEditing ? 'rgba(255,255,255,0.7)' : 'transparent',
                      }}
                    />
                  </h2>
                </div>
              )}

              {!hasSectionHeading && isEditing && (
                <div className="no-print" style={{ marginBottom: '6px', fontSize: '10px', color: '#64748b' }}>
                  <CanonicalInlineField
                    value=""
                    onCommit={(value) => store?.setSectionTitle?.(section.id, value)}
                    isEditing
                    placeholder="+ Add section title"
                    ariaLabel={'Section ' + (sIdx + 1) + ' title'}
                    minWidth="110px"
                    textAlign={secDir === 'rtl' ? 'right' : 'left'}
                    style={{ fontSize: '10px', color: '#64748b' }}
                  />
                </div>
              )}

              {(section.instructions || isEditing) && (
                <div
                  className={!section.instructions && isEditing ? 'no-print' : undefined}
                  style={{ fontSize: '11px', fontStyle: 'italic', color: '#475569', marginBottom: '6px' }}
                >
                  <CanonicalInlineField
                    value={section.instructions || ''}
                    onCommit={(value) => store?.setSectionInstructions?.(section.id, value)}
                    isEditing={isEditing}
                    placeholder="+ Add instruction"
                    ariaLabel={'Section ' + (sIdx + 1) + ' instruction'}
                    minWidth="120px"
                    textAlign={secDir === 'rtl' ? 'right' : 'left'}
                    style={{ fontSize: '11px', fontStyle: 'italic', color: '#475569' }}
                  />
                </div>
              )}

              {/* Section Nodes */}
              <div
                className="canonical-section-nodes"
                dir={secDir}
                style={shortLayout === '2-column-balanced' ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' } : {}}
              >
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
                        const displayQNum = store?.getNodeDisplayNumber
                          ? store.getNodeDisplayNumber(section.id, nodeId, currentQNum)
                          : String(currentQNum)
                        const nodeMarks = store?.getEffectiveNodeMarks
                          ? store.getEffectiveNodeMarks(section.id, nodeId)
                          : (resolvedNode.authoritativeNodeMarks ?? resolvedNode.operationalNodeMarks ?? null)

                        const questionNumberControl = (
                          <span
                            className="canonical-question-number"
                            style={{
                              fontWeight: 800,
                              color: '#1e3a8a',
                              minWidth: '22px',
                              display: 'inline-flex',
                              alignItems: 'baseline',
                              gap: '1px',
                              flexShrink: 0,
                            }}
                          >
                            <CanonicalInlineField
                              value={displayQNum}
                              onCommit={(value) => store?.setNodeDisplayNumber?.(section.id, nodeId, value)}
                              isEditing={isEditing}
                              ariaLabel={'Question ' + currentQNum + ' number'}
                              minWidth="14px"
                              textAlign="center"
                              style={{
                                fontWeight: 800,
                                color: '#1e3a8a',
                                background: isEditing ? 'rgba(239,246,255,0.75)' : 'transparent',
                              }}
                            />
                            <span>.</span>
                          </span>
                        )

                        const questionMarksControl = (isEditing || nodeMarks !== null) ? (
                          <span
                            className={'canonical-question-marks' + (nodeMarks === null ? ' canonical-question-marks-empty' : '')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'baseline',
                              gap: '2px',
                              whiteSpace: 'nowrap',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#475569',
                              flexShrink: 0,
                            }}
                          >
                            <span>(</span>
                            <CanonicalInlineField
                              value={Number.isFinite(nodeMarks) ? String(nodeMarks) : ''}
                              onCommit={(value) => store?.setNodeMarks?.(section.id, nodeId, value)}
                              isEditing={isEditing}
                              placeholder="—"
                              ariaLabel={'Question ' + currentQNum + ' marks'}
                              minWidth="18px"
                              textAlign="center"
                              numeric
                              style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}
                            />
                            <span>Marks)</span>
                          </span>
                        ) : null

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
                                {questionNumberControl}
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
                                {questionMarksControl}
                              </div>
                            </div>
                          )
                        }

                        // 3. MCQ Nodes (Rich text stem + Structured options)
                        if (nodeType === 'mcq') {
                          const fieldName = nodeOverlay?.editableFields ? Object.keys(nodeOverlay.editableFields)[0] || 'stem' : 'stem'
                          const fieldOverlay = nodeOverlay?.editableFields?.[fieldName]
                          const fieldKey = buildFieldKey(workingDoc.baseCanonicalDocumentId, section.id, nodeId, fieldName)

                          if (mcqLayout === 'table') {
                            return (
                              <div
                                key={nodeId}
                                data-node-id={nodeId}
                                data-node-type={nodeType}
                                className="canonical-mcq-table-node"
                                style={{
                                  marginBottom: '6px',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                  ...qBorderStyle,
                                }}
                              >
                                {controlsHeader}
                                <table className="canonical-mcq-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: isHalf ? '11px' : '12px' }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ width: '54px', padding: '6px 8px', fontWeight: 800, color: '#1e3a8a', borderRight: '1px solid #cbd5e1', verticalAlign: 'top', background: '#f8fafc' }}>
                                        {questionNumberControl}
                                        <div style={{ marginTop: '4px' }}>
                                          {questionMarksControl}
                                        </div>
                                      </td>
                                      <td style={{ padding: '6px 10px', borderRight: '1px solid #cbd5e1', verticalAlign: 'top', fontWeight: 600 }}>
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
                                          <div>{resolvedNode.stemText || ''}</div>
                                        )}
                                        {Boolean(answerLinesMap[nodeId] > 0) && (
                                          <div className="canonical-answer-lines" style={{ marginTop: '8px' }}>
                                            {Array.from({ length: answerLinesMap[nodeId] }, (_, lIdx) => (
                                              <div key={lIdx} className="canonical-answer-line" style={{ borderBottom: '1px dashed #64748b', height: '22px', width: '100%', margin: '2px 0' }} />
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      {resolvedNode.options?.map((opt, oIdx) => (
                                        <td
                                          key={opt.id || oIdx}
                                          style={{
                                            padding: '6px 8px',
                                            borderRight: oIdx < (resolvedNode.options.length - 1) ? '1px solid #cbd5e1' : 'none',
                                            verticalAlign: 'top',
                                            width: `${Math.floor(45 / (resolvedNode.options.length || 3))}%`,
                                          }}
                                        >
                                          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                                            <CanonicalOptionLabel option={opt} index={oIdx} direction={nodeDir} />
                                            <span>{opt.text || opt.textUrdu || ''}</span>
                                          </span>
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                                {isEditing && (
                                  <div className="no-print" style={{ padding: '4px 8px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                    <CanonicalStructuredNodeEditor
                                      nodeId={nodeId}
                                      sectionId={section.id}
                                      resolvedNode={resolvedNode}
                                      store={store}
                                      dir={nodeDir}
                                      isEditing={isEditing}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          }

                          // Classic or Grid Layout
                          return (
                            <div
                              key={nodeId}
                              data-node-id={nodeId}
                              data-node-type={nodeType}
                              style={{ marginBottom: '10px', padding: '2px 0', ...qBorderStyle }}
                            >
                              {controlsHeader}
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                {questionNumberControl}
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
                                  {Boolean(answerLinesMap[nodeId] > 0) && (
                                    <div className="canonical-answer-lines" style={{ marginTop: '8px' }}>
                                      {Array.from({ length: answerLinesMap[nodeId] }, (_, lIdx) => (
                                        <div key={lIdx} className="canonical-answer-line" style={{ borderBottom: '1px dashed #64748b', height: '22px', width: '100%', margin: '2px 0' }} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {questionMarksControl}
                              </div>

                              {isEditing ? (
                                <CanonicalStructuredNodeEditor
                                  nodeId={nodeId}
                                  sectionId={section.id}
                                  resolvedNode={resolvedNode}
                                  store={store}
                                  dir={nodeDir}
                                  isEditing={isEditing}
                                />
                              ) : (
                                <div
                                  className={mcqLayout === 'classic' ? 'canonical-mcq-options-classic' : 'canonical-mcq-options-grid'}
                                  dir={nodeDir}
                                  style={
                                    mcqLayout === 'classic'
                                      ? { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', paddingLeft: nodeDir === 'rtl' ? '0' : '24px', paddingRight: nodeDir === 'rtl' ? '24px' : '0', fontSize: '12px' }
                                      : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '6px', paddingLeft: nodeDir === 'rtl' ? '0' : '24px', paddingRight: nodeDir === 'rtl' ? '24px' : '0', fontSize: '12px' }
                                  }
                                >
                                  {resolvedNode.options?.map((opt, idx) => (
                                    <div key={opt.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <CanonicalOptionLabel option={opt} index={idx} direction={nodeDir} />
                                      <span>{opt.text || opt.textUrdu || ''}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
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
                              ...qBorderStyle,
                            }}
                          >
                            {controlsHeader}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                              {questionNumberControl}
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

                                {/* Answer blank lines (FIX F, FIX H) */}
                                {Boolean(answerLinesMap[nodeId] > 0) && (
                                  <div className="canonical-answer-lines" style={{ marginTop: '8px', marginBottom: '8px' }}>
                                    {Array.from({ length: answerLinesMap[nodeId] }, (_, lIdx) => (
                                      <div
                                        key={lIdx}
                                        className="canonical-answer-line"
                                        style={{
                                          borderBottom: '1px dashed #64748b',
                                          height: '24px',
                                          width: '100%',
                                          margin: '2px 0',
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              {questionMarksControl}
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
