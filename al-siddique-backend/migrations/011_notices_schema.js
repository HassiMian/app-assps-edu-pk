/**
 * Migration 011: school notices schema.
 * Keeps request handlers free of runtime DDL and preserves existing notice data.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        issued_by VARCHAR(255),
        recipient_type JSONB DEFAULT '[]'::jsonb,
        teacher_ids JSONB DEFAULT '[]'::jsonb,
        mentioned_teacher_ids JSONB DEFAULT '[]'::jsonb,
        template_key VARCHAR(100) DEFAULT 'custom',
        language VARCHAR(20) DEFAULT 'bilingual',
        content_english TEXT,
        content_urdu TEXT,
        priority VARCHAR(30) DEFAULT 'normal',
        is_pinned BOOLEAN DEFAULT FALSE,
        expires_at DATE,
        read_count INTEGER DEFAULT 0,
        total_recipients INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS school_id INTEGER;
      ALTER TABLE notices ALTER COLUMN school_id DROP DEFAULT;
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS mentioned_teacher_ids JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS template_key VARCHAR(100) DEFAULT 'custom';
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT 'bilingual';
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS content_english TEXT;
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS content_urdu TEXT;
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS priority VARCHAR(30) DEFAULT 'normal';
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS expires_at DATE;
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;
      ALTER TABLE notices ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;
      CREATE INDEX IF NOT EXISTS notices_school_created_idx ON notices (school_id, created_at DESC);
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
