'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {verifyDocument,verifiedBody}=require('../../al-siddique-backend/src/services/grade910PaperWorkspaceVerification')
const {sha}=require('../../al-siddique-backend/src/services/grade910VerifiedPublicationContract')
const H='b'.repeat(64)
const q={text:'State the role of DNA.',options:[{label:'A',text:'Hereditary information'},{label:'B',text:'Thermal energy'}],marks:2}
const payload={originalQuestionId:'IX-BIO-01',questionRevision:7,finalQuestion:q,finalAnswer:{answer:'A'}}
const approved={school_id:11,original_question_id:'IX-BIO-01',question_revision:7,question_sha:sha(q),answer_sha:sha(payload.finalAnswer),grade:9,
 subject:'Biology',medium:'english',catalog_id:'catalog-isolated',original_source_pdf_sha:H,
 verified_review_packet_sha:H,qualified_faculty_receipt_sha:H,school_book_certificate_sha:H,
 principal_approval_sha:H,publication_grant_sha:H,
 academic_approval_verified:true,paper_studio_acceptance_verified:true,core_restricted_release_verified:true,
 published_at:'2026-10-14T12:00:00Z',revoked_at:null,paper_payload:payload}
const content=verifiedBody(q)
function doc(){
 return{format:'assps-canonical-paper',documentModel:'PaperDocumentV2',schemaVersion:3,
 metadata:{classLevel:'9th',subjectName:'Biology'},sections:[{
 id:'manual-section-verified-IX-BIO-01-rev-7',nodes:[{type:'rich_text',content,
 authoritativeNodeMarks:2,operationalNodeMarks:2}]}],
 grade910Verified:{grade:9,subject:'Biology',section:'Usman',refs:[{sectionId:'verified-IX-BIO-01-rev-7',originalQuestionId:'IX-BIO-01',revision:7,
 questionSha:approved.question_sha,answerSha:approved.answer_sha,publicationGrantSha:H}]}}
}
async function check(d,opts={}){
 const client={async query(sql,args){
  if(sql.includes('teacher_class_assignments'))return{rows:opts.assignment===false?[]:[{one:1}]}
  assert.match(sql,/grade910_verified_paper_publications/)
  assert.equal(args[0],11)
  return{rows:opts.row===undefined?[approved]:opts.row}
 }}
 return verifyDocument({document:d,schoolId:11,actorId:20,actorRole:opts.role||'principal',client})
}
test('valid school-scoped immutable question+answer and exact content pass at save, reopen, and print',async()=>{
 assert.equal((await check(doc())).verifiedCount,1)
})
test('teacher requires an active exact class, section and subject assignment',async()=>{
 assert.equal((await check(doc(),{role:'teacher'})).verifiedCount,1)
 await assert.rejects(check(doc(),{role:'teacher',assignment:false}),/VERIFIED_FACULTY_SCOPE_MISSING/)
})
test('revoked or unpublished school publication is never selectable for print',async()=>{
 for(const r of [{...approved,revoked_at:'2026-10-14T18:00:00Z'}, {...approved,academic_approval_verified:false},
 {...approved,qualified_faculty_receipt_sha:null}])
  await assert.rejects(check(doc(),{row:[r]}),/VERIFIED_REVISION_NO_LONGER_PUBLISHED/)
})
test('edited text, option, deletion or marks fail closed after import',async()=>{
 const a=doc();a.sections[0].nodes[0].content+='\nTampered answer'
 await assert.rejects(check(a),/VERIFIED_QUESTION_EDIT_INVALIDATES_APPROVAL/)
 const b=doc();b.sections=[]
 await assert.rejects(check(b),/VERIFIED_SECTION_REMOVED_OR_REPLACED/)
 const c=doc();c.sections[0].nodes[0].authoritativeNodeMarks=3
 await assert.rejects(check(c),/VERIFIED_QUESTION_MARKS_CHANGED/)
})
test('wrong question revision, answer digest, forged grant or school scope fail closed',async()=>{
 for(const k of ['questionSha','answerSha','publicationGrantSha']){
  const d=doc();d.grade910Verified.refs[0][k]='c'.repeat(64)
  await assert.rejects(check(d),/VERIFIED_REVISION_NO_LONGER_PUBLISHED/)
 }
 const grade=doc();grade.metadata.classLevel='10th'
 await assert.rejects(check(grade),/VERIFIED_PAPER_METADATA_SCOPE_MISMATCH/)
 const name=doc();name.metadata.subjectName='Chemistry'
 await assert.rejects(check(name),/VERIFIED_PAPER_METADATA_SCOPE_MISMATCH/)
})
test("principal signature claim alone cannot create approved publication",async()=>{
 await assert.rejects(check(doc(),{row:[]}),/VERIFIED_REVISION_NO_LONGER_PUBLISHED/)
})
test('no verified references means ordinary manual paper, never certified',async()=>{
 const d=doc();delete d.grade910Verified
 const result=await check(d)
 assert.equal(result.verifiedCount,0);assert.equal(result.releaseAuthority,false)
})
