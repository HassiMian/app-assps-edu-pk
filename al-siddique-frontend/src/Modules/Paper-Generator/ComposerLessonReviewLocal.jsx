import {useMemo,useState} from 'react'
import {BookOpen,FileInput,LockKeyhole,Printer,Save,ShieldCheck} from 'lucide-react'
import {CLASS_ORDER,LABELS,classSubjectGroups,classPrintHtml,extractOriginalEvidence} from './composerReviewDomain'
import {validateLocalComposerSource,normalizeClass} from './composerLocalVerifier'
import './ComposerLessonReview.css'

const stamp=()=>new Date().toLocaleString('en-PK')
function downloadJson(manifest,proposals){
  const data=JSON.stringify({...manifest,local_review_proposals:proposals},null,2)
  const blob=new Blob([data],{type:'application/json;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a')
  link.href=url
  link.download='ASSPS-Second-Term-Private-Review-'+new Date().toISOString().slice(0,10)+'.json'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),2000)
}
export default function ComposerLessonReviewLocal(){
  const [manifest,setManifest]=useState(null)
  const [proposals,setProposals]=useState({})
  const [classSelected,setClassSelected]=useState('Starter')
  const [subjectSelected,setSubjectSelected]=useState('')
  const [form,setForm]=useState({sourceId:'',category:'DATE_PROPOSAL',text:'',reason:''})
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const groups=useMemo(()=>classSubjectGroups((manifest?.candidates||[]).map(c=>({
    id:c.candidate_key,className:normalizeClass(c.proposed_class_level),subject:c.source_subject_label,
    source:c,publicationStatus:'BLOCKED'
  }))),[manifest])
  const active=groups.find(g=>g.className===classSelected)||groups[0]||null
  const selection=active?.subjects.find(s=>s.id===subjectSelected)||active?.subjects[0]||null
  const original=selection?.source||null
  const lines=extractOriginalEvidence(original)
  const groupProposals=proposals[selection?.id]||[]
  const markSelected=(group,id)=>{
    setClassSelected(group)
    setSubjectSelected(id)
    setForm({sourceId:'',category:'DATE_PROPOSAL',text:'',reason:''})
  }
  async function openManifest(event){
    const f=event.target.files?.[0]
    if(!f)return
    setError('');setNotice('');setBusy(true)
    try{
      if(f.size>2*1024*1024)throw Error('Academic file exceeds 2MB. Select the approved original manifest.')
      const parsed=JSON.parse(await f.text())
      const proof=await validateLocalComposerSource(parsed)
      setManifest(parsed)
      setProposals(parsed.local_review_proposals||{})
      setClassSelected('Starter')
      setSubjectSelected('')
      setNotice('Verified '+proof.candidates+' original source groups in '+proof.classes+
        ' classes. Private local review is ready. Nothing uploaded to a server.')
    }catch(e){
      setManifest(null);setProposals({});setError(e.message||'This source cannot be trusted.')
    }finally{setBusy(false);event.target.value=''}
  }
  function addProposal(){
    if(!selection||!form.sourceId||!form.text.trim()||form.reason.trim().length<12)return
    if(!original.source_submissions.includes(form.sourceId)){
      setError('Original message source does not belong to this subject.')
      return
    }
    const event={
      eventId:'local-'+crypto.randomUUID(),sourceId:form.sourceId,changeType:form.category,
      proposedText:form.text.trim(),rationale:form.reason.trim(),
      decision:'PROPOSED_NOT_APPROVED',createdAt:new Date().toISOString()
    }
    setProposals(current=>({...current,
      [selection.id]:[...(current[selection.id]||[]),event]
    }))
    setForm({sourceId:'',category:'DATE_PROPOSAL',text:'',reason:''})
    setNotice('Correction recorded in this browser session. Download the private review copy to preserve it.')
    setError('')
  }
  function printReview(allClasses){
    if(!manifest)return
    const groupInput=allClasses?groups:(active?[active]:[])
    const content=groupInput.map(group=>({
      className:group.className,
      subjects:group.subjects.map(item=>({
        ...item,
        source:{
          source_detail_records:item.source.source_detail_records,
          corrections:proposals[item.id]||[]
        }
      }))
    }))
    // Must open while the user click event is live, not after an asynchronous task.
    const win=window.open('','_blank','width=1050,height=850')
    if(!win){setError('Browser blocked print preview. Allow pop-ups for this school site.');return}
    win.document.open()
    win.document.write(classPrintHtml(content,{generatedAt:stamp()}))
    win.document.close()
    win.focus()
    win.print()
    setNotice('Private source review opened in print preview. This is not published academic material.')
  }
  return <section className="assps-composer-review" data-composer-classwise-review>
    <header className="composer-heading">
      <div><span className="composer-kicker">ASSPS · PRIVATE ACADEMIC REVIEW</span>
        <h3>Class-wise Second Term Syllabus</h3>
        <p>59 original groups · 12 classes · Miss Adiba is the composer, not the automatically assigned teacher.</p>
      </div>
      <span className="composer-status"><LockKeyhole size={15}/> UNPUBLISHED</span>
    </header>
    <p className="composer-warning">Daily-use source review: verified files are processed only in this browser. Original lesson records, teacher permissions and student notifications are not changed. Download your reviewed working copy before closing the page.</p>
    <div className="composer-toolbar">
      <label className="composer-upload-button"><FileInput size={15}/> Open Original 59-Group File
        <input type="file" accept=".json,application/json" onChange={openManifest} aria-label="Open original ASSPS source file" disabled={busy}/>
      </label>
      <button disabled={!manifest} onClick={()=>downloadJson(manifest,proposals)}><Save size={15}/> Save Review Copy</button>
      <button disabled={!active} onClick={()=>printReview(false)}><Printer size={15}/> Print This Class</button>
      <button disabled={!groups.length} onClick={()=>printReview(true)}><Printer size={15}/> Print All Classes</button>
    </div>
    {error&&<p className="composer-error" role="alert">{error}</p>}
    {notice&&<p className="composer-message" role="status"><ShieldCheck size={15}/>{notice}</p>}
    {manifest&&<div className="composer-readiness" data-composer-readiness>
      <strong>Source verification PASSED · Academic publication HOLD</strong>
      <span>59 source groups</span><span>12 classes</span><span>1 unassigned Islamiyat message</span>
      <small>All chapters and dates retain original wording. Proposed corrections require independent academic review.</small>
    </div>}
    <div className="composer-layout">
      <nav className="composer-class-list" aria-label="Class-wise syllabus">
        <strong>Classes</strong>
        {CLASS_ORDER.filter(c=>groups.some(g=>g.className===c)).map(c=>{
          const g=groups.find(x=>x.className===c)
          return <button key={c} className={active?.className===c?'selected':''}
            onClick={()=>markSelected(c,'')}>{LABELS[c]||'Class '+c}<span>{g.subjects.length} subjects</span></button>
        })}
        {!groups.length&&<p>Open the verified original source file to view all classes.</p>}
      </nav>
      <nav className="composer-subject-list" aria-label="Subjects">
        <strong>{active?.label||'Subjects'}</strong>
        {active?.subjects.map(item=><button key={item.id}
          className={item.id===selection?.id?'selected':''}
          onClick={()=>markSelected(active.className,item.id)}>
          <BookOpen size={14}/>{item.subject}<small>Original source</small>
        </button>)}
      </nav>
      <article className="composer-source">
        {selection?<><div className="composer-source-head"><h4>{selection.subject}</h4><span>Teacher: UNVERIFIED · No portal publication</span></div>
          <div className="composer-metadata">Class: {active.label} · Source: {selection.id}</div>
          <h5>Exact Original Evidence</h5>
          {lines.length?lines.map((part,index)=><section key={index} className="composer-excerpt">
            <small>{part.sourceId} · lines {part.lineFrom??'?'}–{part.lineTo??'?'} · {part.receivedAt}</small>
            <p dir="auto">{part.verbatim}</p>
          </section>):<p>Source image requires independent visual transcription before academic approval.</p>}
          {original.blocking_reasons?.length>0&&<div className="composer-issues">
            <b>Academic review still required</b>
            <ul>{original.blocking_reasons.map((reason,index)=><li key={index}>{reason}</li>)}</ul>
          </div>}
          <h5>Correction working copy — original text remains unchanged</h5>
          {groupProposals.map(entry=><section className="composer-proposal" key={entry.eventId}>
            <strong>{entry.changeType}</strong><p dir="auto">{entry.proposedText}</p>
            <small>{entry.decision} · {entry.sourceId} · {entry.rationale}</small>
          </section>)}
          <div className="composer-edit">
            <label>Original WhatsApp source<select value={form.sourceId} onChange={e=>setForm({...form,sourceId:e.target.value})}>
              <option value="">Select message</option>
              {original.source_submissions.map(id=><option key={id} value={id}>{id}</option>)}
            </select></label>
            <label>Change type<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
              {['DATE_PROPOSAL','CLASS_LABEL_PROPOSAL','SUBJECT_LABEL_PROPOSAL','CHAPTER_FIX_PROPOSAL','TEXT_FIX_PROPOSAL','MISSING_CONTENT_FLAG'].map(c=><option key={c} value={c}>{c.replaceAll('_',' ')}</option>)}
            </select></label>
            <label>Suggested correction<textarea dir="auto" value={form.text} onChange={e=>setForm({...form,text:e.target.value})}/></label>
            <label>Evidence / reason<textarea dir="auto" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label>
            <button disabled={!form.sourceId||!form.text.trim()||form.reason.trim().length<12}
              onClick={addProposal}><Save size={15}/> Add Unapproved Proposal</button>
          </div>
        </>:<p>Choose an original source file, then select a class and subject.</p>}
      </article>
    </div>
  </section>
}
