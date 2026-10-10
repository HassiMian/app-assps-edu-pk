import { useMemo, useRef, useState } from 'react';

import { QUICK_TEXT_KINDS, createQuickQuestionRecord } from './quickQuestionRecord.js'

const fieldStyle={boxSizing:'border-box',width:'100%',minWidth:0,padding:'9px 11px',color:'#f8fafc',background:'#112a48',border:'1px solid rgba(200,153,26,.3)',borderRadius:8,fontSize:13}

export default function QuickQuestionEntry({subject,types=[],existingQuestions=[],onSave,onAdvanced,onClose}) {
 const quickTypes=useMemo(()=>types.filter(t=>QUICK_TEXT_KINDS.has(t.value)),[types])
 const preferred=quickTypes.find(t=>t.value==='short')||quickTypes[0]
 const initialMedium=/urdu|islam|quran|nazra/i.test(subject?.name||'')?'urdu':'english'
 const [form,setForm]=useState({type:preferred?.value||'short',medium:initialMedium,text:'',textUrdu:'',marks:preferred?.marks||2,answer:'',chapter:'',topic:''})
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [showDetails,setShowDetails]=useState(false)
 const questionRef=useRef(null)
 const patch=(key,value)=>{
  setForm(previous=>({...previous,[key]:value}))
  setError('');setNotice('')
 }
 function save(another) {
  try {
   const record=createQuickQuestionRecord({...form,subjectId:subject?.id})
   const normalize=s=>String(s||'').trim().replace(/\s+/g,' ').toLowerCase()
   const duplicate=(existingQuestions||[]).some(q=>q.subjectId===record.subjectId && q.type===record.type
    && normalize((record.medium==='urdu'?q.textUrdu:q.text)||q.textUrdu)===normalize(form.text))
   if(duplicate)throw new Error('This question already exists for this subject and type. Edit the existing question instead.')
   const inserted=onSave(record)
   if(!inserted)throw new Error('Question could not be saved. Check available browser storage and try again.')
   if(another) {
    setForm(prev=>({...prev,text:'',textUrdu:'',answer:''}))
    setNotice('Question saved. Add the next one using the same class, subject and type.')
    questionRef.current?.focus()
   } else onClose()
  }catch(e){setError(e.message)}
 }
 return <div data-quick-question-entry style={{padding:15,border:'1px solid rgba(200,153,26,.46)',borderRadius:13,margin:'12px 20px',background:'linear-gradient(130deg,#0b2646,#122f52)',color:'#f8fafc'}}>
  <div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap'}}>
   <div><div style={{color:'#e8b420',fontSize:12,fontWeight:900}}>QUICK ADD QUESTION</div><div style={{fontSize:11,color:'#bbcbe1',marginTop:4}}>{subject?.name} · {subject?.classLevel||'All Classes'}. Only essential fields; Advanced Add handles MCQs, tables and diagrams.</div></div>
   <button type="button" onClick={onClose} style={{...fieldStyle,width:'auto',cursor:'pointer'}}>Close</button>
  </div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:10}}>
   <label style={{fontSize:11,fontWeight:800}}>Question Type
    <select aria-label="Quick question type" value={form.type} onChange={e=>{
     const next=quickTypes.find(t=>t.value===e.target.value)
     setForm(prev=>({...prev,type:e.target.value,marks:next?.marks||prev.marks}))
     setError('')
    }} style={{...fieldStyle,marginTop:4}}>
     {quickTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
    </select>
   </label>
   <label style={{fontSize:11,fontWeight:800}}>Language
    <select aria-label="Quick question language" value={form.medium} onChange={e=>patch('medium',e.target.value)} style={{...fieldStyle,marginTop:4}}>
     <option value="english">English</option><option value="urdu">Urdu</option><option value="dual">Dual (enter primary question first)</option>
    </select>
   </label>
   <label style={{fontSize:11,fontWeight:800}}>Marks
    <input aria-label="Quick question marks" type="number" min="0.5" step="0.5" max="1000" value={form.marks} onChange={e=>patch('marks',e.target.value)} style={{...fieldStyle,marginTop:4}}/>
   </label>
  </div>
  <label style={{display:'block',fontSize:11,fontWeight:900,marginTop:11}}>Question Text *
   <textarea ref={questionRef} autoFocus aria-label="Quick question text" required dir={form.medium==='english'?'ltr':'rtl'} value={form.text} onChange={e=>patch('text',e.target.value)} rows={3} placeholder={form.medium==='urdu'?'یہاں اپنا سوال لکھیں':'Type your question here...'} style={{...fieldStyle,display:'block',resize:'vertical',marginTop:5,fontSize:14,lineHeight:1.7}}/>
  </label>
  {form.medium==='dual'&&<label style={{display:'block',fontSize:11,fontWeight:900,marginTop:8}}>Urdu Translation *
   <textarea aria-label="Quick question Urdu translation" required dir="rtl" value={form.textUrdu} onChange={e=>patch('textUrdu',e.target.value)} rows={2} placeholder="سوال کا اردو ترجمہ" style={{...fieldStyle,display:'block',resize:'vertical',marginTop:5,fontSize:14,lineHeight:1.8}} />
  </label>}
  <button type="button" onClick={()=>setShowDetails(v=>!v)} style={{background:'transparent',color:'#e8b420',border:0,marginTop:7,fontSize:11,fontWeight:800,cursor:'pointer'}}> {showDetails?'− Hide optional details':'+ Optional Answer / Chapter / Topic'}</button>
  {showDetails&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,marginTop:7}}>
   <label style={{fontSize:11}}>Answer (optional)<input value={form.answer} onChange={e=>patch('answer',e.target.value)} style={{...fieldStyle,marginTop:4}}/></label>
   <label style={{fontSize:11}}>Chapter (optional)<input value={form.chapter} onChange={e=>patch('chapter',e.target.value)} style={{...fieldStyle,marginTop:4}}/></label>
   <label style={{fontSize:11}}>Topic (optional)<input value={form.topic} onChange={e=>patch('topic',e.target.value)} style={{...fieldStyle,marginTop:4}}/></label>
  </div>}
  {error&&<div role="alert" style={{fontSize:12,color:'#fecaca',marginTop:8}}>{error}</div>}
  {notice&&<div role="status" style={{fontSize:12,color:'#86efac',marginTop:8}}>{notice}</div>}
  <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:13,flexWrap:'wrap'}}>
   <button type="button" onClick={onAdvanced} style={{background:'#183a60',color:'#c8d7ef',border:'1px solid #446080',borderRadius:8,padding:'9px 13px',fontWeight:800,cursor:'pointer'}}>Advanced Add</button>
   <button type="button" onClick={()=>save(true)} style={{background:'#176549',color:'#fff',border:0,borderRadius:8,padding:'9px 15px',fontWeight:900,cursor:'pointer'}}>Save & Add Another</button>
   <button type="button" onClick={()=>save(false)} style={{background:'#c8991a',color:'#071e34',border:0,borderRadius:8,padding:'9px 15px',fontWeight:900,cursor:'pointer'}}>Save Question</button>
  </div>
 </div>
}
