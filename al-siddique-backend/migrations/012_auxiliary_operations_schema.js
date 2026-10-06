/**
 * Migration 012: auxiliary operational domains (expenses, events, demo requests).
 * Removes runtime DDL from request handlers while preserving existing data.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        category VARCHAR(80) NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
        expense_date DATE NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_school_date ON expenses (school_id, expense_date DESC);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        title TEXT NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        event_type TEXT DEFAULT 'general',
        color TEXT DEFAULT 'gold',
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE events ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
      ALTER TABLE events ALTER COLUMN school_id DROP DEFAULT;
      CREATE INDEX IF NOT EXISTS idx_events_school_date ON events(school_id, event_date);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS demo_requests (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        school_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        phone VARCHAR(80) NOT NULL,
        email VARCHAR(255),
        city VARCHAR(120),
        students_count VARCHAR(80),
        message TEXT,
        status VARCHAR(40) NOT NULL DEFAULT 'pending_approval',
        reviewed_by INTEGER,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE demo_requests ALTER COLUMN school_id DROP DEFAULT;
      CREATE INDEX IF NOT EXISTS demo_requests_school_status_idx ON demo_requests (school_id, status, created_at DESC);
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
