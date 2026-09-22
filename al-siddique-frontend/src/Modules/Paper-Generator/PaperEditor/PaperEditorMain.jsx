// PaperEditorMain.jsx — Central Word-like Editor for ASSPS Paper Generator
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useEditor } from '@tiptap/react'
import { getPaperEditorExtensions, createTiptapDocFromText } from './extensions/PaperEditorExtensions.js'
import PaperRibbonToolbar from './toolbar/PaperRibbonToolbar.jsx'
import PaperDocumentRenderer from './renderers/PaperDocumentRenderer.jsx'
import { executePaperPrint } from './printing/PrintEngine.js'
import { migrateLegacyPaper } from './migration/migrateLegacyPaper.js'
import { clonePaperDocument } from './core/PaperDocument.js'
import { usePaperStore } from '../usePaperStore.js'
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Edit3, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function PaperEditorMain({
  loadedPaper = null,
  onReturnToSource = null,
  initialTemplate = null,
}) {
  const { updateSavedPaper, savePaper, paperSettings } = usePaperStore()

  // Initialize canonical PaperDocument v2
  const [paper, setPaper] = useState(() => {
    const canonical = migrateLegacyPaper(loadedPaper)
    if (initialTemplate) canonical.templateId = initialTemplate
    if (paperSettings?.schoolName) canonical.metadata.schoolName = paperSettings.schoolName
    if (paperSettings?.address) canonical.metadata.schoolAddress = paperSettings.address
    if (paperSettings?.logo) canonical.metadata.logoUrl = paperSettings.logo
    return canonical
  })

  const [activeSectionId, setActiveSectionId] = useState(() => paper.sections?.[0]?.id || null)
  const [activeQuestionId, setActiveQuestionId] = useState(null)
  const [activeEditor, setActiveEditor] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(100) // Percentage
  const [isEditMode, setIsEditMode] = useState(true)
  const [saveStatus, setSaveStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Document history stack for multi-level Undo / Redo
  const historyStackRef = useRef([clonePaperDocument(paper)])
  const historyIndexRef = useRef(0)
  const [historyRev, setHistoryRev] = useState(0)

  const printContainerRef = useRef(null)

  // Top-level Tiptap editor for fallback ribbon operations
  const editor = useEditor({
    extensions: getPaperEditorExtensions(),
    content: createTiptapDocFromText(''),
    immediatelyRender: false,
  })

  const effectiveEditor = activeEditor || editor
  const canUndo = historyIndexRef.current > 0
  const canRedo = historyIndexRef.current < historyStackRef.current.length - 1

  const recordHistory = (newPaper) => {
    historyStackRef.current = historyStackRef.current.slice(0, historyIndexRef.current + 1)
    historyStackRef.current.push(clonePaperDocument(newPaper))
    historyIndexRef.current = historyStackRef.current.length - 1
    setHistoryRev(r => r + 1)
  }

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1
      const prevPaper = clonePaperDocument(historyStackRef.current[historyIndexRef.current])
      setPaper(prevPaper)
      setHistoryRev(r => r + 1)
    }
  }

  const handleRedo = () => {
    if (historyIndexRef.current < historyStackRef.current.length - 1) {
      historyIndexRef.current += 1
      const nextPaper = clonePaperDocument(historyStackRef.current[historyIndexRef.current])
      setPaper(nextPaper)
      setHistoryRev(r => r + 1)
    }
  }

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y with capture phase
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault()
        e.stopPropagation()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [paper])

  // Handle document updates
  const handleUpdatePaper = (changes) => {
    setPaper(current => {
      const updated = {
        ...current,
        ...changes,
        updatedAt: new Date().toISOString(),
      }
      recordHistory(updated)
      return updated
    })
  }

  // Handle Question update
  const handleUpdateQuestion = (sectionId, questionId, questionChanges) => {
    setPaper(current => {
      const nextSections = current.sections.map(sec => {
        if (sec.id !== sectionId) return sec
        return {
          ...sec,
          questions: sec.questions.map(q => {
            if (q.id !== questionId) return q
            return { ...q, ...questionChanges }
          }),
        }
      })
      const updated = { ...current, sections: nextSections, updatedAt: new Date().toISOString() }
      recordHistory(updated)
      return updated
    })
  }

  // Handle Question Section update
  const handleUpdateSection = (sectionId, sectionChanges) => {
    setPaper(current => {
      const nextSections = current.sections.map(sec => {
        if (sec.id !== sectionId) return sec
        return { ...sec, ...sectionChanges }
      })
      const updated = { ...current, sections: nextSections, updatedAt: new Date().toISOString() }
      recordHistory(updated)
      return updated
    })
  }

  // Save handler
  const handleSave = () => {
    setIsSaving(true)
    setSaveStatus('Saving paper...')
    try {
      const paperToSave = clonePaperDocument(paper)
      paperToSave.name = paperToSave.name || paperToSave.metadata?.title || 'Comprehensive Examination'
      paperToSave.config = paperToSave.config || {
        classLevel: paperToSave.metadata?.classLevel || '9',
        subject: paperToSave.metadata?.subject || 'English',
        examType: paperToSave.metadata?.examTitle || 'First Term Examination 2026',
      }
      let result = null
      if (paper.id && updateSavedPaper) {
        result = updateSavedPaper(paper.id, paperToSave)
      }
      if (!result && savePaper) {
        result = savePaper(paperToSave)
        if (result?.id) {
          setPaper(prev => ({ ...prev, id: result.id, name: result.name }))
        }
      }
      setSaveStatus('Paper saved successfully!')
      setTimeout(() => setSaveStatus(''), 3500)
    } catch (err) {
      console.error('Save failed:', err)
      setSaveStatus('Failed to save paper. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Print handler
  const handlePrint = () => {
    if (!printContainerRef.current) return
    const success = executePaperPrint(printContainerRef.current, { isHalf: paper.pageSetup?.printMode === 'half' })
    if (success) {
      setSaveStatus('Generating print document...')
      setTimeout(() => setSaveStatus(''), 2500)
    }
  }

  const zoomTransform = `scale(${zoomLevel / 100})`

  return (
    <div className="paper-editor-main-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#071e34', color: '#e2e8f0' }}>
      {/* 1. Word-like Ribbon Toolbar */}
      <PaperRibbonToolbar
        editor={effectiveEditor}
        paper={paper}
        onUpdatePaper={handleUpdatePaper}
        activeSectionId={activeSectionId}
        activeQuestionId={activeQuestionId}
        onSave={handleSave}
        onPrint={handlePrint}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={isSaving}
      />

      {/* 2. Sub-Toolbar with Mode Toggle & Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', background: '#0c2744', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onReturnToSource && (
            <button
              type="button"
              onClick={onReturnToSource}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
            >
              <ArrowLeft size={13} /> Back
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditMode(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: isEditMode ? 'linear-gradient(135deg, #C8991A, #e8b420)' : 'rgba(255,255,255,0.08)',
              color: isEditMode ? '#071e34' : '#e2e8f0',
              border: 'none', borderRadius: '6px', padding: '5px 12px',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Edit3 size={13} /> {isEditMode ? 'Done Editing' : 'Manual Edit'}
          </button>

          {saveStatus && (
            <span style={{ color: saveStatus.includes('successfully') ? '#4ade80' : '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} /> {saveStatus}
            </span>
          )}
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" title="Zoom Out" onClick={() => setZoomLevel(z => Math.max(50, z - 10))} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ZoomOut size={15} /></button>
          <span style={{ minWidth: '42px', textAlign: 'center', fontWeight: 700 }}>{zoomLevel}%</span>
          <button type="button" title="Zoom In" onClick={() => setZoomLevel(z => Math.min(200, z + 10))} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ZoomIn size={15} /></button>
          <button type="button" onClick={() => setZoomLevel(100)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '11px' }}>100%</button>
          <button type="button" onClick={() => setZoomLevel(90)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px 6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '11px' }}>Fit Width</button>
        </div>
      </div>

      {/* 3. Paper Document Canvas Area */}
      <main id="paper-canvas" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '28px 16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div
          className="preview-container"
          style={{
            transform: zoomTransform,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
        >
          <div ref={printContainerRef}>
            <PaperDocumentRenderer
              paper={paper}
              isEditing={isEditMode}
              onUpdateQuestion={handleUpdateQuestion}
              onUpdateSection={handleUpdateSection}
              activeSectionId={activeSectionId}
              activeQuestionId={activeQuestionId}
              onSelectSection={setActiveSectionId}
              onSelectQuestion={setActiveQuestionId}
              onSetActiveEditor={setActiveEditor}
              renderMode="screen"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
