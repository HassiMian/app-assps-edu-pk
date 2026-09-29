import React from 'react'
import { Bold, Italic, Underline, X, Table2, Columns3, ListOrdered } from 'lucide-react'
import { parseFieldKey } from './EditorFieldRegistry.js'

const CONTROL = {
  width: '100%', height: 32, borderRadius: 7,
  border: '1px solid rgba(148,163,184,.22)',
  background: '#0d2238', color: '#e2e8f0',
  padding: '0 8px', fontSize: 11, outline: 'none',
}
const LABEL = {
  display: 'grid', gap: 5, color: '#94a3b8',
  fontSize: 9, fontWeight: 800, letterSpacing: '.045em',
}
const TOOL = active => ({
  width: 31, height: 29, borderRadius: 6,
  border: active ? '1px solid #C8991A' : '1px solid rgba(255,255,255,.12)',
  background: active ? 'rgba(200,153,26,.22)' : 'rgba(255,255,255,.05)',
  color: '#e2e8f0', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
})

export default function CanonicalQuestionInspector({  activeNode,
  workingDoc,
  store,
  registry,
  activeFieldKey,
  onClose,
}) {
  if (!activeNode?.nodeId || !activeNode?.sectionId) return null

  const { sectionId, nodeId, nodeType, ordinal } = activeNode
  const pres = workingDoc?.presentation || {}
  const sectionOverride = pres.sectionLayoutOverrides?.[sectionId] || {}
  const explicitLayout = pres.questionLayoutByNode?.[nodeId]
  const isShortOrLong = ['short_question', 'long_question'].includes(nodeType)
  const inheritedLayout = isShortOrLong && sectionOverride.shortLayout === 'table'
    ? 'table'
    : (sectionOverride.questionBorder === 'table'
      ? 'table'
      : (sectionOverride.questionBorder === 'box' ? 'box' : 'plain'))
  const effectiveLayout = explicitLayout || inheritedLayout
  const answerLines = Number(pres.answerLinesByNode?.[nodeId] || 0)
  const marks = store?.getEffectiveNodeMarks?.(sectionId, nodeId)
  const displayNumber = store?.getNodeDisplayNumber?.(sectionId, nodeId, ordinal || 1) || String(ordinal || 1)

  const parsedField = parseFieldKey(activeFieldKey || registry?.getActiveFieldKey?.())
  const activeEditor = registry?.getActiveEditor?.()
  const editorTargetsNode = Boolean(activeEditor && parsedField?.nodeId === nodeId)
  const runTextCommand = command => {
    if (!editorTargetsNode || !activeEditor) return
    const saved = registry?.getSelection?.(activeFieldKey || registry?.getActiveFieldKey?.())
    let chain = activeEditor.chain()
    if (saved && Number.isFinite(saved.from) && Number.isFinite(saved.to)) {
      chain = chain.setTextSelection({ from: saved.from, to: saved.to })
    }
    command(chain.focus()).run()
  }

  const supportsQuestionLayout = ![
    'mcq', 'true_false', 'fill_blank', 'matching_columns',
    'grammar_table', 'vertical_math', 'unknown_preserved',
  ].includes(nodeType)

  return (
    <aside className="canonical-question-inspector no-print" data-question-inspector>
      <div className="canonical-question-inspector-head">
        <div>
          <strong>Question {displayNumber}</strong>
          <span>{String(nodeType || 'question').replaceAll('_', ' ')}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close question inspector"><X size={14}/></button>
      </div>

      <div className="canonical-question-inspector-section">
        <div className="canonical-question-inspector-title"><ListOrdered size={12}/> Identity & marks</div>
        <div className="canonical-question-inspector-grid2">
          <label style={LABEL}>SERIAL
            <input
              aria-label="Inspector Question Number"
              key={`num-${nodeId}-${displayNumber}`}
              defaultValue={displayNumber}
              onBlur={e => store?.setNodeDisplayNumber?.(sectionId, nodeId, e.target.value)}
              style={CONTROL}
            />
          </label>
          <label style={LABEL}>MARKS
            <input
              aria-label="Inspector Question Marks"
              key={`marks-${nodeId}-${marks ?? ''}`}
              type="number"
              min="0"
              defaultValue={Number.isFinite(marks) ? marks : ''}
              onBlur={e => store?.setNodeMarks?.(sectionId, nodeId, e.target.value)}
              style={CONTROL}
            />
          </label>
        </div>
        <div className="canonical-inspector-lock-note">Serial number is always rendered bold.</div>
      </div>

      <div className="canonical-question-inspector-section">
        <div className="canonical-question-inspector-title">Selected text</div>
        <div className="canonical-question-format-row">
          <button
            type="button" title="Bold selected text"
            disabled={!editorTargetsNode}
            onMouseDown={e => e.preventDefault()}
            onClick={() => runTextCommand(c => c.toggleBold())}
            style={TOOL(Boolean(activeEditor?.isActive?.('bold')))}
          ><Bold size={14}/></button>
          <button
            type="button" title="Italic selected text"
            disabled={!editorTargetsNode}
            onMouseDown={e => e.preventDefault()}
            onClick={() => runTextCommand(c => c.toggleItalic())}
            style={TOOL(Boolean(activeEditor?.isActive?.('italic')))}
          ><Italic size={14}/></button>
          <button
            type="button" title="Underline selected text"
            disabled={!editorTargetsNode}
            onMouseDown={e => e.preventDefault()}
            onClick={() => runTextCommand(c => c.toggleUnderline())}
            style={TOOL(Boolean(activeEditor?.isActive?.('underline')))}
          ><Underline size={14}/></button>
          <span>{editorTargetsNode ? 'Applies to selection' : 'Select text in this question first'}</span>
        </div>
      </div>

      {nodeType === 'mcq' ? (
        <div className="canonical-question-inspector-section">
          <div className="canonical-question-inspector-title"><Table2 size={12}/> MCQ layout</div>
          <select
            aria-label="Inspector MCQ Layout"
            value={sectionOverride.mcqLayout || 'table'}
            onChange={e => store?.setMcqLayout?.(sectionId, e.target.value)}
            style={CONTROL}
          >
            <option value="table">Table</option>
            <option value="grid">Grid</option>
            <option value="classic">Classic</option>
          </select>
        </div>
      ) : (
        supportsQuestionLayout && (
          <div className="canonical-question-inspector-section">
            <div className="canonical-question-inspector-title"><Table2 size={12}/> Question presentation</div>
            <label style={LABEL}>ACTIVE QUESTION STYLE
              <select
                aria-label="Inspector Question Layout"
                value={explicitLayout || 'inherit'}
                onChange={e => store?.setQuestionLayout?.(nodeId, e.target.value)}
                style={CONTROL}
              >
                <option value="inherit">Use section default ({effectiveLayout})</option>
                <option value="plain">Plain</option>
                <option value="box">Box</option>
                <option value="table">Table</option>
              </select>
            </label>
          </div>
        )
      )}

      {isShortOrLong && (
        <div className="canonical-question-inspector-section">
          <div className="canonical-question-inspector-title"><Columns3 size={12}/> Section columns</div>
          <select
            aria-label="Inspector Section Columns"
            value={sectionOverride.shortLayout || '1-column'}
            onChange={e => store?.setShortLayout?.(sectionId, e.target.value)}
            style={CONTROL}
          >
            <option value="1-column">1 Column</option>
            <option value="2-column-balanced">2 Columns</option>
            <option value="3-column-balanced">3 Columns</option>
            <option value="table">Table default</option>
          </select>
        </div>
      )}

      {nodeType !== 'mcq' && (
        <div className="canonical-question-inspector-section">
          <div className="canonical-question-inspector-title">Answer space</div>
          <select
            aria-label="Inspector Answer Lines"
            value={answerLines}
            onChange={e => store?.setAnswerLines?.(nodeId, Number(e.target.value))}
            style={CONTROL}
          >
            <option value="0">No answer lines</option>
            <option value="1">1 line</option>
            <option value="2">2 lines</option>
            <option value="3">3 lines</option>
            <option value="4">4 lines</option>
            <option value="6">6 lines</option>
            <option value="8">8 lines</option>
          </select>
        </div>
      )}
    </aside>
  )
}
