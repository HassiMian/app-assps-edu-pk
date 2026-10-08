'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const governancePath=require.resolve('../services/questionBankGovernance')
let fakeMaster
const fakeWithTenant=async(schoolId,callback)=>{
 assert.equal(Number(schoolId),1)
 const client={query:async sql=>{
  if(sql.includes('FROM users'))return {rowCount:1,rows:[{id:42,role:'principal'}]}
  if(sql.includes('FROM question_masters'))return {rowCount:1,rows:[fakeMaster]}
  throw Error('Unexpected DB query from review-context')
 }}
 return callback(client,1)
}
const previous=require.cache[governancePath]
require.cache[governancePath]={id:governancePath,filename:governancePath,loaded:true,exports:{withTenantTransaction:fakeWithTenant}}
const {getAcademicReviewContext}=require('../services/grade910AcademicReviewService')
if(previous)require.cache[governancePath]=previous
else delete require.cache[governancePath]
const baseline=Object.freeze({
 public_id:'IX-TEST-REV-1',lifecycle_status:'ready',current_revision:3,created_by:13,
 source_question_bank_id:229,content_json:{classLevel:'9th',subject:'biology'},
 content_hash:'a'.repeat(64),revision_author_id:17
})
test('ready lifecycle never implies independent academic approval',async()=>{
 fakeMaster={...baseline}
 const x=await getAcademicReviewContext({schoolId:1,requesterId:42,publicId:baseline.public_id})
 assert.equal(x.lifecycleStatus,'ready')
 assert.equal(x.questionBankLinked,true)
 assert.equal(x.academicApprovalGranted,false)
 assert.equal(x.academicApprovalProofStatus,'NOT_EVALUATED_IN_REVIEW_CONTEXT')
})
test('being the question author cannot grant source verification',async()=>{
 fakeMaster={...baseline,author_id:42}
 const x=await getAcademicReviewContext({schoolId:1,requesterId:42,publicId:baseline.public_id})
 assert.equal(x.requesterIsAuthor,true)
 assert.equal(x.academicApprovalGranted,false)
})
test('reviewed lifecycle is not academic source approval either',async()=>{
 fakeMaster={...baseline,lifecycle_status:'reviewed'}
 const x=await getAcademicReviewContext({schoolId:1,requesterId:42,publicId:baseline.public_id})
 assert.equal(x.academicApprovalGranted,false)
 assert.equal(x.academicApprovalProofStatus,'NOT_EVALUATED_IN_REVIEW_CONTEXT')
})
