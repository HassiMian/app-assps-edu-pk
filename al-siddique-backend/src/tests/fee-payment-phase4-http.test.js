'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const http=require('node:http')
const bcrypt=require('bcryptjs')
const {pool}=require('../config/database')
const PORT=Number(process.env.STAGE_API_PORT || 5483)
const DB='assps_qbank_intake_stage_phase4_20261008'
function request(path,{method='GET',body,cookie=''}={}) {
 return new Promise((resolve,reject)=>{
  const bytes=body?Buffer.from(JSON.stringify(body)):null
  const req=http.request({host:'127.0.0.1',port:PORT,path,method,timeout:8000,headers:{
   Host:'api.assps.edu.pk','Content-Type':'application/json',
   ...(cookie?{Cookie:cookie}:{}),...(bytes?{'Content-Length':bytes.length}:{})
  }},res=>{
   let chunks=[];res.on('data',d=>chunks.push(d))
   res.on('end',()=>{const raw=Buffer.concat(chunks).toString();let payload=null;try{payload=JSON.parse(raw)}catch{}resolve({status:res.statusCode,body:payload,raw,headers:res.headers})})
  })
  req.on('error',reject);if(bytes)req.write(bytes);req.end()
 })
}
test('isolated authenticated fee payments preserve append-only ledger, reject invalid and foreign challans',{timeout:90000},async t=>{
 assert.equal(process.env.NODE_ENV,'test')
 assert.equal(process.env.DB_NAME,DB,'never run this test on production')
 assert.notEqual(PORT,5000)
 assert.equal((await pool.query('SELECT current_database() db')).rows[0].db,DB)
 const school=(await pool.query('SELECT id,code FROM schools WHERE id=1')).rows[0]
 assert.equal(school.code,'assps')
 const challan=(await pool.query('SELECT id,school_id,amount,paid_amount,discount,gross_total FROM fee_challans WHERE school_id=$1 AND COALESCE(paid_amount,0)=0 AND COALESCE(gross_total,amount)>500 ORDER BY id DESC LIMIT 1',[school.id])).rows[0]
 assert.ok(challan?.id)
 const foreign=(await pool.query('SELECT id FROM fee_challans WHERE school_id != $1 LIMIT 1',[school.id])).rows[0]
 assert.ok(foreign?.id)
 const suffix=crypto.randomBytes(6).toString('hex')
 const email='phase4-pay-'+suffix+'@example.invalid',password=crypto.randomBytes(19).toString('base64url')
 const hashed=await bcrypt.hash(password,10)
 const userId=(await pool.query("INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active,must_change_password,permissions) VALUES($1,$2,'Phase 4 Fee QA',$3,'admin',$4,true,false,'[]'::jsonb) RETURNING id",[school.id,school.code,email,hashed])).rows[0].id
 t.after(async()=>{await pool.query('DELETE FROM users WHERE id=$1',[userId]).catch(()=>{});await pool.end().catch(()=>{})})
 const login=await request('/api/auth/login',{method:'POST',body:{email,password,role:'admin',school_code:school.code}})
 assert.equal(login.status,200,'real isolated admin login should succeed')
 const cookie=(login.headers['set-cookie']||[]).map(x=>x.split(';')[0]).join('; ')
 assert.ok(cookie)
 const path='/api/fees/'+challan.id+'/pay'
 const baseline=(await pool.query('SELECT COUNT(*)::int n FROM fee_payment_transactions WHERE challan_id=$1',[challan.id])).rows[0].n
 const pay1=await request(path,{method:'PUT',cookie,body:{paid_amount:100,payment_mode:'cash',discount:0}})
 assert.equal(pay1.status,200,JSON.stringify(pay1.body))
 assert.equal(Number(pay1.body.payment_increment),100)
 assert.equal(Number(pay1.body.data.paid_amount),100)
 const pay2=await request(path,{method:'PUT',cookie,body:{paid_amount:250,payment_mode:'bank',discount:0}})
 assert.equal(pay2.status,200,JSON.stringify(pay2.body))
 assert.equal(Number(pay2.body.payment_increment),150)
 const replay=await request(path,{method:'PUT',cookie,body:{paid_amount:250,payment_mode:'bank',discount:0}})
 assert.equal(replay.status,200)
 assert.equal(Number(replay.body.payment_increment),0)
 const lower=await request(path,{method:'PUT',cookie,body:{paid_amount:10,payment_mode:'cash',discount:0}})
 assert.equal(lower.status,422)
 const excessive=await request(path,{method:'PUT',cookie,body:{paid_amount:999999,payment_mode:'cash',discount:0}})
 assert.equal(excessive.status,422)
 const invalid=await request(path,{method:'PUT',cookie,body:{paid_amount:-5,payment_mode:'cash'}})
 assert.equal(invalid.status,422)
 const foreignPay=await request('/api/fees/'+foreign.id+'/pay',{method:'PUT',cookie,body:{paid_amount:100,payment_mode:'cash'}})
 assert.equal(foreignPay.status,404)
 const ledger=(await pool.query('SELECT amount,cumulative_paid FROM fee_payment_transactions WHERE challan_id=$1 ORDER BY id DESC LIMIT 2',[challan.id])).rows
 assert.equal((await pool.query('SELECT COUNT(*)::int n FROM fee_payment_transactions WHERE challan_id=$1',[challan.id])).rows[0].n-baseline,2)
 assert.deepEqual(ledger.map(x=>Number(x.amount)),[150,100])
 assert.deepEqual(ledger.map(x=>Number(x.cumulative_paid)),[250,100])
 const state=(await pool.query('SELECT paid_amount,remaining_balance FROM fee_challans WHERE id=$1',[challan.id])).rows[0]
 assert.equal(Number(state.paid_amount),250)
 assert.ok(Number(state.remaining_balance)>=0)
 console.log('PHASE4_ISOLATED_FEE_PAYMENT_LEDGER_AND_TENANT_GATE_PASS')
})
