'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {stemTokens,score,audit,OUT}=require('../qbank/audit-scientific-stem-similarity.cjs')
const {collectDocuments}=require('../qbank/audit-authoring-crossfile-qa.cjs')
const {buildReviewQueue}=require('../qbank/build-grade910-review-triage.cjs')
const manifest=require('../../al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json')
const docs=collectDocuments(),result=audit(docs)
const clone=x=>JSON.parse(JSON.stringify(x))
test('science-aware tokens distinguish ionic 1+ from 1- and preserve mathematics symbols',()=>{
 const plus='Why do many Group 1 elements form 1+ ions?'
 const minus='Why do many Group 17 elements form 1- ions?'
 assert.ok(stemTokens(plus).includes('+'))
 assert.ok(stemTokens(minus).includes('-'))
 assert.ok(!stemTokens(plus).includes('-'))
 assert.ok(score(plus,minus)<0.88)
 assert.notDeepEqual(stemTokens('x² + 1 = 5'),stemTokens('x² - 1 = 5'))
 assert.ok(stemTokens('x² + 1 = 5').includes('='))
 assert.ok(stemTokens('Na⁺').includes('+'))
})
test('real original 2,581 questions report only 12 high-similarity cross-chapter template candidate pairs',()=>{
 assert.equal(result.originalQuestionCount,2581)
 assert.equal(result.distinctOriginalIdCount,2581)
 assert.equal(result.sameChapterPossibleRephrasePairs,0)
 assert.equal(result.crossChapterTemplatePairs,12)
 assert.equal(result.uniqueQuestionsForEditorialReview,15)
 assert.ok(result.pairs.every(x=>x.reason==='CROSS_CHAPTER_TEMPLATE_SIMILARITY'))
 assert.ok(result.pairs.every(x=>x.duplicateConfirmed===false&&x.independentReviewerId===null&&x.approved===false))
 assert.deepEqual(result.flaggedQuestionIds,[...new Set(result.pairs.flatMap(x=>[x.questionA,x.questionB]))].sort())
 assert.equal(result.published,0)
})
test('metadata-only report is exactly deterministic, contains fingerprints but no stems, options or answer text',()=>{
 assert.deepEqual(Buffer.from(JSON.stringify(result,null,2)+'\n'),fs.readFileSync(OUT))
 for(const item of result.pairs){
  assert.match(item.questionShaA,/^[0-9a-f]{64}$/)
  assert.match(item.questionShaB,/^[0-9a-f]{64}$/)
  assert.equal(Object.hasOwn(item,'stem'),false)
  assert.equal(Object.hasOwn(item,'answer'),false)
 }
})
test('same-chapter near-identical question is review-candidate, not an automatic duplicate',()=>{
 const rows=[{id:'SYN-1',type:'short',medium:'english',chapter:{number:1},curriculum:{grade:9,subjectId:'Biology'},
  content:{en:{stem:'How do living organisms maintain their internal stable temperature during normal activity in a changing environment?',answer:'First candidate'}}},
 {id:'SYN-2',type:'short',medium:'english',chapter:{number:1},curriculum:{grade:9,subjectId:'Biology'},
  content:{en:{stem:'During normal activity in a changing environment, how do living organisms maintain their internal stable temperature?',answer:'Different candidate'}}}]
 const x=audit([{file:'synthetic.json',data:{drafts:rows}}])
 assert.equal(x.sameChapterPossibleRephrasePairs,1)
 assert.equal(x.crossChapterTemplatePairs,0)
 assert.equal(x.pairs[0].answerTextFingerprintsEqual,false)
 assert.equal(x.pairs[0].duplicateConfirmed,false)
})
test('cross-chapter repeated templates are not silently classified as invalid duplicates',()=>{
 const r=result.pairs[0]
 assert.notEqual(r.chapterA,r.chapterB)
 assert.equal(r.reason,'CROSS_CHAPTER_TEMPLATE_SIMILARITY')
 assert.equal(r.scientificAnswersCorrectVerified,false)
})
test('real review queue SHA-binds all 15 flagged questions without counting them as new originals',()=>{
 const q=buildReviewQueue(docs,manifest,{},[],[],result)
 assert.equal(q.counts.questionRecords,2581)
 assert.equal(q.counts.stableQuestionIds,2581)
 assert.equal(q.nearStemSimilarityPairs,12)
 assert.equal(q.nearStemOriginalityReviewQuestionCount,15)
 assert.equal(q.blockerCounts.NEAR_STEM_TEMPLATE_ORIGINALITY_HUMAN_REVIEW_REQUIRED,15)
 assert.equal(q.counts.sourceVerified,0)
 assert.equal(q.counts.approved,0)
 assert.equal(q.counts.published,0)
 const matched=q.records.filter(x=>x.nearStemSimilarityReview)
 assert.equal(matched.length,15)
 assert.ok(matched.every(x=>x.nearStemSimilarityReview.humanDuplicateVerdict==='PENDING' && x.nearStemSimilarityReview.approved===false))
})
test('queue rejects stale source question SHA, forged duplicate confirmation and orphan IDs',()=>{
 const changed=clone(result)
 changed.pairs[0].questionShaA='f'.repeat(64)
 assert.throws(()=>buildReviewQueue(docs,manifest,{},[],[],changed),/STALE_STEM_SIMILARITY_REVIEW_SHA/)
 const confirmed=clone(result)
 confirmed.pairs[0].duplicateConfirmed=true
 assert.throws(()=>buildReviewQueue(docs,manifest,{},[],[],confirmed),/UNTRUSTED_SIMILARITY_REVIEW_RECORD/)
 const orphan=clone(result)
 orphan.pairs[0].questionA='NONEXISTENT'
 orphan.pairs[0].questionShaA='b'.repeat(64)
 assert.throws(()=>buildReviewQueue(docs,manifest,{},[],[],orphan),/NEAR_STEM_REVIEW_REFERENCES_MISSING_ORIGINAL_QUESTION/)
})
test('same permanent source question ID in multiple files cannot be double-counted',()=>{
 const a={id:'A',type:'short',curriculum:{grade:9,subjectId:'Chemistry'},medium:'english',
  content:{en:{stem:'Explain how heat changes evaporation rate in open air.',answer:'Synthetic'}}}
 assert.throws(()=>audit([{file:'a.json',data:{drafts:[a]}},{file:'b.json',data:{drafts:[a]}}]),/DUPLICATE_ORIGINAL_QUESTION_ID/)
})

test('missing chapter mapping never gets mislabeled as cross-chapter evidence',()=>{
 const stem='Describe how the materials change physical state as temperature increases in the laboratory'
 const rows=[
  {id:'UNKNOWN-A',type:'short',medium:'english',curriculum:{grade:9,subjectId:'Chemistry'},
   content:{en:{stem,answer:'First'}}},
  {id:'UNKNOWN-B',type:'short',medium:'english',chapter:{number:2},curriculum:{grade:9,subjectId:'Chemistry'},
   content:{en:{stem,answer:'Second'}}}
 ]
 const data=audit([{file:'synthetic-unknown.json',data:{drafts:rows}}])
 assert.equal(data.crossChapterTemplatePairs,0)
 assert.equal(data.sameChapterPossibleRephrasePairs,0)
})
