// CanonicalPaperEditorMain.jsx — Top-Level Canonical Word-Like In-Place Editor (Rule 23)
import React, { useState, useRef, useEffect, useMemo } from 'react'
import CanonicalPaperRibbonToolbar from './CanonicalPaperRibbonToolbar.jsx'
import CanonicalDocumentRenderer from './CanonicalDocumentRenderer.jsx'
import { EditorWorkingStore } from './editorWorkingStore.js'
import { EditorFieldRegistry } from './EditorFieldRegistry.js'
import {
  saveWorkingDraft,
  loadWorkingDraft,
} from './workingDraftStorage.js'
import { StructuredFocusProvider, INTERACTION_MODE } from './structured/StructuredFocusContext.jsx'
import { ZoomIn, ZoomOut, ArrowLeft } from 'lucide-react'

export default function CanonicalPaperEditorMain({
  loadedPaper,
  onReturnToSource = null,
}) {
  // Performance diagnostics tracking (test-only, zero production overhead, Rule 27)
  if (typeof window !== 'undefined' && window.__B3_DIAGNOSTICS__) {
    window.__B3_DIAGNOSTICS__.rootRenderCount = (window.__B3_DIAGNOSTICS__.rootRenderCount || 0) + 1
  }

  // 1. Initialize stable EditorWorkingStore and EditorFieldRegistry
  const store = useMemo(() => new EditorWorkingStore(loadedPaper), [loadedPaper])
  const registry = useMemo(() => new EditorFieldRegistry(), [loadedPaper])

  const [workingDoc, setWorkingDoc] = useState(() => store.getWorkingDocument())
  const [activeFieldKey, setActiveFieldKey] = useState(null)
  const [isEditMode, setIsEditMode] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [saveStatus, setSaveStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [externalRevisionToken, setExternalRevisionToken] = useState(1)

  // 2. Subscribe to working store updates (only fired on explicit document-level changes)
  useEffect(() => {
    return store.subscribe((updatedDoc) => {
      setWorkingDoc({ ...updatedDoc })
    })
  }, [store])

  // 3. Attempt to load existing compact draft on initial mount (Rule 39)
  useEffect(() => {
    const draftResult = loadWorkingDraft(loadedPaper)
    if (draftResult?.status === 'OK' && draftResult.draft) {
      const applyRes = store.applyCompactDraft(draftResult.draft)
      if (applyRes.status === 'APPLIED') {
        setExternalRevisionToken(t => t + 1)
        setSaveStatus('Loaded previous working draft')
        setTimeout(() => setSaveStatus(''), 3000)
      } else {
        setSaveStatus('Saved draft could not be loaded safely; source paper was left unchanged.')
      }
    } else if (draftResult?.status === 'BASELINE_MISMATCH') {
      setSaveStatus('Baseline modified; draft preserved separately')
      setTimeout(() => setSaveStatus(''), 4500)
    } else if (draftResult?.status === 'CORRUPTED') {
      setSaveStatus('Saved draft could not be loaded safely; source paper was left unchanged.')
    }
  }, [loadedPaper, store])

  // 4. Save Draft Handler (Rules 9, 10, 38)
  const handleSaveDraft = () => {
    setIsSaving(true)
    setSaveStatus('Saving draft...')
    try {
      store.publishDocumentChange()
      const compactDraft = store.exportCompactDraft()
      const result = saveWorkingDraft(compactDraft, store.getBaselineDocument())
      if (result.success) {
        setSaveStatus('Draft saved successfully!')
        setTimeout(() => setSaveStatus(''), 3500)
      }
    } catch (err) {
      console.error('Failed to save working draft:', err)
      setSaveStatus('Failed to save draft.')
    } finally {
      setIsSaving(false)
    }
  }

  // 5. Toggle Edit Mode Handler (Flush document projection before switching, Rule 32)
  const handleToggleEditMode = () => {
    store.publishDocumentChange()
    setIsEditMode(prev => !prev)
  }

  // 6. Handle structured undo/redo shortcuts when structured control is focused
  useEffect(() => {
    const handleKeyDown = (e) => {
      const mode = store.getWorkingDocument()?.session?.activeInteractionMode
      if (mode !== INTERACTION_MODE.STRUCTURED) return

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          e.preventDefault()
          store.redoStructural()
        } else {
          e.preventDefault()
          store.undoStructural()
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        store.redoStructural()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [store])

  const zoomTransform = `scale(${zoomLevel / 100})`

  return (
    <StructuredFocusProvider
      onModeChange={(mode) => {
        if (store.getWorkingDocument()?.session) {
          store.getWorkingDocument().session.activeInteractionMode = mode
        }
      }}
    >
      <div
        className="canonical-paper-editor-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#071e34',
          color: '#e2e8f0',
        }}
      >
      {/* 1. Word-like Ribbon Toolbar */}
      <CanonicalPaperRibbonToolbar
        registry={registry}
        store={store}
        onSaveDraft={handleSaveDraft}
        saving={isSaving}
        saveStatus={saveStatus}
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
        activeFieldKey={activeFieldKey}
      />

      {/* 2. Sub-Toolbar with Mode Toggle & Zoom */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          background: '#0c2744',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onReturnToSource && (
            <button
              type="button"
              onClick={onReturnToSource}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#cbd5e1',
                borderRadius: '5px',
                padding: '4px 10px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={13} /> Back
            </button>
          )}

          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
            Document: <strong>{loadedPaper?.id}</strong>
          </span>
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            title="Zoom Out"
            onClick={() => setZoomLevel(z => Math.max(50, z - 10))}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <ZoomOut size={15} />
          </button>
          <span style={{ minWidth: '42px', textAlign: 'center', fontWeight: 700 }}>{zoomLevel}%</span>
          <button
            type="button"
            title="Zoom In"
            onClick={() => setZoomLevel(z => Math.min(200, z + 10))}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(100)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '11px' }}
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(90)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '11px' }}
          >
            Fit Width
          </button>
        </div>
      </div>

      {/* 3. Paper Canvas Area */}
      <main
        id="canonical-paper-canvas"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          padding: '28px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <div
          className="canonical-preview-container"
          style={{
            transform: zoomTransform,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
        >
          <CanonicalDocumentRenderer
            workingDoc={workingDoc}
            canonicalBaseline={store.getBaselineDocument()}
            isEditing={isEditMode}
            store={store}
            registry={registry}
            activeFieldKey={activeFieldKey}
            onFocusField={setActiveFieldKey}
            externalRevisionToken={externalRevisionToken}
          />
        </div>
      </main>
    </div>
    </StructuredFocusProvider>
  )
}
