const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  buildStudentSafeProjection,
  buildStaffAnswerKeyProjection,
  containsForbiddenAnswerMaterial,
  planPersonalizedBooklets,
} = require('../services/printJobPipeline')

test('student projection physically removes nested answer material',()=>{
  const release={
    metadata:{title:'Science Test'},
    sections:[{
      nodes:[
        {id:'q1',type:'mcq',stemText:'Water is?',answer:'Liquid',explanation:'Because...',options:[{label:'A',text:'Solid',isCorrect:false},{label:'B',text:'Liquid',isCorrect:true}]},
        {id:'q2',type:'matching_columns',correctMappings:{a:'b'},content:'Match these'},
      ],
    }],
    answerKey:{q1:'B'},
  }
  const projection=buildStudentSafeProjection(release,{student:{displayName:'Ali',rollNumber:'7',className:'Seven',section:'A'}})
  assert.equal(projection.projectionType,'STUDENT_SAFE')
  assert.equal(projection.personalization.student.displayName,'Ali')
  assert.equal(projection.paper.sections[0].nodes[0].stemText,'Water is?')
  assert.equal(projection.paper.sections[0].nodes[0].answer,undefined)
  assert.equal(projection.paper.sections[0].nodes[0].options[1].isCorrect,undefined)
  assert.equal(projection.paper.answerKey,undefined)
  assert.equal(containsForbiddenAnswerMaterial(projection),false)
})

test('answer-key projection is staff-only',()=>{
  const release={sections:[{nodes:[{id:'q1',answer:'A'}]}]}
  assert.throws(()=>buildStaffAnswerKeyProjection(release,{role:'student'}),e=>e.code==='ANSWER_KEY_ROLE_REQUIRED'&&e.status===403)
  const staff=buildStaffAnswerKeyProjection(release,{role:'teacher'})
  assert.equal(staff.paper.sections[0].nodes[0].answer,'A')
})

test('duplex planner pads odd booklets so each student starts on a front side',()=>{
  const plan=planPersonalizedBooklets({members:[{id:11},{id:12},{id:13}],pageCounts:{11:3,12:4,13:1},duplex:true})
  assert.deepEqual(plan.booklets.map(x=>({start:x.startPage,content:x.contentPages,pad:x.paddingPages})),[
    {start:1,content:3,pad:1},
    {start:5,content:4,pad:0},
    {start:9,content:1,pad:1},
  ])
  assert.equal(plan.totalPages,10)
  assert.ok(plan.booklets.every(x=>x.startPage%2===1))
})

test('simplex planner adds no padding',()=>{
  const plan=planPersonalizedBooklets({members:[{id:1},{id:2}],pageCounts:{1:3,2:1},duplex:false})
  assert.equal(plan.booklets[0].paddingPages,0)
  assert.equal(plan.booklets[1].startPage,4)
  assert.equal(plan.totalPages,4)
})

test('batch planner enforces bounded student count and positive page counts',()=>{
  assert.throws(()=>planPersonalizedBooklets({members:Array.from({length:501},(_,i)=>({id:i+1})),pageCounts:{},duplex:true}),e=>e.code==='PRINT_BATCH_LIMIT_EXCEEDED')
  assert.throws(()=>planPersonalizedBooklets({members:[{id:1}],pageCounts:{1:0}}),/Valid page count/)
})
