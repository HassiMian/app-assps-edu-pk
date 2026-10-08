'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {summarizeSchool,buildReport}=require('./phase4-review-backlog.cjs')
const school=(id,code)=>({schoolId:id,schoolCode:code,role:'apex_app_runtime',grades:['9th','10th'],readyChapters:0,inspectedChapters:1,approvedQuestions:0,discoveredQuestions:8,coverageReady:false,mcqAnswerKeys:{total:3},chapters:[{grade:'9th',subject:'Biology',chapter:'1',discovered:8,approved:0,needsSourcePageReview:8,ready:false,missing:{mcq:5,short:5,long:1}}]})
test('provisional questions never become paper-ready merely because discovered',()=>{
  const s=summarizeSchool(school(1,'assps'))
  assert.equal(s.readyChapters,0)
  assert.equal(s.coverageReady,false)
  assert.equal(s.chapterBacklog[0].reviewPriority,'SOURCE_AND_ACADEMIC_REVIEW')
  assert.equal(s.chapterBacklog[0].approved,0)
})
test('school scopes may not be silently merged or mislabeled',()=>{
  const combined=buildReport([school(1,'assps'),school(5,'al-siddique')])
  assert.equal(combined.chapters.length,2)
  assert.deepEqual(combined.tenantSummaries.map(r=>r.schoolId),[1,5])
  assert.equal(combined.automatedPaperCertification,'BLOCKED_UNTIL_SOURCE_PAGE_ACADEMIC_REVIEW')
  assert.throws(()=>buildReport([school(1,'assps'),school(1,'assps')]),/CROSS_TENANT/)
})
test('academic source evidence is required to compile a review backlog',()=>{
  assert.throws(()=>summarizeSchool({...school(1,'assps'),role:'postgres'}),/GOVERNANCE/)
  assert.throws(()=>summarizeSchool({...school(1,'assps'),schoolCode:'al-siddique'}),/INVALID_EXPLICIT/)
  assert.throws(()=>summarizeSchool({...school(1,'assps'),chapters:[{...school(1,'assps').chapters[0],grade:'8th'}]}),/UNKNOWN_GRADE/)
})
