'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
process.env.NODE_ENV='test'
process.env.DB_STARTUP_PROBE='false'
const {__test}=require('../config/database')
const makeLease=__test?.createRestrictedPaperLease
assert.equal(typeof makeLease,'function')
function mocked(fails=[]) {
  const calls=[], releases=[]
  const client={
    calls,releases,
    async query(text){
      const sql=String(text);calls.push(sql)
      if(fails.includes(sql)) throw Object.assign(new Error('synthetic '+sql+' failure'),{code:'25P02'})
      return {rows:[],rowCount:0,command:sql}
    },
    release(error){releases.push(error)}
  }
  return client
}
test('signed Paper normal completed COMMIT returns clean connection only once',async()=>{
  const c=mocked(),lease=makeLease(c)
  await lease.query('BEGIN')
  await lease.query('SELECT 1')
  await lease.query('COMMIT')
  await lease.release()
  await lease.release()
  assert.deepEqual(c.calls,['SELECT 1','COMMIT'])
  assert.equal(c.releases.length,1); assert.ok(!c.releases[0])
})
test('active signed Paper lease ROLLBACK succeeds and safely returns connection',async()=>{
  const c=mocked(),lease=makeLease(c)
  await lease.query('SELECT 1')
  await lease.release()
  assert.deepEqual(c.calls,['SELECT 1','ROLLBACK'])
  assert.equal(c.releases.length,1); assert.ok(!c.releases[0])
})
test('failed implicit ROLLBACK must evict unsafe dedicated Paper connection',async()=>{
  const c=mocked(['ROLLBACK']),lease=makeLease(c)
  await lease.query('SELECT 1')
  await lease.release()
  assert.equal(c.releases.length,1)
  assert.equal(c.releases[0]?.code,'PAPER_DB_ROLLBACK_FAILED')
  assert.equal(c.releases[0]?.cause?.code,'25P02')
})
test('failed explicit COMMIT must evict even when caller catches error',async()=>{
  const c=mocked(['COMMIT']),lease=makeLease(c)
  await assert.rejects(lease.query('COMMIT'),e=>e.code==='25P02')
  await lease.release()
  assert.equal(c.releases.length,1)
  assert.equal(c.releases[0]?.code,'25P02')
})
test('failed explicit ROLLBACK must evict even when caller catches error',async()=>{
  const c=mocked(['ROLLBACK']),lease=makeLease(c)
  await assert.rejects(lease.query('ROLLBACK'),e=>e.code==='25P02')
  await lease.release()
  assert.equal(c.releases.length,1)
  assert.equal(c.releases[0]?.code,'25P02')
})
test('caller already has authorization error: discard after cleanup, once',async()=>{
  const c=mocked(),lease=makeLease(c)
  const forbidden=Object.assign(new Error('scope invalid'),{code:'PAPER_DB_CONTEXT_FORBIDDEN'})
  await lease.release(forbidden)
  await lease.release()
  assert.deepEqual(c.calls,['ROLLBACK'])
  assert.deepEqual(c.releases,[forbidden])
})
