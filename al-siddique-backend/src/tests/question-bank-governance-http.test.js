const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const http = require('http')
const { tenantContext, pool } = require('../config/database')

function request(port, method, path, body, token='mock-jwt-token', headers={}) {
  return new Promise((resolve,reject)=>{
    const payload=body==null?'':JSON.stringify(body)
    const req=http.request({hostname:'127.0.0.1',port,path,method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{}) ,...headers,...(payload?{'content-length':Buffer.byteLength(payload)}:{})}},res=>{
      let raw='';res.on('data',c=>raw+=c);res.on('end',()=>{let json=null;try{json=JSON.parse(raw)}catch{}resolve({status:res.statusCode,body:json,raw})})
    })
    req.on('error',reject);if(payload)req.write(payload);req.end()
  })
}

test('Question Bank governance capture is idempotent, duplicate-aware, revisioned and lifecycle-gated',{timeout:30000},async t=>{
  assert.equal(process.env.NODE_ENV,'test','HTTP governance integration test must run only in NODE_ENV=test')
  assert.notEqual(process.env.DB_NAME,'apexos','HTTP governance integration test must never target production DB')
  await pool.query(`INSERT INTO users (id, school_id, name, email, password, role, is_active) VALUES (999, 1, 'Question Bank HTTP Fixture', 'qbank-http-fixture@invalid.local', 'not-used', 'admin', true) ON CONFLICT (id) DO NOTHING`)
  const app=express();app.use(express.json());app.use((req,res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next));app.use('/api/question-bank',require('../routes/questionBankRoutes'))
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});const port=server.address().port
  t.after(async()=>{await new Promise(r=>server.close(r));await pool.end()})

  const suffix=Date.now().toString(36)
  const q={id:`legacy-q1-${suffix}`,class_level:'7',subject:'Science',medium:'english',question_type:'short',question_text:`What is force? ${suffix}`,answer:'A push or pull',marks:2}
  const first=await request(port,'POST','/api/question-bank/governance/capture',{idempotencyKey:`capture:science:${suffix}:001`,question:q})
  assert.equal(first.status,201,first.raw);assert.equal(first.body.data.created,true);assert.equal(first.body.data.currentRevision,1)
  const publicId=first.body.data.publicId

  const replay=await request(port,'POST','/api/question-bank/governance/capture',{idempotencyKey:`capture:science:${suffix}:001`,question:q})
  assert.equal(replay.status,200,replay.raw);assert.equal(replay.body.data.replayed,true);assert.equal(replay.body.data.publicId,publicId)

  const dup=await request(port,'POST','/api/question-bank/governance/capture',{idempotencyKey:`capture:science:${suffix}:002`,question:{...q,id:`legacy-q2-${suffix}`}})
  assert.equal(dup.status,200,dup.raw);assert.equal(dup.body.data.duplicate,true);assert.equal(dup.body.data.publicId,publicId);assert.equal(dup.body.data.currentRevision,1)

  const revised=await request(port,'POST','/api/question-bank/governance/capture',{idempotencyKey:`capture:science:${suffix}:003`,question:{...q,answer:'A force is a push or pull.'}})
  assert.equal(revised.status,200,revised.raw);assert.equal(revised.body.data.publicId,publicId);assert.equal(revised.body.data.revisionCreated,true);assert.equal(revised.body.data.currentRevision,2)

  const directReady=await request(port,'PATCH',`/api/question-bank/governance/${publicId}/status`,{status:'ready'})
  assert.equal(directReady.status,409,directReady.raw);assert.equal(directReady.body.code,'INVALID_QUESTION_LIFECYCLE_TRANSITION')
  const reviewed=await request(port,'PATCH',`/api/question-bank/governance/${publicId}/status`,{status:'reviewed'})
  assert.equal(reviewed.status,200,reviewed.raw);assert.equal(reviewed.body.data.lifecycle_status,'reviewed')
  const ready=await request(port,'PATCH',`/api/question-bank/governance/${publicId}/status`,{status:'ready'})
  assert.equal(ready.status,200,ready.raw);assert.equal(ready.body.data.lifecycle_status,'ready')

  const badKey=await request(port,'POST','/api/question-bank/governance/capture',{idempotencyKey:'short',question:q})
  assert.equal(badKey.status,400,badKey.raw);assert.equal(badKey.body.code,'INVALID_IDEMPOTENCY_KEY')
  const expired=await request(port,'POST','/api/question-bank/governance/capture',{idempotencyKey:'capture:expired:0001',question:q},'bad.token')
  assert.equal(expired.status,401,expired.raw)
  console.log('QUESTION_BANK_GOVERNANCE_HTTP 9/9 PASS')
})
