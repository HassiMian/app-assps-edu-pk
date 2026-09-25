import React, { useState, useMemo } from 'react'
import {
  getAllEarlyYearsPapers,
  getEarlyYearsPaperById,
  getQAFindingsForPaper
} from './data/earlyYearsSourceStore.js'
import EarlyYearsPaperContainer from './components/EarlyYearsPaperContainer.jsx'
import EarlyYearsInspector from './inspector/EarlyYearsInspector.jsx'

export default function EarlyYearsWorksheetEditor({
  initialPaperId = 'ey-starter-english-2026',
  onReturnToSource = null
}) {
  const [selectedPaperId, setSelectedPaperId] = useState(initialPaperId)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [showQAPanel, setShowQAPanel] = useState(false)

  const allPapers = useMemo(() => getAllEarlyYearsPapers(), [])
  const currentPaper = useMemo(() => {
    return getEarlyYearsPaperById(selectedPaperId) || allPapers[0]
  }, [selectedPaperId, allPapers])

  const qaFindings = useMemo(() => {
    return currentPaper ? getQAFindingsForPaper(currentPaper.id) : []
  }, [currentPaper])

  const hasConflict = currentPaper?.totalMarksSource?.hasConflict
  const hasAmbiguity = qaFindings.length > 0 && !hasConflict

  return (
    <div
      className="early-years-editor-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: '#0f172a',
        color: '#f8fafc',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}
    >
      {/* Top Application Bar */}
      <header
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onReturnToSource && (
            <button
              type="button"
              onClick={onReturnToSource}
              style={{
                background: '#334155',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              ← Back
            </button>
          )}

          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f1f5f9' }}>
              Early Years Worksheet System
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Starter • Mover • Flyer (9 Complete Papers)
            </div>
          </div>
        </div>

        {/* Paper Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Select Paper:</label>
          <select
            value={currentPaper?.id || ''}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#fff',
              border: '1px solid #475569',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {allPapers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.classDisplayName} {p.subject.toUpperCase()} (Total: {p.headerSource?.totalMarks ?? 'N/A'})
              </option>
            ))}
          </select>

          {/* QA Findings Status Badge */}
          {hasConflict && (
            <span
              onClick={() => setShowQAPanel(!showQAPanel)}
              style={{
                background: '#991b1b',
                color: '#fee2e2',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
              title="Click to view QA conflict"
            >
              ⚠️ MARKS CONFLICT
            </span>
          )}

          {hasAmbiguity && (
            <span
              onClick={() => setShowQAPanel(!showQAPanel)}
              style={{
                background: '#854d0e',
                color: '#fef08a',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
              title="Click to view QA notice"
            >
              ℹ️ SOURCE NOTICE
            </span>
          )}

          {!hasConflict && !hasAmbiguity && (
            <span
              style={{
                background: '#166534',
                color: '#dcfce7',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
            >
              ✓ SOURCE OK
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
            style={{
              background: '#334155',
              color: '#fff',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="Zoom Out"
          >
            -
          </button>
          <span style={{ fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
            style={{
              background: '#334155',
              color: '#fff',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1.0)}
            style={{
              background: '#334155',
              color: '#fff',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Reset
          </button>

          <button
            type="button"
            onClick={() => setShowQAPanel(!showQAPanel)}
            style={{
              background: showQAPanel ? '#3b82f6' : '#334155',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              marginLeft: '4px'
            }}
          >
            QA Panel {qaFindings.length > 0 ? `(${qaFindings.length})` : ''}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              marginLeft: '6px'
            }}
          >
            🖨️ Print Worksheet
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Printable Paper Canvas Area */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            background: '#334155'
          }}
        >
          {currentPaper && (
            <EarlyYearsPaperContainer
              paper={currentPaper}
              scale={zoomLevel}
            />
          )}
        </main>

        {/* Inspector Sidebar */}
        {showQAPanel && (
          <EarlyYearsInspector
            currentPaper={currentPaper}
            qaFindings={qaFindings}
            onClose={() => setShowQAPanel(false)}
          />
        )}
      </div>
    </div>
  )
}
