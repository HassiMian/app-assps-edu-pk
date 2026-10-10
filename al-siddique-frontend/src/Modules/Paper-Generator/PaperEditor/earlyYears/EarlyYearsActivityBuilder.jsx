import { useEffect, useMemo, useState } from 'react';
import EarlyYearsPaperContainer from './components/EarlyYearsPaperContainer.jsx'
import { getDefaultEarlyYearsTemplateId, getEarlyYearsTemplatePreset, EARLY_YEARS_TEMPLATE_OPTIONS } from './earlyYearsTemplates.js'
import { getAllSketchAssets } from './assets/SketchAssetRegistry.js'
import { ACTIVITY_TYPES, createUserEarlyYearsPaper, addUserActivity, updateUserActivity, parseActivityContent,
 displayActivityContent, renumber, validateUserEarlyYearsPaper, listUserEarlyYearsPapers, saveUserEarlyYearsPaper,
 duplicateUserEarlyYearsPaper, deleteUserEarlyYearsPaper } from './earlyYearsUserPapers.js'
import './earlyYearsPrint.css'
const panel={background:'#122943',color:'#e2e8f0',border:'1px solid #37516d',borderRadius:10,padding:12}
const input={width:'100%',boxSizing:'border-box',border:'1px solid #52708c',borderRadius:6,background:'#0a1d34',color:'#fff',padding:'7px 9px',fontSize:13}
const btn={border:'1px solid #52708c',borderRadius:7,background:'#193c5d',color:'#f8fafc',cursor:'pointer',padding:'7px 10px',fontSize:12}
const gold={...btn,background:'#c8991a',color:'#071e34',border:0,fontWeight:800}
const emptyForm={type:'',instruction:'',marks:'',text:'',lineCount:3,mode:'before'}
function formFrom(q) {return {type:q.presentationType,instruction:q.instruction||'',marks:q.marks??'',
 text:displayActivityContent(q),lineCount:q.content?.lineCount||3,mode:q.content?.mode||'before'} }
const Field=({title,children})=><label style={{display:'grid',gap:5,fontSize:12,fontWeight:650}}>{title}{children}</label>
export default function EarlyYearsActivityBuilder() {
 const [library,setLibrary]=useState([])
 const [paper,setPaper]=useState(null)
 const [setup,setSetup]=useState({classStage:'starter',subject:'English',language:'english',name:'',title:'Practice Worksheet',targetMarks:'',examDate:'',timeAllowed:'1 Hour'})
 const [kind,setKind]=useState('TraceGlyphGrid')
 const [selected,setSelected]=useState(null)
 const [form,setForm]=useState(emptyForm)
 const [dirty,setDirty]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [templateId,setTemplateId]=useState('scholar-spark')
 const sketches=useMemo(()=>getAllSketchAssets().filter(a=>a.source==='BUILTIN'),[])
 const template=useMemo(()=>getEarlyYearsTemplatePreset(templateId),[templateId])
 const check=paper?validateUserEarlyYearsPaper(paper):null
 const refresh=()=>{try{setLibrary(listUserEarlyYearsPapers());setError('')}catch(e){setError(e.message)}}
 useEffect(()=>{document.body.classList.add('early-years-mode');refresh();return ()=>document.body.classList.remove('early-years-mode')},[])
 const open=(next)=>{setPaper(next);setSelected(null);setForm(emptyForm);setDirty(false);setError('');setNotice('');setTemplateId(next?.design?.templateId||getDefaultEarlyYearsTemplateId(next?.classStage||'starter'))}
 const start=()=>{try{open(createUserEarlyYearsPaper(setup))}catch(e){setError(e.message)}}
 const selectQuestion=id=>{
  if(dirty && !window.confirm('Discard unapplied question edits?')) return
  const q=paper.questions.find(item=>item.id===id)
  setSelected(id);setForm(q?formFrom(q):emptyForm);setDirty(false);setError('')
 }
 const add=()=>{try{const next=addUserActivity(paper,kind);setPaper(next);const q=next.questions.at(-1)
  setSelected(q.id);setForm(formFrom(q));setDirty(false);setError('');setNotice('New activity created. Fill its content and marks, then Apply.')
 }catch(e){setError(e.message)}}
 const change=(key,value)=>{setForm(f=>({...f,[key]:value}));setDirty(true);setError('')}
 const apply=(candidate=paper)=>{
  if(!selected||!dirty) return candidate
  const marks=form.marks===''?null:Number(form.marks)
  if(marks!==null&&(!Number.isFinite(marks)||marks<0)) throw new Error('Enter valid non-negative activity marks.')
  const content=parseActivityContent(form.type,form.text,{lineCount:form.lineCount,mode:form.mode})
  return updateUserActivity(candidate,selected,{presentationType:form.type,instruction:form.instruction.trim(),marks,content})
 }
 const applyChanges=()=>{try{setPaper(apply());setDirty(false);setNotice('Activity changes applied to draft. Save Paper to retain them.');setError('')}catch(e){setError(e.message)}}
 const save=()=>{try{const next=apply();const saved=saveUserEarlyYearsPaper(next);setPaper(saved);setDirty(false);setSelected(null);setNotice(`Saved independently as ${saved.id} (revision ${saved.revision}). This is a browser-local draft, not a multi-device school record.`);refresh()}
 catch(e){setError(e.message)}}
 const remove=id=>{if(!window.confirm('Remove this activity from your draft?'))return
  setPaper(p=>({...p,questions:renumber(p.questions.filter(q=>q.id!==id))}));setSelected(null);setDirty(false)}
 const move=(id,delta)=>{if(dirty){setError('Apply your question edits before reordering.');return}
  setPaper(p=>{const a=[...p.questions],i=a.findIndex(q=>q.id===id),j=i+delta;if(i<0||j<0||j>=a.length)return p;[a[i],a[j]]=[a[j],a[i]];return {...p,questions:renumber(a)}})}
 const duplicate=()=>{try{open(duplicateUserEarlyYearsPaper(paper));setNotice('Independent unsaved copy created. Save it to add a new library entry.')}catch(e){setError(e.message)}}
 const erase=record=>{if(!window.confirm(`Delete YOUR saved draft "${record.name}"? This cannot affect teacher-source papers.`))return
  try{deleteUserEarlyYearsPaper(record.id,record.revision);refresh();if(paper?.id===record.id)open(null)}catch(e){setError(e.message)}}
 const print=async()=>{if(dirty){setError('Apply and save question edits before printing.');return}
  const result=validateUserEarlyYearsPaper(paper)
  if(!paper.id){setError('Save your paper before printing.');return}
  if(!result.valid){setError('Printing blocked until review issues are corrected: '+result.issues.join(' | '));return}
  try{await document.fonts?.ready}catch{ /* This optional operation may fail; preserve the existing editor state and fallback behavior. */ };requestAnimationFrame(()=>window.print())}
 const meta=(name,value)=>setPaper(p=>({...p,[name]:value}))
 const header=(name,value)=>setPaper(p=>({...p,headerSource:{...p.headerSource,[name]:value}}))
 return <section data-user-early-years-studio style={{display:'flex',flexDirection:'column',flex:'1 1 auto',minHeight:0,overflow:'hidden',background:'#081b30',color:'#e2e8f0'}}>
  {!paper ? <div className="no-print" style={{overflowY:'auto',padding:'20px 22px',display:'grid',gap:16}}>
   <h2 style={{margin:0}}>My Pre-Class Papers <small style={{fontSize:12,fontWeight:400,color:'#94a3b8'}}>Independent from the 9 Reference Papers</small></h2>
   <div style={{...panel,maxWidth:950}}>
    <h3 style={{margin:'0 0 12px',fontSize:16}}>Create Blank Activity Paper</h3>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:11}}>
     <Field title="Class"><select aria-label="New pre class" style={input} value={setup.classStage} onChange={e=>setSetup(s=>({...s,classStage:e.target.value}))}>{['starter','mover','flyer'].map(x=><option key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</option>)}</select></Field>
     <Field title="Subject"><input aria-label="New pre subject" style={input} value={setup.subject} onChange={e=>setSetup(s=>({...s,subject:e.target.value}))}/></Field>
     <Field title="Language"><select aria-label="New pre language" style={input} value={setup.language} onChange={e=>setSetup(s=>({...s,language:e.target.value}))}><option value="english">English</option><option value="urdu">Urdu</option></select></Field>
     <Field title="Paper Name"><input style={input} placeholder="e.g. Flyer Math Practice 2" value={setup.name} onChange={e=>setSetup(s=>({...s,name:e.target.value}))}/></Field>
     <Field title="Header title"><input style={input} value={setup.title} onChange={e=>setSetup(s=>({...s,title:e.target.value}))}/></Field>
     <Field title="Target marks (optional)"><input style={input} type="number" min="0" value={setup.targetMarks} onChange={e=>setSetup(s=>({...s,targetMarks:e.target.value}))}/></Field>
     <Field title="Exam date"><input style={input} type="date" value={setup.examDate} onChange={e=>setSetup(s=>({...s,examDate:e.target.value}))}/></Field>
     <Field title="Duration"><input style={input} value={setup.timeAllowed} onChange={e=>setSetup(s=>({...s,timeAllowed:e.target.value}))}/></Field>
    </div>
    <button type="button" data-create-user-early-years onClick={start} style={{...gold,marginTop:14}}>Create Blank Worksheet →</button>
   </div>
   <div style={panel}><h3 style={{margin:'0 0 12px'}}>Saved Personal Drafts ({library.length})</h3>
    {!library.length&&<p style={{fontSize:13,color:'#94a3b8'}}>No user-created papers yet. The nine school reference papers are kept separately.</p>}
    <div style={{display:'grid',gap:8}}>{library.map(p=><div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap',padding:9,background:'#091f37',borderRadius:7}}>
     <span><strong>{p.name}</strong> <small style={{color:'#94a3b8'}}>{p.classDisplayName} · {p.subject} · {p.questions.length} activities · revision {p.revision}</small></span>
     <div style={{display:'flex',gap:7}}><button type="button" style={gold} onClick={()=>open(p)}>Open Draft</button><button type="button" style={btn} onClick={()=>erase(p)}>Delete My Draft</button></div>
    </div>)}</div>
   </div>
  </div> : <>
   <header className="no-print" style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',padding:'9px 13px',borderBottom:'1px solid #304b65'}}>
    <button style={btn} type="button" onClick={()=>{if(dirty&&!window.confirm('Discard unapplied changes?'))return;setPaper(null);refresh()}}>← My Papers</button>
    <strong style={{fontSize:13}}>{paper.name}</strong><span style={{fontSize:11,color:'#aabed4'}}>Draft {paper.id? `· rev ${paper.revision}`:'· not saved yet'}</span>
    <div style={{flex:1}}/><button style={btn} type="button" onClick={duplicate}>Duplicate as New</button>
    <button data-save-user-early-years style={gold} type="button" onClick={save}>Save Paper</button>
    <button style={btn} type="button" onClick={print}>Print DRAFT</button>
   </header>
   <div className="early-years-workspace-body" style={{display:'grid',gridTemplateColumns:'minmax(230px,280px) minmax(0,1fr) minmax(235px,270px)',flex:'1 1 auto',minHeight:0,overflow:'hidden'}}>
    <aside className="no-print" style={{overflowY:'auto',padding:12,borderRight:'1px solid #304b65',display:'grid',alignContent:'start',gap:10}}>
     <div style={panel}><h3 style={{margin:'0 0 9px',fontSize:14}}>Paper Details</h3>
      <Field title="Paper name"><input style={input} value={paper.name} onChange={e=>meta('name',e.target.value)}/></Field>
      <Field title="Class"><select style={input} value={paper.classStage} onChange={e=>setPaper(p=>({...p,classStage:e.target.value,classDisplayName:e.target.value[0].toUpperCase()+e.target.value.slice(1),headerSource:{...p.headerSource,class:e.target.value[0].toUpperCase()+e.target.value.slice(1)}}))}>{['starter','mover','flyer'].map(x=><option key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</option>)}</select></Field>
      <Field title="Subject"><input style={input} value={paper.subject} onChange={e=>setPaper(p=>({...p,subject:e.target.value,headerSource:{...p.headerSource,subject:e.target.value}}))}/></Field>
      <Field title="Language"><select style={input} value={paper.language} onChange={e=>meta('language',e.target.value)}><option value="english">English</option><option value="urdu">Urdu</option></select></Field>
      <Field title="Header title"><input style={input} value={paper.headerSource.title} onChange={e=>header('title',e.target.value)}/></Field>
      <Field title="Header total (optional)"><input style={input} type="number" min="0" value={paper.headerSource.totalMarks??''} onChange={e=>header('totalMarks',e.target.value===''?null:Number(e.target.value))}/></Field>
      <Field title="Date"><input style={input} type="date" value={paper.headerSource.examDate||''} onChange={e=>header('examDate',e.target.value)}/></Field>
      <Field title="Duration"><input style={input} value={paper.headerSource.timeAllowed||''} onChange={e=>header('timeAllowed',e.target.value)}/></Field>
      <Field title="Template"><select aria-label="My pre-class template" style={input} value={templateId} onChange={e=>{setTemplateId(e.target.value);setPaper(p=>({...p,design:{...p.design,templateId:e.target.value}}))}}>{EARLY_YEARS_TEMPLATE_OPTIONS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></Field>
     </div>
     <div style={panel}><h3 style={{margin:'0 0 9px',fontSize:14}}>+ Add Activity</h3>
      <select aria-label="Activity type" style={input} value={kind} onChange={e=>setKind(e.target.value)}>{ACTIVITY_TYPES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
      <button data-add-early-years-activity style={{...gold,width:'100%',marginTop:8}} onClick={add} type="button">+ Add to Paper</button>
     </div>
     <div style={panel}><h3 style={{margin:'0 0 9px',fontSize:14}}>Activity Order ({paper.questions.length})</h3>
      {paper.questions.map(q=><div key={q.id} data-user-activity-row style={{display:'grid',gap:5,padding:'7px 0',borderBottom:'1px solid #304b65'}}>
       <button style={{...btn,textAlign:'left',background:selected===q.id?'#406781':'#102a45'}} type="button" onClick={()=>selectQuestion(q.id)}>{q.label} · {ACTIVITY_TYPES.find(([type])=>type===q.presentationType)?.[1]||q.presentationType} ({q.marks??'?'} marks)</button>
       <div style={{display:'flex',gap:5}}><button style={btn} type="button" aria-label={`Move ${q.label} up`} onClick={()=>move(q.id,-1)}>↑</button><button style={btn} type="button" aria-label={`Move ${q.label} down`} onClick={()=>move(q.id,1)}>↓</button><button style={btn} type="button" onClick={()=>remove(q.id)}>Remove</button></div>
      </div>)}
     </div>
    </aside>
    <main data-user-early-years-preview style={{overflowY:'auto',minWidth:0,background:'#27384a'}}>
     <EarlyYearsPaperContainer paper={paper} templatePreset={template} scale={0.79}/>
    </main>
    <aside className="no-print" style={{overflowY:'auto',padding:12,borderLeft:'1px solid #304b65',display:'grid',alignContent:'start',gap:11}}>
     <div style={panel}><strong style={{fontSize:14}}>Validation</strong><div style={{marginTop:7,fontSize:12}}>Question marks: {check?.questionMarks} / Header: {check?.targetMarks??'Auto'}</div>
      {check?.issues.map((issue,i)=><p key={i} style={{fontSize:11,margin:'7px 0',color:'#fbbf8b'}}>{issue}</p>)}
      {check?.valid&&<p style={{fontSize:11,color:'#b8f4cd'}}>Ready for DRAFT print. Approval/publishing is not enabled in this browser-only phase.</p>}
     </div>
     {selected?<div style={panel}><h3 style={{fontSize:14,margin:'0 0 12px'}}>Selected Activity</h3>
      <div style={{display:'grid',gap:11}}>
       <Field title="Activity type"><select style={input} value={form.type} onChange={e=>change('type',e.target.value)}>{ACTIVITY_TYPES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>
       <Field title="Instruction"><textarea aria-label="Activity instruction" style={{...input,minHeight:55,resize:'vertical'}} value={form.instruction} onChange={e=>change('instruction',e.target.value)}/></Field>
       <Field title="Marks (explicit)"><input aria-label="Activity marks" style={input} type="number" min="0" value={form.marks} onChange={e=>change('marks',e.target.value)}/></Field>
       {['AlphabetWritingArea','UrduAlphabetWritingArea','StandardTextResponse'].includes(form.type)&&<Field title="Handwriting lines"><input style={input} type="number" min="1" max="12" value={form.lineCount} onChange={e=>change('lineCount',e.target.value)}/></Field>}
       {form.type==='BeforeAfterGrid'&&<Field title="Mode"><select style={input} value={form.mode} onChange={e=>change('mode',e.target.value)}><option value="before">Before</option><option value="after">After</option></select></Field>}
       {!['AlphabetWritingArea','UrduAlphabetWritingArea'].includes(form.type)&&<Field title={form.type==='VisualMatchingColumns'?'Matching: one LEFT | RIGHT pair per line':form.type==='PictureColoringBlock'?'Picture names (comma separated)':form.type==='CircleChoiceGrid'?'Options per line, separated by commas':'Activity content'}>
        <textarea aria-label="Activity content" style={{...input,minHeight:94,resize:'vertical'}} value={form.text} onChange={e=>change('text',e.target.value)} placeholder={form.type==='PictureColoringBlock'?'apple, mango, flower':form.type==='VisualMatchingColumns'?'A | a\nB | b':'Type content here'}/></Field>}
       {form.type==='PictureColoringBlock'&&<div style={{fontSize:11,color:'#aabed4'}}>Available pictures: {sketches.map(a=>a.name).join(', ')}</div>}
       <button data-apply-early-years-activity style={gold} type="button" onClick={applyChanges}>Apply Activity Changes</button>
      </div>
     </div>:<div style={{...panel,fontSize:12}}>Select an activity on the left to edit its instruction, content, marks and presentation independently.</div>}
    </aside>
   </div>
  </>}
  {(error||notice)&&<div className="no-print" role={error?'alert':'status'} style={{flexShrink:0,padding:'7px 14px',background:error?'#5d2232':'#123d3a',color:'#fff',fontSize:12}}>{error||notice}</div>}
 </section>
}
