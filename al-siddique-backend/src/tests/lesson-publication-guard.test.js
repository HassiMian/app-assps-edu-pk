const test=require('node:test')
const assert=require('node:assert/strict')
const {mustHoldLessonPublication,privateLessonMutationAllowed,
 isLockedSourceDocument}=require('../services/lessonPlanningPublicationGuard')
test('weekly and term original-source drafts are blocked from parent/student publishing',()=>{
 for(const marker of ['ASSPS_TERM_NOTEBOOK_V1','ASSPS_WEEKLY_NOTEBOOK_V1']){
  assert.equal(mustHoldLessonPublication({plannerDocument:{provenance:{marker}}}),true)
  assert.equal(mustHoldLessonPublication({provenance:{marker}}),true)
 }
})
test('explicit academic publication hold cannot be bypassed by unfamiliar markers',()=>{
 assert.equal(mustHoldLessonPublication({plannerDocument:{
  provenance:{academicPublication:'BLOCKED'}}}),true)
 assert.equal(mustHoldLessonPublication({provenance:{academicPublication:'blocked'}}),true)
})
test('unmarked existing legacy plans retain existing manager authorization',()=>{
 assert.equal(mustHoldLessonPublication({plannerDocument:{
  provenance:{marker:'legacy',academicPublication:'REVIEWED'}}}),false)
 assert.equal(mustHoldLessonPublication(null),false)
})
test('top-level source hold cannot be overridden by misleading nested provenance',()=>{
 assert.equal(mustHoldLessonPublication({provenance:{marker:'ASSPS_TERM_NOTEBOOK_V1'},
  plannerDocument:{provenance:{marker:'unknown'}}}),true)
})

test('legacy Adiba unapproved source IDs remain immutable even if metadata is missing',()=>{
 for(const id of ['lp_c5_sst_adiba_20261014','lp_c6_pakstudies_adiba_20261014',
   'lp_primary_4assessment_adiba_20261014']){
   assert.equal(isLockedSourceDocument(id),true)
   assert.equal(mustHoldLessonPublication({},id),true)
   assert.equal(privateLessonMutationAllowed({}, {}, id),false)
 }
})
test('revision-safe private syllabus editing preserves immutable source identity',()=>{
 const old={plannerDocument:{
  planningType:'term',classLevel:'Four',section:'Blue',
  startDate:'2026-10-15',endDate:'2027-02-15',
  provenance:{marker:'ASSPS_TERM_NOTEBOOK_V1',sourceZipSha256:'a'.repeat(64),
   termKey:'four|blue|second term|2026-10-15',academicPublication:'BLOCKED'},
  subjects:[{subject:'English',units:[],lessons:[]}]
 }}
 const next=structuredClone(old)
 next.plannerDocument.subjects[0].units.push({label:'Synthetic Page 21'})
 assert.equal(privateLessonMutationAllowed(old,next,'lp-synthetic'),true)
 next.plannerDocument.provenance.sourceZipSha256='b'.repeat(64)
 assert.equal(privateLessonMutationAllowed(old,next,'lp-synthetic'),false)
 next.plannerDocument.provenance.sourceZipSha256='a'.repeat(64)
 next.plannerDocument.classLevel='Five'
 assert.equal(privateLessonMutationAllowed(old,next,'lp-synthetic'),false)
})
