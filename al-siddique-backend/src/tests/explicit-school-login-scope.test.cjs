'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {checkExplicitSchoolLoginScope:check}=require('../services/explicitSchoolLoginScope')
const req=(body={},query={})=>({body,query})
const school={id:1,code:'assps',status:'active'}
test('explicit assps school code is accepted case-insensitively',()=>{
  assert.deepEqual(check(req({school_code:'ASSPS'}),school),{ok:true,specified:true})
})
test('legacy no school-context request is not silently altered',()=>{
  assert.deepEqual(check(req(),null),{ok:true,specified:false})
})
test('explicit numeric school id is accepted only when resolved school matches',()=>{
  assert.equal(check(req({school_id:1}),school).ok,true)
  assert.equal(check(req({schoolId:'1'}),school).ok,true)
  assert.equal(check(req({school_id:2}),school).ok,false)
})
test('non-existent school identifier cannot fall back to generic login context',()=>{
  assert.deepEqual(check(req({school_code:'missing'}),null),{ok:false,code:'SCHOOL_CONTEXT_UNAVAILABLE'})
})
test('mismatched school id and school code cannot select a different tenant',()=>{
  assert.equal(check(req({school_id:1,school_code:'other'}),school).ok,false)
  assert.equal(check(req({school_id:2,school_code:'assps'}),school).ok,false)
})
test('query/body identifier disagreements fail closed',()=>{
  assert.equal(check(req({school_code:'assps'},{school_code:'school-two'}),school).ok,false)
  assert.equal(check(req({school_id:1},{schoolId:2}),school).ok,false)
})
test('multiple equivalent aliases are allowed',()=>{
  assert.equal(check(req({school_code:'Assps',schoolCode:'assps'},{school_id:'1'}),school).ok,true)
})
test('reject zero, fractional, negative, overflow or nonnumeric explicit school IDs',()=>{
  for(const v of ['0','-3','1.4','xyz','90071992547409930']){
    assert.equal(check(req({school_id:v}),school).ok,false,v)
  }
})
test('explicit blank school code or id cannot silently fall back to default',()=>{
  for (const request of [
    req({school_code:''}),req({school_id:null}),
    req({schoolCode:'  '}),req({}, {school_id:''})
  ]) {
    assert.equal(check(request,school).ok,false)
  }
})
test('reject arrays and object school contexts',()=>{
  for(const v of [['assps'],{id:'assps'}])assert.equal(check(req({school_code:v}),school).ok,false)
})
test('accept verified virtual branch using its effective school code',()=>{
  assert.equal(check(req({school_id:'1',school_code:'branch-two'}),{id:1,code:'branch-two',isVirtualBranch:true}).ok,true)
})
test('no school enumeration details are returned by the helper',()=>{
  const result=check(req({school_code:'secret-school'}),null)
  assert.deepEqual(Object.keys(result).sort(),['code','ok'])
})
test('login and reset handlers both use explicit-scope protection before account lookup',()=>{
  const src=fs.readFileSync(path.resolve(__dirname,'../routes/authRoutes.js'),'utf8')
  assert.ok(src.includes('const explicitScope = checkExplicitSchoolLoginScope(req, requestedSchool)'))
  assert.ok(src.includes('const resetSchoolScope = checkExplicitSchoolLoginScope(req, requestedSchool)'))
  assert.ok(!src.includes('Falling back to default portal context.'))
  const login=src.indexOf('const explicitScope = checkExplicitSchoolLoginScope(')
  const lookup=src.indexOf('const user = await findUserByLoginId(',login)
  assert.ok(lookup>login)
  const reset=src.indexOf('const resetSchoolScope = checkExplicitSchoolLoginScope(')
  const resetLookup=src.indexOf('const user = await findUserByLoginId(',reset)
  assert.ok(resetLookup>reset)
})
