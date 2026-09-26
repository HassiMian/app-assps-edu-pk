// EarlyYearsInspector.jsx — Inspector sidebar with FUNCTIONAL controls wired to EarlyYearsPresentationOverlay
// Controls update presentation overlay WITHOUT mutating academic source JSON.
import React, { useState, useCallback, useMemo } from 'react'
import { getAllSketchAssets } from '../assets/SketchAssetRegistry.js'
import { processSketchFileUpload } from '../upload/uploadSketchValidator.js'
import RenderSketch from '../assets/RenderSketch.jsx'
import {
  getOverlay,
  setOverlay,
  SKETCH_SIZES,
  LAYOUT_SUPPORT,
  isLayoutSupported
} from '../specs/EarlyYearsPresentationOverlay.js'

function getVisualSlotsForQuestion(question) {
  if (!question) return []
  const { presentationType, content } = question

  if (presentationType === 'PictureColoringBlock' && Array.isArray(content?.items)) {
    return content.items.map((item, idx) => ({
      slotId: String(idx),
      label: item.label || `Item ${idx + 1}`,
      defaultSketchId: item.sketchId
    }))
  }

  if (presentationType === 'CircleChoiceWithSketch' && Array.isArray(content?.items)) {
    return content.items.map((item, idx) => ({
      slotId: String(idx),
      label: item.prompt || item.label || `Visual ${idx + 1}`,
      defaultSketchId: item.sketchId
    }))
  }

  if (presentationType === 'VisualMatchingColumns') {
    const slots = []
    if (Array.isArray(content?.leftItems)) {
      content.leftItems.forEach((item, idx) => {
        if (item.sketchId) {
          slots.push({
            slotId: `left-${idx}`,
            label: `Left: ${item.text || item.label || idx + 1}`,
            defaultSketchId: item.sketchId
          })
        }
      })
    }
    if (Array.isArray(content?.rightItems)) {
      content.rightItems.forEach((item, idx) => {
        if (item.sketchId) {
          slots.push({
            slotId: `right-${idx}`,
            label: `Right: ${item.text || item.label || idx + 1}`,
            defaultSketchId: item.sketchId
          })
        }
      })
    }
    return slots
  }

  if (presentationType === 'TraceShapeBlock' && content?.shapeId) {
    return [{
      slotId: '0',
      label: 'Shape',
      defaultSketchId: content.shapeId
    }]
  }

  if (content?.sketchId) {
    return [{
      slotId: '0',
      label: 'Visual',
      defaultSketchId: content.sketchId
    }]
  }

  return []
}

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
  const [assetRevision, setAssetRevision] = useState(0)
  const [selectedAssetId, setSelectedAssetId] = useState(null)
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [sketchSize, setSketchSize] = useState('choiceVisual')
  const [lineCount, setLineCount] = useState(3)
  const [lineGapMm, setLineGapMm] = useState(11)
  const [activeLayout, setActiveLayout] = useState('stacked')

  const questions = currentPaper?.questions || []
  const selectedQuestion = questions[selectedQuestionIdx] || questions[0]

  // All registered sketch assets (single registration query)
  const allAssets = useMemo(() => {
    return getAllSketchAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetRevision])

  // Discover visual slots in target question
  const visualSlots = useMemo(() => {
    return getVisualSlotsForQuestion(selectedQuestion)
  }, [selectedQuestion])

  // Active slot resolution
  const activeSlotId = useMemo(() => {
    if (visualSlots.length === 1) return visualSlots[0].slotId
    return selectedSlotId
  }, [visualSlots, selectedSlotId])

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

  // Sketch asset tile click
  const handleAssetClick = (assetId) => {
    if (visualSlots.length > 1 && !activeSlotId) {
      return // Disabled if slot not selected
    }
    const slotToUse = activeSlotId || (visualSlots.length === 1 ? visualSlots[0].slotId : null)
    if (!slotToUse) return

    setSelectedAssetId(assetId)
    const currentOverlay = getOverlay(currentPaper.id, selectedQuestion.id)
    const existingOverrides = currentOverlay.sketchOverrides || {}
    const newOverrides = {
      ...existingOverrides,
      [slotToUse]: assetId
    }

    const assetObj = allAssets.find((a) => a.id === assetId)
    pushOverlay({
      sketchAssetId: assetId,
      targetVisualSlot: slotToUse,
      sketchOverrides: newOverrides,
      isSessionAsset: Boolean(assetObj?.isSession)
    })
  }

  // File upload — single registration path
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const registered = await processSketchFileUpload(file)
      // Single registration: update revision to re-query allAssets
      setAssetRevision((r) => r + 1)
      setSelectedAssetId(registered.id)

      const slotToUse = activeSlotId || (visualSlots.length === 1 ? visualSlots[0].slotId : null)
      if (slotToUse) {
        const currentOverlay = getOverlay(currentPaper.id, selectedQuestion.id)
        const existingOverrides = currentOverlay.sketchOverrides || {}
        pushOverlay({
          sketchAssetId: registered.id,
          targetVisualSlot: slotToUse,
          sketchOverrides: {
            ...existingOverrides,
            [slotToUse]: registered.id
          },
          isSessionAsset: true
        })
      }

      setUploadSuccess(`Session-only custom asset "${registered.name}" loaded. (${registered.id})`)
    } catch (err) {
      setUploadError(err.message)
    }
  }

  // Sketch size
  const handleSketchSizeChange = (e) => {
    const size = e.target.value
    setSketchSize(size)
    pushOverlay({ sketchSize: size, sketchSizeMm: SKETCH_SIZES[size] })
  }

  // Answer lines
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

  // Layout
  const handleLayoutClick = (mode) => {
    if (!selectedQuestion) return
    if (!isLayoutSupported(selectedQuestion.presentationType, mode)) return
    setActiveLayout(mode)
    pushOverlay({ layout: mode })
  }

  const BTN = { padding: '5px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }
  const TAB_ACTIVE = { ...BTN, background: '#3b82f6', color: '#fff' }
  const TAB_INACTIVE = { ...BTN, background: '#334155', color: '#fff' }

  const isSelectedSessionAsset = Boolean(
    allAssets.find((a) => a.id === selectedAssetId)?.isSession
  )

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
                setSelectedSlotId('')
                // Reset controls to existing overlay for this question
                if (currentPaper && questions[idx]) {
                  const ov = getOverlay(currentPaper.id, questions[idx].id)
                  if (ov.sketchAssetId) setSelectedAssetId(ov.sketchAssetId)
                  if (ov.targetVisualSlot) setSelectedSlotId(ov.targetVisualSlot)
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

              {/* Visual Slot Selector (if multiple slots exist) */}
              {visualSlots.length > 1 && (
                <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #475569' }}>
                  <label style={{ display: 'block', color: '#38bdf8', marginBottom: '4px', fontWeight: 'bold' }}>
                    Target Visual Slot (Required for replacement):
                  </label>
                  <select
                    id="targetVisualSlotSelector"
                    value={selectedSlotId}
                    onChange={(e) => setSelectedSlotId(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: '#1e293b', color: '#fff', border: '1px solid #64748b', fontSize: '12px' }}
                  >
                    <option value="">-- Select a slot to override --</option>
                    {visualSlots.map((slot) => {
                      const ov = getOverlay(currentPaper.id, selectedQuestion.id)
                      const currentSketch = ov?.sketchOverrides?.[slot.slotId] || slot.defaultSketchId
                      return (
                        <option key={slot.slotId} value={slot.slotId}>
                          Slot: {slot.label} (Current: {currentSketch || 'None'})
                        </option>
                      )
                    })}
                  </select>
                  {!selectedSlotId && (
                    <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px' }}>
                      ⚠️ Select a slot above to enable sketch replacement.
                    </div>
                  )}
                </div>
              )}

              {/* Sketch Asset Selector — FUNCTIONAL */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ color: '#94a3b8', fontWeight: 'bold' }}>
                    Sketch Asset ({allAssets.length} available):
                  </label>
                  {visualSlots.length > 1 && !activeSlotId && (
                    <span style={{ fontSize: '10px', color: '#f59e0b' }}>[Slot selection needed]</span>
                  )}
                </div>
                <div
                  id="sketchAssetGrid"
                  style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '6px',
                    background: '#0f172a',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    opacity: (visualSlots.length > 1 && !activeSlotId) ? 0.45 : 1
                  }}
                >
                  {allAssets.map((asset) => {
                    const isDisabled = visualSlots.length > 1 && !activeSlotId
                    return (
                      <div
                        key={asset.id}
                        title={`${asset.name} (${asset.id})${asset.isSession ? ' [Session]' : ''}`}
                        onClick={() => !isDisabled && handleAssetClick(asset.id)}
                        style={{
                          border: selectedAssetId === asset.id ? '2px solid #3b82f6' : '1px solid #334155',
                          borderRadius: '4px',
                          padding: '4px',
                          background: selectedAssetId === asset.id ? '#1e3a5f' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          position: 'relative'
                        }}
                      >
                        <RenderSketch assetId={asset.id} size="18mm" />
                        {asset.isSession && (
                          <span style={{ position: 'absolute', top: '1px', right: '2px', fontSize: '7px', color: '#f59e0b', fontWeight: 'bold' }}>S</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                {selectedAssetId && (
                  <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '4px' }}>
                    ✓ Selected: {selectedAssetId}
                    {isSelectedSessionAsset && (
                      <div style={{ color: '#f59e0b', marginTop: '2px' }}>
                        Session-only custom asset (not persisted after reload)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Upload Sketch — FUNCTIONAL with ONE registration path */}
              <div style={{ border: '1px dashed #64748b', borderRadius: '6px', padding: '10px', background: '#0f172a' }}>
                <label style={{ display: 'block', color: '#38bdf8', marginBottom: '4px', fontWeight: 'bold' }}>
                  Upload Sketch (SVG, PNG, WebP):
                </label>
                <input
                  id="sketchFileInput"
                  type="file"
                  accept=".svg,image/svg+xml,image/png,image/webp"
                  onChange={handleFileUpload}
                  style={{ fontSize: '11px', color: '#cbd5e1' }}
                />
                {uploadError && <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px' }}>✕ {uploadError}</div>}
                {uploadSuccess && (
                  <div style={{ color: '#22c55e', fontSize: '10px', marginTop: '4px' }}>
                    ✓ {uploadSuccess}<br />
                    <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Session-only custom asset — no claim of persistence after reload.</span>
                  </div>
                )}
              </div>

              {/* Sketch Size — FUNCTIONAL */}
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}>Sketch Size:</label>
                <select
                  id="sketchSizeSelector"
                  value={sketchSize}
                  onChange={handleSketchSizeChange}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569', fontSize: '12px' }}
                >
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
                  <select
                    id="answerLineCountSelector"
                    value={lineCount}
                    onChange={handleLineCountChange}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569', fontSize: '12px' }}
                  >
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} Line{n !== 1 ? 's' : ''}</option>)}
                  </select>
                  <select
                    id="answerLineGapSelector"
                    value={lineGapMm}
                    onChange={handleLineGapChange}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #475569', fontSize: '12px' }}
                  >
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
                        id={`layout-btn-${mode}`}
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
