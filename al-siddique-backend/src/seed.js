// seed.js — Al Siddique Smart School OS
require('dotenv').config()
const { pool } = require('./config/database')
const bcrypt = require('bcryptjs')

async function seed() {
  console.log('\n🚀 Seeding Dummy Data...\n')
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // ── 1. Clear existing data (optional, but safer for re-seeding) ────────────────
    // await client.query('TRUNCATE students, attendance, fee_challans, exams, exam_results, employees RESTART IDENTITY CASCADE')

    // ── 2. Users ──────────────────────────────────────────────────────────────
    const hash = await bcrypt.hash('admin123', 10)
    const teacherHash = await bcrypt.hash('teacher123', 10)
    
    const adminRes = await client.query(`
      INSERT INTO users (name, email, password, role, designation)
      VALUES ('Haseeb Arshad', 'admin@alsiddique.edu.pk', $1, 'admin', 'Principal')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [hash])
    const adminId = adminRes.rows[0].id

    await client.query(`
      INSERT INTO users (name, email, password, role, designation)
      VALUES ('Sarah Khan', 'teacher@alsiddique.edu.pk', $1, 'teacher', 'Senior Teacher')
      ON CONFLICT (email) DO NOTHING
    `, [teacherHash])

    // ── 3. Students ───────────────────────────────────────────────────────────
    const students = [
      ['GR-101', 'Zaid Ahmed', 'Ahmed Ali', '9', 'A', '1', '03001234501'],
      ['GR-102', 'Ayesha Noor', 'Noor Muhammad', '9', 'A', '2', '03001234502'],
      ['GR-103', 'Bilal Hassan', 'Hassan Raza', '9', 'B', '1', '03001234503'],
      ['GR-104', 'Esha Fatima', 'Fatima Zahra', '10', 'A', '1', '03001234504'],
      ['GR-105', 'Hamza Tariq', 'Tariq Mehmood', '10', 'A', '2', '03001234505'],
      ['GR-106', 'Musa Khan', 'Imran Khan', '8', 'A', '1', '03001234506'],
      ['GR-107', 'Zainab Bibi', 'Abid Ali', '8', 'A', '2', '03001234507'],
      ['GR-108', 'Umar Farooq', 'Farooq Ahmed', '7', 'A', '1', '03001234508'],
      ['GR-109', 'Sana Gull', 'Gull Ahmed', '7', 'A', '2', '03001234509'],
      ['GR-110', 'Ali Raza', 'Raza Hussain', '6', 'A', '1', '03001234510'],
    ]

    const studentIds = []
    for (const s of students) {
      const res = await client.query(`
        INSERT INTO students (gr_number, name, father_name, class, section, roll_number, parent_phone)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (gr_number) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, s)
      studentIds.push(res.rows[0].id)
    }
    console.log(`✅ ${studentIds.length} Students added!`)

    // ── 4. Attendance (Last 5 days) ───────────────────────────────────────────
    const statuses = ['present', 'present', 'present', 'present', 'absent', 'late']
    for (let i = 0; i < 5; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      for (const sid of studentIds) {
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        await client.query(`
          INSERT INTO attendance (student_id, date, status, marked_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (student_id, date) DO NOTHING
        `, [sid, dateStr, status, adminId])
      }
    }
    console.log('✅ Attendance records created!')

    // ── 5. Fee Challans (Current Month) ──────────────────────────────────────
    const month = new Date().toLocaleString('default', { month: 'long' })
    const year = new Date().getFullYear()
    for (const sid of studentIds) {
      const amount = 2500 + (Math.floor(Math.random() * 5) * 100)
      const status = Math.random() > 0.3 ? 'paid' : 'unpaid'
      const challanNo = `CH-${sid}-${Date.now().toString().slice(-4)}`
      
      await client.query(`
        INSERT INTO fee_challans (challan_no, student_id, month, year, amount, paid_amount, status, due_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [challanNo, sid, month, year, amount, status === 'paid' ? amount : 0, status, '2026-05-15'])
    }
    console.log('✅ Fee challans created!')

    // ── 6. Exams & Results ───────────────────────────────────────────────────
    const examRes = await client.query(`
      INSERT INTO exams (name, type, class, session, total_marks, pass_marks, created_by)
      VALUES ('First Term 2026', 'TE', '9', '2026-27', 100, 33, $1)
      RETURNING id
    `, [adminId])
    const examId = examRes.rows[0].id

    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'English', 'Urdu']
    for (const sid of studentIds) {
      // Only for class 9 (the first 3 students)
      const studentClass = students.find(s => s[0].includes(sid))?.[3] 
      // Simplified: just do for first few
      if (sid <= studentIds[2]) {
        for (const sub of subjects) {
          const marks = 40 + Math.floor(Math.random() * 55)
          const grade = marks > 80 ? 'A+' : marks > 70 ? 'A' : marks > 60 ? 'B' : 'C'
          await client.query(`
            INSERT INTO exam_results (exam_id, student_id, subject, marks_obtained, total_marks, grade)
            VALUES ($1, $2, $3, $4, 100, $5)
            ON CONFLICT DO NOTHING
          `, [examId, sid, sub, marks, grade])
        }
      }
    }
    console.log('✅ Exam results created!')

    // ── 7. Employees ──────────────────────────────────────────────────────────
    const employees = [
      ['EMP-001', 'Kamran Akmal', 'Senior Teacher', 'Science', '03123456789', 45000],
      ['EMP-002', 'Nabeel Ahmed', 'Accountant', 'Accounts', '03123456788', 35000],
      ['EMP-003', 'Sajid Ali', 'Clerk', 'Admin', '03123456787', 25000],
      ['EMP-004', 'Maria Bibi', 'Teacher', 'Urdu', '03123456786', 30000],
    ]
    for (const e of employees) {
      await client.query(`
        INSERT INTO employees (emp_id, name, designation, department, phone, salary)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (emp_id) DO NOTHING
      `, e)
    }
    console.log('✅ Employees added!')

    await client.query('COMMIT')
    console.log('\n🌟 Seeding Completed Successfully! 🌟\n')
    process.exit(0)

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('\n❌ Seeding Failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
  }
}

seed()