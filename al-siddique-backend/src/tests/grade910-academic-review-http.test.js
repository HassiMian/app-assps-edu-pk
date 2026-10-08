const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('node:http')
const jwt=require('jsonwebtoken')
const {tenantContext,pool}=require('../config/database')
const {ACADEMIC_REVIEW_VERSION,ATTESTATIONS}=require('../services/grade910AcademicReviewGate')
const registry=require('../data/verifiedGrade910SourceRegistry.json')
const source=registry.entries.find(x=>x.recordId==='pectaa-catalog-009')
function request(port,method,url,body,token){
 const payload=body===undefined?'':JSON.stringify(body)
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port,method,path:url,headers:{
    'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),
    ...(payload?{'content-length':Buffer.byteLength(payload)}:{})
  }},res=>{
   let raw='';res.on('data',x=>raw+=x);res.on('end',()=>{
    let value=null;try{value=JSON.parse(raw)}catch{}
    resolve({status:res.statusCode,body:value,raw})
   })
  })
  req.on('error',reject);if(payload)req.write(payload);req.end()
 })
}
const reviewPayload={
 schemaVersion:ACADEMIC_REVIEW_VERSION,sourceRecordId:source.recordId,
 sourcePdfSha256:source.pdfSha256,edition:source.edition,
 chapterNo:'1',questionOrigin:'ORIGINAL',sourcePrintedPage:null,exerciseReference:null,
 attestations:Object.fromEntries(ATTESTATIONS.map(k=>[k,true])),
 editorialNotes:'I independently compared this original question with the verified Chapter 1 textbook source, assessed the scientific answer, evaluated the MCQ alternatives, and checked suitability for Grade 9.',
}
test('tenant-local revision-bound independent academic gate prevents premature Grade 9 approval',
  {timeout:60000},async t=>{
  assert.equal(process.env.NODE_ENV,'test')
  assert.match(String(process.env.DB_NAME||''),/^assps_(?:academic_review_stage|review_255_stage)_20261008$/)
  const app=express();app.use(express.json())
  app.use((req,res,next)=>tenantContext.run({
    rlsEnabled:true,isSuperAdmin:false,tenantId:1,tenantKey:'assps'
  },next))
  app.use('/api/question-bank',require('../routes/questionBankRoutes'))
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))})
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await pool.end()})
  const port=server.address().port
  const signed=id=>jwt.sign({id},process.env.JWT_SECRET,{expiresIn:'5m',algorithm:'HS256'})
  const author=signed(999),reviewer=signed(1),approver=signed(2419)
  const nonce=String(Date.now()).slice(-7)
  const stem='Which scientific discipline primarily studies the behavior of animals in a habitat? '+nonce
  const q={
    class_level:'9th',subject:'Biology',medium:'english',chapter_no:'1',
    chapter_name:'The Science of Biology',question_type:'mcq',question_text:stem,
    options:['Zoology','Botany','Astronomy','Geology'],
    correct_option:'A',answer:'Zoology',
    explanation:'Zoology is the field of biology concerned with animals.',marks:1,
  }
  const created=await request(port,'POST','/api/question-bank',q,author)
  assert.equal(created.status,201,created.raw)
  const id=created.body.data.id,pub=created.body.data.governance.publicId
  assert.equal(created.body.data.is_approved,false)
  const direct=await request(port,'PATCH','/api/question-bank/governance/'+pub+'/status',{status:'ready'},approver)
  assert.equal(direct.status,409,direct.raw)
  const initial=await request(port,'PATCH','/api/question-bank/governance/'+pub+'/status',{status:'reviewed'},author)
  assert.equal(initial.status,200,initial.raw)
  const context=await request(port,'GET','/api/question-bank/governance/'+pub+'/review-context',undefined,reviewer)
  assert.equal(context.status,200,context.raw)
  assert.equal(context.body.data.currentRevision,1)
  // A valid admin of another school cannot discover or review this tenant's revision.
  const otherSchoolAdmin=signed(2420)
  const foreignContext=await request(port,'GET','/api/question-bank/governance/'+pub+
    '/review-context',undefined,otherSchoolAdmin)
  assert.ok([401,403,404].includes(foreignContext.status),foreignContext.raw)
  const foreignReview=await request(port,'POST','/api/question-bank/governance/'+pub+
    '/academic-review',{expectedRevision:1,
      expectedContentHash:context.body.data.currentContentHash,
      evidence:reviewPayload},otherSchoolAdmin)
  assert.ok([401,403,404].includes(foreignReview.status),foreignReview.raw)
  const {getAcademicReviewContext}=require('../services/grade910AcademicReviewService')
  await assert.rejects(
    getAcademicReviewContext({schoolId:2,requesterId:2420,publicId:pub}),
    {code:'REVIEW_QUESTION_NOT_FOUND'}
  )
  const cmd={expectedRevision:context.body.data.currentRevision,
    expectedContentHash:context.body.data.currentContentHash,evidence:reviewPayload}
  const url='/api/question-bank/governance/'+pub+'/academic-review'
  const self=await request(port,'POST',url,cmd,author)
  assert.equal(self.status,403,self.raw)
  const hashDrift=await request(port,'POST',url,{...cmd,expectedContentHash:'0'.repeat(64)},reviewer)
  assert.equal(hashDrift.status,409,hashDrift.raw)
  const badSource=await request(port,'POST',url,{
    ...cmd,evidence:{...reviewPayload,sourcePdfSha256:'0'.repeat(64)}
  },reviewer)
  assert.equal(badSource.status,422,badSource.raw)
  const reviewed=await request(port,'POST',url,cmd,reviewer)
  assert.equal(reviewed.status,201,reviewed.raw)
  assert.equal(reviewed.body.data.questionBankApproved,false)
  const repeated=await request(port,'POST',url,cmd,reviewer)
  assert.equal(repeated.status,200,repeated.raw)
  assert.equal(repeated.body.data.replayed,true)
  const sameActor=await request(port,'PATCH','/api/question-bank/governance/'+pub+'/status',{status:'ready'},reviewer)
  assert.equal(sameActor.status,409,sameActor.raw)
  assert.equal(sameActor.body.code,'REVIEW_INDEPENDENCE_REQUIRED')
  const notYet=await request(port,'GET','/api/question-bank/'+id,undefined,author)
  assert.equal(notYet.status,200,notYet.raw)
  assert.equal(notYet.body.data.is_approved,false)
  const approved=await request(port,'PATCH','/api/question-bank/governance/'+pub+'/status',{status:'ready'},approver)
  assert.equal(approved.status,200,approved.raw)
  const final=await request(port,'GET','/api/question-bank/'+id,undefined,author)
  assert.equal(final.status,200,final.raw)
  assert.equal(final.body.data.is_approved,true)
  assert.equal(final.body.data.metadata.review_state,'academically_reviewed')
  assert.equal(final.body.data.metadata.reviewed_revision,1)
  assert.equal(final.body.data.metadata.academic_reviewer_id,1)
  assert.equal(final.body.data.metadata.approved_by,2419)
  assert.equal(final.body.data.metadata.source_pdf_sha256,source.pdfSha256)
  // A signed review is never reusable after a newer canonical revision.
  const second=await request(port,'POST','/api/question-bank',{
    ...q,question_text:stem+' A second independent scenario',answer:'Zoology',
  },author)
  assert.equal(second.status,201,second.raw)
  const secondId=second.body.data.id,secondPub=second.body.data.governance.publicId
  assert.equal((await request(port,'PATCH','/api/question-bank/governance/'+secondPub+
    '/status',{status:'reviewed'},author)).status,200)
  const secondContext=await request(port,'GET',
    '/api/question-bank/governance/'+secondPub+'/review-context',undefined,reviewer)
  assert.equal(secondContext.status,200,secondContext.raw)
  const evidence1=await request(port,'POST',
    '/api/question-bank/governance/'+secondPub+'/academic-review',{
      expectedRevision:secondContext.body.data.currentRevision,
      expectedContentHash:secondContext.body.data.currentContentHash,
      evidence:reviewPayload,
    },reviewer)
  assert.equal(evidence1.status,201,evidence1.raw)
  const changed=await request(port,'PUT','/api/question-bank/'+secondId,{
    expectedGovernanceRevision:1,answer:'Revised response requiring a fresh review',
  },author)
  assert.equal(changed.status,200,changed.raw)
  assert.equal(changed.body.data.governance.currentRevision,2)
  const blocked=await request(port,'PATCH','/api/question-bank/governance/'+
    secondPub+'/status',{status:'ready'},approver)
  assert.equal(blocked.status,409,blocked.raw)
  assert.equal(blocked.body.code,'INDEPENDENT_REVIEW_REQUIRED')
  const stillUnapproved=await request(port,'GET','/api/question-bank/'+
    secondId,undefined,approver)
  assert.equal(stillUnapproved.body.data.is_approved,false)
  console.log('GRADE910_STALE_REVISION_FAIL_CLOSED_HTTP_PASS')
  console.log('GRADE910_INDEPENDENT_ACADEMIC_REVIEW_HTTP_PASS')
})
