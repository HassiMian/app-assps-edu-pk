'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { pool } = require('../config/database')
const { manageStudent } = require('../services/whatsapp/jarvisCognitiveTools')

const DB = 'assps_jarvis_provenance_qa_20261008'
const SCHOOL_ID = Number(process.env.WHATSAPP_SCHOOL_ID)
const tag = `ATOMIC_QA_${Date.now().toString(36)}`
const count = async () => {
  const r = await pool.query(`SELECT
    (SELECT count(*) FROM students WHERE school_id=$1 AND name LIKE $2) AS students,
    (SELECT count(*) FROM admissions WHERE school_id=$1 AND student_name LIKE $2) AS admissions`,[SCHOOL_ID,tag+'%'])
  return {students:Number(r.rows[0].students),admissions:Number(r.rows[0].admissions)}
}

test('isolated JARVIS admissions: access control, atomic failure, concurrency', { timeout:60000 }, async t => {
  // Hard fail before any mutation if DB is not explicitly disposable.
  const proof=await pool.query('SELECT current_database() AS db')
  assert.equal(proof.rows[0].db, DB)
  assert.ok(Number.isInteger(SCHOOL_ID) && SCHOOL_ID>0)
  const school=await pool.query('SELECT id FROM schools WHERE id=$1',[SCHOOL_ID])
  assert.equal(school.rowCount,1)
  t.after(async()=>{
    await pool.query('ALTER TABLE fee_challans DROP CONSTRAINT IF EXISTS qa_atomic_failure_20261008').catch(()=>{})
    await pool.end()
  })
  const denied=await manageStudent({action:'add',studentData:{name:tag+'DENIED'}},{role:'PUBLIC'})
  assert.equal(denied.success,false)
  assert.equal((await count()).students,0)

  const rejectedFee=await manageStudent({action:'add',studentData:{name:tag+'INVALID',monthly_fee:-12}},{role:'OWNER'})
  assert.equal(rejectedFee.success,false)
  assert.equal((await count()).students,0)

  // Postgres NOT VALID applies to future rows, not cloned historic fee challans.
  await pool.query('ALTER TABLE fee_challans ADD CONSTRAINT qa_atomic_failure_20261008 CHECK (amount < 0) NOT VALID')
  const rejected=await manageStudent({action:'add',studentData:{name:tag+'FAIL',father_name:'QA father',class:'Seven',monthly_fee:1000}},{role:'OWNER'})
  assert.equal(rejected.success,false)
  assert.deepEqual(await count(),{students:0,admissions:0},'failure must roll back both student and admission')
  await pool.query('ALTER TABLE fee_challans DROP CONSTRAINT qa_atomic_failure_20261008')

  const [first,second]=await Promise.all([
    manageStudent({action:'add',studentData:{name:tag+'ONE',father_name:'QA father',class:'Seven',monthly_fee:1200}},{role:'OWNER'}),
    manageStudent({action:'add',studentData:{name:tag+'TWO',father_name:'QA father',class:'Seven',monthly_fee:1300}},{role:'OWNER'}),
  ])
  assert.equal(first.success,true,first.error)
  assert.equal(second.success,true,second.error)
  assert.notEqual(first.gr_number,second.gr_number,'concurrent admissions require unique GR numbers')
  assert.notEqual(first.challan_no,second.challan_no,'concurrent admissions require unique challans')
  assert.deepEqual(await count(),{students:2,admissions:2})
  const rows=await pool.query('SELECT challan_no,month,year,amount FROM fee_challans WHERE school_id=$1 AND student_id = ANY($2::integer[]) ORDER BY id',[SCHOOL_ID,[first.student_id,second.student_id]])
  assert.equal(rows.rowCount,2)
  const month = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',month:'long'}).format(new Date())
  const year = Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',year:'numeric'}).format(new Date()))
  for(const row of rows.rows){assert.equal(row.month,month);assert.equal(row.year,year);assert.match(row.challan_no,/^CH-\d+$/)}
  console.log('JARVIS_ISOLATED_ADMISSION_ATOMICITY_AND_ACCESS_PASS')
})
