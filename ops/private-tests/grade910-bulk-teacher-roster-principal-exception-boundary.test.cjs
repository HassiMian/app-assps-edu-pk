'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const service=require('../qbank/prepare-grade910-bulk-teacher-correction-and-principal-exceptions-20261015.cjs')
const DIR='/root/secure-archive/assps-grade910-review-delivery-20261015'
test('entire 2580 original revision review workload assigned to exactly 56 UNASSIGNED teacher batches',()=>{
 const r=service.verify(DIR)
 assert.equal(r.sourceOriginals,2581)
 assert.equal(r.teacherReviewCandidates,2580)
 assert.equal(r.teacherReviewGroups,56)
 assert.equal(r.provisionalPositivePrincipalFeedback,3)
 assert.equal(r.realTeacherReviewsAuthenticated,0)
 assert.equal(r.schoolBookAdoptionAuthenticated,0)
 assert.equal(r.principalSchoolApprovalAuthenticated,0)
 assert.equal(r.academicallyApproved,0)
 assert.equal(r.published,0)
})
test('56 private teacher correction batches are traceable to original 2581 research IDs; zero invented reviewers',()=>{
 const p=path.join(DIR,service.TEACHER),st=fs.statSync(p)
 assert.equal(st.mode&0o777,0o600)
 const j=JSON.parse(fs.readFileSync(p))
 assert.equal(j.reviewGroups.length,56)
 assert.equal(j.reviewGroups.reduce((a,g)=>a+g.originalResearchQuestions,0),2581)
 assert.equal(j.reviewGroups.reduce((a,g)=>a+g.teacherReviewPackReady,0),2580)
 assert.equal(j.reviewGroups.reduce((a,g)=>a+g.originalFacultyHeldCount,0),1)
 assert.equal(j.reviewGroups.reduce((a,g)=>a+g.fullStudentFacingLongAnswersNeededTeacherInspection,0),166)
 assert.equal(j.reviewGroups.reduce((a,g)=>a+g.printedPageSourceProofNeeded,0),1188)
 assert.ok(j.reviewGroups.every(g=>g.competentReviewerAssigned===false))
 assert.ok(j.reviewGroups.every(g=>g.qualifiedTeacherSignedItems===0))
 for(const g of j.reviewGroups)for(const item of g.correctionItemOriginalIds){
  assert.match(item.originalRevisionSha256,/^[a-f0-9]{64}$/)
  assert.ok(!Object.hasOwn(item,'answer'))
  assert.ok(!Object.hasOwn(item,'questionText'))
 }
})
test('principal only gets institutional decisions, not three-by-three review or answer keys',()=>{
 const p=path.join(DIR,service.PRINCIPAL),st=fs.statSync(p),body=fs.readFileSync(p,'utf8')
 assert.equal(st.mode&0o777,0o600)
 assert.ok(body.includes('Principal decision-only board'))
 assert.ok(body.includes('2,581 originals checked'))
 assert.ok(body.includes('3 Biology Grade IX original question answers were reported Sahi'))
 assert.ok(body.includes('This is preliminary, unsigned, non-authenticated feedback'))
 assert.ok(!body.includes('<script'))
 assert.ok(!body.includes('http://')&&!body.includes('https://'))
 assert.ok(!body.includes('ANSWER_REFERENCE_KEEP_SEPARATE'))
 assert.ok(body.includes('default-src &#39;none&#39;'))
})
test('old pending selections cannot supersede later user correction to all three correct',()=>{
 const r=service.validatePrincipalScreening(DIR)
 assert.equal(r.preliminaryPositive,3)
 assert.equal(r.signedPrincipalApprovals,0)
 assert.notEqual(r.oldReceiptSha256,r.amendmentReceiptSha256)
})
test('creating fake principal authenticated approval inside prior chat receipt triggers fail-closed source-bound review',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-bulk-feedback-negative-'))
 try{
  fs.chmodSync(dir,0o700)
  const folder=path.join(dir,'principal-preliminary-screenings')
  fs.mkdirSync(folder,{mode:0o700})
  const names=['20261015-biology9-ch1-t11-batch01-selfreported.json','20261015-biology9-ch1-t11-batch01-user-correction-v2.json']
  for(const name of names){
   const bytes=fs.readFileSync(path.join(DIR,'principal-preliminary-screenings',name))
   fs.writeFileSync(path.join(folder,name),bytes,{mode:0o600})
  }
  const p=path.join(folder,names[1]),j=JSON.parse(fs.readFileSync(p))
  j.institutionalPrincipalAuthenticated=true
  fs.writeFileSync(p,JSON.stringify(j),{mode:0o600})
  assert.throws(()=>service.validatePrincipalScreening(dir),/FALSE_SCHOOL_APPROVAL_FROM_CHAT_FEEDBACK/)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('private bulk teacher queue and principal board cannot be silently overwritten',()=>{
 assert.throws(()=>service.create(DIR),/NONDESTRUCTIVE_WRITE_EXISTING/)
})
