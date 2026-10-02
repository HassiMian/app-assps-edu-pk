import React, { useMemo, useState } from 'react'
import { useAcademicStore } from '../../services/useAcademicStore'
import { BASIC_PAPER_CLASS_LEVELS } from './paperCreationDraft.js'

const theme = {
 panel:'var(--pg-card,rgba(11,44,77,.92))',
 text:'var(--pg-text,#C0C8D8)',
 gold:'var(--pg-gold,#C8991A)',
 border:'var(--pg-border,rgba(148,163,184,.2))',
}
const inputStyle={width:'100%',boxSizing:'border-box',padding:'10px 12px',borderRadius:8,border:`1px solid ${theme.border}`,background:'var(--pg-input-bg,#102b4c)',color:theme.text,fontSize:14}

const choices=[
 {key:'blank',tag:'01',title:'Blank Paper — Type Myself',description:'Start with no questions. Enter the class and subject, then add and edit each question directly.',detail:'Question Bank not required.'},
 {key:'bank',tag:'02',title:'Build from Question Bank',description:'Choose syllabus, class, subject and questions using the existing bank-selection workflow.',detail:'Existing wizard; no changes to saved questions.'},
 {key:'duplicate',tag:'03',title:'Duplicate a Saved Paper',description:'Choose a previously saved paper and make an entirely separate working copy.',detail:'Original is never overwritten.'},
]
export function PaperCreationWelcome({onBlank,onBank,onDuplicate}) {
 const handlers={blank:onBlank,bank:onBank,duplicate:onDuplicate}
 return <main data-create-paper-home style={{maxWidth:1000,margin:'24px auto',color:theme.text}}>
  <div style={{marginBottom:26}}>
   <div style={{fontSize:11,letterSpacing:1.3,fontWeight:900,color:theme.gold}}>ASSPS PAPER STUDIO</div>
   <h2 style={{fontSize:26,margin:'7px 0',color:theme.text}}>How would you like to create your paper?</h2>
   <p style={{fontSize:13,opacity:.8,maxWidth:750,margin:0}}>You decide the content. Create from a blank A4, pick existing questions, or duplicate an approved template. Nothing is inserted without your selection.</p>
  </div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(255px,1fr))',gap:14}}>
   {choices.map(c=><button key={c.key} data-creation-option={c.key} type="button" onClick={handlers[c.key]} style={{textAlign:'left',minHeight:205,padding:19,border:`1px solid ${theme.border}`,borderRadius:16,background:theme.panel,color:theme.text,cursor:'pointer',display:'flex',flexDirection:'column',gap:12}}>
    <span style={{width:37,height:37,display:'grid',placeItems:'center',borderRadius:10,background:'rgba(200,153,26,.12)',color:theme.gold,fontWeight:900}}>{c.tag}</span>
    <strong style={{fontSize:16}}>{c.title}</strong>
    <span style={{fontSize:12,lineHeight:1.6,opacity:.86}}>{c.description}</span>
    <span style={{marginTop:'auto',fontSize:11,color:theme.gold,fontWeight:800}}>{c.detail} →</span>
   </button>)}
  </div>
 </main>
}

export function BlankPaperSetup({onCreate,onBack}) {
 const {activeClasses=[],subjectsForClass}=useAcademicStore()
 const [form,setForm]=useState({
  classLevel:'', subjectName:'',name:'',title:'First Term Examination 2026',
  examType:'First Term Examination 2026',session:'2026-2027',language:'english',
  examDate:new Date().toISOString().slice(0,10),timeAllowed:'2 Hours',targetMarks:'',
  pageMode:'a4',paperCode:'',
 })
 const [error,setError]=useState('')
 const classList=useMemo(()=>{
  const map=new Map(BASIC_PAPER_CLASS_LEVELS)
  for(const item of activeClasses) {
   const key=String(item.level || '').trim().toLowerCase()
   if(key && !map.has(key)) map.set(key,item.name || key)
  }
  return [...map].map(([value,label])=>({value,label}))
 },[activeClasses])
 const suggestedSubjects=useMemo(()=>{
  const presets=['English','Urdu','Mathematics','Science','Islamiyat','Quran / Nazra','General Knowledge','Social Studies']
  const academic=typeof subjectsForClass==='function' ? subjectsForClass(form.classLevel) : []
  const names=Array.isArray(academic)?academic.map(item=>typeof item==='string'?item:item?.name||item?.subject_name||'').filter(Boolean):[]
  return [...new Set([...presets,...names])]
 },[form.classLevel,subjectsForClass])
 const patch=(field,value)=>{setForm(old=>({...old,[field]:value}));setError('')}
 const make=event=>{
  event.preventDefault()
  if(!form.classLevel || !form.subjectName.trim()){setError('Choose the class and enter a subject to start.');return}
  onCreate(form)
 }
 const field=(label,name,node)=> <label key={name} style={{display:'flex',flexDirection:'column',gap:6,fontSize:12,fontWeight:800,color:theme.text}}>{label}{node}</label>
 return <form data-create-blank-paper onSubmit={make} style={{maxWidth:920,margin:'15px auto',padding:22,border:`1px solid ${theme.border}`,borderRadius:16,background:theme.panel}}>
  <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20,flexWrap:'wrap'}}>
   <button type="button" onClick={onBack} style={{...inputStyle,width:'auto',cursor:'pointer'}}>← Methods</button>
   <div><div style={{color:theme.gold,fontSize:11,fontWeight:900}}>BLANK PAPER</div><h2 style={{margin:'4px 0',fontSize:22}}>Enter paper information</h2></div>
  </div>
  <p style={{fontSize:12,opacity:.82,margin:'0 0 18px'}}>Only Class and Subject are required. No Question Bank, textbook or chapter selection is necessary.</p>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(225px,1fr))',gap:14}}>
   {field('Class *','classLevel',<select aria-label="Blank paper class" required value={form.classLevel} onChange={e=>patch('classLevel',e.target.value)} style={inputStyle}><option value="">Select Class</option>{classList.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select>)}
   {field('Subject *','subjectName',<><input aria-label="Blank paper subject" required list="paper-subject-suggestions" value={form.subjectName} onChange={e=>patch('subjectName',e.target.value)} placeholder="Type any subject" style={inputStyle}/><datalist id="paper-subject-suggestions">{suggestedSubjects.map(name=><option key={name} value={name}/>)}</datalist></>)}
   {field('Language','language',<select aria-label="Blank paper language" value={form.language} onChange={e=>patch('language',e.target.value)} style={inputStyle}><option value="english">English (LTR)</option><option value="urdu">Urdu (RTL)</option><option value="dual">Dual Medium</option></select>)}
   {field('Paper Name (optional)','name',<input value={form.name} onChange={e=>patch('name',e.target.value)} placeholder="E.g. Flyer English Practice 2" style={inputStyle}/>)}
   {field('Exam / Paper Title','title',<input value={form.title} onChange={e=>patch('title',e.target.value)} style={inputStyle}/>)}
   {field('Session','session',<input value={form.session} onChange={e=>patch('session',e.target.value)} style={inputStyle}/>)}
   {field('Exam Date','examDate',<input aria-label="Blank paper date" type="date" value={form.examDate} onChange={e=>patch('examDate',e.target.value)} style={inputStyle}/>)}
   {field('Duration','timeAllowed',<input value={form.timeAllowed} onChange={e=>patch('timeAllowed',e.target.value)} placeholder="2 Hours" style={inputStyle}/>)}
   {field('Target Total Marks (optional)','targetMarks',<input aria-label="Blank paper total marks" type="number" min="0" step="1" value={form.targetMarks} onChange={e=>patch('targetMarks',e.target.value)} placeholder="Can be set after questions" style={inputStyle}/>)}
   {field('Page Size','pageMode',<select value={form.pageMode} onChange={e=>patch('pageMode',e.target.value)} style={inputStyle}><option value="a4">A4</option><option value="half">Two per A4</option></select>)}
  </div>
  {error&&<div role="alert" style={{color:'#fca5a5',marginTop:12}}>{error}</div>}
  <div style={{display:'flex',justifyContent:'flex-end',marginTop:20,borderTop:`1px solid ${theme.border}`,paddingTop:17}}>
   <button type="submit" style={{padding:'12px 20px',border:0,borderRadius:9,background:theme.gold,color:'#071e34',fontWeight:900,cursor:'pointer'}}>Open Blank Paper Workspace →</button>
  </div>
 </form>
}
