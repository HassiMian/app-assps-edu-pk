import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TERM_MARKER,termKey,assertTermRange,buildTermOverview,termAssessmentRows,termAssessmentIssues,
  validateTermContent,buildTermServerPayload,eligibleTermPlans
} from '../termPlanningModel.js'
import {normalizeLessonPlanDocument} from '../lessonPlanDomain.js'
import {notebookModel} from '../weeklyNotebookModel.js'
import {buildWeeklyServerPayload} from '../weeklyServerPayload.js'
const sha='a'.repeat(64)
const source=[
 {candidate_key:'abc-english',source_subject_label:'English',
  source_submissions:['synthetic-source-1'],
  source_detail_records:[{source_id:'synthetic-source-1',source_excerpt_pieces:[
    {verbatim:'15 October to 21 October\nPage 31 to 40\nUnit 7: Formation of clouds'}]}]},
 {candidate_key:'abc-urdu',source_subject_label:'Urdu',
  source_submissions:['synthetic-source-2'],source_detail_records:[]}
]
const options={start:'2026-10-15',end:'2027-02-15'}
const rows=buildTermOverview(source,options)
test('term subject coverage includes every offered candidate, even undated subjects',()=>{
 assert.equal(rows.length,2)
 assert.deepEqual(rows.map(x=>x.id),['abc-english','abc-urdu'])
 assert.ok(rows.every(x=>x.needsReview))
 assert.ok(rows.some(x=>!x.sourceStatus.startsWith('SOURCE DATED')))
})
test('source and manual assessments remain separate numbered rows after subjects',()=>{
 const input=[{id:'abc-english',subject:'English',events:[
  {date:'2026-11-14',origin:'ORIGINAL_SOURCE',originalDate:'2026-11-14',
   name:'Assessment',subject:'English',sourceId:'source-a'}]}]
 const numbered=termAssessmentRows(input,[{id:'manual-1',date:'2026-12-04',
  subject:'',name:'Assessment',origin:'MANUAL_PROPOSAL'}])
 assert.equal(numbered.length,2)
 assert.equal(numbered[0].number,1)
 assert.equal(numbered[0].date,'2026-11-14')
 assert.equal(numbered[0].origin,'ORIGINAL_SOURCE')
 assert.equal(numbered[1].number,2)
 assert.equal(numbered[1].origin,'MANUAL_PROPOSAL')
 assert.equal(termAssessmentRows([],[]).length,0,'No subjects means no invented assessments')
})
test('term documents serialize all subject text, assessments, typography and source SHA',()=>{
 const fullText='Verified syllabus statement. '.repeat(67)
 const subjects=[{...rows[0],detail:fullText,pageFrom:'1',pageTo:'65'},
   {...rows[1],detail:'Urdu topic',pageFrom:'',pageTo:''}]
 const assessments=[{id:'manual-1',number:1,date:'2026-11-14',name:'Assessment',
  origin:'MANUAL_PROPOSAL'}]
 const payload=buildTermServerPayload({klass:'Four',section:'Blue',term:'Second Term',
  start:options.start,end:options.end,rows:subjects,assessments,
  design:{fontSize:17,headerSize:21,rowHeight:66,subjectWidth:32,
    fontFamily:'Georgia',schoolNameSize:22},sourceZipSha256:sha})
 assert.equal(payload.planningScope,'term')
 assert.equal(payload.plannerDocument.schemaVersion,3)
 assert.equal(payload.plannerDocument.provenance.marker,TERM_MARKER)
 assert.equal(payload.plannerDocument.provenance.academicPublication,'BLOCKED')
 assert.equal(payload.plannerDocument.termCoverageRows[0].detail,fullText)
 assert.equal(payload.plannerDocument.layoutSettings.rowHeight,66)
 assert.equal(payload.plannerDocument.assessments[0].date,'2026-11-14')
 const reopened=normalizeLessonPlanDocument({
  ...payload,id:'lp_real_synthetic',serverRevision:3})
 assert.equal(reopened.termCoverageRows[0].detail,fullText)
 assert.equal(reopened.layoutSettings.fontFamily,'Georgia')
 assert.equal(reopened.assessments[0].number,1)
 assert.equal(eligibleTermPlans([payload]).length,1)
 assert.equal(eligibleTermPlans([{...payload,plannerDocument:{
  ...payload.plannerDocument,provenance:{...payload.plannerDocument.provenance,
   academicPublication:'PUBLISHED'}}}]).length,0)
})
test('term source hash and date/coverage validation are strict',()=>{
 for(const [start,end] of [['2026-02-30','2026-03-02'],['2026-11-12','2026-11-01']])
   assert.throws(()=>assertTermRange(start,end))
 assert.throws(()=>validateTermContent({klass:'Four',start:options.start,end:options.end,
  rows:[{...rows[0],pageFrom:'90',pageTo:'40'}],assessments:[]}))
 assert.throws(()=>validateTermContent({klass:'Four',start:options.start,end:options.end,
  rows,assessments:[{number:1,date:'2027-07-01'}]}))
 assert.throws(()=>buildTermServerPayload({klass:'Four',section:'Blue',term:'Second Term',
  ...options,rows,assessments:[],sourceZipSha256:'invalid'}))
 assert.notEqual(termKey('Four','Blue','First Term','2026-10-15'),
  termKey('Four','Blue','Second Term','2026-10-15'))
})
test('no selected subjects means no weekly subjects, not ALL',()=>{
 const week={start:'2026-10-15',end:'2026-10-20',index:1}
 const a=notebookModel({candidates:source,klass:'Four',week,
  options,edits:{},subjects:[]})
 assert.equal(a.length,0)
})
test('duplicate class subject source identities are rejected',()=>{
 assert.throws(()=>validateTermContent({klass:'Four',...options,
  rows:[rows[0],rows[0]],assessments:[]}))
})

test('long weekly statements and selected A4 typography survive server serialization',()=>{
 const task='Unabridged synthetic lesson coverage / '.repeat(48)
 const row={id:'abc-english',subject:'English',task,sourceStatus:'SOURCE DATED',
  page:{from:11,to:21},assessments:[],activities:[],originalSourceIds:[]}
 const payload=buildWeeklyServerPayload({klass:'Four',section:'Blue',
  week:{start:'2026-10-15',end:'2026-10-20'},rows:[row],
  teacherLabel:'',sourceZipSha256:sha,design:{fontFamily:'Georgia',
   schoolNameSize:19,subjectNameSize:14,rowHeight:40}})
 const d=normalizeLessonPlanDocument(payload)
 assert.equal(d.provenance.fullWeeklyStatements['abc-english'],task)
 assert.equal(d.layoutSettings.fontFamily,'Georgia')
 assert.equal(d.layoutSettings.rowHeight,40)
 assert.equal(d.provenance.academicPublication,'BLOCKED')
})

test('First or Third Term never automatically inherits Second Term textbook/source dates',()=>{
 for(const term of ['First Term','Third Term']){
  const other=buildTermOverview(source,{...options,term})
  assert.equal(other.length,2)
  assert.ok(other.every(r=>r.detail===''&&r.pageFrom===''&&r.pageTo===''))
  assert.ok(other.every(r=>r.events.length===0&&r.originalSourceIds.length===0))
  assert.ok(other.every(r=>r.sourceStatus.includes('UNSOURCED')))
  const manual={...other[0],detail:'Teacher proposed unrelated term topic',
   pageFrom:'12',pageTo:'21'}
  const saved=buildTermServerPayload({klass:'Four',section:'Blue',term,
   start:options.start,end:options.end,rows:[manual,other[1]],
   assessments:[],sourceZipSha256:sha})
  assert.equal(saved.plannerDocument.provenance.sourceArchiveScope,'SECOND_TERM_ONLY')
  assert.equal(saved.plannerDocument.provenance.sourceApplicability,'UNSOURCED_MANUAL_DRAFT')
  assert.equal(saved.plannerDocument.provenance.academicPublication,'BLOCKED')
 }
})

test('Starter term assessment schedule assigns two unique working dates per subject and month',()=>{
 const classes=['English','Urdu','Mathematics','General Knowledge'].map((subject,i)=>({
   id:'starter-'+i,subject,events:[]}))
 const start='2026-10-15',end='2026-12-31'
 const dates=termAssessmentRows(classes,[],{start,end})
 assert.equal(dates.length,4*2*3)
 assert.equal(new Set(dates.map(a=>a.date)).size,dates.length)
 assert.deepEqual(termAssessmentIssues(classes,dates,{start,end}),[])
 for(const row of classes)for(const month of ['2026-10','2026-11','2026-12']){
   assert.equal(dates.filter(a=>a.subjectId===row.id&&a.date.startsWith(month)).length,2)
 }
 assert.ok(dates.every(a=>new Date(a.date+'T00:00:00Z').getUTCDay()!==0))
 assert.ok(dates.every(a=>a.academicApproval===false&&a.origin==='SCHOOL_POLICY_PROPOSAL'))
 const firstEnglish=dates.filter(a=>a.subjectId==='starter-0'&&a.date.startsWith('2026-10'))
 assert.deepEqual(firstEnglish.map(a=>a.date),['2026-10-17','2026-10-24'])
})
test('Source assessment dates never silently merge or move across subjects',()=>{
 const start='2026-10-15',end='2026-10-31'
 const rows=[
   {id:'en',subject:'English',events:[{date:'2026-10-17',origin:'ORIGINAL_SOURCE',sourceId:'e-17'}]},
   {id:'ur',subject:'Urdu',events:[{date:'2026-10-17',origin:'ORIGINAL_SOURCE',sourceId:'u-17'}]}
 ]
 const a=termAssessmentRows(rows,[],{start,end})
 assert.equal(a.filter(x=>x.date==='2026-10-17').length,2)
 assert.ok(termAssessmentIssues(rows,a,{start,end}).includes('ASSESSMENT_DATE_CONFLICT'))
 assert.equal(a.filter(x=>x.origin==='ORIGINAL_SOURCE').length,2)
})
test('No feasible two-per-subject timetable is explicitly held, not fabricated',()=>{
 const rows=Array.from({length:12},(_,i)=>({id:'subject-'+i,subject:'Subject '+i,events:[]}))
 const start='2026-10-28',end='2026-10-31'
 const assessments=termAssessmentRows(rows,[],{start,end})
 assert.ok(termAssessmentIssues(rows,assessments,{start,end}).includes('UNSCHEDULED_ASSESSMENT'))
})

test('replayed source-id overrides cannot move or relabel original academic assessment dates',()=>{
 const sourceRow=[{id:'en',subject:'English',events:[{
   date:'2026-10-17',originalDate:'2026-10-17',sourceId:'original-a',
   origin:'ORIGINAL_SOURCE',name:'Verified source test'
 }]}]
 const lockedId='src:en|2026-10-17|original-a|ORIGINAL_SOURCE'
 const changed={id:lockedId,subjectId:'en',subject:'English',date:'2026-10-19',
   name:'Forged reassignment',origin:'MANUAL_PROPOSAL'}
 const a=termAssessmentRows(sourceRow,[changed],{start:'2026-10-01',end:'2026-10-31'})
 const verified=a.find(x=>x.id===lockedId)
 assert.ok(verified)
 assert.equal(verified.date,'2026-10-17')
 assert.equal(verified.originalDate,'2026-10-17')
 assert.equal(verified.origin,'ORIGINAL_SOURCE')
 assert.equal(verified.name,'Verified source test')
 assert.equal(a.filter(x=>x.date==='2026-10-19').length,0)
 assert.deepEqual(termAssessmentIssues(sourceRow,a,{start:'2026-10-01',end:'2026-10-31'}),[])
})
test('source-engine proposals remain editable without claiming original approval',()=>{
 const row=[{id:'en',subject:'English',events:[{
   date:'2026-10-17',originalDate:'2026-10-17',sourceId:'proposed-a',
   origin:'PROPOSED',name:'Proposed assessment'
 }]}]
 const id='src:en|2026-10-17|proposed-a|PROPOSED'
 const dates=termAssessmentRows(row,[{id,subjectId:'en',subject:'English',
   date:'2026-10-19',origin:'MANUAL_PROPOSAL'}],{start:'2026-10-01',end:'2026-10-31'})
 const amended=dates.find(a=>a.id===id)
 assert.equal(amended.date,'2026-10-19')
 assert.equal(amended.origin,'MANUAL_PROPOSAL')
 assert.notEqual(amended.origin,'ORIGINAL_SOURCE')
})

test('manual replay cannot forge original academic provenance or source ID',()=>{
 const rows=[{id:'en',subject:'English',events:[{
   date:'2026-11-14',originalDate:'2026-11-14',
   origin:'PROPOSED',sourceId:'real-source',name:'Unapproved source proposal'
 }]}]
 const id='src:en|2026-11-14|real-source|PROPOSED'
 const a=termAssessmentRows(rows,[{id,subjectId:'en',subject:'Forged subject',
   date:'2026-11-18',origin:'ORIGINAL_SOURCE',sourceId:'forged',
   originalDate:'2026-11-18',academicApproval:true}],{
   start:'2026-11-01',end:'2026-11-30'})
 const amended=a.find(item=>item.id===id)
 assert.equal(amended.date,'2026-11-18')
 assert.equal(amended.subject,'English')
 assert.equal(amended.origin,'MANUAL_PROPOSAL')
 assert.equal(amended.sourceId,'real-source')
 assert.equal(amended.originalDate,'2026-11-14')
 assert.equal(amended.academicApproval,false)
})

test('standalone draft assessment cannot claim academic source or approval',()=>{
 const rows=[{id:'en',subject:'English',events:[]}]
 const a=termAssessmentRows(rows,[{id:'manual-one',subjectId:'en',
   date:'2026-11-18',origin:'ORIGINAL_SOURCE',originalDate:'2026-10-01',
   sourceId:'forged-source',academicApproval:true}],{
   start:'2026-11-01',end:'2026-11-30'})
 const manual=a.find(item=>item.id==='manual-one')
 assert.equal(manual.origin,'MANUAL_PROPOSAL')
 assert.equal(manual.academicApproval,false)
 assert.equal(manual.originalDate,'')
 assert.equal(manual.sourceId,'')
})

test('unknown replayed source alias cannot steal an assessment date',()=>{
 const rows=[{id:'en',subject:'English',events:[]}]
 const a=termAssessmentRows(rows,[{
   id:'src:en|2026-10-17|foreign|ORIGINAL_SOURCE',
   subjectId:'en',date:'2026-10-17',origin:'ORIGINAL_SOURCE'
 }],{start:'2026-10-15',end:'2026-10-31'})
 assert.equal(a.some(item=>item.id.includes('foreign')),false)
 assert.equal(a.filter(item=>item.date==='2026-10-17').length,1)
 assert.deepEqual(termAssessmentIssues(rows,a,{start:'2026-10-15',end:'2026-10-31'}),[])
})

test('server payload rejects a forged ORIGINAL_SOURCE identity even if called directly',()=>{
 const row={id:'en',subject:'English',detail:'Practice',events:[]}
 assert.throws(()=>buildTermServerPayload({klass:'Four',section:'Blue',
   term:'Second Term',start:'2026-11-01',end:'2026-11-30',rows:[row],
   assessments:[{id:'manual-forged',subjectId:'en',subject:'English',
     name:'Assessment',date:'2026-11-18',origin:'ORIGINAL_SOURCE'}],
   sourceZipSha256:sha}),/verified source/)
 assert.throws(()=>buildTermServerPayload({klass:'Four',section:'Blue',
   term:'Second Term',start:'2026-11-01',end:'2026-11-30',rows:[row],
   assessments:[{id:'manual-forged',subjectId:'en',subject:'English',
     name:'Assessment',date:'2026-11-18',origin:'MANUAL_PROPOSAL',
     academicApproval:true}],sourceZipSha256:sha}),/Academic approval/)
})

test('server payload preserves genuine locked original and rejects date rewrite',()=>{
 const sourceEvent={date:'2026-11-14',origin:'ORIGINAL_SOURCE',
   sourceId:'publisher-evidence',name:'Original assessment'}
 const row={id:'en',subject:'English',detail:'Practice',events:[sourceEvent]}
 const args={klass:'Four',section:'Blue',term:'Second Term',
   start:'2026-11-01',end:'2026-11-30',rows:[row],sourceZipSha256:sha}
 const original=termAssessmentRows([row],[],{start:args.start,end:args.end})
   .find(a=>a.origin==='ORIGINAL_SOURCE')
 const saved=buildTermServerPayload({...args,assessments:[original]})
 assert.equal(saved.assessments[0].date,'2026-11-14')
 assert.equal(saved.assessments[0].sourceId,'publisher-evidence')
 assert.throws(()=>buildTermServerPayload({...args,assessments:[
   {...original,date:'2026-11-18'}]}),/provenance cannot be rewritten/)
})
