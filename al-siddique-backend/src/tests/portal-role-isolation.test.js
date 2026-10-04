require('dotenv').config()
const assert = require('assert')
const http = require('http')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/database')

const JWT_SECRET = process.env.JWT_SECRET
const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000'

function request(path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const req = http.request({
      method: 'GET', hostname: url.hostname, port: url.port,
      path: url.pathname + url.search,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }, (res) => {
      let raw = ''
      res.on('data', c => { raw += c })
      res.on('end', () => {
        let body = null
        try { body = JSON.parse(raw) } catch (_) {}
        resolve({ status: res.statusCode, body, raw })
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, school_id: user.school_id, tenant_id: user.tenant_id }, JWT_SECRET, { expiresIn: '10m' })
}

async function run() {
  assert.ok(JWT_SECRET, 'JWT_SECRET is required')
  const c = await pool.connect()
  const run = `${Date.now()}_${process.pid}`
  let schoolId
  const ids = { users: [], students: [] }
  try {
    const school = await c.query(`INSERT INTO schools (name, code, status, tenant_id) VALUES ($1,$2,'active',$2) RETURNING id`, [`Role Isolation ${run}`, `role_iso_${run}`])
    schoolId = school.rows[0].id

    async function addUser(role, suffix) {
      const r = await c.query(`INSERT INTO users (school_id,tenant_id,name,email,password,role,is_active) VALUES ($1,$2,$3,$4,'test_hash',$5,true) RETURNING id,email,role,school_id,tenant_id`, [schoolId, `role_iso_${run}`, `${role}-${suffix}`, `${role}-${suffix}-${run}@invalid.test`, role])
      ids.users.push(r.rows[0].id)
      return r.rows[0]
    }
    const studentA = await addUser('student','a')
    const studentB = await addUser('student','b')
    const parentA = await addUser('parent','a')
    const parentB = await addUser('parent','b')
    const teacherA = await addUser('teacher','a')
    const teacherB = await addUser('teacher','b')

    async function addStudent(label, cls, sec, su, pu) {
      const r = await c.query(`INSERT INTO students (school_id,tenant_id,gr_number,name,class,section,is_active,student_user_id,parent_user_id) VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8) RETURNING id`, [schoolId, `role_iso_${run}`, `GR-${label}-${run}`, `Student ${label}`, cls, sec, su.id, pu.id])
      ids.students.push(r.rows[0].id)
      return r.rows[0].id
    }
    const sA = await addStudent('A','1','A',studentA,parentA)
    const sB = await addStudent('B','2','B',studentB,parentB)

    await c.query(`INSERT INTO teacher_class_assignments (school_id,teacher_user_id,class_name,section,subject,is_active) VALUES ($1,$2,'1','A','English',true),($1,$3,'2','B','Math',true)`, [schoolId, teacherA.id, teacherB.id])
    const today = new Date().toISOString().slice(0,10)
    await c.query(`INSERT INTO attendance (school_id,tenant_id,student_id,date,status,marked_by) VALUES ($1,$2,$3,$5,'present',$6),($1,$2,$4,$5,'absent',$7)`, [schoolId, `role_iso_${run}`, sA, sB, today, teacherA.id, teacherB.id])
    await c.query(`INSERT INTO fee_challans (school_id,tenant_id,challan_no,student_id,month,year,amount,status) VALUES ($1,$2,$3,$4,'October',2026,1000,'unpaid'),($1,$2,$5,$6,'October',2026,2000,'unpaid')`, [schoolId, `role_iso_${run}`, `A-${process.pid}`, sA, `B-${process.pid}`, sB])

    const cases = [
      ['studentA', studentA, sA, sB, 1],
      ['parentA', parentA, sA, sB, 1],
      ['teacherA', teacherA, sA, sB, 1],
      ['teacherB', teacherB, sB, sA, 1],
    ]

    for (const [name, user, ownId, foreignId, expected] of cases) {
      const token = tokenFor(user)
      const students = await request('/api/students?active=true', token)
      assert.strictEqual(students.status, 200, `${name} students status`)
      const rows = students.body?.data || []
      assert.strictEqual(rows.length, expected, `${name} student scope count`)
      assert.ok(rows.some(x => x.id === ownId), `${name} must see own/assigned student`)
      assert.ok(!rows.some(x => x.id === foreignId), `${name} must not see foreign student`)

      const attendance = await request(`/api/attendance?date=${today}`, token)
      assert.strictEqual(attendance.status, 200, `${name} attendance status`)
      const attRows = attendance.body?.data || []
      assert.ok(attRows.some(x => x.student_id === ownId), `${name} attendance own scope`)
      assert.ok(!attRows.some(x => x.student_id === foreignId), `${name} attendance foreign scope`)

      const fees = await request('/api/fees', token)
      assert.strictEqual(fees.status, 200, `${name} fee status`)
      const feeRows = fees.body?.data || []
      if (user.role === 'student' || user.role === 'parent') {
        assert.ok(feeRows.some(x => x.student_id === ownId), `${name} fee own scope`)
        assert.ok(!feeRows.some(x => x.student_id === foreignId), `${name} fee foreign scope`)
      }
      console.log(`ROLE ${name}: PASS`)
    }

    const forged = await request('/api/students?class=2', tokenFor(studentA))
    assert.strictEqual(forged.status, 200)
    assert.strictEqual((forged.body?.data || []).length, 0, 'studentA class filter must not escape ownership scope')
    console.log('FORGED CLASS FILTER: PASS')
    console.log('ALL PORTAL ROLE ISOLATION TESTS PASSED')
  } finally {
    if (schoolId) {
      await c.query('DELETE FROM attendance WHERE school_id=$1', [schoolId]).catch(()=>{})
      await c.query('DELETE FROM fee_challans WHERE school_id=$1', [schoolId]).catch(()=>{})
      await c.query('DELETE FROM teacher_class_assignments WHERE school_id=$1', [schoolId]).catch(()=>{})
      await c.query('DELETE FROM students WHERE school_id=$1', [schoolId]).catch(()=>{})
      await c.query('DELETE FROM users WHERE school_id=$1', [schoolId]).catch(()=>{})
      await c.query('DELETE FROM schools WHERE id=$1', [schoolId]).catch(()=>{})
    }
    c.release()
  }
}

run().then(()=>process.exit(0)).catch(err=>{console.error('PORTAL ROLE ISOLATION FAILED:',err);process.exit(1)})
