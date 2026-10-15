'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os')
const wb=require('../qbank/render-grade910-complete-private-review-workbench-20261015.cjs')
const o={base:'/root/secure-archive/assps-grade910-review-delivery-20261015',runId:'grade910-20261015-full'}
test('all 2580 original candidate items link to their actual blind sheets and unsigned source/reviewer forms',()=>{
 const v=wb.verify(o)
 assert.equal(v.originalResearchCandidates,2581)
 assert.equal(v.originalsNeedingHumanReview,2580)
 assert.equal(v.blindWorksheetLinks,2580)
 assert.equal(v.unsignedTeacherFormLinks,2580)
 assert.equal(v.unsignedBookEvidenceFormLinks,2580)
 assert.equal(v.groups,56)
 assert.equal(v.groupCounts.reduce((a,g)=>a+g.candidates,0),2580)
 assert.equal(v.heldOriginalId,'X-CHEM-C23-L01')
 assert.equal(v.uniqueExistingPrivateFilesReferenced,2756)
})
test('new offline full coverage workbench remains owner-only and contains NO restricted answers or network code',()=>{
 const f=path.join(o.base,wb.WORKBENCH),html=fs.readFileSync(f,'utf8')
 assert.equal(fs.statSync(f).mode&0o777,0o600)
 assert.equal(fs.statSync(o.base).mode&0o777,0o700)
 assert.ok(html.includes('Content-Security-Policy'))
 assert.ok(html.includes('default-src &#39;none&#39;'))
 assert.ok(!html.includes('<script'))
 assert.ok(!html.includes('http://'))
 assert.ok(!html.includes('https://'))
 assert.ok(!html.includes('.answer-review.json'))
 assert.ok(!html.includes('reference.html'))
 assert.ok(html.includes('X-CHEM-C23-L01 remains faculty-held'))
 assert.equal((html.match(/>Blind worksheet<\/a>/g)||[]).length,2580)
 assert.equal((html.match(/>Unsigned teacher form<\/a>/g)||[]).length,2580)
 assert.equal((html.match(/>Book adoption form<\/a>/g)||[]).length,2580)
})
test('public receipt cannot claim fake teacher or Principal approvals or publication',()=>{
 const v=wb.verify(o)
 for(const p of ['authenticIndependentTeacherReviews','realBookAdoptionsConfirmed',
  'schoolPrincipalAuthenticatedApprovals','academicallyApproved','published','productionWrites'])
   assert.equal(v[p],0)
 assert.equal(v.releaseDecision,'HOLD_AUTHENTIC_SCHOOL_ACADEMIC_EVIDENCE')
 assert.equal(Object.hasOwn(v,'questionText'),false)
 assert.equal(Object.hasOwn(v,'answer'),false)
 assert.equal(Object.hasOwn(v,'staffNames'),false)
})
test('existing full corpus frozen workbench is immutable and cannot be silently rebuilt in place',()=>{
 assert.throws(()=>wb.create(o),/NONDESTRUCTIVE_IMMUTABLE_WORKBENCH_ALREADY_EXISTS/)
})
test('private file links explicitly deny symlinks and world-readable files',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'assps-faculty-nav-neg-'))
 try{
  fs.chmodSync(d,0o700)
  fs.writeFileSync(path.join(d,'safe.json'),'{}',{mode:0o600})
  fs.symlinkSync(path.join(d,'safe.json'),path.join(d,'redirect.json'))
  assert.throws(()=>wb.authorizedFile(d,'redirect.json'),/FOREIGN_OWNER_OR_WORLD_READABLE_FILE/)
  assert.throws(()=>wb.authorizedFile(d,'../safe.json'),/PATH_TRAVERSAL/)
  fs.chmodSync(path.join(d,'safe.json'),0o644)
  assert.throws(()=>wb.authorizedFile(d,'safe.json'),/FOREIGN_OWNER_OR_WORLD_READABLE_FILE/)
 }finally{fs.rmSync(d,{recursive:true,force:true})}
})
test('private link file reject unexpected missing path, not create synthetic curriculum evidence',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'assps-faculty-missing-'))
 try{fs.chmodSync(d,0o700)
  assert.throws(()=>wb.authorizedFile(d,'not-found.json'),/ENOENT/)
 }finally{fs.rmSync(d,{recursive:true,force:true})}
})
