/**
 * Migration 019: teacher assignment scope schema.
 * Runtime request/services may validate this schema, but must never create or
 * mutate it on demand.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_class_assignments (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        class_name VARCHAR(100) NOT NULL,
        section VARCHAR(50),
        subject VARCHAR(120),
        source VARCHAR(40) NOT NULL DEFAULT 'manual',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher
        ON teacher_class_assignments(school_id, teacher_user_id, is_active);

      CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class
        ON teacher_class_assignments(school_id, class_name, section, is_active);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_assignment_scope
        ON teacher_class_assignments(
          school_id,
          teacher_user_id,
          LOWER(class_name),
          LOWER(COALESCE(section,'')),
          LOWER(COALESCE(subject,''))
        );
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
