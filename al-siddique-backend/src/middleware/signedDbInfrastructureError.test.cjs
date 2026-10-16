'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {isSignedDatabaseInfrastructureError:check}=require('./signedDbInfrastructureError')
for(const code of [
 'DB_SIGNED_RLS_CATALOG_INCOMPLETE','DB_RUNTIME_ROLE_REQUIRED',
 'DB_RUNTIME_ROLE_UNSAFE','DB_PRIVILEGED_LOGIN_REJECTED'
])test('signed DB infrastructure error must return 503 not logout: '+code,()=>{
 assert.equal(check({code}),true)
})
for(const code of [
 'TokenExpiredError','JsonWebTokenError','ERR_JWT_EXPIRED',
 'DB_SIGNED_TENANT_SCOPE_REQUIRED','SCHOOL_CONTEXT_REQUIRED',
 'ERR_UNAUTHORIZED',null,undefined
])test('invalid/unauthenticated tokens are NEVER reclassified '+code,()=>{
 assert.equal(check({code}),false)
})
test('fail closed for no error or spoofed object',()=>{
 assert.equal(check(null),false)
 assert.equal(check({code:123}),false)
 assert.equal(check({message:'DB_SIGNED_RLS_CATALOG_INCOMPLETE'}),false)
})
