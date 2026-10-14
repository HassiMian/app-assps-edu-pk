'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const mcq=require('../qbank/audit-grade910-68-mcq-choice-cues-20261014.cjs')
const long=require('../qbank/draft-grade910-34-priority-long-answer-checklists-20261014.cjs')
test('68 original MCQ answer text and four original options are source SHA bound',()=>{
 const x=mcq.analyse()
 assert.equal(x.rows.length,68)
 assert.equal(x.originalMcqSourceSHARechecked,68)
 assert.equal(x.objectiveStrongLengthCueCount,66)
 assert.equal(x.strictCorrectLongestCount,66)
 assert.equal(x.actualOriginalAnswerOrOptionsEdited,0)
 assert.equal(x.correctAnswersAcademicallyVerified,0)
 assert.ok(x.rows.every(r=>/^[a-f0-9]{64}$/.test(r.originalRevisionSha256)))
 assert.ok(x.rows.every(r=>!r.qualifiedFacultyReviewed&&!r.academicallyApproved&&!r.published))
 assert.deepEqual(JSON.parse(fs.readFileSync(mcq.OUT)),x)
})
test('option-length measurements are computed from original choices, never marked rewritten',()=>{
 const x=mcq.analyse()
 for(const r of x.rows){
  assert.equal(r.optionLengths.length,4)
  assert.deepEqual(r.optionLengths.map(o=>o.id),['A','B','C','D'])
  const answer=r.optionLengths.find(o=>o.id===r.sourceMatchedOptionId)
  assert.equal(answer.characterCount,r.sourceCorrectLength)
  const other=r.optionLengths.filter(o=>o.id!==r.sourceMatchedOptionId)
  const avg=other.reduce((sum,o)=>sum+o.characterCount,0)/3
  assert.ok(Math.abs(r.meanOtherLength-avg)<0.0011)
  assert.equal(r.correctLongerThanOthersByAtLeast50Percent,answer.characterCount/avg>=1.5)
 }
})
test('34 priority long answer drafting notes are topic-specific, revisable and NOT teacher certification',()=>{
 const x=long.draft()
 assert.equal(x.rows.length,34)
 assert.equal(x.referenceMayAlreadyBeSufficientButFlaggedOnlyByLength,3)
 assert.equal(x.qualifiedTeacherReviewed,0)
 assert.equal(x.verifiedPublished,0)
 assert.ok(x.rows.every(r=>r.substantiveDraftPoints.length>=4))
 assert.ok(x.rows.every(r=>r.substantiveDraftPoints.every(t=>t.length>=25)))
 assert.ok(x.rows.every(r=>r.existingQuestionUnchanged&&!r.academicallyApproved&&!r.published))
 assert.deepEqual(JSON.parse(fs.readFileSync(long.OUT)),x)
})
test('Urdu long-answer drafts have meaningful Urdu Unicode and no legacy mojibake',()=>{
 const rows=long.draft().rows
 const ur=rows.filter(r=>r.medium==='urdu')
 assert.ok(ur.length>=12)
 for(const r of ur){
  const txt=r.substantiveDraftPoints.join(' ')
  assert.match(txt,/[\u0600-\u06ff]/)
  assert.doesNotMatch(txt,/[ØÙÛÐ]/)
 }
})
test('truth tables and long-answer physics calculation are not falsified into missing answers solely by brevity',()=>{
 const rows=new Map(long.draft().rows.map(x=>[x.originalId,x]))
 for(const id of ['IX-MATH-C08-L01','IX-MATH-UR-C08-L01','X-PHY-C16-L03'])
  assert.equal(rows.get(id).contentDraftKind,'EXISTING_REFERENCE_MAY_ALREADY_SUFFICE__REVIEW_REQUIRED')
 const physics=rows.get('X-PHY-C16-L03')
 assert.equal(9/3,3)
 assert.equal(9*(9/3),27)
 assert.equal(9*(9/3)*10,270)
 assert.match(physics.substantiveDraftPoints.join(' '),/270 J/)
 const truth=rows.get('IX-MATH-C08-L01').substantiveDraftPoints
 assert.equal(truth.length,4)
 assert.match(truth[0],/True/)
 assert.match(truth[1],/False/)
})
