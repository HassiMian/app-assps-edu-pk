// PaperDocumentRenderer.jsx — Unified Document Renderer for Editor, Preview, and Print
import React from 'react'
import { getTemplatePreset } from '../templates/paperTemplates.js'
import {
  isUrduText,
  detectDirection,
  getQuestionNumberText,
  getDisplayOptionLabel,
} from '../layouts/urduRtlEngine.js'
import {
  resolveMcqColumns,
  chunkOptions,
  normalizeQuestionOptions,
} from '../layouts/mcqLayoutEngine.js'
import {
  splitQuestionsBalancedVertical,
  splitQuestionsRowWise,
} from '../layouts/shortQuestionLayoutEngine.js'
import { PaperRichTextRenderer } from '../../PaperRichTextEditor.jsx'
import EditableQuestionStem from './EditableQuestionStem.jsx'

export default function PaperDocumentRenderer({
  paper,
  isEditing = false,
  onUpdateQuestion,
  onUpdateSection,
  activeSectionId,
  activeQuestionId,
  onSelectSection,
  onSelectQuestion,
  onSetActiveEditor,
  renderMode = 'screen', // 'screen' | 'print'
}) {
  if (!paper) return null

  const theme = getTemplatePreset(paper.templateId)
  const meta = paper.metadata || {}
  const pageSetup = paper.pageSetup || {}
  const printSettings = paper.printSettings || {}
  const isUrdu = meta.language === 'urdu' || isUrduText(meta.title)
  const isHalf = pageSetup.printMode === 'half'
  const isPrint = renderMode === 'print'

  const fontFamily = isUrdu
    ? (theme.urduFont || "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif")
    : (theme.fontFamily || "'Times New Roman', serif")

  const pageBorderStyle = (() => {
    switch (pageSetup.pageBorder) {
      case 'thin': return `1px solid ${theme.accent}`
      case 'thick': return `3px solid ${theme.accent}`
      case 'double': return `4px double ${theme.accent}`
      default: return 'none'
    }
  })()

  // Root page container style
  const pageStyle = {
    width: isPrint ? '100%' : '210mm',
    minHeight: isPrint ? 'auto' : (isHalf ? '148mm' : '297mm'),
    margin: isPrint ? '0' : '0 auto',
    background: '#ffffff',
    color: '#111827',
    padding: isHalf ? '6mm 8mm' : '10mm 12mm',
    boxSizing: 'border-box',
    boxShadow: isPrint ? 'none' : '0 10px 30px rgba(0,0,0,0.3)',
    fontFamily,
    border: pageBorderStyle,
    borderTop: pageBorderStyle === 'none' ? `6px solid ${theme.accent}` : pageBorderStyle,
    direction: isUrdu ? 'rtl' : 'ltr',
    position: 'relative',
    fontSize: isHalf ? '11px' : '13px',
    lineHeight: isUrdu ? 1.9 : 1.45,
  }

  return (
    <article
      data-premium-template={paper.templateId || 'academic'}
      className="paper-document-surface"
      style={pageStyle}
    >
      {/* Watermark Overlay */}
      {pageSetup.watermark?.enabled && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: pageSetup.watermark.opacity || 0.08,
            transform: `scale(${pageSetup.watermark.scale || 1})`,
            zIndex: 0,
          }}
        >
          {pageSetup.watermark.type === 'logo' && meta.logoUrl ? (
            <img src={meta.logoUrl} alt="" style={{ maxWidth: '380px', maxHeight: '380px', objectFit: 'contain' }} />
          ) : (
            <div style={{ fontSize: '72px', fontWeight: 900, color: theme.accent, textTransform: 'uppercase', transform: 'rotate(-30deg)' }}>
              {pageSetup.watermark.text || 'AL SIDDIQUE'}
            </div>
          )}
        </div>
      )}

      {/* Header Section */}
      <header
        style={{
          position: 'relative',
          zIndex: 1,
          borderBottom: `2.5px solid ${theme.accent}`,
          paddingBottom: '10px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 140px', gap: '12px', alignItems: 'center' }}>
          {/* Logo */}
          <div style={{ width: 64, height: 64, display: 'grid', placeItems: 'center', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 8 }}>
            {meta.logoUrl ? (
              <img src={meta.logoUrl} alt="School logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <strong style={{ color: theme.accent, fontSize: '18px' }}>ASSPS</strong>
            )}
          </div>

          {/* School Name & Address */}
          <div style={{ textAlign: isUrdu ? 'right' : 'left' }}>
            <h1 style={{ margin: 0, fontSize: isHalf ? '18px' : '22px', fontWeight: 900, color: theme.accent, letterSpacing: '0.02em' }}>
              {meta.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'}
            </h1>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
              {meta.schoolAddress || 'Sharif Chowk, Rayya Khas, Narowal'}
            </div>
          </div>

          {/* Exam Type & Session Badge */}
          <div style={{ background: theme.accentSoft, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: theme.accent }}>
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
            ['Class', meta.className || meta.classLevel],
            ['Paper Code', meta.paperCode],
            ['Subject', meta.subject || meta.subjectName],
            ['Time Allowed', meta.timeAllowed],
            ['Total Marks', meta.totalMarks],
            ['Date', meta.examDate || '__________'],
          ].map(([label, val], idx) => (
            <div
              key={idx}
              style={{
                background: theme.accentSoft,
                border: `1px solid ${theme.border}`,
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: '11px',
              }}
            >
              <span style={{ color: theme.accent, fontWeight: 800, fontSize: '9px', textTransform: 'uppercase', display: 'block' }}>{label}</span>
              <strong style={{ color: '#1e293b', fontSize: '11px' }}>{val}</strong>
            </div>
          ))}
        </div>
      </header>

      {/* Bubble Sheet (If Enabled) */}
      {printSettings.printBubbleSheet && (
        <section aria-label="Bubble sheet response area" style={{ position: 'relative', zIndex: 1, marginBottom: '12px', padding: '8px 12px', background: theme.accentSoft, border: `1px solid ${theme.border}`, borderRadius: 6 }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: theme.accent, marginBottom: '6px', textTransform: 'uppercase' }}>
            Objective Bubble Sheet
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700 }}>
                <span style={{ minWidth: '18px' }}>{i + 1}.</span>
                {['A', 'B', 'C', 'D'].map(letter => (
                  <span
                    key={letter}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '15px',
                      height: '15px',
                      borderRadius: '50%',
                      border: '1.2px solid #334155',
                      fontSize: '8px',
                      background: '#fff',
                    }}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Sections */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {paper.sections?.map((section, sIdx) => {
          const isMcq = section.type === 'mcq'
          const isShort = section.type === 'short'
          const secLayout = section.layout || {}
          const secDir = secLayout.direction === 'rtl' ? 'rtl' : (secLayout.direction === 'ltr' ? 'ltr' : (isUrdu ? 'rtl' : 'ltr'))

          return (
            <section
              key={section.id || sIdx}
              data-official-section
              onClick={() => onSelectSection?.(section.id)}
              style={{
                marginBottom: '16px',
                breakInside: 'auto',
              }}
            >
              {/* Section Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isUrdu ? '1fr auto' : 'auto 1fr',
                  gap: '10px',
                  alignItems: 'center',
                  paddingBottom: '4px',
                  marginBottom: '8px',
                  borderBottom: printSettings.showSectionLines !== false ? `2px solid ${theme.accent}` : 'none',
                  direction: isUrdu ? 'rtl' : 'ltr',
                }}
              >
                {/* Marks Badge */}
                <span
                  data-marks-badge
                  style={{
                    color: theme.accent,
                    border: `1px solid ${theme.border}`,
                    background: theme.accentSoft,
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontWeight: 800,
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    direction: 'ltr',
                  }}
                >
                  {section.totalMarks ? `(${section.totalMarks} Marks)` : `(${section.marksPerQuestion || 1} Marks Each)`}
                </span>

                {/* Section Title */}
                <h2
                  data-section-label
                  style={{
                    margin: 0,
                    fontSize: isHalf ? '13px' : '15px',
                    fontWeight: 800,
                    color: theme.accent,
                    textAlign: isUrdu ? 'right' : 'left',
                  }}
                >
                  {isUrdu ? (section.titleUrdu || section.title) : section.title}
                </h2>
              </div>

              {/* Free-form Rich Content Section */}
              {section.richContent ? (
                <div style={{ marginBottom: '8px' }}>
                  <PaperRichTextRenderer value={section.richContent} fallbackText={section.content} direction={secDir} />
                </div>
              ) : null}

              {/* MCQ SECTION RENDERING */}
              {isMcq && (
                <div data-mcq-grid className="mcq-section-container" dir={secDir}>
                  {secLayout.layoutMode === 'matrix-table' ? (
                    // 1. Matrix Table Layout: No. | Question | A | B | C | D
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', tableLayout: 'fixed', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: theme.accentSoft, color: theme.accent }}>
                          <th style={{ border: `1px solid ${theme.border}`, padding: '5px', width: '38px', textAlign: 'center' }}>No.</th>
                          <th style={{ border: `1px solid ${theme.border}`, padding: '5px 8px', textAlign: isUrdu ? 'right' : 'left' }}>Question</th>
                          {['A', 'B', 'C', 'D'].map(l => (
                            <th key={l} style={{ border: `1px solid ${theme.border}`, padding: '5px', width: '14%', textAlign: 'center' }}>
                              ({getDisplayOptionLabel(l, isUrdu)})
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.questions?.map((q, qIdx) => (
                          <tr key={q.id || qIdx}>
                            <td style={{ border: `1px solid ${theme.border}`, padding: '5px', textAlign: 'center', fontWeight: 800, color: theme.accent }}>
                              {q.qNumber || qIdx + 1}
                            </td>
                            <td style={{ border: `1px solid ${theme.border}`, padding: '5px 8px', textAlign: isUrdu ? 'right' : 'left' }}>
                              <EditableQuestionStem
                                question={q}
                                sectionId={section.id}
                                isUrdu={isUrdu}
                                secDir={secDir}
                                isEditing={isEditing}
                                renderMode={renderMode}
                                onUpdateQuestion={onUpdateQuestion}
                                onSetActiveEditor={onSetActiveEditor}
                                onSelectQuestion={onSelectQuestion}
                                onSelectSection={onSelectSection}
                              />
                            </td>
                            {['A', 'B', 'C', 'D'].map(l => {
                              const opt = q.options?.find(o => o.label === l)
                              return (
                                <td key={l} style={{ border: `1px solid ${theme.border}`, padding: '5px', textAlign: 'center', overflowWrap: 'anywhere' }}>
                                  {opt ? (isUrdu ? (opt.textUrdu || opt.text) : opt.text) : '—'}
                                  {printSettings.printAnswerKey && opt?.isCorrect && <strong style={{ color: '#dc2626', marginLeft: 4 }}>✓</strong>}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    // 2. Compact Grid / Classic Layout
                    section.questions?.map((q, qIdx) => {
                      const columns = resolveMcqColumns(q, secLayout.columns || 4)
                      const normOptions = normalizeQuestionOptions(q.options || [], isUrdu)
                      const optRows = chunkOptions(normOptions, columns)
                      const hasBox = secLayout.borderStyle === 'box' || secLayout.layoutMode === 'compact-grid'

                      return (
                        <div
                          key={q.id || qIdx}
                          style={{
                            marginBottom: '10px',
                            border: hasBox ? `1px solid ${theme.border}` : 'none',
                            borderRadius: hasBox ? '6px' : '0',
                            padding: hasBox ? '8px 10px' : '2px 0',
                            background: hasBox ? '#fafbfc' : 'transparent',
                            breakInside: 'avoid',
                          }}
                        >
                          {/* Stem Row */}
                          <div style={{ fontWeight: 700, marginBottom: '6px', textAlign: isUrdu ? 'right' : 'left' }}>
                            <span style={{ color: theme.accent, fontWeight: 800, marginInlineEnd: '6px' }}>
                              {getQuestionNumberText(q.qNumber || qIdx + 1, isUrdu)}
                            </span>
                            <EditableQuestionStem
                              question={q}
                              sectionId={section.id}
                              isUrdu={isUrdu}
                              secDir={secDir}
                              isEditing={isEditing}
                              renderMode={renderMode}
                              onUpdateQuestion={onUpdateQuestion}
                              onSetActiveEditor={onSetActiveEditor}
                              onSelectQuestion={onSelectQuestion}
                              onSelectSection={onSelectSection}
                            />
                          </div>

                          {/* Options Grid / Table */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <tbody>
                              {optRows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {row.map((opt, oIdx) => (
                                    <td
                                      key={opt.label || oIdx}
                                      style={{
                                        width: `${100 / columns}%`,
                                        border: hasBox ? `1px solid ${theme.border}` : 'none',
                                        padding: '4px 8px',
                                        textAlign: isUrdu ? 'right' : 'left',
                                        verticalAlign: 'top',
                                        overflowWrap: 'anywhere',
                                        wordBreak: 'break-word',
                                        fontSize: '12px',
                                        background: '#ffffff',
                                      }}
                                    >
                                      <strong style={{ color: theme.accent, marginInlineEnd: '5px' }}>
                                        ({opt.displayLabel || opt.label})
                                      </strong>
                                      <span>{isUrdu ? (opt.textUrdu || opt.text) : opt.text}</span>
                                      {printSettings.printAnswerKey && opt.isCorrect && (
                                        <span style={{ color: '#dc2626', fontWeight: 800, marginInlineStart: 4 }}>✓</span>
                                      )}
                                    </td>
                                  ))}
                                  {row.length < columns && (
                                    <td colSpan={columns - row.length} style={{ border: hasBox ? `1px solid ${theme.border}` : 'none' }} />
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* SHORT QUESTIONS SECTION RENDERING */}
              {isShort && (
                <div className="short-section-container" dir={secDir}>
                  {secLayout.layoutMode === '2-column-balanced' ? (
                    (() => {
                      const { left, right } = splitQuestionsBalancedVertical(section.questions || [])
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                          {/* Column 1 (Left in LTR, Right in RTL) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {left.map((q, idx) => (
                              <div key={q.id || idx} style={{ breakInside: 'avoid' }}>
                                <div style={{ fontWeight: 600, textAlign: isUrdu ? 'right' : 'left' }}>
                                  <strong style={{ color: theme.accent, marginInlineEnd: 6 }}>
                                    {getQuestionNumberText(q.qNumber || idx + 1, isUrdu)}
                                  </strong>
                                  <EditableQuestionStem
                                    question={q}
                                    sectionId={section.id}
                                    isUrdu={isUrdu}
                                    secDir={secDir}
                                    isEditing={isEditing}
                                    renderMode={renderMode}
                                    onUpdateQuestion={onUpdateQuestion}
                                    onSetActiveEditor={onSetActiveEditor}
                                    onSelectQuestion={onSelectQuestion}
                                    onSelectSection={onSelectSection}
                                  />
                                </div>
                                {q.answerLines > 0 && (
                                  <div style={{ marginTop: 4 }}>
                                    {Array.from({ length: q.answerLines }, (_, lIdx) => (
                                      <div key={lIdx} style={{ height: '20px', borderBottom: '1px solid #cbd5e1' }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Column 2 (Right in LTR, Left in RTL) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {right.map((q, idx) => (
                              <div key={q.id || idx} style={{ breakInside: 'avoid' }}>
                                <div style={{ fontWeight: 600, textAlign: isUrdu ? 'right' : 'left' }}>
                                  <strong style={{ color: theme.accent, marginInlineEnd: 6 }}>
                                    {getQuestionNumberText(q.qNumber || left.length + idx + 1, isUrdu)}
                                  </strong>
                                  <EditableQuestionStem
                                    question={q}
                                    sectionId={section.id}
                                    isUrdu={isUrdu}
                                    secDir={secDir}
                                    isEditing={isEditing}
                                    renderMode={renderMode}
                                    onUpdateQuestion={onUpdateQuestion}
                                    onSetActiveEditor={onSetActiveEditor}
                                    onSelectQuestion={onSelectQuestion}
                                    onSelectSection={onSelectSection}
                                  />
                                </div>
                                {q.answerLines > 0 && (
                                  <div style={{ marginTop: 4 }}>
                                    {Array.from({ length: q.answerLines }, (_, lIdx) => (
                                      <div key={lIdx} style={{ height: '20px', borderBottom: '1px solid #cbd5e1' }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    // 1-Column or Alternative Layout
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {section.questions?.map((q, qIdx) => (
                        <div key={q.id || qIdx} style={{ breakInside: 'avoid' }}>
                          <div style={{ fontWeight: 600, textAlign: isUrdu ? 'right' : 'left' }}>
                            <strong style={{ color: theme.accent, marginInlineEnd: 6 }}>
                              {getQuestionNumberText(q.qNumber || qIdx + 1, isUrdu)}
                            </strong>
                            <EditableQuestionStem
                              question={q}
                              sectionId={section.id}
                              isUrdu={isUrdu}
                              secDir={secDir}
                              isEditing={isEditing}
                              renderMode={renderMode}
                              onUpdateQuestion={onUpdateQuestion}
                              onSetActiveEditor={onSetActiveEditor}
                              onSelectQuestion={onSelectQuestion}
                              onSelectSection={onSelectSection}
                            />
                          </div>
                          {q.answerLines > 0 && (
                            <div style={{ marginTop: 4 }}>
                              {Array.from({ length: q.answerLines }, (_, lIdx) => (
                                <div key={lIdx} style={{ height: '20px', borderBottom: '1px solid #cbd5e1' }} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LONG / OFFICIAL SECTION RENDERING */}
              {!isMcq && !isShort && (
                <div className="general-section-container" dir={secDir}>
                  {section.questions?.map((q, qIdx) => (
                    <div key={q.id || qIdx} style={{ marginBottom: '10px', breakInside: 'avoid' }}>
                      <div style={{ fontWeight: 600, textAlign: isUrdu ? 'right' : 'left' }}>
                        <strong style={{ color: theme.accent, marginInlineEnd: 6 }}>
                          {getQuestionNumberText(q.qNumber || qIdx + 1, isUrdu)}
                        </strong>
                        <EditableQuestionStem
                          question={q}
                          sectionId={section.id}
                          isUrdu={isUrdu}
                          secDir={secDir}
                          isEditing={isEditing}
                          renderMode={renderMode}
                          onUpdateQuestion={onUpdateQuestion}
                          onSetActiveEditor={onSetActiveEditor}
                          onSelectQuestion={onSelectQuestion}
                          onSelectSection={onSelectSection}
                        />
                      </div>
                      {q.answerLines > 0 && (
                        <div style={{ marginTop: 6 }}>
                          {Array.from({ length: q.answerLines }, (_, lIdx) => (
                            <div key={lIdx} style={{ height: '22px', borderBottom: '1px solid #cbd5e1' }} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </main>
    </article>
  )
}
