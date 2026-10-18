import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import axios from 'axios'
import api, {getAuthToken,getRefreshToken,setAuthSession,getAuthUser,clearAuthSession} from '../api.js'
import {sameAuthenticatedIdentity,sessionWindowValid,isAuthHandshake,mayAutoReplayAfterRefresh} from '../authSessionRecovery.js'

const values = new Map()
const events=[]
globalThis.window = {
  localStorage: {
    getItem:k=>values.get(k)||null,
    setItem:(k,v)=>values.set(k,String(v)),
    removeItem:k=>values.delete(k),
  },
  location: {pathname:'/paper-generator',href:''},
  dispatchEvent:event=>events.push(event.type),
}
globalThis.CustomEvent=class {constructor(type,args){this.type=type;this.detail=args?.detail}}
const original={id:900001,school_id:900001,tenant_id:'synthetic-a',role:'teacher'}
const other={id:900002,school_id:900002,tenant_id:'synthetic-b',role:'teacher'}
let scenario='success'
let refreshCalls=0
let protectedCalls=0
let postedWrites=0
let server,baseURL

function send(res,status,body) {
 res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'})
 res.end(JSON.stringify(body))
}
before(async()=>{
 server=http.createServer(async(req,res)=>{
  const pieces=[]
  for await(const chunk of req)pieces.push(chunk)
  const body=Buffer.concat(pieces).toString()
  if(req.url==='/api/auth/refresh' && req.method==='POST'){
   refreshCalls++
   if(scenario==='refresh-reject')return send(res,401,{message:'Invalid refresh'})
   if(scenario==='refresh-outage')return send(res,503,{message:'Temporary network interruption'})
   if(body.includes('synthetic-invalid'))return send(res,401,{message:'Invalid refresh'})
   return send(res,200,{token:'synthetic-access-fresh',refreshToken:'synthetic-refresh-new',
     user: scenario==='wrong-school'?other:original})
  }
  if(req.url==='/api/auth/login')return send(res,401,{message:'Invalid test credentials'})
  if(req.url==='/api/auth/me'){
   if(req.headers.authorization==='Bearer synthetic-access-fresh')return send(res,200,{user:original})
   return send(res,401,{message:'Access token expired'})
  }
  if(req.url==='/api/lesson-context') {
   return send(res,401,{message:'Lesson service denied request'})
  }
  if(req.url==='/api/read'){
   protectedCalls++
   if(req.headers.authorization==='Bearer synthetic-access-fresh')return send(res,200,{data:'SYNTHETIC_READ'})
   return send(res,401,{message:'Access token expired'})
  }
  if(req.url==='/api/fees/save' && req.method==='POST'){
   postedWrites++
   return send(res,401,{message:'Access token expired before save'})
  }
  return send(res,404,{message:'Synthetic endpoint missing'})
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 baseURL='http://127.0.0.1:'+server.address().port
 api.defaults.baseURL=baseURL
 axios.defaults.baseURL=baseURL
})
after(async()=>{await new Promise(resolve=>server.close(resolve))})
function reset(){
 values.clear();events.length=0; scenario='success';refreshCalls=0;protectedCalls=0;postedWrites=0
 window.location.href=''
 setAuthSession('synthetic-access-expired','synthetic-refresh-old',original)
 values.set('al_siddique_login_at',String(Date.now()))
}
test('identity binding denies teacher ID and school/tenant crossover',()=>{
 assert.equal(sameAuthenticatedIdentity(original,original),true)
 assert.equal(sameAuthenticatedIdentity(original,other),false)
 assert.equal(sameAuthenticatedIdentity(original,{...original,school_id:900002}),false)
 assert.equal(sameAuthenticatedIdentity(original,{...original,tenant_id:'peer'}),false)
 assert.equal(sameAuthenticatedIdentity(original,{...original,role:'super_admin'}),false)
 assert.equal(sameAuthenticatedIdentity({...original,school_code:'assps'},
   {...original,school_code:'peer'}),false)
})
test('session cutoff and authentication route gating',()=>{
 assert.equal(sessionWindowValid(Date.now()-60000),true)
 assert.equal(sessionWindowValid(Date.now()-13*60*60*1000),false)
 assert.equal(isAuthHandshake('/api/auth/login'),true)
 assert.equal(isAuthHandshake('/api/auth/refresh'),true)
 assert.equal(isAuthHandshake('/api/lesson-context'),false)
 assert.equal(mayAutoReplayAfterRefresh('GET'),true)
 assert.equal(mayAutoReplayAfterRefresh('POST'),false)
 assert.equal(mayAutoReplayAfterRefresh('PUT'),false)
})
test('expired JWT refreshes with same principal and safely retries GET once',async()=>{
 reset()
 const result=await api.get('/api/read',{skipCache:true})
 assert.equal(result.status,200)
 assert.equal(result.data.data,'SYNTHETIC_READ')
 assert.equal(refreshCalls,1)
 assert.equal(protectedCalls,2)
 assert.equal(getAuthToken(),'synthetic-access-fresh')
 assert.equal(getRefreshToken(),'synthetic-refresh-new')
 assert.deepEqual(getAuthUser(),original)
 assert.equal(window.location.href,'')
})
test('401 on optional Lesson API stays an explicit module error and does not log teacher out',async()=>{
 reset()
 await assert.rejects(api.get('/api/lesson-context',{skipCache:true}),e=>e?.response?.status===401)
 assert.equal(refreshCalls,1)
 assert.equal(getAuthToken(),'synthetic-access-fresh')
 assert.equal(window.location.href,'')
})
test('expired access token renews before /auth/me verified session restore',async()=>{
 reset()
 const result=await api.get('/api/auth/me',{skipCache:true})
 assert.equal(result.status,200)
 assert.equal(refreshCalls,1)
 assert.equal(getAuthToken(),'synthetic-access-fresh')
})
test('fee or marks POST is NEVER automatically replayed after token renewal',async()=>{
 reset()
 await assert.rejects(api.post('/api/fees/save',{amount:12}),error=>{
   assert.equal(error?.response?.status,401)
   assert.equal(error.sessionRecovered,true)
   return true
 })
 assert.equal(postedWrites,1)
 assert.equal(refreshCalls,1)
 assert.equal(getAuthToken(),'synthetic-access-fresh')
})
test('server-rejected refresh clears the invalid user session',async()=>{
 reset();scenario='refresh-reject'
 await assert.rejects(api.get('/api/read',{skipCache:true}),e=>e?.response?.status===401)
 assert.equal(getAuthToken(),null)
 assert.equal(getRefreshToken(),null)
 assert.equal(window.location.href,'/login')
 assert(events.includes('auth:logout'))
})
test('temporary refresh outage retains local draft/session and surfaces error',async()=>{
 reset();scenario='refresh-outage'
 await assert.rejects(api.get('/api/read',{skipCache:true}),e=>e?.response?.status===401)
 assert.equal(getAuthToken(),'synthetic-access-expired')
 assert.equal(getRefreshToken(),'synthetic-refresh-old')
 assert.equal(window.location.href,'')
})
test('refresh with a cross-school identity is rejected and session cleared',async()=>{
 reset();scenario='wrong-school'
 await assert.rejects(api.get('/api/read',{skipCache:true}),e=>e?.response?.status===401)
 assert.equal(getAuthToken(),null)
 assert.equal(window.location.href,'/login')
})
test('wrong password 401 never triggers a refresh or global logout',async()=>{
 reset()
 await assert.rejects(api.post('/api/auth/login',{email:'synthetic@invalid.example',password:'wrong'}),e=>e?.response?.status===401)
 assert.equal(refreshCalls,0)
 assert.equal(getAuthToken(),'synthetic-access-expired')
 assert.equal(window.location.href,'')
})
test('session older than 12 hours cannot silently refresh',async()=>{
 reset()
 values.set('al_siddique_login_at',String(Date.now()-13*60*60*1000))
 await assert.rejects(api.get('/api/read',{skipCache:true}),e=>e?.response?.status===401)
 assert.equal(refreshCalls,0)
 assert.equal(getAuthToken(),null)
 assert.equal(window.location.href,'/login')
})
test('simultaneous GET 401 requests use single-flight session renewal',async()=>{
 reset()
 const [a,b]=await Promise.all([api.get('/api/read',{skipCache:true}),api.get('/api/read',{skipCache:true})])
 assert.equal(a.status,200);assert.equal(b.status,200)
 assert.equal(refreshCalls,1)
 assert.equal(window.location.href,'')
})
