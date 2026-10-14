import { useState } from 'react'
import { ResultCardPreview } from './premiumResultCardTemplates'

// Screen-only A4 stack. The print job always uses the complete original
// batch independently of the selected preview mode or jump target.
export default function ResultBatchPagesPreview({ cards, scale, previewRef, onPrintAll, onSavePdf }) {
  const [mode, setMode] = useState('all')
  const [focused, setFocused] = useState(0)
  const count = cards.length
  const visible = mode === 'all'
    ? cards.map((card, index) => ({ card, index }))
    : [{ card:cards[focused] || cards[0], index:focused }]
  const jump = next => {
    if (!Number.isInteger(next) || next < 0 || next >= count) return
    setFocused(next)
    if (mode === 'all') {
      // Immediate DOM scroll after a user selection; no background navigation.
      const page = previewRef.current?.querySelector(`[data-result-preview-page="${next + 1}"]`)
      page?.scrollIntoView({ block:'start', behavior:'smooth' })
    }
  }
  if (!count) return <div className="result-batch-empty">No printable result cards found.</div>
  return <>
    <div className="result-batch-pages-toolbar" aria-label="Result card batch navigation">
      <div className="result-batch-pages-title">
        <strong>All Result Card Pages</strong>
        <span>{count} students · {count} A4 pages · one complete print job</span>
      </div>
      <div className="result-batch-pages-controls">
        <div className="result-batch-preview-toggle" role="group" aria-label="Preview layout">
          <button type="button" aria-pressed={mode === 'all'} onClick={()=>setMode('all')}>All Pages</button>
          <button type="button" aria-pressed={mode === 'single'} onClick={()=>setMode('single')}>One Page</button>
        </div>
        <label htmlFor="result-preview-page-select">Jump to page
          <select id="result-preview-page-select" aria-label="Go to result card page" value={focused} onChange={e=>jump(Number(e.target.value))}>
            {cards.map((card,i)=><option value={i} key={`${card.student?.id ?? 'student'}-${i}`}>{i+1}. {card.student?.name || 'Student'}</option>)}
          </select>
        </label>
      </div>
    </div>
    <div className="result-batch-page-list" data-preview-mode={mode} data-total-pages={count}>
      {visible.map(({card,index})=>{
        const landscape = card.options?.orientation === 'landscape'
        const pageWidth = landscape ? 1123 : 794
        const pageHeight = landscape ? 794 : 1123
        const effectiveScale = Math.min(scale, 794 / pageWidth)
        return <section key={`${card.exam?.id ?? 'exam'}-${card.student?.id ?? index}-${index}`}
          className="result-batch-preview-page" data-result-preview-page={index+1}
          aria-label={`Page ${index+1} of ${count}: ${card.student?.name || 'Student'}`}>
          <div className="result-batch-page-label">
            <strong>Page {index+1} / {count}</strong>
            <span>{card.student?.name || 'Student'}{card.student?.gr_number ? ` · GR ${card.student.gr_number}` : ''}</span>
            <small>A4 · {landscape ? 'Landscape' : 'Portrait'}</small>
          </div>
          <div className="result-batch-card-viewport" style={{width:pageWidth*effectiveScale,height:pageHeight*effectiveScale}}>
            <div className="result-preview-scale" style={{transform:`scale(${effectiveScale})`,transformOrigin:'top left',width:pageWidth}}>
              <ResultCardPreview data={card}/>
            </div>
          </div>
        </section>
      })}
    </div>
    <div className="result-batch-bottom-actions">
      <strong>{count} A4 result cards — ready for one print command.</strong>
      <button type="button" onClick={onPrintAll}>Print All {count} Cards</button>
      <button type="button" onClick={onSavePdf}>Save All as PDF</button>
    </div>
  </>
}
