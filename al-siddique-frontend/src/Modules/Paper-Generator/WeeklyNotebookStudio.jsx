import {useEffect,useMemo,useState} from 'react'
import { changeSubjectTypography, normalizeSubjectTypography } from './plannerSubjectTypography.js'
import {BookOpen,CalendarDays,FileInput,Printer,Save,Download} from 'lucide-react'
import api from '../../services/api'
import {getTenantStorageItem,setTenantStorageItem} from '../../services/tenantStorage'
import {currentSchoolDate} from './schoolCalendarDate.js'
import {CLASS_ORDER,LABELS} from './composerReviewDomain'
import {validateLocalComposerSource,normalizeClass} from './composerLocalVerifier'
import {CLASS_INCHARGES} from './lessonWeeklyEngine'
import {termWeeks,notebookModel,planWeekRows} from './weeklyNotebookModel'
import TermPlannerEditor from './TermPlannerEditor'
import {termKey,buildTermOverview,termAssessmentRows,validateTermContent} from './termPlanningModel'
import {listTermServerPlans,saveTermServerPlan} from './termServerPersistence'
import {dailyIdentity,listDailyServerPlans,saveDailyServerPlan} from './dailyServerPersistence'
import {loadPrincipalSourceLibrary,listWeeklyServerPlans,saveWeeklyServerPlan,
 weeklyIdentity} from './weeklyServerPersistence'
import './WeeklyNotebookStudio.css'

const TITLE='AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'
const keyPrefix='assps_second_term_notebook_v1'
const EMPTY_TERM_EDITS=Object.freeze({})
const EMPTY_TERM_ASSESSMENTS=Object.freeze([])
function actorKey(){
 try{
  const user=JSON.parse(localStorage.getItem('al_siddique_user')||sessionStorage.getItem('al_siddique_user')||'{}')
  const actor=user.id||user.user_id||user.email
  return actor?keyPrefix+'_'+String(actor).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64):null
 }catch{return null}
}
const readJson=(key,fallback)=>{
 try{return JSON.parse(getTenantStorageItem(key)||'null')||fallback}catch{return fallback}
}
const studentId=s=>String(s?.id||s?.student_id||s?.gr_number||s?.roll_number||'')
const studentName=s=>String(s?.name||s?.student_name||s?.full_name||[s?.first_name,s?.last_name].filter(Boolean).join(' ')||'Student')
const studentRoll=s=>String(s?.roll_number||s?.roll_no||s?.gr_number||'')
const studentSection=s=>String(s?.section||s?.section_name||'')
const canonicalRosterClass=value=>{
 const key=String(value||'').trim().toLowerCase().replace(/^class\s+/, '').replace(/[ -]/g,'')
 const canonical={playgroup:'Starter',starter:'Starter',mover:'Mover',nursery:'Mover',
  flyer:'Flyer',prep:'Flyer',one:'One',two:'Two',three:'Three',four:'Four',
  five:'Five',six:'Six',seven:'Seven',eight:'Eight',prenine:'Pre-Nine',
  '1':'One','2':'Two','3':'Three','4':'Four','5':'Five','6':'Six','7':'Seven','8':'Eight'}
 return canonical[key]||null
}
const studentClass=s=>s?.class||s?.class_name||s?.classLevel||s?.class_level||''

const chunk=(arr,n)=>Array.from({length:Math.ceil(arr.length/n)},(_,i)=>arr.slice(i*n,(i+1)*n))
const PAGE_OPTIONS=[1,2,3,4,6,8]
const defaultDesign={cardsPerPage:3,fontSize:10,headerSize:13,schoolNameSize:17,subjectNameSize:14,subjectNameBold:true,
 subjectWidth:25,assessmentWidth:55,rowHeight:22,fontFamily:'Times New Roman',
 urduFontFamily:'Jameel Noori Nastaleeq',palette:'navy',zoom:72}
const dateLabel=s=>{if(!s)return '';const d=new Date(s+'T12:00:00Z');return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})}
const originalPageWarning=(rows,count)=>rows.some(x=>x.task.length>105)&&count>3
function saveDownload(data,name){
 const file=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'})
 const url=URL.createObjectURL(file),a=document.createElement('a')
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove()
 window.setTimeout(()=>URL.revokeObjectURL(url),1800)
}
function MixedDirection({text}){
 return String(text||'').split(/(\d+(?:[–-]\d+)?)/).map((piece,i)=>
   /^\d/.test(piece)?<bdi dir="ltr" className="wn-number" key={i}>{piece}</bdi>:<span key={i}>{piece}</span>)
}
function Card({student,rows,klass,section,teacher,week,design,cardIndex,viewMode,dailyDate}){
 const allAssessments=rows.flatMap(r=>(r.assessments||[]).map(a=>({...a,subject:r.subject})))
  .filter((a,i,list)=>list.findIndex(b=>a.date===b.date&&a.subject===b.subject&&a.origin===b.origin)===i)
 const identity=student?studentName(student):'Student Name: ______________________'
 const roll=student?studentRoll(student):'________'
 return <article className="wn-card" data-lesson-student-card
   style={{'--wn-title':design.headerSize+'px',
     '--wn-name-size':design.schoolNameSize+'px',
     '--wn-subject-name-size':normalizeSubjectTypography(design).subjectNameSize+'px',
     '--wn-subject-name-weight':normalizeSubjectTypography(design).subjectNameBold ? 750 : 450,
     '--wn-urdu-font':design.urduFontFamily,
     '--wn-font':design.fontSize+'px','--wn-text-family':design.fontFamily,
     '--wn-subject-width':design.subjectWidth+'%',
     '--wn-assessment-width':design.assessmentWidth+'%',
     '--wn-row-min':design.rowHeight+'px'}}>
   <header className="wn-card-head">
     <img src="/school-logo.svg" alt="ASSPS school crest"/>
     <div><b>{TITLE}</b><small>{viewMode==='daily'?'DAILY LEARNING NOTE':'WEEKLY LEARNING PLAN'} · Al Ilmul Ikhlaq</small></div>
     <div className="wn-card-week">{viewMode==='daily'?'Daily': 'Week '+week.index}
        <small>{viewMode==='daily'?dateLabel(dailyDate):dateLabel(week.start)+' – '+dateLabel(week.end)}</small></div>
   </header>
   <div className="wn-card-identity"><b>{identity}</b><span>Roll: {roll} · {LABELS[klass]||klass}{section?' · '+section:''}</span></div>
   <div className="wn-card-meta">Class in-charge: {teacher} <span>Proposed lesson schedule · Review before teaching</span></div>
   <table className="wn-card-table"><thead><tr><th>SUBJECT</th><th>WEEKLY WORK / سبق</th></tr></thead>
     <tbody>{rows.map(r=><tr key={r.id}>
       <th>{r.subject}</th>
       <td className={/Urdu|Islamiyat|Islamiat|Pakistan Studies|اردو/i.test(r.subject)?'wn-rtl':''}>
         <div dir="auto" className="wn-task"><MixedDirection text={r.task}/></div>
         {viewMode==='daily'&&[
          ['Objectives',r.objectives],['Activity',r.activitiesText],['Homework',r.homework]
         ].filter(([,value])=>value).map(([label,value])=>
          <div className="wn-activity" key={label}><b>{label}:</b>
            <div dir="auto"><MixedDirection text={value}/></div></div>)}
         {(r.activities||[]).map((a,i)=><div className="wn-activity" key={a.date+'-'+i}>
           <b>Application / Activity</b> <bdi dir="ltr">{dateLabel(a.date)}</bdi>
           <small>Proposed teaching date</small>
         </div>)}

       </td>
     </tr>)}</tbody>
   </table>
   <table className="wn-assessment-table" aria-label="Weekly assessments">
     <thead><tr><th>ASSESSMENT</th><th>DATE</th></tr></thead>
     <tbody>{(allAssessments.length?allAssessments:[{date:'',origin:'EMPTY_PROPOSAL'}]).map((a,i)=>
       <tr key={a.subject+'-'+a.date+'-'+i}><th>Assessment {i+1}
         {a.subject&&<small>{a.subject}</small>}</th>
         <td><bdi dir="ltr">{a.date?dateLabel(a.date):'____________'}</bdi>
           {a.date&&a.origin!=='ORIGINAL_SOURCE'&&<small>Proposed</small>}</td></tr>)}</tbody>
   </table>
   <footer><span>Al Ilmul Ikhlaq · Sharif Chowk, Rayya Khas, Narowal</span><span>{cardIndex+1}</span></footer>
 </article>
}

export default function WeeklyNotebookStudio(){
 const [storageKey]=useState(()=>actorKey())
 const [manifest,setManifest]=useState(null)
 const [ready,setReady]=useState(false)
 const [loading,setLoading]=useState(false)
 const [status,setStatus]=useState('')
 const [error,setError]=useState('')
 const [klass,setKlass]=useState('Starter')
 const [viewMode,setViewMode]=useState('weekly')
 const [termName,setTermName]=useState('Second Term')
 const [termDrafts,setTermDrafts]=useState({})
 const [termServerPlans,setTermServerPlans]=useState([])
 const [currentTermServerId,setCurrentTermServerId]=useState(null)
 const [termSaving,setTermSaving]=useState(false)
 const [termStatus,setTermStatus]=useState('')
 const [termCacheReady,setTermCacheReady]=useState(false)
 const [termDraftSource,setTermDraftSource]=useState('')
 const [dailyDate,setDailyDate]=useState(()=>currentSchoolDate())
 const [section,setSection]=useState('')
 const [start,setStart]=useState('2026-10-15')
 const [end,setEnd]=useState('2027-02-15')
 const [weekIndex,setWeekIndex]=useState(0)
 const [chosenSubjects,setChosenSubjects]=useState(null)
 const [remotePlans,setRemotePlans]=useState([])
 const [dailyServerPlans,setDailyServerPlans]=useState([])
 const [dailySavedId,setDailySavedId]=useState(null)
 const [dailySaving,setDailySaving]=useState(false)
 const [dailyNotesByKey,setDailyNotesByKey]=useState({})
 const [dailyDetailsByKey,setDailyDetailsByKey]=useState({})
 const [currentServerId,setCurrentServerId]=useState(null)
 const [remoteError,setRemoteError]=useState('')
 const [savingToServer,setSavingToServer]=useState(false)
 const [sourceLoading,setSourceLoading]=useState(false)
 const [students,setStudents]=useState([])
 const [rosterScope,setRosterScope]=useState('')
 const [chosenStudents,setChosenStudents]=useState(null)
 const [rosterLoading,setRosterLoading]=useState('')
 const [search,setSearch]=useState('')
 const [design,setDesign]=useState(defaultDesign)
 const [plans,setPlans]=useState(()=>actorKey()?readJson(actorKey()+'_plans',{}):{})
 const [edits,setEdits]=useState({})
 const [extraAssessments,setExtraAssessments]=useState({})
 const [assessmentInput,setAssessmentInput]=useState({subject:'',date:''})
 const weeks=useMemo(()=>{
  const sourceWeeks=klass==='One'?manifest?.class_one_image_review?.weeks:null
  return Array.isArray(sourceWeeks)&&sourceWeeks.length===18?
   sourceWeeks.map(x=>({start:x.start,end:x.end,index:x.week})):termWeeks(start,end)
 },[start,end,klass,manifest])
 const activeWeek=weeks[Math.min(weekIndex,weeks.length-1)]||null
 const groups=useMemo(()=>CLASS_ORDER.filter(cls=>manifest?.candidates?.some(c=>normalizeClass(c.proposed_class_level)===cls)),[manifest])
 const candidates=useMemo(()=>manifest?.candidates?.filter(c=>normalizeClass(c.proposed_class_level)===klass)||[],[manifest,klass])
 const subjectIds=candidates.map(c=>c.candidate_key)
 const includedIds=chosenSubjects===null?subjectIds:chosenSubjects
 const planKey=activeWeek?klass+'|'+section+'|'+activeWeek.start:''
 const rows=useMemo(()=>{
  if(!activeWeek)return []
  const original=notebookModel({candidates,klass,week:activeWeek,
   options:{start,end,imageReview:manifest?.class_one_image_review},edits,subjects:includedIds})
  return original.map(r=>({...r,assessments:[
   ...r.assessments,...(extraAssessments[r.id]||[])
  ].filter((a,i,list)=>list.findIndex(x=>x.date===a.date&&x.origin===a.origin)===i)}))
 },[candidates,klass,activeWeek,start,end,manifest,edits,includedIds,extraAssessments])
 const effectiveDailyDate=dailyDate
 const activeDailyKey=dailyIdentity(klass,section,effectiveDailyDate)
 const dayNotes=dailyNotesByKey[activeDailyKey]||{}
 const dayDetails=dailyDetailsByKey[activeDailyKey]||{}
 const activeRows=viewMode==='daily'?rows.map(row=>({
  ...row,task:Object.prototype.hasOwnProperty.call(dayNotes,row.id)?dayNotes[row.id]:row.task,
  objectives:dayDetails[row.id]?.objectives||'',
  activitiesText:dayDetails[row.id]?.activities||'',
  homework:dayDetails[row.id]?.homework||'',
  assessments:dayDetails[row.id]?.assessment?[
   {date:effectiveDailyDate,label:dayDetails[row.id].assessment,origin:'MANUAL_PROPOSAL'}
  ]:[]
 })):rows
 const activeTermKey=termKey(klass,section,termName,start)
 const termEdits=(termDraftSource===manifest?.source_zip_sha256?termDrafts[activeTermKey]?.edits:null)||EMPTY_TERM_EDITS
 const termManualAssessments=(termDraftSource===manifest?.source_zip_sha256?termDrafts[activeTermKey]?.assessments:null)||EMPTY_TERM_ASSESSMENTS
 const termRows=useMemo(()=>{
   if(!manifest)return []
   try{return buildTermOverview(candidates,{
     start,end,term:termName,imageReview:manifest?.class_one_image_review,edits:termEdits
   })}catch{return []}
 },[candidates,start,end,termName,manifest,termEdits])
 const termAssessments=useMemo(()=>termAssessmentRows(termRows,termManualAssessments),
   [termRows,termManualAssessments])
 const teacher=CLASS_INCHARGES[klass]?.join(' & ')||'Class in-charge to be verified'
 const activeRoster=rosterScope===klass+'|'+section?students:[]
 const selectedStudents=activeRoster.filter(st=>chosenStudents===null||chosenStudents.includes(studentId(st)))
 const searchStudents=activeRoster.filter(st=>(studentName(st)+' '+studentRoll(st)).toLowerCase().includes(search.toLowerCase()))
 const printableStudents=activeRoster.length&&!selectedStudents.length?[]:(selectedStudents.length?selectedStudents:[null])
 const pages=chunk(printableStudents,Number(design.cardsPerPage))
 const warnings=planWeekRows(candidates,klass,activeWeek||{start:'',end:''},
   {start,end,imageReview:manifest?.class_one_image_review}).sourceMeta
  .flatMap(x=>x.warnings.map(message=>({id:x.id,message}))).slice(0,20)
 const patchDesign=(name,value)=>setDesign(d=>({...d,[name]:value}))
 const persistSource=async raw=>{
  const parsed=JSON.parse(raw)
  const proof=await validateLocalComposerSource(parsed)
  setManifest(parsed);setReady(true)
  if(storageKey){
   const storage=setTenantStorageItem(storageKey+'_source',JSON.stringify(parsed))
   setStatus(storage==='local'?'Original verified source remembered for this school account on this device.':'Source retained only for this browser session. Export your copy.')
  }else setStatus('Verified source is open for this session only; authenticated user identity is required to remember it.')
  return proof
 }
 useEffect(()=>{
  let live=true
  if(!storageKey){queueMicrotask(()=>setReady(true));return()=>{live=false}}
  const raw=getTenantStorageItem(storageKey+'_source')
  if(!raw){queueMicrotask(()=>{if(live)setReady(true)});return()=>{live=false}}
  Promise.resolve().then(()=>validateLocalComposerSource(JSON.parse(raw)))
   .then(()=>{if(live){setManifest(JSON.parse(raw));setStatus('Stored original source automatically reopened and reverified.')}})
   .catch(()=>{if(live)setError('Saved source was not trusted. Reimport the approved original JSON.')})
   .finally(()=>{if(live)setReady(true)})
  return()=>{live=false}
 },[storageKey])
 useEffect(()=>{
  if(!manifest||!storageKey)return
  let live=true
  const cacheKey=storageKey+'_term_drafts_v1_'+manifest.source_zip_sha256.slice(0,16)
  const cached=readJson(cacheKey,null)
  queueMicrotask(()=>{
    if(!live)return
    setTermDrafts(cached?.sourceZipSha256===manifest.source_zip_sha256 &&
      cached.drafts && typeof cached.drafts==='object' && !Array.isArray(cached.drafts)?
        cached.drafts:{})
    setTermDraftSource(manifest.source_zip_sha256)
    setTermCacheReady(true)
  })
  return()=>{live=false}
 },[manifest,storageKey])
 useEffect(()=>{
  if(!manifest||!storageKey||!termCacheReady||
     termDraftSource!==manifest.source_zip_sha256||!Object.keys(termDrafts).length)return
  setTenantStorageItem(
    storageKey+'_term_drafts_v1_'+manifest.source_zip_sha256.slice(0,16),
    JSON.stringify({sourceZipSha256:manifest.source_zip_sha256,drafts:termDrafts}))
 },[manifest,storageKey,termCacheReady,termDraftSource,termDrafts])
 useEffect(()=>{
  let live=true
  Promise.resolve().then(()=>listTermServerPlans()).then(data=>{
    if(live)setTermServerPlans(data)
  }).catch(()=>{if(live)setTermStatus('Term server list unavailable; no term changes were made.')})
  Promise.resolve().then(()=>listWeeklyServerPlans()).then(data=>{
    if(live){setRemotePlans(data);setRemoteError('')}
  }).catch(()=>{if(live)setRemoteError('Saved school plans could not be loaded. No server write was attempted.')})
  Promise.resolve().then(()=>listDailyServerPlans()).then(data=>{
    if(live)setDailyServerPlans(data)
  }).catch(()=>{if(live)setRemoteError('Saved Days unavailable; no daily record changed.')})
  queueMicrotask(()=>{if(live)setSourceLoading(true)})
  loadPrincipalSourceLibrary().then(async bundle=>{
    const proof=await validateLocalComposerSource(bundle)
    if(live&&proof.verified){
      setManifest(bundle)
      setStatus('Original source library automatically loaded: 59 subjects, 12 classes, Class One 18-week review.')
    }
  }).catch(()=>{}).finally(()=>{if(live)setSourceLoading(false)})
  return()=>{live=false}
 },[])
 useEffect(()=>{
  if(!manifest)return
  let alive=true
  queueMicrotask(()=>{if(alive)setRosterLoading('Loading current authorized class roster...')})
  // Exact database class scope, not the UI's decorated 'Class Four' label.
  // A conflicting or absent class field is NOT adequate to print named slips.
  const current=klass==='Pre-Nine'?'Pre Nine':klass
  api.get('/api/students',{params:{class:current},skipCache:true})
   .then(response=>{
    if(!alive)return
    const list=Array.isArray(response.data?.data)?response.data.data:
      Array.isArray(response.data)?response.data:[]
    const filtered=list.filter(st=>studentId(st)&&canonicalRosterClass(studentClass(st))===klass &&
      (!section||studentSection(st).toLowerCase()===section.toLowerCase()))
    const rejected=list.length-filtered.length
    if(rejected)setRosterLoading('Excluded '+rejected+' roster entries without exact class/section match; '+filtered.length+' authorized students loaded.')
    setStudents(filtered)
    setRosterScope(klass+'|'+section)
    if(!rejected)setRosterLoading(filtered.length+' authorized students loaded')
    setChosenStudents(null)
   }).catch(()=>{if(alive){setStudents([]);setRosterLoading('Roster not available. Blank template only.')}})
  return()=>{alive=false}
 },[manifest,klass,section])
 useEffect(()=>{
  const saved=plans[planKey]||{}
  // A saved plan always reopens by exact class/section/week; student roster
  // is intentionally NOT stored inside these browser drafts.
  queueMicrotask(()=>{
   setEdits(saved.edits||{})
   setExtraAssessments(saved.extraAssessments||{})
  })
 },[planKey,plans])
 async function importFile(e){
  const file=e.target.files?.[0]
  if(!file)return
  setLoading(true);setError('')
  try{
   if(file.size>2*1024*1024)throw Error('File exceeds 2 MB')
   const proof=await persistSource(await file.text())
   setStatus('59 source groups verified in '+proof.classes+' classes. '+
    (proof.classOneImage?.available?'Class One 18-week image source transcript ready for review. ':'')+
    'Original evidence preserved. '+(storageKey?'Source remembered on this device.':''))
  }catch(ex){setError(ex.message||'Failed to verify original WhatsApp source')}
  finally{setLoading(false);e.target.value=''}
 }
 function selectClass(next){
  setKlass(next);setChosenSubjects(null);setWeekIndex(0);setCurrentServerId(null);setSearch('');setSection('');setStudents([]);setRosterScope('')
 }
 async function saveCurrent(){
  if(!manifest||!activeWeek||!rows.length){
    setError('Original verified source and at least one subject are required for saving.');return
  }
  setSavingToServer(true);setError('')
  try{
    const key=weeklyIdentity(klass,section,activeWeek.start)
    const existing=remotePlans.find(plan=>plan.id===currentServerId&&plan.provenance?.weeklyKey===key)
    const saved=await saveWeeklyServerPlan({klass,section,week:activeWeek,
      rows,teacherLabel:teacher,sourceZipSha256:manifest.source_zip_sha256,existing,design})
    if(!saved?.id)throw Error('School server did not return a saved plan ID')
    setCurrentServerId(saved.id)
    const latest=await listWeeklyServerPlans()
    setRemotePlans(latest)
    // Local cache is a fallback for this device, never a second publication.
    const newRecord={classLevel:klass,section,weekStart:activeWeek.start,weekEnd:activeWeek.end,
      savedAt:new Date().toISOString(),edits,extraAssessments,design,
      sourceZipSha256:manifest.source_zip_sha256,serverId:saved.id,serverRevision:saved.serverRevision||saved.revision}
    if(storageKey){
      const updated={...plans,[planKey]:newRecord}
      setTenantStorageItem(storageKey+'_plans',JSON.stringify(updated))
      setPlans(updated)
    }
    setStatus('Saved to the authenticated school server. Open the class/week under Server Saved Weeks.')
  }catch(ex){
    setError('Server save FAILED; nothing published. '+(ex?.response?.data?.message||ex.message||'Please retry.'))
  }finally{setSavingToServer(false)}
 }
 async function saveDaily(){
  if(!manifest?.source_zip_sha256||!activeRows.length||
   !weeks.some(w=>effectiveDailyDate>=w.start&&effectiveDailyDate<=w.end)){
   setError('Verified source, school-calendar date and at least one subject required before Save Day.');return
  }
  setDailySaving(true);setError('')
  try{
   const existing=dailyServerPlans.find(doc=>doc.id===dailySavedId &&
      doc.provenance?.dailyKey===activeDailyKey)
   const saved=await saveDailyServerPlan({
    klass,section,date:effectiveDailyDate,rows:activeRows,teacherLabel:teacher,
    sourceZipSha256:manifest.source_zip_sha256,existing,design
   })
   if(!saved?.id)throw Error('School server returned no Daily Plan ID')
   setDailySavedId(saved.id)
   setDailyServerPlans(await listDailyServerPlans())
   setStatus('Saved Day as private school-server draft. Reopen from Saved Days.')
  }catch(ex){
   setError('Save Day FAILED; no weekly plan or Daily Diary overwritten. '+
     (ex?.response?.data?.message||ex.message||'Retry without changing source data.'))
  }finally{setDailySaving(false)}
 }
 function openSavedDay(doc){
  if(!doc?.id||doc.provenance?.academicPublication!=='BLOCKED'||
   doc.provenance?.sourceZipSha256!==manifest?.source_zip_sha256){
   setError('Saved Daily Plan source differs from verified current source.');return
  }
  if(!CLASS_ORDER.includes(doc.classLevel)||
     !doc.startDate||doc.startDate!==doc.endDate){
   setError('Saved Daily Plan class/date invalid.');return
  }
  const applicable=weeks.findIndex(w=>doc.startDate>=w.start&&doc.startDate<=w.end)
  if(doc.classLevel!==klass||applicable<0||doc.section!==(section||'')){
   setError('Select saved Day class, section and applicable term week first.');return
  }
  setWeekIndex(applicable);setDailyDate(doc.startDate)
  const identity=dailyIdentity(doc.classLevel,doc.section,doc.startDate)
  setDailyNotesByKey(old=>({...old,[identity]:doc.provenance.dailyStatementById||{}}))
  setDailyDetailsByKey(old=>({...old,[identity]:doc.provenance.dailyDetailsById||{}}))
  setDesign({...defaultDesign,...(doc.layoutSettings||{})})
  setDailySavedId(doc.id);setViewMode('daily')
  setStatus('Saved Day reopened privately at revision '+doc.serverRevision+'.')
 }
 function openServerPlan(plan){
  const doc=plan
  setCurrentServerId(plan.id)
  const nextClass=doc.classLevel
  if(!CLASS_ORDER.includes(nextClass)){
    setError('Saved plan has an unrecognized class.');return
  }
  const nextSection=doc.section||''
  const nextWeekStart=doc.startDate
  const nextEdits={}
  const nextExtra={}
  for(const subject of doc.subjects||[]){
    const key=(manifest?.candidates||[]).find(c=>normalizeClass(c.proposed_class_level)===nextClass &&
      c.source_subject_label===subject.subject)?.candidate_key
    if(!key)continue
    const lesson=subject.lessons?.[0]
    if(doc.provenance?.fullWeeklyStatements?.[key]!==undefined)
      nextEdits[key]=doc.provenance.fullWeeklyStatements[key]
    else if(lesson?.homework||lesson?.title)nextEdits[key]=lesson.homework||lesson.title
    if(lesson?.assessment)nextExtra[key]=lesson.assessment.split('; ').map(item=>{
      const [d]=item.split(' ')
      return {date:d,label:'Assessment / جائزہ',origin:'SERVER_SAVED_DRAFT'}
    }).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date))
  }
  const id=nextClass+'|'+nextSection+'|'+nextWeekStart
  const updated={...plans,[id]:{classLevel:nextClass,section:nextSection,
    weekStart:nextWeekStart,weekEnd:doc.endDate,edits:nextEdits,extraAssessments:nextExtra}}
  setPlans(updated)
  setKlass(nextClass);setSection(nextSection)
  setWeekIndex(Math.max(0,weeks.findIndex(w=>w.start===nextWeekStart)))
  setEdits(nextEdits);setExtraAssessments(nextExtra)
  setDesign({...defaultDesign,...(doc.layoutSettings||{})})
  setStatus('Verified server-saved class/week reopened. Original academic approval remains pending.')
  setError('')
 }
 function openPlan(k){
  const saved=plans[k]
  if(!saved)return
  setKlass(saved.classLevel);setSection(saved.section||'')
  setWeekIndex(Math.max(0,weeks.findIndex(w=>w.start===saved.weekStart)))
  setEdits(saved.edits||{});setExtraAssessments(saved.extraAssessments||{})
  setDesign({...defaultDesign,...(saved.design||{})})
  setStatus('Saved class/week plan reopened on this device. Not yet shared to the school server.')
 }

 function addAssessment(){
  if(!assessmentInput.subject||!assessmentInput.date||!activeWeek)return
  if(assessmentInput.date<activeWeek.start||assessmentInput.date>activeWeek.end){
    setError('Assessment date must be inside the selected teaching week.');return
  }
  if(new Date(assessmentInput.date+'T00:00:00Z').getUTCDay()===0){
    setError('Sunday is the school holiday. Select the preceding teaching day.');return
  }
  const event={date:assessmentInput.date,label:'Assessment / جائزہ',origin:'MANUAL_PROPOSAL'}
  setExtraAssessments(prev=>({...prev,
   [assessmentInput.subject]:[...(prev[assessmentInput.subject]||[]),event]
  }))
  setStatus('Assessment added as an unapproved manual proposal.')
  setError('')
 }
 function printCards(){
  if(klass==='One'&&!manifest?.class_one_image_review){setError('Class One requires the verified original 18-week image transcript. Open the updated school source JSON first.');return}
  if(!activeRows.length){setError('Select subjects for this lesson plan before printing.');return}
  if(activeRoster.length&&!selectedStudents.length){setError('Select at least one student before printing.');return}
  const copy=document.getElementById('wn-print-pages')
  if(!copy)return
  const overflow=[...copy.querySelectorAll('.wn-card')].some(card=>card.scrollHeight>card.clientHeight+3)
  if(overflow){
    setError('Some student cards are too long for this A4 layout. Reduce cards per page, reduce text size or shorten statements before printing.')
    return
  }
  const popup=window.open('','_blank','width=1150,height=870')
  if(!popup){setError('Allow popups for this school site to print.');return}
  const styleLinks=[...document.querySelectorAll('link[rel="stylesheet"]')]
   .map(node=>'<link rel="stylesheet" href="'+node.href+'">').join('')
  popup.document.open()
  popup.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>ASSPS Weekly Learning Plan</title>'+
   styleLinks+[...document.querySelectorAll('style')].map(node=>node.outerHTML).join('')+'<style>@page{size:A4;margin:4mm}body{margin:0;background:white} .wn-print-pages{display:block!important} .wn-paper{box-shadow:none!important;break-after:page;page-break-after:always}</style></head><body>'+
   '<div class="wn-print-pages">'+copy.innerHTML+'</div></body></html>')
  popup.document.close()
  popup.addEventListener('load',()=>{popup.document.fonts.ready.then(()=>popup.print()).catch(()=>popup.print())},{once:true})
  setStatus('Printable lesson cards opened. Check A4 scaling and Urdu fonts before printing.')
 }
 if(!ready)return <p>Checking verified source availability...</p>
 function updateTermDraft(patch){
   setTermDrafts(old=>({...old,[activeTermKey]:{
     ...(old[activeTermKey]||{}),...patch(old[activeTermKey]||{})
   }}))
 }
 function changeTermRow(id,values){
   updateTermDraft(d=>({edits:{...(d.edits||{}),
     [id]:{...(d.edits?.[id]||{}),...values}}}))
 }
 function changeTermAssessment(id,date){
   const current=termAssessments.find(a=>a.id===id)
   if(!current)return
   const amended={...current,date,
     origin:date===current.originalDate&&current.origin==='ORIGINAL_SOURCE'?
       'ORIGINAL_SOURCE':'MANUAL_PROPOSAL'}
   updateTermDraft(d=>({assessments:[
     ...(d.assessments||[]).filter(x=>x.id!==id),amended
   ]}))
 }
 function removeTermAssessment(id){
   updateTermDraft(d=>({assessments:(d.assessments||[]).filter(a=>a.id!==id)}))
 }
 function addTermAssessment(){
   updateTermDraft(d=>({assessments:[...(d.assessments||[]),{
     id:'manual-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
     date:'',name:'Assessment',subject:'',origin:'MANUAL_PROPOSAL'
   }]}))
 }
 async function saveTerm(){
   if(!manifest?.source_zip_sha256){
     setError('A verified original source is required for a term draft.');return
   }
   setTermSaving(true);setError('')
   try{
     validateTermContent({klass,start,end,rows:termRows,assessments:termAssessments})
     const existing=termServerPlans.find(p=>p.id===currentTermServerId &&
       p.provenance?.termKey===activeTermKey)
     const result=await saveTermServerPlan({klass,section,term:termName,
       start,end,rows:termRows,assessments:termAssessments,design,
       sourceZipSha256:manifest.source_zip_sha256,existing})
     if(!result?.id)throw Error('School server did not return a saved term plan ID')
     setCurrentTermServerId(result.id)
     setTermServerPlans(await listTermServerPlans())
     setTermStatus('Saved term draft to the school server (not published).')
   }catch(ex){
     setError('Term save FAILED. No publication or overwrite. '+
       (ex?.response?.data?.message||ex.message||'Reopen the latest revision.'))
   }finally{setTermSaving(false)}
 }
 function openSavedTerm(doc){
   if(doc?.provenance?.marker!=='ASSPS_TERM_NOTEBOOK_V1' ||
      doc?.provenance?.academicPublication!=='BLOCKED' ||
      !manifest?.source_zip_sha256 ||
      doc?.provenance?.sourceZipSha256!==manifest.source_zip_sha256){
     setError('Saved term source revision differs from the verified current original. Open blocked.');return
   }
   const sourceIds=new Set((manifest.candidates||[])
     .filter(c=>normalizeClass(c.proposed_class_level)===doc.classLevel)
     .map(c=>c.candidate_key))
   if((doc.termCoverageRows||[]).some(r=>!sourceIds.has(r.id))){
     setError('Saved term has subject identities absent from current source. Review before reopening.');return
   }
   const key=termKey(doc.classLevel,doc.section,doc.termLabel,doc.startDate)
   setTermDrafts(old=>({...old,[key]:{
     edits:Object.fromEntries((doc.termCoverageRows||[]).map(r=>[
       r.id,{detail:r.detail,pageFrom:r.pageFrom,pageTo:r.pageTo}])),
     assessments:(doc.assessments||[]).filter(a=>a.origin!=='EMPTY_PROPOSAL')
   }}))
   setKlass(doc.classLevel);setSection(doc.section||'')
   setTermName(doc.termLabel);setStart(doc.startDate);setEnd(doc.endDate)
   setDesign({...defaultDesign,...(doc.layoutSettings||{})})
   setCurrentTermServerId(doc.id)
   setViewMode('term')
   setTermStatus('Saved term reopened at revision '+doc.serverRevision+' (private draft).')
   setError('')
 }
 function printTerm(){
   try{validateTermContent({klass,start,end,rows:termRows,assessments:termAssessments})}
   catch(ex){setError(ex.message);return}
   const copy=document.getElementById('wn-term-print')
   if(!copy){setError('Term print document is not mounted.');return}
   const popup=window.open('','_blank','width=1150,height=900')
   if(!popup){setError('Allow popups to print the term plan.');return}
   const styleLinks=[...document.querySelectorAll('link[rel="stylesheet"]')]
     .map(node=>'<link rel="stylesheet" href="'+node.href+'">').join('')
   popup.document.open()
   popup.document.write('<!doctype html><html><head><meta charset="utf-8"><title>ASSPS Term Syllabus</title>'+
     styleLinks+'<style>@page{size:A4;margin:10mm}body{background:white;margin:0}'+
     '.term-print-document{box-shadow:none;width:auto;min-height:0;padding:0}'+
     '.term-print-document thead{display:table-header-group}'+
     '.term-print-document tr{break-inside:avoid;page-break-inside:avoid}'+
     '</style></head><body>'+copy.outerHTML+'</body></html>')
   popup.document.close()
   popup.addEventListener('load',()=>{
     popup.document.fonts.ready.then(()=>popup.print()).catch(()=>popup.print())
   },{once:true})
   setTermStatus('Print preview opened. Verify page breaks and Urdu font before physical print.')
 }
 return <section className="wn-studio" data-weekly-notebook-studio>
  <header className="wn-heading">
   <div><span className="wn-eyebrow">ASSPS · LESSON NOTEBOOK STUDIO</span><h3>Weekly Lesson Planning</h3>
    <p>Term syllabus → verified calendar weeks → editable subject work → personalized notebook slips.</p></div>
   <span className="wn-private">PRIVATE REVIEW · NOT PUBLISHED</span>
  </header>
  {error&&<p className="wn-error" role="alert">{error}</p>}
  {status&&<p className="wn-info" role="status">{status}</p>}
  {!manifest?<div className="wn-firstimport">
    <BookOpen size={24}/><strong>Open the verified 59-subject original source once</strong>
    <p>The Principal's original 59-subject school archive loads automatically when the verified account is authorized. File import remains available as a private fallback.</p>
    {sourceLoading&&<p role="status">Checking the Principal's private school source library...</p>}
    <label className="wn-file">Choose Private Original JSON
      <input type="file" accept=".json,application/json" disabled={loading} onChange={importFile}/>
    </label>
   </div>:<>
   {klass==='One'&&!manifest?.class_one_image_review&&<p className="wn-error" role="alert">Class One needs the verified 18-week image source file. Replace the original JSON with the updated 59-group + Class One file; no invented Class One weekly lessons will be printed.</p>}
   <nav className="wn-stage-switch" aria-label="Term weekly daily lesson views">
    <button className={viewMode==='term'?'selected':''} onClick={()=>setViewMode('term')}>1. Term Syllabus</button>
    <button className={viewMode==='weekly'?'selected':''} onClick={()=>setViewMode('weekly')}>2. Weekly Plan</button>
    <button className={viewMode==='daily'?'selected':''}
      onClick={()=>{setViewMode('daily');const i=weeks.findIndex(w=>dailyDate>=w.start&&dailyDate<=w.end);if(i>=0)setWeekIndex(i)}}>
      3. Daily Lesson Plan</button>
   </nav>
   <div className="wn-topbar">
    <label>Class<select data-wn-class value={klass} onChange={e=>selectClass(e.target.value)}>
      {groups.map(c=><option key={c} value={c}>{LABELS[c]||'Class '+c}</option>)}
    </select></label>
    <label>Section<input data-wn-section value={section} onChange={e=>{setSection(e.target.value);setCurrentServerId(null);setRosterScope('')}} placeholder="All / Section"/></label>
    <label>Term begins<input type="date" value={start} onChange={e=>{setStart(e.target.value);setWeekIndex(0);setCurrentServerId(null)}}/></label>
    <label>Term ends<input type="date" value={end} min={start} onChange={e=>{setEnd(e.target.value);setWeekIndex(0);setCurrentServerId(null)}}/></label>
    {viewMode==='weekly'&&<label>Week<select data-wn-week value={Math.min(weekIndex,Math.max(0,weeks.length-1))}
      onChange={e=>{setWeekIndex(Number(e.target.value));setCurrentServerId(null)}}>
      {weeks.map((w,i)=><option value={i} key={w.start}>Week {w.index} · {dateLabel(w.start)}–{dateLabel(w.end)}</option>)}
    </select></label>}
   </div>
   {viewMode==='daily'&&<label className="wn-daily-date">Daily lesson date
      <input type="date" min={start} max={end}
       value={effectiveDailyDate}
       onChange={e=>{const d=e.target.value;setDailyDate(d);setDailySavedId(null);
        const i=weeks.findIndex(w=>d>=w.start&&d<=w.end);
        if(i>=0)setWeekIndex(i)}}/>
      <small>Daily statements are editable weekly-derived proposals until teacher confirmation.</small>
   </label>}
   {viewMode==='term'&&<TermPlannerEditor
     klass={klass} section={section} term={termName} start={start} end={end} setTerm={next=>{setTermName(next);setCurrentTermServerId(null)}}
     rows={termRows} onChangeRow={changeTermRow}
     assessments={termAssessments} onChangeAssessment={changeTermAssessment}
     onRemoveAssessment={removeTermAssessment}
     onAddAssessment={addTermAssessment} design={design}
     onChangeDesign={patchDesign} onResetDesign={()=>setDesign(defaultDesign)}
     onSave={saveTerm} onPrint={printTerm} saving={termSaving}
     savedPlans={termServerPlans.filter(p=>p.classLevel===klass)}
     onOpenSaved={openSavedTerm} status={termStatus}/>}
   {viewMode!=='term'&&<>
   <div className="wn-actions">
    <button onClick={viewMode==='daily'?saveDaily:saveCurrent}
      disabled={(viewMode==='daily'?dailySaving:savingToServer)||!activeRows.length}><Save size={15}/>
       {viewMode==='daily'?(dailySaving?'Saving Day...':'Save Day to School Server'):
        (savingToServer?'Saving to School Server...':'Save Week to School Server')}</button>
    <button onClick={()=>saveDownload({schema:'assps.weekly_learning_plan.private.v1',
      sourceZipSha256:manifest.source_zip_sha256,classLevel:klass,section,
      week:activeWeek,edits,extraAssessments},'ASSPS-'+klass+'-week-'+(activeWeek?.index||1)+'.json')}>
      <Download size={15}/> Download Backup
    </button>
    <button className="primary" onClick={printCards}><Printer size={15}/> Print Selected Students</button>
    <label className="wn-file wn-sm-file"><FileInput size={14}/> Replace Verified Source
      <input type="file" accept=".json,application/json" disabled={loading} onChange={importFile}/>
    </label>
   </div>
   <div className="wn-body">
    <aside className="wn-controls">
      <section className="wn-panel"><h4>Subjects <small>{includedIds.length} selected</small></h4>
       <div className="wn-inline-actions">
        <button onClick={()=>setChosenSubjects(null)}>All</button>
        <button onClick={()=>setChosenSubjects([])}>None</button>
       </div>
       <div className="wn-subjects">
         {candidates.map(c=><label key={c.candidate_key}>
           <input type="checkbox" checked={includedIds.includes(c.candidate_key)}
             onChange={e=>setChosenSubjects(old=>{
               const ids=old===null?subjectIds:old
               return e.target.checked?[...new Set([...ids,c.candidate_key])]:ids.filter(x=>x!==c.candidate_key)
             })}/>
           <span>{c.source_subject_label}</span>
         </label>)}
       </div>
       {klass==='One'&&manifest?.class_one_image_review&&
     <p className="wn-hint">Original 18-week image timetable: provisional visual transcription, not academic approval. Week dates are preserved exactly.</p>}
    <p className="wn-hint">Class in-charge (Principal-provided): <b>{teacher}</b>. This does not grant teacher account access.</p>
      </section>
      <section className="wn-panel"><h4>{viewMode==='daily'?'Daily lesson statements':'Weekly teaching statements'}</h4>
       <p className="wn-hint">Short, editable notes. Source-derived / proposed dates stay separate.</p>
       {activeRows.map(row=><div className="wn-editline" key={row.id}>
         <label>{row.subject} <small>{row.sourceStatus}</small></label>
         <textarea dir="auto" rows={2} maxLength={6000} value={row.task}
           onChange={e=>viewMode==='daily'?
            setDailyNotesByKey(old=>({...old,[activeDailyKey]:{
             ...(old[activeDailyKey]||{}),[row.id]:e.target.value}})):
            setEdits(old=>({...old,[row.id]:e.target.value}))}/>
         {viewMode==='daily'&&<div className="wn-daily-teaching-details">
          {[
            ['objectives','Learning objectives'],['activities','Teacher activities / resources'],
            ['homework','Homework / follow-up'],['assessment','Daily assessment (optional)']
           ].map(([field,label])=><label key={field}>{label} · {row.subject}
             <textarea rows={2} maxLength={900} aria-label={label+' '+row.subject}
               value={dayDetails[row.id]?.[field]||''}
               onChange={e=>setDailyDetailsByKey(old=>({...old,
                 [activeDailyKey]:{...(old[activeDailyKey]||{}),
                  [row.id]:{...(old[activeDailyKey]?.[row.id]||{}),[field]:e.target.value}}
                }))}/>
            </label>)}
         </div>}
         {row.assessments.map(a=><p className="wn-assess-chip" key={a.date+a.origin}>
           Assessment: <bdi dir="ltr">{dateLabel(a.date)}</bdi> · {a.origin==='ORIGINAL_SOURCE'?'source':'proposed'}
         </p>)}
         {row.flags.map(f=><small key={f} className="wn-warning">{f}</small>)}
       </div>)}
       {!rows.length&&<p className="wn-hint">Select at least one subject to create a weekly plan.</p>}
      </section>
      {viewMode==='weekly'&&<section className="wn-panel"><h4>Assessment planner</h4>
       <p className="wn-hint">Original assessment dates appear automatically. Add only proposed assessments here.</p>
       <select value={assessmentInput.subject} onChange={e=>setAssessmentInput(x=>({...x,subject:e.target.value}))}>
        <option value="">Choose subject</option>
        {rows.map(row=><option key={row.id} value={row.id}>{row.subject}</option>)}
       </select>
       <input type="date" min={activeWeek?.start} max={activeWeek?.end}
         value={assessmentInput.date} onChange={e=>setAssessmentInput(x=>({...x,date:e.target.value}))}/>
       <button onClick={addAssessment}>+ Propose Assessment Date</button>
      </section>}

      <section className="wn-panel">
       <h4>Student roster <small>{selectedStudents.length} selected</small></h4>
       <p className="wn-hint">{rosterLoading||'School roster is read-only. Names are never stored in lesson draft files.'}</p>
       <input placeholder="Search student / roll" value={search} onChange={e=>setSearch(e.target.value)}/>
       <div className="wn-inline-actions"><button onClick={()=>setChosenStudents(null)}>Select all</button>
         <button onClick={()=>setChosenStudents([])}>Clear</button></div>
       <div className="wn-student-list">
        {searchStudents.map(st=><label key={studentId(st)}>
          <input type="checkbox" checked={chosenStudents===null||chosenStudents.includes(studentId(st))}
            onChange={e=>setChosenStudents(current=>{
             const all=current===null?activeRoster.map(studentId):current
             return e.target.checked?[...new Set([...all,studentId(st)])]:all.filter(id=>id!==studentId(st))
            })}/>
          <span>{studentName(st)}</span><small>{studentRoll(st)||'—'}</small>
        </label>)}
       </div>
       {!activeRoster.length&&<p className="wn-hint">No authenticated roster available: only a blank, non-personalized template will print.</p>}
      </section>
      <section className="wn-panel"><h4>A4 layout & typography</h4>
       <label>Student cards / page<select value={design.cardsPerPage} onChange={e=>patchDesign('cardsPerPage',Number(e.target.value))}>
        {PAGE_OPTIONS.map(x=><option key={x} value={x}>{x} {x===1?'large':x===2?'standard':x===3?'recommended':''}</option>)}
       </select></label>
       <label>Visual style<select value={design.palette} onChange={e=>patchDesign('palette',e.target.value)}>
         <option value="navy">Navy signature · low ink</option>
         <option value="teal">Ferozi academic · low ink</option>
         <option value="silver">Silver minimal · low ink</option>
       </select></label>
       <label>Text size <b>{design.fontSize}px</b><input type="range" min="8" max="20"
         value={design.fontSize} onChange={e=>patchDesign('fontSize',Number(e.target.value))}/></label>
       <label>Subject heading <b>{design.headerSize}px</b><input type="range" min="10" max="26"
         value={design.headerSize} onChange={e=>patchDesign('headerSize',Number(e.target.value))}/></label>
       <label>School name/header <b>{design.schoolNameSize}px</b><input type="range" min="12" max="30"
         value={design.schoolNameSize} onChange={e=>patchDesign('schoolNameSize',Number(e.target.value))}/></label>
       <label>English font<select value={design.fontFamily} onChange={e=>patchDesign('fontFamily',e.target.value)}>
         <option>Times New Roman</option><option>Arial</option><option>Georgia</option><option>Inter</option>
       </select></label>
       <label>Urdu font<select value={design.urduFontFamily} onChange={e=>patchDesign('urduFontFamily',e.target.value)}>
         <option>Jameel Noori Nastaleeq</option><option>Noto Nastaliq Urdu</option><option>Noto Naskh Arabic</option>
       </select></label>
       <div className="wn-subject-typography-controls" aria-label="Weekly and Daily subject typography">
         <span>Subject name size &amp; bold</span>
         <div className="wn-subject-size-stepper">
           <button type="button" aria-label="Decrease planner subject size"
             onClick={()=>setDesign(old=>changeSubjectTypography(old,'smaller'))}>−</button>
           <output aria-live="polite">{normalizeSubjectTypography(design).subjectNameSize}px</output>
           <button type="button" aria-label="Increase planner subject size"
             onClick={()=>setDesign(old=>changeSubjectTypography(old,'larger'))}>+</button>
           <button type="button" aria-pressed={normalizeSubjectTypography(design).subjectNameBold}
             aria-label="Toggle planner subject bold"
             onClick={()=>setDesign(old=>changeSubjectTypography(old,'toggleBold'))}>B</button>
         </div>
         <input type="range" min="10" max="23" aria-label="Planner subject font size slider"
           value={normalizeSubjectTypography(design).subjectNameSize}
           onChange={e=>patchDesign('subjectNameSize',Number(e.target.value))}/>
       </div>
       <label>Assessment column <b>{design.assessmentWidth}%</b><input type="range" min="35" max="70"
         value={design.assessmentWidth} onChange={e=>patchDesign('assessmentWidth',Number(e.target.value))}/></label>
       <label>Subject column <b>{design.subjectWidth}%</b><input type="range" min="17" max="45"
         value={design.subjectWidth} onChange={e=>patchDesign('subjectWidth',Number(e.target.value))}/></label>
       <label>Row height <b>{design.rowHeight}px</b><input type="range" min="17" max="80"
         value={design.rowHeight} onChange={e=>patchDesign('rowHeight',Number(e.target.value))}/></label>
       <label>Preview zoom <b>{design.zoom}%</b><input type="range" min="45" max="100"
         value={design.zoom} onChange={e=>patchDesign('zoom',Number(e.target.value))}/></label>
       <button onClick={()=>setDesign(defaultDesign)}>Reset print settings</button>
       {originalPageWarning(activeRows,design.cardsPerPage)&&<p className="wn-warning">Long tasks may overflow. Use fewer cards or shorten each statement.</p>}
      </section>
      {viewMode==='daily'&&<section className="wn-panel" aria-label="Server Saved Days">
       <h4>Server Saved Days <small>{dailyServerPlans.filter(p=>p.classLevel===klass).length}</small></h4>
       <p className="wn-hint">Independent school-server daily lesson drafts. Operational Daily Diary remains separate.</p>
       <div className="wn-saved">{dailyServerPlans.filter(doc=>doc.classLevel===klass)
        .sort((a,b)=>b.startDate.localeCompare(a.startDate))
        .map(doc=><button key={doc.id} type="button" onClick={()=>openSavedDay(doc)}>
         <BookOpen size={13}/>{dateLabel(doc.startDate)} · {doc.subjects.length} subjects</button>)}</div>
      </section>}
      {viewMode==='weekly'&&<section className="wn-panel"><h4>Server Saved Weeks <small>{remotePlans.filter(p=>p.classLevel===klass).length}</small></h4>
       {remoteError&&<p className="wn-warning" role="alert">{remoteError}</p>}
       <p className="wn-hint">Private, authenticated school database drafts. These are NOT published to student portals.</p>
       <div className="wn-saved">
        {remotePlans.filter(p=>p.classLevel===klass).sort((a,b)=>a.startDate.localeCompare(b.startDate))
         .map(p=><button key={p.id} onClick={()=>openServerPlan(p)}>
           <BookOpen size={13}/>{p.classLevel} · {dateLabel(p.startDate)} · {p.subjects.length} subjects
         </button>)}
       </div>
       {!remotePlans.some(p=>p.classLevel===klass)&&<p className="wn-hint">No school-server weekly draft saved yet. Choose a week and click Save Week to School Server.</p>}
      </section>}
      <section className="wn-panel"><h4>Saved lesson plans</h4>
       <p className="wn-hint">Older local working copies retained on this device. Use Server Saved Weeks above for centrally saved plans.</p>
       <div className="wn-saved">
        {Object.entries(plans).filter(([,p])=>p.classLevel===klass).sort((a,b)=>a[1].weekStart.localeCompare(b[1].weekStart))
         .map(([k,p])=><button key={k} onClick={()=>openPlan(k)}>
           <BookOpen size={13}/>{p.classLevel} · {dateLabel(p.weekStart)}
         </button>)}
       </div>
       {Object.values(plans).filter(p=>p.classLevel===klass).length===0&&<p className="wn-hint">Save a weekly plan to add it here.</p>}
      </section>
      <section className="wn-panel wn-issues"><h4>Source review flags <small>{warnings.length}</small></h4>
       {warnings.slice(0,6).map((w,i)=><p key={w.id+i}>{w.message}</p>)}
       {warnings.length>6&&<small>+ {warnings.length-6} additional source comments. Original messages remain available in the Source Review tab.</small>}
       {!warnings.length&&<p>No date parser warnings for this week. Academic approval is still separate.</p>}
      </section>
    </aside>
    <section className="wn-preview">
      <header className="wn-preview-title"><div><strong><CalendarDays size={16}/> {viewMode==='daily'?'Daily Student Notebook Preview':'Live A4 Notebook Preview'}</strong>
       <small>{printableStudents.length} {selectedStudents.length?'personalized student':'blank example'} cards · {pages.length} sheet(s)</small></div>
       <button onClick={printCards} disabled={viewMode==='term'}><Printer size={16}/> Print / PDF</button>
      </header>
      <div className="wn-page-scroll">
       <div id="wn-print-pages" className="wn-print-pages" data-wn-pages>
        {pages.map((people,i)=><section className={'wn-paper wn-'+design.palette+(design.cardsPerPage>=3?' wn-dense':'')} key={i}
          style={{'--wn-count':design.cardsPerPage,'--wn-grid-cols':design.cardsPerPage>=4?2:1,
            '--wn-grid-rows':design.cardsPerPage>=4?Math.ceil(design.cardsPerPage/2):design.cardsPerPage,
            '--wn-zoom':design.zoom/100}}>
          {people.map((st,j)=><Card key={st?studentId(st):'generic-'+i+'-'+j}
            student={st} rows={activeRows} klass={klass} section={section} teacher={teacher}
            week={activeWeek||{index:0,start:'',end:''}} design={design}
            cardIndex={i*design.cardsPerPage+j} viewMode={viewMode} dailyDate={effectiveDailyDate}/>)}
        </section>)}
       </div>
      </div>
      <p className="wn-privacy">Only official source evidence, proposed teaching weeks and unapproved corrections appear here. Printing does not publish school records.</p>
    </section>
   </div>
   </>}
  </>}
 </section>
}
