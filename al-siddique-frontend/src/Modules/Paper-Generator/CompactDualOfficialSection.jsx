import React from 'react'
import { optionColumnCount, parseCompactDual, serializeCompactDual } from './compactDualParser.js'

const EN_FONT = '"Times New Roman", serif'
const UR_FONT = '"ASSPS Jameel Noori", "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif'
const INK = '#173b58'
const urLatin = /(\([A-Za-z][A-Za-z0-9₀-₉²³⁺⁻-]*\)|[A-Za-z][A-Za-z0-9₀-₉²³⁺⁻-]*(?:\s+[A-Za-z][A-Za-z0-9₀-₉²³⁺⁻-]*)*)/g
function UrduText({value}) {
 return String(value||'').split(urLatin).filter(Boolean).map((piece,index)=>
  /^\(?[A-Za-z]/.test(piece)
   ? <bdi key={index} dir="ltr" lang="en" style={{fontFamily:EN_FONT}}>{piece}</bdi>
   : <React.Fragment key={index}>{piece}</React.Fragment>)
}
const numberText = value=>typeof value==='number'?String(value):'('+String(value)+')'
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0))
const rightSide = {minWidth:0,textAlign:'right',direction:'rtl',unicodeBidi:'isolate',fontFamily:UR_FONT,fontSize:13,lineHeight:1.8}
const leftSide={minWidth:0,textAlign:'left',direction:'ltr',unicodeBidi:'isolate',fontFamily:EN_FONT,fontSize:11.5,lineHeight:1.48}
const pairGrid={display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1.12fr)',gap:5,minWidth:0,alignItems:'start'}
// A338: raster-optical bilingual alignment, calibrated against Windows Chrome
// and Linux Chromium with the actual available Nastaleeq font on each device.
function inkCenter(font,size,lineHeight,text){
 if(typeof document==='undefined')return 0
 const sample=String(text||'').replace(/\s+/g,' ').slice(0,34)||'Hg'
 const cache=inkCenter.cache||(inkCenter.cache=new Map())
 const key=font+'|'+size+'|'+lineHeight+'|'+sample
 if(cache.has(key))return cache.get(key)
 let value
 try{
  const canvas=inkCenter.canvas||(inkCenter.canvas=document.createElement('canvas'))
  let ctx=canvas.getContext('2d',{willReadFrequently:true})
  if(!ctx)return size*lineHeight/2
  ctx.font=size+'px '+font
  const pre=ctx.measureText(sample)
  const w=Math.min(700,Math.max(64,Math.ceil(pre.width)+32)),h=104
  canvas.width=w;canvas.height=h
  ctx=canvas.getContext('2d',{willReadFrequently:true})
  ctx.clearRect(0,0,w,h);ctx.font=size+'px '+font
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#000'
  const baseline=68
  ctx.fillText(sample,8,baseline)
  const pixels=ctx.getImageData(0,0,w,h).data
  let mass=0,weighted=0
  for(let y=0;y<h;y++){
   let row=0
   for(let x=0;x<w;x++)row+=pixels[(y*w+x)*4+3]
   if(row){mass+=row;weighted+=y*row}
  }
  const asc=pre.fontBoundingBoxAscent||size*.8,desc=pre.fontBoundingBoxDescent||size*.25
  const lineBaseline=(size*lineHeight-asc-desc)/2+asc
  const fallback=(pre.actualBoundingBoxAscent||size*.75)-(pre.actualBoundingBoxDescent||size*.2)
  value=mass?lineBaseline+(weighted/mass-baseline):lineBaseline-fallback/2
 }catch{value=size*lineHeight/2}
 if(!Number.isFinite(value))value=size*lineHeight/2
 if(cache.size>400)cache.clear()
 cache.set(key,value)
 return value
}
function opticalOffset(enSize,urSize,enLine,urLine,enText,urText){
 const a=inkCenter(EN_FONT,enSize,enLine,enText||'Group 1')
 const b=inkCenter(UR_FONT,urSize,urLine,urText||'گروپ 1')
 const platform=typeof navigator!=='undefined'
   ?String(navigator.userAgentData?.platform||navigator.platform||''):''
 // Windows Jameel pixel-density residual measured from the real Windows screenshot.
 const browserCorrection=/win/i.test(platform)?1.3:0
 return clamp(Math.round((a-b-browserCorrection)*10)/10,-9,9)
}
function EditableText({text,language,editMode,onBlur,compactOption=false}) {
 const isUrdu=language==='ur',base=isUrdu?rightSide:leftSide
 const style=compactOption?{...base,lineHeight:isUrdu?1.55:1.45}:base
 if(!editMode)return <span lang={language} dir={isUrdu?'rtl':'ltr'} style={style}>{isUrdu?<UrduText value={text}/>:text}</span>
 return <span lang={language} dir={isUrdu?'rtl':'ltr'} contentEditable
   suppressContentEditableWarning spellCheck={false}
   data-compact-inline-edit={language} style={{...style,display:'block',outline:'1px dashed #99b0c1'}}
   onBlur={event=>onBlur?.(event.currentTarget.textContent||'')}>{text}</span>
}
function EditorButton({children,onClick,disabled=false}) {
 return <button type="button" className="no-print" disabled={disabled}
   onMouseDown={event=>event.stopPropagation()}
   onClick={event=>{event.stopPropagation();onClick?.()}}
   style={{background:'#fff',border:'1px solid #c6d4df',borderRadius:4,
    padding:'2px 7px',color:INK,fontSize:11,cursor:disabled?'default':'pointer'}}>
   {children}
 </button>
}
function SectionHeader({section,index,editMode,onChange,parsedKind}) {
 const text=String(section.heading||'')
 const i=text.indexOf(' / ')
 const en=(i<0?text:text.slice(0,i)).replace(/^\s*Q\d+[.)]?\s*/i,'').trim()
 const ur=(i<0?'':text.slice(i+3)).replace(/^\s*سوال\s*نمبر\s*[0-9۰-۹]+\s*[:.۔]?\s*/,'').trim()
 const sz=clamp(section.dualHeadingFontSize||15,11,22)
 const kind=parsedKind==='mcq'?'MCQ':parsedKind==='short'?'Short':parsedKind==='long'?'Long':'Questions'
 const isGrid=section.dualTableMode==='grid'||section.layoutPreset==='table'
 const fallbackPreset=parsedKind==='mcq'?'mcq':parsedKind==='short'?'short':parsedKind==='long'?'long':'auto'
 return <div data-compact-dual-header style={{...pairGrid,
   direction:'ltr',gridTemplateColumns:'minmax(0,1fr) 90px minmax(0,1fr)',gap:7,
   padding:'5px 4px',background:'#fafcff',borderBottom:'1px solid #aebdcc'}}>
  <div lang="en" dir="ltr" style={{...leftSide,fontSize:sz,fontWeight:800,gridColumn:1,gridRow:1}}>
   {'Q'+(index+1)+'. '+en}</div>
  <div lang="ur" dir="rtl" style={{...rightSide,fontSize:sz+1,fontWeight:800,gridColumn:3,gridRow:1}}>
   <UrduText value={'سوال نمبر '+(index+1)+': '+ur}/></div>
  <div data-compact-section-marks style={{fontFamily:EN_FONT,fontSize:11,color:INK,fontWeight:800,textAlign:'center',gridColumn:2,gridRow:1}}>
   {Number(section.marks)||0} Marks</div>
  {editMode&&<div className="no-print" style={{gridColumn:'1 / -1',display:'flex',gap:5,
   justifyContent:'flex-end',fontFamily:EN_FONT,fontSize:11,alignItems:'center'}}>
   <span>{sz}px</span>
   <EditorButton disabled={sz<=11} onClick={()=>onChange?.({dualHeadingFontSize:sz-1})}>A−</EditorButton>
   <EditorButton disabled={sz>=22} onClick={()=>onChange?.({dualHeadingFontSize:sz+1})}>A+</EditorButton>
   <EditorButton onClick={()=>onChange?.(isGrid&&section.layoutPreset==='table'?
     {layoutPreset:fallbackPreset,dualTableMode:'minimal'}:
     {dualTableMode:isGrid?'minimal':'grid'})}>
    {kind+' Table: '+(isGrid?'ON':'OFF')}</EditorButton>
  </div>}
 </div>
}
function QuestionPair({item,editMode,change,language=null}) {
 const opt=opticalOffset(11.5,13,1.48,1.8,item.en,item.ur)
 const long=typeof item.number!=='number'
 const enSerial=numberText(item.number)+(long?'':'.')
 const urSerial=long?numberText(item.number):item.number+'۔'
 const urSerialFont=long?EN_FONT:UR_FONT
 const enSerialOffset=clamp(
   Math.round((inkCenter(EN_FONT,11.5,1.48,item.en)-
     inkCenter(EN_FONT,11.5,1.48,enSerial))*10)/10,-9,9)
 const urSerialOffset=clamp(
   Math.round((inkCenter(UR_FONT,13,1.8,item.ur)-
     inkCenter(urSerialFont,13,1.8,urSerial))*10)/10,-9,9)
 const platform=typeof navigator!=='undefined'?
   String(navigator.userAgentData?.platform||navigator.platform||''):''
 const winLatinChoiceOffset=long&&/win/i.test(platform)?1.2:0
 const english=<div lang="en" dir="ltr" style={{display:'grid',gridTemplateColumns:'23px minmax(0,1fr)',
   gap:3,minWidth:0,alignItems:'start'}}>
   <strong data-compact-serial="en" style={{
      fontFamily:EN_FONT,fontSize:11.5,lineHeight:1.48,fontWeight:800,color:INK,
      alignSelf:'start',display:'block',position:'relative',top:enSerialOffset+'px'}}>
     {enSerial}
   </strong>
   <EditableText text={item.en} language="en" editMode={editMode}
    onBlur={v=>change('en',v)}/>
  </div>
 const urdu=<div lang="ur" dir="rtl" style={{display:'grid',direction:'ltr',
   gridTemplateColumns:'minmax(0,1fr) 23px',gap:3,minWidth:0,alignItems:'start',
   position:'relative',top:opt+'px'}}>
   <EditableText text={item.ur} language="ur" editMode={editMode}
    onBlur={v=>change('ur',v)}/>
   <strong data-compact-serial="ur" aria-hidden="true"
    style={{fontFamily:urSerialFont,fontSize:13,lineHeight:1.8,fontWeight:800,
       alignSelf:'start',display:'block',position:'relative',
       top:(urSerialOffset+winLatinChoiceOffset)+'px',
       color:INK,textAlign:'right',whiteSpace:'nowrap'}}>
    {urSerial}
   </strong>
  </div>
 if(language==='en')return english
 if(language==='ur')return urdu
 return <div data-compact-question-pair style={pairGrid}>{english}{urdu}</div>
}
export function CompactDualOfficialSection({section,index,editMode=false,onQuestionChange}) {
 const parsed=parseCompactDual(section)
 if(!parsed)return null
 const grid=section.dualTableMode==='grid'||section.layoutPreset==='table'
 const mutate=(fn)=>{
  const next=structuredClone(parsed)
  fn(next)
  const content=serializeCompactDual(next)
  if(content!==section.content)onQuestionChange?.({content})
 }
 const linesFor=i=>clamp(section.responseLineCounts?.[String(i+1)] ?? section.answerLinesPerItem ?? 0,0,8)
 const adjustLines=(i,delta)=>{
  const map={...(section.responseLineCounts||{})},before=linesFor(i)
  map[String(i+1)]=clamp(before+delta,0,8)
  onQuestionChange?.({responseLineCounts:map})
 }
 const updateCell=(q,language,value,option)=>{
  const text=String(value).trim()
  if(!text)return
  mutate(next=>{
   const item=next.items[q]
   if(option===undefined)item[language]=text
   else item.options[option][language]=text
  })
 }
 const content=parsed.items.map((item,q)=>{
  const columns=parsed.kind==='mcq'?optionColumnCount(item.options):0
  const serialCell=<QuestionPair item={item} editMode={editMode}
   change={(language,value)=>updateCell(q,language,value)}/>
  const options=parsed.kind==='mcq'?<div data-compact-options
    data-option-columns={columns}
    style={{display:'grid',gridTemplateColumns:'repeat('+columns+', minmax(0,1fr))',
     gap:'0px 4px',marginTop:3,minWidth:0}}>
    {item.options.map((option,oi)=>{const opt=opticalOffset(11.5,13,1.45,1.55,option.en,option.ur);return <div key={option.id} data-compact-option={option.id}
     style={{...pairGrid,gridTemplateColumns:'minmax(0,1fr) minmax(0,.94fr)',gap:3,alignItems:'start',
      padding:'1px 3px',border:'none'}}>
      <div lang="en" dir="ltr" style={{display:'grid',gridTemplateColumns:'14px minmax(0,1fr)',gap:2,minWidth:0,alignItems:'start'}}>
       <strong style={{fontFamily:EN_FONT,fontSize:10.5,color:INK}}>{option.id}.</strong>
       <EditableText text={option.en} language="en" compactOption editMode={editMode}
        onBlur={v=>updateCell(q,'en',v,oi)}/>
      </div>
      <div lang="ur" dir="rtl" data-compact-urdu-optical={opt} style={{minWidth:0,alignSelf:'start',position:'relative',top:opt+'px'}}>
       <EditableText text={option.ur} language="ur" compactOption editMode={editMode}
        onBlur={v=>updateCell(q,'ur',v,oi)}/>
      </div>
     </div>})}
   </div>:null
  const count=parsed.kind==='mcq'?0:linesFor(q)
  return <React.Fragment key={item.id}>
   {parsed.kind==='long'&&q===1&&<div style={{textAlign:'center',
      fontFamily:EN_FONT,fontSize:10.5,padding:2,fontWeight:700,color:'#52687b'}}>OR / یا</div>}
   <div data-compact-question-block style={{padding:'3px 3px 4px',border:'none',
    background:q%2?'#f8fafc':'#fff',breakInside:'avoid',pageBreakInside:'avoid'}}>
    {serialCell}{options}
    {count>0&&<div data-compact-answer-lines>{Array.from({length:count},(_,line)=>
     <div key={line} style={{height:19,borderBottom:'1px solid #a9b9c7'}}/>)}</div>}
    {editMode&&parsed.kind!=='mcq'&&<div className="no-print"
     style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:5,
     color:'#63798c',fontFamily:EN_FONT,fontSize:11}}>
     <span>Answer lines: {count}</span>
     <EditorButton disabled={count===0} onClick={()=>adjustLines(q,-1)}>−</EditorButton>
     <EditorButton disabled={count===8} onClick={()=>adjustLines(q,1)}>+</EditorButton>
    </div>}
   </div>
  </React.Fragment>
 })
 return <section data-assps-canonical-compact-dual={parsed.kind}
  style={{background:'#fff',color:'#24384c',fontFamily:EN_FONT,
   breakInside:'auto',marginBottom:8}}>
  <SectionHeader section={section} index={index} editMode={editMode}
   parsedKind={parsed.kind} onChange={onQuestionChange}/>
  {grid&&parsed.kind==='mcq'?
   <table data-assps-bilingual-mcq-table data-assps-bilingual-version="A343"
    style={{width:'100%',border:'1px solid #b6c8d6',
      tableLayout:'fixed',borderCollapse:'collapse'}}>
    <tbody>{content.map((child,i)=>
     <tr key={parsed.items[i]?.id||i} data-assps-bilingual-mcq-row={i+1}>
      <td style={{padding:0,border:'none',borderBottom:'1px solid #c7d5df',
       verticalAlign:'top',breakInside:'avoid'}}>{child}</td>
     </tr>)}</tbody>
   </table>:
   grid&&parsed.kind!=='mcq'?
   <table data-assps-bilingual-subjective-table={parsed.kind}
    data-assps-bilingual-version="A343"
    style={{width:'100%',border:'1px solid #b6c8d6',tableLayout:'fixed',borderCollapse:'collapse'}}>
    <tbody>{parsed.items.map((item,q)=>{
     const count=linesFor(q)
     const cellChange=(language,value)=>updateCell(q,language,value)
     return <React.Fragment key={item.id||q}>
      {parsed.kind==='long'&&q===1&&
       <tr data-assps-table-or><td colSpan={2} style={{textAlign:'center',
        padding:2,fontSize:10.5,fontFamily:EN_FONT,borderBottom:'1px solid #cbd8e2'}}>OR / یا</td></tr>}
      <tr data-assps-dual-subjective-row data-assps-a333-subjective={parsed.kind}
        style={{breakInside:'avoid',pageBreakInside:'avoid',
         background:q%2?'#f8fafc':'#fff'}}>
       <td lang="en" dir="ltr" style={{width:'47%',padding:'4px 5px',verticalAlign:'top',
        border:'none',borderBottom:'1px solid #cbd8e2',borderRight:'1px solid #cbd8e2'}}>
        <QuestionPair item={item} editMode={editMode} change={cellChange} language="en"/>
       </td>
       <td lang="ur" dir="rtl" style={{width:'53%',padding:'4px 5px',verticalAlign:'top',
        border:'none',borderBottom:'1px solid #cbd8e2'}}>
        <QuestionPair item={item} editMode={editMode} change={cellChange} language="ur"/>
       </td>
      </tr>
      {(count>0||editMode)&&
       <tr data-assps-subjective-editor-row><td colSpan={2}
         style={{padding:0,borderBottom:'1px solid #cbd8e2'}}>
         {count>0&&<div data-compact-answer-lines>
          {Array.from({length:count},(_,line)=>
           <div key={line} style={{height:19,borderBottom:'1px solid #a9b9c7'}}/>)}
         </div>}
         {editMode&&<div className="no-print" style={{display:'flex',
          justifyContent:'flex-end',alignItems:'center',gap:5,fontFamily:EN_FONT,fontSize:11}}>
          <span>Answer lines: {count}</span>
          <EditorButton disabled={count===0} onClick={()=>adjustLines(q,-1)}>−</EditorButton>
          <EditorButton disabled={count===8} onClick={()=>adjustLines(q,1)}>+</EditorButton>
         </div>}
       </td></tr>}
     </React.Fragment>
    })}</tbody>
   </table>:content}
 </section>
}
