import { currentSchoolDate } from './schoolCalendarDate.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Check, FileText, Minus, Plus, Printer, RefreshCw, Save, Search, Sparkles, Users, WandSparkles, X } from 'lucide-react'
import api, { resolveAssetUrl } from '../../services/api'
import { useAcademicStore } from '../../services/useAcademicStore'
import { getTenantStorageItem, setTenantStorageItem } from '../../services/tenantStorage'
import { usePaperStore } from './usePaperStore'
import { createLessonPlan, generateLessonPlanDraft, listLessonPlans, parseLessonPlanningText, updateLessonPlan } from './lessonPlanClient'
import { createEmptyLessonPlanDocument, deriveDiaryRowsFromLessonPlan, mergeParsedPlanningText, normalizeLessonPlanDocument, toLessonPlanPersistencePayload } from './lessonPlanDomain'
import './DailyDiaryWorkspace.css'

const DRAFT_KEY = 'assps_daily_diary_workspace_v2'
const CARD_COUNTS = [2,3,4,5,6,8,10]
const PALETTES = [
  { id:1, name:'Navy Signature', accent:'#0b2a4a', soft:'#edf3f8', line:'#c9d7e4', ink:'#102538' },
  { id:2, name:'Royal Blue', accent:'#1769aa', soft:'#edf6fc', line:'#c7dcec', ink:'#12314a' },
  { id:3, name:'Crimson Editorial', accent:'#a4343f', soft:'#fbf0f1', line:'#e6c7cb', ink:'#3b2024' },
  { id:4, name:'Gold Academy', accent:'#b77b00', soft:'#fff8e8', line:'#ead7aa', ink:'#3b2c12' },
]
const DEFAULT_ROWS = [
  { id:'english', subject:'ENGLISH', diary:'', isUrdu:false, isBold:true, fontSize:11, textAlign:'left' },
  { id:'urdu', subject:'URDU', diary:'', isUrdu:true, isBold:false, fontSize:12, textAlign:'right' },
  { id:'math', subject:'MATH', diary:'', isUrdu:false, isBold:true, fontSize:11, textAlign:'left' },
]
const clean = value => {
  const text = String(value ?? '').trim()
  if (!text || /^(null|undefined|\[object Object\])$/i.test(text)) return ''
  return text
}
const safeSchoolName = value => {
  const text = clean(value)
  if (!text || /tenant[_-]|diary[_-]tenant|^assps[_-][a-z0-9]{8,}$/i.test(text)) return 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'
  return text
}
const today = currentSchoolDate
const formatDate = value => {
  const date = new Date(`${value || today()}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
}
const studentName = student => clean(student?.name || student?.student_name || student?.full_name || [student?.first_name,student?.last_name].filter(Boolean).join(' ')) || 'Student'
const studentRoll = student => clean(student?.roll_number || student?.roll_no || student?.roll || student?.gr_number || '')
const studentSection = student => clean(student?.section || student?.section_name || '')
const studentId = student => String(student?.id || student?.student_id || student?.gr_number || `${studentName(student)}-${studentRoll(student)}`)

function computeA4Layout(count) {
  const map = {
    2:{cols:1,rows:2,gap:3.4,scale:1.12},
    3:{cols:1,rows:3,gap:2.6,scale:1.02},
    4:{cols:2,rows:2,gap:3,scale:1},
    5:{cols:2,rows:3,gap:2.4,scale:.88,lastSpan:true},
    6:{cols:2,rows:3,gap:2.2,scale:.86},
    8:{cols:2,rows:4,gap:1.8,scale:.76},
    10:{cols:2,rows:5,gap:1.5,scale:.69},
  }
  return map[count] || map[4]
}

function chunk(values,size) {
  const pages=[]
  for(let i=0;i<values.length;i+=size) pages.push(values.slice(i,i+size))
  return pages
}

function robustParseDiaryText(text, knownSubjects = []) {
  const lines=String(text||'').replace(/\r/g,'').split('\n').map(v=>v.trim()).filter(Boolean)
  const subjects=[...new Set([...knownSubjects,'English','Urdu','Math','Mathematics','Science','GK','General Knowledge','Islamiat','Computer','History','Geography','Pakistan Studies'])]
  const aliases=new Map(subjects.map(subject=>[subject.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,''),subject]))
  const rows=[]; let current=null
  for(const line of lines){
    const m=line.match(/^([^:]{2,35})\s*[:-]\s*(.*)$/)
    if(m){const key=m[1].toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,'');const subject=aliases.get(key);if(subject){current={id:`${subject}-${rows.length}-${Date.now()}`,subject:subject.toUpperCase(),diary:clean(m[2]),isUrdu:/urdu|اردو/i.test(subject),isBold:!/urdu|اردو/i.test(subject),fontSize:/urdu|اردو/i.test(subject)?12:11,textAlign:/urdu|اردو/i.test(subject)?'right':'left'};rows.push(current);continue}}
    const standalone=aliases.get(line.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,''))
    if(standalone){current={id:`${standalone}-${rows.length}-${Date.now()}`,subject:standalone.toUpperCase(),diary:'',isUrdu:/urdu|اردو/i.test(standalone),isBold:!/urdu|اردو/i.test(standalone),fontSize:/urdu|اردو/i.test(standalone)?12:11,textAlign:/urdu|اردو/i.test(standalone)?'right':'left'};rows.push(current);continue}
    if(current) current.diary=clean(`${current.diary} ${line}`)
  }
  return rows
}

function estimateOverflow(rows,cardsPerPage) {
  const chars=rows.reduce((sum,row)=>sum+clean(row.subject).length+clean(row.diary).length,0)
  const threshold={2:1800,3:1350,4:1050,5:850,6:720,8:540,10:420}[cardsPerPage]||900
  return chars>threshold ? `Content is dense for ${cardsPerPage} cards per page. Use fewer cards or shorten text for best readability.` : ''
}

function StudentCard({ mode, student, palette, schoolName, logoUrl, classLabel, section, date, rows, footerText, cardsPerPage, indexInPage }) {
  const layout=computeA4Layout(cardsPerPage)
  const identity=student?`${studentName(student)}${studentRoll(student)?` · Roll ${studentRoll(student)}`:''}`:'Student Name · Roll No.'
  const studentSec=studentSection(student)||section
  const logo=logoUrl?resolveAssetUrl(logoUrl):''
  return <article className={`dd-card ${layout.lastSpan&&cardsPerPage===5&&indexInPage===4?'span-last':''}`} style={{'--accent':palette.accent,'--soft':palette.soft,'--line':palette.line,'--ink':palette.ink,'--scale':layout.scale}} data-student-card>
    <div className="dd-card-accent"/>
    <header className="dd-card-head">
      <div className="dd-logo">{logo?<img src={logo} alt="ASSPS logo"/>:<span>ASSPS</span>}</div>
      <div className="dd-brand"><strong>{safeSchoolName(schoolName)}</strong><span>{mode==='lesson'?'LESSON PLAN':'DAILY DIARY'}</span></div>
      <div className="dd-date"><b>{formatDate(date)}</b><span>{classLabel}{studentSec?` · ${studentSec}`:''}</span></div>
    </header>
    <div className="dd-student"><span>STUDENT</span><strong>{identity}</strong></div>
    <div className="dd-table-head"><span>SUBJECT</span><span>{mode==='lesson'?'PLANNED LEARNING / TASK':'HOME TASK / DIARY'}</span></div>
    <div className="dd-rows">{rows.filter(row=>clean(row.subject)||clean(row.diary)).map((row,index)=><div className="dd-row" key={row.id||`${row.subject}-${index}`}><b className={row.isUrdu?'urdu':''}>{clean(row.subject)||'SUBJECT'}</b><div className={row.isUrdu?'urdu':''} style={{fontWeight:row.isBold?'800':'500',textAlign:row.textAlign||undefined,fontSize:`calc(${Math.max(9,Number(row.fontSize)||11)}px * var(--scale))`}}>{clean(row.diary)||'—'}</div></div>)}</div>
    {clean(footerText)&&<footer className={/[؀-ۿ]/.test(footerText)?'urdu':''}>{clean(footerText)}</footer>}
  </article>
}

export default function DailyDiaryWorkspace({ initialMode = 'diary', initialLessonPlanId = '', initialContext = null }) {
  const { activeClasses, subjectsForClass, sectionsForClass }=useAcademicStore()
  const { paperSettings }=usePaperStore()
  const [initialDraft]=useState(()=>{try{const raw=getTenantStorageItem(DRAFT_KEY);const draft=raw?JSON.parse(raw):{};return draft&&typeof draft==='object'&&!Array.isArray(draft)?draft:{}}catch{return {}}})
  const [mode,setMode]=useState(initialMode === 'lesson' ? 'lesson' : (initialDraft.mode||'diary'))
  const [classLevel,setClassLevel]=useState(initialDraft.classLevel||'')
  const [section,setSection]=useState(initialDraft.section||'')
  const [date,setDate]=useState(initialDraft.date||today())
  const [rows,setRows]=useState(Array.isArray(initialDraft.rows)?initialDraft.rows:DEFAULT_ROWS)
  const [cardsPerPage,setCardsPerPage]=useState(CARD_COUNTS.includes(Number(initialDraft.cardsPerPage))?Number(initialDraft.cardsPerPage):4)
  const [paletteId,setPaletteId]=useState(PALETTES.some(p=>p.id===Number(initialDraft.paletteId))?Number(initialDraft.paletteId):1)
  const [footerText,setFooterText]=useState(initialDraft.footerText||'Please review the assigned work and keep this card in the notebook.')
  const [pasteText,setPasteText]=useState('')
  const [students,setStudents]=useState([])
  const [selectedStudentIds,setSelectedStudentIds]=useState([])
  const [rosterStatus,setRosterStatus]=useState('')
  const [search,setSearch]=useState('')
  const [saving,setSaving]=useState(false)
  const savedDiaryIdentities=useRef(new Map())
  const diaryScopeGeneration=useRef(0)
  useEffect(()=>{diaryScopeGeneration.current+=1},[classLevel,section,date])
  const [status,setStatus]=useState('')
  const [previewZoom,setPreviewZoom]=useState(.68)
  const [lessonPlans,setLessonPlans]=useState([])
  const [lessonDoc,setLessonDoc]=useState(()=>createEmptyLessonPlanDocument({planningType:'daily',startDate:today(),endDate:today()}))
  const [lessonPlanId,setLessonPlanId]=useState('')
  const latestLessonDocRef=useRef(lessonDoc)
  useEffect(()=>{latestLessonDocRef.current=lessonDoc},[lessonDoc])
  const [lessonPaste,setLessonPaste]=useState('')
  const [busy,setBusy]=useState('')
  const selectedClass=useMemo(()=>activeClasses.find(item=>String(item.level)===String(classLevel)||item.name===classLevel)||null,[activeClasses,classLevel])
  const classLabel=selectedClass?.name||classLevel||'Class'
  const subjectOptions=useMemo(()=>subjectsForClass(classLevel||selectedClass?.level||'')||[],[subjectsForClass,classLevel,selectedClass?.level])
  const sectionOptions=useMemo(()=>selectedClass?sectionsForClass(selectedClass.name):[],[selectedClass,sectionsForClass])
  const palette=PALETTES.find(item=>item.id===paletteId)||PALETTES[0]
  const schoolName=safeSchoolName(paperSettings?.schoolName)
  const logoUrl=paperSettings?.logo||''
  const previewRows=useMemo(()=>mode==='lesson'?deriveDiaryRowsFromLessonPlan(lessonDoc,date).map(row=>({...row,fontSize:row.isUrdu?12:11,isBold:!row.isUrdu,textAlign:row.isUrdu?'right':'left'})):rows,[mode,lessonDoc,date,rows])
  const filteredStudents=useMemo(()=>students.filter(student=>{const hay=`${studentName(student)} ${studentRoll(student)}`.toLowerCase();return !search||hay.includes(search.toLowerCase())}),[students,search])
  const selectedStudents=useMemo(()=>students.filter(student=>selectedStudentIds.includes(studentId(student))),[students,selectedStudentIds])
  const genericCards=useMemo(()=>Array.from({length:cardsPerPage},(_,index)=>({__generic:index})),[cardsPerPage])
  const cardPopulation=selectedStudents.length?selectedStudents:genericCards
  const pages=useMemo(()=>chunk(cardPopulation,cardsPerPage),[cardPopulation,cardsPerPage])
  const overflowWarning=useMemo(()=>estimateOverflow(previewRows,cardsPerPage),[previewRows,cardsPerPage])


  useEffect(()=>{try{setTenantStorageItem(DRAFT_KEY,JSON.stringify({mode,classLevel,section,date,rows,cardsPerPage,paletteId,footerText}))}catch{ /* Preserve current diary editor state if storage is unavailable. */ }},[mode,classLevel,section,date,rows,cardsPerPage,paletteId,footerText])
  useEffect(()=>{
    let cancelled=false
    queueMicrotask(()=>{
      if(cancelled)return
      if(initialMode==='lesson') setMode('lesson')
      if(initialContext?.classLevel) setClassLevel(initialContext.classLevel)
      if(initialContext?.section) setSection(initialContext.section)
      if(initialContext?.date) setDate(initialContext.date)
    })
    return()=>{cancelled=true}
  },[initialMode,initialContext?.nonce,initialContext?.classLevel,initialContext?.section,initialContext?.date])
  useEffect(()=>{
    if(!initialLessonPlanId || !lessonPlans.length) return
    const plan=lessonPlans.find(item=>String(item.id)===String(initialLessonPlanId))
    if(!plan)return
    let cancelled=false
    queueMicrotask(()=>{if(!cancelled){setLessonPlanId(String(initialLessonPlanId));setLessonDoc(normalizeLessonPlanDocument(plan));setMode('lesson')}})
    return()=>{cancelled=true}
  },[initialLessonPlanId,lessonPlans])

  useEffect(()=>{
    if(!classLevel){let cancelled=false;queueMicrotask(()=>{if(!cancelled){setStudents([]);setSelectedStudentIds([])}});return()=>{cancelled=true}}
    let cancelled=false;queueMicrotask(()=>{if(!cancelled)setRosterStatus('Loading roster…')})
    api.get('/api/students',{params:{class:classLabel},skipCache:true}).then(response=>{if(cancelled)return;const list=Array.isArray(response.data?.data)?response.data.data:Array.isArray(response.data)?response.data:[];const scoped=section?list.filter(student=>!studentSection(student)||studentSection(student).toLowerCase()===section.toLowerCase()):list;setStudents(scoped);setSelectedStudentIds(scoped.map(studentId));setRosterStatus(`${scoped.length} students loaded`) }).catch(error=>{if(cancelled)return;setRosterStatus(error?.response?.data?.message||'Student roster unavailable. Existing selection preserved.')}).finally(()=>{})
    return()=>{cancelled=true}
  },[classLevel,section,classLabel])

  useEffect(()=>{
    let cancelled=false
    listLessonPlans({classLevel,from:date,to:date,limit:100}).then(plans=>{if(!cancelled)setLessonPlans(Array.isArray(plans)?plans:[])}).catch(()=>{})
    return()=>{cancelled=true}
  },[classLevel,date])

  const updateRow=(index,patch)=>setRows(current=>current.map((row,i)=>i===index?{...row,...patch}:row))
  const addRow=()=>setRows(current=>[...current,{id:`row-${Date.now()}`,subject:'',diary:'',isUrdu:false,isBold:true,fontSize:11,textAlign:'left'}])
  const removeRow=index=>setRows(current=>current.filter((_,i)=>i!==index))
  const applyDiaryPaste=()=>{const parsed=robustParseDiaryText(pasteText,subjectOptions);if(!parsed.length){setStatus('No subject lines detected. Use “Subject: task” format.');return}setRows(parsed);setPasteText('');setStatus(`Diary auto-arranged into ${parsed.length} subject rows.`)}

  const selectPlan=planId=>{setLessonPlanId(planId);const plan=lessonPlans.find(item=>String(item.id)===String(planId));if(plan){const doc=normalizeLessonPlanDocument(plan);setLessonDoc(doc);if(doc.startDate)setDate(doc.startDate)}}
  const autoPlanToday=async()=>{if(!classLevel){setStatus('Select class first.');return}setBusy('generate');try{const result=await generateLessonPlanDraft({planningType:'daily',classLevel,section,startDate:date,endDate:date,subjects:subjectOptions,useAi:true,bufferRatio:.05});setLessonDoc(normalizeLessonPlanDocument(result.plan));setStatus(result.ai?.used?'Daily multi-subject plan generated with AI enrichment.':'Daily plan generated from timetable/context; AI enrichment was unavailable or not needed.')}catch(error){setStatus(error?.response?.data?.message||'Daily plan generation failed.')}finally{setBusy('')}}
  const arrangeLessonPaste=async()=>{if(!lessonPaste.trim())return;setBusy('parse');try{const parsed=await parseLessonPlanningText(lessonPaste,subjectOptions);const next=mergeParsedPlanningText({...lessonDoc,classLevel,section,startDate:date,endDate:date,planningType:'daily'},parsed);setLessonDoc(next);setLessonPaste('');setStatus(parsed.unclassified?.length?'Lesson plan arranged; review preserved unclassified lines.':'Whole-day lesson text arranged by subject.')}catch(error){setStatus(error?.response?.data?.message||'Could not arrange lesson plan text.')}finally{setBusy('')}}
  const saveLessonPlan=async()=>{const submittedScope=diaryScopeGeneration.current;const submittedDocument=lessonDoc;setBusy('lesson-save');try{const payload=toLessonPlanPersistencePayload({...lessonDoc,classLevel,section,startDate:date,endDate:date,planningType:'daily'});const saved=lessonDoc.id?await updateLessonPlan(payload):await createLessonPlan(payload);const doc=normalizeLessonPlanDocument(saved);if(diaryScopeGeneration.current===submittedScope&&latestLessonDocRef.current===submittedDocument){setLessonDoc(doc);setLessonPlanId(doc.id||'');setStatus('Lesson plan saved safely.')}else{setStatus('Previous lesson plan saved. Current editor selection was not overwritten.')}setLessonPlans(current=>{const filtered=current.filter(item=>String(item.id)!==String(saved.id));return [saved,...filtered]})}catch(error){setStatus(error?.response?.data?.message||'Lesson plan save failed. Local workspace remains intact.')}finally{setBusy('')}}

  // Explicit teacher action: never overwrite a local recovery draft while browsing saved records.
  // The server independently authorizes BOTH the list and the document GET.
  const reopenSavedDiary=async()=>{
    if(!classLevel||!date){setStatus('Select a class and date before reopening a saved diary.');return}
    let schoolId=0
    try{const user=JSON.parse(window.localStorage.getItem('al_siddique_user')||'{}');schoolId=Number(user.school_id||user.schoolId||0)}catch{ /* Preserve current diary editor state if storage is unavailable. */ }
    if(!Number.isSafeInteger(schoolId)||schoolId<=0){setStatus('Current school identity could not be verified. Sign in to reopen a diary.');return}
    const openGeneration=diaryScopeGeneration.current
    const stillCurrent=()=>diaryScopeGeneration.current===openGeneration
    const staleSelection=()=>setStatus('Diary selection changed while reopening. Saved record was not loaded; editor content was preserved.')
    setBusy('diary-open')
    const matchesScope=record=>Number(record.school_id)===schoolId&&String(record.class_level||'')===String(classLevel)&&String(record.style_settings?.section||'')===String(section)&&String(record.diary_date||'').slice(0,10)===date
    try{
      const listResponse=await api.get('/api/daily-diary',{params:{limit:100},skipCache:true})
      if(!stillCurrent()){staleSelection();return}
      if(listResponse.data?.success!==true||!Array.isArray(listResponse.data?.data))throw new Error('Saved diary list was not verified.')
      const matches=listResponse.data.data.filter(matchesScope)
      if(!matches.length){setStatus('No saved diary found for this class, section and date in the accessible list.');return}
      if(matches.length!==1){setStatus('Multiple saved diaries match. Select the exact record in Saved Diaries before editing.');return}
      const id=Number(matches[0].id)
      if(!Number.isSafeInteger(id)||id<=0)throw new Error('Saved diary identity is invalid.')
      if(!window.confirm('Reopen this saved diary? This replaces unsaved fields currently in the editor.'))return
      if(!stillCurrent()){staleSelection();return}
      const detailResponse=await api.get(`/api/daily-diary/${id}`,{skipCache:true})
      if(!stillCurrent()){staleSelection();return}
      const saved=detailResponse.data?.data
      if(detailResponse.data?.success!==true||!saved||Number(saved.id)!==id||!matchesScope(saved))throw new Error('Saved diary scope verification failed. Editor was not changed.')
      if(!Array.isArray(saved.rows))throw new Error('Saved diary content is invalid. Editor was not changed.')
      setRows(saved.rows)
      if(CARD_COUNTS.includes(Number(saved.slips_per_page)))setCardsPerPage(Number(saved.slips_per_page))
      if(PALETTES.some(p=>p.id===Number(saved.style_settings?.paletteId)))setPaletteId(Number(saved.style_settings.paletteId))
      if(typeof saved.footer_text==='string')setFooterText(saved.footer_text)
      savedDiaryIdentities.current.set(JSON.stringify([classLevel,section,date]),id)
      setStatus('Saved diary reopened and verified. Changes will update its original record.')
    }catch(error){setStatus(error?.response?.data?.message||error?.message||'Saved diary could not be reopened. Local editor remains intact.')}
    finally{setBusy('')}
  }

  const saveDiary=async()=>{const saveGeneration=diaryScopeGeneration.current;setSaving(true);try{const payload={template_id:paletteId,school_name:schoolName,tagline:'',logo_url:logoUrl,class_level:classLevel,class_name:classLabel,diary_date:date,slips_per_page:cardsPerPage,footer_text:footerText,footer_is_urdu:/[\u0600-\u06ff]/.test(footerText),rows,style_settings:{workspaceVersion:2,section,paletteId,mode:'diary'}};const scopeKey=JSON.stringify([classLevel,section,date]);const updateId=savedDiaryIdentities.current.get(scopeKey)||null;const response=updateId?await api.put(`/api/daily-diary/${updateId}`,payload):await api.post('/api/daily-diary',payload);const saved=response.data?.data;if(response.data?.success!==true||!Number.isSafeInteger(saved?.id)||saved.id<=0)throw new Error('Unverified Diary Save response');if(updateId&&Number(saved.id)!==Number(updateId))throw new Error('Diary Save returned a different record identity');if((saved.class_level!=null&&String(saved.class_level)!==String(classLevel))||(saved.diary_date!=null&&String(saved.diary_date).slice(0,10)!==date)||(saved.style_settings?.section!=null&&String(saved.style_settings.section)!==String(section)))throw new Error('Diary Save returned a different school-day selection');savedDiaryIdentities.current.set(scopeKey,Number(saved.id));setStatus(diaryScopeGeneration.current===saveGeneration?'Daily diary saved safely.':'Previous diary selection was saved. Current editor selection was not saved.')}catch(error){setStatus(diaryScopeGeneration.current===saveGeneration?(error?.response?.data?.message||'Daily diary save failed. Local recovery draft remains available.'):'Previous diary selection could not be saved. Current editor selection was not submitted.')}finally{setSaving(false)}}
  const toggleStudent=id=>setSelectedStudentIds(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])
  const selectAll=()=>setSelectedStudentIds(students.map(studentId))
  const clearStudents=()=>setSelectedStudentIds([])
  const print=()=>window.print()

  return <div className="dd-workspace" data-diary-workspace>
    <div className="dd-toolbar no-print">
      <div><span className="dd-eyebrow">ASSPS Notebook Print Studio</span><h2>{mode==='diary'?'Daily Diary':'Lesson Plan Cards'}</h2><p>Edit on the left. A4 output updates live on the right.</p></div>
      <div className="dd-toolbar-actions">{mode==='diary'?<><button onClick={reopenSavedDiary} disabled={saving||busy==='diary-open'}><BookOpen size={15}/>{busy==='diary-open'?'Opening…':'Reopen Saved Diary'}</button><button onClick={saveDiary} disabled={saving||busy==='diary-open'}><Save size={15}/>{saving?'Saving…':'Save Diary'}</button></>:<button onClick={saveLessonPlan} disabled={busy==='lesson-save'}><Save size={15}/>{busy==='lesson-save'?'Saving…':'Save Lesson Plan'}</button>}<button className="primary" onClick={print}><Printer size={15}/> Print / PDF</button></div>
    </div>
    {status&&<div className="dd-status no-print"><Check size={14}/>{status}<button onClick={()=>setStatus('')}><X size={13}/></button></div>}

    <div className="dd-modebar no-print"><button className={mode==='diary'?'active':''} onClick={()=>setMode('diary')} data-diary-mode="diary"><FileText size={16}/> Daily Diary</button><button className={mode==='lesson'?'active':''} onClick={()=>setMode('lesson')} data-diary-mode="lesson"><BookOpen size={16}/> Lesson Plan</button></div>

    <div className="dd-main">
      <aside className="dd-controls no-print">
        <section><div className="dd-section-title">Class & recipients</div><div className="dd-grid-2"><label><span>Class</span><select data-dd-class value={classLevel} onChange={e=>{setClassLevel(e.target.value);setSection('')}}><option value="">Select class</option>{activeClasses.map(item=><option key={item.level} value={item.level}>{item.name}</option>)}</select></label><label><span>Section</span><select data-dd-section value={section} onChange={e=>setSection(e.target.value)}><option value="">All / default</option>{sectionOptions.map(value=><option key={value} value={value}>{value}</option>)}</select></label></div><label><span>Date</span><input data-dd-date type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><div className="dd-roster-head"><span><Users size={14}/>{rosterStatus||'Student roster'}</span><div><button onClick={selectAll}>All</button><button onClick={clearStudents}>None</button></div></div>{students.length>0&&<><div className="dd-search"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student / roll"/></div><div className="dd-student-list">{filteredStudents.map(student=>{const id=studentId(student);return <label key={id}><input type="checkbox" checked={selectedStudentIds.includes(id)} onChange={()=>toggleStudent(id)}/><span>{studentName(student)}</span><small>{studentRoll(student)||'—'}{studentSection(student)?` · ${studentSection(student)}`:''}</small></label>})}</div></>}</section>

        {mode==='diary'?<section data-diary-editor><div className="dd-section-title">Diary content</div><div className="dd-paste"><textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder={'Paste the whole diary at once:\nEnglish: Page 21 reading practice\nUrdu: Page 25 writing\nMath: Exercise 4'}/><button onClick={applyDiaryPaste}><WandSparkles size={14}/> Auto Arrange</button></div><div className="dd-row-editors">{rows.map((row,index)=><div className="dd-row-editor" key={row.id||index}><div className="dd-row-top"><input value={row.subject||''} onChange={e=>updateRow(index,{subject:e.target.value,isUrdu:/urdu|اردو/i.test(e.target.value)})} placeholder="Subject"/><button onClick={()=>removeRow(index)}><X size={13}/></button></div><textarea className={row.isUrdu?'urdu':''} value={row.diary||''} onChange={e=>updateRow(index,{diary:e.target.value})} placeholder="Diary / home task"/><div className="dd-format"><button className={row.isBold?'active':''} onClick={()=>updateRow(index,{isBold:!row.isBold})}>B</button><button onClick={()=>updateRow(index,{fontSize:Math.max(9,(row.fontSize||11)-1)})}><Minus size={12}/></button><span>{row.fontSize||11}px</span><button onClick={()=>updateRow(index,{fontSize:Math.min(18,(row.fontSize||11)+1)})}><Plus size={12}/></button><select value={row.textAlign||'left'} onChange={e=>updateRow(index,{textAlign:e.target.value})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div></div>)}</div><button className="dd-add-row" onClick={addRow}><Plus size={14}/> Add Subject</button></section>:<section data-lesson-card-editor><div className="dd-section-title">Lesson Plan source</div><label><span>Existing plan</span><select value={lessonPlanId} onChange={e=>selectPlan(e.target.value)}><option value="">Quick / new daily plan</option>{lessonPlans.map(plan=><option key={plan.id} value={plan.id}>{plan.title||'Lesson Plan'} · {plan.plan_date||plan.date||''}</option>)}</select></label><button data-auto-plan-today className="dd-ai-button" onClick={autoPlanToday} disabled={busy==='generate'}>{busy==='generate'?<RefreshCw className="spin" size={15}/>:<Sparkles size={15}/>} Auto Plan This Day</button><div className="dd-paste"><textarea value={lessonPaste} onChange={e=>setLessonPaste(e.target.value)} placeholder={'Paste all subjects together:\nEnglish: Reading comprehension\nHomework: Exercise 4\n\nScience: Photosynthesis\nActivity: Diagram work'}/><button onClick={arrangeLessonPaste} disabled={busy==='parse'}><WandSparkles size={14}/> Arrange Plan</button></div><div className="dd-lesson-summary">{lessonDoc.subjects.length?lessonDoc.subjects.map(subject=><div key={subject.subject}><b>{subject.subject}</b><span>{subject.lessons.filter(lesson=>!date||lesson.date===date).length||subject.lessons.length} lesson slot(s)</span></div>):<p>No lesson-plan content yet.</p>}</div></section>}

        <section><div className="dd-section-title">A4 layout & style</div><label><span>Cards per A4 page</span><div className="dd-counts">{CARD_COUNTS.map(count=><button key={count} data-card-count={count} className={cardsPerPage===count?'active':''} onClick={()=>setCardsPerPage(count)}>{count}</button>)}</div></label><label><span>Palette</span><div className="dd-palettes">{PALETTES.map(item=><button key={item.id} className={paletteId===item.id?'active':''} onClick={()=>setPaletteId(item.id)}><i style={{background:item.accent}}/><span>{item.name}</span></button>)}</div></label><label><span>Footer note</span><input value={footerText} onChange={e=>setFooterText(e.target.value)} /></label>{overflowWarning&&<div className="dd-overflow-warning">{overflowWarning}</div>}</section>
      </aside>

      <section className="dd-preview-wrap">
        <div className="dd-preview-toolbar no-print"><div><b>Live A4 Preview</b><span>{selectedStudents.length?`${selectedStudents.length} personalized card${selectedStudents.length===1?'':'s'}`:`Generic preview · ${cardsPerPage} cards`}</span></div><div><button onClick={()=>setPreviewZoom(z=>Math.max(.4,+(z-.08).toFixed(2)))}><Minus size={13}/></button><span>{Math.round(previewZoom*100)}%</span><button onClick={()=>setPreviewZoom(z=>Math.min(1,+(z+.08).toFixed(2)))}><Plus size={13}/></button><button onClick={()=>setPreviewZoom(.68)}>Fit</button></div></div>
        <div className="dd-page-stage" style={{'--preview-zoom':previewZoom}}>{pages.map((page,pageIndex)=>{const layout=computeA4Layout(cardsPerPage);return <div className="dd-a4-page" key={pageIndex} style={{'--cols':layout.cols,'--rows':layout.rows,'--gap-mm':`${layout.gap}mm`}} data-a4-page>{page.map((student,index)=><StudentCard key={student.__generic!==undefined?`generic-${pageIndex}-${index}`:studentId(student)} mode={mode} student={student.__generic!==undefined?null:student} palette={palette} schoolName={schoolName} logoUrl={logoUrl} classLabel={classLabel} section={section} date={date} rows={previewRows} footerText={footerText} cardsPerPage={cardsPerPage} indexInPage={index}/>)}</div>})}</div>
      </section>
    </div>
  </div>
}
