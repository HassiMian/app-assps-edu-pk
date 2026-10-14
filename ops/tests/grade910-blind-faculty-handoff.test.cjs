'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto')
const m=require('../qbank/build-grade910-blind-faculty-packets.cjs')
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
let memo
const inv=()=>memo??(memo=m.manifest())
test('all original SHA-frozen research is teacher-reviewable except one faculty-held restricted original',()=>{
 const x=inv()
 assert.equal(x.questionCount,2580)
 assert.equal(x.facultyHeld,1)
 assert.equal(Object.values(x.priorityCounts).reduce((a,b)=>a+b,0),2581)
 assert.equal([...x.groups.values()].reduce((a,b)=>a+b.length,0),2580)
 const ids=[...x.groups.values()].flatMap(y=>y.map(q=>q.review.id))
 assert.equal(new Set(ids).size,2580)
 assert.ok(!ids.includes('X-CHEM-C23-L01'))
})
test('blind payload hides original answer, option key and reference while unblinded record is clearly UNVERIFIED',()=>{
 const item=[...inv().groups.values()].flat().find(x=>
  x.review.question.en?.options&&x.answer.originalCorrectOptionIdNotIndependentCheck)
 assert.ok(item)
 const blind=JSON.stringify(item.review),reference=JSON.stringify(item.answer)
 assert.ok(blind.includes('question'))
 assert.ok(!blind.includes('answerReference'))
 assert.ok(!blind.includes('originalCorrectOptionId'))
 assert.ok(!blind.includes('answerTextOriginalCandidateOnly'))
 assert.ok(reference.includes('marksSchemeUnverified'))
 assert.equal(item.answer.originalCorrectOptionIdNotIndependentCheck.length,1)
 assert.equal(item.answer.suggestedReviewChecklist.length,8)
 assert.equal(item.answer.academicallyApproved,undefined)
 assert.equal(item.answer.approvedRevision,null)
 assert.equal(item.answer.published,false)
 assert.equal(item.answer.independentTeacher,null)
})
test('offline export requires absolute root-owned private base, explicit flag and safe run identifier',()=>{
 assert.throws(()=>m.safeBase('relative'),/EXPORT_BASE_MUST_BE_ABSOLUTE/)
 assert.throws(()=>m.safeBase(path.resolve(__dirname,'../../docs')),/SENSITIVE_PACKETS_CANNOT_BE_STORED_IN_GIT/)
 const privateBase=fs.mkdtempSync(path.join(os.tmpdir(),'assps-review-test-'))
 try{
  fs.chmodSync(privateBase,0o755)
  assert.throws(()=>m.safeBase(privateBase),/RESTRICTED_OWNED_NON_SYMLINK_EXPORT_BASE_REQUIRED/)
  fs.chmodSync(privateBase,0o700)
  const symlinkParent=privateBase+'-link'
  fs.symlinkSync(privateBase,symlinkParent)
  try{assert.throws(()=>m.safeBase(symlinkParent),/RESTRICTED_OWNED_NON_SYMLINK_EXPORT_BASE_REQUIRED/)}
  finally{fs.unlinkSync(symlinkParent)}
  assert.throws(()=>m.exportPacks({base:privateBase,runId:'../unsafe'}),
   /SAFE_UNIQUE_RUN_ID_REQUIRED/)
 }finally{fs.rmSync(privateBase,{recursive:true,force:true})}
})
test('complete actual 2580-research-candidate private export is lossless, SHA-evidenced and no old content overwritten',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'assps-review-export-'))
 fs.chmodSync(base,0o700)
 try{
  const out=m.exportPacks({base,runId:'private-teacher-docket-20261012',perPack:20})
  assert.equal(out.questionCount,2580)
  assert.equal(out.excludedFacultyHeld,1)
  assert.equal(out.approved,0)
  const validation=m.verifyPrivateExport({base,runId:'private-teacher-docket-20261012'})
  assert.equal(validation.verifiedOriginalIds,2580)
  assert.equal(validation.allShaVerified,true)
  const dir=out.privatePath
  const index=JSON.parse(fs.readFileSync(path.join(dir,'INDEX.json'),'utf8'))
  assert.equal(index.exportedForReview,2580)
  assert.equal(index.authenticatedIndependentTeacherApproved,0)
  assert.equal(index.verifiedPublished,0)
  assert.equal(index.teacherPacketCount,out.packs)
  assert.ok(index.filePairs.length>=100)
  const allIds=[]
  for(const pair of index.filePairs){
   const p=path.join(dir,pair.batch+'.blind.json'),a=path.join(dir,pair.batch+'.answer-review.json'),
    decisionPath=path.join(dir,pair.batch+'.unsigned-decisions.json')
   assert.equal(fs.statSync(p).mode&0o077,0)
   assert.equal(fs.statSync(a).mode&0o077,0)
   assert.equal(fs.statSync(decisionPath).mode&0o077,0)
   const bj=fs.readFileSync(p,'utf8'),aj=fs.readFileSync(a,'utf8')
   assert.equal(SHA(bj),pair.blindSha256)
   assert.equal(SHA(aj),pair.referenceSha256)
   const decisionText=fs.readFileSync(decisionPath,'utf8')
   assert.equal(SHA(decisionText),pair.unsignedDecisionTemplateSha256)
   const decisions=JSON.parse(decisionText)
   const b=JSON.parse(bj),ref=JSON.parse(aj)
   assert.equal(decisions.items.length,b.items.length)
   assert.equal(decisions.approvalProhibited,true)
   assert.equal(b.items.length,ref.items.length)
   assert.equal(b.approvedQuestionCount,0)
   assert.equal(ref.approvedQuestionCount,0)
   assert.equal(b.items[0].originalAnswerHidden,true)
   for(let i=0;i<b.items.length;i++){
    assert.equal(b.items[i].id,ref.items[i].id)
    assert.equal(b.items[i].originalQuestionRevisionSha256,ref.items[i].originalQuestionRevisionSha256)
    assert.equal(b.items[i].independentlyVerified,false)
    assert.equal(ref.items[i].independentTeacher,null)
    assert.equal(decisions.items[i].reviewChecks.length,8)
    assert.equal(decisions.items[i].academicApproved,false)
    assert.equal(decisions.items[i].independentReviewerId,null)
    allIds.push(b.items[i].id)
   }
  }
  assert.equal(allIds.length,2580)
  assert.equal(new Set(allIds).size,2580)
  assert.ok(!allIds.includes('X-CHEM-C23-L01'))
  assert.throws(()=>m.exportPacks({base,runId:'private-teacher-docket-20261012'}),
   /EEXIST/)
  const firstPair=index.filePairs[0],change=path.join(dir,firstPair.batch+'.blind.json')
  fs.appendFileSync(change,' ')
  assert.throws(()=>m.verifyPrivateExport({base,runId:'private-teacher-docket-20261012'}),
   /PRIVATE_PACK_SHA_CHANGED/)
 }finally{fs.rmSync(base,{recursive:true,force:true})}
})
