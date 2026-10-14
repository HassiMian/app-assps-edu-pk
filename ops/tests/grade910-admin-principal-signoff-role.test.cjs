'use strict'
process.env.DB_STARTUP_PROBE='false'
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const svc=require('../../al-siddique-backend/src/services/grade910HumanSignoffService')
const srcCatalog=svc.catalog.rows.find(x=>x.grade===9&&x.medium==='English')
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')
const h=crypto.createHash('sha256').update(png).digest('hex'),H='a'.repeat(64)
function principalOwnedClaim(role='admin',action='book_adoption'){
 return {schemaVersion:'assps-grade910-human-claim-with-signature-v1',schoolCode:'ASSPS',
 academicSession:'2026-27',intendedBoardExamYear:2027,
 actorClaim:{userId:'246',role},personallySignedAt:new Date().toISOString(),
 action,sourceCatalogRecordId:srcCatalog.catalogId,
 sourcePdfSha256:srcCatalog.sourcePdfSha256,
 originalQuestionRevisionSetSha256:srcCatalog.originalQuestionRevisionSetSha256,
 sourceGradeUnassigned:false,subject:srcCatalog.subject,grade:srcCatalog.grade,medium:srcCatalog.medium,
 bookDecision:'adopted',printedEdition:'Physical copy inspected',
 originalQuestionId:null,finalQuestionRevisionSha256:null,finalAnswerRevisionSha256:null,
 independentTeacherReceiptSha256:null,supportingEvidenceSha256:H,
 completedReviewChecks:[],handwriting:{mimeType:'image/png',sha256:h,imageDataUrl:'data:image/png;base64,'+png.toString('base64')},
 signerDeclaration:'I personally reviewed this source and evidence and signed with my own hand.',
 verificationStatus:'UNTRUSTED_CLAIM_PENDING_SCHOOL_AUTHENTICATION',
 academicallyApproved:false,paperStudioSelectable:false,published:false}
}
const actor=role=>({id:246,schoolId:1,role})
test('actual school-admin signed adoption evidence can be submitted as PENDING, not falsely Principal-verified',()=>{
 for(const role of ['admin','school_admin']){
  const r=svc.verifyClaim(principalOwnedClaim(role),actor(role))
  assert.equal(r.actor.role,role)
  assert.equal(r.claim.academicallyApproved,false)
  assert.equal(r.claim.published,false)
 }
})
test('admin role cannot impersonate Principal academic approval or independent teacher review',()=>{
 for(const action of ['principal_approval','subject_review','urdu_review'])
  assert.throws(()=>svc.verifyClaim(principalOwnedClaim('admin',action),actor('admin')),/STAFF_ROLE_OR_ID_SPOOF/)
})
test('staff identity spoof fails despite a personally uploaded PNG',()=>{
 assert.throws(()=>svc.verifyClaim(principalOwnedClaim('admin'),{...actor('admin'),id:247}),/STAFF_ROLE_OR_ID_SPOOF/)
})
test('schema and UI expose adoption-only admin role, never approval shortcuts',()=>{
 const root=path.resolve(__dirname,'../../al-siddique-backend')
 const sql=fs.readFileSync(path.join(root,'migrations/030_grade910_signed_human_evidence.js'),'utf8')
 const ui=fs.readFileSync(path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/Grade910HumanSignoff.jsx'),'utf8')
 assert.match(sql,/actor_role IN \('teacher','principal','admin','school_admin'\)/)
 assert.match(ui,/role==='admin'\|\|role==='school_admin'\?\['book_adoption'\]/)
})


test('self-service page provides file-derived evidence SHA and does not auto-download sensitive PNG evidence',()=>{
 const root=path.resolve(__dirname,'../../al-siddique-frontend/src')
 const ui=fs.readFileSync(path.join(root,'Modules/Paper-Generator/Grade910HumanSignoff.jsx'),'utf8')
 const app=fs.readFileSync(path.join(root,'App.jsx'),'utf8')
 assert.match(ui,/digest\(await file\.arrayBuffer\(\)\)/)
 assert.match(ui,/keep the original evidence file/i)
 assert.doesNotMatch(ui,/new Blob\(\[JSON\.stringify\(packet/)
 assert.match(app,/academic\/grade910-signoffs[^\n]*school_admin/)
})
