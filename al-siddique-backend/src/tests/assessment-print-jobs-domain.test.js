const test = require('node:test')
const assert = require('node:assert/strict')
const { createPrintJobBinding, normalizeRosterSnapshot, paddedPageCount, printJobTransition, buildStudentSafeProjection, buildStaffAnswerKeyProjection, containsForbiddenAnswerMaterial } = require('../services/assessmentPrintJobs')

test('roster snapshot is deterministic and privacy-minimal', () => {
  const input={context:{classId:7,className:'Seven',section:'A',session:'2026-27'},students:[{id:11,name:'Student One',roll_no:'07',section:'A',phone:'SECRET',address:'SECRET'}]}
  const a=normalizeRosterSnapshot(input); const b=normalizeRosterSnapshot(input)
  assert.equal(a.rosterHash,b.rosterHash); assert.equal(a.studentCount,1)
  assert.deepEqual(Object.keys(a.students[0]).sort(),['displayName','rollNo','section','studentId'].sort())
  assert.equal('phone' in a.students[0],false); assert.equal('address' in a.students[0],false)
})

test('duplicate student ids fail closed',()=>{
  assert.throws(()=>normalizeRosterSnapshot({students:[{id:1},{id:1}]}),/Duplicate roster student id/)
})

test('personalized duplex job freezes exact front-side booklet plan into immutable binding',()=>{
  const job=createPrintJobBinding({
    releaseId:'release-paper-r1',
    personalized:true,
    roster:{students:[{id:1,name:'One'},{id:2,name:'Two'}]},
    teacherBinding:{id:44,name:'Sir Haseeb',subject:'Science',classId:7,section:'A'},
    renderSettings:{
      duplex:true,copyCount:1,pageSize:'A4',
      rendererVersion:'renderer-test',
      browserEngineVersion:'chromium-test',
      studentPageCounts:{'1':3,'2':4},
    },
  })
  assert.equal(job.studentBoundaryPolicy,'START_EACH_STUDENT_ON_FRONT')
  assert.equal(job.rosterSnapshot.studentCount,2)
  assert.match(job.bindingHash,/^[a-f0-9]{64}$/)
  assert.deepEqual(job.renderSettings.bookletPlan,[
    {studentId:'1',ordinal:1,contentPages:3,paddingPages:1,startPage:1,endPage:4},
    {studentId:'2',ordinal:2,contentPages:4,paddingPages:0,startPage:5,endPage:8},
  ])
  assert.equal(job.renderSettings.totalPages,8)
  assert.equal(job.renderSettings.rendererVersion,'renderer-test')
  assert.equal(job.renderSettings.browserEngineVersion,'chromium-test')
  assert.equal(paddedPageCount(3,{personalized:true,duplex:true}),4)
  assert.equal(paddedPageCount(4,{personalized:true,duplex:true}),4)
  assert.throws(()=>createPrintJobBinding({
    releaseId:'release-paper-r1',
    personalized:true,
    roster:{students:[{id:1,name:'One'}]},
    renderSettings:{duplex:true,studentPageCounts:{'1':1,'999':1}},
  }),/Unknown roster student id/)
})

test('generic copies do not require roster and never claim personalized boundary',()=>{
  const job=createPrintJobBinding({releaseId:'release-paper-r1',personalized:false,renderSettings:{copyCount:35,duplex:true}})
  assert.equal(job.rosterSnapshot,null); assert.equal(job.copyCount,35); assert.equal(job.studentBoundaryPolicy,'NOT_APPLICABLE')
})

test('copy count and reprint mode validate fail closed',()=>{
  assert.throws(()=>createPrintJobBinding({releaseId:'r',renderSettings:{copyCount:0}}),/copyCount/)
  assert.throws(()=>createPrintJobBinding({releaseId:'r',reprintMode:'LATEST'}),/Invalid reprint mode/)
})


test('print lifecycle increments attempts only when physical printing starts',()=>{
  assert.deepEqual(printJobTransition('CREATED','QUEUED',0),{status:'QUEUED',attemptCount:0})
  assert.deepEqual(printJobTransition('QUEUED','PRINTING',0),{status:'PRINTING',attemptCount:1})
  assert.deepEqual(printJobTransition('FAILED','QUEUED',1),{status:'QUEUED',attemptCount:1})
  assert.deepEqual(printJobTransition('QUEUED','PRINTING',1),{status:'PRINTING',attemptCount:2})
  assert.throws(()=>printJobTransition('COMPLETED','QUEUED',1),/Invalid print job transition/)
})

test('student-safe projection recursively strips answer and teacher-only material', () => {
  const release={
    title:'Science Test',
    sections:[{nodes:[{
      id:'q1',prompt:'Water freezes at?',answer:'0 C',correctAnswer:'0 C',explanation:'Teacher explanation',
      options:[{text:'0 C',isCorrect:true},{text:'100 C',isCorrect:false}],
      markingScheme:{points:2},teacherNotes:'Do not show',
    }]}],
  }
  const projection=buildStudentSafeProjection(release,{
    student:{displayName:'Student One',rollNo:'07',className:'Seven',section:'A'},
    teacher:{teacherName:'Sir Haseeb',subjectName:'Science'},
  })
  assert.equal(projection.projectionType,'STUDENT_SAFE')
  assert.equal(projection.paper.sections[0].nodes[0].prompt,'Water freezes at?')
  assert.equal(containsForbiddenAnswerMaterial(projection),false)
  assert.equal(projection.personalization.student.rollNumber,'07')
  assert.equal(projection.personalization.teacher.subject,'Science')
})

test('answer-key projection is staff-only and preserves release answers for authorized staff', () => {
  const release={sections:[{nodes:[{id:'q1',answer:'A'}]}]}
  assert.throws(
    ()=>buildStaffAnswerKeyProjection(release,{role:'student'}),
    error=>error.code==='ANSWER_KEY_ROLE_REQUIRED' && error.status===403,
  )
  const staff=buildStaffAnswerKeyProjection(release,{role:'teacher'})
  assert.equal(staff.projectionType,'STAFF_ANSWER_KEY')
  assert.equal(staff.paper.sections[0].nodes[0].answer,'A')
})
