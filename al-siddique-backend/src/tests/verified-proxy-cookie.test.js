require('dotenv').config()
const assert=require('node:assert/strict')
const http=require('node:http')
const https=require('node:https')
const crypto=require('node:crypto')
const bcrypt=require('bcryptjs')
const {pool}=require('../config/database')
const BASE=new URL(process.env.TEST_CONNECT_URL || 'https://api.assps.edu.pk')
const CONNECT_HOST=process.env.TEST_CONNECT_HOST || BASE.host
function request(method,path,body,cookie) { return new Promise((resolve,reject)=>{
 const payload=body?JSON.stringify(body):null
 const transport=BASE.protocol==='https:'?https:http
 const req=transport.request({hostname:BASE.hostname,port:BASE.port||undefined,path,method,timeout:6000,headers:{Host:CONNECT_HOST,...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json',...(payload?{'Content-Length':Buffer.byteLength(payload)}:{})}},res=>{let raw='';res.on('data',x=>raw+=x);res.on('end',()=>{let data={};try{data=JSON.parse(raw)}catch{}resolve({status:res.statusCode,headers:res.headers,body:data})})});req.on('timeout',()=>req.destroy(new Error('timeout')));req.on('error',reject);if(payload)req.write(payload);req.end()
})}
async function run(){
 const c=await pool.connect(); let schoolId
 try {
  const suffix=crypto.randomBytes(5).toString('hex');const code=`role${suffix}`;const pass=crypto.randomBytes(18).toString('base64url');const hash=await bcrypt.hash(pass,10);const email=`role-${suffix}@invalid.example`
  const s=await c.query("INSERT INTO schools(name,code,status,tenant_id) VALUES ('Synthetic Proxy Test',$1,'active',$1) RETURNING id",[code]);schoolId=s.rows[0].id
  await c.query("INSERT INTO users(school_id,tenant_id,name,email,password,role,is_active) VALUES ($1,$2,'Synthetic Admin',$3,$4,'admin',true)",[schoolId,code,email,hash])
  const login=await request('POST','/api/auth/login',{email,password:pass,role:'admin',school_code:code});assert.equal(login.status,200,'synthetic login must work')
  const cookies=(login.headers['set-cookie']||[]).map(x=>x.split(';')[0]);assert.ok(cookies.some(x=>x.startsWith('authToken=')))
  const forgedRole=cookies.filter(x=>!x.startsWith('role=')).concat(['role=student']).join('; ')
  let response=await request('GET','/student',null,forgedRole)
  assert.equal(response.status,307);assert.equal(new URL(response.headers.location,BASE).pathname,'/admin')
  console.log('Verified proxy ignores forged student-role cookie: PASS')
  response=await request('GET','/admin',null,'userId=123456; role=admin; tenantId=assps; authToken=invalid')
  assert.ok([302,307].includes(response.status));assert.equal(new URL(response.headers.location,BASE).pathname,'/login')
  console.log('Forged session cannot enter admin shell: PASS')
  response=await request('GET','/teacher',null,cookies.join('; '))
  assert.equal(response.status,307);assert.equal(new URL(response.headers.location,BASE).pathname,'/admin')
  console.log('Valid admin redirected from teacher portal: PASS')
 } finally {
  if(schoolId){await c.query('DELETE FROM users WHERE school_id=$1',[schoolId]).catch(()=>{});await c.query('DELETE FROM schools WHERE id=$1',[schoolId]).catch(()=>{})}c.release()
 }
}
run().then(()=>process.exit(0)).catch(e=>{console.error('PROXY TEST FAILED:',e.message);process.exit(1)})
