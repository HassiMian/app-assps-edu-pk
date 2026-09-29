// CanonicalPaperEditorMain.jsx — Top-Level Canonical Word-Like In-Place Editor (Rule 23)
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import './canonicalEditor.css'
import UnifiedPaperCommandBar from './UnifiedPaperCommandBar.jsx'
import CanonicalDocumentRenderer from './CanonicalDocumentRenderer.jsx'
import { EditorWorkingStore } from './editorWorkingStore.js'
import { EditorFieldRegistry } from './EditorFieldRegistry.js'
import {
  saveWorkingDraft,
  loadWorkingDraft,
} from './workingDraftStorage.js'
import { StructuredFocusProvider, INTERACTION_MODE } from './structured/StructuredFocusContext.jsx'

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
  const [activeStructuredKey, setActiveStructuredKey] = useState(null)
  const [isEditMode, setIsEditMode] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(100)
  const canvasRef = useRef(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [externalRevisionToken, setExternalRevisionToken] = useState(1)

  // 2. Subscribe to working store updates (only fired on explicit document-level changes)
  useEffect(() => {
    return store.subscribe((updatedDoc) => {
      setWorkingDoc({ ...updatedDoc })
    })
  }, [store])

  // 2b. A different payload may reuse the same saved-paper id. Hydrate React state
  // from the newly created store immediately instead of showing the previous baseline.
  useEffect(() => {
    setWorkingDoc({ ...store.getWorkingDocument() })
    setActiveFieldKey(null)
    setActiveStructuredKey(null)
    setExternalRevisionToken(token => token + 1)
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

  // 6. Canonical A4 Print Handler — isolate the paper from the application chrome.
  const handlePrint = useCallback(async () => {
    if (typeof document === 'undefined') return
    document.activeElement?.blur?.()
    store.publishDocumentChange()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    const surface = document.querySelector('.canonical-paper-surface')
    if (!surface) return

    const oldFrame = document.getElementById('__canonical_print_frame')
    oldFrame?.remove?.()
    const frame = document.createElement('iframe')
    frame.id = '__canonical_print_frame'
    frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;background:#fff'
    document.body.appendChild(frame)

    const doc = frame.contentDocument
    doc.open()
    doc.write('<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>')
    doc.close()

    document.head.querySelectorAll('style,link[rel="stylesheet"]').forEach(node => {
      doc.head.appendChild(node.cloneNode(true))
    })
    const printSurface = surface.cloneNode(true)
    printSurface.querySelectorAll('.no-print').forEach(node => node.remove())
    printSurface.querySelectorAll('.canonical-question-marks-empty, .canonical-section-marks-empty').forEach(node => node.remove())
    printSurface.querySelectorAll('[data-canonical-inline-editor]').forEach(node => {
      node.removeAttribute('contenteditable')
      node.removeAttribute('role')
      node.removeAttribute('tabindex')
      node.style.borderBottom = 'none'
      node.style.background = 'transparent'
      node.style.padding = '0'
      node.style.cursor = 'default'
      node.style.outline = 'none'
    })
    printSurface.querySelectorAll('[contenteditable]').forEach(node => {
      node.removeAttribute('contenteditable')
    })
    doc.body.appendChild(printSurface)

    try {
      if (doc.fonts) {
        await Promise.race([
          Promise.all([
            doc.fonts.load("16px 'ASSPS Jameel Noori'"),
            doc.fonts.load("16px 'Jameel Noori Nastaleeq'"),
            doc.fonts.ready,
          ]),
          new Promise(resolve => setTimeout(resolve, 2500))
        ])
      }
    } catch (err) {
      console.warn('Canonical print font preload warning:', err)
    }

    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    setTimeout(() => frame.remove(), 3500)
  }, [store])

  // Handle field focus to ensure Tiptap interaction mode is set (Rule 19)
  const handleFocusField = useCallback((fieldKey) => {
    setActiveFieldKey(fieldKey)
    setActiveStructuredKey(null)
    if (store.getWorkingDocument()?.session) {
      store.getWorkingDocument().session.activeInteractionMode = INTERACTION_MODE.TIPTAP
    }
  }, [store])

  // 7. Handle structured undo/redo shortcuts when structured control is focused (Rule 19)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If event target is inside a ProseMirror / Tiptap editable field, NEVER intercept structured shortcuts
      if (e.target?.closest?.('.ProseMirror, .canonical-editable-field')) {
        if (store.getWorkingDocument()?.session) {
          store.getWorkingDocument().session.activeInteractionMode = INTERACTION_MODE.TIPTAP
        }
        return
      }

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

  const handleStructuredModeChange = useCallback((mode) => {
    if (store.getWorkingDocument()?.session) {
      store.getWorkingDocument().session.activeInteractionMode = mode
    }
  }, [store])

  const clampZoom = useCallback(value => Math.max(40, Math.min(180, Math.round(value))), [])
  const handleFitWidth = useCallback(() => {
    const canvas = canvasRef.current
    const paper = canvas?.querySelector?.('.canonical-paper-surface')
    if (!canvas || !paper || !paper.offsetWidth) return
    const available = Math.max(320, canvas.clientWidth - 56)
    setZoomLevel(clampZoom((available / paper.offsetWidth) * 100))
  }, [clampZoom])
  const handleFitPage = useCallback(() => {
    const canvas = canvasRef.current
    const paper = canvas?.querySelector?.('.canonical-paper-surface')
    if (!canvas || !paper || !paper.offsetWidth || !paper.offsetHeight) return
    const widthScale = Math.max(320, canvas.clientWidth - 56) / paper.offsetWidth
    const heightScale = Math.max(320, canvas.clientHeight - 44) / paper.offsetHeight
    setZoomLevel(clampZoom(Math.min(widthScale, heightScale) * 100))
  }, [clampZoom])
  const zoomTransform = `scale(${zoomLevel / 100})`

  return (
    <StructuredFocusProvider
      onActiveStructuredKeyChange={setActiveStructuredKey}
      onModeChange={handleStructuredModeChange}
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
      {/* 1. Unified command shell — the single editing surface for saved papers. */}
      <UnifiedPaperCommandBar
        registry={registry}
        store={store}
        onSaveDraft={handleSaveDraft}
        saving={isSaving}
        saveStatus={saveStatus}
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
        activeFieldKey={activeFieldKey}
        activeStructuredKey={activeStructuredKey}
        onPrint={handlePrint}
        onBack={onReturnToSource}
        documentLabel={workingDoc?.metadata?.title || loadedPaper?.name || loadedPaper?.id}
        zoomLevel={zoomLevel}
        onZoomOut={() => setZoomLevel(z => clampZoom(z - 10))}
        onZoomIn={() => setZoomLevel(z => clampZoom(z + 10))}
        onZoomReset={() => setZoomLevel(100)}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
      />

      {/* 2. Paper Canvas Area */}
      <main
        ref={canvasRef}
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
            onFocusField={handleFocusField}
            externalRevisionToken={externalRevisionToken}
          />
        </div>
      </main>
    </div>
    </StructuredFocusProvider>
  )
}
