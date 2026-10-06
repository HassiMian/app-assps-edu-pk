/**
 * Migration 009: Daily Diary persistent schema.
 * Removes schema mutation from request handlers and versions the diary table centrally.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_diaries (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL,
        template_id INTEGER NOT NULL DEFAULT 1,
        school_name VARCHAR(255) NOT NULL,
        tagline TEXT,
        logo_url TEXT,
        class_level VARCHAR(100),
        class_name VARCHAR(100),
        diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
        slips_per_page INTEGER NOT NULL DEFAULT 8,
        footer_text TEXT,
        footer_is_urdu BOOLEAN NOT NULL DEFAULT FALSE,
        rows JSONB NOT NULL DEFAULT '[]'::jsonb,
        style_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS school_id INTEGER;
      ALTER TABLE daily_diaries ALTER COLUMN school_id DROP DEFAULT;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS template_id INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS school_name VARCHAR(255);
      ALTER TABLE daily_diaries ALTER COLUMN school_name DROP DEFAULT;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS tagline TEXT;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS logo_url TEXT;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS class_level VARCHAR(100);
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS class_name VARCHAR(100);
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS diary_date DATE NOT NULL DEFAULT CURRENT_DATE;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS slips_per_page INTEGER NOT NULL DEFAULT 8;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS footer_text TEXT;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS footer_is_urdu BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS rows JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS style_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS created_by INTEGER;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE daily_diaries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
      CREATE INDEX IF NOT EXISTS daily_diaries_school_id_idx ON daily_diaries (school_id);
      CREATE INDEX IF NOT EXISTS daily_diaries_school_date_idx ON daily_diaries (school_id, diary_date DESC);
    `)
    // Tighten NOT NULL only when legacy rows already satisfy the invariant.
    await client.query('ALTER TABLE daily_diaries ALTER COLUMN school_id SET NOT NULL').catch(() => {})
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
