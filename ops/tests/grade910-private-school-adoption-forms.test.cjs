'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const m=require('../qbank/prepare-grade910-private-school-adoption-forms.cjs')
const readiness=require('../qbank/attest-grade910-private-adoption-template-readiness.cjs')
const directory=()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'assps910-adopt-'))
 fs.chmodSync(d,0o700);return d}
test('all 56 actually referenced source catalog forms bind the frozen 2581 research originals, but attest no school decision',()=>{
 const base=directory()
 try{
  const r=m.generate({base,runId:'real-school-evidence-empty-templates-20261013'})
  assert.equal(r.unsignedForms,56)
  assert.equal(r.originalQuestionRefs,2581)
  assert.equal(r.realAdoptionCertificatesReceived,0)
  const v=m.verify({base,runId:'real-school-evidence-empty-templates-20261013'})
  assert.equal(v.verifiedUnsignedForms,56)
  assert.equal(v.authenticatedSchoolAdoptionCertificates,0)
  const live=readiness.check({ASSPS_QBANK_PRIVATE_ADOPTION_BASE:base,
   ASSPS_QBANK_PRIVATE_ADOPTION_RUN:'real-school-evidence-empty-templates-20261013'})
  assert.equal(live.verifiedUnsignedAdoptionTemplates,56)
  assert.equal(live.actualAuthenticatedSchoolAdoptionCertificates,0)
  const idx=JSON.parse(fs.readFileSync(path.join(r.privateDirectory,'ADOPTION_TEMPLATES_INDEX.json'),'utf8'))
  assert.equal(idx.entries.length,56)
  const entry=idx.entries.find(x=>x.catalogId==='pectaa-catalog-002')
  assert.ok(entry)
  const form=JSON.parse(fs.readFileSync(path.join(r.privateDirectory,entry.form),'utf8'))
  assert.equal(form.schoolActuallyAdoptsThisEdition,null)
  assert.equal(form.verifiedActualPrintedEdition,null)
  assert.equal(form.applicableBISEBoardAndExamYear,null)
  assert.equal(form.authenticatedSchoolAdoptionSignature,null)
  assert.equal(form.certifiedForPaperStudioAcademicPublication,false)
  assert.throws(()=>m.generate({base,runId:'real-school-evidence-empty-templates-20261013'}),/EEXIST/)
 }finally{fs.rmSync(base,{recursive:true,force:true})}
})
test('changed or weakly protected school adoption form cannot be validated as original unsigned template',()=>{
 const base=directory(),id='school-adopt-test-20261013'
 try{
  const made=m.generate({base,runId:id}),idx=JSON.parse(fs.readFileSync(
   path.join(made.privateDirectory,'ADOPTION_TEMPLATES_INDEX.json'),'utf8'))
  const file=path.join(made.privateDirectory,idx.entries[0].form)
  const o=JSON.parse(fs.readFileSync(file,'utf8'))
  o.schoolActuallyAdoptsThisEdition=true
  fs.writeFileSync(file,JSON.stringify(o),{mode:0o600})
  assert.throws(()=>m.verify({base,runId:id}),/PRIVATE_ADOPTION_FORM_CHANGED_FROM_EMPTY_SOURCE/)
  fs.chmodSync(file,0o644)
  assert.throws(()=>m.verify({base,runId:id}),/UNSAFE_SCHOOL_ADOPTION_FORM_FILE/)
 }finally{fs.rmSync(base,{recursive:true,force:true})}
})
test('private adoption forms may not be written inside public academic repository or through unsafe run IDs',()=>{
 assert.throws(()=>m.generate({base:path.resolve(__dirname,'../../docs'),runId:'school-adopt-test-20261013'}),
  /CANNOT_READ_FACULTY_SUBMISSIONS_INSIDE_REPOSITORY/)
 const base=directory()
 try{assert.throws(()=>m.generate({base,runId:'../unsafe'}),
  /UNSAFE_PRIVATE_ADOPTION_RUN_ID/)}
 finally{fs.rmSync(base,{recursive:true,force:true})}
})

test('unconfigured or half-configured school certificate template location never creates a real school authorization',()=>{
 assert.equal(readiness.check({}).privateRealAdoptionTemplateArchiveConfigured,false)
 assert.throws(()=>readiness.check({ASSPS_QBANK_PRIVATE_ADOPTION_RUN:'fake'}),
  /PARTIAL_PRIVATE_ADOPTION_ARCHIVE_CONFIGURATION/)
})
