const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const express = require('express')
const http = require('node:http')
const jwt = require('jsonwebtoken')
const {tenantContext,pool} = require('../config/database')

function apiCall(port,method,url,body,token){
  const text=body===undefined?'':JSON.stringify(body)
  return new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port,path:url,method,headers:{
      'content-type':'application/json',
      ...(token?{authorization:'Bearer '+token}:{}),
      ...(text?{'content-length':Buffer.byteLength(text)}:{})
    }},res=>{
      let raw=''
      res.on('data',buf=>raw+=buf)
      res.on('end',()=>{let parsed;try{parsed=JSON.parse(raw)}catch{parsed=null}
        resolve({status:res.statusCode,data:parsed,raw})})
    })
    req.on('error',reject)
    if(text)req.write(text)
    req.end()
  })
}

test('Phase5: existing provisional Grade9 seed enters same-tenant governed revision without approval, duplicate or teacher bypass',
  {timeout:90000},async t=>{
  assert.equal(process.env.NODE_ENV,'test')
  assert.match(String(process.env.DB_NAME||''),/^assps_phase5_academic_review_test_/)
  const schoolId=1,id='q_phase5_'+crypto.randomBytes(8).toString('hex')
  const seeded={
    id,school_id:schoolId,class_level:'9th',subject:'Biology',medium:'english',
    chapter_no:'1',chapter_name:'The Science of Biology',question_type:'mcq',
    question_text:'Which field studies animal behavior in their ecosystems? '+id,
    options:['Zoology','Mineralogy','Astronomy','Geology'],
    correct_option:'A',answer:'Zoology',explanation:'Zoology covers animals and how they interact.',
    marks:1,source_type:'json_seed',metadata:{review_state:'provisional_internal'},
    is_approved:false,
  }
  const makeApp=()=>{
    const app=express();app.use(express.json())
    app.use((req,res,next)=>tenantContext.run({
      rlsEnabled:true,isSuperAdmin:false,tenantId:schoolId,tenantKey:'assps'
    },next))
    app.use('/api/question-bank',require('../routes/questionBankRoutes'))
    return app
  }
  const server=await new Promise(resolve=>{
    const app=makeApp(),s=app.listen(0,'127.0.0.1',()=>resolve(s))
  })
  t.after(async()=>{await new Promise(r=>server.close(r));await pool.end()})
  const port=server.address().port
  const sign=userId=>jwt.sign({id:userId},process.env.JWT_SECRET,{expiresIn:'5m',algorithm:'HS256'})
  const author=sign(999)
  const teacher=sign(2420)
  await tenantContext.run({rlsEnabled:true,isSuperAdmin:false,tenantId:schoolId,tenantKey:'assps'},async()=>{
    await pool.query(
      `INSERT INTO question_bank(id,school_id,class_level,subject,medium,chapter_no,chapter_name,
        question_type,question_text,options,correct_option,answer,explanation,marks,source_type,
        metadata,is_approved,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16::jsonb,false,$17)`,
      [seeded.id,seeded.school_id,seeded.class_level,seeded.subject,seeded.medium,
       seeded.chapter_no,seeded.chapter_name,seeded.question_type,seeded.question_text,
       JSON.stringify(seeded.options),seeded.correct_option,seeded.answer,seeded.explanation,
       seeded.marks,seeded.source_type,JSON.stringify(seeded.metadata),999]
    )
  })
  const before=await apiCall(port,'GET','/api/question-bank/'+id,undefined,author)
  assert.equal(before.status,200,before.raw)
  assert.equal(before.data.data.is_approved,false)
  assert.equal(before.data.data.governance_public_id,null)
  const sourceRegistry=await apiCall(port,'GET','/api/question-bank/academic-sources',undefined,author)
  assert.equal(sourceRegistry.status,200,sourceRegistry.raw)
  assert.equal(sourceRegistry.data.data.length,22)
  assert.equal(sourceRegistry.data.data.filter(s=>s.academicApproval).length,0)
  const denied=await apiCall(port,'POST','/api/question-bank/academic-intake/'+id,{},teacher)
  assert.ok([401,403].includes(denied.status),denied.raw)
  const taken=await apiCall(port,'POST','/api/question-bank/academic-intake/'+id,{},author)
  assert.equal(taken.status,201,taken.raw)
  assert.equal(taken.data.academicApprovalGranted,false)
  assert.equal(taken.data.data.currentRevision,1)
  const publicId=taken.data.data.publicId
  assert.match(publicId,/^qm_/)
  const after=await apiCall(port,'GET','/api/question-bank/'+id,undefined,author)
  assert.equal(after.status,200,after.raw)
  assert.equal(after.data.data.is_approved,false)
  assert.equal(after.data.data.governance_public_id,publicId)
  const context=await apiCall(port,'GET','/api/question-bank/governance/'+publicId+'/review-context',undefined,author)
  assert.equal(context.status,200,context.raw)
  assert.equal(context.data.data.requesterIsAuthor,true)
  assert.equal(context.data.data.independentReviewRecorded,false)
  assert.equal(context.data.data.question.questionText,seeded.question_text)
  const duplicate=await apiCall(port,'POST','/api/question-bank/academic-intake/'+id,{},author)
  assert.equal(duplicate.status,409,duplicate.raw)
  assert.equal(duplicate.data.code,'INTAKE_ALREADY_GOVERNED')
  const unexpectedApproval=await apiCall(port,'PATCH','/api/question-bank/governance/'+publicId+'/status',{status:'ready'},author)
  assert.equal(unexpectedApproval.status,409,unexpectedApproval.raw)
  const final=await apiCall(port,'GET','/api/question-bank/'+id,undefined,author)
  assert.equal(final.data.data.is_approved,false)
  const result=await tenantContext.run({
    rlsEnabled:true,isSuperAdmin:false,tenantId:schoolId,tenantKey:'assps'
  },()=>pool.query('SELECT count(*)::int AS n FROM question_bank WHERE school_id=$1 AND id=$2',[schoolId,id]))
  assert.equal(result.rows[0].n,1)
  console.log('PHASE5_SAME_TENANT_ZERO_APPROVAL_INTAKE_PASS')
})
