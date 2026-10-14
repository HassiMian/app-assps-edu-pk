import {useCallback,useEffect,useMemo,useState} from 'react'
import {BookOpen,FileInput,LockKeyhole,Printer,RefreshCw,Save,ShieldAlert} from 'lucide-react'
import {
  appendComposerReviewCorrection,appendPrincipalSourceInspection,getComposerTeacherEvidence,getComposerReviewSource,importComposerReview,
  listComposerReview,getComposerReviewReadiness,previewComposerReview
} from './lessonPlanClient'
import {CLASS_ORDER,LABELS,classPrintHtml,classSubjectGroups,extractOriginalEvidence} from './composerReviewDomain'
import './ComposerLessonReview.css'

const reasons=[
  {value:'DATE_PROPOSAL',label:'Date / assessment schedule'},
  {value:'CLASS_LABEL_PROPOSAL',label:'Class identity'},
  {value:'SUBJECT_LABEL_PROPOSAL',label:'Subject identity'},
  {value:'CHAPTER_FIX_PROPOSAL',label:'Chapter or topic'},
  {value:'TEXT_FIX_PROPOSAL',label:'Spelling / wording'},
  {value:'AUTHORSHIP_FLAG',label:'Teacher identity requires review'},
  {value:'MISSING_CONTENT_FLAG',label:'Missing original content'}
]
const errorMessage=error=>{
  const code=error?.response?.data?.code
  if(code==='COMPOSER_IMPORT_RELEASE_HOLD'||code==='COMPOSER_CORRECTION_RELEASE_HOLD')
    return 'Private review writes are disabled until SaaS Core authenticates the institutional release.'
  if(code==='COMPOSER_REVIEW_MANAGER_REQUIRED'||error?.response?.status===403)
    return 'Authorized Principal or school management access is required.'
  if(code==='CORRECTION_REVISION_CONFLICT')return 'This review changed on the server. Reopen before submitting another correction.'
  return error?.response?.data?.message||error?.message||'Review operation could not be completed.'
}
const blank=()=>({sourceId:'',changeType:'DATE_PROPOSAL',proposedText:'',rationale:''})
function plainTextPreview(candidate){
 if(!candidate)return null
 return {
   id:candidate.candidate_key,
   revision:0,
   reviewStatus:'PENDING_ACADEMIC_REVIEW',
   source:{
     sourceSubmissions:candidate.source_detail_records||[],
     sourceIds:candidate.source_submissions||[],
     sourceDigest:'LOCAL_UNSAVED_SOURCE',
     sourceSubjectLabel:candidate.source_subject_label,
     sourceClassLabel:candidate.class_display,
     issues:candidate.blocking_reasons||[],
     corrections:[]
   }
 }
}
function printGroups(popup,groups){
 const html=classPrintHtml(groups,{generatedAt:new Date().toLocaleString('en-PK')})
 popup.document.open()
 popup.document.write(html)
 popup.document.close()
 popup.focus()
 // Opens browser print flow; does not claim that paper was physically printed.
 popup.print()
}
export default function ComposerLessonReview(){
 const [records,setRecords]=useState([])
 const [readiness,setReadiness]=useState(null)
 const [manifest,setManifest]=useState(null)
 const [preview,setPreview]=useState(null)
 const [selectedClass,setSelectedClass]=useState('')
 const [selectedId,setSelectedId]=useState('')
 const [opened,setOpened]=useState(null)
 const [assignments,setAssignments]=useState(null)
 const [principalChecked,setPrincipalChecked]=useState(false)
 const [correction,setCorrection]=useState(blank)
 const [busy,setBusy]=useState('')
 const [status,setStatus]=useState('')
 const [problem,setProblem]=useState('')
 const [showImport,setShowImport]=useState(false)
 const fetchList=useCallback(async()=>{
   const data=await listComposerReview()
   setRecords(Array.isArray(data)?data:[])
   const readinessData=await getComposerReviewReadiness().catch(()=>null)
   setReadiness(readinessData)
   return data
 },[])
 useEffect(()=>{
   let live=true
   listComposerReview().then(data=>{if(live)setRecords(Array.isArray(data)?data:[])})
     .catch(error=>{if(live)setStatus(errorMessage(error))})
   getComposerReviewReadiness().then(data=>{if(live)setReadiness(data)})
     .catch(()=>{if(live)setReadiness(null)})
   return()=>{live=false}
 },[])
 const previewItems=useMemo(()=>manifest?.candidates?.map(c=>({
   id:c.candidate_key,className:c.proposed_class_level,subject:c.source_subject_label,
   source:c,publicationStatus:'BLOCKED'
 }))||[],[manifest])
 const groups=useMemo(()=>{
   const merged=new Map(records.map(row=>[row.id,row]))
   // A locally selected manifest is shown as review-only until the server
   // confirms persistence; never infer that visible text has been saved.
   for(const item of previewItems)merged.set(item.id,{...merged.get(item.id),...item})
   return classSubjectGroups([...merged.values()])
 },[records,previewItems])
 const activeClass=selectedClass||groups[0]?.className||''
 const currentGroup=groups.find(group=>group.className===activeClass)||null
 const selection=currentGroup?.subjects.find(row=>row.id===selectedId)||currentGroup?.subjects[0]||null
 const localCandidate=manifest?.candidates?.find(c=>c.candidate_key===selection?.id)
 const localDetails=plainTextPreview(localCandidate)
 const details=opened?.id===selection?.id?opened:localDetails
 const source=details?.source
 const evidence=extractOriginalEvidence(source)
 const corrections=Array.isArray(source?.corrections)?source.corrections:[]
 const isPersisted=records.some(row=>row.id===selection?.id)
 useEffect(()=>{
   let active=true
   if(!selection?.id||!records.some(r=>r.id===selection.id)){
     return()=>{active=false}
   }
   getComposerTeacherEvidence(selection.id)
     .then(data=>{if(active)setAssignments(data)})
     .catch(()=>{if(active)setAssignments({verifiedCount:0,verificationStatus:'ASSIGNMENT_EVIDENCE_REQUIRED'})})
   getComposerReviewSource(selection.id)
     .then(data=>{if(active)setOpened(data)})
     .catch(error=>{if(active)setStatus(errorMessage(error))})
   return()=>{active=false}
 },[selection?.id,records])
 const loadFile=async event=>{
   setProblem('');setStatus('')
   const file=event.target.files?.[0]
   if(!file)return
   if(file.size>2*1024*1024){setProblem('Source manifest exceeds safe 2 MB browser limit.');return}
   setBusy('validate')
   try{
     const parsed=JSON.parse(await file.text())
     if(parsed?.schema!=='assps.lesson_plan.review_import.v1'||
       !Array.isArray(parsed.candidates)||parsed.candidates.length>250)
       throw Error('Invalid academic source manifest')
     const checked=await previewComposerReview(parsed)
     if(checked.candidateCount!==parsed.candidates.length)
       throw Error('Server rejected incomplete source coverage')
     setManifest(parsed);setPreview(checked)
     setSelectedClass('');setSelectedId('');setOpened(null)
     setShowImport(true)
     setStatus('Original source reviewed by server. No academic data was saved or published.')
   }catch(error){setManifest(null);setPreview(null);setProblem(errorMessage(error))}
   finally{setBusy('')}
 }
 const saveReview=async()=>{
   if(!manifest||!preview)return
   setProblem('');setBusy('import')
   try{
     let inserted=0,unchanged=0
     // Server allows up to 12 candidates inside each atomic transaction.
     for(let i=0;i<manifest.candidates.length;i+=12){
       const result=await importComposerReview({
         ...manifest,candidates:manifest.candidates.slice(i,i+12)
       })
       inserted+=result.staged||0;unchanged+=result.previouslyStaged||0
     }
     await fetchList()
     setStatus('Private staging completed: '+inserted+' new and '+unchanged+
       ' already staged. Teacher ownership and academic approval are still pending.')
   }catch(error){setProblem(errorMessage(error)+' Earlier chunks, if accepted, remain safely idempotent.')}
   finally{setBusy('')}
 }
 const reopen=async()=>{
   if(!selection?.id||!isPersisted)return
   setBusy('reopen');setProblem('')
   try{
     const result=await getComposerReviewSource(selection.id)
     setOpened(result)
     setStatus('The original source and correction revision were reopened from the server.')
   }catch(error){setProblem(errorMessage(error))}
   finally{setBusy('')}
 }
 const saveCorrection=async()=>{
   if(!selection?.id||!isPersisted||!details?.revision)return
   setProblem('');setBusy('correction')
   try{
     const result=await appendComposerReviewCorrection(selection.id,details.revision,correction)
     const refreshed=await getComposerReviewSource(selection.id)
     if(Number(refreshed.revision)!==Number(result.revision))
       throw Error('Saved revision could not be verified on reopen')
     setOpened(refreshed);setCorrection(blank())
     setStatus('Proposed correction saved and reopened at revision '+result.revision+'. Academic approval still required.')
   }catch(error){setProblem(errorMessage(error))}
   finally{setBusy('')}
 }
 const principalInspect=async()=>{
   if(!isPersisted||!details?.revision||!source?.sourceDigest||!principalChecked)return
   setBusy('principal');setProblem('')
   try{
     const saved=await appendPrincipalSourceInspection(selection.id,details.revision,source.sourceDigest)
     const reopened=await getComposerReviewSource(selection.id)
     if(Number(reopened.revision)!==Number(saved.revision))
       throw Error('Principal source inspection could not be verified on reopen')
     setOpened(reopened);setPrincipalChecked(false)
     setStatus('Original source inspection recorded under genuine Principal identity. This is NOT academic approval or publication.')
   }catch(error){setProblem(errorMessage(error))}
   finally{setBusy('')}
 }
 const printSelection=async all=>{
   const selected=all?groups:(currentGroup?[currentGroup]:[])
   if(!selected.length)return
   // Reserve the popup synchronously during a trusted user click. Otherwise
   // browsers may block windows opened after the async evidence fetch.
   const popup=window.open('','_blank','width=1100,height=900')
   if(!popup){setProblem('The browser blocked the print window. Allow popups and try again.');return}
   setBusy('print');setProblem('')
   try{
     const printable=[]
     for(const group of selected){
       const items=[]
       for(const item of group.subjects){
         let evidenceSource=null
         if(opened?.id===item.id)evidenceSource=opened.source
         else if(records.some(row=>row.id===item.id)){
           // Always reopen server-side sources; never print a stale summary
           // or silently omit subject text in a batch export.
           const row=await getComposerReviewSource(item.id)
           evidenceSource=row?.source
         }else{
           const c=manifest?.candidates?.find(x=>x.candidate_key===item.id)
           evidenceSource=c?{source_detail_records:c.source_detail_records,corrections:[]}:null
         }
         if(!evidenceSource||!extractOriginalEvidence(evidenceSource).length){
           throw Error('Original text missing for '+group.className+' / '+item.subject+'. Print aborted.')
         }
         items.push({...item,source:evidenceSource})
       }
       printable.push({className:group.className,subjects:items})
     }
     printGroups(popup,printable)
     setStatus('Private source print preview opened for '+printable.length+' class(es). Physical printer acceptance remains pending.')
   }catch(error){popup.close();setProblem(errorMessage(error))}
   finally{setBusy('')}
 }
 return <section className="assps-composer-review" data-composer-classwise-review>
   <div className="composer-heading">
     <div><span className="composer-kicker">ASSPS · Official Source Review</span><h3>Class-wise Second Term Syllabus Review</h3>
       <p>Miss Adiba is the composer. Subject teachers and academic approval must be verified separately.</p></div>
     <span className="composer-status"><LockKeyhole size={15}/> PRIVATE · NOT PUBLISHED</span>
   </div>
   {readiness&&<div className="composer-readiness" role="status" data-composer-readiness>
     <strong>Academic release readiness: HOLD — none of these sources are published</strong>
     <span>Groups privately staged: {readiness.counts?.privatelyStaged??0} / {readiness.counts?.expected??0}</span>
     <span>Teacher identities verified: {readiness.counts?.verifiedTeacherIdentity??0}</span>
     <span>Principal source inspections: {readiness.counts?.principalSourceInspections??0}</span>
     <small>Review source and teacher evidence before requesting institutional publication approval.</small>
   </div>}
   <div className="composer-toolbar">
     <button onClick={()=>setShowImport(v=>!v)}><FileInput size={15}/> Original Source Import</button>
     <button onClick={()=>fetchList().then(()=>setStatus('Current school-only review list reloaded.')).catch(error=>setProblem(errorMessage(error)))}><RefreshCw size={15}/> Reload Review</button>
     <button onClick={()=>printSelection(false)} disabled={!currentGroup||busy==='print'}><Printer size={15}/> Print Class Review</button>
     <button onClick={()=>printSelection(true)} disabled={!groups.length||busy==='print'}><Printer size={15}/> Print All Classes</button>
   </div>
   {showImport&&<div className="composer-import">
     <label htmlFor="composer-manifest">Select the original authorized source manifest (JSON)</label>
     <input id="composer-manifest" type="file" accept=".json,application/json" onChange={loadFile}/>
     <small>No source is saved until you choose private staging. Never upload staff passwords or student marks.</small>
     {preview&&<p>Validated {preview.candidateCount} groups across {preview.classes.length} classes. Academic publication remains blocked.</p>}
     <button onClick={saveReview} disabled={!preview||busy==='import'}><Save size={15}/> Save Private Review Groups</button>
   </div>}
   {problem&&<p className="composer-error" role="alert"><ShieldAlert size={16}/>{problem}</p>}
   {status&&<p className="composer-message" role="status">{status}</p>}
   <div className="composer-layout">
     <nav aria-label="Syllabus classes" className="composer-class-list">
       <strong>Classes</strong>
       {CLASS_ORDER.filter(cls=>groups.some(g=>g.className===cls)).map(cls=>{
         const group=groups.find(g=>g.className===cls)
         return <button key={cls} className={activeClass===cls?'selected':''}
           onClick={()=>{setSelectedClass(cls);setSelectedId('');setOpened(null);setCorrection(blank());setAssignments(null);setPrincipalChecked(false)}}>
           {LABELS[cls]||'Class '+cls}<span>{group?.subjects.length||0} subjects</span>
         </button>
       })}
       {!groups.length&&<p>No official review drafts loaded.</p>}
     </nav>
     <nav aria-label="Class subjects" className="composer-subject-list">
       <strong>{LABELS[activeClass]||'Select class'} · Subjects</strong>
       {currentGroup?.subjects.map(item=><button key={item.id}
         className={selection?.id===item.id?'selected':''}
         onClick={()=>{setSelectedId(item.id);setOpened(null);setCorrection(blank());setAssignments(null);setPrincipalChecked(false)}}>
         <BookOpen size={14}/>{item.subject}<small>Review required</small>
       </button>)}
     </nav>
     <article className="composer-source">
       {selection?<><div className="composer-source-head"><h4>{selection.subject}</h4>
         <span>{isPersisted?'Private draft':'Unsaved source'} · Rev {details?.revision||0}</span></div>
         <p className="composer-warning">Original submissions are immutable. Corrections are proposals, not approvals.</p>
         <div className="composer-metadata">Class: {LABELS[selection.className]||selection.className} ·
         Teacher ownership: {assignments?.verifiedCount>0?String(assignments.verifiedCount)+' verified institutional assignment(s)':'NOT VERIFIED'} ·
         Section: {assignments?.verifiedCount>0?'Verified options below':'NOT VERIFIED'}
         </div>
         {(assignments?.provisionalTimetableSuggestions||[]).length>0&&<div className="composer-issues">
           <b>Timetable references — unverified, NOT teacher assignments</b>
           <ul>{assignments.provisionalTimetableSuggestions.map((candidate,i)=><li key={i}>
             {candidate.teacherDisplayName}, section {candidate.section||'unspecified'} ·
             identity reviewed: {candidate.identityReviewed?'yes':'NO'} · school assignment not verified
           </li>)}</ul>
         </div>}
         {assignments?.candidates?.length>0&&<div className="composer-issues">
           <b>Verified assignment evidence (not academic approval)</b>
           <ul>{assignments.candidates.map(a=><li key={String(a.teacherUserId)+'-'+String(a.section)}>
             School staff ID {a.teacherUserId}, section {a.section} · timetable identity reviewed
           </li>)}</ul>
         </div>}
         <h5>Original WhatsApp evidence</h5>
         {evidence.length?evidence.map((e,i)=><section className="composer-excerpt" key={e.sourceId+'-'+i}>
           <small>Source {e.sourceId} · lines {e.lineFrom??'?'}–{e.lineTo??'?'} · {e.receivedAt}</small>
           <p dir="auto">{e.verbatim}</p>
         </section>):<p>Attachment or source excerpt requires separate visual verification.</p>}
         {source?.issues?.length>0&&<div className="composer-issues"><b>Review flags</b>
           <ul>{source.issues.map((reason,i)=><li key={i}>{reason}</li>)}</ul></div>}
         <div className="composer-principal">
           <h5>Principal academic source inspection</h5>
           <p>Only a genuine active Principal account may record that original evidence was inspected.
              Teacher assignments, textbook adoption and curriculum approval remain separate mandatory gates.</p>
           <label><input type="checkbox" checked={principalChecked}
             onChange={e=>setPrincipalChecked(e.target.checked)}/>
             I reviewed the original lesson syllabus evidence and its correction flags.
           </label>
           <button onClick={principalInspect} disabled={!isPersisted||!principalChecked||busy==='principal'}>
             <LockKeyhole size={14}/> Record Principal Source Inspection (not approval)
           </button>
           {(source?.principalReviews||[]).map(e=><p key={e.eventId} className="composer-metadata">
             Verified actor {e.reviewedByPrincipalUserId} · {e.decision} · rev {details.revision}
           </p>)}
         </div>
         <h5>Correction proposals</h5>
         {corrections.map(c=><section className="composer-proposal" key={c.eventId}>
           <b>{c.changeType}</b><p>{c.proposedText}</p><small>{c.decision} · Revision evidence {c.integrityHash?.slice(0,12)}</small>
         </section>)}
         <button onClick={reopen} disabled={!isPersisted||busy==='reopen'}>Reopen original revision</button>
         <div className="composer-edit"><h5>New correction proposal — not academic approval</h5>
           <label>Original source ID<select value={correction.sourceId} onChange={e=>setCorrection(x=>({...x,sourceId:e.target.value}))}>
             <option value="">Select source</option>
             {(source?.sourceIds||localCandidate?.source_submissions||[]).map(id=><option key={id} value={id}>{id}</option>)}
           </select></label>
           <label>Correction category<select value={correction.changeType} onChange={e=>setCorrection(x=>({...x,changeType:e.target.value}))}>
             {reasons.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
           </select></label>
           <label>Proposed correction<textarea value={correction.proposedText} onChange={e=>setCorrection(x=>({...x,proposedText:e.target.value}))}/></label>
           <label>Reason / source evidence<textarea value={correction.rationale} onChange={e=>setCorrection(x=>({...x,rationale:e.target.value}))}/></label>
           <button disabled={!isPersisted||!correction.sourceId||correction.proposedText.trim().length<1||correction.rationale.trim().length<12||busy==='correction'} onClick={saveCorrection}>
             <Save size={14}/> Save Revision Proposal
           </button>
         </div>
       </>:<p>Select a class and subject to inspect the original notes.</p>}
     </article>
   </div>
 </section>
}
