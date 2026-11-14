const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const crypto=require('node:crypto')
const path=require('node:path')
const sourceFile=process.env.A314_AUTH_SOURCE ||
  path.resolve(__dirname,'../../al-siddique-backend/src/routes/authRoutes.js')
const source=fs.readFileSync(sourceFile,'utf8')
const max=Number(source.match(/const MAX_LOGIN_ATTEMPTS = (\d+)/)?.[1])
assert.ok(max>=5,'configured login limit could not be identified')
const ttl=15*60*1000
function harness(){
  let clock=1_800_000_000_000
  const attempts=new Map()
  const start=source.indexOf('function getClientKey(')
  const end=source.indexOf('function buildUserPayload(',start)
  assert.ok(start>=0 && end>start,'auth lockout helper source section')
  const sandbox={
    Date:{now:()=>clock},loginAttempts:attempts,
    crypto,
    MAX_LOGIN_ATTEMPTS:max,BLOCK_DURATION_MS:ttl,
    normalizeLoginId:x=>String(x||'').trim()
  }
  vm.createContext(sandbox)
  vm.runInContext(source.slice(start,end)+
    '\nthis.h={getClientKey,getLoginAttempt,recordLoginFailure,resetLoginAttempts,isBlocked};',sandbox)
  return {h:sandbox.h,attempts,advance:ms=>{clock+=ms}}
}
test('all failures across one account trigger its own lock, not another account on same IP',()=>{
 const {h}=harness()
 const sameIp={headers:{'x-forwarded-for':'198.51.100.7'},ip:'198.51.100.7'}
 const a=h.getClientKey(sameIp,'a314-A@invalid.example')
 const b=h.getClientKey(sameIp,'a314-B@invalid.example')
 assert.notEqual(a,b)
 for(let i=0;i<max;i++)h.recordLoginFailure(a)
 assert.ok(h.isBlocked(a))
 assert.ok(!h.isBlocked(b))
})
test('after lock expiration a single next bad password cannot lock again',()=>{
 const {h,advance}=harness()
 const k='198.51.100.8:a314@invalid.example'
 for(let i=0;i<max;i++)h.recordLoginFailure(k)
 assert.ok(h.isBlocked(k))
 advance(ttl+1)
 assert.ok(!h.isBlocked(k))
 h.recordLoginFailure(k)
 assert.equal(h.getLoginAttempt(k).count,1)
 assert.ok(!h.isBlocked(k),'stale lockout counter must reset')
})
test('idle failed-login counter resets after inactivity expiry',()=>{
 const {h,advance}=harness()
 const k='198.51.100.9:a314@invalid.example'
 h.recordLoginFailure(k)
 h.recordLoginFailure(k)
 advance(ttl+1)
 h.recordLoginFailure(k)
 assert.equal(h.getLoginAttempt(k).count,1)
})
test('failed-attempt counter remains active inside its time window',()=>{
 const {h,advance}=harness()
 const k='198.51.100.10:a314@invalid.example'
 h.recordLoginFailure(k)
 advance(ttl-10)
 h.recordLoginFailure(k)
 assert.equal(h.getLoginAttempt(k).count,2)
})
test('successful login resets the same account counter',()=>{
 const {h}=harness()
 const k='198.51.100.11:a314@invalid.example'
 for(let i=0;i<max;i++)h.recordLoginFailure(k)
 h.resetLoginAttempts(k)
 assert.equal(h.getLoginAttempt(k).count,0)
 assert.ok(!h.isBlocked(k))
})
