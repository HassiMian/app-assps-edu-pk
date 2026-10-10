'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const {signedTenantEnvelope,applySignedTenantContext}=require('../services/security/coreSignedTenantContext')
const secret='synthetic-only-signing-material-long-enough-to-test'
const identity={tenantId:900001,tenantKey:'core-a',actorId:999001,loginRole:'assps_core_test_login',transactionId:123456,secret,issuedAt:1760000000}
function verify(e,values=identity){const payload=[values.tenantId,values.tenantKey,values.loginRole,values.actorId,e.expires,e.nonce,values.transactionId].join('|');return crypto.createHmac('sha256',values.secret).update(payload).digest('hex')===e.signature}
test('actual Node signer binds tenant, finance key, actor, login and transaction',()=>{
 const e=signedTenantEnvelope(identity)
 assert.equal(verify(e),true)
 for(const diff of [{tenantId:900002},{tenantKey:'core-b'},{actorId:999002},{loginRole:'wrong_login'},{transactionId:123457}])assert.equal(verify(e,{...identity,...diff}),false,JSON.stringify(diff))
 assert.match(e.nonce,/^[a-f0-9]{32}$/);assert.equal(e.expires,'1760000060')
})
test('signer requires trusted scalar identifiers and robust key',()=>{
 for(const bad of [{tenantId:0},{tenantId:-1},{tenantId:'900001 OR 1=1'},{actorId:'0'},{actorId:'999001;--'},{loginRole:'postgres;DROP'},{transactionId:0},{tenantKey:'x'.repeat(201)},{secret:'weak'}])assert.throws(()=>signedTenantEnvelope({...identity,...bad}),{code:'CORE_SIGNED_CONTEXT_REQUIRED'})
})
test('applySignedTenantContext fails on mismatched connection login before setting any GUC',async()=>{
 const calls=[]
 const client={query:async(sql)=>{calls.push(sql);return {rows:[{login_name:'wrong_login',transaction_id:'123456'}]}}}
 await assert.rejects(applySignedTenantContext(client,{tenantId:900001,actorId:999001,secret,expectedLogin:'assps_core_test_login'}),{code:'CORE_SIGNED_LOGIN_MISMATCH'})
 assert.equal(calls.length,1)
})
test('applySignedTenantContext sends bound signature parameters, never interpolated SQL',async()=>{
 const calls=[]
 const client={query:async(sql,values)=>{calls.push({sql,values});return {rows:[{login_name:'assps_core_test_login',transaction_id:'123456'}]}}}
 await applySignedTenantContext(client,{tenantId:900001,tenantKey:'core-a',actorId:999001,secret,expectedLogin:'assps_core_test_login'})
 assert.equal(calls.length,2)
 assert.match(calls[1].sql,/set_config\('app.core_sig',\$6,true\)/)
 assert.equal(calls[1].values.length,6)
 assert.equal(calls[1].values[0],'900001')
 assert.equal(calls[1].values[1],'core-a')
 assert.equal(calls[1].values[2],'999001')
 assert.equal(calls[1].values[5].length,64)
})
