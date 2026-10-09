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
import { InlineEditable } from '../../PaperInlineEditor.jsx'
import StableClosingBracket from '../StableClosingBracket.jsx'

function parseNumberedLines(content = '') {
  return String(content).split(/\r?\n/).map((raw, sourceIndex) => {
    const line = raw.trim()
    if (!line) return null
    const match = line.match(/^((?:\d+|[ivxlcdm]+|[a-z]|الف|ب|ج|د|ہ|و))[.)]\s*(.*)$/i)
    return { serial: match?.[1] || String(sourceIndex + 1), text: match?.[2] || line, sourceIndex, hadSerial:Boolean(match) }
  }).filter(Boolean)
}

function itemSerialText(serial, isUrdu) {
  const value=String(serial||'').replace(/[().]/g,'').trim()
  return isUrdu && /^(?:الف|ب|ج|د|ہ|و|ز|ح)$/.test(value) ? value : value + '.'
}
function ItemSerial({ serial, isUrdu, color='currentColor' }) {
  const value=String(serial||'').replace(/[().]/g,'').trim()
  const urduLetter=isUrdu && /^(?:الف|ب|ج|د|ہ|و|ز|ح)$/.test(value)
  if(!urduLetter) return <>{value}.</>
  return <span data-urdu-item-label style={{display:'inline-flex',flexDirection:'row',direction:'rtl',unicodeBidi:'isolate',alignItems:'baseline',gap:1,whiteSpace:'nowrap'}}>
    <span>{value}</span><StableClosingBracket color={color}/>
  </span>
}
function replaceNumberedLine(content, row, text, isUrdu) {
  const lines=String(content||'').split(/\r?\n/)
  const punctuation=isUrdu && /^(?:الف|ب|ج|د|ہ|و|ز|ح)$/.test(String(row.serial)) ? ')' : '.'
  lines[row.sourceIndex]=(row.hadSerial ? String(row.serial)+punctuation+' ' : '')+String(text||'')
  return lines.join('\n')
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
  return <span data-option-label data-language={isUrdu?'urdu':'english'} style={{ display:'inline-flex', flexDirection:'row', direction:isUrdu?'rtl':'ltr', unicodeBidi:'isolate', alignItems:'baseline', gap:1, color:themeColor, fontWeight:900, whiteSpace:'nowrap' }}>
    <b data-option-label-text style={{ fontFamily:'inherit' }}>{parts.label}</b>
    <StableClosingBracket color={themeColor} />
  </span>
}

function OptionChoice({ option, index, isUrdu, themeColor, editMode=false, section=null, rowIndex=0, onCommit, onActiveEditable }) {
  const fieldKey='mcq-'+rowIndex+'-option-'+index
  const rich=section?.richText?.[fieldKey]||''
  return <span data-option-choice style={{ display:'inline-flex', flexDirection:'row', direction:isUrdu?'rtl':'ltr', unicodeBidi:'isolate', alignItems:'baseline', gap:6, whiteSpace:'normal' }}>
    <OptionLabel label={option.label} index={index} isUrdu={isUrdu} themeColor={themeColor} />
    {(editMode||rich)
      ? <InlineEditable text={option.text} richHtml={rich} editMode={editMode} direction={isUrdu?'rtl':'ltr'} fieldKey={fieldKey} sectionId={section?.id} ariaLabel={'Edit MCQ '+(rowIndex+1)+' option '+(index+1)} onActivate={onActiveEditable} onCommit={payload=>onCommit?.(payload,fieldKey)} style={{direction:isUrdu?'rtl':'ltr',unicodeBidi:'plaintext'}} />
      : <span data-option-text style={{ direction:isUrdu?'rtl':'ltr', unicodeBidi:'plaintext' }}>{option.text}</span>}
  </span>
}
function serializeMcqRows(rows=[], isUrdu=false) {
  return rows.map((row,rowIndex)=>{
    const number=Math.max(1,Number(row.number)||rowIndex+1)
    const prompt=String(row.prompt||'').trim()
    const options=(row.options||[]).map((option,index)=>{
      const parts=optionLabelParts(option.label,index,isUrdu)
      const label=isUrdu ? parts.label+parts.closingBracket : '('+String(parts.label||String.fromCharCode(97+index)).toLowerCase()+')'
      return label+' '+String(option.text||'').trim()
    }).join(' ')
    return number+'. '+prompt+'\n'+options
  }).join('\n')
}
function McqSection({ rows, layout, isUrdu, qFs, fs, themeColor, editMode=false, section=null, onQuestionChange, onActiveEditable }) {
  const commitField=(rowIndex,kind,optionIndex,payload,fieldKey)=>{
    if(!section?.id||!onQuestionChange) return
    const nextRows=rows.map((row,index)=>index===rowIndex?{...row,options:(row.options||[]).map(option=>({...option}))}:{...row,options:(row.options||[]).map(option=>({...option}))})
    const row=nextRows[rowIndex]
    if(!row) return
    if(kind==='number') row.number=String(Math.max(1,Number(String(payload.text).match(/\d+/)?.[0]||row.number||rowIndex+1)))
    else if(kind==='prompt') row.prompt=payload.text
    else if(kind==='option'&&row.options?.[optionIndex]) row.options[optionIndex].text=payload.text
    const richText={...(section.richText||{})}
    if(fieldKey&&kind!=='number') richText[fieldKey]=payload.html
    onQuestionChange(section.id,{content:serializeMcqRows(nextRows,isUrdu),richText})
  }
  const numberNode=(row,rowIndex)=>{
    const key='mcq-'+rowIndex+'-number'
    return editMode
      ? <InlineEditable text={String(row.number)} editMode={true} direction="ltr" fieldKey={key} sectionId={section?.id} ariaLabel={'Edit MCQ '+(rowIndex+1)+' number'} onActivate={onActiveEditable} onCommit={payload=>commitField(rowIndex,'number',null,payload,key)} style={{display:'inline-block',minWidth:18,textAlign:'center',fontWeight:800}} />
      : <>{row.number}</>
  }
  const promptNode=(row,rowIndex)=>{
    const key='mcq-'+rowIndex+'-prompt'
    const rich=section?.richText?.[key]||''
    return (editMode||rich)
      ? <InlineEditable text={row.prompt} richHtml={rich} editMode={editMode} direction={isUrdu?'rtl':'ltr'} fieldKey={key} sectionId={section?.id} ariaLabel={'Edit MCQ '+(rowIndex+1)+' question'} onActivate={onActiveEditable} onCommit={payload=>commitField(rowIndex,'prompt',null,payload,key)} style={{display:'inline',fontWeight:500}} />
      : <>{row.prompt}</>
  }
  const optionNode=(option,optionIndex,rowIndex)=><OptionChoice key={option.label+'-'+optionIndex} option={option} index={optionIndex} isUrdu={isUrdu} themeColor={themeColor} editMode={editMode} section={section} rowIndex={rowIndex} onActiveEditable={onActiveEditable} onCommit={(payload,key)=>commitField(rowIndex,'option',optionIndex,payload,key)} />
  if (!rows.length) return null
  if (layout === 'matrix-table') {
    const maxOptions = Math.max(...rows.map(row => row.options.length), 2)
    return <table data-official-mcq-table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:`${qFs}px`, direction:isUrdu?'rtl':'ltr' }}>
      <thead><tr style={{ background:`${themeColor}12` }}>
        <th style={{ width:'8%', border:`1px solid ${themeColor}88`, padding:5 }}>#</th>
        <th colSpan={maxOptions} style={{ border:`1px solid ${themeColor}88`, padding:5, textAlign:isUrdu?'right':'left' }}>{isUrdu?'سوال اور اختیارات':'Question & Options'}</th>
      </tr></thead>
      <tbody>{rows.map((row,rowIndex) => <Fragment key={row.number+'-'+rowIndex}>
        <tr style={{ breakInside:'avoid' }}>
          <td rowSpan={2} style={{ border:`1px solid ${themeColor}66`, padding:5, textAlign:'center', fontWeight:800, verticalAlign:'top' }}>{numberNode(row,rowIndex)}</td>
          <td colSpan={maxOptions} style={{ border:`1px solid ${themeColor}66`, padding:`${5*fs}px ${7*fs}px`, fontWeight:800, textAlign:isUrdu?'right':'left', overflowWrap:'anywhere', wordBreak:'break-word' }}>{promptNode(row,rowIndex)}</td>
        </tr>
        <tr style={{ breakInside:'avoid' }}>
          {Array.from({length:maxOptions},(_,i)=><td key={i} style={{ border:`1px solid ${themeColor}66`, padding:`${5*fs}px`, textAlign:isUrdu?'right':'left', verticalAlign:'top', overflowWrap:'anywhere', wordBreak:'break-word' }}>{row.options[i] ? optionNode(row.options[i],i,rowIndex) : ''}</td>)}
        </tr>
      </Fragment>)}</tbody>
    </table>
  }
  if (layout === 'classic') {
    return <div data-official-mcq-classic>{rows.map((row,rowIndex) => <div key={row.number+'-'+rowIndex} style={{ marginBottom:`${7*fs}px`, breakInside:'avoid' }}>
      <div style={{ fontWeight:800, marginBottom:3 }}><b dir="ltr">{numberNode(row,rowIndex)}.</b> {promptNode(row,rowIndex)}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:`${4*fs}px ${16*fs}px`, paddingInlineStart:`${14*fs}px` }}>
        {row.options.map((option, optionIndex) => optionNode(option,optionIndex,rowIndex))}
      </div>
    </div>)}</div>
  }
  return <div data-official-mcq-grid style={{ display:'grid', gridTemplateColumns:'1fr', gap:`${6*fs}px` }}>
    {rows.map((row,rowIndex) => {
      const cols = row.options.some(option => option.text.length > 24) ? 2 : Math.min(4, row.options.length)
      return <div key={row.number+'-'+rowIndex} style={{ border:`1px solid ${themeColor}55`, borderRadius:5, padding:`${6*fs}px`, breakInside:'avoid' }}>
        <div style={{ fontWeight:800, marginBottom:4 }}><b dir="ltr">{numberNode(row,rowIndex)}.</b> {promptNode(row,rowIndex)}</div>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`, gap:4 }}>
          {row.options.map((option, optionIndex) => <div key={option.label+'-'+optionIndex} style={{ border:`1px solid ${themeColor}3D`, padding:`${4*fs}px`, minWidth:0 }}>{optionNode(option,optionIndex,rowIndex)}</div>)}
        </div>
      </div>
    })}
  </div>
}

function NumberedList({ rows, content='', isUrdu, qFs, fs, shortLayout, themeColor, answerLinesPerItem = 0, editMode=false, section=null, onQuestionChange, onActiveEditable }) {
  const commitRow=(row, payload)=>{
    if(!section?.id||!onQuestionChange) return
    const nextContent=replaceNumberedLine(content,row,payload.text,isUrdu)
    const key='item-'+row.sourceIndex
    onQuestionChange(section.id,{ content:nextContent, richText:{...(section.richText||{}),[key]:payload.html} })
  }
  const rowText=row=>{
    const key='item-'+row.sourceIndex
    const rich=section?.richText?.[key]||''
    if(editMode||rich) return <InlineEditable text={row.text} richHtml={rich} editMode={editMode} direction={isUrdu?'rtl':'ltr'} fieldKey={key} sectionId={section?.id} ariaLabel={'Edit item '+row.serial} onActivate={onActiveEditable} onCommit={payload=>commitRow(row,payload)} />
    return <AnswerText text={row.text}/>
  }
  if (shortLayout === 'table' || shortLayout === 'table-1-column') {
    return <table data-short-table data-short-table-columns="1" style={{ width:'100%', borderCollapse:'collapse', fontSize:`${qFs}px`, direction:isUrdu?'rtl':'ltr' }}><tbody>
      {rows.map(row => <tr key={row.serial}><td style={{ width:50, border:`1px solid ${themeColor}55`, padding:5, textAlign:'center', fontWeight:800, whiteSpace:'nowrap' }}><ItemSerial serial={row.serial} isUrdu={isUrdu} color={themeColor}/></td><td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px ${7*fs}px`, textAlign:isUrdu?'right':'left' }}>{rowText(row)}</td></tr>)}
    </tbody></table>
  }
  if (shortLayout === 'table-2-column' && rows.length > 1) {
    const mid = Math.ceil(rows.length / 2)
    const left = rows.slice(0, mid)
    const right = rows.slice(mid)
    const rowCount = Math.max(left.length, right.length)
    const cell = row => row ? <>
      <td style={{ width:44, border:`1px solid ${themeColor}55`, padding:5, textAlign:'center', fontWeight:800, whiteSpace:'nowrap' }}><ItemSerial serial={row.serial} isUrdu={isUrdu} color={themeColor}/></td>
      <td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px ${7*fs}px`, textAlign:isUrdu?'right':'left', minWidth:0, overflowWrap:'anywhere', wordBreak:'break-word' }}>{rowText(row)}</td>
    </> : <>
      <td style={{ width:44, border:`1px solid ${themeColor}55`, padding:5 }} />
      <td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px ${7*fs}px` }} />
    </>
    return <table data-short-table data-short-table-columns="2" style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:`${qFs}px`, direction:isUrdu?'rtl':'ltr' }}><tbody>
      {Array.from({length:rowCount},(_,index)=><tr key={index}>{cell(left[index])}{cell(right[index])}</tr>)}
    </tbody></table>
  }
  const itemLineCount = Math.max(0, Number(answerLinesPerItem) || 0)
  const renderRow = row => <div key={row.serial+'-'+row.sourceIndex} data-numbered-response-row style={{ marginBottom:`${itemLineCount ? 7*fs : 4*fs}px`, breakInside:'avoid' }}>
    <div dir={isUrdu?'rtl':'ltr'} style={{ display:'flex', flexDirection:'row', gap:7, alignItems:'baseline', justifyContent:'flex-start', textAlign:isUrdu?'right':'left', minWidth:0 }}>
      <span data-item-serial style={{ flex:'0 0 auto', minWidth:isUrdu?32:26, textAlign:isUrdu?'right':'center', fontWeight:800, whiteSpace:'nowrap', unicodeBidi:'isolate' }}><ItemSerial serial={row.serial} isUrdu={isUrdu} color={themeColor}/></span>
      <div style={{ flex:'1 1 auto', minWidth:0, overflowWrap:'anywhere', wordBreak:'break-word' }}>{rowText(row)}</div>
    </div>
    {itemLineCount > 0 && <div data-item-answer-lines style={{ marginInlineStart:isUrdu?0:39, marginInlineEnd:isUrdu?39:0 }}>{Array.from({length:itemLineCount},(_,i)=><div key={i} style={{ height:`${18*fs}px`, borderBottom:'1px solid #8793a0' }}/>)}</div>}
  </div>
  if (shortLayout === '2-column-balanced' && rows.length > 3) {
    const mid = Math.ceil(rows.length/2)
    const columns = [rows.slice(0,mid), rows.slice(mid)]
    return <div data-short-two-column style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:`${6*fs}px ${18*fs}px`, direction:isUrdu?'rtl':'ltr' }}>{columns.map((column, idx)=><div key={idx}>{column.map(renderRow)}</div>)}</div>
  }
  return <div data-numbered-list>{rows.map(renderRow)}</div>
}

function serializeMarkdownRows(rows = []) {
  if (!rows.length) return ''
  const encode = row => '| ' + row.map(cell => String(cell || '').trim()).join(' | ') + ' |'
  const separator = '| ' + rows[0].map(() => '---').join(' | ') + ' |'
  return [encode(rows[0]), separator, ...rows.slice(1).map(encode)].join('\n')
}

function SourceTable({ rows, isUrdu, qFs, fs, themeColor, editMode=false, section=null, onQuestionChange, onActiveEditable }) {
  const commitCell=(rowIndex,cellIndex,payload)=>{
    if(!section?.id||!onQuestionChange) return
    const nextRows=rows.map(row=>[...row])
    nextRows[rowIndex][cellIndex]=payload.text
    const key='source-table-'+rowIndex+'-'+cellIndex
    onQuestionChange(section.id,{content:serializeMarkdownRows(nextRows),richText:{...(section.richText||{}),[key]:payload.html}})
  }
  return <table data-source-table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:`${qFs}px`, direction:isUrdu?'rtl':'ltr' }}><tbody>
    {rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,cellIndex)=>{
      const key='source-table-'+rowIndex+'-'+cellIndex
      const rich=section?.richText?.[key]||''
      return <td key={cellIndex} style={{ border:`1px solid ${themeColor}77`, padding:`${5*fs}px ${7*fs}px`, textAlign:isUrdu?'right':'left', fontWeight:rowIndex===0?800:500, overflowWrap:'anywhere', wordBreak:'break-word' }}>
        {(editMode||rich)&&section?.id
          ? <InlineEditable text={cell} richHtml={rich} editMode={editMode} direction={isUrdu?'rtl':'ltr'} fieldKey={key} sectionId={section.id} ariaLabel={`Edit table row ${rowIndex+1} column ${cellIndex+1}`} onActivate={onActiveEditable} onCommit={payload=>commitCell(rowIndex,cellIndex,payload)} style={{display:'block',minWidth:0,fontWeight:rowIndex===0?800:500}}/>
          : <AnswerText text={cell}/>}
      </td>
    })}</tr>)}
  </tbody></table>
}

function parseMatchingRows(content = '') {
  return String(content).split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map((line,index)=>{
    const clean=line.replace(/^(?:\d+|[ivxlcdm]+|[a-z]|الف|ب|ج|د|ہ|و)[.)]\s*/i,'').trim()
    const parts=clean.includes('|')?clean.split('|'):clean.includes('\t')?clean.split(/\t+/):clean.split(/\s{3,}/)
    return { left:String(parts[0]||'').trim(), right:String(parts.slice(1).join(' ')||'').trim(), index }
  })
}

function serializeMatchingRows(rows = []) {
  return rows.map((row,index)=>`${index+1}. ${String(row.left||'').trim()} | ${String(row.right||'').trim()}`).join('\n')
}

function MatchingColumnsTable({ content, isUrdu, qFs, fs, themeColor, editMode=false, section=null, onQuestionChange, onActiveEditable }) {
  const rows=parseMatchingRows(content)
  const defaults=isUrdu?['کالم A','کالم B']:['Column A','Column B']
  const headers=Array.isArray(section?.tableHeaders)&&section.tableHeaders.length>=2?section.tableHeaders:defaults
  const commitHeader=(index,payload)=>{
    if(!section?.id||!onQuestionChange) return
    const next=[...headers]
    next[index]=payload.text
    const key='matching-header-'+index
    onQuestionChange(section.id,{tableHeaders:next,richText:{...(section.richText||{}),[key]:payload.html}})
  }
  const commitCell=(rowIndex,side,payload)=>{
    if(!section?.id||!onQuestionChange) return
    const next=rows.map(row=>({...row}))
    next[rowIndex][side]=payload.text
    const key='matching-'+rowIndex+'-'+side
    onQuestionChange(section.id,{content:serializeMatchingRows(next),richText:{...(section.richText||{}),[key]:payload.html}})
  }
  return <table data-matching-columns-table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed',fontSize:`${qFs}px`,direction:isUrdu?'rtl':'ltr'}}>
    <thead><tr style={{background:`linear-gradient(180deg,${themeColor}12,${themeColor}07)`}}>
      {headers.map((header,index)=>{
        const key='matching-header-'+index
        const rich=section?.richText?.[key]||''
        return <th key={index} data-column-header={index===0?'A':'B'} style={{border:`1px solid ${themeColor}66`,padding:`${5*fs}px ${7*fs}px`,textAlign:'center',fontWeight:900,overflowWrap:'anywhere',wordBreak:'break-word'}}>
          {(editMode||rich)&&section?.id?<InlineEditable text={header} richHtml={rich} editMode={editMode} direction={isUrdu?'rtl':'ltr'} fieldKey={key} sectionId={section.id} ariaLabel={`Edit Column ${index===0?'A':'B'} heading`} onActivate={onActiveEditable} onCommit={payload=>commitHeader(index,payload)} style={{display:'block',textAlign:'center',fontWeight:900}}/>:header}
        </th>
      })}
    </tr></thead>
    <tbody>{rows.map((row,rowIndex)=><tr key={rowIndex}>
      {['left','right'].map((side,cellIndex)=>{
        const key='matching-'+rowIndex+'-'+side
        const rich=section?.richText?.[key]||''
        const value=row[side]||''
        return <td key={side} style={{border:`1px solid ${themeColor}55`,padding:`${6*fs}px ${8*fs}px`,textAlign:isUrdu?'right':'left',minHeight:`${28*fs}px`,overflowWrap:'anywhere',wordBreak:'break-word'}}>
          {(editMode||rich)&&section?.id?<InlineEditable text={value} richHtml={rich} editMode={editMode} direction={isUrdu?'rtl':'ltr'} fieldKey={key} sectionId={section.id} ariaLabel={`Edit Column ${cellIndex===0?'A':'B'} row ${rowIndex+1}`} onActivate={onActiveEditable} onCommit={payload=>commitCell(rowIndex,side,payload)} style={{display:'block',minWidth:0,minHeight:'1.2em'}}/>:<AnswerText text={value}/>}
        </td>
      })}
    </tr>)}</tbody>
  </table>
}

function SentenceUsageTable({ content, isUrdu, qFs, fs, themeColor, editMode=false, section=null, onQuestionChange, onActiveEditable }) {
  const rawLines = String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  let items = rawLines.map(line => line.replace(/^(?:\d+|[ivxlcdm]+|[a-z]|الف|ب|ج|د|ہ|و)[.)]\s*/i,'').trim()).filter(Boolean)
  if (items.length <= 1) items = String(content).split(/[،,]|\s{2,}/).map(item => item.replace(/^\d+[.)]\s*/,'').trim()).filter(Boolean)
  const defaults=isUrdu?['الفاظ','جملے']:['Words','Sentences']
  const headers=Array.isArray(section?.tableHeaders)&&section.tableHeaders.length>=2?section.tableHeaders:defaults
  const commitHeader=(index,payload)=>{
    if(!section?.id||!onQuestionChange) return
    const next=[...headers]; next[index]=payload.text
    onQuestionChange(section.id,{tableHeaders:next})
  }
  const commitWord=(index,payload)=>{
    if(!section?.id||!onQuestionChange) return
    const next=[...items]; next[index]=payload.text
    const nextContent=next.map((item,i)=>`${i+1}. ${item}`).join('\n')
    const key='sentence-word-'+index
    onQuestionChange(section.id,{content:nextContent,richText:{...(section.richText||{}),[key]:payload.html}})
  }
  return <table data-sentence-usage-table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:`${qFs}px`, direction:isUrdu?'rtl':'ltr' }}>
    <thead><tr style={{ background:`${themeColor}10` }}>
      <th style={{ width:'9%', border:`1px solid ${themeColor}66`, padding:5 }}>#</th>
      {headers.map((header,index)=><th key={index} style={{ width:index===0?'31%':undefined, border:`1px solid ${themeColor}66`, padding:5, textAlign:isUrdu?'right':'left', overflowWrap:'anywhere', wordBreak:'break-word' }}>
        {editMode&&section?.id?<InlineEditable text={header} editMode={true} direction={isUrdu?'rtl':'ltr'} fieldKey={'sentence-header-'+index} sectionId={section.id} ariaLabel={`Edit sentence table heading ${index+1}`} onActivate={onActiveEditable} onCommit={payload=>commitHeader(index,payload)} style={{display:'block',fontWeight:900}}/>:header}
      </th>)}
    </tr></thead>
    <tbody>{items.map((item,index)=><tr key={index}>
      <td style={{ border:`1px solid ${themeColor}55`, padding:5, textAlign:'center', fontWeight:700, fontFamily:'Arial,sans-serif', direction:'ltr' }}>{index+1}</td>
      <td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px ${7*fs}px`, textAlign:isUrdu?'right':'left', fontWeight:700, overflowWrap:'anywhere', wordBreak:'break-word' }}>
        {editMode&&section?.id?<InlineEditable text={item} editMode={true} direction={isUrdu?'rtl':'ltr'} fieldKey={'sentence-word-'+index} sectionId={section.id} ariaLabel={`Edit sentence word ${index+1}`} onActivate={onActiveEditable} onCommit={payload=>commitWord(index,payload)} style={{display:'block',fontWeight:700}}/>:<AnswerText text={item}/>}
      </td>
      <td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px ${7*fs}px`, minHeight:`${28*fs}px` }}><span style={{ display:'inline-block', width:'94%', borderBottom:`1px solid ${themeColor}88`, minHeight:'1.25em' }} /></td>
    </tr>)}</tbody>
  </table>
}

function PairPracticeTable({ content, isUrdu, qFs, fs, themeColor, editMode=false, section=null, onQuestionChange, onActiveEditable }) {
  const lines = String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  let items = lines.map(line => line.replace(/^(?:\d+|[ivxlcdm]+|[a-z]|الف|ب|ج|د|ہ|و)[.)]\s*/i,'').trim()).filter(Boolean)
  if (items.length <= 2) items = String(content).split(/[،,]|\s{2,}/).map(item=>item.replace(/^\d+[.)]\s*/,'').trim()).filter(Boolean)
  const defaults=isUrdu?['لفظ','جواب']:['Word','Answer']
  const headers=Array.isArray(section?.tableHeaders)&&section.tableHeaders.length>=2?section.tableHeaders:defaults
  const commitHeader=(index,payload)=>{ if(section?.id&&onQuestionChange){const next=[...headers];next[index]=payload.text;onQuestionChange(section.id,{tableHeaders:next})} }
  const commitItem=(index,payload)=>{ if(section?.id&&onQuestionChange){const next=[...items];next[index]=payload.text;onQuestionChange(section.id,{content:next.map((item,i)=>`${i+1}. ${item}`).join('\n')})} }
  return <table data-pair-practice-table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:`${qFs}px`, direction:isUrdu?'rtl':'ltr' }}>
    <thead><tr style={{ background:`${themeColor}10` }}>
      <th style={{ width:'9%', border:`1px solid ${themeColor}66`, padding:5 }}>#</th>
      {headers.map((header,index)=><th key={index} style={{ border:`1px solid ${themeColor}66`, padding:5, textAlign:isUrdu?'right':'left', overflowWrap:'anywhere', wordBreak:'break-word' }}>{editMode&&section?.id?<InlineEditable text={header} editMode={true} direction={isUrdu?'rtl':'ltr'} fieldKey={'pair-header-'+index} sectionId={section.id} ariaLabel={`Edit pair table heading ${index+1}`} onActivate={onActiveEditable} onCommit={payload=>commitHeader(index,payload)} style={{display:'block',fontWeight:900}}/>:header}</th>)}
    </tr></thead>
    <tbody>{items.map((item,index)=><tr key={index}>
      <td style={{ border:`1px solid ${themeColor}55`, padding:5, textAlign:'center', fontWeight:700 }}>{index+1}</td>
      <td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px`, textAlign:isUrdu?'right':'left', overflowWrap:'anywhere', wordBreak:'break-word' }}>{editMode&&section?.id?<InlineEditable text={item} editMode={true} direction={isUrdu?'rtl':'ltr'} fieldKey={'pair-item-'+index} sectionId={section.id} ariaLabel={`Edit pair table word ${index+1}`} onActivate={onActiveEditable} onCommit={payload=>commitItem(index,payload)} style={{display:'block'}}/>:<AnswerText text={item}/>}</td>
      <td style={{ border:`1px solid ${themeColor}55`, padding:`${5*fs}px` }}><span style={{ display:'inline-block', width:'85%', borderBottom:`1px solid ${themeColor}88`, minHeight:'1em' }} /></td>
    </tr>)}</tbody>
  </table>
}


function VerticalMathLines({ lines, themeColor }) {
  return <div data-place-value-stack style={{ display:'inline-grid', gridTemplateColumns:'18px minmax(3ch,max-content)', alignItems:'baseline', justifyContent:'center', columnGap:4, fontVariantNumeric:'tabular-nums', direction:'ltr' }}>
    {lines.map((raw,index)=>{
      const line=String(raw||'').trim()
      if(/^_+$/.test(line)) return <span key={index} style={{ gridColumn:'1 / -1', height:5, borderTop:`1.6px solid ${themeColor}`, marginTop:1 }} />
      const match=line.match(/^([+\-−×xX÷])?\s*([0-9][0-9,.' ]*)$/)
      if(match) return <Fragment key={index}><span style={{ textAlign:'center', fontWeight:800 }}>{match[1]||''}</span><span style={{ textAlign:'right', whiteSpace:'pre', letterSpacing:0 }}>{match[2].trim()}</span></Fragment>
      return <span key={index} style={{ gridColumn:'1 / -1', textAlign:'center', whiteSpace:'pre' }}>{line}</span>
    })}
  </div>
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
            return <div key={colIndex} style={{ border:`1px solid ${themeColor}55`, borderRadius:5, padding:`${7*fs}px ${9*fs}px`, textAlign:'center', fontFamily:mathFont, fontSize:`${Math.max(qFs+1,14)}px`, lineHeight:1.35, minHeight:`${58*fs}px`, display:'grid', placeItems:'center' }}>
              <VerticalMathLines lines={cellLines} themeColor={themeColor} />
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

function renderContent({ content, kind, isUrdu, qFs, fs, themeColor, mcqLayout, shortLayout, answerLinesPerItem = 0, editMode=false, section=null, onQuestionChange, onActiveEditable }) {
  const mcqs = kind === 'mcq' ? parseMcqRows(content) : []
  if (mcqs.length) return <McqSection rows={mcqs} layout={mcqLayout} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor} editMode={editMode} section={section} onQuestionChange={onQuestionChange} onActiveEditable={onActiveEditable}/>

  const tableRows = parseMarkdownTable(content)
  if (tableRows.length >= 2) return <SourceTable rows={tableRows} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor} editMode={editMode} section={section} onQuestionChange={onQuestionChange} onActiveEditable={onActiveEditable}/>
  if (kind === 'matching') return <MatchingColumnsTable content={content} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor} editMode={editMode} section={section} onQuestionChange={onQuestionChange} onActiveEditable={onActiveEditable}/>
  if (kind === 'sentence_usage') return <SentenceUsageTable content={content} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor} editMode={editMode} section={section} onQuestionChange={onQuestionChange} onActiveEditable={onActiveEditable}/>
  if (kind === 'pair_table') return <PairPracticeTable content={content} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor} editMode={editMode} section={section} onQuestionChange={onQuestionChange} onActiveEditable={onActiveEditable}/>
  if (['vertical_math','math_compare','math_number_name','math_place_value','math_order','math_table'].includes(kind)) return <MathPracticeGrid content={content} kind={kind} qFs={qFs} fs={fs} themeColor={themeColor}/>

  const rawLines = String(content).split(/\r?\n/).map(line=>line.trim()).filter(Boolean)
  const numberedRe = /^(?:\d+|[ivxlcdm]+|[a-z]|الف|ب|ج|د|ہ|و)[.)]\s*/i
  const firstNumbered = rawLines.findIndex(line=>numberedRe.test(line))
  if (firstNumbered > 0 && firstNumbered <= 2) {
    const bank = rawLines.slice(0, firstNumbered).join(' ')
    const bankRows = parseNumberedLines(rawLines.slice(firstNumbered).join('\n'))
    return <><div data-word-bank style={{ border:`1px solid ${themeColor}55`, background:`${themeColor}0A`, padding:`${5*fs}px ${8*fs}px`, marginBottom:`${6*fs}px`, textAlign:'center', fontWeight:700 }}>{bank}</div><NumberedList rows={bankRows} content={rawLines.slice(firstNumbered).join('\n')} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout="1-column" themeColor={themeColor} editMode={false}/></>
  }

  const rows = parseNumberedLines(content)
  if (kind === 'short') return <NumberedList rows={rows} content={content} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout={shortLayout} themeColor={themeColor} answerLinesPerItem={answerLinesPerItem} editMode={editMode} section={section} onQuestionChange={onQuestionChange} onActiveEditable={onActiveEditable}/>
  if (kind === 'matching' && rows.length) return <MatchingColumnsTable content={content} isUrdu={isUrdu} qFs={qFs} fs={fs} themeColor={themeColor} editMode={editMode} section={section} onQuestionChange={onQuestionChange} onActiveEditable={onActiveEditable}/>
  if (kind === 'vertical_math' && rows.length) {
    return <div data-vertical-math style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(3,rows.length)}, minmax(0,1fr))`, gap:`${8*fs}px`, direction:'ltr' }}>
      {rows.map(row => <div key={row.serial} style={{ border:`1px solid ${themeColor}55`, padding:`${8*fs}px`, textAlign:'center', fontFamily:"'Cambria Math', 'Times New Roman', serif", fontSize:`${Math.max(qFs+1,14)}px`, fontWeight:700, minHeight:`${38*fs}px` }}><span style={{ color:themeColor }}>{row.serial}.</span> <AnswerText text={row.text}/></div>)}
    </div>
  }
  if (rows.length >= 2) return <NumberedList rows={rows} content={content} isUrdu={isUrdu} qFs={qFs} fs={fs} shortLayout="1-column" themeColor={themeColor} answerLinesPerItem={answerLinesPerItem} editMode={editMode} section={section} onQuestionChange={onQuestionChange} onActiveEditable={onActiveEditable}/>
  const richContent=section?.richText?.content||''
  return (editMode||richContent) && section?.id ? <InlineEditable as="div" singleLine={false} text={content} richHtml={richContent} editMode={editMode} direction={isUrdu?'rtl':'ltr'} fieldKey="content" sectionId={section.id} ariaLabel="Edit question content" onActivate={onActiveEditable} onCommit={payload=>onQuestionChange?.(section.id,{content:payload.text,richText:{...(section.richText||{}),content:payload.html}})} style={{ whiteSpace:'pre-wrap', fontSize:`${qFs}px`, textAlign:isUrdu?'right':'left' }}/> : <div style={{ whiteSpace:'pre-wrap', fontSize:`${qFs}px`, textAlign:isUrdu?'right':'left' }}><AnswerText text={content}/></div>
}

export default function OfficialSectionRenderer({
 questions = [], isUrdu = false, editMode = false, fs = 1, qFs = 13, headingFs = null,
 themeColor = '#123b67', onQuestionChange, onDeleteSection, onDuplicateSection, onMoveSection, onAddSection, onSelectSection, selectedSectionId = '', onActiveEditable,
 qBorderStyle = 'none', mcqLayout = 'matrix-table', shortLayout = '1-column', showAnsLines = false,
 showSectionLine = true, urdLineH = 2, engLineH = 1.5, letterSp = 0,
 wordSp = 0, textAlign = 'start', fontFamily = '', fontBold = false, fontItalic = false,
 fontUnderline = false, showUrduHeaders = false
}) {
 const ordered = [...questions].sort((a,b)=>Number(a.sourceOrder||0)-Number(b.sourceOrder||0))
 return <div data-official-sections data-global-bold={fontBold?'true':'false'} data-global-italic={fontItalic?'true':'false'} data-global-underline={fontUnderline?'true':'false'} style={{ direction:isUrdu?'rtl':'ltr', fontFamily:fontFamily || (isUrdu?URDU_FONT_STACK:'inherit'), fontWeight:fontBold?700:400, fontStyle:fontItalic?'italic':'normal', textDecoration:fontUnderline?'underline':'none', lineHeight:isUrdu?urdLineH:engLineH, letterSpacing:String(letterSp)+'px', wordSpacing:String(wordSp)+'px' }}>
  {ordered.map((section,index)=>{
   const kind=inferOfficialSectionKind(section)
   if(kind==='marker'){
    const labels=String(section.content||'').split(/\r?\n/).filter(isSectionMarkerLine)
    return <Fragment key={section.id||index}>{labels.map((line,i)=><SectionBanner key={i} text={cleanSectionMarker(line)} themeColor={themeColor} isUrdu={isUrdu} fs={fs}/>)}</Fragment>
   }
   const ordinal=ordered.slice(0,index+1).filter(item=>inferOfficialSectionKind(item)!=='marker').length
   const serial=Number(section.sourceOrder||ordinal)||ordinal
   const rawHeading=String(section.heading||'').trim()
   const cleanHeading=stripTrailingMarks(rawHeading)
   const instruction=cleanHeading
    .replace(/^(?:Q(?:uestion)?\s*\d+\s*[:.)-]?|سوال(?:\s+نمبر)?\s*\d+\s*[:.)-]?)\s*/i,'').trim()
   const resolvedMarks=resolveSectionTotalMarks(section)
   const marksLabel=extractMarksLabel(rawHeading,resolvedMarks)
   const parts=splitContentWithMarkers(section.content)
   const sectionBorder=qBorderStyle==='box'?'1px solid '+themeColor+'66':qBorderStyle==='table'?'1.5px solid '+themeColor:'none'
   const sectionPadding=qBorderStyle==='box'?String(7*fs)+'px':0
   const contentPadding=qBorderStyle==='table'?String(6*fs)+'px '+String(8*fs)+'px':0
   const defaultLines=showAnsLines&&['short','long','list','fill_blank'].includes(kind)?(kind==='long'?6:2):0
   const answerLines=Number(section.answerLines||defaultLines)
   const resolvedAlign=textAlign==='start'?(isUrdu?'right':'left'):textAlign==='end'?(isUrdu?'left':'right'):textAlign
   const divider=section.showDivider===true?true:section.showDivider===false?false:showSectionLine
   const selected=editMode&&String(selectedSectionId||'')===String(section.id||'')
   const previousKind=[...ordered.slice(0,index)].reverse().map(inferOfficialSectionKind).find(value=>value!=='marker')||''
   const currentGroup=kind==='mcq'?'objective':'subjective'
   const previousGroup=previousKind?(previousKind==='mcq'?'objective':'subjective'):''
   const showGroupBanner=Boolean(isUrdu&&showUrduHeaders&&currentGroup!==previousGroup)
   const groupBannerText=currentGroup==='objective'?'حصہ معروضی':'حصہ انشائیہ'
   const serialText=isUrdu?'سوال نمبر '+serial+':':'Q'+serial+'.'
   const commitInstruction=payload=>{
    const richText={...(section.richText||{}),headingInstruction:payload.html}
    // Formatting a selected phrase must never re-serialize question numbers or
    // marks. Only rebuild the actual heading when its plain text changed.
    if(String(payload.text??'')===instruction){
     onQuestionChange?.(section.id,{richText})
     return
    }
    let heading=replaceQuestionSerial(payload.text,serial,isUrdu)
    heading=replaceSectionMarks(heading,resolvedMarks,isUrdu)
    onQuestionChange?.(section.id,{heading,text:heading,textUrdu:isUrdu?heading:'',richText})
   }
   const commitSerial=payload=>{
    const next=Math.max(1,Number(String(payload.text).match(/\d+/)?.[0]||serial))
    const heading=replaceQuestionSerial(section.heading||'',next,isUrdu)
    onQuestionChange?.(section.id,{sourceOrder:next,heading,text:heading,textUrdu:isUrdu?heading:''})
   }
   const commitMarks=payload=>{
    const next=Math.max(0,Number(String(payload.text).match(/\d+/)?.[0]||0))
    const heading=replaceSectionMarks(section.heading||'',next,isUrdu)
    onQuestionChange?.(section.id,{marks:next,operationalMarks:next,marksManuallyEdited:true,heading,text:heading,textUrdu:isUrdu?heading:''})
   }
   return <Fragment key={section.id||index}>
    {showGroupBanner&&<SectionBanner text={groupBannerText} themeColor={themeColor} isUrdu={true} fs={fs}/>}
    <section data-official-section data-section-kind={kind} data-question-border={qBorderStyle} data-edit-selected={selected?'true':undefined}
    onMouseDown={event=>{if(editMode){if(event.target?.closest?.('[data-paper-inline-editable]')) return;event.stopPropagation();onSelectSection?.(section.id)}}}
    onClickCapture={event=>{if(editMode&&event.target?.closest?.('[data-paper-inline-editable]'))onSelectSection?.(section.id)}}
    style={{marginBottom:String(10*fs)+'px',border:sectionBorder,borderRadius:qBorderStyle==='box'?7:0,padding:sectionPadding,breakInside:'auto',overflow:qBorderStyle==='table'?'hidden':undefined,outline:editMode?(selected?'2px dashed '+themeColor:'1px dashed '+themeColor+'77'):'none',outlineOffset:editMode?3:0,background:selected?themeColor+'0A':undefined}}>
    <div data-section-heading data-language={isUrdu?'urdu':'english'} style={{display:'grid',gridTemplateColumns:isUrdu?'84px minmax(0,1fr)':'minmax(0,1fr) 84px',gridTemplateRows:'auto',alignItems:'center',gap:8,padding:qBorderStyle==='table'?String(5*fs)+'px '+String(7*fs)+'px':undefined,paddingBottom:qBorderStyle==='table'?String(5*fs)+'px':String(4*fs)+'px',marginBottom:qBorderStyle==='table'?0:String(6*fs)+'px',borderBottom:qBorderStyle==='table'?'1.5px solid '+themeColor:(divider?'2px solid '+themeColor:'none'),background:qBorderStyle==='table'?themeColor+'09':undefined,direction:'ltr'}}>
     <div data-question-heading style={{gridColumn:isUrdu?2:1,gridRow:1,direction:isUrdu?'rtl':'ltr',textAlign:isUrdu?'right':'left',fontWeight:900,fontSize:String(Math.max(Number(headingFs||0),qFs+1,13))+'px',display:'flex',flexDirection:'row',justifyContent:'flex-start',alignItems:'baseline',gap:6,minWidth:0}}>
      <InlineEditable text={serialText} editMode={editMode} direction={isUrdu?'rtl':'ltr'} fieldKey="question-number" sectionId={section.id} ariaLabel={'Edit question '+serial+' number'} onActivate={onActiveEditable} onCommit={commitSerial} style={{flex:'0 0 auto',whiteSpace:'nowrap',fontWeight:900}} />
      <InlineEditable text={instruction} richHtml={section.richText?.headingInstruction||''} editMode={editMode} direction={isUrdu?'rtl':'ltr'} fieldKey="question-heading" sectionId={section.id} ariaLabel={'Edit question '+serial+' heading'} onActivate={onActiveEditable} onCommit={commitInstruction} style={{flex:'1 1 auto',minWidth:0,fontWeight:500}} />
     </div>
     {marksLabel?<div data-marks-badge style={{gridColumn:isUrdu?1:2,gridRow:1,direction:'ltr',textAlign:'center',alignSelf:'center',justifySelf:isUrdu?'start':'end',minWidth:64,border:'1px solid '+themeColor,borderRadius:4,padding:'2px 7px',color:themeColor,fontWeight:800,fontSize:String(Math.max(10,qFs-2))+'px',whiteSpace:'nowrap',fontFamily:'Arial,sans-serif'}}>
      <InlineEditable text={marksLabel} editMode={editMode} direction="ltr" fieldKey="marks" sectionId={section.id} ariaLabel={'Edit question '+serial+' marks'} onActivate={onActiveEditable} onCommit={commitMarks} style={{display:'block',textAlign:'center'}} />
     </div>:<span/>}
    </div>
    {parts.length?parts.map((part,partIndex)=>part.type==='marker'
     ?<SectionBanner key={partIndex} text={part.text} themeColor={themeColor} isUrdu={isUrdu} fs={fs}/>
     :<div key={partIndex} style={{textAlign:resolvedAlign,padding:contentPadding}}>{renderContent({content:part.text,kind,isUrdu,qFs,fs,themeColor,mcqLayout,shortLayout,answerLinesPerItem:Math.max(0,Number(section.answerLinesPerItem)||0),editMode:editMode&&parts.length===1,section,onQuestionChange,onActiveEditable})}</div>):null}
    {answerLines>0&&<div data-configurable-answer-lines style={{padding:contentPadding}}>{Array.from({length:answerLines},(_,lineIndex)=><div key={lineIndex} style={{height:String(20*fs)+'px',borderBottom:'1px solid #8793a0'}}/>)}</div>}
   </section>
   </Fragment>
  })}
 </div>
}