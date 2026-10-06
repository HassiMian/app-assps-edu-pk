/**
 * Migration 005: tenant-backed operational domains introduced during the SaaS architecture hardening pass.
 *
 * Moves Transport, Library and Date Sheets away from browser-only/demo state and adds durable
 * notification archive state. All tables are school scoped and indexed for tenant-safe reads.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS transport_routes (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        name VARCHAR(160) NOT NULL,
        vehicle VARCHAR(160) NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
        status VARCHAR(32) NOT NULL DEFAULT 'Active',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_transport_routes_school ON transport_routes (school_id, name);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS library_books (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        title VARCHAR(220) NOT NULL,
        author VARCHAR(180) NOT NULL,
        category VARCHAR(60) NOT NULL,
        available BOOLEAN NOT NULL DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_library_books_school_title ON library_books (school_id, title);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS date_sheet_records (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        session VARCHAR(80) NOT NULL,
        term VARCHAR(120) NOT NULL,
        class_level VARCHAR(80) NOT NULL,
        section VARCHAR(80) NOT NULL DEFAULT '',
        exam_date DATE NOT NULL,
        day_label VARCHAR(32),
        times JSONB NOT NULL DEFAULT '[]'::jsonb,
        subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_date_sheet_school_session_term
        ON date_sheet_records (school_id, session, term, exam_date, class_level);
    `)

    await client.query(`
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_notification_log_school_archive_sent
        ON notification_log (school_id, archived_at, sent_at DESC);
    `).catch(err => {
      // notification_log can be created by an older deployment later in bootstrap; do not lose the domain tables.
      if (err?.code !== '42P01') throw err
    })

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
  // Destructive rollback is intentionally disabled because these tables contain live school records.
  return { success: true, message: 'NO_OP_DATA_PRESERVED' }
}

module.exports = { up, down }

if (require.main === module) {
  up().then(() => process.exit(0)).catch(err => {
    console.error(err.message)
    process.exit(1)
  })
}
