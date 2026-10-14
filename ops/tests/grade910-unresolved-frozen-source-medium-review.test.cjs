'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {build,OUT}=require('../qbank/prepare-grade910-missing-medium-review.cjs')
let cached
const evidence=()=>cached??(cached=build())
test('all 50 unresolved source mediums retain original revision provenance and review hold',()=>{
 const v=evidence()
 assert.equal(v.underlyingShaFrozenOriginalCandidates,2581)
 assert.equal(v.unresolvedOriginalMediumCandidates,50)
 assert.deepEqual(v.sourceFileCounts,{'biology9TopicResearchDrafts.json':6,'english9CompetencyOriginals2026.json':44})
 assert.equal(new Set(v.missingMediumOriginals.map(q=>q.originalQuestionId)).size,50)
 assert.equal(v.missingMediumOriginals.filter(q=>q.originalUrduTranslationDraftPresent).length,2)
 assert.equal(v.missingMediumOriginals.filter(q=>q.originalUrduTranslationDraftMissing).length,4)
 for(const q of v.missingMediumOriginals){
  assert.match(q.originalQuestionRevisionSha256,/^[a-f0-9]{64}$/)
  assert.match(q.originalSourceFileSha256,/^[a-f0-9]{64}$/)
  assert.equal(q.authenticatedAcademicApproval,false)
  assert.equal(q.published,false)
  assert.equal(q.reviewDecision,'HOLD_FOR_QUALIFIED_SOURCE_LANGUAGE_REVIEW')
 }
})
test('committed medium research manifest matches frozen-original source exactly',()=>{
 const actual=JSON.parse(fs.readFileSync(OUT,'utf8'))
 assert.deepEqual(actual,evidence())
 assert.equal(actual.academicApprovalCount,0)
 assert.equal(actual.publisherSelectableCount,0)
 assert.equal(actual.publicationDecision,'DENY')
})
