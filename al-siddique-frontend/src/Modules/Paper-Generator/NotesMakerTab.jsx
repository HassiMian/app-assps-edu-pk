import { useState, useMemo, useRef } from 'react'
import ReactDOM from 'react-dom'
import { usePaperStore } from './usePaperStore'
import { classLevelsMatch, useAcademicStore } from '../../services/useAcademicStore'

const C = { gold:'#C8991A',goldL:'#e8b420',silver:'#C0C8D8',muted:'#8892A4',green:'#30D158',red:'#FF375F',blue:'#0A84FF',purple:'#BF5AF2',border:'rgba(148,163,184,0.18)',card:'rgba(11,44,77,0.92)' }
const Portal = ({children})=>ReactDOM.createPortal(children,document.body)

function Sel({label,children,...p}){return(<div><div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:5}}>{label}</div><select {...p} style={{width:'100%',background:'rgba(11,44,77,0.7)',border:`1px solid ${C.border}`,borderRadius:10,color:C.silver,padding:'9px 12px',fontSize:13,outline:'none',cursor:'pointer',boxSizing:'border-box'}}>{children}</select></div>)}

const TEMPLATES = [' Academic Notes',' Revision Sheet']

//  Print helpers 
function buildPrintHTML(settings, notes, template, meta) {
 const {schoolName,schoolUrdu,address,logo,examYear}=settings
 const {classLevel,subject,chapter,showAnswer}=meta
 const headerBg = template===0 ? '#f8fafc' : '#fff7ed'
 const accentColor = template===0 ? '#C8991A' : '#0A84FF'

 const logoImg = logo ? `<img src="${logo}" style="height:60px;width:60px;object-fit:contain;border-radius:50%">` : `<div style="width:60px;height:60px;border-radius:50%;background:${accentColor};display:flex;align-items:center;justify-content:center;font-size:28px"></div>`

 const header = `
 <div style="background:${headerBg};color:#0f172a;padding:16px 24px;display:flex;align-items:center;gap:16px;border-bottom:3px solid ${accentColor}">
 ${logoImg}
 <div style="flex:1;text-align:center">
 <div style="font-size:20px;font-weight:800;letter-spacing:1px">${schoolName}</div>
 <div style="font-size:14px;font-family:'Noto Nastaliq Urdu',serif;direction:rtl;color:${accentColor}">${schoolUrdu}</div>
 <div style="font-size:11px;color:#64748b;margin-top:2px">${address}</div>
 </div>
 <div style="text-align:right;font-size:11px;color:#64748b">
 <div>${examYear}</div>
 </div>
 </div>
 <div style="background:#fff;border-bottom:1px solid ${accentColor}44;padding:10px 24px;display:flex;gap:20px;font-size:12px;color:#334155">
 <span><b style="color:${accentColor}">Class:</b> ${classLevel}</span>
 <span><b style="color:${accentColor}">Subject:</b> ${subject}</span>
 <span><b style="color:${accentColor}">Chapter:</b> ${chapter==='all'?'All Chapters':chapter}</span>
 <span style="margin-left:auto"><b style="color:${accentColor}">Notes Type:</b> ${TEMPLATES[template]}</span>
 </div>`

 // MCQ section
 const mcqs = notes.filter(q=>q.type==='mcq')
 const shorts = notes.filter(q=>q.type!=='mcq')

 let body = ''

 if(mcqs.length>0){
 body += `<div style="padding:16px 24px 0"><h3 style="color:${accentColor};font-size:14px;border-bottom:1px solid ${accentColor}44;padding-bottom:6px;margin:0 0 12px">Q.1 Choose the correct answer: <span style="float:right;font-size:12px;color:#888">Marks: ${mcqs.reduce((s,q)=>s+(q.marks||1),0)}</span></h3>`
 mcqs.forEach((q,i)=>{
 body += `<div style="margin-bottom:12px">
 <div style="font-size:13px;color:#0f172a;margin-bottom:5px"><b>${i+1}.</b> ${q.text||q.textUrdu}</div>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;padding-left:16px">
 ${(q.options||[]).map(o=>`<div style="font-size:12px;color:${showAnswer&&o.label===q.answer?C.green:'#334155'}">${o.label}. ${o.text||o.textUrdu} ${showAnswer&&o.label===q.answer?'':''}</div>`).join('')}
 </div>
 </div>`
 })
 body += '</div>'
 }

 if(shorts.length>0){
 let qNum = mcqs.length>0?2:1
 body += `<div style="padding:16px 24px 0"><h3 style="color:${accentColor};font-size:14px;border-bottom:1px solid ${accentColor}44;padding-bottom:6px;margin:0 0 12px">Q.${qNum} Answer the following questions: <span style="float:right;font-size:12px;color:#888">Marks: ${shorts.reduce((s,q)=>s+(q.marks||2),0)}</span></h3>`
 shorts.forEach((q,i)=>{
 body += `<div style="margin-bottom:14px;page-break-inside:avoid">
 <div style="font-size:13px;color:#0f172a;margin-bottom:4px"><b>${i+1}.</b> ${q.text||q.textUrdu} <span style="font-size:10px;color:#64748b">(${q.marks||2} marks)</span></div>
 ${showAnswer&&q.answer?`<div style="padding:6px 12px;background:rgba(48,209,88,0.08);border-left:3px solid #30D158;margin-top:4px;font-size:12px;color:#166534"><b>Ans:</b> ${q.answer}</div>`:'<div style="border-bottom:1px dashed #cbd5e1;height:22px;margin-top:6px"></div><div style="border-bottom:1px dashed #cbd5e1;height:22px;margin-top:4px"></div>'}
 </div>`
 })
 body += '</div>'
 }

 const footer = `<div style="border-top:1px solid #e2e8f0;margin:16px 24px 0;padding:10px 0;display:flex;justify-content:space-between;font-size:11px;color:#64748b"><span>${schoolName}</span><span>Class ${classLevel} | ${subject}</span><span>Prepared with Al-Siddique OS</span></div>`

 return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Notes - ${subject}</title>
 <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
 <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#eef3f8;color:#0f172a;font-family:Arial,sans-serif}@media print{body{background:#fff;color:#000}}</style>
 </head><body style="min-height:100vh;background:#eef3f8">${header}${body}${footer}</body></html>`
}

//  Question Selector Modal 
function QuestionSelectorModal({questions, chapter, onSelect, onClose}){
 const [selMCQ,setSelMCQ]=useState([])
 const [selShort,setSelShort]=useState([])
 const [tab,setTab]=useState('mcq')
 const [search,setSearch]=useState('')

 const pool = useMemo(()=>{
 return questions.filter(q=>{
 const typeMatch = tab==='mcq' ? q.type==='mcq' : q.type!=='mcq'
 const chapMatch = chapter==='all' || !chapter || q.chapter===chapter
 const s=search.toLowerCase()
 const textMatch = !s || (q.text||'').toLowerCase().includes(s) || (q.textUrdu||'').includes(s)
 return typeMatch && chapMatch && textMatch
 })
 },[questions,tab,chapter,search])

 const toggle=(q,sel,setSel)=>{
 setSel(p=>p.find(x=>x.id===q.id)?p.filter(x=>x.id!==q.id):[...p,q])
 }

 const selected = tab==='mcq'?selMCQ:selShort
 const setSelected = tab==='mcq'?setSelMCQ:setSelShort

 return(
 <Portal>
 <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
 <div style={{background:'#0a1e35',border:`1px solid ${C.border}`,borderRadius:20,width:'100%',maxWidth:780,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
 {/* Header */}
 <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
 <div style={{color:C.gold,fontWeight:800,fontSize:17}}> Select Questions from Bank</div>
 <div style={{display:'flex',gap:8,alignItems:'center'}}>
 <span style={{fontSize:12,color:C.muted}}>MCQ: {selMCQ.length} | Short: {selShort.length}</span>
 <button onClick={onClose} style={{background:'none',border:'none',color:C.silver,cursor:'pointer',fontSize:20}}></button>
 </div>
 </div>
 {/* Tabs + Search */}
 <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,alignItems:'center',flexShrink:0}}>
 {['mcq','short/long'].map(t=>(
 <button key={t} onClick={()=>setTab(t)} style={{padding:'6px 16px',borderRadius:8,fontWeight: 600,fontSize:12,border:'none',cursor:'pointer',background:tab===t?C.gold:'rgba(255,255,255,0.07)',color:tab===t?'#071e34':C.silver}}>{t.toUpperCase()}</button>
 ))}
 <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{flex:1,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,borderRadius:8,padding:'7px 12px',color:'#fff',fontSize:12,outline:'none'}}/>
 </div>
 {/* List */}
 <div style={{flex:1,overflowY:'auto',padding:'12px 20px',display:'flex',flexDirection:'column',gap:8}}>
 {pool.length===0?<div style={{textAlign:'center',padding:40,color:C.muted}}>No questions found. Add questions in the Question Bank first.</div>:
 pool.map((q,i)=>{
 const isSel=selected.find(x=>x.id===q.id)
 return(
 <div key={q.id} onClick={()=>toggle(q,selected,setSelected)}
 style={{padding:'12px 14px',borderRadius:12,cursor:'pointer',border:`1px solid ${isSel?C.gold:C.border}`,background:isSel?'rgba(200,153,26,0.08)':'rgba(255,255,255,0.02)',transition:'all 0.15s'}}>
 <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
 <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${isSel?C.gold:C.border}`,background:isSel?C.gold:'transparent',display:'grid',placeItems:'center',flexShrink:0,marginTop:2}}>
 {isSel&&<span style={{color:'#071e34',fontSize:11,fontWeight:800}}></span>}
 </div>
 <div style={{flex:1}}>
 <div style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap'}}>
 {q.chapter&&<span style={{fontSize:10,padding:'1px 7px',borderRadius:20,background:'rgba(10,132,255,0.12)',color:C.blue,fontWeight:600}}>{q.chapter}</span>}
 <span style={{fontSize:10,padding:'1px 7px',borderRadius:20,background:'rgba(200,153,26,0.12)',color:C.gold,fontWeight:600}}>{q.marks||1} mk</span>
 </div>
 <div style={{color:C.silver,fontSize:13}}>{i+1}. {q.text||q.textUrdu}</div>
 {q.type==='mcq'&&q.options?.length>0&&(
 <div style={{display:'flex',gap:10,marginTop:5,flexWrap:'wrap'}}>
 {q.options.map(o=><span key={o.label} style={{fontSize:11,color:o.label===q.answer?C.green:C.muted}}>{o.label}. {o.text} {o.label===q.answer?'':''}</span>)}
 </div>
 )}
 {q.answer&&q.type!=='mcq'&&<div style={{fontSize:11,color:C.green,marginTop:4}}>Ans: {q.answer}</div>}
 </div>
 </div>
 </div>
 )
 })}
 </div>
 {/* Footer */}
 <div style={{padding:'14px 20px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
 <span style={{color:C.muted,fontSize:13}}>{selMCQ.length+selShort.length} questions selected</span>
 <div style={{display:'flex',gap:10}}>
 <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,borderRadius:10,padding:'9px 20px',color:C.silver,fontWeight: 600,cursor:'pointer',fontSize:13}}>Cancel</button>
 <button onClick={()=>onSelect(selMCQ,selShort)} style={{background:`linear-gradient(135deg,${C.gold},${C.goldL})`,border:'none',borderRadius:10,padding:'9px 24px',color:'#071e34',fontWeight: 600,fontSize:13,cursor:'pointer'}}>
  Add {selMCQ.length+selShort.length} Questions
 </button>
 </div>
 </div>
 </div>
 </div>
 </Portal>
 )
}

//  Main Notes Maker Tab 
export default function NotesMakerTab(){
 const {subjects,questions,paperSettings}=usePaperStore()
 const {activeClasses,subjectsForClass}=useAcademicStore()

 const [classLevel,setClassLevel]=useState('')
 const [subject,setSubject]=useState('')
 const [chapter,setChapter]=useState('all')
 const [template,setTemplate]=useState(0)
 const [showAnswer,setShowAnswer]=useState(true)
 const [showSelector,setShowSelector]=useState(false)
 const [notes,setNotes]=useState([]) // selected questions

 const availSubs=useMemo(()=>{
 const bank=[...new Set(subjects.filter(s=>!classLevel||!s.classLevel||classLevelsMatch(s.classLevel,classLevel)).map(s=>s.name))]
 const ac=subjectsForClass(classLevel)
 return [...new Set([...ac,...bank])]
 },[subjects,classLevel,subjectsForClass])

 const bankForSubject=useMemo(()=>{
 return questions.filter(q=>{
 const sub = subjects.find(s => s.id === q.subjectId)
 if (!sub) return false
 const classMatch = !classLevel || !sub.classLevel || classLevelsMatch(sub.classLevel, classLevel)
 const subjectMatch = !subject || sub.name.toLowerCase() === subject.toLowerCase()
 return classMatch && subjectMatch
 })
 },[questions,subjects,classLevel,subject])

 const chapters=useMemo(()=>{
 return [...new Set(bankForSubject.filter(q=>q.chapter).map(q=>q.chapter))]
 },[bankForSubject])

 const mcqs=notes.filter(q=>q.type==='mcq')
 const shorts=notes.filter(q=>q.type!=='mcq')
 const totalMarks=notes.reduce((s,q)=>s+(q.marks||1),0)

 const removeQ=(id)=>setNotes(p=>p.filter(q=>q.id!==id))

 const handlePrint=()=>{
 const html=buildPrintHTML(paperSettings,notes,template,{classLevel,subject,chapter,showAnswer})
 const win=window.open('','_blank','width=900,height=700')
 win.document.write(html)
 win.document.close()
 setTimeout(()=>win.print(),800)
 }

 return(
 <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:20,minHeight:'70vh'}}>

 {/* LEFT PANEL */}
 <div style={{display:'flex',flexDirection:'column',gap:14}}>
 {/* Config */}
 <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
 <div style={{color:C.gold,fontWeight:800,fontSize:14,marginBottom:16}}> Notes Configuration</div>
 <div style={{display:'flex',flexDirection:'column',gap:12}}>
 <Sel label="Class" value={classLevel} onChange={e=>{setClassLevel(e.target.value);setSubject('');setChapter('all');setNotes([])}}>
 <option value="">Select Class</option>
 {activeClasses.length>0
 ?activeClasses.map(c=><option key={c.level} value={c.level}>{c.name||`Class ${c.level}`}</option>)
 :['1','2','3','4','5','6','7','8','9','10'].map(n=><option key={n} value={n}>Class {n}</option>)}
 </Sel>
 <Sel label="Subject" value={subject} onChange={e=>{setSubject(e.target.value);setChapter('all');setNotes([])}}>
 <option value="">Select Subject</option>
 {availSubs.map(s=><option key={s} value={s}>{s}</option>)}
 </Sel>
 <Sel label="Chapter" value={chapter} onChange={e=>setChapter(e.target.value)}>
 <option value="all"> All Chapters</option>
 {chapters.map(ch=><option key={ch} value={ch}>{ch}</option>)}
 </Sel>
 </div>
 </div>

 {/* Template */}
 <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
 <div style={{color:C.gold,fontWeight:800,fontSize:14,marginBottom:14}}> Template</div>
 <div style={{display:'flex',flexDirection:'column',gap:10}}>
 {TEMPLATES.map((t,i)=>(
 <button key={i} onClick={()=>setTemplate(i)} style={{padding:'12px 16px',borderRadius:12,border:`2px solid ${template===i?C.gold:C.border}`,background:template===i?'rgba(200,153,26,0.1)':'rgba(255,255,255,0.02)',color:template===i?C.gold:C.silver,fontWeight: 600,fontSize:13,cursor:'pointer',textAlign:'left',transition:'all 0.2s'}}>
 {t} {template===i&&''}
 </button>
 ))}
 </div>
 <div style={{marginTop:14,display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(48,209,88,0.06)',borderRadius:10,border:'1px solid rgba(48,209,88,0.2)'}}>
 <input type="checkbox" id="showAns" checked={showAnswer} onChange={e=>setShowAnswer(e.target.checked)} style={{width:16,height:16,cursor:'pointer'}}/>
 <label htmlFor="showAns" style={{color:C.green,fontSize:13,fontWeight:700,cursor:'pointer'}}> Include Answer Key</label>
 </div>
 </div>

 {/* Search */}
 <button onClick={()=>setShowSelector(true)} disabled={!classLevel||!subject}
 style={{background:classLevel&&subject?`linear-gradient(135deg,${C.blue},#0055cc)`:'rgba(10,132,255,0.15)',color:classLevel&&subject?'#fff':C.muted,border:'none',borderRadius:14,padding:'14px 0',fontWeight:800,fontSize:15,cursor:classLevel&&subject?'pointer':'not-allowed'}}>
  Search &amp; Select Questions
 </button>

 {/* Print */}
 {notes.length>0&&(
 <button onClick={handlePrint}
 style={{background:`linear-gradient(135deg,${C.gold},${C.goldL})`,color:'#071e34',border:'none',borderRadius:14,padding:'14px 0',fontWeight:800,fontSize:15,cursor:'pointer'}}>
  Print Notes ({totalMarks} marks)
 </button>
 )}
 </div>

 {/* RIGHT PANEL */}
 <div style={{display:'flex',flexDirection:'column',gap:14}}>
 {notes.length===0?(
 <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:48,flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
 <div style={{fontSize:64}}></div>
 <div style={{color:'#fff',fontWeight:800,fontSize:22}}>Notes Maker</div>
 <div style={{color:C.muted,fontSize:14,textAlign:'center',maxWidth:380,lineHeight:1.7}}>
 Select Class &amp; Subject, then click <strong style={{color:C.blue}}>Search &amp; Select Questions</strong> to pick from your Question Bank.<br/>
 Get <strong style={{color:C.gold}}>school-branded notes</strong> with answer keys — ready to print!
 </div>
 <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:8,width:'100%',maxWidth:440}}>
 {[[' Question Bank Linked','Pull from your saved questions'],[' Answer Key','Toggle answers on/off'],[' School Branding','Logo, name & address printed'],[' 2 Templates','Academic Notes & Revision Sheet']].map(([t,d])=>(
 <div key={t} style={{background:'rgba(10,132,255,0.05)',border:'1px solid rgba(10,132,255,0.14)',borderRadius:12,padding:14}}>
 <div style={{color:C.silver,fontWeight:700,fontSize:13,marginBottom:4}}>{t}</div>
 <div style={{color:C.muted,fontSize:11}}>{d}</div>
 </div>
 ))}
 </div>
 </div>
 ):(
 <>
 {/* Stats */}
 <div style={{background:'rgba(10,132,255,0.1)',border:'1px solid rgba(10,132,255,0.3)',borderRadius:14,padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
 <div>
 <div style={{color:C.blue,fontWeight:800,fontSize:16}}> {notes.length} Questions Selected</div>
 <div style={{color:C.muted,fontSize:12,marginTop:4}}>MCQ: {mcqs.length} | Short/Long: {shorts.length} | Total Marks: <strong style={{color:C.gold}}>{totalMarks}</strong></div>
 </div>
 <button onClick={()=>setShowSelector(true)} style={{background:'rgba(10,132,255,0.2)',border:`1px solid rgba(10,132,255,0.4)`,borderRadius:10,padding:'8px 16px',color:C.blue,fontWeight: 600,fontSize:12,cursor:'pointer'}}>+ Add More</button>
 </div>

 {/* Question list */}
 <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
 {[{label:'MCQ Questions',qs:mcqs,color:C.blue},{label:'Short / Long Questions',qs:shorts,color:C.green}].map(({label,qs,color})=>qs.length>0&&(
 <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
 <div style={{padding:'10px 16px',background:'rgba(7,30,52,0.6)',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
 <span style={{color,fontWeight:700,fontSize:13}}>{label}</span>
 <span style={{color:C.muted,fontSize:12}}>{qs.length} questions · {qs.reduce((s,q)=>s+(q.marks||1),0)} marks</span>
 </div>
 <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}>
 {qs.map((q,i)=>(
 <div key={q.id} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'8px 12px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:`1px solid ${C.border}`}}>
 <div style={{flex:1}}>
 <div style={{color:C.silver,fontSize:13}}><span style={{color:C.muted}}>{i+1}. </span>{q.text||q.textUrdu}</div>
 {q.answer&&<div style={{color:C.green,fontSize:11,marginTop:3}}>Ans: {q.answer}</div>}
 {q.chapter&&<span style={{fontSize:10,color:C.blue,marginTop:3,display:'inline-block'}}>{q.chapter}</span>}
 </div>
 <button onClick={()=>removeQ(q.id)} style={{background:'none',border:'none',color:C.red,cursor:'pointer',fontSize:16,flexShrink:0}}></button>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 </>
 )}
 </div>

 {/* Question Selector Modal */}
 {showSelector&&(
 <QuestionSelectorModal
 questions={bankForSubject}
 chapter={chapter}
 onSelect={(mcq,short)=>{
 setNotes(prev=>{
 const existing=new Set(prev.map(q=>q.id))
 const newQ=[...mcq,...short].filter(q=>!existing.has(q.id))
 return [...prev,...newQ]
 })
 setShowSelector(false)
 }}
 onClose={()=>setShowSelector(false)}
 />
 )}
 </div>
 )
}
