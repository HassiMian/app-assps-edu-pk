'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const subject=require('../qbank/build-grade910-2581-unified-review-priority-crosswalk-20261015.cjs')
test('2581 original revisions are all represented exactly once',()=>{
 const x=subject.assemble()
 assert.equal(x.rows.length,2581)
 assert.equal(new Set(x.rows.map(r=>r.questionId)).size,2581)
 assert.equal(x.metrics.flaggedCandidates,584)
 assert.equal(x.metrics.baselineNoNewEditorialProposal,1997)
 assert.equal(x.groups.reduce((n,g)=>n+g.sourceResearchQuestions,0),2581)
 assert.deepEqual(JSON.parse(fs.readFileSync(subject.OUT)),x)
})
test('linked editorial risk queue and grade-medium group routing are preserved',()=>{
 const x=subject.assemble(),m=x.metrics
 assert.equal(m.reviewGroups,56)
 assert.equal(m.mcqSpecificOptionRevisions,66)
 assert.equal(m.draftOptionsWithAbsoluteCue,102)
 assert.equal(m.withTwoOrMoreAbsoluteCuedDistractors,34)
 assert.equal(m.grade9Routing,1628)
 assert.equal(m.grade10Routing,953)
 assert.equal(m.englishRouting,1562)
 assert.equal(m.urduRouting,971)
 assert.equal(m.dualMediumRouting,48)
 assert.equal(m.unknownMediumRouting,0)
 assert.equal(m.provisionalIdentityReviewRoutes,28)
 assert.equal(m.additionallyRoutedFromAuthoringMetadata,22)
})
test('no publication or human signature authority is supplied by academic draft metadata',()=>{
 const x=subject.assemble()
 const disallowed=['stem','options','answer','answerKey','questionText','signature','reviewerName','studentName']
 for(const row of x.rows){
  for(const name of disallowed)assert.equal(Object.hasOwn(row,name),false)
  assert.equal(row.schoolAdoptionVerified,false)
  assert.equal(row.independentHumanAccuracyReview,false)
  assert.equal(row.reviewerIdentityVerified,false)
  assert.equal(row.schoolPrincipalAuthenticatedApproval,false)
  assert.equal(row.approved,false)
  assert.equal(row.published,false)
  assert.equal(row.paperStudioSelectable,false)
 }
 assert.equal(x.metrics.approved,0)
 assert.equal(x.metrics.published,0)
})
