import test from 'node:test'
import assert from 'node:assert/strict'
import { lessonPlanRecoveryKey } from '../lessonPlanRecoveryScope.js'
import { getTenantStorageItem, setTenantStorageItem, tenantStorageKey } from '../../../services/tenantStorage.js'

test('local recovery never auto-authorizes anonymous or schoolless actor', () => {
  for (const user of [null,{}, {id:7}, {school_id:1}, {tenant_id:null,id:7}]) {
    assert.equal(lessonPlanRecoveryKey(user),null)
  }
})
test('different actors and schools cannot share local recovery key', () => {
  const ownerA={id:17,school_id:1},ownerB={id:18,school_id:1},peer={id:17,school_id:2}
  const keyA=tenantStorageKey(lessonPlanRecoveryKey(ownerA), ownerA)
  const keyB=tenantStorageKey(lessonPlanRecoveryKey(ownerB), ownerB)
  const keyPeer=tenantStorageKey(lessonPlanRecoveryKey(peer), peer)
  assert.equal(new Set([keyA,keyB,keyPeer]).size,3)
})
test('verified session owner argument overrides stale local auth identity', () => {
  const backing=new Map([['al_siddique_user', JSON.stringify({id:77,school_id:77})]])
  const localStorage={getItem:(k)=>backing.has(k)?backing.get(k):null,setItem:(k,v)=>backing.set(k,v),removeItem:(k)=>backing.delete(k)}
  const sessionStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}}
  const oldWindow=globalThis.window
  globalThis.window={localStorage,sessionStorage}
  try {
    const owner={id:8,school_id:1}
    const key=lessonPlanRecoveryKey(owner)
    assert.equal(setTenantStorageItem(key,'[{"id":"mine"}]',owner),'local')
    assert.equal(getTenantStorageItem(key,owner),'[{"id":"mine"}]')
    assert.equal(backing.get(tenantStorageKey(key,owner)),'[{"id":"mine"}]')
    assert.equal(backing.get(tenantStorageKey(key,{id:77,school_id:77})),undefined)
    assert.equal(backing.get('al_siddique_lesson_plans'),undefined)
  } finally { globalThis.window=oldWindow }
})
