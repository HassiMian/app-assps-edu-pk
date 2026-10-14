'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const gate=require('../qbank/inspect-grade910-human-signoff-claims.cjs')
const rows=require('../../al-siddique-frontend/src/Modules/Paper-Generator/data/grade910AdoptionCatalogIndex.json').rows
const H='a'.repeat(64)
const rawPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')
function fixture(action='book_adoption',id=rows[0].catalogId){
 const src=rows.find(x=>x.catalogId===id)
 const role=['book_adoption','principal_approval'].includes(action)?'principal':'teacher'
 return {
  schemaVersion:'assps-grade910-human-claim-with-signature-v1',
  schoolCode:'ASSPS',academicSession:'2026-27',intendedBoardExamYear:2027,
  actorClaim:{userId:'42',role},personallySignedAt:'2026-10-14T01:00:00.000Z',
  action,sourceCatalogRecordId:src.catalogId,sourcePdfSha256:src.sourcePdfSha256,
  originalQuestionRevisionSetSha256:src.originalQuestionRevisionSetSha256,
  sourceGradeUnassigned:src.grade===0,subject:src.subject,grade:src.grade,medium:src.medium,
  bookDecision:action==='book_adoption'?'adopted':null,
  printedEdition:action==='book_adoption'?'Original class printed edition':null,
  originalQuestionId:action==='book_adoption'?null:'actual-question-id-requires-school-lookup',
  finalQuestionRevisionSha256:action==='book_adoption'?null:H,
  finalAnswerRevisionSha256:action==='book_adoption'?null:H,
  independentTeacherReceiptSha256:action==='principal_approval'?H:null,
  supportingEvidenceSha256:H,completedReviewChecks:['subject_review','urdu_review'].includes(action)?gate.CHECKS.slice():[],
  handwriting:{mimeType:'image/png',sha256:crypto.createHash('sha256').update(rawPng).digest('hex'),
   imageDataUrl:'data:image/png;base64,'+rawPng.toString('base64')},
  signerDeclaration:'I personally reviewed this source and evidence and signed with my own hand.',
  verificationStatus:'UNTRUSTED_CLAIM_PENDING_SCHOOL_AUTHENTICATION',
  academicallyApproved:false,paperStudioSelectable:false,published:false
 }
}
test('all 56 original catalog identities and 2,581 immutable references present',()=>{
 assert.equal(rows.length,56)
 assert.equal(rows.reduce((n,x)=>n+x.originalCandidateCount,0),2581)
 assert.equal(rows.filter(x=>x.catalogId.startsWith('pectaa-recovered-')).length,4)
})
test('real-person PNG image claim remains UNVERIFIED even with matching source and image bytes',()=>{
 const r=gate.inspect(fixture())
 assert.equal(r.claimFileValidated,true)
 assert.equal(r.authenticatedStaffIdentity,false)
 assert.equal(r.academicallyApproved,0)
 assert.equal(r.published,0)
 assert.equal(r.paperStudioSelectable,false)
})
test('teacher eight-check evidence remains separate from school principal signoff',()=>{
 const src=rows.find(x=>x.medium==='English')
 const r=gate.inspect(fixture('subject_review',src.catalogId))
 assert.equal(r.claimedActorRole,'teacher')
 assert.equal(r.principalAuthorityVerified,false)
})
test('principal signature claim requires a real independent teacher receipt digest',()=>{
 const x=fixture('principal_approval');delete x.independentTeacherReceiptSha256
 assert.throws(()=>gate.inspect(x),/INDEPENDENT_TEACHER_RECEIPT_REQUIRED/)
})
test('falsified academic approval is rejected even if all image bytes match',()=>{
 const x=fixture();x.academicallyApproved=true
 assert.throws(()=>gate.inspect(x),/FORGED_APPROVAL_OR_SESSION/)
})
test('source PDF fingerprint mismatch is rejected',()=>{
 const x=fixture();x.sourcePdfSha256='0'.repeat(64)
 assert.throws(()=>gate.inspect(x),/IMMUTABLE_ORIGINAL_SOURCE_ID_MISMATCH/)
})
test('role claims cannot escalate teacher to school adoption authority',()=>{
 const x=fixture();x.actorClaim.role='teacher'
 assert.throws(()=>gate.inspect(x),/UNVERIFIED_ACTOR_SCOPE_OR_TIMESTAMP/)
})
test('PNG image hash mismatch fails closed',()=>{
 const x=fixture();x.handwriting.sha256='0'.repeat(64)
 assert.throws(()=>gate.inspect(x),/PNG_SIGNATURE_BYTES_OR_SHA_MISMATCH/)
})
test('incomplete eight academic checks fail',()=>{
 const x=fixture('subject_review');x.completedReviewChecks.pop()
 assert.throws(()=>gate.inspect(x),/EIGHT_ACADEMIC_CHECKS_NOT_ATTESTED/)
})
test('2026 annual examination cannot silently validate 2027 school edition',()=>{
 const x=fixture();x.intendedBoardExamYear=2026
 assert.throws(()=>gate.inspect(x),/FORGED_APPROVAL_OR_SESSION/)
})
test('unreferenced source ID is denied',()=>{
 const x=fixture();x.sourceCatalogRecordId='pectaa-recovered-unknown'
 assert.throws(()=>gate.inspect(x),/IMMUTABLE_ORIGINAL_SOURCE_ID_MISMATCH/)
})
test('private-only file intake requires 0600 without hardlinks/symlinks',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps-grade910-human-signoff-'))
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}))
 const file=path.join(dir,'claim.json')
 fs.writeFileSync(file,JSON.stringify(fixture()),{mode:0o600})
 assert.equal(gate.inspectFile(file).academicallyApproved,0)
 fs.chmodSync(file,0o644)
 assert.throws(()=>gate.inspectFile(file),/PRIVATE_FILE_PERMISSIONS_OR_BYTES/)
 fs.chmodSync(file,0o600)
 const sym=path.join(dir,'sym.json');fs.symlinkSync(file,sym)
 assert.throws(()=>gate.inspectFile(sym),/PRIVATE_FILE_PERMISSIONS_OR_BYTES/)
})
