require('dotenv').config()
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const http=require('node:http')
const bcrypt=require('bcryptjs')
const jwt=require('jsonwebtoken')
const {pool}=require('../config/database')
function request(method,path,token,body){return new Promise((resolve,reject)=>{
const b=body?JSON.stringify(body):null
const q=http.request({hostname:'127.0.0.1',port:5000,path,method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json',...(b?{'Content-Length':Buffer.byteLength(b)}:{})}},r=>{let raw='';r.on('data',x=>raw+=x);r.on('end',()=>{let obj={};try{obj=JSON.parse(raw)}catch{}resolve({status:r.statusCode,body:obj,headers:r.headers})})});q.on('error',reject);if(b)q.write(b);q.end()})}
async function main(){const c=await pool.connect();let schoolId
try{
const suffix=crypto.randomBytes(4).toString('hex'),code=`handoff${suffix}`
const s=await c.query("INSERT INTO schools(name,code,status,tenant_id) VALUES('Synthetic Activation School',$1,'active',$1) RETURNING id",[code]);schoolId=s.rows[0].id
const email=`synthetic-admin-${suffix}@invalid.example`
const admin=(await c.query("INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,'Synthetic Admin',$3,'admin','unused',true) RETURNING id",[schoolId,code,email])).rows[0]
const childEmail=`synthetic-child-${suffix}@invalid.example`
const u=(await c.query("INSERT INTO users(school_id,tenant_id,name,email,username,role,password,is_active,must_change_password) VALUES($1,$2,'Synthetic Child',$3,$4,'student',$5,true,true) RETURNING id",[schoolId,code,childEmail,`ST-${suffix}`,await bcrypt.hash(crypto.randomBytes(20).toString('hex'),12)])).rows[0]
const handoff=(await c.query("INSERT INTO portal_identity_handoffs(school_id,user_id,portal_role,state) VALUES($1,$2,'student','pending') RETURNING id",[schoolId,u.id])).rows[0]
const token=jwt.sign({id:admin.id,email,role:'admin'},process.env.JWT_SECRET,{expiresIn:'5m'})
let q=await request('GET','/api/auth/users/pending-activation',token);assert.equal(q.status,200);assert.equal(q.body.data.length,1);console.log('Pending list scoped to school: PASS')
q=await request('POST',`/api/auth/users/pending-activation/${handoff.id}/issue`,token,{recipientVerified:false});assert.equal(q.status,400);console.log('Recipient verification mandatory: PASS')
q=await request('POST',`/api/auth/users/pending-activation/${handoff.id}/issue`,token,{recipientVerified:true});assert.equal(q.status,200,JSON.stringify({status:q.status,message:q.body.message}));assert.ok(q.body.data.temporaryPassword);assert.match(q.headers['cache-control'],/no-store/)
const password=q.body.data.temporaryPassword
console.log('One-time credential created with no-store: PASS')
q=await request('POST','/api/auth/login',null,{email:childEmail,password,role:'student',school_code:code});assert.equal(q.status,200,JSON.stringify({status:q.status,message:q.body.message}));console.log('New credential authenticates correct account: PASS')
q=await request('POST',`/api/auth/users/pending-activation/${handoff.id}/issue`,token,{recipientVerified:true});assert.equal(q.status,409);console.log('Silent reissue prohibited: PASS')
q=await request('POST',`/api/auth/users/pending-activation/${handoff.id}/confirm`,token,{deliveredPrivately:true});assert.equal(q.status,200);console.log('Delivery recorded: PASS')
q=await request('POST',`/api/auth/users/pending-activation/${handoff.id}/issue`,token,{recipientVerified:true,reissue:true,reissueReason:'recipient lost credentials'});assert.equal(q.status,409);console.log('Delivered account cannot be silently rotated: PASS')
console.log('ALL PENDING ACTIVATION HTTP CHECKS PASS')
}finally{if(schoolId){await c.query('DELETE FROM portal_identity_handoffs WHERE school_id=$1',[schoolId]).catch(()=>{});await c.query('DELETE FROM users WHERE school_id=$1',[schoolId]).catch(()=>{});await c.query('DELETE FROM schools WHERE id=$1',[schoolId]).catch(()=>{})}c.release()}}
main().then(()=>process.exit(0)).catch(e=>{console.error('PENDING TEST FAILED:',e.message);process.exit(1)})
