import test from 'node:test'
import assert from 'node:assert/strict'
import {buildCheckingStripModel} from '../../AssessmentStudio/core/checkingStrip.js'

test('checking strip is ScoringPlan-driven and does not store obtained marks in paper content',()=>{
 const paper={userAuthored:true,canonicalDocument:{
  scoringPlan:{maximumObtainableMarks:20},
  sections:[
   {id:'q1',authoritativeSectionTotal:8},
   {id:'q2',operationalSectionTotal:12},
  ],
 }}
 const model=buildCheckingStripModel({paper,config:{totalMarks:99}})
 assert.equal(model.enabled,true)
 assert.equal(model.maximumMarks,20)
 assert.deepEqual(model.entries.map(x=>[x.questionInstanceId,x.label,x.maximumMarks]),[['q1','Q1',8],['q2','Q2',12]])
 assert.equal('obtainedMarks' in paper,false)
})

test('protected/reference paper does not gain checking strip unless explicitly enabled',()=>{
 const paper={official_section:[{id:'a',marks:5}]}
 assert.equal(buildCheckingStripModel({paper,config:{totalMarks:5}}).enabled,false)
 assert.equal(buildCheckingStripModel({paper,config:{totalMarks:5,showCheckingStrip:true}}).enabled,true)
})
