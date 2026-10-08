const test = require('node:test')
const assert = require('node:assert/strict')
const { chapterStatus,aggregateStatus,BASIC_RECIPE } = require('../check-school-exam-readiness.cjs')

const record = (overrides = {}) => ({
  class_level:'9th',subject:'Chemistry',chapter_no:'1',discovered:'40',
  approved:'11',mcq_approved:'5',short_approved:'5',long_approved:'1',
  missing_source_page:'0',...overrides,
})

test('minimum chapter-specific 5 MCQ + 5 short + 1 long passes only governed inventory',()=>{
  assert.deepEqual(BASIC_RECIPE,{mcq:5,short:5,long:1})
  const item=chapterStatus(record())
  assert.equal(item.ready,true)
  assert.deepEqual(item.missing,{mcq:0,short:0,long:0})
})
test('provisional and unapproved questions never make daily auto paper ready',()=>{
  const unapproved=chapterStatus(record({
    discovered:'2151',approved:'0',mcq_approved:'0',short_approved:'0',long_approved:'0'
  }))
  assert.equal(unapproved.ready,false)
  assert.deepEqual(unapproved.missing,{mcq:5,short:5,long:1})
})
test('missing long, short or MCQ category blocks Chapter Paper independent of total count',()=>{
  for(const key of ['mcq_approved','short_approved','long_approved']){
    const x=chapterStatus(record({[key]:'0',approved:'100'}))
    assert.equal(x.ready,false)
  }
})
test('unmapped questions, even approved, cannot invent chapter coverage',()=>{
  assert.equal(chapterStatus(record({chapter_no:null})).ready,false)
})
test('whole-grade readiness fails closed when a single chapter is incomplete or none exist',()=>{
  assert.equal(aggregateStatus([]).coverageReady,false)
  assert.equal(aggregateStatus([chapterStatus(record())]).coverageReady,true)
  assert.equal(aggregateStatus([
    chapterStatus(record()),
    chapterStatus(record({chapter_no:'2',long_approved:'0'})),
  ]).coverageReady,false)
})
test('empty source pages remain a separate transparent review warning',()=>{
  const x=chapterStatus(record({missing_source_page:'7'}))
  assert.equal(x.needsSourcePageReview,7)
})

test('readiness inspector rejects unspecified school identity before connecting to DB',async()=>{
  const { inspectTenant }=require('../check-school-exam-readiness.cjs')
  await assert.rejects(inspectTenant({schoolId:0,schoolCode:'assps'}),/positive --school-id/)
  await assert.rejects(inspectTenant({schoolId:1,schoolCode:'../other-school'}),/valid --school-code/)
})

test('provisional JSON seeds remain excluded even after an accidental approval flag',()=>{
  const { GOVERNED_ELIGIBILITY_SQL } = require('../check-school-exam-readiness.cjs')
  assert.ok(GOVERNED_ELIGIBILITY_SQL.includes('is_approved IS TRUE'))
  assert.ok(GOVERNED_ELIGIBILITY_SQL.includes('is_duplicate IS NOT TRUE'))
  assert.ok(GOVERNED_ELIGIBILITY_SQL.includes("metadata->>'provisional_internal'"))
  assert.ok(GOVERNED_ELIGIBILITY_SQL.includes("metadata->>'review_state'"))
})

test('strong systemic provisional MCQ key imbalance raises editorial warning, never auto-approves',()=>{
  const { mcqAnswerSkew } = require('../check-school-exam-readiness.cjs')
  const outcome = mcqAnswerSkew([
    {label:'A',count:'666'},{label:'B',count:'18'},{label:'C',count:'15'},{label:'D',count:'2'},
  ])
  assert.equal(outcome.total,701)
  assert.equal(outcome.dominantLabel,'A')
  assert.ok(outcome.dominantShare>0.94)
  assert.equal(outcome.editorialReviewFlag,true)
  assert.equal(mcqAnswerSkew([{label:'A',count:5}]).editorialReviewFlag,false)
})
