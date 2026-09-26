// CanonicalDocumentRenderer.jsx — Surface Renderer for Canonical Paper Documents (Rules 6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 34)
import React from 'react'
import CanonicalEditableText from './CanonicalEditableText.jsx'
import CanonicalStaticNode from './CanonicalStaticNode.jsx'
import CanonicalStructuredNodeEditor from './structured/CanonicalStructuredNodeEditor.jsx'
import { resolveWorkingSectionNodes } from './structured/structuredNodeProjection.js'
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

                  return workingItems.map(({ resolvedNode, nodeId }) => {
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
                          style={{ marginBottom: '8px', padding: '2px 0' }}
                        >
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
                          style={{ marginBottom: '8px', padding: '2px 0' }}
                        >
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
                          marginBottom: '8px',
                          padding: '2px 0',
                        }}
                      >
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
                  })
                })()}
              </div>
            </section>
          )
        })}
      </main>
    </article>
  )
}
