require('dotenv').config()
const assert=require('node:assert/strict')
const http=require('node:http')
const crypto=require('node:crypto')
const jwt=require('jsonwebtoken')
const {pool}=require('../config/database')
const base='http://127.0.0.1:5000'
function httpReq(method,path,token,body) { return new Promise((resolve,reject)=>{
 const u=new URL(path,base); const input=body?JSON.stringify(body):null
 const req=http.request({hostname:u.hostname,port:u.port,path:u.pathname+u.search,method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}), 'Content-Type':'application/json', ...(input?{'Content-Length':Buffer.byteLength(input)}:{})}},res=>{let raw='';res.on('data',c=>raw+=c);res.on('end',()=>{let j={};try{j=JSON.parse(raw)}catch{}resolve({status:res.statusCode,body:j,headers:res.headers})})});req.on('error',reject);if(input)req.write(input);req.end()
})}
async function run(){
 let schoolId=null
 const runId=crypto.randomBytes(4).toString('hex'); const tenant=`idgate${runId}`; const c=await pool.connect()
 try {
  let r=await c.query("INSERT INTO schools (name,code,status,tenant_id) VALUES ('Identity Gate Test',$1,'active',$1) RETURNING id",[tenant]);schoolId=r.rows[0].id
  const email=`admin-${runId}@invalid.test`
  r=await c.query("INSERT INTO users(school_id,tenant_id,name,email,password,role,is_active) VALUES ($1,$2,'Test Admin',$3,'unused_hash','admin',true) RETURNING id",[schoolId,tenant,email]);const adminId=r.rows[0].id
  r=await c.query("INSERT INTO students(school_id,tenant_id,gr_number,name,class,section,is_active) VALUES ($1,$2,$3,'Synthetic Child','1','A',true) RETURNING id",[schoolId,tenant,`GR-${runId}`]);const studentId=r.rows[0].id
  r=await c.query("INSERT INTO employees(school_id,tenant_id,emp_id,name,designation,is_active) VALUES ($1,$2,$3,'Synthetic Teacher','Teacher',true) RETURNING id",[schoolId,tenant,`EMP-${runId}`]);const teacherId=r.rows[0].id
  const token=jwt.sign({id:adminId,email,role:'admin'},process.env.JWT_SECRET,{expiresIn:'5m'})
  let t=await httpReq('GET','/api/auth/users/missing-portal-links',token);assert.equal(t.status,200);assert.equal(t.body.data.students.length,1);assert.equal(t.body.data.teachers.length,1);assert.equal(t.body.data.students[0].requires_guardian_contact,true)
  console.log('G1 missing list and guardian flag: PASS')
  t=await httpReq('POST','/api/auth/users/provision-one',token,{kind:'student',entityId:studentId});assert.equal(t.status,409);console.log('G2 no-contact issuance rejected: PASS')
  t=await httpReq('PATCH','/api/auth/users/guardian-contact',token,{studentId,phone:'03001234567',verified:false});assert.equal(t.status,400)
  t=await httpReq('PATCH','/api/auth/users/guardian-contact',token,{studentId,phone:'03001234567',verified:true});assert.equal(t.status,200);console.log('G3 verification confirmation mandatory: PASS')
  t=await httpReq('POST','/api/auth/users/provision-one',token,{kind:'student',entityId:studentId});assert.equal(t.status,200,JSON.stringify({status:t.status,message:t.body.message}));assert.equal(t.body.issued.length,2);assert.ok(t.body.issued.every(x=>x.created&&x.temporaryPassword));assert.match(t.headers['cache-control']||'',/no-store/)
  const studentIssued=t.body.issued.find(x=>x.kind==='student');const parentIssued=t.body.issued.find(x=>x.kind==='parent')
  console.log('G4 atomic student+parent issuance, no-store: PASS')
  t=await httpReq('POST','/api/auth/users/provision-one',token,{kind:'student',entityId:studentId});assert.equal(t.status,409)
  t=await httpReq('POST','/api/auth/users/provision-one',token,{kind:'teacher',entityId:teacherId});assert.equal(t.status,200);assert.equal(t.body.issued.length,1);assert.ok(t.body.issued[0].temporaryPassword);console.log('G5 no duplicate, teacher issuance: PASS')
  const asStudent=await httpReq('POST','/api/auth/login',null,{email:studentIssued.loginId,password:studentIssued.temporaryPassword,role:'student',school_code:tenant});assert.equal(asStudent.status,200,JSON.stringify({status:asStudent.status,message:asStudent.body.message}));assert.equal(asStudent.body.user.role,'student')
  const wrongRole=await httpReq('POST','/api/auth/login',null,{email:studentIssued.loginId,password:studentIssued.temporaryPassword,role:'parent',school_code:tenant});assert.notEqual(wrongRole.status,200)
  const asParent=await httpReq('POST','/api/auth/login',null,{email:parentIssued.loginId,password:parentIssued.temporaryPassword,role:'parent',school_code:tenant});assert.equal(asParent.status,200,JSON.stringify({status:asParent.status,message:asParent.body.message}));assert.equal(asParent.body.user.role,'parent')
  console.log('G6 real login valid role succeeds, wrong role denied: PASS')
  t=await httpReq('GET','/api/auth/users/reconciliation',token);assert.equal(t.status,200);assert.equal(t.body.data.missing_student,0);assert.equal(t.body.data.missing_parent,0);assert.equal(t.body.data.missing_teacher,0);console.log('G7 reconciliation clears: PASS')
  console.log('ALL SYNTHETIC IDENTITY ISSUANCE GATES PASSED')
 }finally{
  if(schoolId){await c.query('DELETE FROM teacher_class_assignments WHERE school_id=$1',[schoolId]).catch(()=>{});await c.query('DELETE FROM attendance WHERE school_id=$1',[schoolId]).catch(()=>{});await c.query('DELETE FROM fee_challans WHERE school_id=$1',[schoolId]).catch(()=>{});await c.query('DELETE FROM students WHERE school_id=$1',[schoolId]).catch(()=>{});await c.query('DELETE FROM employees WHERE school_id=$1',[schoolId]).catch(()=>{});await c.query('DELETE FROM users WHERE school_id=$1',[schoolId]).catch(()=>{});await c.query('DELETE FROM schools WHERE id=$1',[schoolId]).catch(()=>{})}
  c.release()
 }
}
run().then(()=>process.exit(0)).catch(e=>{console.error('ISSUANCE TEST FAILED',e.message);process.exit(1)})
