import test from 'node:test'
import assert from 'node:assert/strict'
import api from '../../../../../services/api.js'
import { tenantStorageKey } from '../../../../../services/tenantStorage.js'
import {
  bindQueuedAssessmentSave,
  flushAssessmentOfflineQueue,
  getAssessmentOfflineQueue,
  saveAssessmentRevision,
} from '../assessmentPersistence.js'

class FakeStorage {
  #records = new Map()
  getItem(key) { return this.#records.has(key) ? this.#records.get(key) : null }
  setItem(key, value) { this.#records.set(key, String(value)) }
  removeItem(key) { this.#records.delete(key) }
  key(index) { return [...this.#records.keys()][index] || null }
  get length() { return this.#records.size }
}

const offline = () => Object.assign(new Error('network unavailable'), { code:'ERR_NETWORK' })
const doc = content => ({ metadata:{ title:'QA' }, sections:[{ nodes:[{ content }] }] })
function login(tenantId, userId=11) {
  window.localStorage.setItem('al_siddique_user', JSON.stringify({
    id:userId, role:'teacher', tenant_id:tenantId, school_id:tenantId,
  }))
}

function setup(t) {
  const oldWindow = globalThis.window
  const originalPost = api.post
  globalThis.window = { localStorage:new FakeStorage(), sessionStorage:new FakeStorage() }
  login('assessment-qa-tenant-a')
  t.after(() => { api.post=originalPost; if (oldWindow === undefined) delete globalThis.window; else globalThis.window=oldWindow })
}

test('a new offline save survives a concurrent replay, and late local-paper bindings are retained', async t => {
  setup(t)
  api.post=async () => { throw offline() }
  const first=await saveAssessmentRevision({paperId:'qa-paper-1',document:doc('old')})
  assert.equal(first.queued,true)
  let release; let replayStarted
  const started=new Promise(resolve=>{replayStarted=resolve})
  api.post=async () => new Promise(resolve=>{release=resolve;replayStarted()})
  const running=flushAssessmentOfflineQueue()
  await started
  assert.equal(bindQueuedAssessmentSave(first.queueId,'local-paper-1'),true)
  api.post=async () => { throw offline() }
  const second=await saveAssessmentRevision({paperId:'qa-paper-2',document:doc('new')})
  assert.equal(second.queued,true)
  release({data:{data:{currentRevision:1,contentHash:'abc'}}})
  const result=await running
  assert.equal(result.flushed,1)
  assert.equal(result.remaining,1)
  assert.equal(result.synced[0].localPaperId,'local-paper-1')
  assert.deepEqual(getAssessmentOfflineQueue().map(item=>item.paperId),['qa-paper-2'])
})

test('parallel flush callers share one in-flight replay instead of sending duplicate revisions', async t => {
  setup(t)
  api.post=async () => { throw offline() }
  await saveAssessmentRevision({paperId:'qa-single',document:doc('single')})
  let resolveResponse; let sent=0; let replayStarted
  const started=new Promise(resolve=>{replayStarted=resolve})
  api.post=async () => { sent+=1; replayStarted(); return new Promise(resolve=>{resolveResponse=resolve}) }
  const first=flushAssessmentOfflineQueue()
  const second=flushAssessmentOfflineQueue()
  assert.equal(first,second)
  await started
  resolveResponse({data:{data:{currentRevision:1}}})
  const [a,b]=await Promise.all([first,second])
  assert.equal(sent,1)
  assert.equal(a.flushed,1)
  assert.deepEqual(a,b)
  assert.deepEqual(getAssessmentOfflineQueue(),[])
})

test('a conflict blocks later edits of the same paper without overwriting their recovery copies', async t => {
  setup(t)
  api.post=async()=>{throw offline()}
  await saveAssessmentRevision({paperId:'qa-conflict',document:doc('revision A')})
  await saveAssessmentRevision({paperId:'qa-conflict',document:doc('revision B')})
  let count=0
  api.post=async()=>{
    count+=1
    const error=new Error('revision conflict')
    error.response={status:409,data:{code:'REVISION_CONFLICT',currentRevision:4}}
    throw error
  }
  const result=await flushAssessmentOfflineQueue()
  assert.equal(count,1)
  assert.equal(result.conflicts,1)
  assert.equal(result.remaining,2)
  const pending=getAssessmentOfflineQueue()
  assert.equal(pending[0].attempts,1)
  assert.equal(pending[0].lastError,'REVISION_CONFLICT')
  assert.equal(pending[1].attempts,0)
  assert.equal(pending[1].document.sections[0].nodes[0].content,'revision B')
})

test('account changes while a replay is pending never write the old-school queue to the new school', async t => {
  setup(t)
  api.post=async()=>{throw offline()}
  await saveAssessmentRevision({paperId:'qa-tenant-a',document:doc('A only')})
  const firstStorageKey=tenantStorageKey('assps_assessment_studio_offline_queue_v1')
  let release; let startedResolver
  const started=new Promise(resolve=>{startedResolver=resolve})
  api.post=async()=>new Promise(resolve=>{release=resolve;startedResolver()})
  const pending=flushAssessmentOfflineQueue()
  await started
  login('assessment-qa-tenant-b')
  assert.notEqual(tenantStorageKey('assps_assessment_studio_offline_queue_v1'),firstStorageKey)
  release({data:{data:{currentRevision:1}}})
  const result=await pending
  assert.equal(result.scopeChanged,true)
  assert.equal(result.flushed,0)
  assert.deepEqual(getAssessmentOfflineQueue(),[])
  login('assessment-qa-tenant-a')
  assert.equal(getAssessmentOfflineQueue().length,1)
})


test("shared school computers do not replay another staff user's queued drafts", async t => {
  setup(t)
  api.post=async()=>{throw offline()}
  await saveAssessmentRevision({paperId:'qa-account-bound',document:doc('Owner only')})
  assert.equal(getAssessmentOfflineQueue()[0].ownerUserId,'11')
  login('assessment-qa-tenant-a',22)
  let calls=0
  api.post=async()=>{calls+=1;return {data:{data:{currentRevision:1}}}}
  const denied=await flushAssessmentOfflineQueue()
  assert.equal(calls,0)
  assert.equal(denied.authRequired,1)
  assert.equal(denied.remaining,1)
  login('assessment-qa-tenant-a',11)
  const allowed=await flushAssessmentOfflineQueue()
  assert.equal(calls,1)
  assert.equal(allowed.flushed,1)
  assert.deepEqual(getAssessmentOfflineQueue(),[])
})

test('identity switches within one school while request is in flight preserve the original queue',async t=>{
  setup(t)
  api.post=async()=>{throw offline()}
  await saveAssessmentRevision({paperId:'qa-same-tenant-account-change',document:doc('private')})
  let resolvePending;let started
  const start=new Promise(resolve=>{started=resolve})
  api.post=async()=>new Promise(resolve=>{resolvePending=resolve;started()})
  const replay=flushAssessmentOfflineQueue()
  await start
  login('assessment-qa-tenant-a',22)
  resolvePending({data:{data:{currentRevision:1}}})
  const outcome=await replay
  assert.equal(outcome.scopeChanged,true)
  assert.equal(outcome.flushed,0)
  login('assessment-qa-tenant-a',11)
  assert.equal(getAssessmentOfflineQueue().length,1)
})
