import test from 'node:test'
import assert from 'node:assert/strict'
import { getTenantStorageItem, removeTenantStorageItem, setTenantStorageItem, tenantStorageKey } from '../../../../services/tenantStorage.js'

function storage({ quotaKeys = new Set(), genericErrorKeys = new Set() } = {}) {
  const data=new Map()
  return {
    data,
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>{
      if(genericErrorKeys.has(key)){const e=new Error('storage failed');e.name='SecurityError';throw e}
      if(quotaKeys.has(key)){const e=new Error('quota');e.name='QuotaExceededError';e.code=22;throw e}
      data.set(key,String(value))
    },
    removeItem:key=>data.delete(key),
  }
}

test('tenant storage falls back to sessionStorage on local quota and prefers emergency copy',()=>{
  const local=storage()
  const session=storage()
  globalThis.window={localStorage:local,sessionStorage:session}
  const user={tenant_id:'assps',school_id:1,email:'admin@example.invalid'}
  local.setItem('al_siddique_user',JSON.stringify(user))
  const key=tenantStorageKey('paper-store',user)
  local.data.set(key,'stale-local')
  const quotaLocal=storage({quotaKeys:new Set([key])})
  quotaLocal.data.set('al_siddique_user',JSON.stringify(user))
  quotaLocal.data.set(key,'stale-local')
  globalThis.window.localStorage=quotaLocal

  assert.equal(setTenantStorageItem('paper-store','fresh-emergency'),'session')
  assert.equal(session.getItem(key),'fresh-emergency')
  assert.equal(getTenantStorageItem('paper-store'),'fresh-emergency')

  removeTenantStorageItem('paper-store')
  assert.equal(session.getItem(key),null)
  assert.equal(quotaLocal.getItem(key),null)
  delete globalThis.window
})

test('tenant storage does not hide non-quota storage failures',()=>{
  const local=storage()
  const session=storage()
  globalThis.window={localStorage:local,sessionStorage:session}
  const user={tenant_id:'assps'}
  local.setItem('al_siddique_user',JSON.stringify(user))
  const key=tenantStorageKey('paper-store',user)
  globalThis.window.localStorage=storage({genericErrorKeys:new Set([key])})
  globalThis.window.localStorage.data.set('al_siddique_user',JSON.stringify(user))
  assert.throws(()=>setTenantStorageItem('paper-store','x'),/storage failed/)
  delete globalThis.window
})
