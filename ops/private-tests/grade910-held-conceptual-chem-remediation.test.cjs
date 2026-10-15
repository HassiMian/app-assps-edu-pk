'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const x=require('../qbank/verify-grade910-held-conceptual-alternative-20261015.cjs')
const ROOT='/root/secure-archive/assps-grade910-review-delivery-20261015/held-original-remediation-20261015'
function fixture(fn){const root=fs.mkdtempSync(path.join(os.tmpdir(),'assps-grade910-held-private-'))
 fs.chmodSync(root,0o700)
 for(const f of fs.readdirSync(ROOT))fs.copyFileSync(path.join(ROOT,f),path.join(root,f))
 for(const f of fs.readdirSync(root))fs.chmodSync(path.join(root,f),0o600)
 try{return fn(root)}finally{fs.rmSync(root,{recursive:true,force:true})}}
test('independent five-mark alternative is separate from the faculty-held original',()=>{
 const d=x.audit(ROOT)
 assert.equal(d.originalQuestionId,'X-CHEM-C23-L01')
 assert.notEqual(d.originalQuestionId,d.proposedSeparateDraftId)
 assert.equal(d.validFiveMarkConceptualDraftPrepared,true)
 assert.equal(d.changeAppliedToOriginal,false)
 assert.equal(d.originalRecordFacultyHeld,true)
 assert.equal(d.approved,0)
 assert.equal(d.published,0)
 assert.equal(d.paperStudioSelectable,false)
 assert.equal(Object.keys(d.privateRecordHashSummaries).length,3)
 assert.equal(Object.keys(d.privateReviewArtifactsSha256).length,3)
})
test('root-private review files remain owner-only and source SHA verified',()=>{
 assert.equal(fs.statSync(ROOT).mode&0o777,0o700)
 for(const f of fs.readdirSync(ROOT))assert.equal(fs.statSync(path.join(ROOT,f)).mode&0o777,0o600)
 const v=x.verifyReceipt(ROOT)
 assert.equal(v.originalHeld,true)
 assert.equal(v.humanApproved,0)
 assert.equal(v.published,0)
})
test('cannot transfer approval onto stale or edited held source',()=>fixture(root=>{
 const file=path.join(root,'UNSIGNED_CONCEPTUAL_ALTERNATE.json'),doc=JSON.parse(fs.readFileSync(file))
 doc.originalQuestionRevisionSha256='0'.repeat(64)
 fs.writeFileSync(file,JSON.stringify(doc))
 assert.throws(()=>x.audit(root),/NOT_SEPARATE_COMPLETE_CONCEPTUAL_CANDIDATE/)
}))
test('cannot fake teacher signature, adoption or publication status in source evidence',()=>{
 for(const prop of ['academicallyApproved','paperStudioSelectable','principalAuthenticatedSignoff','actualSchoolTextbookEditionAdopted'])fixture(root=>{
  const file=path.join(root,'UNSIGNED_CONCEPTUAL_ALTERNATE.json'),doc=JSON.parse(fs.readFileSync(file))
  doc[prop]=true;fs.writeFileSync(file,JSON.stringify(doc))
  assert.throws(()=>x.audit(root),/FALSE_INSTITUTIONAL_SIGNOFF/)
 })
})
test('private blind review cannot include source answer or reference link',()=>fixture(root=>{
 const file=path.join(root,'BLIND_FOR_HUMAN_REVIEW.html')
 fs.appendFileSync(file,'UNVERIFIED_ANSWER_AND_RUBRIC.html')
 assert.throws(()=>x.audit(root),/BLIND_REVIEW_ANSWER_SEPARATION/)
}))
test('signoff criterion cannot be auto-passed in an intentionally empty worksheet',()=>fixture(root=>{
 const file=path.join(root,'UNSIGNED_REVIEW_TEMPLATE.json'),doc=JSON.parse(fs.readFileSync(file))
 doc.checks[0].status='passed';fs.writeFileSync(file,JSON.stringify(doc))
 assert.throws(()=>x.audit(root),/FALSE_TEACHER_REVIEW/)
}))
test('a near-correct answer with missing marks cannot be called a full model answer',()=>fixture(root=>{
 const file=path.join(root,'UNSIGNED_CONCEPTUAL_ALTERNATE.json'),doc=JSON.parse(fs.readFileSync(file))
 doc.subjectAnswer.markScheme[4].marks=0;fs.writeFileSync(file,JSON.stringify(doc))
 assert.throws(()=>x.audit(root),/MARKING_SCHEME_NOT_COMPLETE_5/)
}))
