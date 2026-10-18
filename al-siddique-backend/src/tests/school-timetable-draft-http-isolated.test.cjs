'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const path=require('node:path')
const {DAYS}=require('../domain/schoolTimetableDraftContract')
const handlers=new Map()
let calls=[], stored=null, audit=[]
const express={Router(){return {get(p,...fn){handlers.set('GET '+p,fn)},post(p,...fn){handlers.set('POST '+p,fn)}}}}
const auth={
 protect(req,res,next){return req.user?next():res.status(401).json({code:'NO_AUTH'})},
 requireRoles(...roles){return (req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({code:'ROLE_DENIED'})},
 requireScopeForServiceOnly(scope){return (req,res,next)=>
  req.user?.account_type==='service' && !req.user.scopes?.includes(scope)
  ?res.status(403).json({code:'SCOPE_DENIED'}):next()}
}
const fakeDb={
 query:async(sql,args)=>{
  calls.push({sql,args})
  if(sql.includes('to_regclass'))return {rows:[{draft:'school_timetable_drafts',audit:'school_timetable_draft_revisions'}]}
  if(sql.includes('FROM public.school_timetable_drafts') && sql.includes('LIMIT 1'))
   return stored && stored.school_id===args[0]?{rowCount:1,rows:[stored]}:{rowCount:0,rows:[]}
  throw Error('Unexpected direct database query')
 },
 pool:{connect:async()=>({
  release(){},
  async query(sql,args){
   calls.push({sql,args})
   if(['BEGIN','ROLLBACK','COMMIT'].includes(sql))return {rows:[]}
   if(sql.includes('FOR UPDATE'))
    return stored && stored.school_id===args[0]?{rowCount:1,rows:[stored]}:{rowCount:0,rows:[]}
   if(sql.includes('INSERT INTO public.school_timetable_drafts')){
    stored={id:args[0],school_id:args[1],academic_session:args[2],class_name:args[3],
     section:args[4],revision:1,content:JSON.parse(args[5])}
    return {rowCount:1,rows:[stored]}
   }
   if(sql.includes('UPDATE public.school_timetable_drafts')){
    if(!stored||stored.school_id!==args[2]||stored.revision!==args[4])return {rowCount:0,rows:[]}
    stored={...stored,revision:stored.revision+1,content:JSON.parse(args[0])}
    return {rowCount:1,rows:[stored]}
   }
   if(sql.includes('INSERT INTO public.school_timetable_draft_revisions')){
    audit.push(args)
    return {rowCount:1}
   }
   throw Error('Unexpected transaction query: '+sql)
  }
 })},
 applyTenantContext:async()=>{}
}
const original=Module._load
try {
 Module._load=function(name,parent,isMain){
  if(parent?.filename.endsWith('/routes/timetableDraftRoutes.js')){
   if(name==='express')return express
   if(name==='../middleware/auth')return auth
   if(name==='../middleware/tenant')return {currentSchoolId:req=>req.user?.school_id||null}
   if(name==='../config/database')return fakeDb
  }
  return original.apply(this,arguments)
 }
 require(path.join(__dirname,'../routes/timetableDraftRoutes.js'))
}finally{Module._load=original}
const principal=(school_id=1)=>({id:11,role:'principal',school_id})
const payload=(revision=0)=>({
 class_name:'Five',section:'Blue',academic_session:'2026–27',revision,
 school_id:999,publication_authorized:false,
 days:DAYS.map(day=>({day,periods:Array.from({length:8},(_,i)=>({
  number:i+1,subject:i===4?'English':'',teacher_display_name:i===4?'Miss Sumaira':''
 }))}))
})
async function invoke(method,user=principal(),data=payload()){
 calls=[]
 const req={user,query:{class:'Five',section:'Blue',session:'2026–27',school_id:'999'},
  body:data,headers:{'x-school-id':'999'}}
 const res={code:200,body:null,headers:{},status(v){this.code=v;return this},
  json(v){this.body=v;return this},set(k,v){this.headers[k.toLowerCase()]=v;return this}}
 const route=handlers.get(method+' /drafts')
 assert.ok(route)
 for(const fn of route){
  let next=false
  await fn(req,res,()=>{next=true})
  if(!next)break
 }
 return {res,calls:[...calls]}
}
test('anonymous and teacher requests cannot read or save timetable drafts',async()=>{
 stored=null;audit=[]
 assert.equal((await invoke('GET',null)).res.code,401)
 assert.equal((await invoke('POST',{id:2,role:'teacher',school_id:1})).res.code,403)
 assert.equal((await invoke('GET',{id:2,role:'teacher',school_id:1})).res.code,403)
})
test('principal GET absent draft gives 404, without disclosing another school',async()=>{
 stored=null
 const a=await invoke('GET',principal(2))
 assert.equal(a.res.code,404)
 assert.equal(a.res.headers['cache-control'],'private, no-store')
 assert.ok(a.calls.some(x=>x.args?.[0]===2 && x.sql.includes('FROM public.school_timetable_drafts')))
})
test('principal creates versioned draft only in signed school context',async()=>{
 stored=null;audit=[]
 const a=await invoke('POST',principal(1))
 assert.equal(a.res.code,200)
 assert.equal(a.res.body.publication_authorized,false)
 assert.equal(a.res.body.staff_identity_reviewed,false)
 assert.equal(stored.school_id,1)
 assert.equal(stored.revision,1)
 assert.equal(audit.length,1)
 assert.ok(a.calls.some(x=>x.sql==='COMMIT'))
})
test('principal reloads saved draft, revision 1, no publish permission',async()=>{
 const a=await invoke('GET',principal(1))
 assert.equal(a.res.code,200)
 assert.equal(a.res.body.data.revision,1)
 assert.equal(a.res.body.publication_authorized,false)
 assert.equal(a.res.body.data.content.days.length,6)
})
test('peer-school principal cannot retrieve another tenant draft',async()=>{
 const a=await invoke('GET',principal(2))
 assert.equal(a.res.code,404)
})
test('stale revision rejected with explicit rollback',async()=>{
 const a=await invoke('POST',principal(1),payload(0))
 assert.equal(a.res.code,409)
 assert.equal(a.res.body.code,'DRAFT_REVISION_CONFLICT')
 assert.ok(a.calls.some(x=>x.sql==='ROLLBACK'))
 assert.ok(!a.calls.some(x=>x.sql.startsWith('UPDATE public.school_timetable_drafts')))
})
test('matching revision saves next immutable audit record',async()=>{
 const a=await invoke('POST',principal(1),payload(1))
 assert.equal(a.res.code,200)
 assert.equal(stored.revision,2)
 assert.equal(audit.length,2)
})
test('client school spoof cannot override authenticated school',async()=>{
 stored=null;audit=[]
 const a=await invoke('POST',principal(2),payload(0))
 assert.equal(a.res.code,200)
 assert.equal(stored.school_id,2)
 assert.equal(audit[0][0],2)
})
test('invalid payload blocked before database access',async()=>{
 const broken=payload(0)
 broken.days[0].periods[0].teacher_id=2378
 const a=await invoke('POST',principal(1),broken)
 assert.equal(a.res.code,422)
 assert.equal(a.calls.length,0)
})
test('service token cannot bypass management role using scoped permission',async()=>{
 const a=await invoke('POST',{id:'service',role:'service',school_id:1,account_type:'service',scopes:['school.timetable.write']})
 assert.equal(a.res.code,403)
})
