import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  getAllEarlyYearsPapers,
  getEarlyYearsPaperById,
  getQAFindingsForPaper
} from './data/earlyYearsSourceStore.js'
import EarlyYearsPaperContainer from './components/EarlyYearsPaperContainer.jsx'
import EarlyYearsInspector from './inspector/EarlyYearsInspector.jsx'
import { subscribePresentationOverlay } from './specs/EarlyYearsPresentationOverlay.js'
import {
  EARLY_YEARS_PREMIUM_TEMPLATES,
  EARLY_YEARS_TEMPLATE_OPTIONS,
  getDefaultEarlyYearsTemplateId,
  getEarlyYearsTemplatePreset
} from './earlyYearsTemplates.js'
import './earlyYearsPrint.css'

const TEMPLATE_STORAGE_KEY = 'assps-early-years-template-map-v1'

function readTemplateMap() {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeTemplateMap(map) {
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(map || {}))
  } catch {
    // Local persistence is best-effort only.
  }
}

export default function EarlyYearsWorksheetEditor({
  initialPaperId = 'ey-starter-english-2026',
  onReturnToSource = null
}) {
  const [selectedPaperId, setSelectedPaperId] = useState(initialPaperId)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [showQAPanel, setShowQAPanel] = useState(false)
  const [presentationRevision, setPresentationRevision] = useState(0)
  const [templateId, setTemplateId] = useState('little-scholars-navy')
  const templatePreset = useMemo(() => getEarlyYearsTemplatePreset(templateId), [templateId])

  useEffect(() => {
    if (initialPaperId) {
      setSelectedPaperId(initialPaperId)
    }
  }, [initialPaperId])

  useEffect(() => {
    document.body.classList.add('early-years-mode')
    return () => document.body.classList.remove('early-years-mode')
  }, [])

  // Single notification mechanism: subscriber increments revision exactly once per setOverlay()
  useEffect(() => {
    return subscribePresentationOverlay(() => {
      setPresentationRevision((r) => r + 1)
    })
  }, [])


  const allPapers = useMemo(() => getAllEarlyYearsPapers(), [])
  const currentPaper = useMemo(() => {
    return getEarlyYearsPaperById(selectedPaperId) || allPapers[0]
  }, [selectedPaperId, allPapers])

  const qaFindings = useMemo(() => {
    return currentPaper ? getQAFindingsForPaper(currentPaper.id) : []
  }, [currentPaper])

  useEffect(() => {
    if (!currentPaper?.id) return
    const saved = readTemplateMap()
    const next = saved[currentPaper.id] || getDefaultEarlyYearsTemplateId(currentPaper.classStage)
    setTemplateId(next)
  }, [currentPaper?.id, currentPaper?.classStage])

  const selectTemplate = useCallback((nextId) => {
    setTemplateId(nextId)
    if (!currentPaper?.id) return
    const saved = readTemplateMap()
    saved[currentPaper.id] = nextId
    writeTemplateMap(saved)
  }, [currentPaper?.id])

  const hasConflict = currentPaper?.totalMarksSource?.hasConflict
  const hasAmbiguity = qaFindings.length > 0 && !hasConflict

  const handlePrint = useCallback(async () => {
    if (hasConflict) {
      const headerTotal = currentPaper?.headerSource?.totalMarks ?? currentPaper?.totalMarksSource?.headerTotal ?? 'unknown'
      const listedTotal = currentPaper?.totalMarksSource?.listedQuestionTotal ?? (currentPaper?.questions || []).reduce((sum, q) => sum + (Number(q?.marks) || 0), 0)
      window.alert(`PRINT BLOCKED — marks conflict must be resolved first.\nHeader total: ${headerTotal}\nQuestion marks total: ${listedTotal}`)
      return
    }
    document.activeElement?.blur?.()
    try {
      if (document.fonts) {
        if (currentPaper?.language === 'urdu' || currentPaper?.subject === 'urdu') {
          await Promise.race([
            Promise.all([
              document.fonts.load("18px 'Jameel Noori Nastaleeq'"),
              document.fonts.ready,
            ]),
            new Promise(resolve => setTimeout(resolve, 2000)),
          ])
        } else {
          await document.fonts.ready
        }
      }
    } catch (error) {
      console.warn('Early Years print font preload warning:', error)
    }
    requestAnimationFrame(() => window.print())
  }, [hasConflict, currentPaper])

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
          <div
            data-early-years-template-studio
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 7px',
              borderRadius: 9,
              border: `1px solid ${templatePreset.accent2 || templatePreset.border || '#475569'}66`,
              background: 'rgba(15,23,42,.78)'
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: templatePreset.accent || '#123b67',
                boxShadow: `0 0 0 3px ${templatePreset.accentSoft || '#eef2f7'}`
              }}
            />
            <label htmlFor="early-years-template-select" style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, letterSpacing: '.04em' }}>TEMPLATE</label>
            <select
              id="early-years-template-select"
              aria-label="Early Years template"
              value={templateId}
              onChange={(e) => selectTemplate(e.target.value)}
              style={{
                padding: '5px 7px',
                borderRadius: '6px',
                background: '#071a31',
                color: '#fff',
                border: '1px solid #475569',
                fontSize: '11px',
                cursor: 'pointer',
                maxWidth: '175px',
                fontWeight: 700
              }}
            >
              <optgroup label="Premium Early Years">
                {EARLY_YEARS_PREMIUM_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>{template.label}</option>
                ))}
              </optgroup>
              <optgroup label="Paper Workspace Classics">
                {EARLY_YEARS_TEMPLATE_OPTIONS.filter(template => !template.premiumEarlyYears).map((template) => (
                  <option key={template.id} value={template.id}>{template.label}</option>
                ))}
              </optgroup>
            </select>
            <div data-early-years-template-swatches style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {EARLY_YEARS_PREMIUM_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  aria-label={`Use ${template.label} template`}
                  title={template.label}
                  onClick={() => selectTemplate(template.id)}
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: '50%',
                    padding: 0,
                    cursor: 'pointer',
                    background: template.accent,
                    border: templateId === template.id ? '2px solid #fff' : '1px solid rgba(255,255,255,.35)',
                    boxShadow: templateId === template.id ? `0 0 0 2px ${template.accent2}` : 'none'
                  }}
                />
              ))}
            </div>
          </div>
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
            onClick={handlePrint}
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
              key={currentPaper.id}
              paper={currentPaper}
              scale={zoomLevel}
              presentationRevision={presentationRevision}
              templatePreset={templatePreset}
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
