'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const Module = require('node:module')
const path = require('node:path')

async function runDelete(hasResults) {
  const actor = {id:53,role:'principal',school_id:7}
  const actions = []
  const client = {
    query: async (sql, params=[]) => {
      const statement = String(sql).trim()
      actions.push(statement)
      if (statement.startsWith('SELECT id, name FROM exams')) {
        assert.deepEqual(params,[9,7])
        return {rowCount:1,rows:[{id:9,name:'First Term 2026'}]}
      }
      if (statement.includes('FROM exam_results') && statement.startsWith('SELECT')) {
        return {rowCount:hasResults?1:0,rows:hasResults?[{present:1}]:[]}
      }
      return {rowCount:1,rows:[]}
    },
    release:()=>{},
  }
  const db={pool:{connect:async()=>client},query:async()=>({rows:[]}),applyTenantContext:async()=>{}}
  const auth={
    protect:(req,_res,next)=>{req.user=actor;next()},
    requireRoles:(...roles)=>(req,res,next)=>roles.includes(actor.role)?next():res.status(403).json({success:false}),
    requireScopeForServiceOnly:()=> (_req,_res,next)=>next(),hasServiceScope:()=>false,
  }
  const tenant={currentSchoolId:()=>7,hasColumn:async()=>true,tenantClause:()=>({})}
  const routePath=path.resolve(__dirname,'../routes/examRoutes.js')
  const original=Module._load
  let router
  try {
    Module._load=function(request,parent,isMain){
      if (parent?.filename===routePath){
        if(request==='../config/database')return db
        if(request==='../middleware/auth')return auth
        if(request==='../middleware/tenant')return tenant
      }
      return original.apply(this,arguments)
    }
    delete require.cache[routePath]
    router=require(routePath)
  } finally {Module._load=original}
  const app=express()
  app.use(express.json())
  app.use('/api/exams',router)
  const server=app.listen(0,'127.0.0.1')
  await new Promise(resolve=>server.once('listening',resolve))
  try {
    const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/exams/9',{method:'DELETE'})
    return {status:res.status,body:await res.json(),actions}
  } finally {
    await new Promise(resolve=>server.close(resolve))
    delete require.cache[routePath]
  }
}

test('First Term with saved results cannot be destroyed through normal exam deletion',async()=>{
  const response=await runDelete(true)
  assert.equal(response.status,409)
  assert.equal(response.body.code,'EXAM_RESULTS_RETENTION_LOCK')
  assert.equal(response.actions.some(sql=>sql.startsWith('DELETE FROM exam_results')),false)
  assert.equal(response.actions.some(sql=>sql.startsWith('DELETE FROM exams')),false)
  assert.equal(response.actions.includes('COMMIT'),false)
  assert.ok(response.actions.includes('ROLLBACK'))
})

test('unused empty draft exam can still be deleted without deleting result records',async()=>{
  const response=await runDelete(false)
  assert.equal(response.status,200)
  assert.equal(response.actions.some(sql=>sql.startsWith('DELETE FROM exams')),true)
  assert.equal(response.actions.some(sql=>sql.startsWith('DELETE FROM exam_results')),false)
  assert.ok(response.actions.includes('COMMIT'))
})
