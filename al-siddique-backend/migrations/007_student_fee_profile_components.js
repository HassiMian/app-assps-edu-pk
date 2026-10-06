/**
 * Migration 007: preserve the complete student fee profile contract.
 * Adds component columns already accepted by admission/student workflows so values are not silently dropped.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_fee_profiles (
        student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
        school_id INTEGER REFERENCES schools(id),
        monthly_fee DECIMAL(10,2) DEFAULT 0,
        tuition_fee DECIMAL(10,2) DEFAULT 0,
        computer_fee DECIMAL(10,2) DEFAULT 0,
        lab_fee DECIMAL(10,2) DEFAULT 0,
        admission_fee DECIMAL(10,2) DEFAULT 0,
        registration_fee DECIMAL(10,2) DEFAULT 0,
        library_fee DECIMAL(10,2) DEFAULT 0,
        transport_fee DECIMAL(10,2) DEFAULT 0,
        exam_fee DECIMAL(10,2) DEFAULT 0,
        other_charges DECIMAL(10,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE student_fee_profiles
        ADD COLUMN IF NOT EXISTS tuition_fee DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS computer_fee DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS lab_fee DECIMAL(10,2) DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_student_fee_profiles_school ON student_fee_profiles(school_id);
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
