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
} from './CanonicalEditorExtensions.js'

export default function CanonicalPaperRibbonToolbar({
  registry,
  store,
  onSaveDraft,
  saving = false,
  saveStatus = '',
  isEditMode = true,
  onToggleEditMode,
  activeFieldKey = null,
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

  const runCommand = (commandFn) => {
    if (!activeEditor) return
    commandFn(activeEditor.chain().focus()).run()
  }

  const setTextStyle = (attr, val) => {
    if (!activeEditor) return
    const currentAttrs = activeEditor.getAttributes('textStyle') || {}
    const nextAttrs = { ...currentAttrs, [attr]: val || null }
    if (Object.values(nextAttrs).some(Boolean)) {
      activeEditor.chain().focus().setMark('textStyle', nextAttrs).run()
    } else {
      activeEditor.chain().focus().unsetMark('textStyle').run()
    }
  }

  const currentTextStyle = activeEditor?.getAttributes('textStyle') || {}
  const canUndo = Boolean(activeEditor?.can().undo())
  const canRedo = Boolean(activeEditor?.can().redo())

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
            onClick={() => runCommand(c => c.toggleBold())}
            style={toolBtnStyle(activeEditor?.isActive('bold'))}
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            title="Italic"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.toggleItalic())}
            style={toolBtnStyle(activeEditor?.isActive('italic'))}
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            title="Underline"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.toggleUnderline())}
            style={toolBtnStyle(activeEditor?.isActive('underline'))}
          >
            <Underline size={14} />
          </button>
          <button
            type="button"
            title="Strikethrough"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.toggleStrike())}
            style={toolBtnStyle(activeEditor?.isActive('strike'))}
          >
            <Strikethrough size={14} />
          </button>
          <button
            type="button"
            title="Superscript"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.toggleSuperscript())}
            style={toolBtnStyle(activeEditor?.isActive('superscript'))}
          >
            <Superscript size={14} />
          </button>
          <button
            type="button"
            title="Subscript"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.toggleSubscript())}
            style={toolBtnStyle(activeEditor?.isActive('subscript'))}
          >
            <Subscript size={14} />
          </button>
          <button
            type="button"
            title="Clear Formatting"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.unsetAllMarks())}
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
            value={activeEditor?.getAttributes('highlight')?.color || ''}
            onChange={e => e.target.value ? runCommand(c => c.setHighlight({ color: e.target.value })) : runCommand(c => c.unsetHighlight())}
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
            onClick={() => runCommand(c => c.setTextAlign('left'))}
            style={toolBtnStyle(activeEditor?.isActive({ textAlign: 'left' }))}
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            title="Align Center"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.setTextAlign('center'))}
            style={toolBtnStyle(activeEditor?.isActive({ textAlign: 'center' }))}
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            title="Align Right"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.setTextAlign('right'))}
            style={toolBtnStyle(activeEditor?.isActive({ textAlign: 'right' }))}
          >
            <AlignRight size={14} />
          </button>
          <button
            type="button"
            title="Justify"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.setTextAlign('justify'))}
            style={toolBtnStyle(activeEditor?.isActive({ textAlign: 'justify' }))}
          >
            <AlignJustify size={14} />
          </button>
          <button
            type="button"
            title="Direction LTR"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.updateAttributes('paragraph', { dir: 'ltr' }).updateAttributes('heading', { dir: 'ltr' }))}
            style={toolBtnStyle(false)}
          >
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            title="Direction RTL (Urdu)"
            onMouseDown={e => e.preventDefault()}
            onClick={() => runCommand(c => c.updateAttributes('paragraph', { dir: 'rtl' }).updateAttributes('heading', { dir: 'rtl' }))}
            style={toolBtnStyle(false)}
          >
            <ArrowLeft size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
