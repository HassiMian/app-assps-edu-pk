/**
 * Migration 013: core adjunct domains used by school operations.
 * Centralizes schemas for schools metadata, employee attendance, families,
 * grading, admissions, and subscription request form fields.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'basic';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '[]'::jsonb;
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_attendance (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        attendance_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('Present','Absent','Leave','Late')),
        note TEXT,
        marked_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, employee_id, attendance_date)
      );
      CREATE INDEX IF NOT EXISTS idx_employee_attendance_school_date ON employee_attendance (school_id, attendance_date, employee_id);
      CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee_date ON employee_attendance (employee_id, attendance_date DESC);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS family_groups (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        code VARCHAR(64) NOT NULL,
        father_name VARCHAR(180),
        phone VARCHAR(40),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, code)
      );
      CREATE INDEX IF NOT EXISTS idx_family_groups_school ON family_groups (school_id, created_at DESC);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS grade_settings (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        label VARCHAR(24) NOT NULL,
        min_percentage INTEGER NOT NULL CHECK (min_percentage BETWEEN 0 AND 100),
        max_percentage INTEGER NOT NULL CHECK (max_percentage BETWEEN 0 AND 100),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, label)
      );
      CREATE INDEX IF NOT EXISTS idx_grade_settings_school_order ON grade_settings (school_id, sort_order);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS admissions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        tenant_id VARCHAR(80),
        student_name VARCHAR(150),
        father_name VARCHAR(150),
        parent_phone VARCHAR(30),
        whatsapp_number VARCHAR(30),
        class_applying VARCHAR(80),
        gender VARCHAR(30),
        date_of_birth DATE,
        previous_school TEXT,
        message TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE admissions ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
      ALTER TABLE admissions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(80);
      CREATE INDEX IF NOT EXISTS idx_admissions_school_created ON admissions(school_id, created_at DESC);
    `)

    await client.query(`
      ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS plan_id VARCHAR(80);
      ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS plan_name VARCHAR(100);
      ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS plan_price INTEGER;
    `)

    await client.query('COMMIT')
    return { success: true }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

async function down() {
  return { success: true, message: 'NO_OP_DATA_PRESERVED' }
}

module.exports = { up, down }

if (require.main === module) {
  up().then(() => process.exit(0)).catch(err => {
    console.error(err.message)
    process.exit(1)
  })
}
