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
import { optionLabelParts, replaceQuestionSerial, replaceSectionMarks, resolveSectionTotalMarks } from '../../paperSystemRules.js'

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

function OptionLabel({ label, index, isUrdu, themeColor }) {
  const parts = optionLabelParts(label, index, isUrdu)
  return <span data-option-label data-language={isUrdu?'urdu':'english'} style={{ display:'inline-flex', flexDirection:'row', direction:isUrdu?'rtl':'ltr', unicodeBidi:'isolate', alignItems:'baseline', gap:1, color:themeColor, fontWeight:900, whiteSpace:'nowrap' }}><b data-option-label-text>{parts.label}</b><b data-option-bracket dir="ltr">{parts.closingBracket}</b></span>
}

function OptionChoice({ option, index, isUrdu, themeColor }) {
  return <span data-option-choice style={{ display:'inline-flex', flexDirection:'row', direction:isUrdu?'rtl':'ltr', unicodeBidi:'isolate', alignItems:'baseline', gap:4, whiteSpace:'normal' }}><OptionLabel label={option.label} index={index} isUrdu={isUrdu} themeColor={themeColor} /><span data-option-text style={{ direction:isUrdu?'rtl':'ltr', unicodeBidi:'plaintext' }}>{option.text}</span></span>
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
          {Array.from({length:maxOptions},(_,i)=><td key={i} style={{ border:`1px solid ${themeColor}66`, padding:`${5*fs}px`, textAlign:isUrdu?'right':'left', verticalAlign:'top', overflowWrap:'break-word' }}>{row.options[i] ? <OptionChoice option={row.options[i]} index={i} isUrdu={isUrdu} themeColor={themeColor} /> : ''}</td>)}
        </tr>
      </Fragment>)}</tbody>
    </table>
  }
  if (layout === 'classic') {
    return <div data-official-mcq-classic>{rows.map(row => <div key={row.number} style={{ marginBottom:`${7*fs}px`, breakInside:'avoid' }}>
      <div style={{ fontWeight:800, marginBottom:3 }}><b dir="ltr">{row.number}.</b> {row.prompt}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:`${4*fs}px ${16*fs}px`, paddingInlineStart:`${14*fs}px` }}>
        {row.options.map((option, optionIndex) => <OptionChoice key={option.label} option={option} index={optionIndex} isUrdu={isUrdu} themeColor={themeColor} />)}
      </div>
    </div>)}</div>
  }
  return <div data-official-mcq-grid style={{ display:'grid', gridTemplateColumns:'1fr', gap:`${6*fs}px` }}>
    {rows.map(row => {
      const cols = row.options.some(option => option.text.length > 24) ? 2 : Math.min(4, row.options.length)
      return <div key={row.number} style={{ border:`1px solid ${themeColor}55`, borderRadius:5, padding:`${6*fs}px`, breakInside:'avoid' }}>
        <div style={{ fontWeight:800, marginBottom:4 }}><b dir="ltr">{row.number}.</b> {row.prompt}</div>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`, gap:4 }}>
          {row.options.map((option, optionIndex) => <div key={option.label} style={{ border:`1px solid ${themeColor}3D`, padding:`${4*fs}px`, minWidth:0 }}><OptionChoice option={option} index={optionIndex} isUrdu={isUrdu} themeColor={themeColor} /></div>)}
        </div>
      </div>
    })}
  </div>
}

function NumberedList({ rows, isUrdu, qFs, fs, shortLayout, themeColor, answerLinesPerItem = 0 }) {
  if (shortLayout === 'table') {
    return <table data-short-table style={{ width:'100%', borderCollapse:'collapse', fontSize:`${qFs}px` }}><tbody>
      {rows.map(row => <tr key={row.serial}><td style={{ width:42, border:`1px solid ${themeColor}55`, padding:5, textAlign:'center', fontWeight:800 }}>{row.serial}</td><td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px ${7*fs}px`, textAlign:isUrdu?'right':'left' }}><AnswerText text={row.text}/></td></tr>)}
    </tbody></table>
  }
  const itemLineCount = Math.max(0, Number(answerLinesPerItem) || 0)
  const renderRow = row => <div key={row.serial} data-numbered-response-row style={{ marginBottom:`${itemLineCount ? 7*fs : 4*fs}px`, breakInside:'avoid' }}>
    <div style={{ display:'grid', gridTemplateColumns:isUrdu?'1fr 34px':'34px 1fr', gap:7, alignItems:'start' }}>
      <span dir="ltr" style={{ gridColumn:isUrdu?2:1, textAlign:'center', fontWeight:800 }}>{row.serial}.</span>
      <div dir={isUrdu?'rtl':'ltr'} style={{ gridColumn:isUrdu?1:2, textAlign:isUrdu?'right':'left', minWidth:0 }}><AnswerText text={row.text}/></div>
    </div>
    {itemLineCount > 0 && <div data-item-answer-lines style={{ marginInlineStart:isUrdu?0:41, marginInlineEnd:isUrdu?41:0 }}>{Array.from({length:itemLineCount},(_,i)=><div key={i} style={{ height:`${18*fs}px`, borderBottom:'1px solid #8793a0' }}/>)}</div>}
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


function MathPracticeGrid({ content, kind, qFs, fs, themeColor }) {
  const raw = String(content || '').replace(/\r\n/g, '\n')
  const mathFont = "'Cambria Math', 'Times New Roman', serif"

  if (kind === 'vertical_math' && /\s{3,}/.test(raw)) {
    const blocks = raw.split(/\n\s*\n/).map(block => block.split('\n').filter(line => line.trim())).filter(Boolean)
    return <div data-math-operation-matrix style={{ display:'grid', gap:`${8*fs}px` }}>
      {blocks.map((lines, blockIndex) => {
        const rows = lines.map(line => line.trim().split(/\s{3,}/).map(cell => cell.trim()).filter(Boolean))
        const cols = Math.max(...rows.map(row => row.length), 1)
        return <div key={blockIndex} style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`, gap:`${10*fs}px`, breakInside:'avoid' }}>
          {Array.from({length:cols}, (_,colIndex) => {
            const cellLines = rows.map(row => row[colIndex] || '').filter(Boolean)
            return <div key={colIndex} style={{ border:`1px solid ${themeColor}55`, borderRadius:5, padding:`${7*fs}px ${9*fs}px`, textAlign:'center', fontFamily:mathFont, fontSize:`${Math.max(qFs+1,14)}px`, lineHeight:1.35, minHeight:`${58*fs}px` }}>
              {cellLines.map((line,i)=><div key={i} style={{ whiteSpace:'pre', borderBottom:/^_+$/.test(line)?`1.5px solid ${themeColor}`:'none', minHeight:'1.2em' }}>{/^_+$/.test(line)?'':line}</div>)}
            </div>
          })}
        </div>
      })}
    </div>
  }

  const lines = raw.split('\n').map(line => line.trim()).filter(Boolean)
  const rows = lines.map((line,index) => {
    const match = line.match(/^((?:\d+|[ivxlcdm]+|[a-z]))[.)]\s*(.*)$/i)
    return { serial: match?.[1] || String(index+1), text: match?.[2] || line }
  })

  if (kind === 'math_table') {
    return <div data-math-table-practice style={{ display:'grid', gridTemplateColumns:rows.length>1?'1fr 1fr':'1fr', gap:`${10*fs}px` }}>
      {rows.map(row => <div key={row.serial} style={{ border:`1px solid ${themeColor}55`, borderRadius:5, padding:`${8*fs}px`, breakInside:'avoid' }}>
        <div style={{ fontFamily:mathFont, fontWeight:800, fontSize:`${Math.max(qFs,13)}px`, marginBottom:5 }}><AnswerText text={row.text}/></div>
        <div style={{ height:`${38*fs}px`, borderBottom:`1px solid ${themeColor}88` }} />
      </div>)}
    </div>
  }

  const twoColumn = rows.length >= 4
  return <div data-math-practice-grid data-math-kind={kind} style={{ display:'grid', gridTemplateColumns:twoColumn?'1fr 1fr':'1fr', gap:`${7*fs}px ${14*fs}px`, fontFamily:mathFont }}>
    {rows.map(row => <div key={row.serial} style={{ display:'grid', gridTemplateColumns:'28px minmax(0,1fr)', alignItems:'center', gap:6, border:`1px solid ${themeColor}3D`, borderRadius:4, padding:`${6*fs}px ${8*fs}px`, breakInside:'avoid', minHeight:`${32*fs}px` }}>
      <b style={{ color:themeColor, textAlign:'center' }}>{row.serial}.</b>
      <div style={{ fontSize:`${Math.max(qFs,13)}px`, minWidth:0 }}><AnswerText text={row.text}/></div>
    </div>)}
  </div>
}

function renderContent({ content, kind, isUrdu, qFs, fs, themeColor, mcqLayout, shortLayout, answerLinesPerItem = 0 }) {
  const mcqs = kind === 'mcq' ? parseMcqRows(content) : []
  if (mcqs.length) return <McqSection rows={mcqs} layout={mcqLayout} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor}/>

  const tableRows = parseMarkdownTable(content)
  if (tableRows.length >= 2) return <SourceTable rows={tableRows} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor}/>
  if (kind === 'pair_table') return <PairPracticeTable content={content} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor}/>
  if (['vertical_math','math_compare','math_number_name','math_place_value','math_order','math_table'].includes(kind)) return <MathPracticeGrid content={content} kind={kind} qFs={qFs} fs={fs} themeColor={themeColor}/>

  const rawLines = String(content).split(/\r?\n/).map(line=>line.trim()).filter(Boolean)
  const numberedRe = /^(?:\d+|[ivxlcdm]+|[a-z]|الف|ب|ج|د|ہ|و)[.)]\s*/i
  const firstNumbered = rawLines.findIndex(line=>numberedRe.test(line))
  if (firstNumbered > 0 && firstNumbered <= 2) {
    const bank = rawLines.slice(0, firstNumbered).join(' ')
    const bankRows = parseNumberedLines(rawLines.slice(firstNumbered).join('\n'))
    return <><div data-word-bank style={{ border:`1px solid ${themeColor}55`, background:`${themeColor}0A`, padding:`${5*fs}px ${8*fs}px`, marginBottom:`${6*fs}px`, textAlign:'center', fontWeight:700 }}>{bank}</div><NumberedList rows={bankRows} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout="1-column" themeColor={themeColor}/></>
  }

  const rows = parseNumberedLines(content)
  if (kind === 'short') return <NumberedList rows={rows} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout={shortLayout} themeColor={themeColor} answerLinesPerItem={answerLinesPerItem}/>
  if (kind === 'matching' && rows.length) return <NumberedList rows={rows} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout="table" themeColor={themeColor}/>
  if (kind === 'vertical_math' && rows.length) {
    return <div data-vertical-math style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(3,rows.length)}, minmax(0,1fr))`, gap:`${8*fs}px`, direction:'ltr' }}>
      {rows.map(row => <div key={row.serial} style={{ border:`1px solid ${themeColor}55`, padding:`${8*fs}px`, textAlign:'center', fontFamily:"'Cambria Math', 'Times New Roman', serif", fontSize:`${Math.max(qFs+1,14)}px`, fontWeight:700, minHeight:`${38*fs}px` }}><span style={{ color:themeColor }}>{row.serial}.</span> <AnswerText text={row.text}/></div>)}
    </div>
  }
  if (rows.length >= 2) return <NumberedList rows={rows} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout="1-column" themeColor={themeColor} answerLinesPerItem={answerLinesPerItem}/>
  return <div style={{ whiteSpace:'pre-wrap', fontSize:`${qFs}px`, textAlign:isUrdu?'right':'left' }}><AnswerText text={content}/></div>
}

export default function OfficialSectionRenderer({
  questions = [], isUrdu = false, editMode = false, fs = 1, qFs = 13, headingFs = null,
  themeColor = '#123b67', onQuestionChange, onDeleteSection, onDuplicateSection, onMoveSection, onAddSection, qBorderStyle = 'none',
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
      const resolvedMarks = resolveSectionTotalMarks(section)
      const marksLabel = extractMarksLabel(rawHeading, resolvedMarks)
      const parts = splitContentWithMarkers(section.content)
      const sectionBorder = qBorderStyle === 'box' ? `1px solid ${themeColor}66` : qBorderStyle === 'table' ? `1.5px solid ${themeColor}` : 'none'
      const sectionPadding = qBorderStyle === 'none' ? 0 : `${7*fs}px`
      const defaultLines = showAnsLines && ['short','long','list','fill_blank'].includes(kind) ? (kind==='long'?6:2) : 0
      const answerLines = Number(section.answerLines || defaultLines)
      const resolvedAlign = textAlign==='start'?(isUrdu?'right':'left'):textAlign==='end'?(isUrdu?'left':'right'):textAlign

      return <section key={section.id||index} data-official-section data-section-kind={kind} style={{ marginBottom:`${10*fs}px`, border:sectionBorder, borderRadius:qBorderStyle==='box'?5:0, padding:sectionPadding, breakInside:'auto' }}>
        {editMode && <div className="no-print" data-edit-guide style={{ marginBottom:7, padding:8, border:`1px dashed ${themeColor}88`, borderRadius:6, background:'#f8fafc' }}>
          <div style={{ display:'grid', gridTemplateColumns:'90px 105px minmax(0,1fr) auto', gap:7, alignItems:'end', marginBottom:7, fontFamily:'Arial,sans-serif', direction:'ltr' }}>
            <label style={{ fontSize:10, fontWeight:800, color:'#475569' }}>Question No.
              <input aria-label={`Question ${ordinal} number`} type="number" min="1" value={Number(section.sourceOrder||ordinal)} onChange={e=>{ const next=Math.max(1,Number(e.target.value)||1); onQuestionChange?.(section.id,{sourceOrder:next,heading:replaceQuestionSerial(section.heading||'',next,isUrdu),text:replaceQuestionSerial(section.heading||'',next,isUrdu),textUrdu:isUrdu?replaceQuestionSerial(section.heading||'',next,isUrdu):''}) }} style={{ width:'100%', boxSizing:'border-box', marginTop:3, padding:5 }}/>
            </label>
            <label style={{ fontSize:10, fontWeight:800, color:'#475569' }}>Marks
              <input aria-label={`Question ${ordinal} marks`} type="number" min="0" value={resolvedMarks || ''} onChange={e=>{ const next=Math.max(0,Number(e.target.value)||0); const heading=replaceSectionMarks(section.heading||'',next,isUrdu); onQuestionChange?.(section.id,{marks:next,operationalMarks:next,marksManuallyEdited:true,heading,text:heading,textUrdu:isUrdu?heading:''}) }} style={{ width:'100%', boxSizing:'border-box', marginTop:3, padding:5 }}/>
            </label>
            <label style={{ fontSize:10, fontWeight:800, color:'#475569' }}>Question / Instruction
              <input aria-label={`Question ${ordinal} heading`} value={section.heading||''} onChange={e=>onQuestionChange?.(section.id,{heading:e.target.value,text:e.target.value,textUrdu:isUrdu?e.target.value:''})} style={{ width:'100%', boxSizing:'border-box', border:`1px solid ${themeColor}66`, borderRadius:5, padding:6, marginTop:3, font:'inherit', fontWeight:800, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left' }}/>
            </label>
            <div style={{ display:'flex', gap:4, paddingBottom:1 }}>
              <button type="button" title="Move question up" onClick={()=>onMoveSection?.(section.id,-1)} style={{ padding:'5px 8px' }}>↑</button>
              <button type="button" title="Move question down" onClick={()=>onMoveSection?.(section.id,1)} style={{ padding:'5px 8px' }}>↓</button>
              <button type="button" title="Duplicate question" onClick={()=>onDuplicateSection?.(section.id)} style={{ padding:'5px 8px' }}>Duplicate</button>
              <button type="button" title="Delete question" onClick={()=>onDeleteSection?.(section.id)} style={{ padding:'5px 8px', color:'#b91c1c' }}>Delete</button>
            </div>
          </div>
          <label style={{ display:'block', fontFamily:'Arial,sans-serif', fontSize:10, fontWeight:800, color:'#475569', marginBottom:3 }}>Question Content</label>
          <textarea aria-label={`Question ${ordinal} content`} value={section.content||''} onChange={e=>onQuestionChange?.(section.id,{content:e.target.value})} style={{ width:'100%', boxSizing:'border-box', minHeight:Math.max(82,String(section.content||'').split('\n').length*20), resize:'vertical', border:`1px solid ${themeColor}55`, borderRadius:5, padding:7, font:'inherit', lineHeight:isUrdu?urdLineH:engLineH, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left' }}/>
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginTop:6, fontFamily:'Arial,sans-serif', fontSize:11, direction:'ltr' }}>
            <label style={{ fontWeight:800, color:'#475569' }}>Type <select value={section.layoutPreset || 'auto'} onChange={e=>onQuestionChange?.(section.id,{layoutPreset:e.target.value})} style={{ marginLeft:4 }}><option value="auto">Auto ({kind})</option><option value="mcq">MCQ</option><option value="short">Short Questions</option><option value="long">Long Question</option><option value="fill_blank">Fill Blanks</option><option value="true_false">True / False</option><option value="matching">Matching</option><option value="pair_table">Word Pair Table</option><option value="table">Table</option><option value="list">List</option><option value="vertical_math">Math Operations</option></select></label>
            <label>Section answer lines <input type="number" min="0" max="20" value={Number(section.answerLines||0)} onChange={e=>onQuestionChange?.(section.id,{answerLines:Math.max(0,Number(e.target.value)||0)})} style={{ width:58, marginLeft:4 }}/></label>
            <label>Lines per item <input type="number" min="0" max="5" value={Number(section.answerLinesPerItem||0)} onChange={e=>onQuestionChange?.(section.id,{answerLinesPerItem:Math.max(0,Number(e.target.value)||0)})} style={{ width:58, marginLeft:4 }}/></label>
          </div>
        </div>}
        <div data-section-heading data-language={isUrdu?'urdu':'english'} style={{ display:'grid', gridTemplateColumns:isUrdu?'72px minmax(0,1fr)':'minmax(0,1fr) 72px', alignItems:'center', gap:8, paddingBottom:`${4*fs}px`, marginBottom:`${6*fs}px`, borderBottom:showSectionLine?`2px solid ${themeColor}`:'none', direction:'ltr' }}>
          <div data-question-heading style={{ gridColumn:isUrdu?2:1, direction:isUrdu?'rtl':'ltr', textAlign:isUrdu?'right':'left', fontWeight:900, fontSize:`${Math.max(Number(headingFs || 0), qFs + 1, 13)}px` }}>{displayHeading}</div>
          {marksLabel ? <div data-marks-badge style={{ gridColumn:isUrdu?1:2, direction:'ltr', textAlign:'center', border:`1px solid ${themeColor}`, borderRadius:4, padding:'2px 5px', color:themeColor, fontWeight:800, fontSize:`${Math.max(10,qFs-2)}px`, whiteSpace:'nowrap' }}>{marksLabel}</div> : <span/>}
        </div>
        {parts.length ? parts.map((part,partIndex)=>part.type==='marker'
          ? <SectionBanner key={partIndex} text={part.text} themeColor={themeColor} isUrdu={isUrdu} fs={fs}/>
          : <div key={partIndex} style={{ textAlign:resolvedAlign }}>{renderContent({ content:part.text, kind, isUrdu, qFs, fs, themeColor, mcqLayout, shortLayout, answerLinesPerItem:Math.max(0,Number(section.answerLinesPerItem)||0) })}</div>) : null}
        {answerLines > 0 && <div data-configurable-answer-lines>{Array.from({length:answerLines},(_,lineIndex)=><div key={lineIndex} style={{ height:`${20*fs}px`, borderBottom:'1px solid #8793a0' }}/>)}</div>}
      </section>
    })}
    {editMode && <div className="no-print" style={{ marginTop:10, direction:'ltr', textAlign:'center' }}><button type="button" onClick={()=>onAddSection?.()} style={{ border:`1px solid ${themeColor}`, color:themeColor, background:'#fff', borderRadius:7, padding:'7px 14px', fontWeight:800, cursor:'pointer' }}>+ Add Question Section</button></div>}
  </div>
}
