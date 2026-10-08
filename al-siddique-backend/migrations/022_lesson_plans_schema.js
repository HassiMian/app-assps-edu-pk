/**
 * Migration 022: Tenant-scoped Lesson Plan persistence.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_plans (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL,
        public_id VARCHAR(120) NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1,
        title TEXT,
        subject VARCHAR(160),
        class_level VARCHAR(100),
        chapter TEXT,
        teacher VARCHAR(160),
        plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
        planning_scope VARCHAR(32) NOT NULL DEFAULT 'daily',
        plan_range_label TEXT,
        end_date DATE,
        period VARCHAR(64),
        duration INTEGER,
        sent_to_portal BOOLEAN NOT NULL DEFAULT FALSE,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (school_id, public_id)
      );
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS school_id INTEGER;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS public_id VARCHAR(120);
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS title TEXT;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS subject VARCHAR(160);
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS class_level VARCHAR(100);
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS chapter TEXT;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS teacher VARCHAR(160);
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS plan_date DATE NOT NULL DEFAULT CURRENT_DATE;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS planning_scope VARCHAR(32) NOT NULL DEFAULT 'daily';
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS plan_range_label TEXT;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS end_date DATE;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS period VARCHAR(64);
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS duration INTEGER;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS sent_to_portal BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS created_by INTEGER;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
      CREATE UNIQUE INDEX IF NOT EXISTS lesson_plans_school_public_id_uidx ON lesson_plans (school_id, public_id);
      CREATE INDEX IF NOT EXISTS lesson_plans_school_date_idx ON lesson_plans (school_id, plan_date DESC);
      CREATE INDEX IF NOT EXISTS lesson_plans_school_class_subject_idx ON lesson_plans (school_id, class_level, subject);
    `)
    await client.query('ALTER TABLE lesson_plans ALTER COLUMN school_id SET NOT NULL').catch(() => {})
    await client.query('ALTER TABLE lesson_plans ALTER COLUMN public_id SET NOT NULL').catch(() => {})
    await client.query('COMMIT')
    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

async function down() {
  return { success: true, message: 'NO_OP_DATA_PRESERVED' }
}

module.exports = { up, down }

if (require.main === module) {
  up().then(() => process.exit(0)).catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}
