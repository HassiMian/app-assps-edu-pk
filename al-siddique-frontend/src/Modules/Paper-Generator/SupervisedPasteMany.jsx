import {useMemo,useRef,useState} from 'react'
import Portal from '../../components/Portal'
import {parsePasteMany,validatePasteManyRows,PASTE_MANY_SUPPORTED_TYPES} from './pasteManyReview.js'

const panel={color:'#e2e8f0',background:'#0b2745',border:'1px solid #375372',borderRadius:10,padding:12}
const input={boxSizing:'border-box',width:'100%',minWidth:0,padding:'7px 9px',fontSize:12,
 color:'#fff',background:'#0a2039',border:'1px solid #486584',borderRadius:7}
const button={border:'1px solid #486584',borderRadius:7,padding:'8px 12px',background:'#153957',
 color:'#fff',fontWeight:700,cursor:'pointer',fontSize:12}
const gold={...button,background:'#c8991a',color:'#071e34',border:0}
const label={display:'grid',gap:5,fontSize:11,fontWeight:750}
const optionLabels=['A','B','C','D']
const languages=['english','urdu','dual']
function EditorField({name,children}){return <label style={label}>{name}{children}</label>}
export default function SupervisedPasteMany({subject,questionTypes=[],existingQuestions=[],onCommit,onClose}){
 const supportedTypes=useMemo(()=>questionTypes.filter(t=>PASTE_MANY_SUPPORTED_TYPES.has(t.value)),[questionTypes])
 const [raw,setRaw]=useState('')
 const [type,setType]=useState(supportedTypes.find(t=>t.value==='short')?.value||supportedTypes[0]?.value||'short')
 const [medium,setMedium]=useState(/urdu|quran|islamiat|nazra/i.test(subject?.name||'')?'urdu':'english')
 const [rows,setRows]=useState(null)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState(false)
 const fileRef=useRef()
 const analysis=useMemo(()=>rows?validatePasteManyRows(rows,existingQuestions,subject?.id||'',supportedTypes.map(t=>t.value)):null,
  [rows,existingQuestions,subject?.id,supportedTypes])
 const invalidate=()=>{setRows(null);setError('');setNotice('')}
 const changeRaw=value=>{setRaw(value);invalidate()}
 const patch=(id,field,value)=>{setRows(prev=>prev.map(row=>row.id===id?{...row,[field]:value}:row));setError('');setNotice('')}
 const parse=()=>{try{const data=parsePasteMany(raw,{type,medium});if(!data.length)throw new Error('Paste some questions first.')
   setRows(data);setError('');setNotice('Parsed locally. No Question Bank records have been written. Review each selected row.')}
  catch(e){setError(e.message);setRows(null)}}
 const setOption=(row,label,field,value)=>{
  const options=optionLabels.map(letter=>row.options.find(o=>o.label===letter)||{label:letter,text:'',textUrdu:''})
   .map(o=>o.label===label?{...o,[field]:value,...(row.medium==='urdu'&&field==='textUrdu'?{text:''}:{})}:o)
  patch(row.id,'options',options)
 }
 const skipDuplicates=()=>{if(!analysis)return
  const ids=new Set(analysis.rows.filter(row=>row.duplicateExisting||row.duplicateBatch).map(row=>row.id))
  setRows(prev=>prev.map(row=>ids.has(row.id)?{...row,included:false}:row))
  setNotice('Duplicate rows excluded. Review remaining rows before commit.')}
 const importFile=async event=>{
  const file=event.target.files?.[0];event.target.value=''
  if(!file)return
  if(!/\.txt$/i.test(file.name)){setError('Only .txt is supported here.');return}
  if(file.size>200000){setError('Keep each file under 200 KB.');return}
  try{const text=await file.text();changeRaw(raw?raw+'\n---\n'+text:text)}
  catch(e){setError('Text file could not be read: '+e.message)}
 }
 const commit=()=>{
  if(!analysis?.canCommit)return
  if(busy)return
  setBusy(true);setError('')
  try{
   const result=onCommit({subjectId:subject.id,rows})
   if(!result||result.inserted!==analysis.includedCount)throw new Error('The committed count differed from the reviewed batch. Refresh and verify the Question Bank.')
   setNotice(result.inserted+' reviewed question(s) committed successfully. The source text remains in this window.')
   setRows(null)
  }catch(e){setError(e.message)}
  finally{setBusy(false)}
 }
 return <Portal><div data-supervised-paste-many style={{position:'fixed',inset:0,zIndex:9999,
  background:'rgba(0,0,0,.84)',display:'grid',placeItems:'center',padding:14}}>
  <div className="super-module-card" style={{...panel,width:'min(1080px,96vw)',maxHeight:'94vh',overflowY:'auto',padding:20}}>
   <header style={{display:'flex',alignItems:'start',justifyContent:'space-between',gap:12}}>
    <div><h2 style={{margin:0,color:'#e8b420',fontSize:19}}>Paste Many — Review before Commit</h2>
     <p style={{fontSize:12,color:'#b5c7dc',margin:'6px 0'}}>Subject: {subject?.name} · {subject?.classLevel||'Class not specified'}. Parsing is read-only; no marks or answers are invented.</p></div>
    <button type="button" style={button} onClick={onClose}>Close ×</button>
   </header>
   <div style={{...panel,marginTop:11}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10}}>
     <EditorField name="Default Question Type"><select aria-label="Paste default type" style={input} value={type}
       onChange={e=>{setType(e.target.value);invalidate()}}>{supportedTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></EditorField>
     <EditorField name="Default Medium"><select aria-label="Paste default medium" style={input} value={medium}
       onChange={e=>{setMedium(e.target.value);invalidate()}}>{languages.map(m=><option key={m} value={m}>{m[0].toUpperCase()+m.slice(1)}</option>)}</select></EditorField>
     <div style={{display:'flex',gap:8,alignItems:'end'}}><button type="button" style={button} onClick={()=>fileRef.current?.click()}>Load .txt</button>
      <input aria-label="Load paste text file" type="file" ref={fileRef} accept=".txt,text/plain" hidden onChange={importFile}/></div>
    </div>
    <p style={{fontSize:11,color:'#b5c7dc',lineHeight:1.6}}>Accepts ordinary numbered lines (1. Question, 2. Question), one question per line, or existing Q:/UR:/MARKS:/ANS:/CHAP:/PRI: format. Separate structured blocks with --- if preferred. MCQ options can be A), B), C) or A:, B:, C:. Every selected row requires explicit marks.</p>
    <textarea aria-label="Paste many source text" value={raw} onChange={e=>changeRaw(e.target.value)} rows={7}
      placeholder={'1. Define photosynthesis.\n2. What is respiration?\n\nOr: Q: Define photosynthesis.\nMARKS: 2\n---'}
      style={{...input,fontFamily:'Consolas,monospace',lineHeight:1.5,resize:'vertical'}}/>
    <div style={{display:'flex',justifyContent:'flex-end',marginTop:9}}>
     <button data-review-paste type="button" disabled={!raw.trim()} style={{...gold,opacity:raw.trim()?1:.45}} onClick={parse}>1. Parse & Review (No Save) →</button>
    </div>
   </div>
   {analysis&&<div data-paste-review style={{...panel,marginTop:12,display:'grid',gap:12}}>
    <div style={{display:'flex',gap:9,alignItems:'center',flexWrap:'wrap',justifyContent:'space-between'}}>
     <strong style={{fontSize:14,color:'#e8b420'}}>2. Review Questions ({analysis.rows.length})</strong>
     <span style={{fontSize:12}}>{analysis.includedCount} selected · {analysis.invalidCount} require correction</span>
     <button type="button" style={button} onClick={skipDuplicates}>Skip Flagged Duplicates</button>
    </div>
    {analysis.rows.map((row,i)=><div key={row.id} data-paste-row data-paste-row-id={row.id}
     style={{padding:12,border:'1px solid '+(row.errors.length?'#b45353':row.included?'#496b89':'#36506a'),
     borderRadius:9,opacity:row.included?1:.62,background:'#09213c'}}>
     <div style={{display:'flex',alignItems:'center',gap:9,justifyContent:'space-between',flexWrap:'wrap',marginBottom:9}}>
      <label style={{fontSize:12,fontWeight:850}}><input type="checkbox" aria-label={'Include row '+(i+1)}
       checked={row.included!==false} onChange={e=>patch(row.id,'included',e.target.checked)}/> Row {i+1} — {row.included?'Include':'Skip'}</label>
      {(row.duplicateExisting||row.duplicateBatch)&&<strong style={{fontSize:11,color:'#fda4af'}}>DUPLICATE {row.duplicateExisting?'— existing bank':'— within batch'}</strong>}
      {row.errors.length>0&&<strong style={{fontSize:11,color:'#fda4af'}}>Correction required</strong>}
     </div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(148px,1fr))',gap:9}}>
      <EditorField name="Type"><select aria-label={'Row '+(i+1)+' type'} style={input} value={row.type}
        onChange={e=>patch(row.id,'type',e.target.value)}>{supportedTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></EditorField>
      <EditorField name="Medium"><select aria-label={'Row '+(i+1)+' medium'} style={input} value={row.medium}
       onChange={e=>patch(row.id,'medium',e.target.value)}>{languages.map(m=><option key={m} value={m}>{m}</option>)}</select></EditorField>
      <EditorField name="Marks *"><input aria-label={'Row '+(i+1)+' marks'} style={input} value={row.marks} type="number"
       min="0.5" max="1000" step="0.5" onChange={e=>patch(row.id,'marks',e.target.value)} placeholder="Required"/></EditorField>
      <EditorField name="Priority"><select style={input} value={row.priority} onChange={e=>patch(row.id,'priority',e.target.value)}>
       {['all','exercise','past','additional'].map(v=><option key={v} value={v}>{v}</option>)}</select></EditorField>
     </div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:9,marginTop:9}}>
      {row.medium!=='urdu'&&<EditorField name="English Question *"><textarea aria-label={'Row '+(i+1)+' English question'}
       style={{...input,resize:'vertical'}} rows={2} value={row.text} onChange={e=>patch(row.id,'text',e.target.value)}/></EditorField>}
      {row.medium!=='english'&&<EditorField name={row.medium==='dual'?'Urdu Translation *':'Urdu Question *'}><textarea dir="rtl" aria-label={'Row '+(i+1)+' Urdu question'}
       style={{...input,resize:'vertical',fontSize:14}} rows={2} value={row.textUrdu} onChange={e=>patch(row.id,'textUrdu',e.target.value)}/></EditorField>}
     </div>
     {row.type==='mcq'&&<div style={{marginTop:9,display:'grid',gap:6}}>
      <strong style={{fontSize:11,color:'#b5c7dc'}}>MCQ options (at least two)</strong>
      {optionLabels.map(key=>{const o=row.options.find(x=>x.label===key)||{label:key,text:'',textUrdu:''};return <div key={key} style={{display:'flex',gap:7,alignItems:'center'}}>
       <strong style={{width:16,fontSize:11}}>{key}</strong>
       {row.medium!=='urdu'&&<input aria-label={'Row '+(i+1)+' option '+key} style={input} value={o.text} onChange={e=>setOption(row,key,'text',e.target.value)} placeholder="Option text"/>}
       {row.medium!=='english'&&<input dir="rtl" aria-label={'Row '+(i+1)+' Urdu option '+key} style={input}
        value={o.textUrdu||(row.medium==='urdu'?o.text:'')} onChange={e=>setOption(row,key,'textUrdu',e.target.value)} placeholder="Urdu option"/>}
      </div>})}
     </div>}
     {row.type==='columns'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginTop:9}}>
      <EditorField name="Left column (one per line)"><textarea style={input} rows={3} value={row.leftColumn.join('\n')} onChange={e=>patch(row.id,'leftColumn',e.target.value.split('\n').map(x=>x.trim()).filter(Boolean))}/></EditorField>
      <EditorField name="Right column (one per line)"><textarea style={input} rows={3} value={row.rightColumn.join('\n')} onChange={e=>patch(row.id,'rightColumn',e.target.value.split('\n').map(x=>x.trim()).filter(Boolean))}/></EditorField>
     </div>}
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:9,marginTop:9}}>
      <EditorField name="Answer (optional)"><input aria-label={'Row '+(i+1)+' answer'} style={input} value={row.answer} onChange={e=>patch(row.id,'answer',e.target.value)}/></EditorField>
      <EditorField name="Chapter (optional)"><input style={input} value={row.chapter} onChange={e=>patch(row.id,'chapter',e.target.value)}/></EditorField>
      <EditorField name="Topic (optional)"><input style={input} value={row.topic} onChange={e=>patch(row.id,'topic',e.target.value)}/></EditorField>
     </div>
     {row.included&&row.errors.map((msg,n)=><div key={n} style={{fontSize:11,color:'#fda4af',marginTop:5}}>• {msg}</div>)}
     {row.included&&row.warnings.map((msg,n)=><div key={n} style={{fontSize:11,color:'#fcd34d',marginTop:5}}>Review: {msg}</div>)}
    </div>)}
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
     <small style={{color:'#bac8dc'}}>Only selected, valid rows will be saved. Duplicates and missing marks block Commit until resolved or skipped.</small>
     <button data-paste-commit type="button" disabled={!analysis.canCommit||busy}
       style={{...gold,opacity:analysis.canCommit&&!busy?1:.4}} onClick={commit}>
       {busy?'Saving...':'3. Commit '+analysis.includedCount+' Reviewed Questions'}
     </button>
    </div>
   </div>}
   {error&&<div role="alert" style={{color:'#fecaca',fontSize:12,marginTop:9}}>{error}</div>}
   {notice&&<div role="status" style={{color:'#bbf7d0',fontSize:12,marginTop:9}}>{notice}</div>}
  </div>
 </div></Portal>
}
