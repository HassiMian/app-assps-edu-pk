// EarlyYearsInspector.jsx — Inspector sidebar containing Early Years controls and Source QA Audit Panel
import React, { useState } from 'react'
import { getAllSketchAssets } from '../assets/SketchAssetRegistry.js'
import { LAYOUT_TOKENS } from '../tokens/layoutTokens.js'
import { processSketchFileUpload } from '../upload/uploadSketchValidator.js'
import RenderSketch from '../assets/RenderSketch.jsx'

export default function EarlyYearsInspector({
  currentPaper = null,
  qaFindings = [],
  onClose = null,
  onUpdateQuestionPresentation = null
}) {
  const [activeTab, setActiveTab] = useState('controls') // 'controls' | 'qa'
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(null)

  const questions = currentPaper?.questions || []
  const selectedQuestion = questions[selectedQuestionIdx] || questions[0]
  const allAssets = getAllSketchAssets()

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const registered = await processSketchFileUpload(file)
      setUploadSuccess(`Asset "${registered.name}" uploaded safely! (${registered.id})`)
    } catch (err) {
      setUploadError(err.message)
    }
  }

  return (
    <aside
      className="early-years-inspector no-print"
      style={{
        width: '340px',
        background: '#1e293b',
        borderLeft: '1px solid #475569',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        color: '#f8fafc',
        fontSize: '12px',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Inspector Header with Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155',
          padding: '8px 12px',
          background: '#0f172a'
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              border: 'none',
              background: activeTab === 'controls' ? '#3b82f6' : '#334155',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ⚙️ Controls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            style={{
              padding: '5px 10px',
              borderRadius: '4px',
              border: 'none',
              background: activeTab === 'qa' ? '#3b82f6' : '#334155',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            📋 Source QA ({qaFindings.length})
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Tab 1: Structural Controls */}
      {activeTab === 'controls' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          {/* Question Selector */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>
              Target Question:
            </label>
            <select
              value={selectedQuestionIdx}
              onChange={(e) => setSelectedQuestionIdx(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                background: '#0f172a',
                color: '#fff',
                border: '1px solid #475569',
                fontSize: '12px'
              }}
            >
              {questions.map((q, idx) => (
                <option key={q.id} value={idx}>
                  {q.label}: {q.instruction.slice(0, 30)}... ({q.marks}m)
                </option>
              ))}
            </select>
          </div>

          {selectedQuestion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Visual Presentation Type */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>
                  Visual Type:
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedQuestion.presentationType || 'Standard'}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: '#0f172a',
                    color: '#38bdf8',
                    border: '1px solid #475569',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Sketch Asset Selector */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>
                  Sketch Asset Registry ({allAssets.length} available):
                </label>
                <div
                  style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '6px',
                    background: '#0f172a',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px'
                  }}
                >
                  {allAssets.map((asset) => (
                    <div
                      key={asset.id}
                      title={`${asset.name} (${asset.id})`}
                      style={{
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '4px',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <RenderSketch assetId={asset.id} size="18mm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload User Sketch */}
              <div
                style={{
                  border: '1px dashed #64748b',
                  borderRadius: '6px',
                  padding: '10px',
                  background: '#0f172a'
                }}
              >
                <label style={{ display: 'block', color: '#38bdf8', marginBottom: '4px', fontWeight: 'bold' }}>
                  Upload Sketch (SVG, PNG, WebP):
                </label>
                <input
                  type="file"
                  accept=".svg,image/svg+xml,image/png,image/webp"
                  onChange={handleFileUpload}
                  style={{ fontSize: '11px', color: '#cbd5e1' }}
                />
                {uploadError && (
                  <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px' }}>
                    ✕ {uploadError}
                  </div>
                )}
                {uploadSuccess && (
                  <div style={{ color: '#22c55e', fontSize: '10px', marginTop: '4px' }}>
                    ✓ {uploadSuccess}
                  </div>
                )}
              </div>

              {/* Sketch Size Token Selector */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>
                  Sketch Size:
                </label>
                <select
                  defaultValue="choiceVisual"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: '#0f172a',
                    color: '#fff',
                    border: '1px solid #475569',
                    fontSize: '12px'
                  }}
                >
                  <option value="smallVisual">Small Visual (28mm)</option>
                  <option value="choiceVisual">Choice Visual (35mm)</option>
                  <option value="mainVisual">Main Visual (42mm)</option>
                  <option value="colouringVisual">Colouring Visual (54mm)</option>
                  <option value="patternVisual">Pattern Visual (34mm)</option>
                </select>
              </div>

              {/* Answer Lines & Handwriting Spacing */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>
                  Answer Lines:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    defaultValue="3"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: '#0f172a',
                      color: '#fff',
                      border: '1px solid #475569',
                      fontSize: '12px'
                    }}
                  >
                    <option value="1">1 Line</option>
                    <option value="2">2 Lines</option>
                    <option value="3">3 Lines</option>
                    <option value="4">4 Lines</option>
                    <option value="5">5 Lines</option>
                  </select>
                  <select
                    defaultValue="11"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: '#0f172a',
                      color: '#fff',
                      border: '1px solid #475569',
                      fontSize: '12px'
                    }}
                  >
                    <option value="10">10mm Gap</option>
                    <option value="11">11mm Gap</option>
                    <option value="12">12mm Gap</option>
                  </select>
                </div>
              </div>

              {/* Question Layout Mode */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>
                  Question Layout:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {['stacked', 'two-column', 'visual-left', 'visual-top'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      style={{
                        padding: '6px 8px',
                        background: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        color: '#cbd5e1',
                        fontSize: '11px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Source QA Findings */}
      {activeTab === 'qa' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          <div style={{ marginBottom: '14px', padding: '10px', background: '#0f172a', borderRadius: '6px' }}>
            <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '4px' }}>
              Academic Integrity Rules
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
              Teacher text is authoritative. Do not silently reconcile marks conflicts or ambiguous prompts. Inconsistencies are flagged here for human audit and never auto-mutated.
            </div>
          </div>

          {/* Marks Audit Summary */}
          <div
            style={{
              padding: '10px',
              background: '#0f172a',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '1px solid #334155'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '6px' }}>
              Marks Audit:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span>Header Declared Total:</span>
              <span style={{ fontWeight: 'bold' }}>
                {currentPaper?.headerSource?.totalMarks ?? 'null (omitted)'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span>Questions Marks Sum:</span>
              <span style={{ fontWeight: 'bold' }}>
                {currentPaper?.totalMarksSource?.listedQuestionTotal || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Audit Status:</span>
              <span
                style={{
                  fontWeight: 'bold',
                  color:
                    currentPaper?.totalMarksSource?.conflictStatus === 'SOURCE_TOTAL_CONFLICT'
                      ? '#ef4444'
                      : currentPaper?.totalMarksSource?.conflictStatus === 'AUTHORITATIVE_HEADER_TOTAL_ABSENT'
                      ? '#3b82f6'
                      : '#22c55e'
                }}
              >
                {currentPaper?.totalMarksSource?.conflictStatus || 'SOURCE_OK'}
              </span>
            </div>
          </div>

          {/* Findings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {qaFindings.length === 0 ? (
              <div style={{ padding: '12px', background: '#0f172a', borderRadius: '6px', color: '#4ade80' }}>
                ✓ No academic ambiguities or mark conflicts in this paper.
              </div>
            ) : (
              qaFindings.map((finding) => (
                <div
                  key={finding.id}
                  style={{
                    padding: '10px',
                    background: '#0f172a',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${
                      finding.status === 'SOURCE_TOTAL_CONFLICT'
                        ? '#ef4444'
                        : finding.status === 'AUTHORITATIVE_HEADER_TOTAL_ABSENT'
                        ? '#3b82f6'
                        : '#eab308'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: '#f1f5f9', fontSize: '11px' }}>
                      {finding.title}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: '#334155',
                        color: '#cbd5e1'
                      }}
                    >
                      {finding.status}
                    </span>
                  </div>
                  <div style={{ color: '#cbd5e1', lineHeight: '1.4', fontSize: '11px' }}>
                    {finding.description}
                  </div>
                  <div style={{ color: '#64748b', marginTop: '6px', fontStyle: 'italic', fontSize: '10px' }}>
                    Rule: {finding.academicRule}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
