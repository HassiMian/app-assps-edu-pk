import { currentSchoolDate } from './schoolCalendarDate.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, BrainCircuit, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Copy, FileText, Plus, Printer, RefreshCw, Save, Sparkles, Trash2, WandSparkles, X, Users } from 'lucide-react'
import { useAcademicStore } from '../../services/useAcademicStore'
import { getTenantStorageItem, setTenantStorageItem } from '../../services/tenantStorage'
import {
  createLessonPlan,
  deleteLessonPlan,
  generateLessonPlanDraft,
  getLessonPlanningContext,
  listLessonPlans,
  parseLessonPlanningText,
  shareLessonPlan,
  updateLessonPlan,
} from './lessonPlanClient'
import {
  PLANNING_TYPES,
  createEmptyLessonPlanDocument,
  lessonPlanProgress,
  mergeParsedPlanningText,
  normalizeLessonPlanDocument,
  toLessonPlanPersistencePayload,
} from './lessonPlanDomain'
import './LessonPlanningWorkspace.css'

const DRAFT_KEY = 'assps_lesson_planner_v2_draft'
const today = currentSchoolDate
const shiftDate = (value, days) => {
  const date = new Date(`${value || today()}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
const clean = value => String(value ?? '').trim()
const planTypeLabel = type => PLANNING_TYPES.find(item => item.key === type)?.short || 'Daily'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeClassSelection(activeClasses, value) {
  return activeClasses.find(item => String(item.level) === String(value) || item.name === value) || null
}

function buildPrintHtml(doc) {
  const subjectHtml = doc.subjects.map(subject => {
    const unitHtml = subject.units.map(unit => `<tr><td>${escapeHtml(unit.label)}</td><td>${escapeHtml(unit.pageRange || '—')}</td><td>${Number(unit.allocatedPeriods || 0) || '—'}</td><td>${escapeHtml(unit.sourceVersion || unit.source || 'Teacher')}</td></tr>`).join('')
    const lessonHtml = subject.lessons.map(lesson => `<tr><td>${escapeHtml(lesson.date || '—')}</td><td>${escapeHtml(lesson.period || '—')}</td><td>${escapeHtml(lesson.title || lesson.unitLabel || 'Teacher confirmation required')}</td><td>${escapeHtml((lesson.objectives || []).join('; ') || '—')}</td><td>${escapeHtml(lesson.assessment || '—')}</td></tr>`).join('')
    return `<section class="subject"><h2>${escapeHtml(subject.subject)}</h2><div class="capacity">Capacity ${subject.capacityPeriods || 0} · Buffer ${subject.bufferPeriods || 0} · Usable ${subject.usablePeriods || 0}${subject.overloadPeriods ? ` · <strong>Over by ${subject.overloadPeriods}</strong>` : ''}</div>${unitHtml ? `<h3>Coverage</h3><table><thead><tr><th>Chapter / Unit</th><th>Pages</th><th>Periods</th><th>Source</th></tr></thead><tbody>${unitHtml}</tbody></table>` : ''}${lessonHtml ? `<h3>Scheduled Lessons</h3><table><thead><tr><th>Date</th><th>Period</th><th>Lesson</th><th>Objectives</th><th>Assessment</th></tr></thead><tbody>${lessonHtml}</tbody></table>` : ''}</section>`
  }).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.title || 'ASSPS Lesson Plan')}</title><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,'ASSPS Jameel Noori','Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif;color:#0f172a;margin:0;font-size:11px}.head{border-bottom:2px solid #0b2a4a;padding-bottom:8px;margin-bottom:14px}.brand{font-size:18px;font-weight:800;color:#0b2a4a}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.meta div{border:1px solid #d9e2ec;border-radius:6px;padding:6px;background:#fbfdff}.subject{break-inside:avoid;margin:0 0 14px}.subject h2{margin:0;background:#0b2a4a;color:white;padding:6px 9px;font-size:13px}.subject h3{font-size:11px;margin:8px 0 4px;color:#0b2a4a}.capacity{padding:5px 8px;border:1px solid #d9e2ec;border-top:0;background:#fff}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d9e2ec;padding:5px;vertical-align:top}th{background:#f1f5f9;text-align:left}.warning{border-left:3px solid #d69e2e;background:#fffbea;padding:7px;margin:8px 0}.urdu{direction:rtl;text-align:right;font-family:'ASSPS Jameel Noori','Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif}</style></head><body><div class="head"><div class="brand">AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</div><div>Lesson Planning · ${escapeHtml(planTypeLabel(doc.planningType))}</div><div class="meta"><div><b>Class</b><br>${escapeHtml(doc.classLevel || '—')}</div><div><b>Section</b><br>${escapeHtml(doc.section || '—')}</div><div><b>Range</b><br>${escapeHtml(doc.startDate || '—')} — ${escapeHtml(doc.endDate || doc.startDate || '—')}</div><div><b>Term</b><br>${escapeHtml(doc.termLabel || '—')}</div></div></div>${(doc.analysis?.warnings || []).map(w => `<div class="warning">${escapeHtml(w)}</div>`).join('')}${subjectHtml}</body></html>`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

function PlanningAnalysis({ document, ai }) {
  const analysis = document.analysis || {}
  const progress = lessonPlanProgress(document)
  return <div className="lp-analysis" data-planning-analysis>
    <div className="lp-analysis-title"><BrainCircuit size={17}/> Planning Analysis</div>
    <div className="lp-metric-grid">
      <div><span>Capacity</span><strong>{analysis.totalCapacityPeriods ?? 0}</strong><small>timetable periods</small></div>
      <div><span>Usable</span><strong>{analysis.totalUsablePeriods ?? 0}</strong><small>after buffer</small></div>
      <div><span>Curriculum</span><strong>{analysis.curriculumScopeCount ?? 0}</strong><small>mapped scopes</small></div>
      <div><span>Question Bank</span><strong>{analysis.questionBankSignalCount ?? 0}</strong><small>chapter signals</small></div>
    </div>
    {ai && <div className={`lp-ai-state ${ai.used ? 'ok' : 'neutral'}`}><Sparkles size={14}/>{ai.used ? `AI enrichment applied${ai.model ? ` · ${ai.model}` : ''}` : ai.message || 'Deterministic planning active'}</div>}
    {analysis.warnings?.length > 0 && <div className="lp-warning-list">{analysis.warnings.map((warning,index)=><div key={index}>{warning}</div>)}</div>}
    {progress.length > 0 && <div className="lp-progress-list">{progress.map(item=><div key={item.subject}><div><b>{item.subject}</b><span>{item.completed}/{item.total} taught</span></div><div className="lp-progress-track"><i style={{width:`${item.percent}%`}}/></div><small className={item.overloadPeriods ? 'danger' : ''}>{item.overloadPeriods ? `${item.overloadPeriods} periods over capacity` : item.status}</small></div>)}</div>}
  </div>
}

function UnitEditor({ unit, onChange, onRemove, onMoveUp, onMoveDown }) {
  return <div className="lp-unit" data-unit-editor>
    <div className="lp-unit-main">
      <input value={unit.label || ''} onChange={e=>onChange({ ...unit, label:e.target.value })} placeholder="Chapter / Unit / Topic" />
      <input value={unit.pageRange || ''} onChange={e=>onChange({ ...unit, pageRange:e.target.value })} placeholder="Page range (verified only)" />
      <input type="number" min="0" value={unit.allocatedPeriods || 0} onChange={e=>onChange({ ...unit, allocatedPeriods:Number(e.target.value) || 0 })} title="Allocated periods" />
    </div>
    <div className="lp-row-actions"><button onClick={onMoveUp} title="Move up"><ChevronUp size={14}/></button><button onClick={onMoveDown} title="Move down"><ChevronDown size={14}/></button><button className="danger" onClick={onRemove} title="Remove unit"><Trash2 size={14}/></button></div>
    {unit.needsReview && <span className="lp-review-flag">Needs curriculum review</span>}
  </div>
}

function LessonEditor({ lesson, onChange }) {
  const set = (key,value) => onChange({ ...lesson, [key]:value })
  return <div className="lp-lesson" data-lesson-editor>
    <div className="lp-lesson-head"><div><b>{lesson.date || 'Unscheduled'}</b><span>{lesson.period || 'Period pending'}</span></div><span className={`confidence ${lesson.confidence || 'teacher'}`}>{lesson.confidence || 'teacher'}</span></div>
    <input className="lp-lesson-title" value={lesson.title || ''} onChange={e=>set('title',e.target.value)} placeholder="Lesson topic / title" />
    <div className="lp-two"><textarea value={(lesson.objectives || []).join('\n')} onChange={e=>set('objectives',e.target.value.split('\n').map(v=>v.trim()).filter(Boolean))} placeholder="Learning objectives — one per line"/><textarea value={(lesson.activities || []).join('\n')} onChange={e=>set('activities',e.target.value.split('\n').map(v=>v.trim()).filter(Boolean))} placeholder="Teaching / student activities"/></div>
    <div className="lp-two"><textarea value={lesson.assessment || ''} onChange={e=>set('assessment',e.target.value)} placeholder="Assessment / check for understanding"/><textarea value={lesson.homework || ''} onChange={e=>set('homework',e.target.value)} placeholder="Homework / diary task"/></div>
    <div className="lp-two compact"><input value={(lesson.resources || []).join(', ')} onChange={e=>set('resources',e.target.value.split(',').map(v=>v.trim()).filter(Boolean))} placeholder="Resources"/><select value={lesson.status || 'planned'} onChange={e=>set('status',e.target.value)}><option value="planned">Planned</option><option value="ready">Ready</option><option value="taught">Taught</option><option value="partially_taught">Partially Taught</option><option value="carried_forward">Carried Forward</option><option value="skipped">Skipped</option><option value="revised">Revised</option><option value="assessed">Assessed</option></select></div>
  </div>
}

function SubjectPlanner({ subjectPlan, planningType, onChange, onRemove }) {
  const [open,setOpen] = useState(true)
  const updateUnit = (index,next) => onChange({ ...subjectPlan, units:subjectPlan.units.map((unit,i)=>i===index?next:unit) })
  const moveUnit = (index,delta) => {
    const next=[...subjectPlan.units]; const target=index+delta
    if(target<0||target>=next.length)return
    ;[next[index],next[target]]=[next[target],next[index]]
    onChange({ ...subjectPlan, units:next.map((unit,i)=>({ ...unit, sortOrder:i+1 })) })
  }
  const addUnit = () => onChange({ ...subjectPlan, units:[...subjectPlan.units,{ id:`teacher-unit-${Date.now()}`, label:'', pageRange:'', allocatedPeriods:1, source:'teacher', needsReview:false, learningOutcomes:[] }] })
  const updateLesson = (index,next) => onChange({ ...subjectPlan, lessons:subjectPlan.lessons.map((lesson,i)=>i===index?next:lesson) })
  return <section className="lp-subject-card" data-subject-plan={subjectPlan.subject}>
    <header><div><button className="collapse" onClick={()=>setOpen(v=>!v)}>{open?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button><div><strong>{subjectPlan.subject}</strong><span>{subjectPlan.capacityPeriods || 0} periods · {subjectPlan.usablePeriods || 0} usable</span></div></div><div className="lp-subject-status"><span className={subjectPlan.overloadPeriods ? 'danger' : 'ok'}>{subjectPlan.overloadPeriods ? `Over by ${subjectPlan.overloadPeriods}` : subjectPlan.status === 'timetable_missing' ? 'Timetable needed' : 'Capacity OK'}</span><button className="icon danger" onClick={onRemove}><Trash2 size={15}/></button></div></header>
    {open && <div className="lp-subject-body">
      {planningType === 'term' && <><div className="lp-section-label">Curriculum coverage</div><div className="lp-unit-list">{subjectPlan.units.map((unit,index)=><UnitEditor key={unit.id || index} unit={unit} onChange={next=>updateUnit(index,next)} onMoveUp={()=>moveUnit(index,-1)} onMoveDown={()=>moveUnit(index,1)} onRemove={()=>onChange({ ...subjectPlan, units:subjectPlan.units.filter((_,i)=>i!==index) })}/>)}</div><button className="lp-add-small" onClick={addUnit}><Plus size={14}/> Add Chapter / Unit</button></>}
      <div className="lp-section-label">{planningType === 'term' ? 'Scheduled lesson sequence' : 'Subject lesson plan'}</div>
      {subjectPlan.lessons.length ? <div className="lp-lesson-list">{subjectPlan.lessons.map((lesson,index)=><LessonEditor key={lesson.key || index} lesson={lesson} onChange={next=>updateLesson(index,next)}/>)}</div> : <div className="lp-empty-inline">No scheduled lesson yet. Generate from timetable or add curriculum mapping.</div>}
    </div>}
  </section>
}

export default function LessonPlanningWorkspace() {
  const { activeClasses, subjectsForClass, sectionsForClass, sessionStart, sessionEnd } = useAcademicStore()
  const [document,setDocument] = useState(()=>{
    try { const raw=getTenantStorageItem(DRAFT_KEY); return raw?normalizeLessonPlanDocument(JSON.parse(raw)):createEmptyLessonPlanDocument({startDate:today()}) } catch { return createEmptyLessonPlanDocument({startDate:today()}) }
  })
  const [savedPlans,setSavedPlans] = useState([])
  const [selectedSubjects,setSelectedSubjects] = useState(()=>document.subjects.map(item=>item.subject))
  const [context,setContext] = useState(null)
  const [aiState,setAiState] = useState(null)
  const [busy,setBusy] = useState('')
  const [status,setStatus] = useState('')
  const [smartText,setSmartText] = useState('')
  const [showPaste,setShowPaste] = useState(false)
  const [showSaved,setShowSaved] = useState(true)
  const selectedClass = useMemo(()=>normalizeClassSelection(activeClasses,document.classLevel),[activeClasses,document.classLevel])
  const availableSubjects = useMemo(()=>{
    const academic = subjectsForClass(document.classLevel || selectedClass?.level || '') || []
    return [...new Set([...academic,...(context?.availableSubjects || []),...document.subjects.map(item=>item.subject)].filter(Boolean))]
  },[subjectsForClass,document.classLevel,selectedClass?.level,context,document.subjects])
  const sectionOptions = useMemo(()=>selectedClass ? sectionsForClass(selectedClass.name) : [],[selectedClass,sectionsForClass])

  useEffect(()=>{ try { setTenantStorageItem(DRAFT_KEY,JSON.stringify(document)) } catch {} },[document])
  useEffect(()=>{ listLessonPlans({limit:200}).then(data=>setSavedPlans(Array.isArray(data)?data:[])).catch(()=>{}) },[])
  useEffect(()=>{
    if(!document.classLevel)return
    let cancelled=false
    getLessonPlanningContext({ classLevel:document.classLevel,section:document.section,subjects:selectedSubjects.join(',') }).then(data=>{if(!cancelled)setContext(data)}).catch(()=>{if(!cancelled)setContext(null)})
    return()=>{cancelled=true}
  },[document.classLevel,document.section,selectedSubjects.join('|')])

  const patch = updates => setDocument(current=>normalizeLessonPlanDocument({ ...current,...updates }))
  const changeType = type => {
    const start=document.startDate||today(); let end=document.endDate||start
    if(type==='daily') end=start
    if(type==='weekly' && end===start) end=shiftDate(start,6)
    if(type==='term' && end===start) end=sessionEnd||shiftDate(start,84)
    patch({planningType:type,endDate:end,termLabel:type==='term'?(document.termLabel||'Term') : document.termLabel})
  }
  const toggleSubject = subject => setSelectedSubjects(current=>current.includes(subject)?current.filter(item=>item!==subject):[...current,subject])
  const syncSelectedSubjectsIntoDocument = () => {
    setDocument(current=>{
      const existing=new Map(current.subjects.map(item=>[item.subject.toLowerCase(),item]))
      return normalizeLessonPlanDocument({ ...current,subjects:selectedSubjects.map(name=>existing.get(name.toLowerCase())||{subject:name,units:[],lessons:[],status:'draft'}) })
    })
  }
  useEffect(syncSelectedSubjectsIntoDocument,[selectedSubjects.join('|')])

  const generate = async () => {
    if(!document.classLevel){setStatus('Select a class first.');return}
    if(!document.startDate||!document.endDate){setStatus('Select a valid planning date range.');return}
    setBusy('generate');setStatus('Analyzing timetable, curriculum and Question Bank…')
    try{
      const result=await generateLessonPlanDraft({
        planningType:document.planningType,classLevel:document.classLevel,section:document.section,teacher:document.teacher,
        sessionLabel:document.sessionLabel||'',termLabel:document.termLabel,startDate:document.startDate,endDate:document.endDate,
        subjects:selectedSubjects,bufferRatio:document.bufferRatio,blackoutDates:document.blackoutDates,useAi:true,
      })
      const next=normalizeLessonPlanDocument({ ...result.plan,id:document.id,serverRevision:document.serverRevision,revision:document.revision,title:document.title })
      setDocument(next);setSelectedSubjects(next.subjects.map(item=>item.subject));setAiState(result.ai);setStatus('Draft generated. Review highlighted assumptions before saving.')
    }catch(error){setStatus(error?.response?.data?.message||error?.message||'Plan generation failed.')}
    finally{setBusy('')}
  }

  const smartArrange = async () => {
    if(!smartText.trim())return
    setBusy('parse')
    try{const parsed=await parseLessonPlanningText(smartText,availableSubjects);const next=mergeParsedPlanningText(document,parsed);setDocument(next);setSelectedSubjects(next.subjects.map(item=>item.subject));setShowPaste(false);setStatus(parsed.unclassified?.length?'Plan arranged; some lines need review.':'Plan text arranged into subject blocks.')}catch(error){setStatus(error?.response?.data?.message||'Could not arrange pasted plan.')}
    finally{setBusy('')}
  }

  const latestDocumentRef=useRef(document)
  useEffect(()=>{latestDocumentRef.current=document},[document])
  const save = async () => {
    const submittedDocument=JSON.stringify(document)
    setBusy('save')
    try{
      const payload=toLessonPlanPersistencePayload(document)
      const saved=document.id?await updateLessonPlan(payload):await createLessonPlan(payload)
      const unchanged=JSON.stringify(latestDocumentRef.current)===submittedDocument;const normalized=normalizeLessonPlanDocument(saved);if(unchanged){setDocument(normalized);setSelectedSubjects(normalized.subjects.map(item=>item.subject))}
      try{const all=await listLessonPlans({limit:200});setSavedPlans(Array.isArray(all)?(all.some(item=>String(item.id)===String(saved.id))?all.map(item=>String(item.id)===String(saved.id)?saved:item):[saved,...all]):[saved])}catch{setSavedPlans(current=>[saved,...current.filter(item=>String(item.id)!==String(saved.id))])}setStatus(unchanged&&JSON.stringify(latestDocumentRef.current)===JSON.stringify(normalized)?'Lesson plan saved safely.':'Previous lesson plan selection was saved. Current editor selection was not saved.')
    }catch(error){if(JSON.stringify(latestDocumentRef.current)!==submittedDocument){setStatus('Previous lesson plan selection could not be saved. Current editor selection was not submitted.');return}const code=error?.response?.data?.code;if(code==='LESSON_PLAN_REVISION_CONFLICT')setStatus('This plan changed in another session. Reopen it before saving again.');else setStatus(error?.response?.data?.message||error?.message||'Save failed. Recovery draft remains on this device.')}
    finally{setBusy('')}
  }
  const openPlan = plan => {const next=normalizeLessonPlanDocument(plan);setDocument(next);setSelectedSubjects(next.subjects.map(item=>item.subject));setAiState(null);setStatus('Saved plan reopened.')}
  const duplicate = plan => {const next=normalizeLessonPlanDocument(plan);delete next.id;next.revision=0;next.serverRevision=0;next.title=`${next.title||planTypeLabel(next.planningType)} — Copy`;setDocument(next);setSelectedSubjects(next.subjects.map(item=>item.subject));setStatus('Copy created as a new unsaved plan.')}
  const removePlan = async plan => {if(!plan.id||!window.confirm('Delete this saved lesson plan?'))return;setBusy('delete');try{await deleteLessonPlan(plan);setSavedPlans(current=>current.filter(item=>item.id!==plan.id));if(document.id===plan.id)setDocument(createEmptyLessonPlanDocument({startDate:today()}));setStatus('Plan deleted.')}catch(error){setStatus(error?.response?.data?.message||'Delete failed.')}finally{setBusy('')}}
  const share = async plan => {setBusy('share');try{const result=await shareLessonPlan(plan);setStatus(`Shared to ${result.delivery?.students||0} student portal${result.delivery?.students===1?'':'s'}.`)}catch(error){setStatus(error?.response?.data?.message||'Share failed.')}finally{setBusy('')}}
  const printPlan = () => {const win=window.open('','_blank','width=1100,height=900');if(!win)return window.print();win.document.open();win.document.write(buildPrintHtml(document));win.document.close();win.focus();setTimeout(()=>win.print(),250)}
  const reset = () => {const next=createEmptyLessonPlanDocument({startDate:today(),endDate:today(),sessionLabel:document.sessionLabel||''});setDocument(next);setSelectedSubjects([]);setAiState(null);setStatus('New plan ready.')}

  const updateSubject = (index,next) => setDocument(current=>normalizeLessonPlanDocument({ ...current,subjects:current.subjects.map((item,i)=>i===index?next:item) }))
  const removeSubject = index => {const name=document.subjects[index]?.subject;setDocument(current=>normalizeLessonPlanDocument({ ...current,subjects:current.subjects.filter((_,i)=>i!==index) }));setSelectedSubjects(current=>current.filter(item=>item!==name))}

  return <div className="lesson-planning-workspace" data-lesson-planning-workspace>
    <div className="lp-topbar">
      <div><div className="lp-eyebrow">ASSPS Academic Planning</div><h2>Lesson Planning Workspace</h2><p>Plan once. Reuse across term, daily lessons, diary cards and assessments.</p></div>
      <div className="lp-actions"><button className="ghost" onClick={reset}><Plus size={16}/> New</button><button className="ghost" onClick={()=>setShowPaste(true)}><WandSparkles size={16}/> Smart Paste</button><button className="ghost" onClick={printPlan}><Printer size={16}/> Print</button><button className="ghost" onClick={()=>window.dispatchEvent(new CustomEvent('assps-open-diary-lesson-plan',{detail:{planId:document.id||'',classLevel:document.classLevel,section:document.section,date:document.startDate}}))}><Users size={16}/> Student Cards</button><button data-save-plan className="primary" onClick={save} disabled={busy==='save'}>{busy==='save'?<RefreshCw className="spin" size={16}/>:<Save size={16}/>} Save Draft</button></div>
    </div>

    {status && <div className="lp-status" role="status"><CheckCircle2 size={15}/>{status}<button onClick={()=>setStatus('')}><X size={14}/></button></div>}

    <div className="lp-shell">
      <main>
        <section className="lp-card lp-foundation">
          <div className="lp-card-title"><CalendarDays size={17}/><span>Planning scope</span></div>
          <div className="lp-type-switch">{PLANNING_TYPES.map(item=><button key={item.key} data-planning-type={item.key} className={document.planningType===item.key?'active':''} onClick={()=>changeType(item.key)}>{item.label}</button>)}</div>
          <div className="lp-form-grid">
            <label><span>Class *</span><select data-lp-class value={document.classLevel} onChange={e=>{patch({classLevel:e.target.value,section:''});setSelectedSubjects([])}}><option value="">Select class</option>{activeClasses.map(item=><option key={item.level} value={item.level}>{item.name}</option>)}</select></label>
            <label><span>Section</span><select data-lp-section value={document.section} onChange={e=>patch({section:e.target.value})}><option value="">All / default</option>{sectionOptions.map(section=><option key={section} value={section}>{section}</option>)}</select></label>
            <label><span>{document.planningType==='term'?'Term start':'Start date'} *</span><input type="date" value={document.startDate||''} min={sessionStart||undefined} max={sessionEnd||undefined} onChange={e=>patch({startDate:e.target.value,endDate:document.planningType==='daily'?e.target.value:document.endDate})}/></label>
            {document.planningType!=='daily' && <label><span>{document.planningType==='term'?'Term end':'Week end'} *</span><input type="date" value={document.endDate||''} min={document.startDate||undefined} max={sessionEnd||undefined} onChange={e=>patch({endDate:e.target.value})}/></label>}
            <label><span>Academic session</span><input value={document.sessionLabel||''} onChange={e=>patch({sessionLabel:e.target.value})} placeholder="e.g. 2026–27"/></label>
            {document.planningType==='term' && <label><span>Term label</span><input value={document.termLabel||''} onChange={e=>patch({termLabel:e.target.value})} placeholder="First Term / Second Term"/></label>}
            <label><span>Teacher / Coordinator</span><input value={document.teacher||''} onChange={e=>patch({teacher:e.target.value})} placeholder="Auto or teacher name"/></label>
            <label><span>Planning buffer</span><select value={document.bufferRatio} onChange={e=>patch({bufferRatio:Number(e.target.value)})}><option value={0.05}>5% buffer</option><option value={0.1}>10% buffer</option><option value={0.15}>15% buffer</option><option value={0.2}>20% buffer</option></select></label>
          </div>
          <div className="lp-subject-picker"><div><b>Subjects</b><span>{document.planningType==='daily'?'Choose multiple subjects or let timetable generate today’s slots.':'Choose all subjects required in this plan.'}</span></div><div className="lp-chip-grid">{availableSubjects.length?availableSubjects.map(subject=><button key={subject} className={selectedSubjects.includes(subject)?'selected':''} onClick={()=>toggleSubject(subject)}>{selectedSubjects.includes(subject)?'✓ ':''}{subject}</button>):<span className="lp-muted">Select class to load subjects.</span>}</div></div>
          <div className="lp-generate-row"><button data-generate-plan className="generate" onClick={generate} disabled={busy==='generate'}>{busy==='generate'?<RefreshCw className="spin" size={17}/>:<BrainCircuit size={17}/>} Analyze & Generate Plan</button><span>Uses timetable + versioned curriculum + Question Bank metadata. Missing evidence is flagged, never invented.</span></div>
        </section>

        <PlanningAnalysis document={document} ai={aiState}/>

        <section className="lp-plan-area">
          <div className="lp-plan-header"><div><span>{planTypeLabel(document.planningType)} plan</span><h3>{document.classLevel ? `${selectedClass?.name||document.classLevel}${document.section?` — ${document.section}`:''}`:'Select a class'}</h3></div><div>{document.startDate}{document.endDate&&document.endDate!==document.startDate?` → ${document.endDate}`:''}</div></div>
          {document.subjects.length ? document.subjects.map((subject,index)=><SubjectPlanner key={`${subject.subject}-${index}`} subjectPlan={subject} planningType={document.planningType} onChange={next=>updateSubject(index,next)} onRemove={()=>removeSubject(index)}/>) : <div className="lp-empty"><BookOpen size={32}/><b>No subject blocks yet</b><span>Select subjects, use Smart Paste, or Generate Plan.</span></div>}
        </section>
      </main>

      <aside className={showSaved?'':'collapsed'}>
        <button className="lp-saved-toggle" onClick={()=>setShowSaved(v=>!v)}><FileText size={16}/><span>Saved Plans</span>{showSaved?<ChevronDown size={14}/>:<ChevronUp size={14}/>}</button>
        {showSaved && <div className="lp-saved-list">{savedPlans.length?savedPlans.map(plan=>{const normalized=normalizeLessonPlanDocument(plan);return <article key={plan.id}><div><b>{normalized.title||`${planTypeLabel(normalized.planningType)} Plan`}</b><span>{normalized.classLevel}{normalized.section?` · ${normalized.section}`:''} · {normalized.startDate||''}</span><small>{normalized.subjects.map(item=>item.subject).join(', ')||'No subjects'}</small></div><div className="lp-saved-actions"><button onClick={()=>openPlan(plan)}>Open</button><button onClick={()=>duplicate(plan)} title="Duplicate"><Copy size={13}/></button>{plan.id&&<button onClick={()=>share(plan)} title="Share to portal">Share</button>}<button className="danger" onClick={()=>removePlan(plan)} title="Delete"><Trash2 size={13}/></button></div></article>}):<div className="lp-muted">No saved lesson plans yet.</div>}</div>}
      </aside>
    </div>

    {showPaste && <div className="lp-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowPaste(false)}}><div className="lp-modal" data-smart-paste-modal><button className="lp-modal-close" onClick={()=>setShowPaste(false)}><X size={17}/></button><div className="lp-card-title"><WandSparkles size={18}/><span>Smart Paste — whole day / whole plan</span></div><p>Paste multiple subjects at once. Recognized subjects, objectives, activities, assessment, homework and page ranges are mapped into editable blocks. Unrecognized text is preserved for review.</p><textarea value={smartText} onChange={e=>setSmartText(e.target.value)} placeholder={'English\nChapter 1: Reading Skills\nObjectives: ...\nHomework: ...\n\nScience\nChapter 2: Photosynthesis\nActivity: ...'} /><button className="primary wide" onClick={smartArrange} disabled={busy==='parse'}>{busy==='parse'?<RefreshCw className="spin" size={16}/>:<WandSparkles size={16}/>} Arrange into Subjects</button></div></div>}
  </div>
}
