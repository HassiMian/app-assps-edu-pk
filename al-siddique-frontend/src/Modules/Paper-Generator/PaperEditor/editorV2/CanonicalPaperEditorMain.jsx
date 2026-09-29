// CanonicalPaperEditorMain.jsx — Top-Level Canonical Word-Like In-Place Editor (Rule 23)
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import './canonicalEditor.css'
import UnifiedPaperCommandBar from './UnifiedPaperCommandBar.jsx'
import CanonicalDocumentRenderer from './CanonicalDocumentRenderer.jsx'
import CanonicalQuestionInspector from './CanonicalQuestionInspector.jsx'
import { EditorWorkingStore } from './editorWorkingStore.js'
import { EditorFieldRegistry, parseFieldKey } from './EditorFieldRegistry.js'
import { usePaperStore } from '../../usePaperStore.js'
import {
  saveWorkingDraft,
  loadWorkingDraft,
} from './workingDraftStorage.js'
import { StructuredFocusProvider, INTERACTION_MODE, parseStructuredControlKey } from './structured/StructuredFocusContext.jsx'

export default function CanonicalPaperEditorMain({
  loadedPaper,
  sourcePaperRecord = null,
  onReturnToSource = null,
}) {
  // Performance diagnostics tracking (test-only, zero production overhead, Rule 27)
  if (typeof window !== 'undefined' && window.__B3_DIAGNOSTICS__) {
    window.__B3_DIAGNOSTICS__.rootRenderCount = (window.__B3_DIAGNOSTICS__.rootRenderCount || 0) + 1
  }

  // 1. Initialize stable EditorWorkingStore and EditorFieldRegistry
  const store = useMemo(() => new EditorWorkingStore(loadedPaper), [loadedPaper])
  const registry = useMemo(() => new EditorFieldRegistry(), [loadedPaper])
  const { savedPapers, updateSavedPaper, savePaper } = usePaperStore()

  const [workingDoc, setWorkingDoc] = useState(() => store.getWorkingDocument())
  const [activeFieldKey, setActiveFieldKey] = useState(null)
  const [activeStructuredKey, setActiveStructuredKey] = useState(null)
  const [activeNodeContext, setActiveNodeContext] = useState(null)
  const [persistedPaperId, setPersistedPaperId] = useState(null)
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
    setActiveNodeContext(null)
    const sourceId = sourcePaperRecord?.id
    setPersistedPaperId(sourceId && savedPapers.some(paper => String(paper.id) === String(sourceId)) ? sourceId : null)
    setExternalRevisionToken(token => token + 1)
  }, [store, sourcePaperRecord?.id])

  // 3. Restore the version saved with the Saved Paper first.
  // Tenant draft storage remains a recovery layer, not the primary saved-paper record.
  useEffect(() => {
    const embeddedDraft = sourcePaperRecord?.canonicalWorkingDraft
    if (embeddedDraft) {
      const applyRes = store.applyCompactDraft(embeddedDraft)
      if (applyRes.status === 'APPLIED') {
        setExternalRevisionToken(t => t + 1)
        setSaveStatus('Loaded saved paper edits')
        setTimeout(() => setSaveStatus(''), 2600)
        return
      }
      setSaveStatus('Saved paper edits could not be applied safely; source was left unchanged.')
      return
    }

    const draftResult = loadWorkingDraft(loadedPaper)
    if (draftResult?.status === 'OK' && draftResult.draft) {
      const applyRes = store.applyCompactDraft(draftResult.draft)
      if (applyRes.status === 'APPLIED') {
        setExternalRevisionToken(t => t + 1)
        setSaveStatus('Recovered working draft')
        setTimeout(() => setSaveStatus(''), 3000)
      } else {
        setSaveStatus('Recovery draft could not be loaded safely; source paper was left unchanged.')
      }
    } else if (draftResult?.status === 'BASELINE_MISMATCH') {
      setSaveStatus('Baseline modified; recovery draft preserved separately')
      setTimeout(() => setSaveStatus(''), 4500)
    } else if (draftResult?.status === 'CORRUPTED') {
      setSaveStatus('Recovery draft is invalid; source paper was left unchanged.')
    }
  }, [loadedPaper, sourcePaperRecord, store])

  const flushPendingEditorState = useCallback(async () => {
    if (typeof document !== 'undefined') document.activeElement?.blur?.()
    await new Promise(resolve => setTimeout(resolve, 0))
    store.publishDocumentChange()
  }, [store])

  // 4. Save Paper — persist both a recovery draft and the actual Saved Papers record.
  const handleSaveDraft = async () => {
    setIsSaving(true)
    setSaveStatus('Saving paper...')
    try {
      await flushPendingEditorState()
      const compactDraft = store.exportCompactDraft({ forceV2: true })
      const recoveryResult = saveWorkingDraft(compactDraft, store.getBaselineDocument())
      const current = store.getWorkingDocument()
      const summary = {
        title: current.metadata?.title || sourcePaperRecord?.name || 'Paper',
        classLevel: current.metadata?.className ?? current.metadata?.classLevel ?? '',
        subject: current.metadata?.subject ?? '',
        paperCode: current.metadata?.paperCode ?? '',
        timeAllowed: current.metadata?.timeAllowed ?? '',
        examDate: current.metadata?.examDate ?? '',
        totalMarks: store.getEffectivePaperTotal?.() ?? null,
      }
      const savedPatch = {
        canonicalWorkingDraft: compactDraft,
        canonicalBaselineDocumentId: store.getBaselineDocument()?.id || null,
        canonicalEditorVersion: 'v7-operability',
        canonicalSavedAt: compactDraft.savedAt,
        canonicalSavedSummary: summary,
      }

      const sourceId = sourcePaperRecord?.id
      const storedSourceId = sourceId && savedPapers.some(paper => String(paper.id) === String(sourceId))
        ? sourceId
        : null
      const targetId = persistedPaperId || storedSourceId
      let savedRecord = targetId ? updateSavedPaper?.(targetId, savedPatch) : null

      if (!savedRecord) {
        const {
          id: _sourceId,
          createdAt: _sourceCreatedAt,
          updatedAt: _sourceUpdatedAt,
          canonicalWorkingDraft: _oldDraft,
          canonicalSavedSummary: _oldSummary,
          ...safeSource
        } = sourcePaperRecord || {}
        savedRecord = savePaper?.({
          ...safeSource,
          name: sourcePaperRecord?.name || summary.title || 'Saved Paper',
          config: sourcePaperRecord?.config || {},
          ...savedPatch,
        })
        if (savedRecord?.id) setPersistedPaperId(savedRecord.id)
      } else if (savedRecord?.id) {
        setPersistedPaperId(savedRecord.id)
      }

      if (!savedRecord) {
        throw new Error('Saved Papers record could not be updated')
      }
      setSaveStatus(recoveryResult?.success ? 'Paper saved • Saved Papers updated' : 'Paper saved • recovery backup unavailable')
      setTimeout(() => setSaveStatus(''), 3800)
    } catch (err) {
      console.error('Failed to save canonical paper:', err)
      setSaveStatus('Save failed — current editor state is still open')
    } finally {
      setIsSaving(false)
    }
  }

  // 5. Toggle Edit Mode only after active structured/plain input state is flushed.
  const handleToggleEditMode = async () => {
    await flushPendingEditorState()
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

  const resolveNodeContext = useCallback((sectionId, nodeId, fallback = {}) => {
    if (!sectionId || !nodeId) return null
    const inserted = store.getWorkingDocument()?.structured?.insertedNodes?.[nodeId]
    const baselineSection = store.getBaselineDocument()?.sections?.find(section => section.id === sectionId)
    const baselineNode = baselineSection?.nodes?.find(node => node.id === nodeId)
    return {
      sectionId,
      nodeId,
      nodeType: inserted?.nodeType || inserted?.type || baselineNode?.type || baselineNode?.nodeType || fallback.nodeType || 'question',
      displayNumber: fallback.displayNumber,
      ordinal: fallback.ordinal || 1,
    }
  }, [store])

  // Handle field focus to ensure Tiptap interaction mode and inspector target stay aligned.
  const handleFocusField = useCallback((fieldKey) => {
    setActiveFieldKey(fieldKey)
    setActiveStructuredKey(null)
    const parsed = parseFieldKey(fieldKey)
    if (parsed?.sectionId && parsed?.nodeId) {
      setActiveNodeContext(previous => (
        previous?.nodeId === parsed.nodeId
          ? previous
          : resolveNodeContext(parsed.sectionId, parsed.nodeId, previous || {})
      ))
    }
    if (store.getWorkingDocument()?.session) {
      store.getWorkingDocument().session.activeInteractionMode = INTERACTION_MODE.TIPTAP
    }
  }, [store, resolveNodeContext])

  const handleActiveStructuredKeyChange = useCallback((key) => {
    setActiveStructuredKey(key)
    const parsed = parseStructuredControlKey(key)
    if (parsed?.secId && parsed?.nodeId) {
      setActiveNodeContext(previous => (
        previous?.nodeId === parsed.nodeId
          ? previous
          : resolveNodeContext(parsed.secId, parsed.nodeId, previous || {})
      ))
    }
  }, [resolveNodeContext])

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
      onActiveStructuredKeyChange={handleActiveStructuredKeyChange}
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
        activeNodeContext={activeNodeContext}
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

      {/* 2. Paper canvas + contextual question inspector */}
      <div className="canonical-editor-workspace">
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
            activeNodeId={activeNodeContext?.nodeId || null}
            onFocusField={handleFocusField}
            onSelectNode={setActiveNodeContext}
            externalRevisionToken={externalRevisionToken}
          />
        </div>
      </main>
      {isEditMode && activeNodeContext && (
        <CanonicalQuestionInspector
          activeNode={activeNodeContext}
          workingDoc={workingDoc}
          store={store}
          registry={registry}
          activeFieldKey={activeFieldKey}
          onClose={() => setActiveNodeContext(null)}
        />
      )}
      </div>
    </div>
    </StructuredFocusProvider>
  )
}
