import React, { useMemo } from 'react'
import { resolvePaperEditorRoute } from './canonicalRouteGuards.js'
import CanonicalPaperEditorMain from './CanonicalPaperEditorMain.jsx'
import LegacyPaperEditorMain from '../PaperEditorMain.jsx'
import EarlyYearsWorksheetEditor from '../earlyYears/EarlyYearsWorksheetEditor.jsx'

export default function PaperEditorRouter({
  loadedPaper = null,
  onReturnToSource = null,
  initialTemplate = null,
}) {
  // Check if Early Years paper
  const isEarlyYears = useMemo(() => {
    if (!loadedPaper || typeof loadedPaper !== 'object') return false
    return (
      loadedPaper.corpusId === 'early-years-first-term-2026' ||
      (typeof loadedPaper.id === 'string' && loadedPaper.id.startsWith('ey-')) ||
      (typeof loadedPaper.classStage === 'string' &&
        ['starter', 'mover', 'flyer'].includes(loadedPaper.classStage.toLowerCase()))
    )
  }, [loadedPaper])

  if (isEarlyYears) {
    return (
      <EarlyYearsWorksheetEditor
        initialPaperId={loadedPaper?.id || 'ey-starter-english-2026'}
        onReturnToSource={onReturnToSource}
      />
    )
  }

  const routingDecision = useMemo(() => {
    return resolvePaperEditorRoute(loadedPaper)
  }, [loadedPaper])

  // 1. CANONICAL_V2 -> Render new B3 in-place canonical editor
  if (routingDecision.route === 'CANONICAL_V2') {
    return (
      <CanonicalPaperEditorMain
        loadedPaper={routingDecision.resolvedPaper}
        onReturnToSource={onReturnToSource}
      />
    )
  }

  // 2. DIAGNOSTIC_DATASET -> Diagnostic view for container payloads
  if (routingDecision.route === 'DIAGNOSTIC_DATASET') {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: '#cbd5e1', background: '#071e34', height: '100vh' }}>
        <h2 style={{ color: '#e8b420' }}>Dataset Container Detected</h2>
        <p>This payload contains multiple exam papers. Please select an individual paper to edit.</p>
        {onReturnToSource && (
          <button
            type="button"
            onClick={onReturnToSource}
            style={{ marginTop: '16px', padding: '6px 14px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Return to Papers List
          </button>
        )}
      </div>
    )
  }

  // 3. LEGACY_CANVAS_V2 / UNKNOWN -> Preserve legacy editor
  return (
    <LegacyPaperEditorMain
      loadedPaper={routingDecision.resolvedPaper}
      onReturnToSource={onReturnToSource}
      initialTemplate={initialTemplate}
    />
  )
}
