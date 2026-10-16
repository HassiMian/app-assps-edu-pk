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

test('student-safe paper projection strips real Question Bank answer aliases without losing answer-line layout', () => {
 const snapshot={
  subject:'Science',
  sections:[{nodes:[{
   id:'Q1',prompt:'Choose the correct answer.',answerLines:3,
   answerText:'PRIVATE_ANSWER_TEXT',answerExplanation:'PRIVATE_TEACHER_REASON',
   correctOptionId:'B',correctAnswerIndex:1,
   options:[
    {id:'A',text:'Water',isCorrect:false},
    {id:'B',text:'Oxygen',isCorrect:true,correct_option_id:'B'},
   ],
  }]}],
 }
 const safe=buildStudentSafeProjection(snapshot,{student:{displayName:'Synthetic Student',rollNo:'07'}})
 assert.equal(safe.paper.sections[0].nodes[0].prompt,'Choose the correct answer.')
 assert.equal(safe.paper.sections[0].nodes[0].answerLines,3,'Blank answer-line geometry was removed')
 assert.deepEqual(safe.paper.sections[0].nodes[0].options.map(o=>o.text),['Water','Oxygen'])
 assert.equal(safe.personalization.student.rollNumber,'07')
 for(const forbidden of ['PRIVATE_ANSWER_TEXT','PRIVATE_TEACHER_REASON','correctOptionId','correctAnswerIndex','isCorrect','correct_option_id']) {
  assert.equal(JSON.stringify(safe).includes(forbidden),false,`Student-visible answer alias leaked: ${forbidden}`)
 }
 assert.equal(containsForbiddenAnswerMaterial(snapshot),true,'Answer key alias was not detected in source')
 assert.equal(containsForbiddenAnswerMaterial(safe),false,'Student projection still contains answer metadata')
 const staff=buildStaffAnswerKeyProjection(snapshot,{role:'teacher'})
 assert.equal(staff.paper.sections[0].nodes[0].answerText,'PRIVATE_ANSWER_TEXT')
 assert.equal(staff.paper.sections[0].nodes[0].correctOptionId,'B')
 assert.equal(snapshot.sections[0].nodes[0].correctOptionId,'B','Source release mutated during sanitization')
})

// True/False expectedAnswer is a real PaperDocumentV2 field, not a printed prompt.
// Fail-before fixture: the old student projection included the private truth key.
test('canonical True/False expectedAnswer source metadata is absent from student-only print',()=>{
  const source={title:'Private source fixture',sections:[{nodes:[
    {kind:'TRUE_FALSE',statement:'The sun is a star.',hasIndicatorBox:true,expectedAnswer:true},
    {kind:'TRUE_FALSE',statement:'Ice is hot.',hasIndicatorBox:true,expected_answer:false},
    {kind:'TRUE_FALSE',statement:'Rain is water.',hasIndicatorBox:true,'expected-answer':true},
  ]}]}
  assert.equal(containsForbiddenAnswerMaterial(source),true,'private truth answers must be detected in release source')
  const safe=buildStudentSafeProjection(source,{student:{name:'Synthetic Student',rollNo:'09'}})
  for(const item of safe.paper.sections[0].nodes){
    assert.equal(item.hasIndicatorBox,true,'student-facing answer indicator must be preserved')
    assert.equal(Object.keys(item).some(k=>k.replace(/[^a-z0-9]/gi,'').toLowerCase()==='expectedanswer'),false,'student-visible true/false key leaked')
  }
  assert.equal(safe.paper.sections[0].nodes[0].statement,'The sun is a star.')
  assert.equal(safe.personalization.student.rollNumber,'09')
  assert.equal(containsForbiddenAnswerMaterial(safe),false)
  const staff=buildStaffAnswerKeyProjection(source,{role:'teacher'})
  assert.equal(staff.paper.sections[0].nodes[0].expectedAnswer,true)
  assert.equal(staff.paper.sections[0].nodes[1].expected_answer,false)
  assert.equal(source.sections[0].nodes[0].expectedAnswer,true,'release source mutated by projection')
})


// Real Paper Generator numerical payloads use finalAnswer, and older source
// banks include markingRubric. Neither is a student print instruction.
test('student-only print omits numerical final answers and marking rubrics',()=>{
  const source={sections:[{nodes:[
    {kind:'NUMERICAL',prompt:'Calculate the result.',answerLines:3,
      structuredData:{formula:'F = ma',finalAnswer:'PRIVATE_FINAL_9_8',steps:'Show working'},
      markingRubric:['PRIVATE_RUBRIC_1','PRIVATE_RUBRIC_2'],
      options:[{text:'Option A'},{text:'Option B'}]},
  ]}]}
  assert.equal(containsForbiddenAnswerMaterial(source),true,'source answer metadata must be flagged')
  const student=buildStudentSafeProjection(source,{student:{displayName:'Synthetic',rollNo:'04'}})
  const q=student.paper.sections[0].nodes[0]
  assert.equal(q.prompt,'Calculate the result.')
  assert.equal(q.answerLines,3)
  assert.deepEqual(q.options.map(o=>o.text),['Option A','Option B'])
  for (const leaked of ['PRIVATE_FINAL_9_8','PRIVATE_RUBRIC_1','PRIVATE_RUBRIC_2']) {
    assert.equal(JSON.stringify(student).includes(leaked),false,'student answer metadata leaked: '+leaked)
  }
  assert.equal(containsForbiddenAnswerMaterial(student),false)
  const staff=buildStaffAnswerKeyProjection(source,{role:'teacher'})
  assert.equal(staff.paper.sections[0].nodes[0].structuredData.finalAnswer,'PRIVATE_FINAL_9_8')
  assert.deepEqual(staff.paper.sections[0].nodes[0].markingRubric,['PRIVATE_RUBRIC_1','PRIVATE_RUBRIC_2'])
  assert.equal(source.sections[0].nodes[0].structuredData.finalAnswer,'PRIVATE_FINAL_9_8','signed original source mutated')
})
