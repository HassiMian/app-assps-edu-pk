import { test } from 'node:test'
import assert from 'node:assert/strict'
import api from './api.js'
function mockWindow(){
 const entries=new Map([
  ['al_siddique_token','synthetic-not-real-token'],
  ['al_siddique_user',JSON.stringify({id:8,school_id:1})],
 ])
 globalThis.window={
  localStorage:{getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)},
  location:{pathname:'/exams/marks',href:'/exams/marks'}
 }
 return entries
}
async function reject401(method,url,flag){
 return api.request({method,url,marksWriteNoLogout401:flag,adapter:config=>Promise.reject({
  config,response:{status:401,data:{message:'Signed catalog mismatch'}}
 })}).then(()=>{throw Error('expected denial')},e=>e)
}
test('scoped marks POST 401 preserves primary login, page and unsaved form state',async()=>{
 const storage=mockWindow()
 const err=await reject401('post','/api/exams/results',true)
 assert.equal(err.response.status,401)
 assert.equal(storage.get('al_siddique_token'),'synthetic-not-real-token')
 assert.equal(window.location.href,'/exams/marks')
})
test('other POST 401 still clears token and redirects',async()=>{
 const storage=mockWindow()
 await reject401('post','/api/fees/payments',true)
 assert.equal(storage.has('al_siddique_token'),false)
 assert.equal(window.location.href,'/login')
})
test('marks POST without explicit opt-in still clears token and redirects',async()=>{
 const storage=mockWindow()
 await reject401('post','/api/exams/results',false)
 assert.equal(storage.has('al_siddique_token'),false)
 assert.equal(window.location.href,'/login')
})
test('marks GET 401 stays a login failure without read-only scope',async()=>{
 const storage=mockWindow()
 await reject401('get','/api/exams/results',true)
 assert.equal(storage.has('al_siddique_token'),false)
 assert.equal(window.location.href,'/login')
})
test('noncanonical marks POST paths cannot suppress logout',async()=>{
 const storage=mockWindow()
 await reject401('post','/api/exams/results/9',true)
 assert.equal(storage.has('al_siddique_token'),false)
 assert.equal(window.location.href,'/login')
})
