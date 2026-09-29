import React, { useMemo, useState } from 'react'
import {
  ArrowLeft, Edit3, Save, Printer, Plus, LayoutTemplate,
  FileText, Settings2, CheckCircle2, ZoomIn, ZoomOut, Maximize2
} from 'lucide-react'
import CanonicalPaperRibbonToolbar from './CanonicalPaperRibbonToolbar.jsx'
import { parseFieldKey } from './EditorFieldRegistry.js'
import { parseStructuredControlKey } from './structured/structuredFocusHelpers.js'
import { PAPER_TEMPLATES } from '../templates/paperTemplates.js'

const TABS = [
  ['home', 'HOME'],
  ['insert', 'INSERT'],
  ['layout', 'LAYOUT'],
  ['paper', 'PAPER'],
  ['view', 'VIEW'],
]

const INSERT_TYPES = [
  ['mcq', 'MCQ'],
  ['true_false', 'True / False'],
  ['fill_blank', 'Fill Blank'],
  ['matching_columns', 'Matching'],
  ['grammar_table', 'Grammar Table'],
  ['vertical_math', 'Vertical Math'],
]

const inputStyle = {
  height: 30,
  background: '#0d2238',
  color: '#e2e8f0',
  border: '1px solid rgba(255,255,255,.14)',
  borderRadius: 7,
  padding: '0 9px',
  fontSize: 11,
  outline: 'none',
}
const labelStyle = { display: 'grid', gap: 4, color: '#94a3b8', fontSize: 9, fontWeight: 800, letterSpacing: '.04em' }
const actionStyle = {
  border: '1px solid rgba(255,255,255,.14)',
  borderRadius: 8,
  background: 'rgba(255,255,255,.055)',
  color: '#e2e8f0',
  height: 32,
  padding: '0 11px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

export default function UnifiedPaperCommandBar({
  registry,
  store,
  onSaveDraft,
  saving = false,
  saveStatus = '',
  isEditMode = true,
  onToggleEditMode,
  activeFieldKey = null,
  activeStructuredKey = null,
  activeNodeContext = null,
  onPrint = null,
  onBack = null,
  documentLabel = '',
  zoomLevel = 100,
  onZoomIn = null,
  onZoomOut = null,
  onZoomReset = null,
  onFitWidth = null,
  onFitPage = null,
}) {
  const [activeTab, setActiveTab] = useState('home')
  const [insertStatus, setInsertStatus] = useState('')
  const workingDoc = store?.getWorkingDocument()
  const meta = workingDoc?.metadata || {}
  const pres = workingDoc?.presentation || {}

  const target = useMemo(() => {
    const active = parseFieldKey(activeFieldKey || registry?.getActiveFieldKey())
    const structured = parseStructuredControlKey(activeStructuredKey)
    return {
      sectionId: structured?.secId || active?.sectionId || activeNodeContext?.sectionId || workingDoc?.sections?.[0]?.id || null,
      nodeId: structured?.nodeId || active?.nodeId || activeNodeContext?.nodeId || null,
    }
  }, [activeFieldKey, activeStructuredKey, activeNodeContext, registry, workingDoc])

  const sectionOverride = target.sectionId
    ? (pres.sectionLayoutOverrides?.[target.sectionId] || {})
    : {}
  const answerLines = target.nodeId ? (pres.answerLinesByNode?.[target.nodeId] || 0) : 0

  const insertNode = nodeType => {
    const id = store?.insertQuestion?.(target.sectionId, nodeType)
    setInsertStatus(id ? `Added ${nodeType.replaceAll('_', ' ')}` : 'Select a paper section first')
    window.setTimeout(() => setInsertStatus(''), 2200)
  }

  return (
    <header className="unified-paper-command-bar no-print" data-unified-editor-command-bar>
      <div className="unified-command-top">
        <div className="unified-command-left">
          {onBack && (
            <button type="button" onClick={onBack} style={actionStyle} data-editor-back>
              <ArrowLeft size={14}/> Back
            </button>
          )}
          <div className="unified-document-identity">
            <strong>Paper Editor</strong>
            <span>{documentLabel || meta.title || 'Untitled Paper'}</span>
          </div>
          {workingDoc?.sourceIdentity?.sourceDatasetGeneration === 'legacy-canvas-v2' && (
            <span className="unified-adapter-badge">Migrated Saved Paper</span>
          )}
          {activeNodeContext?.nodeId && (
            <span className="unified-active-target" data-active-question-chip>
              Q {activeNodeContext.displayNumber || activeNodeContext.ordinal || '—'} · {String(activeNodeContext.nodeType || 'question').replaceAll('_', ' ')}
            </span>
          )}
        </div>

        <div className="unified-command-actions">
          {saveStatus && (
            <span className="unified-save-status">
              <CheckCircle2 size={13}/>{saveStatus}
            </span>
          )}
          <button type="button" onClick={onToggleEditMode} style={{...actionStyle, background: isEditMode ? '#C8991A' : 'rgba(255,255,255,.055)', color: isEditMode ? '#071e34' : '#e2e8f0'}}>
            <Edit3 size={14}/>{isEditMode ? 'Done Editing' : 'Edit Paper'}
          </button>
          <button type="button" onClick={onSaveDraft} disabled={saving} style={{...actionStyle, background:'#16a34a', borderColor:'#16a34a', color:'#fff'}}>
            <Save size={14}/>{saving ? 'Saving…' : 'Save Paper'}
          </button>
          <button type="button" onClick={onPrint} style={{...actionStyle, background:'#C8991A', borderColor:'#C8991A', color:'#071e34'}}>
            <Printer size={14}/> Print / PDF
          </button>
        </div>
      </div>

      <div className="unified-command-tabs" role="tablist" aria-label="Paper editor commands">
        {TABS.map(([id,label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            data-command-tab={id}
            onClick={() => setActiveTab(id)}
            className={activeTab === id ? 'is-active' : ''}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="unified-command-panel" data-command-panel={activeTab}>
        {activeTab === 'home' && (
          <CanonicalPaperRibbonToolbar
            registry={registry}
            store={store}
            onSaveDraft={onSaveDraft}
            saving={saving}
            saveStatus={saveStatus}
            isEditMode={isEditMode}
            onToggleEditMode={onToggleEditMode}
            activeFieldKey={activeFieldKey}
            activeStructuredKey={activeStructuredKey}
            onPrint={onPrint}
            embedded
            showStructuralControls={false}
          />
        )}

        {activeTab === 'insert' && (
          <div className="unified-command-group-row">
            <div className="unified-command-group">
              <span className="unified-command-group-title"><Plus size={12}/> Add structured question</span>
              <div className="unified-command-inline">
                {INSERT_TYPES.map(([type,label]) => (
                  <button key={type} type="button" onClick={() => insertNode(type)} style={actionStyle} data-insert-node={type}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="unified-command-hint">
              Adds to the active section. New items use deterministic IDs and support undo/redo.
              {insertStatus && <strong>{insertStatus}</strong>}
            </div>
          </div>
        )}

        {activeTab === 'layout' && (
          <div className="unified-command-group-row">
            <div className="unified-command-group">
              <span className="unified-command-group-title"><LayoutTemplate size={12}/> Template & page</span>
              <div className="unified-command-inline">
                <label style={labelStyle}>TEMPLATE
                  <select aria-label="Template" value={pres.templateId || 'academic'} onChange={e => store?.setTemplateId?.(e.target.value)} style={{...inputStyle,width:145}}>
                    {PAPER_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>PAGE BORDER
                  <select aria-label="Page Border" value={pres.pageBorder || 'none'} onChange={e => store?.setPageBorder?.(e.target.value)} style={inputStyle}>
                    <option value="none">None</option><option value="thin">Thin</option><option value="thick">Thick</option><option value="double">Double</option>
                  </select>
                </label>
                <label style={labelStyle}>PRINT MODE
                  <select aria-label="Print Mode" value={pres.printMode || 'a4'} onChange={e => store?.setPrintMode?.(e.target.value)} style={inputStyle}>
                    <option value="a4">Single A4</option><option value="half">2 per A4</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="unified-command-group">
              <span className="unified-command-group-title"><Settings2 size={12}/> Active section</span>
              <div className="unified-command-inline">
                <label style={labelStyle}>MCQ LAYOUT
                  <select aria-label="MCQ Layout" value={sectionOverride.mcqLayout || 'table'} onChange={e => store?.setMcqLayout?.(target.sectionId,e.target.value)} style={inputStyle}>
                    <option value="table">Table</option><option value="grid">Grid</option><option value="classic">Classic</option>
                  </select>
                </label>
                <label style={labelStyle}>SHORT / LONG FLOW
                  <select aria-label="Short Question Layout" value={sectionOverride.shortLayout || '1-column'} onChange={e => store?.setShortLayout?.(target.sectionId,e.target.value)} style={inputStyle}>
                    <option value="1-column">1 Column</option>
                    <option value="2-column-balanced">2 Columns</option>
                    <option value="3-column-balanced">3 Columns</option>
                    <option value="table">Table Default</option>
                  </select>
                </label>
                <label style={labelStyle}>QUESTION BORDER
                  <select aria-label="Question Border" value={sectionOverride.questionBorder || 'none'} onChange={e => store?.setQuestionBorder?.(target.sectionId,e.target.value)} style={inputStyle}>
                    <option value="none">None</option><option value="box">Box</option><option value="table">Table</option>
                  </select>
                </label>
                <label style={labelStyle}>ANSWER LINES
                  <select aria-label="Answer Lines" value={answerLines} disabled={!target.nodeId} onChange={e => store?.setAnswerLines?.(target.nodeId,Number(e.target.value))} style={inputStyle}>
                    <option value="0">None</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="6">6</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'paper' && (
          <div className="unified-command-group-row">
            <div className="unified-command-group">
              <span className="unified-command-group-title"><FileText size={12}/> Paper information</span>
              <div className="unified-command-inline unified-paper-fields">
                {[
                  ['classLevel','CLASS'],
                  ['subject','SUBJECT'],
                  ['paperCode','PAPER CODE'],
                  ['timeAllowed','TIME'],
                  ['examDate','DATE'],
                ].map(([field,label]) => (
                  <label key={field} style={labelStyle}>{label}
                    <input
                      aria-label={label}
                      value={field === 'classLevel' ? (meta.className ?? meta.classLevel ?? '') : (meta[field] ?? '')}
                      onChange={e => {
                        const value = e.target.value
                        if (field === 'classLevel') {
                          store?.setMetadataField?.('classLevel', value)
                          store?.setMetadataField?.('className', value)
                        } else {
                          store?.setMetadataField?.(field, value)
                        }
                      }}
                      style={{...inputStyle,width:field==='subject'?140:105}}
                    />
                  </label>
                ))}
                <label style={labelStyle}>TOTAL MARKS
                  <input aria-label="Total Marks" type="number" min="0" value={workingDoc?.marks?.paperTotalMode === 'MANUAL' ? (workingDoc?.marks?.manualPaperTotal ?? '') : (workingDoc?.marks?.computedPaperTotal ?? workingDoc?.marks?.sourcePaperTotal ?? '')} onChange={e => store?.setPaperTotalMarks?.(e.target.value)} style={{...inputStyle,width:82}}/>
                </label>
              </div>
            </div>
            <div className="unified-command-hint">
              School name and logo remain protected. All operational paper metadata stays independently editable.
            </div>
          </div>
        )}
        {activeTab === 'view' && (
          <div className="unified-command-group-row">
            <div className="unified-command-group">
              <span className="unified-command-group-title"><Maximize2 size={12}/> Canvas view</span>
              <div className="unified-zoom-controls" data-zoom-controls>
                <button type="button" onClick={onZoomOut} title="Zoom out" aria-label="Zoom out"><ZoomOut size={13}/></button>
                <button type="button" onClick={onZoomReset} title="Reset zoom" aria-label="Reset zoom">{zoomLevel}%</button>
                <button type="button" onClick={onZoomIn} title="Zoom in" aria-label="Zoom in"><ZoomIn size={13}/></button>
                <button type="button" onClick={onFitWidth} title="Fit paper width" aria-label="Fit Width">Fit Width</button>
                <button type="button" onClick={onFitPage} title="Fit full page" aria-label="Fit Page"><Maximize2 size={12}/> Fit Page</button>
              </div>
            </div>
            <div className="unified-command-hint">
              View controls never modify the paper content. Select a question to open its contextual inspector.
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
