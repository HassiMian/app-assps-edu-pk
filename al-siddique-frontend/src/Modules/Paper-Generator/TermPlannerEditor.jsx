import {Save,Printer,Plus,RotateCcw,BookOpen} from 'lucide-react'
import {termAssessmentRows,termAssessmentIssues} from './termPlanningModel.js'
import { changeSubjectTypography, normalizeSubjectTypography } from './plannerSubjectTypography.js'
import './TermPlannerEditor.css'

const fonts=['Times New Roman','Arial','Georgia','Inter']
const urduFonts=['Jameel Noori Nastaleeq','Noto Nastaliq Urdu','Noto Naskh Arabic']
const numberLabel=(n)=>'Assessment '+n
const shortDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?
  value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(2,4):value
const studentId=s=>String(s?.id||s?.student_id||s?.gr_number||s?.roll_number||'')
const studentName=s=>String(s?.name||s?.student_name||s?.full_name||[s?.first_name,s?.last_name].filter(Boolean).join(' ')||'Student')
const studentRoll=s=>String(s?.roll_number||s?.roll_no||s?.gr_number||'')

export default function TermPlannerEditor({klass,section,term,start,end,setTerm,rows,
  logoSrc='/school-logo.svg',schoolName='AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
  studentPages=[null],studentChoices=[],studentSelection=null,onStudentSelection=()=>{},
  onChangeRow,assessments,onChangeAssessment,onAddAssessment,onRemoveAssessment,design,onChangeDesign,
  onResetDesign,onSave,onPrint,saving,savedPlans,onOpenSaved,status}){
  const printableAssessments=assessments.length?assessments:termAssessmentRows([],[])
  const assessmentIssues=termAssessmentIssues(rows,printableAssessments,{start,end})
  const groupedPages=Array.from({length:Math.ceil(studentPages.length/(Number(design.termCardsPerPage)||2))},
    (_,i)=>studentPages.slice(i*(Number(design.termCardsPerPage)||2),(i+1)*(Number(design.termCardsPerPage)||2)))
  const headerStyle={
    '--term-text-size':design.fontSize+'px',
    '--term-head-size':design.headerSize+'px',
    '--term-school-name':(design.schoolNameSize||17)+'px',
    '--term-subject-name':normalizeSubjectTypography(design).subjectNameSize+'px',
    '--term-subject-weight':normalizeSubjectTypography(design).subjectNameBold ? 750 : 450,
    '--term-urdu-font':design.urduFontFamily||'Jameel Noori Nastaleeq',
    '--term-row-height':design.rowHeight+'px',
    '--term-subject-width':design.subjectWidth+'%',
    '--term-assessment-width':(design.assessmentWidth||55)+'%',
    '--term-text-family':design.fontFamily||'Times New Roman',
    '--term-student-size':(design.studentNameSize||13)+'px',
    '--term-line-height':design.tableLineHeight||1.45,
    '--term-assessment-font':(design.assessmentFontSize||11)+'px',
    '--term-page-padding':(design.pagePaddingMm||6)+'mm'
  }
  return <div className="term-planner" data-term-planner>
    <div className="term-hero">
      <div><strong>Term-wise Syllabus & Assessment Planner</strong>
        <p>Full class curriculum in one editable sheet. All source facts remain subject to school verification.</p></div>
      <label>Term
        <select aria-label="Academic term" value={term} onChange={e=>setTerm(e.target.value)}>
          <option>First Term</option><option>Second Term</option><option>Third Term</option>
        </select>
      </label>
    </div>
    <div className="term-split">
      <section className="term-inputs">
        {term!=='Second Term'&&<p className="term-warning" role="alert">
          Only Second Term original curriculum evidence is loaded. This is an unpublished,
          unsourced {term} template. Enter genuine term topics, page ranges and assessment
          dates; no Second Term topics are copied automatically.
        </p>}
        <section className="term-roster-editor" aria-label="Personalized term student roster">
          <h4>Student names <small>{studentChoices.length} authorized students</small></h4>
          <p className="term-hint">Same authenticated student roster as Weekly. Names are used for rendering only, not stored in term source drafts.</p>
          <div className="term-roster-actions">
            <button type="button" onClick={()=>onStudentSelection(null)}>Select all</button>
            <button type="button" onClick={()=>onStudentSelection([])}>Clear</button>
          </div>
          <div className="term-roster-list">
            {studentChoices.map(st=><label key={studentId(st)}>
              <input type="checkbox" checked={studentSelection===null||studentSelection.includes(studentId(st))}
               onChange={e=>onStudentSelection(current=>{
                 const ids=current===null?studentChoices.map(studentId):current
                 return e.target.checked?[...new Set([...ids,studentId(st)])]:ids.filter(x=>x!==studentId(st))
               })}/>
              <span>{studentName(st)}</span>
            </label>)}
          </div>
          {!studentChoices.length&&<p className="term-hint">Only a blank example prints until an authenticated roster is available.</p>}
        </section>
        <h4>Subject & page-range editor <small>{rows.length} subjects</small></h4>
        {rows.map(row=><div className="term-edit-subject" key={row.id} data-term-edit-subject>
          <div className="term-edit-name"><strong>{row.subject}</strong>
            <small>{row.sourceStatus}</small></div>
          <label>Syllabus / topics / chapters
            <textarea rows={3} aria-label={row.subject+' term coverage'}
              value={row.detail} maxLength={6000}
              onChange={e=>onChangeRow(row.id,{detail:e.target.value})}/>
          </label>
          <div className="term-page-inputs">
            <label>Page from
              <input type="number" min="1" max="9999"
                aria-label={row.subject+' page from'} value={row.pageFrom} readOnly={Boolean(row.sourcePageFrom)}
                onChange={e=>onChangeRow(row.id,{pageFrom:e.target.value})}/></label>
            <label>Page to
              <input type="number" min="1" max="9999"
                aria-label={row.subject+' page to'} value={row.pageTo} readOnly={Boolean(row.sourcePageTo)}
                onChange={e=>onChangeRow(row.id,{pageTo:e.target.value})}/></label>
          </div>
          {row.warnings.length>0&&<small className="term-warning">Original-source review: {row.warnings.join(' · ')}</small>}
          <button type="button" className="term-small-action" onClick={()=>onAddAssessment(row.id)}>
            <Plus size={12}/> Add {row.subject} assessment
          </button>
        </div>)}
        <h4>Assessments — per subject (2/month)</h4>
        <p className="term-hint">Dates are class-wide unique and appear under the corresponding subject. Proposed dates are not official until reviewed; original source dates are never overwritten.</p>
        {!!assessmentIssues.length&&<p role="alert" className="term-warning" data-term-schedule-hold>
          Print on hold: {assessmentIssues.join(', ')}. Correct the affected dates before printing.
        </p>}
        <table className="term-edit-assessments">
          <thead><tr><th>Assessment</th><th>Date</th></tr></thead>
          <tbody>{printableAssessments.map(a=><tr key={a.id}>
            <th>{numberLabel(a.number)}
              {a.subject&&<small>{a.subject}</small>}
              {a.originalDate&&<small>Source: {a.originalDate}</small>}
            </th><td><input type="date" aria-label={a.subject+' '+numberLabel(a.number)+' date'}
              data-assessment-id={a.id} value={a.date||''} disabled={a.origin==='ORIGINAL_SOURCE'}
              onChange={e=>onChangeAssessment(a.id,e.target.value)}/>
              {(a.id.startsWith('manual-')||a.id.startsWith('blank-'))&&
                <button className="term-small-action" onClick={()=>onRemoveAssessment(a.id)}>Remove</button>}
              {a.id.startsWith('src:')&&a.origin==='MANUAL_PROPOSAL'&&
                <button className="term-small-action" onClick={()=>onRemoveAssessment(a.id)}>Restore source date</button>}
            </td>
          </tr>)}</tbody>
        </table>
        <button className="term-add" onClick={onAddAssessment}><Plus size={14}/> Add assessment</button>
        <h4>Document formatting</h4>
        <label className="term-template-choice">Professional print template
          <select aria-label="Term print template" value={design.termTemplate||'ivory'}
           onChange={e=>onChangeDesign('termTemplate',e.target.value)}>
            <option value="ivory">Signature Ivory · restrained premium</option>
            <option value="teal">Ferozi Academic · vibrant minimal</option>
            <option value="silver">Silver Executive · formal minimal</option>
          </select>
        </label>
        <div className="term-controls">
          <label>Students per A4 term sheet
            <select aria-label="Term students per page" value={design.termCardsPerPage||2}
              onChange={e=>onChangeDesign('termCardsPerPage',Number(e.target.value))}>
              {[2,3,4].map(n=><option value={n} key={n}>{n} students / page</option>)}
            </select>
          </label>
          <label>English font family
            <select aria-label="Term English font" value={design.fontFamily||'Times New Roman'}
              onChange={e=>onChangeDesign('fontFamily',e.target.value)}>
              {fonts.map(f=><option key={f}>{f}</option>)}
            </select></label>
          <label>Urdu font family
            <select aria-label="Term Urdu font" value={design.urduFontFamily||'Jameel Noori Nastaleeq'}
              onChange={e=>onChangeDesign('urduFontFamily',e.target.value)}>
              {urduFonts.map(f=><option key={f}>{f}</option>)}
            </select></label>
          {[
            ['fontSize','Body text size',9,20,'px'],

            ['headerSize','Section heading',11,26,'px'],
            ['schoolNameSize','School name/header',12,30,'px'],
            ['rowHeight','Row minimum height',22,80,'px'],
            ['subjectWidth','Subject column width',18,45,'%'],
            ['assessmentWidth','Assessment label width',35,70,'%'],
            ['studentNameSize','Student name size',10,23,'px'],
            ['assessmentFontSize','Assessment text size',9,19,'px'],
            ['pagePaddingMm','A4 narrow page padding',4,13,'mm'],
          ].map(([name,label,min,max,unit])=><label key={name}>{label}
            <span>{design[name]||({subjectNameSize:12,schoolNameSize:17,assessmentWidth:55}[name])}{unit}</span>
            <input type="range" min={min} max={max}
              value={design[name]||({subjectNameSize:12,schoolNameSize:17,assessmentWidth:55}[name])}
              onChange={e=>onChangeDesign(name,Number(e.target.value))}/>
          </label>)}
          <label>Teaching line spacing
            <span>{design.tableLineHeight||1.45}</span>
            <input type="range" min="1.2" max="2" step="0.05"
              value={design.tableLineHeight||1.45}
              onChange={e=>onChangeDesign('tableLineHeight',Number(e.target.value))}/>
          </label>
          <div className="term-subject-typography-controls" aria-label="Term subject typography">
            <span>Subject name size &amp; bold</span>
            <div className="term-subject-size-stepper">
              <button type="button" aria-label="Decrease term subject size"
                onClick={()=>onChangeDesign('subjectNameSize',changeSubjectTypography(design,'smaller').subjectNameSize)}>−</button>
              <output aria-live="polite">{normalizeSubjectTypography(design).subjectNameSize}px</output>
              <button type="button" aria-label="Increase term subject size"
                onClick={()=>onChangeDesign('subjectNameSize',changeSubjectTypography(design,'larger').subjectNameSize)}>+</button>
              <button type="button" aria-label="Toggle term subject bold"
                aria-pressed={normalizeSubjectTypography(design).subjectNameBold}
                onClick={()=>onChangeDesign('subjectNameBold',!normalizeSubjectTypography(design).subjectNameBold)}>B</button>
            </div>
            <input type="range" aria-label="Term subject font size slider" min="10" max="23"
              value={normalizeSubjectTypography(design).subjectNameSize}
              onChange={e=>onChangeDesign('subjectNameSize',Number(e.target.value))}/>
          </div>
          <button onClick={onResetDesign}><RotateCcw size={13}/> Reset formatting</button>
        </div>
        <h4>Server-saved term plans</h4>
        <div className="term-saved">
          {savedPlans.map(plan=><button key={plan.id} onClick={()=>onOpenSaved(plan)}>
            <BookOpen size={13}/>{plan.termLabel} · {plan.startDate} · revision {plan.serverRevision}
          </button>)}
          {!savedPlans.length&&<p className="term-hint">No term drafts saved to the school server for this class.</p>}
        </div>
      </section>
      <section className="term-preview-wrap">
        <header className="term-preview-actions">
          <div><strong>Live Term A4 Preview</strong><small>Assessments inside each subject · {design.termCardsPerPage||2} students / sheet</small></div>
          <div><button disabled={saving||!rows.length} onClick={onSave}><Save size={15}/>{saving?'Saving…':'Save Term'}</button>
          <button className="primary" onClick={onPrint} disabled={!rows.length||!!assessmentIssues.length}><Printer size={15}/> Print / PDF</button></div>
        </header>
        <div className="term-preview-scroll">
          <div id="wn-term-print" className="term-print-pages">
          {groupedPages.map((group,pageIndex)=>
          <section key={pageIndex} className="term-print-sheet" data-term-print-sheet
            style={{'--term-cards-per-sheet':design.termCardsPerPage||2}}>
          {group.map(student=>
          <article key={student?studentId(student):'blank'} className={'term-print-document term-template-'+(design.termTemplate||'ivory')} style={headerStyle}>
            <header className="term-letterhead">
              <img src={logoSrc} alt="School logo"/>
              <div><h2>{schoolName}</h2>
                <strong>{term.toUpperCase()} — SYLLABUS & ASSESSMENT PLAN</strong>
                <p>Sharif Chowk, Rayya Khas, Narowal</p></div>
            </header>
            <div className="term-meta"><span>Class: <b>{klass}</b></span>
              <span>Section: <b>{section||'All'}</b></span>
              <span>Term: <b>{term}</b></span>
              <span>Dates: <bdi>{start} – {end}</bdi></span></div>
            <div className="term-student-identification">
              <strong>Student: {student?studentName(student):'________________________'}</strong>
              <span>Roll: {student?studentRoll(student)||'—':'____________'}</span>
            </div>
            {term!=='Second Term'&&<p className="term-print-unsourced">
              UNVERIFIED {term.toUpperCase()} — Teacher-proposed content;
              no original term syllabus has been approved.
            </p>}
            <table className="term-print-subjects">
              <thead><tr><th>SUBJECT</th><th>TERM SYLLABUS / CHAPTERS / PAGE RANGE</th></tr></thead>
              <tbody>{rows.map(row=><tr key={row.id}>
                <th>{row.subject}</th>
                <td>
                  <div dir="auto" className={
                    /Urdu|Islamiyat|Islamiat|Pakistan Studies|اردو|قرآن|Quran/i.test(row.subject)?
                    'term-urdu-content':'term-english-content'}>
                    {row.detail||'Source coverage to be confirmed'}
                  </div>
                  {row.pageFrom&&row.pageTo&&
                    !(/(?:Pages?|صفحہ نمبر)\s*\d+/iu.test(row.detail||''))&&
                    <small className="term-pages">
                    Pages: <bdi>{row.pageFrom} – {row.pageTo}</bdi></small>}
                  <div className="term-subject-assessments" aria-label={row.subject+' assessments'}>
                    {printableAssessments.filter(a=>a.subjectId===row.id).map(a=>
                      <span className="term-assessment-chip" key={a.id}>
                        <b>{numberLabel(a.number)}</b> <bdi dir="ltr" title={a.date||''}>{shortDate(a.date)||'Not scheduled'}</bdi>
                      </span>)}
                  </div>
                </td></tr>)}</tbody>
            </table>
            <div className="term-document-foot">Private academic draft · Verify textbook pages, dates and subject coverage before school publication.</div>
          </article>)}
          </section>)}
          </div>
          {studentPages.length===0&&<p className="term-hint" role="alert">Select at least one student before printing.</p>}
        </div>
        {status&&<p className="term-hint" role="status">{status}</p>}
      </section>
    </div>
  </div>
}
