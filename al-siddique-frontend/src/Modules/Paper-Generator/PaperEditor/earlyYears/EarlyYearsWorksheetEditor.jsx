// EarlyYearsWorksheetEditor.jsx — Main Worksheet View with Paper Switcher and Preview
import React, { useState, useMemo } from 'react'
import {
  getAllEarlyYearsPapers,
  getEarlyYearsPaperById,
  getQAFindingsForPaper
} from './data/earlyYearsSourceStore.js'
import EarlyYearsPaperContainer from './components/EarlyYearsPaperContainer.jsx'

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

        {/* QA Inspector Sidebar */}
        {showQAPanel && (
          <aside
            className="no-print"
            style={{
              width: '320px',
              background: '#1e293b',
              borderLeft: '1px solid #475569',
              padding: '16px',
              overflowY: 'auto',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc' }}>Source QA Findings</h3>
              <button
                type="button"
                onClick={() => setShowQAPanel(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px' }}>
              Authoritative source audit notes for {currentPaper?.classDisplayName} {currentPaper?.subject}.
            </div>

            {qaFindings.length === 0 ? (
              <div style={{ padding: '12px', background: '#0f172a', borderRadius: '6px', color: '#4ade80', fontSize: '12px' }}>
                ✓ No academic ambiguities or mark conflicts detected in this paper.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {qaFindings.map((finding) => (
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
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f1f5f9' }}>
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
                    <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
                      {finding.description}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
                      Rule: {finding.academicRule}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
