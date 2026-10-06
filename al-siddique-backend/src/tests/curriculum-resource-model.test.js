const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const { buildCurriculumMigrationPlan, validateResourceSet } = require('../services/curriculumResourceModel')
const { pool } = require('../config/database')
after(async()=>{await pool.end()})

test('curriculum migration plan classifies equivalent renamed moved new and removed scopes deterministically',()=>{
 const from=[
  {canonicalKey:'ch1',scopeType:'chapter',label:'Cell Biology',parentKey:''},
  {canonicalKey:'ch2',scopeType:'chapter',label:'Bioenergetics',parentKey:''},
  {canonicalKey:'skill-a',scopeType:'skill',label:'Draw Diagram',parentKey:'ch1'},
  {canonicalKey:'old-only',scopeType:'topic',label:'Legacy Topic',parentKey:'ch2'},
 ]
 const to=[
  {canonicalKey:'ch1',scopeType:'chapter',label:'Cell Structure',parentKey:''},
  {canonicalKey:'ch2',scopeType:'chapter',label:'Bioenergetics',parentKey:''},
  {canonicalKey:'skill-a',scopeType:'skill',label:'Draw Diagram',parentKey:'ch2'},
  {canonicalKey:'new-only',scopeType:'topic',label:'New Topic',parentKey:'ch2'},
 ]
 const a=buildCurriculumMigrationPlan({fromScopes:from,toScopes:to})
 const b=buildCurriculumMigrationPlan({fromScopes:[...from].reverse(),toScopes:[...to].reverse()})
 assert.deepEqual(a.summary,{equivalent:1,renamed:1,moved:1,new:1,removed:1})
 assert.equal(a.planHash,b.planHash)
})

test('explicit equivalence can map renamed canonical keys without resource identity',()=>{
 const plan=buildCurriculumMigrationPlan({
  fromScopes:[{canonicalKey:'old-ch',scopeType:'chapter',label:'Matter'}],
  toScopes:[{canonicalKey:'new-ch',scopeType:'chapter',label:'Matter and Materials'}],
  explicitLinks:[{fromKey:'old-ch',toKey:'new-ch',relation:'equivalent'}],
 })
 assert.equal(plan.changes[0].relation,'equivalent')
 assert.equal(plan.changes[0].toKey,'new-ch')
})

test('resource set allows mixed books but only one primary and no duplicate version',()=>{
 assert.deepEqual(validateResourceSet([{resourceVersionId:1,role:'primary'},{resourceVersionId:2,role:'supporting'}]),{valid:true,errors:[]})
 assert.equal(validateResourceSet([{resourceVersionId:1,role:'primary'},{resourceVersionId:2,role:'primary'}]).valid,false)
 assert.equal(validateResourceSet([{resourceVersionId:1,role:'primary'},{resourceVersionId:1,role:'supporting'}]).valid,false)
})
