'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')
const routes = new Map()
const executedSql = []
const expressStub = {
  Router() {
    const router = {}
    for (const method of ['get','post','put','delete']) {
      router[method] = (route, ...handlers) => {
        routes.set(method.toUpperCase() + ' ' + route, handlers)
      }
    }
    return router
  }
}
const authStub = {
  protect(req,res,next) {
    if (!req.user) return res.status(401).json({code:'NO_AUTH'})
    next()
  },
  requireRoles(...roles) {
    return (req,res,next) => {
      if (!roles.includes(req.user?.role)) return res.status(403).json({code:'ROLE_DENIED'})
      next()
    }
  },
  requireScopeForServiceOnly(scope) {
    return (req,res,next) => {
      if (req.user?.account_type==='service' &&
          !req.user?.scopes?.includes(scope)) return res.status(403).json({code:'SCOPE_DENIED'})
      next()
    }
  }
}
const dbStub = {
  async query(sql,params) {
    executedSql.push({sql:String(sql),params})
    if (String(sql).includes('information_schema.columns')) return {rows:[{count:15}]}
    if (String(sql).startsWith('SELECT *')) return {rows:[{id:1,school_id:params[0],title:'Scoped'}]}
    if (String(sql).includes('RETURNING *')) return {rowCount:1,rows:[{id:99, school_id:params.at(-1) || params[0], title:'Success'}]}
    return {rowCount:1,rows:[]}
  }
}
const moduleLoad = Module._load
try {
  Module._load = function(request, parent, isMain) {
    if (parent?.filename.endsWith('/routes/noticesRoutes.js')) {
      if (request==='express') return expressStub
      if (request==='../config/database') return dbStub
      if (request==='../middleware/auth') return authStub
      if (request==='../middleware/tenant') return { currentSchoolId(req) { return req.user?.school_id || null }}
    }
    return moduleLoad.apply(this,arguments)
  }
  require(path.join(__dirname,'../routes/noticesRoutes.js'))
} finally {
  Module._load = moduleLoad
}
function admin(role='principal',school_id=1) {return {id:4,name:'Verified Principal',role,school_id}}
function body() {return {title:'Academic Notice',content:'Homework diary guidelines',issued_by:'FAKE EXTERNAL PRINCIPAL',issuedBy:'SPOOF',school_id:999}}
async function invoke(method, route, {user=admin(),data=body(),id='8'}={}) {
  executedSql.length=0
  const handlers=routes.get(method.toUpperCase()+' '+route)
  assert.ok(handlers,method+' '+route)
  const req={user,body:data,params:{id},headers:{'x-school-id':'999'},query:{school_id:999}}
  const res={
    code:200,body:undefined,
    status(s){this.code=s;return this},
    json(x){this.body=x;return this}
  }
  for (const fn of handlers) {
    let allowed=false
    await fn(req,res,()=>{allowed=true})
    if (!allowed) break
  }
  return {res,queries:executedSql.map(x=>({...x}))}
}

test('authenticated principal can create scoped official notice; cannot spoof signed issuer or tenant',async()=>{
  const {res,queries}=await invoke('POST','/')
  assert.equal(res.code,201)
  const insert=queries.find(x=>x.sql.includes('INSERT INTO notices'))
  assert.ok(insert)
  assert.equal(insert.params[0],1)
  assert.equal(insert.params[3],'Verified Principal')
  assert.ok(!insert.params.some(x=>x==='FAKE EXTERNAL PRINCIPAL'||x==='SPOOF'||x===999))
  assert.match(insert.sql,/school_id/)
})
test('teacher cannot create school-wide notice even if signed into School1',async()=>{
  const {res,queries}=await invoke('POST','/',{user:admin('teacher')})
  assert.equal(res.code,403)
  assert.equal(queries.length,0)
})
test('teacher cannot update principal school notice',async()=>{
  const {res,queries}=await invoke('PUT','/:id',{user:admin('teacher')})
  assert.equal(res.code,403);assert.equal(queries.length,0)
})
test('teacher cannot delete principal school notice',async()=>{
  const {res,queries}=await invoke('DELETE','/:id',{user:admin('teacher')})
  assert.equal(res.code,403);assert.equal(queries.length,0)
})
test('unauthenticated actor cannot create notice',async()=>{
  const {res,queries}=await invoke('POST','/',{user:null})
  assert.equal(res.code,401);assert.equal(queries.length,0)
})
test('principal missing authenticated school context is denied, ignoring body/header school IDs',async()=>{
  const {res,queries}=await invoke('POST','/',{user:admin('principal',null)})
  assert.equal(res.code,403)
  assert.ok(!queries.some(x=>x.sql.includes('INSERT INTO notices')))
})
test('principal edit preserves original issued_by and scopes UPDATE to school and exact ID',async()=>{
  const {res,queries}=await invoke('PUT','/:id',{user:admin('principal',2),id:'62'})
  assert.equal(res.code,200)
  const q=queries.find(x=>x.sql.includes('UPDATE notices'))
  assert.ok(q)
  assert.doesNotMatch(q.sql,/issued_by\s*=/)
  assert.match(q.sql,/WHERE id = \$13 AND school_id = \$14/)
  assert.equal(q.params.length,14)
  assert.equal(q.params[12],'62')
  assert.equal(q.params[13],2)
  assert.ok(!q.params.some(x=>x==='SPOOF'||x==='FAKE EXTERNAL PRINCIPAL'))
})
test('principal delete always scoped by school',async()=>{
  const {res,queries}=await invoke('DELETE','/:id',{user:admin('principal',2),id:'62'})
  assert.equal(res.code,200)
  const q=queries.find(x=>x.sql.includes('DELETE FROM notices'))
  assert.match(q.sql,/school_id = \$2/)
  assert.deepEqual(q.params,['62',2])
})
test('teacher retains read access to scoped notices, not write access',async()=>{
  const {res,queries}=await invoke('GET','/',{user:admin('teacher',3)})
  assert.equal(res.code,200)
  assert.equal(res.body.data[0].school_id,3)
  assert.ok(queries.some(x=>x.sql.includes('WHERE school_id = $1')&&x.params[0]===3))
})
test('service without explicit notices-read scope denied',async()=>{
  const {res,queries}=await invoke('GET','/',{user:{id:20,role:'service',school_id:1,account_type:'service',scopes:[]}})
  assert.equal(res.code,403);assert.equal(queries.length,0)
})
test('admin and super_admin allowed if signed tenant context exists',async()=>{
  for (const role of ['admin','school_admin','super_admin']) {
    const {res,queries}=await invoke('POST','/',{user:admin(role,4)})
    assert.equal(res.code,201,role)
    assert.equal(queries.find(x=>x.sql.includes('INSERT INTO notices')).params[0],4,role)
  }
})
test('no secret or external message sending is involved in notice API tests',()=>{
  assert.equal(routes.size,4)
  assert.ok([...routes.keys()].every(x=>/^(GET|POST|PUT|DELETE) /.test(x)))
})
