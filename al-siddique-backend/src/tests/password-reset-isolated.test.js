const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const crypto = require('node:crypto')

const source = fs.readFileSync(path.join(__dirname, '../routes/authRoutes.js'), 'utf8')
const routed = new Map()
let smsAvailable = false
let realUser = true
let schoolStatus = null
let sent = []
let queries = []
const mockUser = { id: 41, school_id: 2, email: 'faculty@example.test', username: 'faculty', phone: '03001234567', role:'teacher', is_active:true }
const router = {get(){},put(){},post(name,...handlers){routed.set(name,handlers.at(-1))},delete(){},use(){}}
const mocks = {
  express: { Router:()=>router },
  bcryptjs: { hash:async value=>'hash:'+value, compare:async (plain,hash)=>hash==='hash:'+plain },
  jsonwebtoken: { sign:()=> 'fixture.jwt', verify:()=>({}) },
  crypto,
  '../config/database': { query:async(sql,params)=>{
    queries.push(sql)
    if (/FROM users\b/i.test(sql)) return {rows:realUser ? [mockUser] : []}
    if (/FROM schools\b/i.test(sql)) return {rows:schoolStatus ? [{id:2,code:'fixture',status:schoolStatus}] : []}
    if (/UPDATE users\b/i.test(sql)) return {rowCount:1,rows:[]}
    return {rows:[],rowCount:0}
  } },
  '../middleware/auth': { protect:(_req,_res,next)=>next() },
  '../middleware/tenant': {currentTenantId:()=>null,hasColumn:async()=>true},
  '../services/twilioSettings': {
    getTwilioConfigForSchool:async()=>smsAvailable ? {accountSid:'fixture',authToken:'fixture',smsFrom:'+15555550123'} : {},
    buildTwilioClient:()=>({messages:{create:async payload=>{sent.push(payload);return {sid:'test'}}}}),
  },
}
const moduleObject = {exports:{}}
vm.runInNewContext(source, {module:moduleObject,exports:moduleObject.exports,require:id=>{
  if(!(id in mocks)) throw new Error('Unexpected dependency: '+id)
  return mocks[id]
},process:{env:{NODE_ENV:'test',JWT_SECRET:'long-fixture-secret',JWT_REFRESH_SECRET:'long-fixture-refresh'}},console:{log(){},warn(){},error(){}},Buffer,Date,Map,Set,String,Number,JSON,URLSearchParams,Promise,setImmediate}, {filename:'authRoutes.js'})
async function call(endpoint,body){
  const fn=routed.get(endpoint)
  assert.ok(fn,'route exists: '+endpoint)
  let status=0, payload=null
  const req={body,query:{},headers:{},ip:'127.0.0.1'}
  const res={status(n){status=n;return this},json(value){payload=value;return this}}
  await fn(req,res)
  return {status,payload}
}
;(async()=>{
  realUser=false; smsAvailable=true
  const missing=await call('/password-reset/request',{loginId:'not-found@example.test'})
  assert.equal(missing.status,200)
  assert.match(missing.payload.resetToken,/^[a-f0-9]{48}$/)
  assert.equal(sent.length,0)
  for(let i=0;i<5;i++){
    const failed=await call('/password-reset/confirm',{resetToken:missing.payload.resetToken,otp:'000000',newPassword:'SyntheticPass123!'})
    assert.equal(failed.status,400)
    assert.equal(failed.payload.message,'Invalid or expired verification code.')
  }
  assert.equal((await call('/password-reset/confirm',{resetToken:missing.payload.resetToken,otp:'000000',newPassword:'SyntheticPass123!'})).status,429)
  realUser=true; smsAvailable=false
  const priorLookupCount=queries.filter(sql=>/FROM users\b/i.test(sql)).length
  const invalidSchool=await call('/password-reset/request',{loginId:'faculty@example.test',school_id:999})
  assert.equal(invalidSchool.status,200)
  assert.equal(queries.filter(sql=>/FROM users\b/i.test(sql)).length,priorLookupCount,'Invalid tenant hint must not fall back to cross-school search')
  schoolStatus='inactive'
  const inactiveSchool=await call('/password-reset/request',{loginId:'faculty@example.test',school_id:2})
  assert.equal(inactiveSchool.status,200)
  assert.equal(queries.filter(sql=>/FROM users\b/i.test(sql)).length,priorLookupCount,'Inactive school must never issue cross-tenant reset')
  schoolStatus=null
  const notConfigured=await call('/password-reset/request',{loginId:'faculty@example.test'})
  await new Promise(setImmediate)
  assert.equal(notConfigured.status,200)
  assert.equal(notConfigured.payload.message,missing.payload.message)
  assert.equal(sent.length,0)
  const noDeliveryConfirm=await call('/password-reset/confirm',{resetToken:notConfigured.payload.resetToken,otp:'123456',newPassword:'SecureNewPass123!'})
  assert.notEqual(noDeliveryConfirm.status,200)
  smsAvailable=true
  const delivered=await call('/password-reset/request',{loginId:'faculty@example.test'})
  assert.equal(sent.length,0,'SMS provider must not block the public response')
  await new Promise(setImmediate)
  assert.equal(delivered.status,200)
  assert.equal(delivered.payload.message,missing.payload.message)
  assert.equal(sent.length,1)
  assert.ok(!queries.some(sql=>/notification_log/i.test(sql)),'OTP must never persist in notification history')
  const otp=sent[0].body.match(/\b\d{6}\b/)[0]
  const wrong=await call('/password-reset/confirm',{resetToken:delivered.payload.resetToken,otp:'000000',newPassword:'SecureNewPass123!'})
  assert.equal(wrong.status,400)
  const success=await call('/password-reset/confirm',{resetToken:delivered.payload.resetToken,otp,newPassword:'SecureNewPass123!'})
  assert.equal(success.status,200)
  assert.ok(queries.some(sql=>/UPDATE users SET password/i.test(sql)))
  const replay=await call('/password-reset/confirm',{resetToken:delivered.payload.resetToken,otp,newPassword:'SecureNewPass456!'})
  assert.notEqual(replay.status,200)
  console.log('PASSWORD_RESET_ISOLATED_PASS: generic account response, fail-closed SMS, wrong OTP, one-time success, no secret logging, replay rejected')
})().catch(err=>{console.error(err);process.exitCode=1})
