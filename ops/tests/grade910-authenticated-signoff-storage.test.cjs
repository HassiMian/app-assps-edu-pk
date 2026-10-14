'use strict'
process.env.DB_STARTUP_PROBE='false'
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const svc=require('../../al-siddique-backend/src/services/grade910HumanSignoffService')
const source=svc.catalog.rows.find(x=>x.medium==='English'&&x.grade===9)
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')
const dig=crypto.createHash('sha256').update(png).digest('hex'),hash='a'.repeat(64)
const actor={id:5432,schoolId:11,role:'teacher'}
const CHECKS=['Curriculum and session','Actual book edition and exercise page','Question correctness',
'Answer and MCQ key','Marks and difficulty','English/Urdu correctness','Duplicates','Original source provenance']
function claim(){
 return {schemaVersion:'assps-grade910-human-claim-with-signature-v1',schoolCode:'ASSPS',
 academicSession:'2026-27',intendedBoardExamYear:2027,
 actorClaim:{userId:'5432',role:'teacher'},personallySignedAt:new Date().toISOString(),
 action:'subject_review',sourceCatalogRecordId:source.catalogId,sourcePdfSha256:source.sourcePdfSha256,
 originalQuestionRevisionSetSha256:source.originalQuestionRevisionSetSha256,
 sourceGradeUnassigned:false,subject:source.subject,grade:source.grade,medium:source.medium,
 bookDecision:null,printedEdition:null,originalQuestionId:'IX-A-1',finalQuestionRevisionSha256:hash,
 finalAnswerRevisionSha256:hash,independentTeacherReceiptSha256:null,
 supportingEvidenceSha256:hash,completedReviewChecks:CHECKS.slice(),handwriting:{
 mimeType:'image/png',sha256:dig,imageDataUrl:'data:image/png;base64,'+png.toString('base64')},
 signerDeclaration:'I personally reviewed this source and evidence and signed with my own hand.',
 verificationStatus:'UNTRUSTED_CLAIM_PENDING_SCHOOL_AUTHENTICATION',
 academicallyApproved:false,paperStudioSelectable:false,published:false}
}
test('real source claim is accepted as unverified evidence',()=>{
 const r=svc.verifyClaim(claim(),actor)
 assert.equal(r.source.catalogId,source.catalogId)
 assert.equal(r.png.equals(png),true)
})
test('AES256-GCM storage encryption decrypts only with correct private key',()=>{
 const key='0'.repeat(64),b=svc.encryptPng(png,key)
 const d=crypto.createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),b.nonce)
 d.setAuthTag(b.tag)
 assert.equal(Buffer.concat([d.update(b.ciphertext),d.final()]).equals(png),true)
})

test('role spoof denied',()=>{
 const x=claim();x.actorClaim.role='principal'
 assert.throws(()=>svc.verifyClaim(x,actor),/STAFF_ROLE_OR_ID_SPOOF/)
})
test('no authenticated school actor denied',()=>{
 assert.throws(()=>svc.verifyClaim(claim(),{...actor,schoolId:null}),/AUTHENTICATED_SCHOOL_STAFF_REQUIRED/)
})
test('forged approved count denied',()=>{
 const x=claim();x.academicallyApproved=true
 assert.throws(()=>svc.verifyClaim(x,actor),/FORGED_SCHOOL_CERTIFICATION/)
})
test('changed source fingerprint denied',()=>{
 const x=claim();x.originalQuestionRevisionSetSha256='0'.repeat(64)
 assert.throws(()=>svc.verifyClaim(x,actor),/FROZEN_CATALOG_MISMATCH/)
})
test('tampered PNG digest denied',()=>{
 const x=claim();x.handwriting.sha256='1'.repeat(64)
 assert.throws(()=>svc.verifyClaim(x,actor),/SIGNATURE_BYTES_SHA_MISMATCH/)
})
test('missing faculty criteria denied',()=>{
 const x=claim();x.completedReviewChecks.pop()
 assert.throws(()=>svc.verifyClaim(x,actor),/EIGHT_ACADEMIC_CHECKS_REQUIRED/)
})
test('no encryption key blocks upload',()=>{
 assert.throws(()=>svc.encryptPng(png,''),/PRIVATE_SIGNATURE_ENCRYPTION_KEY_MISSING/)
})

test('authenticated INSERT is owner scoped and never publishes',async()=>{
 let sql,args
 const fake=async(q,p)=>{sql=q;args=p;return {rows:[{id:19}]}}
 const r=await svc.storeClaim({payload:claim(),actor,query:fake,encryptionKey:'0'.repeat(64)})
 assert.equal(r.academicallyApproved,false);assert.equal(args[0],11);assert.equal(args[1],5432)
 assert.match(sql,/ON CONFLICT/)
})
