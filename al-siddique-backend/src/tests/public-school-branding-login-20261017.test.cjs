'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const path=require('node:path')
const handlers=new Map()
let calls=[]
let responseRows=[{school_name:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',logo_url:'/uploads/assps-school.png',primary_color:'#123b61',secondary_color:'#0b8888',tenant_id:'SHOULD_NOT_LEAK'}]
const expressStub={Router(){
 const router={}
 for(const method of ['get','post','put','delete']){
   router[method]=(route,...functions)=>handlers.set(method.toUpperCase()+' '+route,functions)
 }
 return router
}}
function multerStub(){return {single(){return (_req,_res,next)=>next()}}}
multerStub.diskStorage=()=>({})
const databaseStub={query:async(sql,params)=>{
 calls.push({sql:String(sql),params})
 return {rows:responseRows, rowCount:responseRows.length}
},pool:{},applyTenantContext(){}}
const loader=Module._load
try{
 Module._load=function(request,parent,isMain){
   if(parent?.filename.endsWith('/routes/brandingRoutes.js')){
     if(request==='express')return expressStub
     if(request==='multer')return multerStub
     if(request==='fs')return {existsSync:()=>true,promises:{unlink:async()=>{}}}
     if(request==='../config/database')return databaseStub
     if(request==='../middleware/auth')return {protect(req,res,next){next()}}
   }
   return loader.apply(this,arguments)
 }
 require(path.join(__dirname,'../routes/brandingRoutes.js'))
}finally{Module._load=loader}
async function invoke(code){
 calls=[]
 const res={code:200,headers:{},body:null,
  status(code){this.code=code;return this},
  set(name,value){this.headers[name]=value;return this},
  json(body){this.body=body;return this}}
 const route=handlers.get('GET /public-branding')
 assert.ok(route)
 assert.equal(route.length,1,'public endpoint only has its handler')
 await route[0]({query:{school_code:code}},res)
 return res
}
test('public login branding returns only public-facing school name/logo/colors',async()=>{
 responseRows=[{school_name:'ASSPS',logo_url:'/uploads/crest.png',primary_color:'#123b61',secondary_color:'#0b8888',tenant_id:'private'}]
 const r=await invoke('assps')
 assert.equal(r.code,200)
 assert.deepEqual(Object.keys(r.body.data).sort(),['logoUrl','primaryColor','schoolName','secondaryColor'])
 assert.equal(r.body.data.logoUrl,'/uploads/crest.png')
 assert.equal(calls.length,1);assert.deepEqual(calls[0].params,['assps'])
 assert.match(calls[0].sql,/LOWER\(s\.code\)\s*=\s*LOWER\(\$1\)/)
 assert.match(calls[0].sql,/active/)
})
test('invalid SQL-style or missing school codes fail before database access',async()=>{
 for(const code of ['','assps OR 1=1','%','../../../private']){
  const r=await invoke(code)
  assert.equal(r.code,400)
  assert.equal(calls.length,0)
 }
})
test('unknown school does not fall back to unrelated tenant branding',async()=>{
 responseRows=[]
 const r=await invoke('unknown-school')
 assert.equal(r.code,404)
 assert.equal(r.body.success,false)
})
