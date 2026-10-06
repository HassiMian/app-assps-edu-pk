/**
 * Migration 016: employee portal-account linkage columns.
 * Makes staff portal provisioning explicit and removes partial writes caused by optional columns.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_username VARCHAR(160);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_role VARCHAR(40);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_permissions JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_password TEXT;
      CREATE INDEX IF NOT EXISTS idx_employees_school_user ON employees(school_id, user_id);
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
