/**
 * Migration 008: portal classroom + notification schema ownership.
 * Keeps request handlers read/write-only by versioning their supporting schema here.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS online_classes (
        id            SERIAL PRIMARY KEY,
        school_id     INTEGER REFERENCES schools(id),
        teacher_id    INTEGER REFERENCES users(id),
        class_name    VARCHAR(50) NOT NULL,
        section       VARCHAR(20),
        subject       VARCHAR(100) NOT NULL,
        title         VARCHAR(255) NOT NULL,
        class_date    DATE NOT NULL,
        start_time    TIME NOT NULL,
        end_time      TIME NOT NULL,
        meeting_link  TEXT NOT NULL,
        description   TEXT,
        timezone      VARCHAR(64) DEFAULT 'Asia/Karachi',
        created_at    TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE online_classes ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
      ALTER TABLE online_classes ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id);
      ALTER TABLE online_classes ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Asia/Karachi';
      ALTER TABLE online_classes ALTER COLUMN school_id DROP DEFAULT;
      CREATE INDEX IF NOT EXISTS idx_online_classes_school_date ON online_classes(school_id, class_date);
      CREATE INDEX IF NOT EXISTS idx_online_classes_teacher_date ON online_classes(teacher_id, class_date);
    `)

    await client.query(`
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(20);
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS title VARCHAR(255);
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS provider_sid VARCHAR(128);
      ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_notification_log_school_role_sent ON notification_log(school_id, recipient_role, sent_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notification_log_school_archive_sent ON notification_log(school_id, archived_at, sent_at DESC);
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
