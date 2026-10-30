const test=require('node:test')
const assert=require('node:assert/strict')
const {AsyncLocalStorage}=require('node:async_hooks')
const {schoolScopedMovement}=require('../middleware/schoolScopedMovement')
const store=new AsyncLocalStorage()
const middleware=schoolScopedMovement(store)
const user=(role='principal')=>({id:41,school_id:1,tenant_id:'school_assps',role})
const req=(role='principal')=>({user:user(role),school_id:1,tenant_id:'school_assps',query:{school_id:77},headers:{'x-school-id':'88'}})
const response=()=>({statusCode:200,body:null,status(n){this.statusCode=n;return this},json(v){this.body=v;return this}})
async function exercise(request,context){const res=response();let entered=false
 await store.run(context,()=>middleware(request,res,()=>{entered=true}))
 return {res,entered,context}
}
test('signed Principal and Admin are scoped to their verified single school',async()=>{
 for(const role of ['principal','admin']){
  const ctx={rlsEnabled:true,actorId:41,isSuperAdmin:false,tenantId:1,tenantKey:'school_assps'}
  const r=await exercise(req(role),ctx)
  assert.equal(r.entered,true);assert.equal(r.context.tenantId,1)
  assert.equal(r.context.isSuperAdmin,false)
 }
})
test('super_admin becomes school-bounded, never bypasses signed RLS',async()=>{
 const ctx={rlsEnabled:true,actorId:41,isSuperAdmin:true,tenantId:null,tenantKey:null}
 const r=await exercise(req('super_admin'),ctx)
 assert.equal(r.entered,true)
 assert.equal(ctx.isSuperAdmin,false);assert.equal(ctx.tenantId,1)
 assert.equal(ctx.actorId,41);assert.equal(ctx.tenantKey,'school_assps')
})
test('unverified school, query/header overrides, invalid actor and role fail closed',async()=>{
 const cases=[
  {...req(),school_id:2},
  {...req(),user:{...user(),school_id:2}},
  {...req(),user:{...user(),id:'service-key'}},
  {...req('teacher')},
  {...req(),user:{...user(),school_id:null}},
 ]
 for(const request of cases){
  const ctx={rlsEnabled:true,actorId:41,isSuperAdmin:false,tenantId:1}
  const r=await exercise(request,ctx)
  assert.equal(r.entered,false)
  assert.equal(r.res.statusCode,403)
  assert.equal(ctx.tenantId,1)
 }
})
test('missing/unverified RLS context fails closed',async()=>{
 for(const context of [{rlsEnabled:false},{rlsEnabled:true,tenantId:2}]){
  const r=await exercise(req(),context)
  assert.equal(r.entered,false);assert.equal(r.res.statusCode,403)
 }
})
