// CanonicalDocumentRenderer.jsx — Surface Renderer for Canonical Document Working Projections (Rules 20, 33, 34)
import React from 'react'
import CanonicalEditableText from './CanonicalEditableText.jsx'
import CanonicalStaticText from './CanonicalStaticText.jsx'
import CanonicalStaticNode from './CanonicalStaticNode.jsx'
import { buildFieldKey } from './EditorFieldRegistry.js'
import './canonicalEditor.css'

export default function CanonicalDocumentRenderer({
  workingDoc,
  canonicalBaseline,
  isEditing = true,
  store,
  registry,
  activeFieldKey = null,
  onFocusField = null,
  externalRevisionToken = 1,
}) {
  if (!workingDoc) return null

  const meta = canonicalBaseline?.metadata || {}
  const pres = workingDoc.presentation || {}
  const isUrdu = pres.language === 'urdu' || pres.direction === 'rtl'
  const isHalf = pres.printMode === 'half'

  const pageStyle = {
    width: '210mm',
    minHeight: isHalf ? '148mm' : '297mm',
    margin: '0 auto',
    background: '#ffffff',
    color: '#111827',
    padding: isHalf ? '6mm 8mm' : '10mm 12mm',
    boxSizing: 'border-box',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    direction: isUrdu ? 'rtl' : 'ltr',
    position: 'relative',
    fontSize: isHalf ? '11px' : '13px',
    lineHeight: isUrdu ? 1.9 : 1.45,
  }

  return (
    <article
      data-canonical-working-document={workingDoc.workingDocumentId}
      className="canonical-paper-surface"
      style={pageStyle}
      dir={isUrdu ? 'rtl' : 'ltr'}
    >
      {/* 1. School Header Section (Strictly Read-Only & Isolated outside Tiptap, Rule 34) */}
      <header
        data-canonical-header
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
            {meta.logoUrl ? (
              <img src={meta.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <strong style={{ color: '#1e3a8a', fontSize: '18px' }}>ASSPS</strong>
            )}
          </div>

          {/* School Name & Address */}
          <div style={{ textAlign: isUrdu ? 'right' : 'left' }}>
            <h1 style={{ margin: 0, fontSize: isHalf ? '18px' : '22px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.02em' }}>
              {meta.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'}
            </h1>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
              {meta.schoolAddress || 'Sharif Chowk, Rayya Khas, Narowal'}
            </div>
          </div>

          {/* Exam Type & Session Badge */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#1e3a8a' }}>
              {meta.examType || 'Examination'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
              {meta.session || '2026-2027'}
            </div>
          </div>
        </div>

        {/* Student Information Table */}
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
            ['Class', meta.className || meta.classLevel || 'General'],
            ['Paper Code', meta.paperCode || 'AP-01'],
            ['Subject', meta.subject || meta.subjectName || 'General'],
            ['Time Allowed', meta.timeAllowed || '1 Hour'],
            ['Total Marks', meta.totalMarks ?? '__________'],
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
              <strong style={{ color: '#1e293b', fontSize: '11px' }}>{val}</strong>
            </div>
          ))}
        </div>
      </header>

      {/* 2. Main Sections Area */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {workingDoc.sections?.map((section, sIdx) => {
          const secDir = section.direction === 'rtl' ? 'rtl' : (section.direction === 'ltr' ? 'ltr' : (isUrdu ? 'rtl' : 'ltr'))
          const totalMarksDisplay = section.authoritativeSectionTotal ?? section.operationalSectionTotal

          return (
            <section
              key={section.id || sIdx}
              data-canonical-section={section.id}
              style={{ marginBottom: '18px' }}
            >
              {/* Section Heading Bar (READ-ONLY in B3, Rule 20) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isUrdu ? '1fr auto' : 'auto 1fr',
                  gap: '10px',
                  alignItems: 'center',
                  paddingBottom: '4px',
                  marginBottom: '8px',
                  borderBottom: '2px solid #1e3a8a',
                  direction: isUrdu ? 'rtl' : 'ltr',
                }}
              >
                {/* Marks Badge */}
                {totalMarksDisplay !== null && totalMarksDisplay !== undefined && (
                  <span
                    data-section-marks-badge
                    style={{
                      color: '#1e3a8a',
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontWeight: 800,
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      direction: 'ltr',
                    }}
                  >
                    ({totalMarksDisplay} Marks)
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
                {section.nodeOverlays?.map((nodeOverlay, nIdx) => {
                  const fieldName = Object.keys(nodeOverlay.editableFields)[0] || 'stem'
                  const fieldOverlay = nodeOverlay.editableFields[fieldName]
                  const fieldKey = buildFieldKey(workingDoc.baseCanonicalDocumentId, section.id, nodeOverlay.nodeId, fieldName)
                  const nodeDir = nodeOverlay.direction === 'rtl' ? 'rtl' : (nodeOverlay.direction === 'ltr' ? 'ltr' : secDir)

                  // Find original baseline node for specialized structural subparts (like MCQ options)
                  const baselineSec = canonicalBaseline?.sections?.find(s => s.id === section.id)
                  const baselineNode = baselineSec?.nodes?.find(n => n.id === nodeOverlay.nodeId)

                  return (
                    <div
                      key={nodeOverlay.nodeId}
                      data-node-id={nodeOverlay.nodeId}
                      data-node-type={nodeOverlay.nodeType}
                      style={{
                        marginBottom: '8px',
                        padding: '2px 0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        {/* Question Number Prefix */}
                        <span style={{ fontWeight: 800, color: '#1e3a8a', minWidth: '18px', userSelect: 'none' }}>
                          {nIdx + 1}.
                        </span>

                        {/* In-Place Editable Stem */}
                        <div style={{ flex: 1 }}>
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
                        </div>
                      </div>

                      {/* Specialized Structured Elements (e.g. MCQ options or Unknown Preserved) */}
                      {baselineNode && (
                        <CanonicalStaticNode node={baselineNode} direction={nodeDir} />
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>
    </article>
  )
}
