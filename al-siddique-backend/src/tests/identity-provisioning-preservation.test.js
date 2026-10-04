require('dotenv').config()
const assert = require('node:assert/strict')
const {pool} = require('../config/database')
const {provisionStudentIdentities} = require('../services/portalIdentityService')

async function run() {
 const db = await pool.connect()
 try {
  await db.query('BEGIN')
  const code = `ir${Date.now()}`
  const {rows:[school]} = await db.query("INSERT INTO schools(name,code,status,tenant_id) VALUES ('Isolated identity test',$1,'active',$1) RETURNING id",[code])
  const {rows:[parent]} = await db.query("INSERT INTO users(school_id,tenant_id,name,email,username,password,role,is_active) VALUES ($1,$2,'Test guardian',$3,'testguardian','unchanged-hash','parent',true) RETURNING id",[school.id,code,`guardian-${code}@invalid.example`])
  const {rows:[student]} = await db.query("INSERT INTO students(school_id,tenant_id,gr_number,name,class,section,is_active,parent_user_id) VALUES ($1,$2,$3,'Test child','1','A',true,$4) RETURNING *",[school.id,code,`GR-${code}`,parent.id])
  const first = await provisionStudentIdentities(db,{schoolId:school.id,student})
  assert.equal(first.parent.userId,parent.id)
  assert.equal(first.parent.created,false)
  assert.equal(first.parent.temporaryPassword,null)
  assert.equal(first.student.created,true)
  assert.ok(first.student.userId)
  const {rows:[linked]} = await db.query('SELECT * FROM students WHERE id=$1',[student.id])
  assert.equal(linked.parent_user_id,parent.id)
  assert.equal(linked.student_user_id,first.student.userId)
  const second = await provisionStudentIdentities(db,{schoolId:school.id,student:linked})
  assert.equal(second.student.userId,first.student.userId)
  assert.equal(second.student.created,false)
  assert.equal(second.parent.userId,parent.id)
  const {rows:[guard]} = await db.query('SELECT password FROM users WHERE id=$1',[parent.id])
  assert.equal(guard.password,'unchanged-hash')
  const {rows:[counts]} = await db.query("SELECT COUNT(*)::int n FROM users WHERE school_id=$1 AND role='student'",[school.id])
  assert.equal(counts.n,1)
  console.log('Preserve existing parent, create one student, idempotent retry: PASS')
 } finally {
  await db.query('ROLLBACK').catch(()=>{})
  db.release()
 }
}
run().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1)})
