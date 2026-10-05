/**
 * Migration 004: Canonical Academic Setup transitional authority.
 *
 * Adds a tenant/school-scoped server-side academic_setup JSONB document to settings.
 * This is a compatibility bridge away from browser-local academic configuration.
 * A later normalized class/enrollment migration can consume this canonical document.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS academic_setup JSONB DEFAULT '{}'::jsonb")
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS settings_school_id_unique ON settings (school_id)')
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
  // Safe NO-OP: dropping the column could destroy school configuration.
  return { success: true, message: 'NO_OP_DATA_PRESERVED' }
}

module.exports = { up, down }

if (require.main === module) {
  up().then(() => process.exit(0)).catch(err => {
    console.error(err.message)
    process.exit(1)
  })
}
