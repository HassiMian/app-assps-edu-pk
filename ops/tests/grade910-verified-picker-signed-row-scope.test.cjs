'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const {rowBelongsToRequest}=require('../../al-siddique-backend/src/services/grade910PickerResponseScope')
const {sha,eligible,publicationMessage}=require('../../al-siddique-backend/src/services/grade910VerifiedPublicationContract')
const signing=crypto.generateKeyPairSync('ed25519')
const priorKey=process.env.ASSPS_GRADE910_PUBLISHER_PUBLIC_KEY_PEM
const priorFinger=process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256
process.env.ASSPS_GRADE910_PUBLISHER_PUBLIC_KEY_PEM=signing.publicKey.export({type:'spki',format:'pem'})
process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256=crypto.createHash('sha256').update(signing.publicKey.export({type:'spki',format:'der'})).digest('hex')
test.after(()=>{
 if(priorKey===undefined)delete process.env.ASSPS_GRADE910_PUBLISHER_PUBLIC_KEY_PEM
 else process.env.ASSPS_GRADE910_PUBLISHER_PUBLIC_KEY_PEM=priorKey
 if(priorFinger===undefined)delete process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256
 else process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256=priorFinger
})
const payload={originalQuestionId:'IX-BIO-01',questionRevision:7,
 finalQuestion:{text:'Synthetic sealed question for cross-tenant safety testing'},
 finalAnswer:{text:'Synthetic answer'}}
const H='b'.repeat(64)
function signedRow(props={}){
 const r={
  school_id:1,original_question_id:payload.originalQuestionId,question_revision:7,
  question_sha:sha(payload.finalQuestion),answer_sha:sha(payload.finalAnswer),
  grade:9,subject:'Biology',medium:'english',original_source_pdf_sha:H,
  catalog_id:'synthetic-exam-source',verified_review_packet_sha:H,
  qualified_faculty_receipt_sha:H,school_book_certificate_sha:H,
  principal_approval_sha:H,publication_grant_sha:H,
  academic_approval_verified:true,paper_studio_acceptance_verified:true,
  core_restricted_release_verified:true,
  published_at:'2026-10-15T00:00:00Z',revoked_at:null,paper_payload:payload,
  ...props}
 r.publication_signature_base64=crypto.sign(null,publicationMessage(r),signing.privateKey).toString('base64')
 return r
}
const principal={school:1,id:3,role:'principal'}
const teacher={school:1,id:9,role:'teacher'}
const summary={grade:9,subject:'Biology',exact:false}
const exact={...summary,exact:true,originalQuestionId:'IX-BIO-01',revision:7,questionSha:sha(payload.finalQuestion)}
test('fully signed synthetic same-school question passes independent selector scope',()=>{
 const row=signedRow()
 assert.equal(eligible(row),true)
 assert.equal(rowBelongsToRequest(row,principal,summary),true)
 assert.equal(rowBelongsToRequest(row,teacher,summary),true)
 assert.equal(rowBelongsToRequest(row,principal,exact),true)
})
test('correctly signed foreign school row cannot be replayed to a different principal/teacher',()=>{
 const other=signedRow({school_id:2})
 assert.equal(eligible(other),true,'signed foreign publication is structurally valid')
 assert.equal(rowBelongsToRequest(other,principal,summary),false)
 assert.equal(rowBelongsToRequest(other,teacher,exact),false)
 assert.equal(rowBelongsToRequest(other,{school:2,id:4},summary),true)
})
test('correctly signed different grade or subject cannot be replayed into another picker filter',()=>{
 for(const changed of [{grade:10},{subject:'Chemistry'},{subject:'Biology '}]){
  const row=signedRow(changed)
  assert.equal(eligible(row),true)
  assert.equal(rowBelongsToRequest(row,principal,summary),changed.subject==='Biology ')
 }
})
test('exact Save-Reopen-Print resolution rejects a different signed source id, revision or SHA',()=>{
 const alternate=signedRow({original_question_id:'IX-BIO-02',paper_payload:{
  ...payload,originalQuestionId:'IX-BIO-02'}})
 assert.equal(eligible(alternate),true)
 assert.equal(rowBelongsToRequest(alternate,principal,exact),false)
 for(const params of [
  {...exact,originalQuestionId:'IX-BIO-02'},
  {...exact,revision:8},
  {...exact,questionSha:'0'.repeat(64)},
  {...exact,questionSha:'not-a-hash'}]){
  const item=signedRow()
  assert.equal(eligible(item),true)
  assert.equal(rowBelongsToRequest(item,principal,params),false)
 }
})
test('malformed actor/scope/request and unsigned rows never bypass independent boundary',()=>{
 const row=signedRow()
 for(const actor of [null,{}, {school:0},{school:NaN},{school:1.2},{school:'1'}])
  assert.equal(rowBelongsToRequest(row,actor,summary),false)
 for(const request of [null,{}, {...summary,grade:8},{...summary,subject:''},
   {...summary,exact:undefined},{...summary,exact:1}])
  assert.equal(rowBelongsToRequest(row,principal,request),false)
 assert.equal(eligible({...row,publication_signature_base64:'fake'}),false)
})
