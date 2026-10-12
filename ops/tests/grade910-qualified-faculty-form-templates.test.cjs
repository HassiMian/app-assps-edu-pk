'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const form=require('../qbank/prepare-grade910-faculty-submission-templates.cjs')
const model=require('../qbank/aggregate-grade910-offline-faculty-decisions.cjs')
const temp=()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'assps910-forms-'));fs.chmodSync(d,0o700);return d}
test('one private unsigned original-question template is explicitly not an academic approval',()=>{
 const src=[...model.originalIndex().values()][0].row
 const t=form.item(src)
 assert.equal(t.schemaVersion,'assps-grade910-offline-subject-review-v1')
 assert.equal(t.originalQuestionRevisionSha256,src.originalQuestionRevisionSha256)
 assert.equal(t.reviewerClaimId,null)
 assert.equal(t.academicallyApproved,false)
 assert.equal(t.signatureAuthenticated,false)
 assert.equal(t.independentAnswerBeforeReference,null)
 assert.equal(t.checks.length,8)
})
test('all 2580 real original candidate private teacher editing templates generated and validated SHA by SHA',()=>{
 const base=temp()
 try{
  const g=form.generate({base,runId:'faculty-forms-20261012'})
  assert.equal(g.editableForms,2580)
  assert.equal(g.held,1)
  assert.equal(g.academicApproved,0)
  const check=form.verify({base,runId:'faculty-forms-20261012'})
  assert.equal(check.verifiedEmptyUnsignedTemplates,2580)
  assert.equal(check.realTeacherReviewsReceived,0)
  assert.equal(check.academicApproved,0)
  assert.throws(()=>form.generate({base,runId:'faculty-forms-20261012'}),/EEXIST/)
  const idx=JSON.parse(fs.readFileSync(path.join(g.privateDirectory,'TEMPLATES_INDEX.json'),'utf8'))
  assert.equal(idx.records.length,2580)
  const file=path.join(g.privateDirectory,idx.records[0].templateFile)
  fs.appendFileSync(file,'\n')
  assert.throws(()=>form.verify({base,runId:'faculty-forms-20261012'}),/TEMPLATE_PRIVATE_FILE_SHA_DRIFT/)
 }finally{fs.rmSync(base,{recursive:true,force:true})}
})
test('unsafe template paths and unauthorized repository writes are rejected',()=>{
 assert.throws(()=>form.generate({base:path.resolve(__dirname,'../../docs'),
  runId:'faculty-forms-20261012'}),/CANNOT_READ_FACULTY_SUBMISSIONS_INSIDE_REPOSITORY/)
 const d=temp()
 try{
  assert.throws(()=>form.generate({base:d,runId:'../unsafe'}),
   /UNSAFE_PRIVATE_TEMPLATE_RUN_ID/)
 }finally{fs.rmSync(d,{recursive:true,force:true})}
})
