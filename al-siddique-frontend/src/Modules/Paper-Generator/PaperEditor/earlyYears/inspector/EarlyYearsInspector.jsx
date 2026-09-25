// EarlyYearsInspector.jsx — Inspector sidebar with FUNCTIONAL controls wired to EarlyYearsPresentationOverlay
// Controls update presentation overlay WITHOUT mutating academic source JSON.
import React, { useState, useCallback } from 'react'
import { getAllSketchAssets, registerSessionSketch } from '../assets/SketchAssetRegistry.js'
import { processSketchFileUpload } from '../upload/uploadSketchValidator.js'
import RenderSketch from '../assets/RenderSketch.jsx'
import {
  getOverlay,
  setOverlay,
  SKETCH_SIZES,
  LAYOUT_SUPPORT,
  isLayoutSupported
} from '../specs/EarlyYearsPresentationOverlay.js'

export default function EarlyYearsInspector({
  currentPaper = null,
  qaFindings = [],
  onClose = null,
  onPresentationChange = null   // called with (paperId, questionId, overlayFields) on any change
}) {
  const [activeTab, setActiveTab] = useState('controls')
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(null)
  const [sessionAssets, setSessionAssets] = useState([])
  const [selectedAssetId, setSelectedAssetId] = useState(null)
  const [sketchSize, setSketchSize] = useState('choiceVisual')
  const [lineCount, setLineCount] = useState(3)
  const [lineGapMm, setLineGapMm] = useState(11)
  const [activeLayout, setActiveLayout] = useState('stacked')

  const questions = currentPaper?.questions || []
  const selectedQuestion = questions[selectedQuestionIdx] || questions[0]
  const builtinAssets = getAllSketchAssets()
  const allAssets = [...builtinAssets, ...sessionAssets]

  // Emit overlay update and notify parent
  const pushOverlay = useCallback(
    (fields) => {
      if (!currentPaper || !selectedQuestion) return
      setOverlay(currentPaper.id, selectedQuestion.id, fields)
      if (onPresentationChange) {
        onPresentationChange(currentPaper.id, selectedQuestion.id, {
          ...getOverlay(currentPaper.id, selectedQuestion.id),
          ...fields
        })
      }
    },
    [currentPaper, selectedQuestion, onPresentationChange]
  )

  // ─── Sketch asset selection ───────────────────────────────
  const handleAssetClick = (assetId) => {
    setSelectedAssetId(assetId)
    pushOverlay({ sketchAssetId: assetId, isSessionAsset: sessionAssets.some((a) => a.id === assetId) })
  }

  // ─── File upload ──────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const registered = await processSketchFileUpload(file)
      // Register into registry and local session state
      registerSessionSketch(registered)
      setSessionAssets((prev) => [...prev, registered])
      // Auto-select uploaded asset for current question
      setSelectedAssetId(registered.id)
      pushOverlay({ sketchAssetId: registered.id, isSessionAsset: true })
      setUploadSuccess(`Session-only custom asset "${registered.name}" loaded. (${registered.id})`)
    } catch (err) {
      setUploadError(err.message)
    }
  }

  // ─── Sketch size ──────────────────────────────────────────
  const handleSketchSizeChange = (e) => {
    const size = e.target.value
    setSketchSize(size)
    pushOverlay({ sketchSize: size, sketchSizeMm: SKETCH_SIZES[size] })
  }

  // ─── Answer lines ─────────────────────────────────────────
  const handleLineCountChange = (e) => {
    const count = Number(e.target.value)
    setLineCount(count)
    pushOverlay({ lineCount: count })
  }

  const handleLineGapChange = (e) => {
    const gap = Number(e.target.value)
    setLineGapMm(gap)
    pushOverlay({ lineGapMm: gap })
  }

  // ─── Layout ───────────────────────────────────────────────
  const handleLayoutClick = (mode) => {
    if (!selectedQuestion) return
    if (!isLayoutSupported(selectedQuestion.presentationType, mode)) return
    setActiveLayout(mode)
    pushOverlay({ layout: mode })
  }

  const BTN = { padding: '5px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }
  const TAB_ACTIVE = { ...BTN, background: '#3b82f6', color: '#fff' }
  const TAB_INACTIVE = { ...BTN, background: '#334155', color: '#fff' }

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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', padding: '8px 12px', background: '#0f172a' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" onClick={() => setActiveTab('controls')} style={activeTab === 'controls' ? TAB_ACTIVE : TAB_INACTIVE}>
            ⚙️ Controls
          </button>
          <button type="button" onClick={() => setActiveTab('qa')} style={activeTab === 'qa' ? TAB_ACTIVE : TAB_INACTIVE}>
            📋 Source QA ({qaFindings.length})
          </button>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        )}
      </div>

      {/* CONTROLS TAB */}
      {activeTab === 'controls' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

          {/* Question Selector */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>
              Target Question:
            </label>
            <select
              value={selectedQuestionIdx}
              onChange={(e) => {
                const idx = Number(e.target.value)
                setSelectedQuestionIdx(idx)
                // Reset controls to existing overlay for this question
                if (currentPaper && questions[idx]) {
                  const ov = getOverlay(currentPaper.id, questions[idx].id)
                  if (ov.sketchAssetId) setSelectedAssetId(ov.sketchAssetId)
                  if (ov.sketchSize) setSketchSize(ov.sketchSize)
                  if (ov.lineCount) setLineCount(ov.lineCount)
                  if (ov.lineGapMm) setLineGapMm(ov.lineGapMm)
                  if (ov.layout) setActiveLayout(ov.layout)
                }
              }}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569', fontSize: '12px' }}
            >
              {questions.map((q, idx) => (
                <option key={q.id} value={idx}>
                  {q.label}: {q.instruction.slice(0, 28)}... ({q.marks}m)
                </option>
              ))}
            </select>
          </div>

          {selectedQuestion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Visual Type (read-only) */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Visual Type:</label>
                <input type="text" readOnly value={selectedQuestion.presentationType || 'Standard'}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: '#0f172a', color: '#38bdf8', border: '1px solid #475569', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              {/* Sketch Asset Selector — FUNCTIONAL */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>
                  Sketch Asset ({allAssets.length} available):
                </label>
                <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #475569', borderRadius: '6px', padding: '6px', background: '#0f172a', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {allAssets.map((asset) => (
                    <div
                      key={asset.id}
                      title={`${asset.name} (${asset.id})${asset.isSession ? ' [Session]' : ''}`}
                      onClick={() => handleAssetClick(asset.id)}
                      style={{
                        border: selectedAssetId === asset.id ? '2px solid #3b82f6' : '1px solid #334155',
                        borderRadius: '4px',
                        padding: '4px',
                        background: selectedAssetId === asset.id ? '#1e3a5f' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      <RenderSketch assetId={asset.id} size="18mm" />
                      {asset.isSession && (
                        <span style={{ position: 'absolute', top: '1px', right: '2px', fontSize: '7px', color: '#f59e0b' }}>S</span>
                      )}
                    </div>
                  ))}
                </div>
                {selectedAssetId && (
                  <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '4px' }}>
                    ✓ Selected: {selectedAssetId}
                    {sessionAssets.some((a) => a.id === selectedAssetId) && (
                      <span style={{ color: '#f59e0b', marginLeft: '4px' }}>Session-only custom asset</span>
                    )}
                  </div>
                )}
              </div>

              {/* Upload Sketch — FUNCTIONAL */}
              <div style={{ border: '1px dashed #64748b', borderRadius: '6px', padding: '10px', background: '#0f172a' }}>
                <label style={{ display: 'block', color: '#38bdf8', marginBottom: '4px', fontWeight: 'bold' }}>
                  Upload Sketch (SVG, PNG, WebP):
                </label>
                <input type="file" accept=".svg,image/svg+xml,image/png,image/webp"
                  onChange={handleFileUpload}
                  style={{ fontSize: '11px', color: '#cbd5e1' }} />
                {uploadError && <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px' }}>✕ {uploadError}</div>}
                {uploadSuccess && (
                  <div style={{ color: '#22c55e', fontSize: '10px', marginTop: '4px' }}>
                    ✓ {uploadSuccess}<br />
                    <span style={{ color: '#f59e0b' }}>Session-only custom asset — not persisted on reload.</span>
                  </div>
                )}
              </div>

              {/* Sketch Size — FUNCTIONAL */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Sketch Size:</label>
                <select value={sketchSize} onChange={handleSketchSizeChange}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569', fontSize: '12px' }}>
                  <option value="smallVisual">Small Visual (28mm)</option>
                  <option value="choiceVisual">Choice Visual (35mm)</option>
                  <option value="mainVisual">Main Visual (42mm)</option>
                  <option value="colouringVisual">Colouring Visual (54mm)</option>
                  <option value="patternVisual">Pattern Visual (34mm)</option>
                </select>
              </div>

              {/* Answer Lines — FUNCTIONAL */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Answer Lines:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={lineCount} onChange={handleLineCountChange}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569', fontSize: '12px' }}>
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} Line{n !== 1 ? 's' : ''}</option>)}
                  </select>
                  <select value={lineGapMm} onChange={handleLineGapChange}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569', fontSize: '12px' }}>
                    {[8,9,10,11,12,13,14].map((n) => <option key={n} value={n}>{n}mm Gap</option>)}
                  </select>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  Controls presentation overlay only. Source content unchanged.
                </div>
              </div>

              {/* Question Layout — FUNCTIONAL with disabled states */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Question Layout:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {Object.keys(LAYOUT_SUPPORT).map((mode) => {
                    const supported = isLayoutSupported(selectedQuestion.presentationType, mode)
                    const isActive = activeLayout === mode
                    return (
                      <button
                        key={mode}
                        type="button"
                        disabled={!supported}
                        onClick={() => handleLayoutClick(mode)}
                        title={!supported ? `Not supported for ${selectedQuestion.presentationType}` : ''}
                        style={{
                          padding: '6px 8px',
                          background: isActive ? '#1d4ed8' : supported ? '#0f172a' : '#0a0f1a',
                          border: `1px solid ${isActive ? '#3b82f6' : supported ? '#475569' : '#2d3748'}`,
                          borderRadius: '4px',
                          color: isActive ? '#fff' : supported ? '#cbd5e1' : '#374151',
                          fontSize: '11px',
                          cursor: supported ? 'pointer' : 'not-allowed',
                          textAlign: 'center',
                          opacity: supported ? 1 : 0.45
                        }}
                      >
                        {mode}
                      </button>
                    )
                  })}
                </div>
                {activeLayout && (
                  <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '4px' }}>
                    ✓ Layout: {activeLayout}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* QA TAB */}
      {activeTab === 'qa' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          <div style={{ marginBottom: '14px', padding: '10px', background: '#0f172a', borderRadius: '6px' }}>
            <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '4px' }}>Academic Integrity Rules</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
              Teacher text is authoritative. Do not silently reconcile marks conflicts or ambiguous prompts. Inconsistencies are flagged here for human audit and never auto-mutated.
            </div>
          </div>

          {/* Marks Audit */}
          <div style={{ padding: '10px', background: '#0f172a', borderRadius: '6px', marginBottom: '12px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '6px' }}>Marks Audit:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span>Header Declared Total:</span>
              <span style={{ fontWeight: 'bold' }}>{currentPaper?.headerSource?.totalMarks ?? 'null (omitted)'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span>Questions Marks Sum:</span>
              <span style={{ fontWeight: 'bold' }}>{currentPaper?.totalMarksSource?.listedQuestionTotal || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Audit Status:</span>
              <span style={{
                fontWeight: 'bold',
                color: currentPaper?.totalMarksSource?.conflictStatus === 'SOURCE_TOTAL_CONFLICT' ? '#ef4444'
                  : currentPaper?.totalMarksSource?.conflictStatus === 'AUTHORITATIVE_HEADER_TOTAL_ABSENT' ? '#3b82f6'
                  : '#22c55e'
              }}>
                {currentPaper?.totalMarksSource?.conflictStatus || 'SOURCE_OK'}
              </span>
            </div>
          </div>

          {/* Findings */}
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
                      finding.status === 'SOURCE_TOTAL_CONFLICT' ? '#ef4444'
                      : finding.status === 'SOURCE_REPAIR' ? '#22c55e'
                      : finding.status === 'AUTHORITATIVE_HEADER_TOTAL_ABSENT' ? '#3b82f6'
                      : '#eab308'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: '#f1f5f9', fontSize: '11px' }}>{finding.title}</span>
                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: '#334155', color: '#cbd5e1' }}>
                      {finding.status}
                    </span>
                  </div>
                  <div style={{ color: '#cbd5e1', lineHeight: '1.4', fontSize: '11px' }}>{finding.description}</div>
                  {finding.academicRule && (
                    <div style={{ color: '#64748b', marginTop: '6px', fontStyle: 'italic', fontSize: '10px' }}>
                      Rule: {finding.academicRule}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
