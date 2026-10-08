process.env.DB_STARTUP_PROBE='false'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {ScoreState,buildQuestionInstances,summarizeResult,stableResultId}=require('../services/assessmentResults')

const snapshot={
  scoringPlan:{maximumObtainableMarks:20},
  sections:[
    {id:'q1',authoritativeSectionTotal:10},
    {id:'q2',operationalSectionTotal:10},
  ],
}

test('result model uses stable release-bound question instance ids',()=>{
  assert.deepEqual(buildQuestionInstances(snapshot),[
    {questionInstanceId:'q1',displayLabel:'Q1',maximumMarks:10},
    {questionInstanceId:'q2',displayLabel:'Q2',maximumMarks:10},
  ])
  assert.equal(stableResultId('release-a','student-1'),stableResultId('release-a','student-1'))
  assert.notEqual(stableResultId('release-a','student-1'),stableResultId('release-a','student-2'))
})

test('numeric zero is distinct from not attempted / absent / exempt / not checked',()=>{
  const r=summarizeResult(snapshot,[
    {questionInstanceId:'q1',state:ScoreState.SCORED,score:0},
    {questionInstanceId:'q2',state:ScoreState.NOT_ATTEMPTED},
  ])
  assert.equal(r.errors.length,0)
  assert.equal(r.instances[0].score,0)
  assert.equal(r.instances[0].state,'SCORED')
  assert.equal(r.instances[1].score,null)
  assert.equal(r.obtainedMarks,0)
  for(const state of ['ABSENT','NOT_CHECKED','EXEMPT']){
    const x=summarizeResult(snapshot,[{questionInstanceId:'q1',state},{questionInstanceId:'q2',state:'NOT_CHECKED'}])
    assert.equal(x.errors.length,0)
  }
})

test('result model rejects unknown instances and out-of-range scores',()=>{
  const r=summarizeResult(snapshot,[
    {questionInstanceId:'q1',state:'SCORED',score:11},
    {questionInstanceId:'foreign',state:'SCORED',score:1},
  ])
  assert.ok(r.errors.some(x=>x.includes('score must be between')))
  assert.ok(r.errors.some(x=>x.includes('unknown question instance')))
})
