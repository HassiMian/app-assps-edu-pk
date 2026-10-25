import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const api = { get:async()=>{}, post:async()=>{}, put:async()=>{}, delete:async()=>{} }
globalThis.__lessonClientTestApi = api
const src = readFileSync(new URL('../lessonPlanClient.js', import.meta.url), 'utf8')
  .replace(/^import api from .*$/m, 'const api = globalThis.__lessonClientTestApi')
const client = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'))
const response = (data) => ({ data })
const saved = (rev, extra={}) => ({ id:'lesson-1', serverRevision:rev, ...extra })

test('list rejects false-success, missing confirmation and malformed lists', async () => {
  api.get=async()=>response({success:false,data:[saved(1)],message:'permission denied'})
  await assert.rejects(client.listLessonPlans(), /permission denied/)
  api.get=async()=>response({data:[]})
  await assert.rejects(client.listLessonPlans(), /not confirmed/)
  api.get=async()=>response({success:true,data:{}})
  await assert.rejects(client.listLessonPlans(), /list was not confirmed/)
  api.get=async()=>response({success:true,data:[saved(1)]})
  assert.equal((await client.listLessonPlans()).length,1)
})
test('create requires matching persisted identity and positive server revision', async () => {
  api.post=async()=>response({success:true,data:{id:'forged',serverRevision:1}})
  await assert.rejects(client.createLessonPlan({id:'lesson-1'}), /identity and revision/)
  api.post=async()=>response({success:true,data:{id:'lesson-1'}})
  await assert.rejects(client.createLessonPlan({id:'lesson-1'}), /identity and revision/)
  api.post=async()=>response({success:true,data:saved(1)})
  assert.equal((await client.createLessonPlan({id:'lesson-1'})).serverRevision,1)
})
test('update rejects stale and false-success response', async () => {
  api.put=async()=>response({success:false,data:saved(2)})
  await assert.rejects(client.updateLessonPlan(saved(1)), /not confirmed/)
  api.put=async()=>response({success:true,data:saved(1)})
  await assert.rejects(client.updateLessonPlan(saved(1)), /identity and revision/)
  api.put=async()=>response({success:true,data:saved(2)})
  assert.equal((await client.updateLessonPlan(saved(1))).serverRevision,2)
})
test('share requires published server revision and independently shaped delivery receipt', async () => {
  api.post=async()=>response({success:false,data:saved(2,{sentToPortal:true}),delivery:{students:1,notifications:2}})
  await assert.rejects(client.shareLessonPlan(saved(1)),/not confirmed/)
  api.post=async()=>response({success:true,data:saved(2,{sentToPortal:false}),delivery:{students:1,notifications:2}})
  await assert.rejects(client.shareLessonPlan(saved(1)),/not verified/)
  api.post=async()=>response({success:true,data:saved(2,{sentToPortal:true}),delivery:{students:2}})
  await assert.rejects(client.shareLessonPlan(saved(1)),/not verified/)
  api.post=async()=>response({success:true,data:saved(2,{sentToPortal:true}),delivery:{students:0,notifications:0}})
  assert.deepEqual((await client.shareLessonPlan(saved(1))).delivery,{students:0,notifications:0})
})

test('delete requires real server-deleted receipt for the requested plan', async () => {
  api.delete=async()=>response({success:false,deleted:true,id:'lesson-1'})
  await assert.rejects(client.deleteLessonPlan(saved(1)), /not confirmed/)
  api.delete=async()=>response({success:true,deleted:false,id:'lesson-1'})
  await assert.rejects(client.deleteLessonPlan(saved(1)), /not confirmed/)
  api.delete=async()=>response({success:true,deleted:true,id:'different-lesson'})
  await assert.rejects(client.deleteLessonPlan(saved(1)), /not confirmed/)
  api.delete=async()=>response({success:true,deleted:true,id:'lesson-1'})
  assert.deepEqual(await client.deleteLessonPlan(saved(1)),{deleted:true,id:'lesson-1'})
})
