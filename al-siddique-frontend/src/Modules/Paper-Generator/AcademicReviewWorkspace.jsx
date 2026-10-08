/**
 * ASSPS Phase 5 — teacher-facing Grade 9/10 academic review.
 *
 * An editorial surface over the existing versioned Question Bank backend.
 * This does not create another Paper Editor or skip canonical PaperDocument.
 * No unapproved content is sent to an automatic paper generator.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  academicReviewApi, REVIEW_FIELDS, sourcesForQuestion, completeAttestations,
  buildAcademicReviewPacket, editableQuestionDraft, buildProvisionalCorrection,
} from './academicReviewClient'
import {
  ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, CircleAlert,
  ClipboardCheck, FileText, LockKeyhole, RefreshCw, Search, ShieldCheck,
} from 'lucide-react'
import './AcademicReviewWorkspace.css'

const PAGE_SIZE = 30
const blankChecks = () => Object.fromEntries(REVIEW_FIELDS.map(({ key }) => [key, false]))
const getError = (error) => error?.response?.data?.message || error?.response?.data?.code ||
  error?.message || 'Request could not be completed.'
const short = (value, length = 110) => {
  const text = String(value || '')
  return text.length > length ? text.slice(0, length - 1) + '…' : text
}

function Ledger({ context }) {
  return (
    <div className="ar-ledger">
      <div><span>Governed revision</span><strong>{context?.currentRevision || '—'}</strong></div>
      <div><span>SHA-256 content lock</span><code title={context?.currentContentHash || ''}>{context?.currentContentHash ? short(context.currentContentHash, 24) : '—'}</code></div>
      <div><span>Academic review</span><strong>{context?.independentReviewRecorded ? 'Recorded for this revision' : 'Not yet recorded'}</strong></div>
      <div><span>Question Bank approval</span><strong>{context?.academicApprovalGranted ? 'Approved' : 'Not approved'}</strong></div>
    </div>
  )
}

function QuestionPreview({ row, question }) {
  const options = Array.isArray(question?.options) ? question.options : Array.isArray(row?.options) ? row.options : []
  const isUrdu = String(question?.medium || row?.medium || '').toLowerCase().includes('urdu')
  return (
    <section className="ar-question">
      <div className="ar-question-meta">
        <span>Class {question?.classLevel || row?.class_level || '—'}</span>
        <span>{question?.subject || row?.subject || '—'}</span>
        <span>Chapter {question?.chapterNo || row?.chapter_no || '—'}</span>
        <span>{question?.questionType || row?.question_type || 'Question'}</span>
        <span>{Number(question?.marks ?? row?.marks ?? 1)} marks</span>
      </div>
      <div className="ar-question-body" dir={isUrdu ? 'rtl' : 'ltr'}>
        {question?.questionTextUrdu || row?.question_text_urdu ? (
          <p className="ar-urdu">{question?.questionTextUrdu || row?.question_text_urdu}</p>
        ) : null}
        <p>{question?.questionText || row?.question_text}</p>
        {options.length > 0 && (
          <div className="ar-options">
            {options.map((option, i) => (
              <div key={option?.id || i} className="ar-option">
                <b>{typeof option === 'string' ? 'ABCD'[i] || i + 1 : option?.label || 'ABCD'[i] || i + 1}</b>
                <span>{typeof option === 'string' ? option : option?.text || option?.value || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="ar-answer" aria-label="Answer for academic reviewer only">
        <span>Reviewer-only answer and marking details</span>
        <p><b>Answer / key:</b> {question?.correctOption || row?.correct_option || '—'} {question?.answer || row?.answer || ''}</p>
        {(question?.explanation || row?.explanation) && <p>{question?.explanation || row?.explanation}</p>}
      </div>
    </section>
  )
}

export default function AcademicReviewWorkspace() {
  const { user } = useAuth()
  const canReview = ['admin', 'principal', 'super_admin'].includes(String(user?.role || '').toLowerCase())
  const [grade, setGrade] = useState('9th')
  const [subjectDraft, setSubjectDraft] = useState('')
  const [subject, setSubject] = useState('')
  const [questionIdDraft,setQuestionIdDraft] = useState(() =>
    typeof window==='undefined' ? '' : new URLSearchParams(window.location.search).get('questionId') || '')
  const [offset, setOffset] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [questions, setQuestions] = useState([])
  const [total, setTotal] = useState(0)
  const [sources, setSources] = useState([])
  const [selected, setSelected] = useState(null)
  const [context, setContext] = useState(null)
  const [sourceId, setSourceId] = useState('')
  const [origin, setOrigin] = useState('ORIGINAL')
  const [printedPage, setPrintedPage] = useState('')
  const [exerciseReference, setExerciseReference] = useState('')
  const [checks, setChecks] = useState(blankChecks)
  const [notes, setNotes] = useState('')
  const [correctionReason, setCorrectionReason] = useState('')
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState(null)
  const [loading, setLoading] = useState(false)
  const [contextLoading, setContextLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const contextSerial = useRef(0)

  useEffect(() => {
    if (!canReview) return undefined
    const controller = new AbortController()
    academicReviewApi.getSources(controller.signal)
      .then(setSources)
      .catch((err) => { if (!controller.signal.aborted) setError(getError(err)) })
    return () => controller.abort()
  }, [canReview])

  useEffect(() => {
    if (!canReview) return undefined
    const controller = new AbortController()
    setLoading(true)
    academicReviewApi.listQuestions({ grade, subject, offset, limit:PAGE_SIZE, signal:controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        setQuestions(Array.isArray(result.data) ? result.data : [])
        setTotal(Number(result.meta?.total || 0))
      })
      .catch(err => { if (!controller.signal.aborted) setError(getError(err)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [canReview, grade, subject, offset, reloadKey])

  const refresh = useCallback(() => setReloadKey(value => value + 1), [])

  const loadContext = useCallback(async (record) => {
    const serial = ++contextSerial.current
    setSelected(record)
    setContext(null)
    setSourceId('')
    setOrigin('ORIGINAL')
    setChecks(blankChecks())
    setNotes('')
    setCorrectionReason('')
    setEditing(false)
    setEditValues(null)
    setPrintedPage('')
    setExerciseReference('')
    setError('')
    setNotice('')
    if (!record?.governance_public_id) return
    setContextLoading(true)
    try {
      const data = await academicReviewApi.getReviewContext(record.governance_public_id)
      if (serial === contextSerial.current) setContext(data)
    } catch (err) {
      if (serial === contextSerial.current) setError(getError(err))
    } finally {
      if (serial === contextSerial.current) setContextLoading(false)
    }
  }, [])

  const openExactQuestion = async () => {
    if(!canReview || busy) return
    setBusy(true)
    setError('')
    try {
      const question=await academicReviewApi.getQuestion(questionIdDraft)
      if(!['9th','10th'].includes(String(question.class_level||'')))
        throw new Error('This review workspace accepts only Grade 9 and Grade 10 questions.')
      // The API scopes direct lookup to the authenticated school and refuses
      // teachers access to provisional questions. No client-side bypass.
      await loadContext(question)
      setGrade(question.class_level)
      setSubjectDraft(String(question.subject||''))
      setSubject(String(question.subject||''))
      setOffset(0)
    }catch(err){setError(getError(err))}
    finally{setBusy(false)}
  }

  const reloadSelection = useCallback(async (id) => {
    const data = await academicReviewApi.getReviewContext(id)
    setContext(data)
    const item = await academicReviewApi.listQuestions({grade,subject,offset,limit:PAGE_SIZE})
    setQuestions(Array.isArray(item.data) ? item.data : [])
    setTotal(Number(item.meta?.total || 0))
    return data
  }, [grade, subject, offset])

  const doAction = useCallback(async (action, success, id) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      if (id) await reloadSelection(id)
      else refresh()
      setNotice(success)
    } catch (err) {
      setError(getError(err))
    } finally { setBusy(false) }
  }, [reloadSelection,refresh])

  const intake = () => {
    if (!selected || busy) return
    doAction(async () => {
      const result = await academicReviewApi.intake(selected.id)
      const publicId = result?.publicId
      if (!publicId) throw new Error('Governance intake returned no public revision ID.')
      const adopted = {...selected,governance_public_id:publicId,governance_lifecycle_status:'candidate'}
      setSelected(adopted)
      setContext(await academicReviewApi.getReviewContext(publicId))
      refresh()
    }, 'Existing provisional question linked to governance. It remains unapproved.')
  }

  const prepare = () => {
    if (!selected?.governance_public_id || busy) return
    doAction(() => academicReviewApi.changeStatus(selected.governance_public_id,'reviewed'),
      'Question moved to academic review. No academic approval has been granted.',selected.governance_public_id)
  }

  const matchingSources = useMemo(() =>
    sourcesForQuestion(sources,context?.question || selected || {}),[sources,context,selected])
  const chosenSource = matchingSources.find(s => s.recordId === sourceId) || null
  const allChecked = completeAttestations(checks)
  const notesReady = notes.trim().length >= 45
  const canSubmitReview = Boolean(context && context.lifecycleStatus === 'reviewed' &&
    !context.requesterIsAuthor && !context.independentReviewRecorded &&
    chosenSource && allChecked && notesReady && !busy)

  const submitReview = () => {
    if (!canSubmitReview) return
    let packet
    try {
      packet = buildAcademicReviewPacket({
        context,source:chosenSource,origin,flags:checks,notes,printedPage,exerciseReference,
      })
    } catch(err) {setError(getError(err));return}
    doAction(() => academicReviewApi.submitReview(context.publicId,packet),
      'Independent academic review recorded against this exact revision. The question is still not published.',
      context.publicId)
  }

  const submitCorrection = () => {
    if (!selected || !context || busy || !editValues) return
    let packet
    try { packet=buildProvisionalCorrection(context,editValues) }
    catch(err){setError(getError(err));return}
    doAction(async () => {
      await academicReviewApi.revise(selected.id,packet)
      setEditing(false)
      setEditValues(null)
    },'Corrected source and canonical revision saved together. New independent academic review is required.',context.publicId)
  }

  const returnForCorrection = () => {
    if(!context || context.lifecycleStatus!=='reviewed' || context.requesterIsAuthor || busy) return
    if(correctionReason.trim().length<35) {
      setError('Please record a specific correction reason of at least 35 characters.')
      return
    }
    doAction(() => academicReviewApi.returnForCorrection(context.publicId,{
      expectedRevision:context.currentRevision,
      expectedContentHash:context.currentContentHash,
      reason:correctionReason.trim(),
    }), 'Correction request audited. The question is no longer reviewed or publishable.',
      context.publicId)
  }

  const publish = () => {
    if (!context?.independentReviewRecorded || context.requesterIsReviewer || busy) return
    if (!window.confirm('Publish this exact independently reviewed question to the approved school Question Bank? The source, answer key and revision will be checked again by the server.')) return
    doAction(() => academicReviewApi.changeStatus(context.publicId,'ready'),
      'The server approved this exact independently reviewed question for the school Question Bank.',
      context.publicId)
  }

  const startFilter = (value) => {
    setGrade(value);setOffset(0);setSelected(null);setContext(null);setError('');setNotice('')
  }

  if (!canReview) {
    return <main className="ar-shell"><div className="ar-panel ar-denied">
      <LockKeyhole size={28} />
      <h2>Academic review is restricted</h2>
      <p>Only an authorized school principal or administrator can access this workspace. Teachers can continue using the independent Paper Workspace.</p>
      <Link to="/question-bank">Return to Question Bank</Link>
    </div></main>
  }

  return (
    <main className="ar-shell">
      <header className="ar-top">
        <div className="ar-identity"><span className="ar-mark"><BookOpenCheck size={24}/></span>
          <div><div className="ar-school">AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</div>
            <span>Sharif Chowk, Rayya Khas, Narowal</span></div>
        </div>
        <Link to="/question-bank" className="ar-back"><ArrowLeft size={16}/> Question Bank</Link>
      </header>

      <div className="ar-intro">
        <div><span className="ar-eyebrow">PHASE 5 • GOVERNED ACADEMIC QUALITY</span>
          <h1>Academic Review Workspace</h1>
          <p>Grade 9–10 question verification, official source evidence and independent publication control.</p></div>
        <div className="ar-protection"><ShieldCheck size={23}/><div>
          <strong>Fail-closed approval</strong>
          <span>Unreviewed questions never enter automatic papers.</span></div></div>
      </div>

      <div className="ar-layout">
        <aside className="ar-panel ar-queue">
          <div className="ar-panel-heading"><div><h2>Review queue</h2><p>School-scoped provisional questions</p></div>
            <button type="button" className="ar-icon-button" onClick={refresh} aria-label="Refresh review queue" disabled={loading}><RefreshCw size={17}/></button></div>
          <div className="ar-filter">
            <div className="ar-segment">
              {['9th','10th'].map(option=><button type="button" key={option}
                className={grade===option?'ar-selected':''} onClick={()=>startFilter(option)}>
                Grade {option==='9th'?'9':'10'}</button>)}
            </div>
            <form onSubmit={e=>{e.preventDefault();setSubject(subjectDraft.trim());setOffset(0)}}>
              <label htmlFor="ar-subject-search">Filter by subject</label>
              <div className="ar-search"><input id="ar-subject-search" placeholder="e.g. Biology, Chemistry"
                value={subjectDraft} onChange={e=>setSubjectDraft(e.target.value)}/>
                <button type="submit" aria-label="Apply subject filter"><Search size={16}/></button>
              </div>
            </form>
            <form onSubmit={e=>{e.preventDefault();openExactQuestion()}}>
              <label htmlFor="ar-question-id">Open question ID</label>
              <div className="ar-search"><input id="ar-question-id" placeholder="Paste exact school question ID"
                value={questionIdDraft} onChange={e=>setQuestionIdDraft(e.target.value)}/>
                <button type="submit" disabled={busy} aria-label="Open exact question"><Search size={16}/></button>
              </div>
              <small>Use the ID shown on each row to revisit a question across pages or reviewer accounts.</small>
            </form>
          </div>
          <div className="ar-queue-count">{loading?'Loading…':`${total} unapproved questions`}</div>
          <div className="ar-queue-items">
            {questions.map(row=><button key={row.id} type="button"
              data-review-question-id={row.id}
              className={`ar-queue-item ${selected?.id===row.id?'ar-active':''}`}
              onClick={()=>loadContext(row)}>
              <span className="ar-row-top"><b>{row.subject || 'Subject'}</b><small>{row.chapter_no?'Ch. '+row.chapter_no:'Chapter unmapped'}</small></span>
              <span>{short(row.question_text || row.question_text_urdu,135)}</span>
              <span className="ar-queue-foot">
                <small>{row.question_type || 'Question'} · {Number(row.marks||1)} marks</small>
                <small>{row.governance_public_id?row.governance_lifecycle_status||'Governed':'Needs intake'}</small>
              </span></button>)}
            {!loading && questions.length===0 && <div className="ar-empty">
              <FileText size={25}/><b>No questions in this filter</b>
              <p>Check another subject or grade. The independent manual editor is still available.</p>
            </div>}
          </div>
          <div className="ar-pages"><button type="button" disabled={offset===0||loading}
              onClick={()=>setOffset(Math.max(0,offset-PAGE_SIZE))}><ArrowLeft size={15}/> Previous</button>
            <span>{total?offset+1:0}–{Math.min(total,offset+PAGE_SIZE)} of {total}</span>
            <button type="button" disabled={loading||offset+PAGE_SIZE>=total}
              onClick={()=>setOffset(offset+PAGE_SIZE)}>Next <ArrowRight size={15}/></button></div>
        </aside>

        <section className="ar-panel ar-review" aria-live="polite">
          {!selected ? <div className="ar-welcome"><ClipboardCheck size={39}/>
            <h2>Select a question to begin</h2>
            <p>Inspect its source, independent answers and current revision. Provisional content stays locked until a separate reviewer and releaser complete the checks.</p>
            <div className="ar-path">Intake <ArrowRight size={15}/> Review <ArrowRight size={15}/> Attest <ArrowRight size={15}/> Release</div>
          </div> : <>
            <div className="ar-review-head">
              <div><span className="ar-eyebrow">SCHOOL QUESTION BANK • {grade.toUpperCase()}</span>
                <h2>Question review</h2>
                <p>{selected.governance_public_id?'Governed record':'Unlinked provisional seed'} · {short(selected.id,26)}</p>
              </div>
              <div className="ar-status"><span>{context?.lifecycleStatus||selected.governance_lifecycle_status||'provisional'}</span></div>
            </div>
            {error && <div role="alert" className="ar-alert ar-error"><CircleAlert size={17}/><span>{error}</span></div>}
            {notice && <div role="status" className="ar-alert ar-success"><CheckCircle2 size={17}/><span>{notice}</span></div>}
            {contextLoading ? <div className="ar-loading">Loading school-scoped revision evidence…</div> : <>
              <QuestionPreview row={selected} question={context?.question}/>
              {!context && <div className="ar-stage">
                <div><h3>1. Register this provisional record</h3><p>Metadata-only intake links the existing school question to an immutable revision. It does not duplicate or approve it.</p></div>
                <button type="button" className="ar-primary" disabled={busy||!!selected.governance_public_id} onClick={intake}>
                  <LockKeyhole size={16}/> Create governed review record
                </button>
                {selected.governance_public_id && <p className="ar-hint">This record has a governance ID. Refresh to load its revision before proceeding.</p>}
              </div>}
              {context && <>
                <Ledger context={context}/>
                {context.lifecycleStatus==='candidate' && context.requesterIsOriginalAuthor && <div className="ar-stage ar-stage-column">
                  <div><h3>Author revision editor</h3>
                    <p>Edit only the school question, independently addressable MCQ options, answers and marks. The backend saves both the Question Bank source row and a new immutable revision in one transaction. Nothing is approved automatically.</p></div>
                  {!editing ? <button type="button" className="ar-secondary" disabled={busy}
                    onClick={() => {setEditValues(editableQuestionDraft(context.question));setEditing(true)}}>
                    <FileText size={16}/> Edit candidate revision
                  </button> : <div className="ar-edit-form">
                    <label>Question text (English)
                      <textarea rows={3} value={editValues?.question_text||''}
                        onChange={e=>setEditValues(x=>({...x,question_text:e.target.value}))}/></label>
                    <label>Question text (Urdu)
                      <textarea rows={3} dir="rtl" className="ar-urdu"
                        value={editValues?.question_text_urdu||''}
                        onChange={e=>setEditValues(x=>({...x,question_text_urdu:e.target.value}))}/></label>
                    {String(context.question?.questionType||'').toLowerCase()==='mcq' && <>
                      <h4>Editable MCQ options</h4>
                      <div className="ar-edit-options">{(editValues?.options||[]).map((option,i)=><label key={i}>
                        Option {'ABCD'[i]||i+1}<input value={option}
                        onChange={e=>setEditValues(x=>({...x,options:x.options.map((v,k)=>k===i?e.target.value:v)}))}/></label>)}</div>
                      <label>Correct option<select value={editValues?.correct_option||'A'}
                        onChange={e=>setEditValues(x=>({...x,correct_option:e.target.value}))}>
                        {['A','B','C','D'].map(c=><option key={c} value={c}>{c}</option>)}
                      </select></label>
                    </>}
                    <div className="ar-field-row">
                      <label>Model answer<input value={editValues?.answer||''}
                        onChange={e=>setEditValues(x=>({...x,answer:e.target.value}))}/></label>
                      <label>Marks<input type="number" min={1} max={25} value={editValues?.marks||1}
                        onChange={e=>setEditValues(x=>({...x,marks:e.target.value}))}/></label>
                    </div>
                    <label>Answer explanation<textarea rows={2} value={editValues?.explanation||''}
                      onChange={e=>setEditValues(x=>({...x,explanation:e.target.value}))}/></label>
                    <div className="ar-edit-buttons">
                      <button type="button" className="ar-primary" onClick={submitCorrection} disabled={busy}>
                        <ShieldCheck size={16}/> Save atomic correction
                      </button>
                      <button type="button" className="ar-secondary" onClick={() => setEditing(false)} disabled={busy}>
                        Cancel editing
                      </button>
                    </div>
                  </div>}
                </div>}
                {context.returnedForCorrection && <div role="status" className="ar-alert ar-warning">
                  <CircleAlert size={17}/> <span><strong>Returned for corrections:</strong> {context.correctionReason}</span>
                </div>}
                {context.lifecycleStatus==='candidate' && <div className="ar-stage">
                  <div><h3>2. Prepare for independent review</h3><p>Move to reviewed status, not approved status. A separate reviewer must inspect and attest to the actual evidence.</p></div>
                  <button type="button" disabled={busy||!!context.returnedForCorrection} onClick={prepare} className="ar-primary"><ClipboardCheck size={16}/> Prepare for academic review</button>
                </div>}
                {context.lifecycleStatus==='reviewed' && <>
                  <div className="ar-stage ar-stage-column">
                    <div><h3>3. Independent academic evidence</h3>
                      <p>Every attestation must represent checks actually performed against the textbook and question. This action never publishes a question.</p></div>
                    {context.requesterIsAuthor && <div className="ar-alert ar-warning"><LockKeyhole size={17}/> You authored this revision. Another authorized school reviewer must submit its academic evidence.</div>}
                    {context.independentReviewRecorded ? <div className="ar-alert ar-success"><CheckCircle2 size={17}/> Independent review recorded for this exact revision. Reviewer ID: {context.independentReviewerUserId||'—'}.</div> : <>
                      <div className="ar-field-row">
                        <label>Verified textbook source
                          <select value={sourceId} onChange={e=>setSourceId(e.target.value)}>
                            <option value="">Select exact official source</option>
                            {matchingSources.map(s=><option key={s.recordId} value={s.recordId}>
                              {s.recordId} · {s.subject} · {s.edition||'edition not confirmed'}</option>)}
                          </select></label>
                        <label>Question provenance
                          <select value={origin} onChange={e=>setOrigin(e.target.value)}>
                            <option value="ORIGINAL">Original authored question</option>
                            <option value="TEXTBOOK_EXERCISE">Textbook exercise question</option>
                          </select></label>
                      </div>
                      {chosenSource && <p className="ar-source-line">Source SHA-256: <code>{chosenSource.pdfSha256}</code></p>}
                      {!matchingSources.length && <div className="ar-alert ar-warning"><CircleAlert size={16}/> No hash-verified source matches this grade, subject and medium. Review is blocked until source identity is verified.</div>}
                      {origin==='TEXTBOOK_EXERCISE' && <div className="ar-field-row">
                        <label>Printed textbook page<input type="number" min={1} value={printedPage} onChange={e=>setPrintedPage(e.target.value)}/></label>
                        <label>Exercise reference<input placeholder="e.g. Exercise 1.2 Q3" value={exerciseReference} onChange={e=>setExerciseReference(e.target.value)} /></label>
                      </div>}
                      <div className="ar-checks">
                        {REVIEW_FIELDS.map(({key,label})=><label key={key}><input type="checkbox" checked={checks[key]===true}
                          onChange={e=>setChecks(current=>({...current,[key]:e.target.checked}))}/><span>{label}</span></label>)}
                      </div>
                      <label className="ar-notes">Independent editorial findings (minimum 45 characters)
                        <textarea rows={4} maxLength={2000} placeholder="Document which source pages and curriculum outcomes you checked, why the answer is correct, and any limitations."
                          value={notes} onChange={e=>setNotes(e.target.value)}/>
                        <small>{notes.trim().length}/45 minimum · Notes become part of the immutable academic review record</small>
                      </label>
                      <button type="button" className="ar-primary" disabled={!canSubmitReview}
                        onClick={submitReview}><ShieldCheck size={17}/> Record independent academic review</button>
                    </>}
                  </div>
                  {!context.requesterIsAuthor && <div className="ar-stage ar-stage-column">
                    <div><h3>Return for corrections</h3><p>Record a specific academic correction reason. The current review will be revoked, preserving the decision in the audit ledger. This does not approve the question.</p></div>
                    <label className="ar-notes">Reason for correction
                      <textarea rows={2} maxLength={2000} value={correctionReason}
                        placeholder="Explain the answer-key, curriculum, language or textbook evidence that must be corrected."
                        onChange={e=>setCorrectionReason(e.target.value)}/>
                      <small>{correctionReason.trim().length}/35 characters minimum</small>
                    </label>
                    <button type="button" className="ar-secondary" disabled={busy||correctionReason.trim().length<35} onClick={returnForCorrection}>
                      <CircleAlert size={16}/> Return question to author
                    </button>
                  </div>}
                  {context.independentReviewRecorded && <div className="ar-stage">
                    <div><h3>4. Independent release</h3>
                      <p>A separate authorized principal/admin must release this reviewed exact revision. The server rechecks source hashes, options, answers, marks and school scope.</p></div>
                    <button type="button" className="ar-publish" onClick={publish} disabled={busy||context.requesterIsReviewer}>
                      <ShieldCheck size={16}/> Approve verified question
                    </button>
                    {context.requesterIsReviewer && <p className="ar-hint">You recorded this review; a different authorized releaser must perform the final approval.</p>}
                  </div>}
                </>}
                {context.lifecycleStatus==='ready' && <div className="ar-alert ar-success"><CheckCircle2 size={19}/> This exact question revision has passed governed academic approval and may be selected through the canonical PaperDocument pipeline.</div>}
                {context.lifecycleStatus==='retired' && <div className="ar-alert ar-warning">This question has been retired and cannot be selected for examination.</div>}
              </>}
            </>}
          </>}
        </section>
      </div>
      <footer className="ar-footer">Academic Review V1 · No provisional question is autoapproved · Manual Paper Workspace remains independent.</footer>
    </main>
  )
}
