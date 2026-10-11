'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {build,OUT}=require('../qbank/prepare-grade910-three-overlap-review.cjs')
let cached
const data=()=>cached??(cached=build())
test('three distinct old original overlap pairs are tied to six SHA-locked revisions',()=>{
 const x=data(),ids=x.pairs.flatMap(p=>p.originals.map(q=>q.id))
 assert.equal(x.overlapPairsToReview,3)
 assert.equal(x.uniqueOriginalQuestionIdsToReview,6)
 assert.equal(new Set(ids).size,6)
 assert.equal(x.pairs.length,3)
 for(const p of x.pairs){
  assert.equal(p.originals.length,2)
  assert.equal(p.approvedAsDistinct,false)
  assert.equal(p.algorithmicDuplicateVerdict,'NOT_DETERMINED')
  assert.equal(p.authenticatedReviewerSignature,null)
  assert.equal(p.academicallyApproved,false)
  assert.equal(p.published,false)
  for(const q of p.originals){
   assert.match(q.originalQuestionRevisionSha256,/^[0-9a-f]{64}$/)
   assert.match(q.originalSourceFileSha256,/^[0-9a-f]{64}$/)
   assert.equal(q.grade,9);assert.equal(q.subjectId,'chemistry')
  }
 }
 assert.equal(x.confirmedDuplicatePairs,0)
 assert.equal(x.independentFacultyPairDecisions,0)
 assert.equal(x.autoDeletionsOrRewrites,0)
 assert.equal(x.publisherSelectable,false)
})
test('frozen three-pair reviewer packet is deterministic and remains nonpublished',()=>{
 assert.deepEqual(JSON.parse(fs.readFileSync(OUT,'utf8')),data())
})
