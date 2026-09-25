/**
 * Migration 002: Attendance Integrity & Performance Indexes
 * Adds composite indexes for date queries and ensures unique constraint on (student_id, date)
 */
const { pool } = require('../src/config/database')

async function up() {
  try {
    console.log('Running migration 002: Attendance Integrity & Performance Indexes...')
    
    // Ensure unique constraint exists on (student_id, date)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_id_date_key'
        ) THEN
          ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date);
        END IF;
      END $$;
    `)

    // Create fast lookup index on (date, status)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_date_status 
      ON attendance (date, status);
    `)

    // Create fast student lookup index on (is_active, school_id)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_students_active_school 
      ON students (is_active, school_id);
    `)

    console.log('✅ Migration 002 completed successfully.')
    return { success: true }
  } catch (err) {
    console.error('❌ Migration 002 failed:', err.message)
    throw err
  }
}

module.exports = { up }

if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
