// PaperRibbonToolbar.jsx — Office/Word-like Ribbon Toolbar for ASSPS Paper Generator
import React, { useState } from 'react'
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough,
  Superscript, Subscript, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, ArrowLeft, ArrowRight, Table as TableIcon,
  Columns, LayoutGrid, FileText, CheckSquare, Palette,
  Printer, Save, ChevronDown, Sparkles, Layers,
  Highlighter, RemoveFormatting, Rows, Minus, Plus
} from 'lucide-react'
import {
  SUPPORTED_FONTS,
  SUPPORTED_SIZES,
  SUPPORTED_COLORS,
  SUPPORTED_HIGHLIGHTS,
} from '../extensions/PaperEditorExtensions'
import { PAPER_TEMPLATES } from '../templates/paperTemplates'
import { MCQ_LAYOUT_MODES } from '../layouts/mcqLayoutEngine'
import { SHORT_LAYOUT_MODES } from '../layouts/shortQuestionLayoutEngine'

export default function PaperRibbonToolbar({
  editor,
  paper,
  onUpdatePaper,
  activeSectionId,
  activeQuestionId,
  onSave,
  onPrint,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  saving = false,
}) {
  const [activeTab, setActiveTab] = useState('home') // 'home' | 'insert' | 'layout' | 'paper'

  const activeSection = paper?.sections?.find(s => s.id === activeSectionId) || paper?.sections?.[0]
  const isMcqActive = activeSection?.type === 'mcq'
  const isShortActive = activeSection?.type === 'short'
  const isTableActive = editor?.isActive('table')

  const runCommand = (fn) => {
    if (editor) fn(editor.chain().focus()).run()
  }

  const setTextStyle = (attr, val) => {
    if (!editor) return
    const currentAttrs = editor.getAttributes('textStyle') || {}
    const nextAttrs = { ...currentAttrs, [attr]: val || null }
    if (Object.values(nextAttrs).some(Boolean)) {
      editor.chain().focus().setMark('textStyle', nextAttrs).run()
    } else {
      editor.chain().focus().unsetMark('textStyle').run()
    }
  }

  const updateActiveSectionLayout = (key, val, targetType = null) => {
    if (!onUpdatePaper) return
    const targetSection = (targetType && activeSection?.type !== targetType)
      ? (paper?.sections?.find(s => s.type === targetType) || activeSection)
      : (activeSection || paper?.sections?.[0])
    if (!targetSection) return
    const updatedSections = paper.sections.map(sec => {
      if (sec.id === targetSection.id) {
        return {
          ...sec,
          layout: {
            ...sec.layout,
            [key]: val,
          },
        }
      }
      return sec
    })
    onUpdatePaper({ sections: updatedSections })
  }

  const updatePageSetup = (key, val) => {
    if (!onUpdatePaper) return
    onUpdatePaper({
      pageSetup: {
        ...paper.pageSetup,
        [key]: val,
      },
    })
  }

  const updatePrintSettings = (key, val) => {
    if (!onUpdatePaper) return
    onUpdatePaper({
      printSettings: {
        ...paper.printSettings,
        [key]: val,
      },
    })
  }

  const updateActiveSectionAnswerLines = (lines) => {
    if (!onUpdatePaper) return
    const targetSection = (activeSection?.type === 'short' || activeSection?.type === 'official_section')
      ? activeSection
      : (paper?.sections?.find(s => s.type === 'short' || s.type === 'official_section') || activeSection)
    if (!targetSection) return
    const updatedSections = paper.sections.map(sec => {
      if (sec.id === targetSection.id) {
        return {
          ...sec,
          questions: sec.questions.map(q => ({ ...q, answerLines: Number(lines) })),
        }
      }
      return sec
    })
    onUpdatePaper({ sections: updatedSections })
  }

  const currentTextStyle = editor?.getAttributes('textStyle') || {}

  const tabBtnStyle = (tabId) => ({
    padding: '8px 18px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    borderBottom: activeTab === tabId ? '3px solid #C8991A' : '3px solid transparent',
    background: activeTab === tabId ? 'rgba(255,255,255,0.08)' : 'transparent',
    color: activeTab === tabId ? '#ffffff' : '#94a3b8',
    transition: 'all 0.15s ease',
  })

  const toolBtnStyle = (isActive = false, disabled = false) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '30px',
    borderRadius: '6px',
    border: `1px solid ${isActive ? '#C8991A' : 'rgba(255,255,255,0.12)'}`,
    background: isActive ? 'rgba(200,153,26,0.22)' : 'rgba(255,255,255,0.05)',
    color: isActive ? '#f8fafc' : (disabled ? '#475569' : '#e2e8f0'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    padding: 0,
    transition: 'all 0.15s',
  })

  const selectStyle = {
    background: '#0d2238',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
    height: '30px',
  }

  return (
    <header className="paper-ribbon" style={{ background: '#0a192f', borderBottom: '1px solid rgba(255,255,255,0.12)', userSelect: 'none', color: '#e2e8f0' }}>
      {/* Top Ribbon Tabs & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 12px' }}>
        <nav aria-label="Editor ribbon tabs" style={{ display: 'flex', gap: '4px' }}>
          <button type="button" onClick={() => setActiveTab('home')} style={tabBtnStyle('home')}>HOME</button>
          <button type="button" onClick={() => setActiveTab('insert')} style={tabBtnStyle('insert')}>INSERT</button>
          <button type="button" onClick={() => setActiveTab('layout')} style={tabBtnStyle('layout')}>LAYOUT</button>
          <button type="button" onClick={() => setActiveTab('paper')} style={tabBtnStyle('paper')}>PAPER</button>
        </nav>

        {/* Global Save & Print Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 0' }}>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px', border: 'none',
              background: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '12px',
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save Paper'}
          </button>
          <button
            type="button"
            onClick={onPrint}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #C8991A, #e8b420)', color: '#071e34',
              fontWeight: 800, fontSize: '12px', cursor: 'pointer',
            }}
          >
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Ribbon Toolbar Panel */}
      <div role="toolbar" aria-label="Document formatting" style={{ padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', minHeight: '48px', background: 'rgba(7,25,48,0.7)' }}>
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <>
            {/* Undo / Redo */}
            <div role="group" aria-label="History" style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                title="Undo (Ctrl+Z)"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onUndo ? onUndo() : runCommand(c => c.undo())}
                disabled={!canUndo}
                style={toolBtnStyle(false, !canUndo)}
              >
                <Undo2 size={15} />
              </button>
              <button
                type="button"
                title="Redo (Ctrl+Y)"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onRedo ? onRedo() : runCommand(c => c.redo())}
                disabled={!canRedo}
                style={toolBtnStyle(false, !canRedo)}
              >
                <Redo2 size={15} />
              </button>
            </div>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)' }} />

            {/* Font Family & Size */}
            <div role="group" aria-label="Font settings" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select
                aria-label="Font family"
                value={currentTextStyle.fontFamily || ''}
                onMouseDown={e => e.stopPropagation()}
                onChange={e => setTextStyle('fontFamily', e.target.value)}
                style={{ ...selectStyle, width: '135px' }}
              >
                <option value="">Default Font</option>
                {SUPPORTED_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>

              <select
                aria-label="Font size"
                value={currentTextStyle.fontSize ? String(currentTextStyle.fontSize).replace(/[^0-9]/g, '') : ''}
                onMouseDown={e => e.stopPropagation()}
                onChange={e => setTextStyle('fontSize', e.target.value ? `${e.target.value}pt` : null)}
                style={{ ...selectStyle, width: '70px' }}
              >
                <option value="">Size</option>
                {SUPPORTED_SIZES.map(s => <option key={s} value={s}>{s} pt</option>)}
              </select>
            </div>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)' }} />

            {/* Inline Formatting Marks */}
            <div role="group" aria-label="Text styles" style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                title="Bold (Ctrl+B)"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.toggleBold())}
                style={toolBtnStyle(editor?.isActive('bold'))}
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                title="Italic (Ctrl+I)"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.toggleItalic())}
                style={toolBtnStyle(editor?.isActive('italic'))}
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                title="Underline (Ctrl+U)"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.toggleUnderline())}
                style={toolBtnStyle(editor?.isActive('underline'))}
              >
                <Underline size={15} />
              </button>
              <button
                type="button"
                title="Strikethrough"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.toggleStrike())}
                style={toolBtnStyle(editor?.isActive('strike'))}
              >
                <Strikethrough size={15} />
              </button>
              <button
                type="button"
                title="Superscript"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.toggleSuperscript())}
                style={toolBtnStyle(editor?.isActive('superscript'))}
              >
                <Superscript size={15} />
              </button>
              <button
                type="button"
                title="Subscript"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.toggleSubscript())}
                style={toolBtnStyle(editor?.isActive('subscript'))}
              >
                <Subscript size={15} />
              </button>
              <button
                type="button"
                title="Clear Formatting"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.unsetAllMarks())}
                style={toolBtnStyle(false)}
              >
                <RemoveFormatting size={15} />
              </button>
            </div>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)' }} />

            {/* Color & Highlight */}
            <div role="group" aria-label="Colors" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <label title="Text Color" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
                <span style={{ fontWeight: 800, color: currentTextStyle.color || '#e2e8f0', borderBottom: `2px solid ${currentTextStyle.color || '#C8991A'}` }}>A</span>
                <select
                  aria-label="Text Color"
                  value={currentTextStyle.color || ''}
                  onChange={e => setTextStyle('color', e.target.value)}
                  style={{ ...selectStyle, width: '80px' }}
                >
                  <option value="">Color</option>
                  {SUPPORTED_COLORS.map(c => <option key={c} value={c} style={{ background: c, color: '#fff' }}>{c}</option>)}
                </select>
              </label>

              <label title="Highlight Color" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
                <Highlighter size={14} color="#fef08a" />
                <select
                  aria-label="Highlight Color"
                  value={editor?.getAttributes('highlight')?.color || ''}
                  onChange={e => e.target.value ? runCommand(c => c.setHighlight({ color: e.target.value })) : runCommand(c => c.unsetHighlight())}
                  style={{ ...selectStyle, width: '85px' }}
                >
                  <option value="">No Highlight</option>
                  {SUPPORTED_HIGHLIGHTS.map(h => <option key={h} value={h} style={{ background: h, color: '#000' }}>{h}</option>)}
                </select>
              </label>
            </div>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)' }} />

            {/* Alignment & Text Direction */}
            <div role="group" aria-label="Alignment and direction" style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                title="Align Left"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.setTextAlign('left'))}
                style={toolBtnStyle(editor?.isActive({ textAlign: 'left' }))}
              >
                <AlignLeft size={15} />
              </button>
              <button
                type="button"
                title="Align Center"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.setTextAlign('center'))}
                style={toolBtnStyle(editor?.isActive({ textAlign: 'center' }))}
              >
                <AlignCenter size={15} />
              </button>
              <button
                type="button"
                title="Align Right"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.setTextAlign('right'))}
                style={toolBtnStyle(editor?.isActive({ textAlign: 'right' }))}
              >
                <AlignRight size={15} />
              </button>
              <button
                type="button"
                title="Justify"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.setTextAlign('justify'))}
                style={toolBtnStyle(editor?.isActive({ textAlign: 'justify' }))}
              >
                <AlignJustify size={15} />
              </button>
              <button
                type="button"
                title="Left-to-Right"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.updateAttributes('paragraph', { dir: 'ltr' }).updateAttributes('heading', { dir: 'ltr' }))}
                style={toolBtnStyle(false)}
              >
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                title="Right-to-Left (Urdu)"
                onMouseDown={e => e.preventDefault()}
                onClick={() => runCommand(c => c.updateAttributes('paragraph', { dir: 'rtl' }).updateAttributes('heading', { dir: 'rtl' }))}
                style={toolBtnStyle(false)}
              >
                <ArrowLeft size={15} />
              </button>
            </div>
          </>
        )}

        {/* TAB 2: INSERT */}
        {activeTab === 'insert' && (
          <div role="group" aria-label="Insert items" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => runCommand(c => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', ...toolBtnStyle(false), width: 'auto', padding: '6px 10px', fontSize: '12px' }}
            >
              <TableIcon size={14} /> Insert 3×3 Table
            </button>

            {isTableActive && (
              <div role="group" aria-label="Table controls" style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginRight: '4px' }}>Table:</span>
                <button type="button" title="Add Row After" onClick={() => runCommand(c => c.addRowAfter())} style={toolBtnStyle(false)}><Rows size={14} /></button>
                <button type="button" title="Add Column After" onClick={() => runCommand(c => c.addColumnAfter())} style={toolBtnStyle(false)}><Columns size={14} /></button>
                <button type="button" title="Delete Row" onClick={() => runCommand(c => c.deleteRow())} style={toolBtnStyle(false)}><Minus size={14} /></button>
                <button type="button" title="Delete Column" onClick={() => runCommand(c => c.deleteColumn())} style={toolBtnStyle(false)}><Plus size={14} /></button>
              </div>
            )}

            <button
              type="button"
              onClick={() => runCommand(c => c.setHorizontalRule())}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', ...toolBtnStyle(false), width: 'auto', padding: '6px 10px', fontSize: '12px' }}
            >
              Horizontal Line
            </button>
          </div>
        )}

        {/* TAB 3: LAYOUT */}
        {activeTab === 'layout' && (
          <div role="group" aria-label="Layout settings" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* MCQ Layout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>MCQ Layout:</span>
              <select
                aria-label="MCQ Layout"
                value={activeSection?.layout?.layoutMode || 'compact-grid'}
                onChange={e => updateActiveSectionLayout('layoutMode', e.target.value, 'mcq')}
                style={selectStyle}
              >
                {MCQ_LAYOUT_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>

              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginLeft: '6px' }}>Columns:</span>
              <select
                aria-label="MCQ Columns"
                value={activeSection?.layout?.columns || 4}
                onChange={e => updateActiveSectionLayout('columns', Number(e.target.value), 'mcq')}
                style={{ ...selectStyle, width: '60px' }}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>

            {/* Short Questions Layout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Short Layout:</span>
              <select
                aria-label="Short Questions Layout"
                value={activeSection?.layout?.layoutMode || '2-column-balanced'}
                onChange={e => updateActiveSectionLayout('layoutMode', e.target.value, 'short')}
                style={selectStyle}
              >
                {SHORT_LAYOUT_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>

            {/* Section Border */}
            {activeSection && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Section Border:</span>
                <select
                  aria-label="Section Border"
                  value={activeSection?.layout?.borderStyle || 'none'}
                  onChange={e => updateActiveSectionLayout('borderStyle', e.target.value)}
                  style={selectStyle}
                >
                  <option value="none">None</option>
                  <option value="box">Box</option>
                  <option value="table">Table</option>
                </select>
              </div>
            )}

            {/* Page Border */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Page Border:</span>
              <select
                aria-label="Page Border"
                value={paper?.pageSetup?.pageBorder || 'none'}
                onChange={e => updatePageSetup('pageBorder', e.target.value)}
                style={selectStyle}
              >
                <option value="none">None</option>
                <option value="thin">Thin Border</option>
                <option value="thick">Thick Border</option>
                <option value="double">Double Border</option>
              </select>
            </div>

            {/* Answer Lines */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Answer Lines:</span>
              <select
                aria-label="Answer Lines"
                value={activeSection?.questions?.[0]?.answerLines || 0}
                onChange={e => updateActiveSectionAnswerLines(e.target.value)}
                style={{ ...selectStyle, width: '80px' }}
              >
                <option value={0}>None</option>
                <option value={1}>1 line</option>
                <option value={2}>2 lines</option>
                <option value={3}>3 lines</option>
                <option value={4}>4 lines</option>
              </select>
            </div>
          </div>
        )}

        {/* TAB 4: PAPER */}
        {activeTab === 'paper' && (
          <div role="group" aria-label="Paper options" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Template Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Template Theme:</span>
              <select
                aria-label="Template Theme"
                value={paper?.templateId || 'academic'}
                onChange={e => onUpdatePaper?.({ templateId: e.target.value })}
                style={selectStyle}
              >
                {PAPER_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            {/* Print Mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Sheet Mode:</span>
              <select
                aria-label="Sheet Mode"
                value={paper?.pageSetup?.printMode || 'a4'}
                onChange={e => updatePageSetup('printMode', e.target.value)}
                style={selectStyle}
              >
                <option value="a4">Single Full A4</option>
                <option value="half">2 per A4 (Half Sheet)</option>
              </select>
            </div>

            {/* Toggles: Bubble Sheet & Answer Keys */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(paper?.printSettings?.printBubbleSheet)}
                onChange={e => updatePrintSettings('printBubbleSheet', e.target.checked)}
                style={{ accentColor: '#C8991A' }}
              />
              Bubble Sheet
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(paper?.printSettings?.printAnswerKey)}
                onChange={e => updatePrintSettings('printAnswerKey', e.target.checked)}
                style={{ accentColor: '#C8991A' }}
              />
              Answer Keys
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(paper?.pageSetup?.watermark?.enabled)}
                onChange={e => onUpdatePaper?.({
                  pageSetup: {
                    ...paper.pageSetup,
                    watermark: {
                      ...paper.pageSetup?.watermark,
                      enabled: e.target.checked,
                    },
                  },
                })}
                style={{ accentColor: '#C8991A' }}
              />
              Watermark
            </label>
          </div>
        )}
      </div>
    </header>
  )
}
