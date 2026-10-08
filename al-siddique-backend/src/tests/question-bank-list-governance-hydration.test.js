const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const http = require('node:http')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/database')
const router = require('../routes/questionBankRoutes')

let server
function get(port,path,token){
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port,path:'/api/question-bank'+path,method:'GET',headers:{authorization:`Bearer ${token}`}},res=>{
   let raw='';res.on('data',c=>raw+=c);res.on('end',()=>{let body={};try{body=raw?JSON.parse(raw):{}}catch{}resolve({status:res.statusCode,body,raw})})
  });req.on('error',reject);req.end()
 })
}

test('Question Bank list hydrates governance identity, lifecycle and current revision',{timeout:30000},async()=>{
 const fixture=(await pool.query(`
  SELECT q.id,q.school_id,q.class_level,q.subject,qm.public_id,qm.lifecycle_status,qm.current_revision
    FROM question_bank q
    JOIN question_masters qm ON qm.school_id=q.school_id AND qm.source_question_bank_id::text=q.id::text
   ORDER BY q.id LIMIT 1
 `)).rows[0]
 assert.ok(fixture,'clone must contain at least one governed legacy question')
 const user=(await pool.query(`SELECT id,email FROM users WHERE school_id=$1 AND role IN ('admin','school_admin','principal','super_admin') AND is_active=true ORDER BY id LIMIT 1`,[fixture.school_id])).rows[0]
 assert.ok(user?.email,'fixture school must have an active manager')
 const token=jwt.sign({id:user.id,email:user.email},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'5m'})
 const app=express();app.use(express.json());app.use('/api/question-bank',router);server=app.listen(0)
 const port=server.address().port
 const path=`?classLevel=${encodeURIComponent(fixture.class_level||'')}&subject=${encodeURIComponent(fixture.subject||'')}&limit=200&offset=0`
 const r=await get(port,path,token)
 assert.equal(r.status,200,r.raw)
 const row=(r.body.data||[]).find(item=>String(item.id)===String(fixture.id))
 assert.ok(row,`governed fixture ${fixture.id} must appear in filtered list`)
 assert.equal(row.governance_public_id,fixture.public_id)
 assert.equal(row.governance_lifecycle_status,fixture.lifecycle_status)
 assert.equal(Number(row.governance_revision),Number(fixture.current_revision))
 console.log('QUESTION_BANK_LIST_GOVERNANCE_HYDRATION 3/3 PASS')
})

after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool.end()})
