'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const path=require('node:path')
const routes=new Map()
const calls=[]
let bodyText='The school will remain closed on [date] for [reason].'
const actor={id:101,role:'principal',school_id:1,name:'Verified QA Principal'}
const fakeRouter={}
for(const method of ['get','post','patch','put','delete'])fakeRouter[method]=(url,...middleware)=>routes.set(method.toUpperCase()+' '+url,middleware)
const db={
 query:async(sql)=>{
  calls.push(String(sql))
  if(String(sql).includes('to_regclass'))return {rows:[{documents:'school_documents',events:'school_document_events',revisions:'school_document_revisions'}]}
  throw new Error('unexpected direct school database query in synthetic test')
 },
 pool:{connect:async()=>({
  query:async(sql)=>{
   calls.push(String(sql))
   if(sql==='BEGIN' || sql==='ROLLBACK')return {rows:[]}
   if(String(sql).includes('FOR UPDATE'))return {rowCount:1,rows:[{id:'12345678-abcd-1234-abcd-123456789abc',created_by:'202',approved_by:'303',content:{message:bodyText}}]}
   throw new Error('must not execute publication SQL while placeholders are unresolved')
  },
  release(){}
 })},
 applyTenantContext:async()=>{}
}
const auth={
 protect:(req,res,next)=>req.user?next():res.status(401).json({code:'UNAUTHORIZED'}),
 requireRoles:(...roles)=>(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({code:'ROLE_DENIED'})
}
const load=Module._load
try{
 Module._load=function(moduleName,parent,isMain){
  if(parent?.filename.endsWith('/routes/schoolDocumentStudioRoutes.js')){
   if(moduleName==='express')return {Router:()=>fakeRouter}
   if(moduleName==='../config/database')return db
   if(moduleName==='../middleware/auth')return auth
   if(moduleName==='../middleware/tenant')return {currentSchoolId:req=>req.user?.school_id}
  }
  return load.apply(this,arguments)
 }
 require(path.join(__dirname,'../routes/schoolDocumentStudioRoutes.js'))
}finally{Module._load=load}
async function invoke(user=actor){
 calls.length=0
 const handlers=routes.get('POST /:id/publish')
 assert.ok(handlers)
 const req={user,params:{id:'12345678-abcd-1234-abcd-123456789abc'},body:{revision:3}}
 const res={statusCode:200,result:null,status(n){this.statusCode=n;return this},json(v){this.result=v;return this}}
 for(const fn of handlers){
  let next=false
  await fn(req,res,()=>{next=true})
  if(!next)break
 }
 return res
}
test('actual mocked POST publish returns 409 and transaction rollback for incomplete preset',async()=>{
 bodyText='School closure on [date] due to [reason].'
 const res=await invoke()
 assert.equal(res.statusCode,409)
 assert.equal(res.result.code,'UNRESOLVED_NOTICE_TEMPLATE_FIELDS')
 assert.deepEqual(res.result.fields,['date','reason'])
 assert.ok(calls.some(q=>q==='BEGIN'))
 assert.ok(calls.some(q=>q==='ROLLBACK'))
 assert.ok(!calls.some(q=>/UPDATE school_documents|INSERT INTO school_document_events|COMMIT/.test(q)))
})
test('a missing Principal/administrator role is denied before contacting school database',async()=>{
 const res=await invoke({...actor,role:'teacher'})
 assert.equal(res.statusCode,403)
 assert.deepEqual(calls,[])
})
test('untrusted anonymous publish denied before any DB activity',async()=>{
 const res=await invoke(null)
 assert.equal(res.statusCode,401)
 assert.deepEqual(calls,[])
})
