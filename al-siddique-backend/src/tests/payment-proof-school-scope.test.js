'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const filename=path.join(__dirname,'../routes/uploadStorageRoutes.js')
const code=fs.readFileSync(filename,'utf8')
const file='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png'
function harness(rows=[],school=900001){
 const calls=[];const handlers={};let diskReads=0
 const router={get:(path,...fns)=>{handlers[path]=fns.at(-1)},post:()=>{}}
 const fauxfs={existsSync:()=>true,promises:{lstat:async()=>{diskReads++;return {isFile:()=>true,isSymbolicLink:()=>false}}}}
 const requireMock=name=>{
  if(name==='express')return {Router:()=>router}
  if(name==='fs')return fauxfs
  if(name==='path')return path
  if(name==='crypto')return require('node:crypto')
  if(name==='multer')return ()=>({single:()=>()=>{}})
  if(name==='../config/database')return {pool:{},query:async(sql,params)=>{calls.push({sql,params});return {rows}}}
  if(name==='../middleware/auth')return {protect:()=>{},requireRoles:()=>()=>{}}
  if(name==='../middleware/tenant')return {currentSchoolId:()=>school}
  return require(name)
 }
 vm.runInNewContext(code,{require:requireMock,module:{exports:{}},__dirname:path.dirname(filename),console})
 const route=handlers['/subscription/payment-screenshot/:fileName']
 assert.equal(typeof route,'function')
 async function invoke(role='admin'){
  const res={code:200,headers:{},status(n){this.code=n;return this},json(body){this.body=body;return this},setHeader(k,v){this.headers[k]=v},sendFile(f){this.sent=f;return this}}
  await route({user:{role},params:{fileName:file}},res)
  return res
 }
 return {invoke,calls,get diskReads(){return diskReads}}
}
test('school admin cross-school/unassigned proof denied before disk access',async()=>{
 const h=harness([])
 const res=await h.invoke()
 assert.equal(res.code,404)
 assert.equal(h.diskReads,0)
 assert.equal(h.calls.length,1)
 assert.match(h.calls[0].sql,/created_school_id\s*=\s*\$1/)
 assert.match(h.calls[0].sql,/payment_screenshot_url\s*=\s*\$2/)
 assert.equal(h.calls[0].params[0],900001)
 assert.equal(h.calls[0].params[1],`/api/subscription/payment-screenshot/${file}`)
})
test('owner school admin with matching proof may read regular file',async()=>{
 const h=harness([{id:1}]);const res=await h.invoke()
 assert.ok(res.sent.endsWith(file));assert.equal(h.diskReads,1)
 assert.equal(res.headers['Cache-Control'],'private, no-store')
})
test('platform super_admin uses existing globally authorized path',async()=>{
 const h=harness([]);const res=await h.invoke('super_admin')
 assert.ok(res.sent.endsWith(file));assert.equal(h.calls.length,0)
})
test('missing school or ownership query error fails closed',async()=>{
 const missing=harness([{id:1}],null);assert.equal((await missing.invoke()).code,404);assert.equal(missing.diskReads,0)
})
