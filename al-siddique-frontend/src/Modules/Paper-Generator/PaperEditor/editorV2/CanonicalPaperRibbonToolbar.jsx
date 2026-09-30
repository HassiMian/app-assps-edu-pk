// CanonicalPaperRibbonToolbar.jsx — Dedicated Ribbon Toolbar for Canonical Paper Editor V2 (Rules 14, 18, 41, 42)
import React, { useState, useEffect } from 'react'
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough,
  Superscript, Subscript, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, ArrowLeft, ArrowRight, Highlighter, RemoveFormatting,
  Save, Edit3, CheckCircle2, Printer
} from 'lucide-react'
import {
  SUPPORTED_FONTS,
  SUPPORTED_SIZES,
  SUPPORTED_COLORS,
  SUPPORTED_HIGHLIGHTS,
  SUPPORTED_LINE_HEIGHTS,
  SUPPORTED_PARAGRAPH_SPACING,
} from './CanonicalEditorExtensions.js'
import { parseFieldKey } from './EditorFieldRegistry.js'
import { parseStructuredControlKey } from './structured/structuredFocusHelpers.js'

export default function CanonicalPaperRibbonToolbar({
  registry,
  store,
  onSaveDraft,
  saving = false,
  saveStatus = '',
  isEditMode = true,
  onToggleEditMode,
  activeFieldKey = null,
  activeStructuredKey = null,
  onPrint = null,
}) {
  const [, setSelectionRev] = useState(0)

  // Force re-render of toolbar state when editor selection or state changes
  useEffect(() => {
    const activeEd = registry?.getActiveEditor()
    if (!activeEd) return

    const handleUpdate = () => {
      setSelectionRev(r => r + 1)
    }

    activeEd.on('selectionUpdate', handleUpdate)
    activeEd.on('transaction', handleUpdate)

    return () => {
      activeEd.off('selectionUpdate', handleUpdate)
      activeEd.off('transaction', handleUpdate)
    }
  }, [registry, activeFieldKey])

  const activeEditor = registry?.getActiveEditor()

  const getLiveTarget = () => {
    const key = registry?.getActiveFieldKey?.() || activeFieldKey || null
    const editor = key ? registry?.get?.(key)?.editor : registry?.getActiveEditor?.()
    if (!editor || editor.isDestroyed) return { key: null, editor: null }
    return { key, editor }
  }

  const captureLiveSelection = () => {
    if (registry?.beginToolbarInteraction) return registry.beginToolbarInteraction()
    return registry?.captureActiveSelection?.()
  }

  const restoreAndFocus = (editor, fieldKey = null) => {
    if (!editor || editor.isDestroyed) return null
    const key = fieldKey || registry?.getActiveFieldKey?.() || activeFieldKey
    const sel = registry?.getSelection?.(key)
    let chain = editor.chain()
    if (sel && typeof sel.from === 'number' && typeof sel.to === 'number') {
      const maxPos = Math.max(1, Number(editor.state?.doc?.content?.size || 1))
      const from = Math.max(1, Math.min(sel.from, maxPos))
      const to = Math.max(from, Math.min(sel.to, maxPos))
      chain = chain.setTextSelection({ from, to })
    }
    return chain.focus()
  }

  const runCommand = (commandFn) => {
    const { key, editor } = getLiveTarget()
    if (!editor) return false
    const chain = restoreAndFocus(editor, key)
    if (!chain) return false
    try {
      commandFn(chain).run()
      if (editor.state?.selection) {
        registry?.saveSelection?.(key, editor.state.selection, { force: true })
      }
      return true
    } finally {
      registry?.endToolbarInteraction?.(key, { saveCurrent: true })
    }
  }

  const isStructuredTarget = Boolean(activeStructuredKey)
  const currentStructuredStyle = isStructuredTarget
    ? (store?.getStructuredFieldStyle?.(activeStructuredKey) || {})
    : {}

  const setStructuredStyle = (patch) => {
    if (!isStructuredTarget) return false
    return Boolean(store?.setStructuredFieldStyle?.(activeStructuredKey, patch))
  }

  const toggleStructuredStyle = (key, activeValue, inactiveValue = null) => {
    if (!isStructuredTarget) return false
    const current = currentStructuredStyle?.[key]
    return setStructuredStyle({ [key]: current === activeValue ? inactiveValue : activeValue })
  }

  const setTextStyle = (attr, val) => {
    if (isStructuredTarget) {
      setStructuredStyle({ [attr]: val || null })
      return
    }
    const { key, editor } = getLiveTarget()
    if (!editor) return
    const currentAttrs = editor.getAttributes('textStyle') || {}
    const nextAttrs = { ...currentAttrs, [attr]: val || null }
    const chain = restoreAndFocus(editor, key)
    if (!chain) return
    try {
      if (Object.values(nextAttrs).some(Boolean)) {
        chain.setMark('textStyle', nextAttrs).run()
      } else {
        chain.unsetMark('textStyle').run()
      }
      if (editor.state?.selection) {
        registry?.saveSelection?.(key, editor.state.selection, { force: true })
      }
    } finally {
      registry?.endToolbarInteraction?.(key, { saveCurrent: true })
    }
  }

  const currentTextStyle = isStructuredTarget
    ? currentStructuredStyle
    : (activeEditor?.getAttributes('textStyle') || {})
  const currentBlockType = activeEditor?.isActive('heading') ? 'heading' : 'paragraph'
  const currentBlockAttrs = isStructuredTarget
    ? currentStructuredStyle
    : (activeEditor?.getAttributes(currentBlockType) || {})
  const canUndo = !isStructuredTarget && Boolean(activeEditor?.can().undo())
  const canRedo = !isStructuredTarget && Boolean(activeEditor?.can().redo())

  const toolBtnStyle = (isActive = false, disabled = false) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '28px',
    borderRadius: '4px',
    border: `1px solid ${isActive ? '#C8991A' : 'rgba(255,255,255,0.12)'}`,
    background: isActive ? 'rgba(200,153,26,0.22)' : 'rgba(255,255,255,0.05)',
    color: isActive ? '#f8fafc' : (disabled ? '#475569' : '#e2e8f0'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    padding: 0,
    transition: 'all 0.1s',
  })

  const selectStyle = {
    background: '#0d2238',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '4px',
    padding: '3px 6px',
    fontSize: '11px',
    outline: 'none',
    cursor: 'pointer',
    height: '28px',
  }

  const workingDoc = store?.getWorkingDocument()
  const pres = workingDoc?.presentationOverlay || workingDoc?.presentation || {}
  const currentPageBorder = pres.pageBorder || 'none'

  const activeKey = registry?.getActiveFieldKey?.() || activeFieldKey
  const { sectionId: activeSectionId, nodeId: activeNodeId } = parseFieldKey(activeKey)
  const structuredTarget = parseStructuredControlKey(activeStructuredKey)
  const targetSectionId = structuredTarget?.secId || activeSectionId || workingDoc?.sections?.[0]?.id
  const targetNodeId = structuredTarget?.nodeId || activeNodeId
  const sectionOverrides = targetSectionId ? (pres.sectionLayoutOverrides?.[targetSectionId] || {}) : {}

  const isClass5Q1 = targetSectionId && targetSectionId.includes('class-5-english')
  const currentMcqLayout = sectionOverrides.mcqLayout || (isClass5Q1 ? 'table' : 'grid')
  const currentShortLayout = sectionOverrides.shortLayout || '1-column'
  const currentQuestionBorder = sectionOverrides.questionBorder || 'none'
  const currentAnswerLines = targetNodeId ? (pres.answerLinesByNode?.[targetNodeId] || 0) : 0

  return (
    <header
      className="canonical-paper-ribbon"
      style={{
        background: '#0a192f',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        userSelect: 'none',
        color: '#e2e8f0',
      }}
    >
      {/* Top Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#C8991A', letterSpacing: '0.05em' }}>
            CANONICAL EDITOR V2
          </span>

          <button
            type="button"
            onClick={onToggleEditMode}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: isEditMode ? 'linear-gradient(135deg, #C8991A, #e8b420)' : 'rgba(255,255,255,0.08)',
              color: isEditMode ? '#071e34' : '#e2e8f0',
              border: 'none', borderRadius: '5px', padding: '4px 10px',
              fontWeight: 700, fontSize: '11px', cursor: 'pointer',
            }}
          >
            <Edit3 size={13} /> {isEditMode ? 'Done Editing' : 'Manual Edit'}
          </button>

          {saveStatus && (
            <span style={{ color: saveStatus.includes('success') ? '#4ade80' : '#f87171', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} /> {saveStatus}
            </span>
          )}
        </div>

        {/* Save Draft & Print Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onPrint && (
            <button
              type="button"
              id="canonical-print-btn"
              onClick={onPrint}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', borderRadius: '6px', border: 'none',
                background: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              <Printer size={13} /> Print / Save PDF
            </button>
          )}

          <button
            type="button"
            id="canonical-save-draft-btn"
            onClick={onSaveDraft}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '6px', border: 'none',
              background: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '11px',
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            <Save size={13} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* Formatting Tools Panel */}
      <div
        role="toolbar"
        aria-label="Academic Formatting"
        onPointerDownCapture={() => {
          if (!activeStructuredKey) captureLiveSelection()
        }}
        style={{
          padding: '6px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          minHeight: '40px',
          background: 'rgba(7,25,48,0.7)',
        }}
      >
        {/* Undo / Redo (Native Tiptap history, Rule 19) */}
        <div style={{ display: 'flex', gap: '3px' }}>
          <button
            type="button"
            title="Undo (Ctrl+Z)"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.undo())}
            disabled={!canUndo}
            style={toolBtnStyle(false, !canUndo)}
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            title="Redo (Ctrl+Y)"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.redo())}
            disabled={!canRedo}
            style={toolBtnStyle(false, !canRedo)}
          >
            <Redo2 size={14} />
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />

        {/* Font Family & Size */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <select
            aria-label="Font Family"
            value={currentTextStyle.fontFamily || ''}
            onChange={e => setTextStyle('fontFamily', e.target.value)}
            style={{ ...selectStyle, width: '130px' }}
          >
            <option value="">Default Font</option>
            {SUPPORTED_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          <select
            aria-label="Font Size"
            value={currentTextStyle.fontSize ? String(currentTextStyle.fontSize).replace(/[^0-9]/g, '') : ''}
            onChange={e => setTextStyle('fontSize', e.target.value ? `${e.target.value}pt` : null)}
            style={{ ...selectStyle, width: '65px' }}
          >
            <option value="">Size</option>
            {SUPPORTED_SIZES.map(s => <option key={s} value={s}>{s} pt</option>)}
          </select>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />

        {/* Character Formatting Marks (Selection-only, Rule 18, 43) */}
        <div style={{ display: 'flex', gap: '3px' }}>
          <button
            type="button"
            title="Bold"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? toggleStructuredStyle('fontWeight', 'bold') : runCommand(c => c.toggleBold())}
            style={toolBtnStyle(isStructuredTarget ? currentStructuredStyle.fontWeight === 'bold' : activeEditor?.isActive('bold'))}
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            title="Italic"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? toggleStructuredStyle('fontStyle', 'italic') : runCommand(c => c.toggleItalic())}
            style={toolBtnStyle(isStructuredTarget ? currentStructuredStyle.fontStyle === 'italic' : activeEditor?.isActive('italic'))}
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            title="Underline"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? toggleStructuredStyle('textDecoration', 'underline') : runCommand(c => c.toggleUnderline())}
            style={toolBtnStyle(isStructuredTarget ? currentStructuredStyle.textDecoration === 'underline' : activeEditor?.isActive('underline'))}
          >
            <Underline size={14} />
          </button>
          <button
            type="button"
            title="Strikethrough"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? toggleStructuredStyle('textDecoration', 'line-through') : runCommand(c => c.toggleStrike())}
            style={toolBtnStyle(isStructuredTarget ? currentStructuredStyle.textDecoration === 'line-through' : activeEditor?.isActive('strike'))}
          >
            <Strikethrough size={14} />
          </button>
          <button
            type="button"
            title="Superscript"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { if (!isStructuredTarget) runCommand(c => c.toggleSuperscript()) }}
            disabled={isStructuredTarget}
            style={toolBtnStyle(activeEditor?.isActive('superscript'), isStructuredTarget)}
          >
            <Superscript size={14} />
          </button>
          <button
            type="button"
            title="Subscript"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { if (!isStructuredTarget) runCommand(c => c.toggleSubscript()) }}
            disabled={isStructuredTarget}
            style={toolBtnStyle(activeEditor?.isActive('subscript'), isStructuredTarget)}
          >
            <Subscript size={14} />
          </button>
          <button
            type="button"
            title="Clear Formatting"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? store?.clearStructuredFieldStyle?.(activeStructuredKey) : runCommand(c => c.unsetAllMarks())}
            style={toolBtnStyle(false)}
          >
            <RemoveFormatting size={14} />
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />

        {/* Text Color & Highlight */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <select
            aria-label="Text Color"
            value={currentTextStyle.color || ''}
            onChange={e => setTextStyle('color', e.target.value)}
            style={{ ...selectStyle, width: '70px' }}
          >
            <option value="">Color</option>
            {SUPPORTED_COLORS.map(c => <option key={c} value={c} style={{ background: c, color: '#fff' }}>{c}</option>)}
          </select>

          <select
            aria-label="Highlight"
            value={isStructuredTarget ? (currentStructuredStyle.backgroundColor || '') : (activeEditor?.getAttributes('highlight')?.color || '')}
            onChange={e => {
              if (isStructuredTarget) setStructuredStyle({ backgroundColor: e.target.value || null })
              else if (e.target.value) runCommand(c => c.setHighlight({ color: e.target.value }))
              else runCommand(c => c.unsetHighlight())
            }}
            style={{ ...selectStyle, width: '75px' }}
          >
            <option value="">Highlight</option>
            {SUPPORTED_HIGHLIGHTS.map(h => <option key={h} value={h} style={{ background: h, color: '#000' }}>{h}</option>)}
          </select>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />

        {/* Alignment & Direction */}
        <div style={{ display: 'flex', gap: '3px' }}>
          <button
            type="button"
            title="Align Left"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? setStructuredStyle({ textAlign: 'left' }) : runCommand(c => c.setTextAlign('left'))}
            style={toolBtnStyle(isStructuredTarget ? currentStructuredStyle.textAlign === 'left' : activeEditor?.isActive({ textAlign: 'left' }))}
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            title="Align Center"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? setStructuredStyle({ textAlign: 'center' }) : runCommand(c => c.setTextAlign('center'))}
            style={toolBtnStyle(isStructuredTarget ? currentStructuredStyle.textAlign === 'center' : activeEditor?.isActive({ textAlign: 'center' }))}
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            title="Align Right"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? setStructuredStyle({ textAlign: 'right' }) : runCommand(c => c.setTextAlign('right'))}
            style={toolBtnStyle(isStructuredTarget ? currentStructuredStyle.textAlign === 'right' : activeEditor?.isActive({ textAlign: 'right' }))}
          >
            <AlignRight size={14} />
          </button>
          <button
            type="button"
            title="Justify"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? setStructuredStyle({ textAlign: 'justify' }) : runCommand(c => c.setTextAlign('justify'))}
            style={toolBtnStyle(isStructuredTarget ? currentStructuredStyle.textAlign === 'justify' : activeEditor?.isActive({ textAlign: 'justify' }))}
          >
            <AlignJustify size={14} />
          </button>
          <button
            type="button"
            title="Direction LTR"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? setStructuredStyle({ direction: 'ltr' }) : runCommand(c => c.updateAttributes('paragraph', { dir: 'ltr' }).updateAttributes('heading', { dir: 'ltr' }))}
            style={toolBtnStyle(isStructuredTarget && currentStructuredStyle.direction === 'ltr')}
          >
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            title="Direction RTL (Urdu)"
            onMouseDown={e => e.preventDefault()}
            onClick={() => isStructuredTarget ? setStructuredStyle({ direction: 'rtl' }) : runCommand(c => c.updateAttributes('paragraph', { dir: 'rtl' }).updateAttributes('heading', { dir: 'rtl' }))}
            style={toolBtnStyle(isStructuredTarget && currentStructuredStyle.direction === 'rtl')}
          >
            <ArrowLeft size={14} />
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />

        {/* Granular paragraph spacing applies only to the active rich-text block. */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <select
            aria-label="Line Height"
            value={currentBlockAttrs.lineHeight || ''}
            onChange={e => {
              const value = e.target.value || null
              if (isStructuredTarget) {
                setStructuredStyle({ lineHeight: value })
                return
              }
              runCommand(c => c
                .updateAttributes('paragraph', { lineHeight: value })
                .updateAttributes('heading', { lineHeight: value }))
            }}
            style={{ ...selectStyle, width: '78px' }}
            title="Line spacing for the active paragraph/question"
          >
            <option value="">Line</option>
            {SUPPORTED_LINE_HEIGHTS.map(value => (
              <option key={value} value={value}>{value}×</option>
            ))}
          </select>

          <select
            aria-label="Paragraph Spacing"
            value={currentBlockAttrs.paragraphSpacing || ''}
            onChange={e => {
              const value = e.target.value || null
              if (isStructuredTarget) {
                setStructuredStyle({ paragraphSpacing: value })
                return
              }
              runCommand(c => c
                .updateAttributes('paragraph', { paragraphSpacing: value })
                .updateAttributes('heading', { paragraphSpacing: value }))
            }}
            style={{ ...selectStyle, width: '88px' }}
            title="Space after the active paragraph/question"
          >
            <option value="">After</option>
            {SUPPORTED_PARAGRAPH_SPACING.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />

        {/* Structural Exam-Night Controls (FIX F) */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Page Border */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Page Border</span>
            <select
              aria-label="Page Border"
              id="toolbar-page-border-select"
              value={currentPageBorder}
              onChange={e => store?.setPageBorder?.(e.target.value)}
              style={{ ...selectStyle, width: '75px' }}
            >
              <option value="none">None</option>
              <option value="thin">Thin</option>
              <option value="thick">Thick</option>
              <option value="double">Double</option>
            </select>
          </div>

          {/* MCQ Layout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>MCQ Layout</span>
            <select
              aria-label="MCQ Layout"
              id="toolbar-mcq-layout-select"
              value={currentMcqLayout}
              onChange={e => store?.setMcqLayout?.(targetSectionId, e.target.value)}
              style={{ ...selectStyle, width: '80px' }}
            >
              <option value="table">Table</option>
              <option value="grid">Grid</option>
              <option value="classic">Classic</option>
            </select>
          </div>

          {/* Short Qs Layout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Short Qs</span>
            <select
              aria-label="Short Question Layout"
              id="toolbar-short-layout-select"
              value={currentShortLayout}
              onChange={e => store?.setShortLayout?.(targetSectionId, e.target.value)}
              style={{ ...selectStyle, width: '85px' }}
            >
              <option value="1-column">1 Column</option>
              <option value="2-column-balanced">2 Columns</option>
              <option value="3-column-balanced">3 Columns</option>
              <option value="table-1-column">Table 1-Col</option>
              <option value="table">Table 2-Col</option>
              <option value="table-3-column">Table 3-Col</option>
            </select>
          </div>

          {/* Question Border */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Q Border</span>
            <select
              aria-label="Question Border"
              id="toolbar-question-border-select"
              value={currentQuestionBorder}
              onChange={e => store?.setQuestionBorder?.(targetSectionId, e.target.value)}
              style={{ ...selectStyle, width: '70px' }}
            >
              <option value="none">None</option>
              <option value="box">Box</option>
              <option value="table">Table</option>
            </select>
          </div>

          {/* Answer Lines */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Answer Lines</span>
            <select
              aria-label="Answer Lines"
              id="toolbar-answer-lines-select"
              value={currentAnswerLines}
              onChange={e => store?.setAnswerLines?.(targetNodeId, Number(e.target.value))}
              style={{ ...selectStyle, width: '75px' }}
              title={targetNodeId ? `Applies to active question (${targetNodeId})` : 'Click a question to apply answer lines'}
            >
              <option value="0">None</option>
              <option value="1">1 Line</option>
              <option value="2">2 Lines</option>
              <option value="3">3 Lines</option>
              <option value="4">4 Lines</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  )
}
