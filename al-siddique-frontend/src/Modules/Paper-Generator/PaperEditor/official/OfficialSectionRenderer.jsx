import { Fragment } from 'react'
import {
  inferOfficialSectionKind,
  parseMcqRows,
  extractMarksLabel,
  stripTrailingMarks,
  splitContentWithMarkers,
  isSectionMarkerLine,
  cleanSectionMarker
} from '../../officialSectionSemantics.js'
import { URDU_FONT_STACK } from '../../resolvePaperRoute.js'

function parseNumberedLines(content = '') {
  return String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
    const match = line.match(/^((?:\d+|[ivxlcdm]+|[a-z]|الف|ب|ج|د|ہ|و))[.)]\s*(.*)$/i)
    return { serial: match?.[1] || String(index + 1), text: match?.[2] || line }
  })
}

function parseMarkdownTable(content = '') {
  return String(content).split(/\r?\n/).map(line => line.trim())
    .filter(line => /^\|.*\|$/.test(line))
    .map(line => line.slice(1, -1).split('|').map(cell => cell.trim()))
    .filter(row => !row.every(cell => /^:?-{3,}:?$/.test(cell)))
}

function AnswerText({ text }) {
  return String(text).split(/(_{4,}|□|☐)/g).map((part, index) => {
    if (/^_{4,}$/.test(part)) return <span key={index} style={{ display:'inline-block', minWidth:90, borderBottom:'1px solid currentColor', height:'0.95em', verticalAlign:'baseline' }} />
    if (/^(?:□|☐)$/.test(part)) return <span key={index} style={{ display:'inline-block', width:28, height:24, border:'1.4px solid currentColor', verticalAlign:'middle', margin:'0 4px' }} />
    return <span key={index}>{part}</span>
  })
}

function SectionBanner({ text, themeColor, isUrdu, fs }) {
  return <div data-section-banner style={{ margin:`${8*fs}px 0 ${6*fs}px`, padding:`${4*fs}px ${10*fs}px`, borderTop:`1.5px solid ${themeColor}`, borderBottom:`1.5px solid ${themeColor}`, color:themeColor, fontWeight:900, fontSize:`${Math.max(12,12*fs)}px`, textAlign:'center', direction:isUrdu?'rtl':'ltr', background:`${themeColor}0A` }}>{text}</div>
}
function McqSection({ rows, layout, isUrdu, qFs, fs, themeColor }) {
  if (!rows.length) return null
  if (layout === 'matrix-table') {
    const maxOptions = Math.max(...rows.map(row => row.options.length), 2)
    return <table data-official-mcq-table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:`${qFs}px`, direction:isUrdu?'rtl':'ltr' }}>
      <thead><tr style={{ background:`${themeColor}12` }}>
        <th style={{ width:'8%', border:`1px solid ${themeColor}88`, padding:5 }}>#</th>
        <th colSpan={maxOptions} style={{ border:`1px solid ${themeColor}88`, padding:5, textAlign:isUrdu?'right':'left' }}>{isUrdu?'سوال اور اختیارات':'Question & Options'}</th>
      </tr></thead>
      <tbody>{rows.map(row => <Fragment key={row.number}>
        <tr style={{ breakInside:'avoid' }}>
          <td rowSpan={2} style={{ border:`1px solid ${themeColor}66`, padding:5, textAlign:'center', fontWeight:800, verticalAlign:'top' }}>{row.number}</td>
          <td colSpan={maxOptions} style={{ border:`1px solid ${themeColor}66`, padding:`${5*fs}px ${7*fs}px`, fontWeight:800, textAlign:isUrdu?'right':'left' }}>{row.prompt}</td>
        </tr>
        <tr style={{ breakInside:'avoid' }}>
          {Array.from({length:maxOptions},(_,i)=><td key={i} style={{ border:`1px solid ${themeColor}66`, padding:`${5*fs}px`, textAlign:isUrdu?'right':'left', verticalAlign:'top', overflowWrap:'break-word' }}>{row.options[i] ? <><b dir="ltr">{row.options[i].label})</b> {row.options[i].text}</> : ''}</td>)}
        </tr>
      </Fragment>)}</tbody>
    </table>
  }
  if (layout === 'classic') {
    return <div data-official-mcq-classic>{rows.map(row => <div key={row.number} style={{ marginBottom:`${7*fs}px`, breakInside:'avoid' }}>
      <div style={{ fontWeight:800, marginBottom:3 }}><b dir="ltr">{row.number}.</b> {row.prompt}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:`${4*fs}px ${16*fs}px`, paddingInlineStart:`${14*fs}px` }}>
        {row.options.map(option => <span key={option.label}><b dir="ltr">{option.label})</b> {option.text}</span>)}
      </div>
    </div>)}</div>
  }
  return <div data-official-mcq-grid style={{ display:'grid', gridTemplateColumns:'1fr', gap:`${6*fs}px` }}>
    {rows.map(row => {
      const cols = row.options.some(option => option.text.length > 24) ? 2 : Math.min(4, row.options.length)
      return <div key={row.number} style={{ border:`1px solid ${themeColor}55`, borderRadius:5, padding:`${6*fs}px`, breakInside:'avoid' }}>
        <div style={{ fontWeight:800, marginBottom:4 }}><b dir="ltr">{row.number}.</b> {row.prompt}</div>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`, gap:4 }}>
          {row.options.map(option => <div key={option.label} style={{ border:`1px solid ${themeColor}3D`, padding:`${4*fs}px`, minWidth:0 }}><b dir="ltr">{option.label})</b> {option.text}</div>)}
        </div>
      </div>
    })}
  </div>
}

function NumberedList({ rows, isUrdu, qFs, fs, shortLayout, themeColor }) {
  if (shortLayout === 'table') {
    return <table data-short-table style={{ width:'100%', borderCollapse:'collapse', fontSize:`${qFs}px` }}><tbody>
      {rows.map(row => <tr key={row.serial}><td style={{ width:42, border:`1px solid ${themeColor}55`, padding:5, textAlign:'center', fontWeight:800 }}>{row.serial}</td><td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px ${7*fs}px`, textAlign:isUrdu?'right':'left' }}><AnswerText text={row.text}/></td></tr>)}
    </tbody></table>
  }
  const renderRow = row => <div key={row.serial} style={{ display:'grid', gridTemplateColumns:isUrdu?'1fr 34px':'34px 1fr', gap:7, marginBottom:`${4*fs}px`, alignItems:'start', breakInside:'avoid' }}>
    <span dir="ltr" style={{ gridColumn:isUrdu?2:1, textAlign:'center', fontWeight:800 }}>{row.serial}.</span>
    <div dir={isUrdu?'rtl':'ltr'} style={{ gridColumn:isUrdu?1:2, textAlign:isUrdu?'right':'left', minWidth:0 }}><AnswerText text={row.text}/></div>
  </div>
  if (shortLayout === '2-column-balanced' && rows.length > 3) {
    const mid = Math.ceil(rows.length/2)
    const first = rows.slice(0, mid)
    const second = rows.slice(mid)
    const columns = isUrdu ? [first, second] : [first, second]
    return <div data-short-two-column style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:`${6*fs}px ${18*fs}px`, direction:isUrdu?'rtl':'ltr' }}>{columns.map((column, idx)=><div key={idx}>{column.map(renderRow)}</div>)}</div>
  }
  return <div data-numbered-list>{rows.map(renderRow)}</div>
}

function SourceTable({ rows, isUrdu, qFs, fs, themeColor }) {
  return <table data-source-table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:`${qFs}px`, direction:isUrdu?'rtl':'ltr' }}><tbody>
    {rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,cellIndex)=><td key={cellIndex} style={{ border:`1px solid ${themeColor}77`, padding:`${5*fs}px ${7*fs}px`, textAlign:isUrdu?'right':'left', fontWeight:rowIndex===0?800:500 }}><AnswerText text={cell}/></td>)}</tr>)}
  </tbody></table>
}

function PairPracticeTable({ content, isUrdu, qFs, fs, themeColor }) {
  const lines = String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  let items = lines.map(line => line.replace(/^(?:\d+|[ivxlcdm]+|[a-z]|الف|ب|ج|د|ہ|و)[.)]\s*/i,'').trim()).filter(Boolean)
  if (items.length <= 2) {
    items = String(content).split(/[،,]|\s{2,}/).map(item=>item.replace(/^\d+[.)]\s*/,'').trim()).filter(Boolean)
  }
  return <table data-pair-practice-table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:`${qFs}px`, direction:isUrdu?'rtl':'ltr' }}>
    <thead><tr style={{ background:`${themeColor}10` }}>
      <th style={{ width:'9%', border:`1px solid ${themeColor}66`, padding:5 }}>#</th>
      <th style={{ border:`1px solid ${themeColor}66`, padding:5, textAlign:isUrdu?'right':'left' }}>{isUrdu?'لفظ':'Word'}</th>
      <th style={{ border:`1px solid ${themeColor}66`, padding:5, textAlign:isUrdu?'right':'left' }}>{isUrdu?'جواب':'Answer'}</th>
    </tr></thead>
    <tbody>{items.map((item,index)=><tr key={index}>
      <td style={{ border:`1px solid ${themeColor}55`, padding:5, textAlign:'center', fontWeight:700 }}>{index+1}</td>
      <td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px`, textAlign:isUrdu?'right':'left' }}><AnswerText text={item}/></td>
      <td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px` }}><span style={{ display:'inline-block', width:'85%', borderBottom:`1px solid ${themeColor}88`, minHeight:'1em' }} /></td>
    </tr>)}</tbody>
  </table>
}

function renderContent({ content, kind, isUrdu, qFs, fs, themeColor, mcqLayout, shortLayout }) {
  const mcqs = kind === 'mcq' ? parseMcqRows(content) : []
  if (mcqs.length) return <McqSection rows={mcqs} layout={mcqLayout} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor}/>

  const tableRows = parseMarkdownTable(content)
  if (tableRows.length >= 2) return <SourceTable rows={tableRows} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor}/>
  if (kind === 'pair_table') return <PairPracticeTable content={content} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor}/>

  const rawLines = String(content).split(/\r?\n/).map(line=>line.trim()).filter(Boolean)
  const numberedRe = /^(?:\d+|[ivxlcdm]+|[a-z]|الف|ب|ج|د|ہ|و)[.)]\s*/i
  const firstNumbered = rawLines.findIndex(line=>numberedRe.test(line))
  if (firstNumbered > 0 && firstNumbered <= 2) {
    const bank = rawLines.slice(0, firstNumbered).join(' ')
    const bankRows = parseNumberedLines(rawLines.slice(firstNumbered).join('\n'))
    return <><div data-word-bank style={{ border:`1px solid ${themeColor}55`, background:`${themeColor}0A`, padding:`${5*fs}px ${8*fs}px`, marginBottom:`${6*fs}px`, textAlign:'center', fontWeight:700 }}>{bank}</div><NumberedList rows={bankRows} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout="1-column" themeColor={themeColor}/></>
  }

  const rows = parseNumberedLines(content)
  if (kind === 'short') return <NumberedList rows={rows} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout={shortLayout} themeColor={themeColor}/>
  if (kind === 'matching' && rows.length) return <NumberedList rows={rows} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout="table" themeColor={themeColor}/>
  if (kind === 'vertical_math' && rows.length) {
    return <div data-vertical-math style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(3,rows.length)}, minmax(0,1fr))`, gap:`${8*fs}px`, direction:'ltr' }}>
      {rows.map(row => <div key={row.serial} style={{ border:`1px solid ${themeColor}55`, padding:`${8*fs}px`, textAlign:'center', fontFamily:"'Cambria Math', 'Times New Roman', serif", fontSize:`${Math.max(qFs+1,14)}px`, fontWeight:700, minHeight:`${38*fs}px` }}><span style={{ color:themeColor }}>{row.serial}.</span> <AnswerText text={row.text}/></div>)}
    </div>
  }
  if (rows.length >= 2) return <NumberedList rows={rows} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout="1-column" themeColor={themeColor}/>
  return <div style={{ whiteSpace:'pre-wrap', fontSize:`${qFs}px`, textAlign:isUrdu?'right':'left' }}><AnswerText text={content}/></div>
}

export default function OfficialSectionRenderer({
  questions = [], isUrdu = false, editMode = false, fs = 1, qFs = 13, headingFs = null,
  themeColor = '#123b67', onQuestionChange, qBorderStyle = 'none',
  mcqLayout = 'matrix-table', shortLayout = '1-column', showAnsLines = false,
  showSectionLine = true, urdLineH = 2, engLineH = 1.5, letterSp = 0,
  wordSp = 0, textAlign = 'start', fontFamily = ''
}) {
  const ordered = [...questions].sort((a,b)=>Number(a.sourceOrder||0)-Number(b.sourceOrder||0))
  return <div data-official-sections style={{ direction:isUrdu?'rtl':'ltr', fontFamily:isUrdu?URDU_FONT_STACK:(fontFamily||'inherit'), lineHeight:isUrdu?urdLineH:engLineH, letterSpacing:`${letterSp}px`, wordSpacing:`${wordSp}px` }}>
    {ordered.map((section,index)=>{
      const kind = inferOfficialSectionKind(section)
      if (kind === 'marker') {
        const labels = String(section.content||'').split(/\r?\n/).filter(isSectionMarkerLine)
        return <Fragment key={section.id||index}>{labels.map((line,i)=><SectionBanner key={i} text={cleanSectionMarker(line)} themeColor={themeColor} isUrdu={isUrdu} fs={fs}/>)}</Fragment>
      }
      const ordinal = ordered.slice(0, index + 1).filter(item => inferOfficialSectionKind(item) !== 'marker').length
      const rawHeading = String(section.heading||'').trim()
      const hasSerial = /^(?:Q(?:uestion)?\s*\d+|سوال(?:\s+نمبر)?\s*\d+)/i.test(rawHeading)
      const cleanHeading = stripTrailingMarks(rawHeading)
      const displayHeading = hasSerial ? cleanHeading : `${isUrdu?`سوال نمبر ${ordinal}:`:`Q${ordinal}.`} ${cleanHeading}`.trim()
      const marksLabel = extractMarksLabel(rawHeading, section.marks)
      const parts = splitContentWithMarkers(section.content)
      const sectionBorder = qBorderStyle === 'box' ? `1px solid ${themeColor}66` : qBorderStyle === 'table' ? `1.5px solid ${themeColor}` : 'none'
      const sectionPadding = qBorderStyle === 'none' ? 0 : `${7*fs}px`
      const defaultLines = showAnsLines && ['short','long','list','fill_blank'].includes(kind) ? (kind==='long'?6:2) : 0
      const answerLines = Number(section.answerLines || defaultLines)
      const resolvedAlign = textAlign==='start'?(isUrdu?'right':'left'):textAlign==='end'?(isUrdu?'left':'right'):textAlign

      return <section key={section.id||index} data-official-section data-section-kind={kind} style={{ marginBottom:`${10*fs}px`, border:sectionBorder, borderRadius:qBorderStyle==='box'?5:0, padding:sectionPadding, breakInside:'auto' }}>
        {editMode && <div className="no-print" data-edit-guide style={{ marginBottom:7, padding:7, border:`1px dashed ${themeColor}88`, borderRadius:5, background:'#f8fafc' }}>
          <input aria-label={`Question ${ordinal} heading`} value={section.heading||''} onChange={e=>onQuestionChange?.(section.id,{heading:e.target.value,text:e.target.value,textUrdu:isUrdu?e.target.value:''})} style={{ width:'100%', boxSizing:'border-box', border:`1px solid ${themeColor}66`, borderRadius:5, padding:6, marginBottom:6, font:'inherit', fontWeight:800, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left' }}/>
          <textarea aria-label={`Question ${ordinal} content`} value={section.content||''} onChange={e=>onQuestionChange?.(section.id,{content:e.target.value})} style={{ width:'100%', boxSizing:'border-box', minHeight:Math.max(82,String(section.content||'').split('\n').length*20), resize:'vertical', border:`1px solid ${themeColor}55`, borderRadius:5, padding:7, font:'inherit', lineHeight:isUrdu?urdLineH:engLineH, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left' }}/>
        </div>}
        <div data-section-heading data-language={isUrdu?'urdu':'english'} style={{ display:'grid', gridTemplateColumns:isUrdu?'72px minmax(0,1fr)':'minmax(0,1fr) 72px', alignItems:'center', gap:8, paddingBottom:`${4*fs}px`, marginBottom:`${6*fs}px`, borderBottom:showSectionLine?`2px solid ${themeColor}`:'none', direction:'ltr' }}>
          <div data-question-heading style={{ gridColumn:isUrdu?2:1, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left', fontWeight:900, fontSize:`${Math.max(Number(headingFs || 0), qFs + 1, 13)}px` }}>{displayHeading}</div>
          {marksLabel ? <div data-marks-badge style={{ gridColumn:isUrdu?1:2, direction:'ltr', textAlign:'center', border:`1px solid ${themeColor}`, borderRadius:4, padding:'2px 5px', color:themeColor, fontWeight:800, fontSize:`${Math.max(10,qFs-2)}px`, whiteSpace:'nowrap' }}>{marksLabel}</div> : <span/>}
        </div>
        {parts.length ? parts.map((part,partIndex)=>part.type==='marker'
          ? <SectionBanner key={partIndex} text={part.text} themeColor={themeColor} isUrdu={isUrdu} fs={fs}/>
          : <div key={partIndex} style={{ textAlign:resolvedAlign }}>{renderContent({ content:part.text, kind, isUrdu, qFs, fs, themeColor, mcqLayout, shortLayout })}</div>) : null}
        {answerLines > 0 && <div data-configurable-answer-lines>{Array.from({length:answerLines},(_,lineIndex)=><div key={lineIndex} style={{ height:`${20*fs}px`, borderBottom:'1px solid #8793a0' }}/>)}</div>}
      </section>
    })}
  </div>
}
