/**
 * Migration 018: truthful notification provider/delivery states.
 * Provider acceptance is not final delivery, so notification_log must preserve
 * accepted/queued/sent/delivered/failed/undelivered as distinct states.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      ALTER TABLE notification_log
        DROP CONSTRAINT IF EXISTS notification_log_status_check;

      ALTER TABLE notification_log
        ALTER COLUMN status TYPE VARCHAR(20),
        ALTER COLUMN status SET DEFAULT 'pending';

      ALTER TABLE notification_log
        ADD CONSTRAINT notification_log_status_check
        CHECK (status IN ('pending','accepted','queued','sent','delivered','failed','undelivered'));
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
