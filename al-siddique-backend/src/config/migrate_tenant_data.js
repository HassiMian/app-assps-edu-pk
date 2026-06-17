// src/config/migrate_tenant_data.js
// Safe multi-tenant database migration and seeding script
// Run: node src/config/migrate_tenant_data.js

const bcrypt = require('bcryptjs');
const { pool } = require('./database');

async function migrate() {
  console.log('\n🚀 Starting Strict Multi-Tenant Migration & Seeding...\n');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Setup Schools ────────────────────────────────────────────────────────
    console.log('Setting up schools...');
    // Real School (id: 1)
    await client.query(`
      INSERT INTO schools (id, name, code, status, subscription_plan, feature_flags)
      VALUES (1, 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL', 'default', 'active', 'basic', '["paper_generator", "ai_analytics", "attendance_qr", "fees_view", "employees"]')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = COALESCE(schools.code, EXCLUDED.code),
        status = EXCLUDED.status;
    `);

    // Demo School (id: 2)
    await client.query(`
      INSERT INTO schools (id, name, code, status, subscription_plan, feature_flags)
      VALUES (2, 'Demo School', 'demo', 'active', 'basic', '["paper_generator", "ai_analytics", "attendance_qr", "fees_view", "employees"]')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = COALESCE(schools.code, EXCLUDED.code),
        status = EXCLUDED.status;
    `);
    console.log('✅ Schools table setup complete!');

    // ── 2. Setup Settings ────────────────────────────────────────────────────────
    console.log('Setting up settings...');
    // Real School settings (school_id: 1)
    await client.query(`
      INSERT INTO settings (school_id, school_name, school_address, school_phone, school_email, principal_name, academic_year, fee_due_date, attendance_threshold)
      VALUES (1, 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL', 'Sharif Chowk, Rayya Khas, Narowal, Punjab, Pakistan', '03001291959', 'info@assps.edu.pk', 'Muhammad Haseeb Arshad', '2026', '10', '75')
      ON CONFLICT (school_id) DO NOTHING;
    `);

    // Demo School settings (school_id: 2)
    await client.query(`
      INSERT INTO settings (school_id, school_name, school_address, school_phone, school_email, principal_name, academic_year, fee_due_date, attendance_threshold)
      VALUES (2, 'Demo School', '123 Demo Street, Virtual Campus', '03001234567', 'demo@assps.edu.pk', 'Demo Principal', '2026', '15', '75')
      ON CONFLICT (school_id) DO NOTHING;
    `);
    console.log('✅ Settings setup complete!');

    // ── 3. Secure Real Data Ownership ───────────────────────────────────────────
    console.log('Securing real data ownership (school_id = 1)...');
    const dataTables = [
      'students', 'attendance', 'fee_challans', 'exams', 'exam_results', 
      'employees', 'notification_log', 'online_classes', 'timetable', 'events', 'cards'
    ];

    for (const table of dataTables) {
      try {
        const updateRes = await client.query(`
          UPDATE ${table} 
          SET school_id = 1 
          WHERE school_id IS NULL OR school_id = 0;
        `);
        console.log(`  Table ${table}: Assigned ${updateRes.rowCount} rows to school_id = 1`);
      } catch (err) {
        console.log(`  Table ${table} UPDATE skipped/failed: ${err.message}`);
      }
    }
    console.log('✅ Real data secured under school_id = 1!');

    // ── 4. Setup Target Users ───────────────────────────────────────────────────
    console.log('Setting up secure user accounts...');
    const adminHash = await bcrypt.hash('admin123', 10);
    const demoHash = await bcrypt.hash('Demo@12345', 10);

    // Create info@assps.edu.pk for Real School (school_id: 1)
    await client.query(`
      INSERT INTO users (name, email, password, role, designation, school_id, is_active)
      VALUES ('Muhammad Haseeb Arshad', 'info@assps.edu.pk', $1, 'admin', 'Principal', 1, true)
      ON CONFLICT (email) DO UPDATE SET
        school_id = 1,
        role = 'admin',
        is_active = true;
    `, [adminHash]);

    // Create demo@assps.edu.pk for Demo School (school_id: 2)
    await client.query(`
      INSERT INTO users (name, email, password, role, designation, school_id, is_active)
      VALUES ('Demo Admin', 'demo@assps.edu.pk', $1, 'admin', 'Demo Principal', 2, true)
      ON CONFLICT (email) DO UPDATE SET
        school_id = 2,
        role = 'admin',
        is_active = true;
    `, [demoHash]);
    console.log('✅ Target users created/updated!');

    // ── 5. Seed Isolated Sample Data under school_id = 2 ────────────────────────
    console.log('Checking existing demo data...');
    const demoStudentCheck = await client.query('SELECT id FROM students WHERE school_id = 2 LIMIT 1');
    
    if (demoStudentCheck.rows.length === 0) {
      console.log('Seeding fresh sample data under school_id = 2...');
      
      // Get the demo admin ID
      const demoAdminRes = await client.query("SELECT id FROM users WHERE email = 'demo@assps.edu.pk' LIMIT 1");
      const demoAdminId = demoAdminRes.rows[0].id;

      // Seed Students (school_id = 2)
      const demoStudents = [
        ['DEMO-101', 'Zainab Ahmed', 'Ahmed Ali', '9', 'A', '1', '03001234501', 2],
        ['DEMO-102', 'Hamza Noor', 'Noor Muhammad', '9', 'A', '2', '03001234502', 2],
        ['DEMO-103', 'Ali Hassan', 'Hassan Raza', '10', 'A', '1', '03001234503', 2],
      ];
      
      const seededStudentIds = [];
      for (const s of demoStudents) {
        const res = await client.query(`
          INSERT INTO students (gr_number, name, father_name, class, section, roll_number, parent_phone, school_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (gr_number) DO NOTHING
          RETURNING id
        `, s);
        if (res.rows[0]) seededStudentIds.push(res.rows[0].id);
      }
      console.log(`  Seeded ${seededStudentIds.length} demo students!`);

      // Seed Fee Challans (school_id = 2)
      for (let index = 0; index < seededStudentIds.length; index++) {
        const sid = seededStudentIds[index];
        const challanNo = `DEMO-CH-${sid}-${Date.now().toString().slice(-4)}`;
        await client.query(`
          INSERT INTO fee_challans (challan_no, student_id, month, year, amount, paid_amount, status, due_date, school_id)
          VALUES ($1, $2, 'May', 2026, 3000, 3000, 'paid', '2026-05-15', 2)
          ON CONFLICT DO NOTHING
        `, [challanNo, sid]);
      }
      console.log('  Seeded demo fee challans!');

      // Seed Employees (school_id = 2)
      const demoEmployees = [
        ['DEMO-EMP-01', 'Kashif Mahmood', 'Senior Teacher', 'Science', '03211234567', 40000, 2],
        ['DEMO-EMP-02', 'Saba Qureshi', 'Accountant', 'Accounts', '03211234568', 30000, 2]
      ];
      for (const e of demoEmployees) {
        await client.query(`
          INSERT INTO employees (emp_id, name, designation, department, phone, salary, school_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (emp_id) DO NOTHING
        `, e);
      }
      console.log('  Seeded demo employees!');

      // Seed Exam and Results (school_id = 2)
      const examRes = await client.query(`
        INSERT INTO exams (name, type, class, session, total_marks, pass_marks, created_by, school_id)
        VALUES ('Demo Monthly Test', 'TE', '9', '2026-27', 100, 33, $1, 2)
        RETURNING id
      `, [demoAdminId]);
      const examId = examRes.rows[0].id;

      if (seededStudentIds.length > 0) {
        await client.query(`
          INSERT INTO exam_results (exam_id, student_id, subject, marks_obtained, total_marks, grade, school_id)
          VALUES ($1, $2, 'Mathematics', 85, 100, 'A', 2)
          ON CONFLICT DO NOTHING
        `, [examId, seededStudentIds[0]]);
      }
      console.log('  Seeded demo exams & results!');
    } else {
      console.log('  Demo sample data is already seeded under school_id = 2.');
    }

    await client.query('COMMIT');
    console.log('\n🌟 Strict Multi-Tenant Migration & Seeding Successful! 🌟\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed. Rolling back all changes. Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate };
