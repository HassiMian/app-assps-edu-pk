'use strict'
// Actual Express HTTP routing + isolated synthetic DB/tenant actors.
// This file contains NO production credentials, student names or school rows.
const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const Module=require('node:module')
const path=require('node:path')

test('School Document Studio denies anonymous, cross-school, unauthorised publish and self-approval',{timeout:18000},async t=>{
 const captured=[]
 let actor={id:100,school_id:1,role:'teacher'}
 const docId='12345678-abcd-1234-abcd-123456789abc'
 const docs=[{id:docId,school_id:1,document_kind:'notice',title:'Synthetic bulletin',created_by:'100',status:'draft',revision:1}]
 let committed=0
 const db={
   query:async(sql,params=[])=>{
     captured.push({sql:String(sql),params})
     if(String(sql).includes('to_regclass'))return {rows:[{documents:'school_documents',events:'school_document_events',revisions:'school_document_revisions'}]}
     if(String(sql).includes('FROM public.date_sheet_records'))return {rows:[{class_level:'One',section:'Blue',exam_date:'2026-10-19',subjects:['English']}],rowCount:1}
     if(String(sql).includes('FROM public.school_documents WHERE school_id=$1'))return {rows:docs.filter(d=>d.school_id===params[0]&& (params[1]===true||d.created_by===params[2]||d.status==='published')),rowCount:docs.filter(d=>d.school_id===params[0]).length}
     return {rows:[],rowCount:0}
   },
   async applyTenantContext(){},
   pool:{connect:async()=>({
      async query(sql,params=[]){
       captured.push({sql:String(sql),params})
       if(String(sql).includes('FOR UPDATE'))return {rows:[{id:docId,created_by:'100',approved_by:null}],rowCount:1}
       if(String(sql).includes('COMMIT'))committed+=1
       return {rows:[],rowCount:0}
      },
      release(){}
   })}
 }
 const auth={
  protect(req,res,next){if(!req.headers['x-test-actor'])return res.status(401).json({success:false});req.user={...actor};next()},
  requireRoles(...roles){return(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({success:false,code:'ROLE_DENIED'})}
 }
 const tenant={currentSchoolId:req=>req.user?.school_id??null}
 const original=Module._load
 const target=path.resolve(__dirname,'../routes/schoolDocumentStudioRoutes.js')
 let route
 try{
  delete require.cache[target]
  Module._load=function(request,parent,isMain){
   if(parent?.filename===target){
    if(request==='../config/database')return db
    if(request==='../middleware/auth')return auth
    if(request==='../middleware/tenant')return tenant
   }
   return original.call(this,request,parent,isMain)
  }
  route=require(target)
 }finally{Module._load=original}
 const app=express();app.use(express.json());app.use('/api/school-documents',route)
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))})
 t.after(()=>new Promise(resolve=>server.close(resolve)))
 const base='http://127.0.0.1:'+server.address().port
 const request=async(route,{method='GET',payload,authenticated=true}={})=>{
  const r=await fetch(base+'/api/school-documents'+route,{
   method,headers:{...(authenticated?{'x-test-actor':'synthetic'}:{}),...(payload?{'Content-Type':'application/json'}:{})},
   ...(payload?{body:JSON.stringify(payload)}:{})
  })
  return {status:r.status,data:await r.json()}
 }
 assert.equal((await request('/templates',{authenticated:false})).status,401)
 assert.equal((await request('/templates')).status,200)
 actor={id:100,school_id:1,role:'student'}
 assert.equal((await request('/templates')).status,403)
 actor={id:100,school_id:null,role:'teacher'}
 assert.equal((await request('/templates')).status,403)
 actor={id:100,school_id:2,role:'teacher'}
 assert.equal((await request('/')).data.data.length,0,'peer-school draft must be invisible')
 actor={id:100,school_id:1,role:'teacher'}
 assert.equal((await request('/')).data.data.length,1)
 let r=await request('/sources/general-datesheet?class=One&section=Blue&session=2026-27&term=First')
 assert.equal(r.status,200)
 assert.equal(r.data.data.length,1)
 const q=captured.filter(x=>x.sql.includes('FROM public.date_sheet_records')).at(-1)
 assert.equal(q.params[0],1)
 assert(!/\bstudent_id\b|\bstudent_name\b|\bmarks_obtained\b/i.test(q.sql.split('FROM public.date_sheet_records')[0]))
 r=await request('/sources/general-datesheet?class=One')
 assert.equal(r.status,422)
 assert.equal((await request('/'+docId+'/publish',{method:'POST',payload:{revision:1}})).status,403)
 actor={id:100,school_id:1,role:'principal'}
 r=await request('/'+docId+'/approve',{method:'POST',payload:{revision:1}})
 assert.equal(r.status,403)
 assert.equal(r.data.code,'SELF_APPROVAL_NOT_ALLOWED')
 assert.equal(committed,0,'self approval must never commit')
 console.log('SYNTHETIC_EXPRESS_NOTICES_SCHOOL_SCOPE_SOURCE_PRIVACY_SELF_APPROVAL_PASS')
})
