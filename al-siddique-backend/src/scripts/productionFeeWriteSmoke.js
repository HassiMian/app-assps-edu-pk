const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const jwt = require('jsonwebtoken')
process.env.DB_STARTUP_PROBE = 'false'
const { pool } = require('../config/database')

const schoolId = Number(process.env.ASSPS_SMOKE_SCHOOL_ID || 0)
const baseUrl = String(process.env.ASSPS_SMOKE_BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')
const allowWrites = String(process.env.ASSPS_SMOKE_ALLOW_WRITES || '').toLowerCase() === 'true'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  assert(allowWrites, 'ASSPS_SMOKE_ALLOW_WRITES=true is required for the synthetic fee write smoke.')
  assert(Number.isInteger(schoolId) && schoolId > 0, 'ASSPS_SMOKE_SCHOOL_ID must be an explicit positive integer.')
  assert(process.env.JWT_SECRET, 'JWT_SECRET is required.')

  const client = await pool.connect()
  let studentId = null
  let challanId = null
  try {
    const userResult = await client.query(
      `SELECT id,email
         FROM users
        WHERE school_id=$1 AND is_active=true
          AND role IN ('principal','admin','school_admin')
        ORDER BY CASE role WHEN 'principal' THEN 0 ELSE 1 END, id
        LIMIT 1`,
      [schoolId],
    )
    assert(userResult.rowCount === 1, `No active leadership user found for school ${schoolId}.`)
    const user = userResult.rows[0]
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '2m' })
    const stamp = Date.now().toString(36).slice(-6).toUpperCase()

    const student = await client.query(
      `INSERT INTO students (school_id, gr_number, name, class, section)
       VALUES ($1,$2,'__FEE_WRITE_SMOKE__','Eight','Blue')
       RETURNING id`,
      [schoolId, `SMK${stamp}`],
    )
    studentId = student.rows[0].id

    const challan = await client.query(
      `INSERT INTO fee_challans (
        school_id, student_id, challan_no, month, year, amount, monthly_fee,
        previous_arrears, paid_amount, discount, gross_total, status
       ) VALUES ($1,$2,$3,'October',2026,100,100,0,0,0,100,'unpaid')
       RETURNING id`,
      [schoolId, studentId, `SMK-${stamp}`],
    )
    challanId = challan.rows[0].id

    const response = await fetch(`${baseUrl}/api/fees/${challanId}/pay`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paid_amount: 100,
        discount: 0,
        payment_mode: 'cash',
        payment_note: 'automated synthetic fee write smoke',
      }),
    })
    const body = await response.json().catch(() => null)
    assert(response.ok && body?.success === true, `Fee pay endpoint returned HTTP ${response.status}: ${body?.message || 'unknown error'}`)

    const verify = await client.query(
      `SELECT status, paid_amount, remaining_balance
         FROM fee_challans
        WHERE id=$1 AND school_id=$2`,
      [challanId, schoolId],
    )
    const ledger = await client.query(
      `SELECT amount, cumulative_paid, payment_mode
         FROM fee_payment_transactions
        WHERE challan_id=$1 AND school_id=$2`,
      [challanId, schoolId],
    )

    assert(verify.rowCount === 1, 'Synthetic challan disappeared before verification.')
    assert(String(verify.rows[0].status) === 'paid', 'Synthetic challan was not marked paid.')
    assert(Number(verify.rows[0].paid_amount) === 100, 'Synthetic challan paid_amount mismatch.')
    assert(Number(verify.rows[0].remaining_balance) === 0, 'Synthetic challan remaining balance mismatch.')
    assert(ledger.rowCount === 1, 'Synthetic payment ledger entry was not created.')

    console.log(`PRODUCTION_FEE_WRITE_SMOKE_PASS school=${schoolId}`)
  } finally {
    if (challanId) await client.query('DELETE FROM fee_payment_transactions WHERE challan_id=$1', [challanId]).catch(() => {})
    if (challanId) await client.query('DELETE FROM fee_challans WHERE id=$1', [challanId]).catch(() => {})
    if (studentId) await client.query('DELETE FROM students WHERE id=$1', [studentId]).catch(() => {})
    client.release()
  }
}

main().catch(err => {
  console.error(`PRODUCTION_FEE_WRITE_SMOKE_FAIL ${err.message}`)
  process.exitCode = 1
}).finally(async () => {
  await pool.end().catch(() => {})
})
