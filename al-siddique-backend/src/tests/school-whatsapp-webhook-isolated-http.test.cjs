'use strict'
// Hermetic, signed webhook tests. No production DB, Meta API, MT5 or provider calls.
const test=require('node:test')
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const http=require('node:http')
const express=require('express')
const Module=require('node:module')
const path=require('node:path')
const secret='local-test-fixture-secret-not-real'
process.env.WHATSAPP_APP_SECRET=secret
process.env.WHATSAPP_ACCESS_TOKEN='synthetic-no-real-token'
process.env.WHATSAPP_PHONE_NUMBER_ID='synthetic-id'
process.env.WHATSAPP_SCHOOL_ID='1'
const calls={db:[],network:[],primary:[],fallback:[],ids:new Set(),failure:false}
const originalLoad=Module._load
Module._load=function(id,parent,isMain){
 if(id==='../config/database' && parent?.filename.endsWith('routes/whatsappRoutes.js'))return {
  query:async(sql,args)=>{
   calls.db.push({sql,args})
   if(calls.failure)throw new Error('synthetic database unavailable')
   const key=args?.[1]
   if(calls.ids.has(key))return {rowCount:0,rows:[]}
   calls.ids.add(key)
   return {rowCount:1,rows:[{id:77}]}
  },tenantContext:{run:(_ctx,fn)=>fn()}
 }
 if(id==='../services/whatsapp/jarvisCognitiveCore' && parent?.filename.endsWith('routes/whatsappRoutes.js'))return {
  processMessage:async(...args)=>{calls.primary.push(args);return {reply:'School office response'}}
 }
 if(id==='../services/whatsapp/whatsappRouter' && parent?.filename.endsWith('routes/whatsappRoutes.js'))return {
  WhatsAppRouter:class{async processMessage(...args){calls.fallback.push(args);return {reply:'School fallback'}}}
 }
 if(id==='../services/whatsapp/missionManager' && parent?.filename.endsWith('routes/whatsappRoutes.js'))return {
  missionManager:{isDuplicateResponse:()=>false}
 }
 return originalLoad.call(this,id,parent,isMain)
}
let router
try{router=require('../routes/whatsappRoutes')}finally{Module._load=originalLoad}
const app=express()
app.use(express.json({verify:(req,_res,buffer)=>{req.rawBody=buffer}}))
app.use('/api/whatsapp',router)
let server,base,originalFetch

test.before(async()=>{
 originalFetch=global.fetch
 global.fetch=async(url,options)=>{
  calls.network.push({url:String(url),method:options?.method,body:options?.body})
  return {ok:true,status:200,json:async()=>({messages:[{id:'synthetic'}]})}
 }
 server=http.createServer(app)
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 base=`http://127.0.0.1:${server.address().port}`
})
test.after(async()=>{
 global.fetch=originalFetch
 await new Promise(resolve=>server.close(resolve))
})
function body(id,message){return {object:'whatsapp_business_account',entry:[{changes:[{value:{messages:[{id,from:'0000000000',type:'text',text:{body:message}}]}}]}]}}
async function post(bodyObj,valid=true){
 const raw=JSON.stringify(bodyObj)
 const sig=crypto.createHmac('sha256',secret).update(raw).digest('hex')
 const r=await originalFetch(base+'/api/whatsapp/webhook',{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':'sha256='+(valid?sig:'0'.repeat(64))},body:raw})
 return {status:r.status,data:await r.json()}
}
async function settle(){await new Promise(resolve=>setTimeout(resolve,10))}

test('invalid signature rejected before storage or school handlers',async()=>{
 const before=calls.db.length
 const r=await post(body('bad-sig-001','Starter English diary'),false)
 assert.equal(r.status,403)
 assert.equal(calls.db.length,before)
 assert.equal(calls.primary.length,0)
})
test('signed market phrase is blocked before primary and fallback processing',async()=>{
 const r=await post(body('market-001','gold setup do'))
 assert.equal(r.status,200)
 await settle()
 assert.equal(calls.primary.length,0)
 assert.equal(calls.fallback.length,0)
 const outgoing=calls.network.map(x=>x.body||'').filter(x=>x.includes('School')||x.includes('school'))
 assert.ok(outgoing.some(x=>x.includes('market')||x.includes('Market')||x.includes('school')))
})
test('signed school diary question still invokes school core',async()=>{
 const r=await post(body('school-diary-002','Starter English diary'))
 assert.equal(r.status,200)
 await settle()
 assert.equal(calls.primary.length,1)
 assert.equal(calls.primary[0][1],'Starter English diary')
 assert.equal(calls.fallback.length,0)
})
test('duplicate signed message is acknowledged but is not redelivered to school core',async()=>{
 const before=calls.primary.length
 const r=await post(body('school-diary-002','Starter English diary'))
 assert.equal(r.status,200)
 await settle()
 assert.equal(calls.primary.length,before)
})
test('synthetic school event database failure is 503 and never invokes AI or trading',async()=>{
 calls.failure=true
 const before=calls.primary.length
 const r=await post(body('db-fail-003','Grade Five fee status'))
 calls.failure=false
 assert.equal(r.status,503)
 assert.equal(calls.primary.length,before)
 assert.equal(calls.fallback.length,0)
})
