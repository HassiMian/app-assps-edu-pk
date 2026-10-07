const assert=require('node:assert/strict')
const http=require('node:http')
const crypto=require('node:crypto')
const BASE=new URL(process.env.TEST_API_URL || 'http://127.0.0.1:5000')
function send(path,method='GET',body=null,ip='192.0.2.144'){
 return new Promise((resolve,reject)=>{
 const raw=body?JSON.stringify(body):null
 const req=http.request({host:BASE.hostname,port:BASE.port||80,path,method,timeout:5000,headers:{'X-Forwarded-For':ip,'Content-Type':'application/json',...(raw?{'Content-Length':Buffer.byteLength(raw)}:{})}},r=>{let out='';r.on('data',x=>out+=x);r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body:out}))});req.on('error',reject);if(raw)req.write(raw);req.end()
 })
}
async function main(){const id=crypto.randomBytes(6).toString('hex'),ip='192.0.2.'+String(150+crypto.randomInt(60))
 const a=`login-a-${id}@invalid.example`,b=`login-b-${id}@invalid.example`
 const first=await send('/api/auth/login','POST',{email:a},ip)
 const second=await send('/api/auth/login','POST',{email:b},ip)
 const third=await send('/api/auth/login','POST',{email:a},ip)
 assert.equal(first.status,400);assert.equal(second.status,400);assert.equal(third.status,400)
 assert.equal(first.headers['ratelimit-limit'],'60')
 assert.equal(first.headers['ratelimit-remaining'],'59')
 assert.equal(second.headers['ratelimit-remaining'],'59')
 assert.equal(third.headers['ratelimit-remaining'],'58')
 console.log('Two login IDs behind same client IP have separate fair login quotas: PASS')
 const me=await send('/api/auth/me','GET',null,ip)
 assert.equal(me.status,401)
 assert.equal(me.headers['ratelimit-limit'],'240')
 console.log('Normal /auth/me session checks do not consume login quota: PASS')
}
main().then(()=>process.exit(0)).catch(e=>{console.error('RATE-LIMIT REGRESSION FAILED:',e.message);process.exit(1)})
