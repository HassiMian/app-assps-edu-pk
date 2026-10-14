'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const {assertVerifiedPaperDocument}=require('../../al-siddique-backend/src/services/grade910PaperWorkspaceReleaseGuard')
const {sha,publicationMessage}=require('../../al-siddique-backend/src/services/grade910VerifiedPublicationContract')
const keys=crypto.generateKeyPairSync('ed25519')
process.env.DB_RUNTIME_ROLE='qa_signed_nobypass'
process.env.ASSPS_GRADE910_PUBLISHER_PUBLIC_KEY_PEM=keys.publicKey.export({type:'spki',format:'pem'})
process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256=crypto.createHash('sha256').update(keys.publicKey.export({type:'spki',format:'der'})).digest('hex')
const H='a'.repeat(64)
const question={type:'mcq',marks:1,text:'What is cellular ATP?',options:[{key:'A',text:'Energy carrier'},{key:'B',text:'Nuclear envelope'}]}
const answer={correctOption:'A'}
function row(){
 const r={
  school_id:1,original_question_id:'IX-ATP-001',question_revision:1,
  question_sha:sha(question),answer_sha:sha(answer),
  grade:9,subject:'Biology',medium:'english',catalog_id:'qa-source',
  original_source_pdf_sha:H,verified_review_packet_sha:H,qualified_faculty_receipt_sha:H,
  school_book_certificate_sha:H,principal_approval_sha:H,publication_grant_sha:H,
  academic_approval_verified:true,paper_studio_acceptance_verified:true,core_restricted_release_verified:true,
  published_at:'2026-10-14T01:00:00Z',revoked_at:null,
  paper_payload:{originalQuestionId:'IX-ATP-001',questionRevision:1,finalQuestion:structuredClone(question),finalAnswer:structuredClone(answer)}
 }
 r.publication_signature_base64=crypto.sign(null,publicationMessage(r),keys.privateKey).toString('base64')
 return r
}
function doc(r){
 const content='1. What is cellular ATP?\n(A) Energy carrier\n(B) Nuclear envelope'
 const section={id:'signed-grade910-IX-ATP-001-r1',content,marks:1,layoutPreset:'mcq',answerKey:{'1':'A'}}
 return {
  metadata:{className:'9th',subjectName:'Biology'},
  sections:[{id:'manual-section-'+section.id,nodes:[{content,operationalNodeMarks:1}],operationalSectionTotal:1}],
  academicVerifiedSelections:{schemaVersion:'assps-grade910-canonical-approved-revisions-v1',
   alwaysRequireServerReverification:true,
   rows:[{originalQuestionId:r.original_question_id,revision:1,questionSha:r.question_sha,answerSha:r.answer_sha,
    publicationGrantSha:H,question:{marks:1,verifiedAcademicRef:{originalQuestionId:r.original_question_id,revision:1,
     questionSha:r.question_sha,answerSha:r.answer_sha,publicationGrantSha:H,grade:9,subject:'Biology',section:'Usman'}},
    section}]}
 }
}
const principal={id:6,role:'principal'}
test('manual/legacy papers remain unaffected; no false academic upgrade',async()=>{
 const result=await assertVerifiedPaperDocument({document:{metadata:{},sections:[]},schoolId:1,actor:principal,lookup:()=>{throw Error('should not fetch')}})
 assert.equal(result.verifiedReferences,0)
})
test('genuinely signed synthetic principal publication verifies at server Save/Release',async()=>{
 const published=row()
 const result=await assertVerifiedPaperDocument({document:doc(published),schoolId:1,actor:principal,lookup:async(sql,args)=>{
  assert.equal(args[0],1);return{rows:[published]}
 }})
 assert.equal(result.verifiedReferences,1)
})
test('wrong enrolled school and signed claim replay blocked',async()=>{
 const r=row()
 await assert.rejects(assertVerifiedPaperDocument({document:doc(r),schoolId:2,actor:principal,lookup:async()=>({rows:[]})}),/CERTIFIED_PUBLISHER_SIGNATURE_OR_REVISION_INVALID/)
})
test('tampered actual rendered canonical question rejected',async()=>{
 const r=row(),document=doc(r);document.sections[0].nodes[0].content='1. Different unsourced question'
 await assert.rejects(assertVerifiedPaperDocument({document,schoolId:1,actor:principal,lookup:async()=>({rows:[r]})}),/CANONICAL_RENDERED_QUESTION_NOT_SOURCE_BOUND/)
})
test('signed source content that no longer matches rendered text rejected',async()=>{
 const r=row();r.paper_payload.finalQuestion.text='Changed after release'
 await assert.rejects(assertVerifiedPaperDocument({document:doc(row()),schoolId:1,actor:principal,lookup:async()=>({rows:[r]})}),/CERTIFIED_PUBLISHER_SIGNATURE_OR_REVISION_INVALID/)
})
test('teacher exact live assignment is mandatory for signed papers',async()=>{
 const r=row()
 await assert.rejects(assertVerifiedPaperDocument({document:doc(r),schoolId:1,actor:{id:50,role:'teacher'},lookup:async(sql)=>sql.includes('teacher_class_assignments')?{rows:[{allowed:false}]}:{rows:[r]}}),/CERTIFIED_TEACHER_EXACT_ASSIGNMENT_REQUIRED/)
})
test('teacher approved exact section passes only under assigned JWT subject',async()=>{
 const r=row()
 const result=await assertVerifiedPaperDocument({document:doc(r),schoolId:1,actor:{id:50,role:'teacher'},
  lookup:async(sql)=>sql.includes('teacher_class_assignments')?{rows:[{allowed:true}]}:{rows:[r]}})
 assert.equal(result.verifiedReferences,1)
})
test('absent real pinned publisher root blocks signed canonical documents',async()=>{
 const r=row(),prev=process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256
 delete process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256
 await assert.rejects(assertVerifiedPaperDocument({document:doc(r),schoolId:1,actor:principal,lookup:async()=>({rows:[r]})}),/CORE_SIGNED_PUBLICATION_TRUST_NOT_CONFIGURED/)
 process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256=prev
})
